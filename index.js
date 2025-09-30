// ====== استدعاء المكتبات ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config(); // لو عندك .env

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

// ====== إعداد Express ======
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ====== إعداد Telegram Bot ======
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN مفقود!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "غير معروف";

  // تخزين البيانات في Firestore
  const pharmacyRef = db.collection('pharmacies').doc(chatId.toString());
  await pharmacyRef.set({
    name: name,
    chatId: chatId,
    whatsapp: "", // يقدر المستخدم يضيف رقم لاحقًا
    details: "",  // يقدر يضيف التفاصيل لاحقًا
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  bot.sendMessage(chatId, `مرحباً ${name}! تم تسجيلك في قائمة الصيدليات ✅`);
  console.log(`صيدلية جديدة: ${name} (chatId: ${chatId})`);
});

// ====== تشغيل السيرفر ======
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
