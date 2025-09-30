const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');

// إعداد Firebase
const serviceAccount = require('./serviceAccountKey.json'); // ملف مفتاحك الخاص
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// إعداد البوت
const token = "8296205913:AAHmtYsc3ViT_OrofOZMzYG6UTcepXdpD5c"; // ضع توكن البوت هنا
const bot = new TelegramBot(token, { polling: true });

// استقبال رسالة /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.chat.first_name || '';
    const username = msg.chat.username || '';
    
    // مثال: بيانات الصيدلية يمكن إرسالها يدوياً بالبوت أو في رسالة أخرى
    const pharmacyData = {
        chatId: chatId,
        name: firstName,
        username: username,
        whatsapp: "أرسل رقمك هنا",       // يمكن تحديثه لاحقاً
        address: "تفاصيل الموقع هنا",   // يمكن تحديثها لاحقاً
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('pharmacies').doc(String(chatId)).set(pharmacyData);
        bot.sendMessage(chatId, "✅ تم تسجيل بياناتك في قاعدة الصيدليات بنجاح!");
    } catch (e) {
        bot.sendMessage(chatId, "❌ حدث خطأ أثناء التسجيل.");
        console.error(e);
    }
});
