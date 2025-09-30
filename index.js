// ====== 1. استدعاء المكتبات المطلوبة ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

// ====== 2. إعداد Firebase باستخدام المتغيرات البيئية ======
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

let db;

// ====== 3. دالة إعداد وبدء الخادم ======
async function initializeAndStartServer() {
    try {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("Firebase connected ✅");
        db = admin.firestore();
    } catch (error) {
        console.error("FIREBASE ERROR:", error.message);
        process.exit(1);
    }

    const app = express();
    const PORT = process.env.PORT || 10000;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN is missing!");
        process.exit(1);
    }

    app.use(cors());
    app.use(express.json());
    app.use(express.static('public')); 

    app.get('/', (req, res) => {
        res.sendFile('index.html', { root: 'public' });
    });

    const bot = new TelegramBot(token, { polling: true });

    // ====== حفظ بيانات الصيدليات عند الضغط على Start ======
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const name = msg.chat.username || `${msg.chat.first_name} ${msg.chat.last_name || ''}`;
        console.log(`New pharmacy joined: ${name} | Chat ID: ${chatId}`);

        try {
            await db.collection('pharmacies').doc(`${chatId}`).set({
                name,
                chatId,
                joinedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            bot.sendMessage(chatId, "تم تسجيلك كصيدلية ✅");
        } catch (e) {
            console.error("Error saving pharmacy:", e.message);
        }
    });

    // ====== صفحة HTML تعرض الصيدليات المحفوظة ======
    app.get('/pharmacies', async (req, res) => {
        try {
            const snapshot = await db.collection('pharmacies').get();
            const pharmacies = snapshot.docs.map(doc => doc.data());
            res.json({ pharmacies });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// تشغيل الدالة
initializeAndStartServer();
