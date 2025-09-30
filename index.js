// ====== استدعاء المكتبات ======
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // مهم جداً

// ====== إعداد Firebase ======
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
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log("Firebase connected ✅");
} catch (err) {
  console.error("FIREBASE INIT ERROR:", err.message);
  process.exit(1);
}

// ====== إعداد Express ======
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// صفحة index.html
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// حفظ بيانات الصيدليات
app.post('/save-pharmacy', async (req, res) => {
  try {
    const { name, whatsapp, location, chatId } = req.body;

    console.log("بيانات الصيدلي القادمة:", { name, whatsapp, location, chatId });

    if (!chatId || !name || !whatsapp || !location) {
      return res.status(400).json({ success: false, message: "البيانات ناقصة!" });
    }

    const docRef = db.collection('pharmacies').doc(chatId.toString());
    await docRef.set({
      name,
      whatsapp,
      location,
      chatId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ تم حفظ بيانات الصيدلي بنجاح:", chatId);
    res.json({ success: true, message: "تم حفظ البيانات بنجاح." });

  } catch (error) {
    console.error("❌ خطأ أثناء حفظ البيانات:", error.message);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء حفظ البيانات" });
  }
});

// استرجاع بيانات الصيدليات للعرض
app.get('/pharmacies', async (req, res) => {
  try {
    const snapshot = await db.collection('pharmacies').orderBy('timestamp', 'desc').get();
    const pharmacies = snapshot.docs.map(doc => doc.data());
    res.json(pharmacies);
  } catch (error) {
    console.error("❌ خطأ أثناء جلب البيانات:", error.message);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب البيانات" });
  }
});

// ====== تشغيل السيرفر ======
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
