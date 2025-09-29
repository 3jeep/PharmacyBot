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
    bot.processUpdate(req.body);
    res.sendStatus(200);
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
    
    // إرسال الرسالة إلى كل صيدلية مع معرف الطلب
    for (const pharmacy of pharmacies) {
        bot.sendMessage(pharmacy.chatId, message);
    }
    
    res.json({ success: true, searchId: searchId });
});


// ====== 6. الاستماع لردود الصيدليات وتحديث Firebase ======
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // هذا الجزء يحتاج إلى ربط الرد بطلب البحث الأصلي
    // سنعتمد هنا على أن الصيدلية ترسل نصًا محدداً
    if (text.toLowerCase().includes('متوفر')) {
        
        // يجب أن يكون لديك طريقة لربط الـ chatId بـ searchId
        // كمثال، إذا كان الرد يحتوي على الـ searchId
        // هذا الجزء يحتاج إلى تعديل ليناسب طريقة عملك
        const searchId = "EXAMPLE_SEARCH_ID";
        const pharmacyId = chatId;

        // تحديث Firebase بأن الدواء متوفر
        const responseRef = db.doc(`searches/${searchId}/pharmacyResponses/${pharmacyId}`);
        await responseRef.set({
            status: 'available',
            pharmacyName: 'اسم الصيدلية', // يجب الحصول على هذا الاسم من قائمة الصيدليات
            location: 'المنطقة', // يجب الحصول على هذه المعلومة من قائمة الصيدليات
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        bot.sendMessage(chatId, 'شكراً لك على تأكيد توفر الدواء!');

    } else {
        console.log(`تم استلام رد سلبي من الصيدلية: ${chatId}`);
    }
});
