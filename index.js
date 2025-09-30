// ====== 1. استدعاء المكتبات المطلوبة ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// ====== 2. إعداد Firebase ======
// سيقوم الخادم بقراءة متغيرات البيئة تلقائياً
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    // يجب معالجة مفتاح Private Key لضمان قراءته بشكل صحيح
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com"
};

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase connected ✅");
} catch (error) {
    console.error("FIREBASE ERROR:", error.message);
    process.exit(1); // إنهاء الخادم إذا فشل اتصال Firebase
}

const db = admin.firestore();

// ====== 3. إعداد Express و تشغيل الخادم ======
const app = express();
const PORT = process.env.PORT || 10000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = `https://pharmacybotservice.onrender.com/webhook`;

// Middleware لمعالجة JSON
app.use(express.json());

// ************ حل مشكلة CORS ************
// Middleware للسماح بطلبات من أي نطاق (ضروري لعمل الواجهة الأمامية)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// رسالة ترحيب بسيطة
app.get('/', (req, res) => {
    res.send("PharmacyBot Server Running 🚀 and ready for Webhooks.");
});
// ====== 4. إعداد Telegram Bot ======

// يجب تعطيل الـ polling عند استخدام Webhook
const bot = new TelegramBot(token, { polling: false });

if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing. Cannot start bot.");
    process.exit(1);
} else {
    console.log("Telegram Token found.");
}

// إعداد Webhook عند بدء تشغيل الخادم
bot.setWebHook(webhookUrl).then(() => {
    console.log(`Webhook set to ${webhookUrl}`);
}).catch(e => {
    console.error("Error setting webhook:", e.message);
});

// إعداد Webhook لاستقبال الرسائل من تلغرام على المسار الثابت
app.post(`/webhook`, (req, res) => {
    console.log("استلمت طلباً جديداً من تلغرام على المسار /webhook!");
    bot.processUpdate(req.body);
    // يجب إرسال 200 فوراً حتى لو لم يكن هناك رد مباشر
    res.sendStatus(200); 
});
// ====== 5. وظيفة البحث في الصيدليات وإرسال الرسائل ======
app.post('/search-medicine', async (req, res) => {
    // يجب أن تكون هذه الدالة أول شيء يتم معالجته
    // بعد إرسال res.sendStatus(200)، لا يمكن إرسال أي رد آخر.

    const { medicineName, area } = req.body;
    
    // إنشاء معرف فريد للبحث وتخزين الطلب في Firebase
    const searchRef = db.collection('searches').doc();
    const searchId = searchRef.id;

    await searchRef.set({
        medicineName,
        area,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
    });

    // ************ إرسال تنبيه عبر تلغرام ************
    // ملاحظة: Chat IDs يجب أن تكون مُعدة مسبقاً لمجموعات الصيدليات
    const pharmacies = [
        { name: "صيدلية التوفيق", chatId: "YOUR_PHARMACY_CHAT_ID_1" },
        { name: "صيدلية النور", chatId: "YOUR_PHARMACY_CHAT_ID_2" }
    ];

    const message = `طلب دواء جديد:\n\n*اسم الدواء:* ${medicineName}\n*المنطقة:* ${area}\n\nيرجى الرد بـ "متوفر ${searchId}" إذا كان الدواء متوفراً لديكم.`;
    
    // إرسال الرسالة إلى كل صيدلية
    for (const pharmacy of pharmacies) {
        // نستخدم try-catch لأن بعض الـ Chat IDs قد تكون غير صالحة
        try {
            await bot.sendMessage(pharmacy.chatId, message, { parse_mode: 'Markdown' });
            console.log(`Sent request to ${pharmacy.name}`);
        } catch (error) {
            console.error(`Failed to send message to ${pharmacy.name}: ${error.message}`);
        }
    }
    
    // إرسال رد النجاح إلى الواجهة الأمامية (Frontend)
    res.json({ 
        success: true, 
        message: 'تم إرسال طلب البحث إلى الصيدليات بنجاح.', 
        searchId: searchId 
    });
});
// ====== 6. الاستماع لردود الصيدليات وتحديث Firebase ======
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // معالجة الأمر /test للتأكد من أن البوت يعمل
    if (text === '/test' || text === '/start') {
        bot.sendMessage(chatId, 'نعم! البوت يعمل ويرد الآن بشكل مباشر.');
        return;
    }

    // منطق الرد: نبحث عن كلمة "متوفر" متبوعة بالـ SearchId
    const match = text.match(/متوفر\s+([a-zA-Z0-9]+)/i);

    if (match) {
        const searchId = match[1]; // استخراج الـ ID من الرد
        const pharmacyId = chatId;

        console.log(`Received AVAILABILITY confirmation for Search ID: ${searchId} from Chat ID: ${pharmacyId}`);

        // تحديث Firebase بأن الدواء متوفر
        const responseRef = db.doc(`searches/${searchId}`);
        await responseRef.update({
            status: 'available',
            availableBy: {
                chatId: pharmacyId,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            }
        }).then(() => {
            bot.sendMessage(chatId, 'شكراً لك على تأكيد توفر الدواء!');
        }).catch(e => {
             // إرسال خطأ إذا لم يتم العثور على SearchId أو فشل التحديث
            bot.sendMessage(chatId, 'عفواً، فشل تحديث حالة الطلب. قد يكون معرف الطلب غير صحيح.');
            console.error('Firebase update failed:', e.message);
        });

    } else {
        console.log(`تم استلام رسالة عادية من: ${chatId}. النص: ${text}`);
    }
});
// ====== 7. بدء تشغيل الخادم ======
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
