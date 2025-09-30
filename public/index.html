const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

// إعداد البوت
const token = '8296205913:AAHmtYsc3ViT_OrofOZMzYG6UTcepXdpD5c';
const bot = new TelegramBot(token, { polling: true });

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // هنا حتوضع index.html

// Endpoint لاستقبال الإجابة من الصفحة
app.post('/send-answer', (req, res) => {
    const { answer } = req.body;
    const chatId = 123456789; // ضع هنا Chat ID للبوت أو الشخص المرسل
    bot.sendMessage(chatId, `جواب الاستبيان: ${answer}`)
       .then(() => res.json({ success: true }))
       .catch(() => res.json({ success: false }));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
