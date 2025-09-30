const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const admin = require('firebase-admin');

// ====== إعداد Firebase ======
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  })
});
const db = admin.firestore();

// ====== إعداد البوت ======
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// ====== رسالة الترحيب ======
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `مرحباً! 👋\nادخل بياناتك بهذا الشكل:\nالاسم، رقم الواتساب، الموقع`);
});

// ====== استقبال البيانات ======
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // نتجاهل أوامر البوت مثل /start
  if (text.startsWith('/')) return;

  // نتوقع صيغة: الاسم، رقم الواتساب، الموقع
  const parts = text.split(',');
  if (parts.length !== 3) {
    return bot.sendMessage(chatId, `❌ الصيغة غير صحيحة. الرجاء: الاسم، رقم الواتساب، الموقع`);
  }

  const [name, whatsapp, location] = parts.map(p => p.trim());

  // تحقق بسيط من البيانات
  if (!name || !whatsapp || !location) {
    return bot.sendMessage(chatId, `❌ لا يمكن ترك أي حقل فارغ. الرجاء إدخال: الاسم، رقم الواتساب، الموقع`);
  }

  try {
    await db.collection('pharmacies').doc(chatId.toString()).set({
      name,
      whatsapp,
      location,
      chatId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    bot.sendMessage(chatId, `✅ تم حفظ بياناتك بنجاح!`);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, `❌ حدث خطأ أثناء حفظ البيانات`);
  }
});

console.log("Firebase connected ✅");
console.log("Telegram Bot running ✅");
