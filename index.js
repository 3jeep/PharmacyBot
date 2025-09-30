const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = 10000;

// ===== WebSocket تجريبي =====
let clients = [];
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  clients.push(ws);
  ws.on('close', () => clients = clients.filter(c => c !== ws));
});

// ===== صفحة البحث =====
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ===== إرسال الطلب وتجريب الرد =====
app.post('/search-medicine', (req, res) => {
  const { medicineName, area } = req.body;

  if(!medicineName || !area){
    return res.status(400).json({ success:false, message:'الدواء والمنطقة مطلوبين' });
  }

  const searchId = Math.floor(Math.random() * 1000000);

  // رد تجريبي بعد 2 ثانية
  setTimeout(() => {
    const pharmacy = {
      name: "صيدلية التوفيق",
      whatsapp: "+249912345678",
      location: { details: "أمام مستشفى الخرطوم" },
      workingHours: "08:00 - 20:00"
    };
    const status = "متوفر";

    clients.forEach(ws => {
      ws.send(JSON.stringify({ searchId, status, pharmacy }));
    });
  }, 2000);

  res.json({ success:true, searchId, message:'تم إرسال الطلب للتجربة' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
