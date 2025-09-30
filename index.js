const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// السماح لأي مصدر (WebView / localhost)
app.use(cors({ origin: '*' }));
app.use(express.json());

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

let db;

async function startServer() {
  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log("Firebase connected ✅");
  } catch (e) {
    console.error("Firebase init error:", e.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 10000;

  // الصفحة الرئيسية من نفس المجلد
  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  // مسار البحث عن دواء
  app.post('/search-medicine', async (req, res) => {
    const { medicineName, area } = req.body;
    try {
      const searchRef = db.collection('searches').doc();
      const searchId = searchRef.id;
      await searchRef.set({
        medicineName,
        area,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      });
      res.json({ success: true, searchId, message: 'تم إرسال طلب البحث بنجاح.' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'فشل في إرسال الطلب.' });
    }
  });

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
