const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('امسح الكود بالواتس اب لتسجيل الدخول');
});

client.on('ready', () => {
    console.log('بوت جاهز!');
});

client.on('message', async msg => {
    if(msg.body.toLowerCase().startsWith('استعلام ')){
        const medicine = msg.body.split(' ')[1];
        const pharmaciesSnapshot = await db.collection('pharmacies').get();
        let reply = `نتائج الاستعلام عن: ${medicine}\n`;
        pharmaciesSnapshot.forEach(doc => {
            const data = doc.data();
            reply += `\n${data.name} - ${data.area} - ${data.status[medicine] || 'غير معروف'}`;
        });
        msg.reply(reply);
    }
});

client.initialize();

// Simple Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Sudan Medicine Bot Running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));