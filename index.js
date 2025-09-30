require('dotenv').config();
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

// Firebase setup
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
console.log("Firebase connected ✅");

// Telegram Bot setup
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true }); // بوت تلجرام فقط للحفظ

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'صيدلية مجهولة';

  if (msg.text && msg.text.toLowerCase() === 'register') {
    // حفظ بيانات الصيدلية
    await db.collection('pharmacies').doc(String(chatId)).set({
      chatId,
      name,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    bot.sendMessage(chatId, 'تم حفظ بياناتك في قاعدة البيانات ✅');
  }
});

// Express server
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// endpoint لصفحة الصيدليات
app.get('/pharmacies', async (req, res) => {
  const snapshot = await db.collection('pharmacies').get();
  const pharmacies = snapshot.docs.map(doc => doc.data());
  res.json(pharmacies);
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
