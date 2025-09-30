const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' })); // مهم عشان CORS
app.use(express.json());

let dummyDB = []; // للتجربة بدون Firebase

const PORT = process.env.PORT || 10000;

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// مسار البحث عن دواء
app.post('/search-medicine', (req, res) => {
  const { medicineName, area } = req.body;

  if (!medicineName || !area) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم الدواء والمنطقة' });
  }

  // حفظ مؤقت للعرض التجريبي
  const searchId = dummyDB.length + 1;
  dummyDB.push({ searchId, medicineName, area, status: 'pending' });

  res.json({ success: true, searchId, message: 'تم إرسال الطلب بنجاح (تجريبي)' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
