// ====== استدعاء المكتبات ======
const admin = require('firebase-admin');
const { Telegraf } = require('telegraf'); // لو بوت تليجرام
require('dotenv').config();
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

// ====== بوت تليجرام ======
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("مرحباً! أرسل بياناتك بهذا الشكل:\nالاسم، رقم الواتساب، الموقع");
});

// حفظ البيانات تلقائياً عند إرسال رسالة
bot.on('text', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    const [name, whatsapp, location] = text.split(',').map(s => s.trim());

    if (!name || !whatsapp || !location) {
      return ctx.reply("البيانات ناقصة! الرجاء إرسال: الاسم، رقم الواتساب، الموقع");
    }

    await db.collection('pharmacies').doc(chatId.toString()).set({
      name,
      whatsapp,
      location,
      chatId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    ctx.reply("✅ تم حفظ بياناتك بنجاح!");
  } catch (error) {
    console.error("❌ خطأ أثناء حفظ البيانات:", error.message);
    ctx.reply("حدث خطأ أثناء حفظ البيانات!");
  }
});

bot.launch();
console.log("Bot running ✅");

// ====== Express لصفحة العرض ======
const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/pharmacies', async (req, res) => {
  try {
    const snapshot = await db.collection('pharmacies').orderBy('timestamp', 'desc').get();
    const pharmacies = snapshot.docs.map(doc => doc.data());
    res.json(pharmacies);
  } catch (err) {
    console.error("❌ خطأ في جلب البيانات:", err.message);
    res.status(500).json({ message: "حدث خطأ في جلب البيانات" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
