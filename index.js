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
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log("Firebase connected ✅");

// ====== 3. إعداد Express و تشغيل الخادم ======
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json()); // مهم لاستقبال بيانات JSON

app.get('/', (req, res) => {
  res.send("PharmacyBot Server Running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ====== 4. إعداد Telegram Bot ======
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

// إعداد Webhook لاستقبال الرسائل من تلغرام
app.post(`/bot${token}`, (req, res) => {
    // هذا السطر للتأكد من استقبال الطلب
    console.log("استلمت طلباً جديداً من تلغرام!"); 

    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ====== إضافة وظيفة الرد على أمر /start (للتأكد من عمل البوت) ======
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "مرحباً! هذا هو نظام بوت الصيدليات. يرجى إرسال /test للتأكد من عمل البوت.");
});


// ====== 5. وظيفة البحث في الصيدليات وإرسال الرسائل ======
app.post('/search-medicine', async (req, res) => {
    const { medicineName, area } = req.body;
    
    // إنشاء معرف فريد للبحث
    const searchRef = db.collection('searches').doc();
    const searchId = searchRef.id;

    // تخزين طلب البحث في Firebase
    await searchRef.set({
        medicineName,
        area,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // قائمة الصيدليات (هذه المعرفات يجب أن تكون Chat IDs الحقيقية للصيدليات)
    const pharmacies = [
        { name: "صيدلية التوفيق", chatId: "YOUR_PHARMACY_CHAT_ID_1" },
        { name: "صيدلية النور", chatId: "YOUR_PHARMACY_CHAT_ID_2" }
    ];

    const message = `طلب دواء جديد:\n\n*اسم الدواء:* ${medicineName}\n*المنطقة:* ${area}\n\nهل الدواء متوفر لديكم؟`;
    
    // التصحيح تم هنا
    for (const pharmacy of pharmacies) {
        bot.sendMessage(pharmacy.chatId, message);
    }
    
    res.json({ success: true, searchId: searchId });
});


// ====== 6. الاستماع لردود الصيدليات وتحديث Firebase ======
bot.on('message', async (msg) => {
    // نتأكد من تجاهل أمر /start لتجنب التكرار
    if (msg.text && msg.text.startsWith('/start')) return; 
    
    // إضافة أمر اختبار للرد الفوري
    if (msg.text && msg.text.toLowerCase() === '/test') {
        const chatId = msg.chat.id;
        return bot.sendMessage(chatId, 'نعم! البوت يعمل ويرد الآن بشكل مباشر.');
    }

    const chatId = msg.chat.id;
    const text = msg.text;

    // لتسجيل أي رسالة يتم استلامها 
    console.log(`تم استلام رسالة: ${text} من ${chatId}`);

    if (text.toLowerCase().includes('متوفر')) {
        
        const searchId = "EXAMPLE_SEARCH_ID";
        const pharmacyId = chatId;

        const responseRef = db.doc(`searches/${searchId}/pharmacyResponses/${pharmacyId}`);
        await responseRef.set({
            status: 'available',
            pharmacyName: 'اسم الصيدلية', 
            location: 'المنطقة',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        bot.sendMessage(chatId, 'شكراً لك على تأكيد توفر الدواء!');

    } else {
        // رسالة افتراضية للرد على أي رسالة أخرى
        // سيتم تغيير هذا لاحقاً للتعامل مع طلبات الأدوية من المستخدمين العاديين
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'عفواً، لم أفهم طلبك. أنا مبرمج للرد على أمر /start أو كلمة "متوفر".');
        console.log(`تم استلام رسالة لا تحمل كلمة متوفر: ${chatId}`);
    }
});
