// ====== 1. استدعاء المكتبات ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config(); // لو استعملت .env للمتغيرات

// ====== 2. إعداد Firebase ======
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
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
console.log("Firebase connected ✅");
const db = admin.firestore();

// ====== 3. إعداد Express ======
const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ====== 4. إعداد Telegram Bot (Webhook فقط) ======
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });
const webhookUrl = `https://pharmacybotservice.onrender.com/webhook`;

bot.setWebHook(webhookUrl)
  .then(() => console.log(`Webhook set to ${webhookUrl}`))
  .catch(e => console.error("Error setting webhook:", e.message));

app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ====== 5. استقبال الردود من الصيدليات ======
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start') {
    bot.sendMessage(chatId, 'مرحباً! البوت يعمل الآن.');
    return;
  }

  const match = text.match(/متوفر\s+([a-zA-Z0-9]+)/i);
  if (match) {
    const searchId = match[1];
    const responseRef = db.doc(`searches/${searchId}`);
    await responseRef.update({
      status: 'available',
      availableBy: {
        chatId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }
    }).then(() => bot.sendMessage(chatId, 'شكراً لتأكيد توفر الدواء!'))
      .catch(e => bot.sendMessage(chatId, 'فشل تحديث الحالة.'));
  }
});

// ====== 6. بدء السيرفر ======
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
