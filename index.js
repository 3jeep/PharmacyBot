// ====== 1. استدعاء المكتبات المطلوبة ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser'); // لإدارة طلبات الـ POST

// ====== 2. إعداد Firebase ======
// قراءة المتغيرات من بيئة Render
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
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

// يجب استخدام bodyParser.json() فقط عند الحاجة، وإلا فسنستخدم express.json()
app.use(express.json()); 

app.get('/', (req, res) => {
  res.send("PharmacyBot Server Running 🚀");
});

// ====== 4. إعداد Telegram Bot والـ Webhook ======
const token = process.env.TELEGRAM_BOT_TOKEN;

// تأكد من وجود التوكن لتجنب الانهيار
if (!token) {
    console.error("⛔️ خطأ: متغير TELEGRAM_BOT_TOKEN مفقود في متغيرات البيئة!");
} else {
    console.log("Telegram Token found.");
    
    // إعداد البوت ليعمل كـ Webhook (Polling: False)
    const bot = new TelegramBot(token, { polling: false }); 

    // عنوان الخادم الأساسي
    const url = "https://pharmacybotservice.onrender.com";
    
    // إعداد الـ Webhook على تلغرام
    bot.setWebHook(`${url}/webhook`).then(() => {
        console.log(`Webhook set to ${url}/webhook`);
    }).catch(e => {
        console.error("⛔️ فشل في إعداد Webhook:", e.message);
    });


    // معالج الـ Webhook لاستقبال الرسائل
    app.post(`/webhook`, (req, res) => {
        // هذا السطر للتأكد من استقبال الطلب
        console.log("استلمت طلباً جديداً من تلغرام على المسار /webhook!"); 

        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    // ====== وظائف البوت ======

    // إضافة وظيفة الرد على أمر /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "مرحباً! هذا هو نظام بوت الصيدليات. يرجى إرسال /test للتأكد من عمل البوت.");
    });

    // ====== 5. وظيفة البحث في الصيدليات وإرسال الرسائل (غير معدلة) ======
    app.post('/search-medicine', async (req, res) => {
        const { medicineName, area } = req.body;
        
        // [كود Firebase هنا]
        
        res.json({ success: true, searchId: searchId });
    });


    // ====== 6. الاستماع لردود الصيدليات وتحديث Firebase (مع /test) ======
    bot.on('message', async (msg) => {
        // نتأكد من تجاهل أمر /start لتجنب التكرار
        if (msg.text && msg.text.startsWith('/start')) return; 
        
        // إضافة أمر اختبار للرد الفوري
        if (msg.text && msg.text.toLowerCase() === '/test') {
            const chatId = msg.chat.id;
            return bot.sendMessage(chatId, 'نعم! البوت يعمل ويرد الآن بشكل مباشر.');
        }

        // [بقية كود معالجة الرسائل هنا]
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'عفواً، لم أفهم طلبك. أنا مبرمج للرد على أمر /start أو /test.');
    });
}


// تشغيل الخادم Express للاستماع على المنفذ (مرة واحدة فقط!)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
