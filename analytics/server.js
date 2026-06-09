const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Google Sheets Auth ───────────────────────────────────
let creds;
try {
  creds = JSON.parse(process.env.GOOGLE_CREDS);
  // Фикс переносов строк в private_key
  if (creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
} catch (e) {
  console.error('❌ Не удалось прочитать GOOGLE_CREDS:', e.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.SHEET_ID;

// ─── Маршруты ─────────────────────────────────────────────

// Проверка работы сервера
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Запись результата игрока
// POST /score { userId, username, level, time, distance, medal }
app.post('/score', async (req, res) => {
  try {
    const { userId, username, level, time, distance, medal } = req.body;
    const row = [
      new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      userId || 'anonymous',
      username || 'anonymous',
      level || 1,
      time || 0,
      distance || 0,
      medal || '-',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    console.log(`✅ Записан результат: ${username} | уровень ${level} | ${time}с`);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Ошибка записи в Sheets:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Получить все результаты (для admin.html)
app.get('/scores', async (req, res) => {
  const pass = req.query.pass;
  if (pass !== process.env.ADMIN_PASS) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:G',
    });
    res.json({ rows: result.data.values || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Старт ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 soglasovano-analytics запущен на порту ${PORT}`);
  console.log(`📊 SHEET_ID: ${SHEET_ID ? SHEET_ID.substring(0,10) + '...' : 'НЕ ЗАДАН'}`);
});
