// ====== استدعاء المكتبات ======
const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); // لو مستعمل .env
const express = require('express');
const cors = require('cors');

// ====== إعداد Firebase ======
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
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
console.log("Firebase connected ✅");

// ====== إعداد Telegram Bot ======
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ====== Express للصفحة ======
const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // لو عندك html في public

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ====== استقبال رسائل الصيدلي ======
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "أهلا! أرسل بياناتك بهذا الشكل:\nالاسم، رقم الواتس، الموقع");
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // نتأكد إنو مش أمر /start
  if (text.startsWith('/start')) return;

  // نفصل البيانات
  const parts = text.split(',');
  if (parts.length < 3) {
    bot.sendMessage(chatId, "عفواً، أرسل البيانات بهذا الشكل: الاسم، رقم الواتس، الموقع");
    return;
  }

  const [name, whatsapp, location] = parts.map(p => p.trim());

  // حفظ البيانات في Firebase
  try {
    await db.collection('pharmacies').doc(String(chatId)).set({
      chatId,
      name,
      whatsapp,
      location,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    bot.sendMessage(chatId, "تم حفظ بياناتك بنجاح ✅");
  } catch (e) {
    bot.sendMessage(chatId, "حدث خطأ أثناء حفظ البيانات ❌");
    console.error(e.message);
  }
});
