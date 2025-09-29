// ====== استدعاء المكتبات ======
const admin = require('firebase-admin');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

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
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log("Firebase connected ✅");

// ====== إعداد Express ======
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send("PharmacyBot Server Running 🚀");
});

// ====== إعداد WhatsApp Bot ======
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Bot is ready ✅');
});

client.on('message', async msg => {
  if(msg.body.toLowerCase() === 'سلام') {
    msg.reply('وعليكم السلام 🌟');
  }
  // هنا ممكن تضيف استعلام الأدوية لاحقاً
});

client.initialize();

// ====== تشغيل السيرفر ======
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
