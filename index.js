// ====== index.js (نسخة محسنة لـ WebView / Acode / APK) ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

// ====== Firebase setup ======
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

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
console.log("Firebase connected ✅");

// ====== Express setup ======
const app = express();
const PORT = process.env.PORT || 10000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = `https://pharmacybotservice.onrender.com/webhook`;

// ====== CORS لكل النطاقات ======
app.use(cors({
    origin: '*',
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());
app.use(express.static(__dirname)); // خدمة الملفات الثابتة مثل index.html

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

// ====== Telegram Bot setup ======
if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing!");
    process.exit(1);
} else {
    console.log("Telegram Token found ✅");
}

const bot = new TelegramBot(token, { polling: false });

bot.setWebHook(webhookUrl).then(() => {
    console.log(`Webhook set to ${webhookUrl}`);
}).catch(e => console.error("Error setting webhook:", e.message));

// ====== استقبال webhook ======
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ====== بحث الدواء ======
app.post('/search-medicine', async (req, res) => {
    const { medicineName, area } = req.body;
    const searchRef = db.collection('searches').doc();
    const searchId = searchRef.id;

    await searchRef.set({
        medicineName,
        area,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
    });

    const pharmacies = [
        { name: "صيدلية التوفيق", chatId: "YOUR_PHARMACY_CHAT_ID_1" },
        { name: "صيدلية النور", chatId: "YOUR_PHARMACY_CHAT_ID_2" }
    ];

    const message = `طلب دواء جديد:\n\n*اسم الدواء:* ${medicineName}\n*المنطقة:* ${area}\n\nيرجى الرد بـ "متوفر ${searchId}" إذا كان الدواء متوفراً.`;

    for (const pharmacy of pharmacies) {
        try {
            await bot.sendMessage(pharmacy.chatId, message, { parse_mode: 'Markdown' });
            console.log(`Sent request to ${pharmacy.name}`);
        } catch (err) {
            console.error(`Failed to send message to ${pharmacy.name}: ${err.message}`);
        }
    }

    res.json({ success: true, message: 'تم إرسال الطلب بنجاح', searchId });
});

// ====== تحديث الردود ======
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    if (text === '/start' || text === '/test') {
        bot.sendMessage(chatId, 'البوت شغال الآن ✅');
        return;
    }

    const match = text.match(/متوفر\s+([a-zA-Z0-9]+)/i);
    if (match) {
        const searchId = match[1];
        const responseRef = db.doc(`searches/${searchId}`);
        try {
            await responseRef.update({
                status: 'available',
                availableBy: { chatId, timestamp: admin.firestore.FieldValue.serverTimestamp() }
            });
            bot.sendMessage(chatId, 'تم تأكيد توفر الدواء ✅');
        } catch (e) {
            bot.sendMessage(chatId, 'فشل تحديث حالة الطلب ❌');
            console.error(e.message);
        }
    }
});

// ====== بدء الخادم ======
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
