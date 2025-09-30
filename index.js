// ====== index.js (نسخة مُحسّنة ومرتبة) ======

// ====== 1. استدعاء المكتبات ======
const admin = require('firebase-admin');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

// ====== 2. إعداد Firebase ======
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

async function initializeAndStartServer() {
    try {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("Firebase connected ✅");
        db = admin.firestore();
    } catch (error) {
        console.error("FIREBASE ERROR:", error.message);
        process.exit(1);
    }

    // ====== 3. إعداد Express ======
    const app = express();
    const PORT = process.env.PORT || 10000;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = `https://pharmacybotservice.onrender.com/webhook`;

    // Middleware
    app.use(express.json());
    app.use(cors());
    app.use(express.static(__dirname));

    // تقديم index.html
    app.get('/', (req, res) => res.redirect('/index.html'));

    // ====== 4. إعداد Telegram Bot ======
    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN is missing. Cannot start bot.");
        process.exit(1);
    }
    const bot = new TelegramBot(token, { polling: false });

    bot.setWebHook(webhookUrl)
        .then(() => console.log(`Webhook set to ${webhookUrl}`))
        .catch(e => console.error("Error setting webhook:", e.message));

    app.post(`/webhook`, (req, res) => {
        console.log("استلمت طلباً جديداً من تلغرام على /webhook!");
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    // ====== 5. البحث في الصيدليات ======
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

        const message = `طلب دواء جديد:\n\n*اسم الدواء:* ${medicineName}\n*المنطقة:* ${area}\n\nيرجى الرد بـ "متوفر ${searchId}" إذا كان الدواء متوفراً لديكم.`;

        for (const pharmacy of pharmacies) {
            try { await bot.sendMessage(pharmacy.chatId, message, { parse_mode: 'Markdown' }); 
                console.log(`Sent request to ${pharmacy.name}`);
            } catch (error) { console.error(`Failed to send message to ${pharmacy.name}: ${error.message}`); }
        }

        res.json({ success: true, message: 'تم إرسال طلب البحث إلى الصيدليات بنجاح.', searchId });
    });

    // ====== 6. الاستماع لردود الصيدليات ======
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (text === '/test' || text === '/start') {
            bot.sendMessage(chatId, 'البوت يعمل ✅');
            return;
        }

        const match = text.match(/متوفر\s+([a-zA-Z0-9]+)/i);
        if (match) {
            const searchId = match[1];
            const pharmacyId = chatId;

            console.log(`Received AVAILABILITY for Search ID: ${searchId} from Chat ID: ${pharmacyId}`);
            const responseRef = db.doc(`searches/${searchId}`);
            try {
                await responseRef.update({
                    status: 'available',
                    availableBy: { chatId: pharmacyId, timestamp: admin.firestore.FieldValue.serverTimestamp() }
                });
                bot.sendMessage(chatId, 'شكراً لتأكيد توفر الدواء!');
            } catch (e) {
                bot.sendMessage(chatId, 'فشل تحديث حالة الطلب. ربما معرف الطلب غير صحيح.');
                console.error('Firebase update failed:', e.message);
            }
        } else {
            console.log(`رسالة عادية من: ${chatId} => ${text}`);
        }
    });

    // ====== 7. بدء تشغيل الخادم ======
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// ====== 8. استدعاء الدالة ======
initializeAndStartServer();
