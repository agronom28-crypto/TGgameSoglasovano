const express = require('express');
const cors    = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Google Sheets Auth ───────────────────────────────────
let creds;
try {
  creds = JSON.parse(process.env.GOOGLE_CREDS);
  if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
} catch (e) {
  console.error('❌ Не удалось прочитать GOOGLE_CREDS:', e.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets  = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.SHEET_ID;

// Колонки в таблице (A…J):
// A=дата, B=userId(telegramId), C=username(tgName), D=nickname, E=level, F=time, G=distance, H=medal, I=result

// ─── Хелпер: загрузить все строки ────────────────────────
async function getAllRows() {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:I',
  });
  const rows = result.data.values || [];
  // пропускаем строку-заголовок если есть (первая ячейка = 'Дата')
  return rows[0]?.[0] === 'Дата' ? rows.slice(1) : rows;
}

// ─── Маршруты ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// POST /score
app.post('/score', async (req, res) => {
  try {
    const { userId, username, nickname, level, time, distance, medal, result } = req.body;
    const row = [
      new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      userId   || 'anonymous',
      username || 'anonymous',
      nickname || '',
      level    || 1,
      time     || 0,
      distance || 0,
      medal    || '-',
      result   || 'unknown',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    console.log(`✅ ${nickname || username} (${userId}) | lvl${level} | ${time}с | ${result}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Ошибка записи:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /leaderboard/:level  — топ-5, только финиши, лучший результат на игрока
app.get('/leaderboard/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const rows  = await getAllRows();

    // Фильтруем: нужный уровень + финиш
    const finished = rows.filter(r => {
      const lvl    = parseInt(r[4]);
      const result = (r[8] || '').toLowerCase();
      return lvl === level && result === 'finish';
    });

    // Дедупликация по userId — оставляем лучший результат
    const best = {}; // userId → row
    finished.forEach(r => {
      const uid      = r[1] || 'anon';
      const time     = parseFloat(r[5]) || 999;
      const distance = parseFloat(r[6]) || 0;

      if (!best[uid]) { best[uid] = r; return; }

      const prev = best[uid];
      const prevTime = parseFloat(prev[5]) || 999;
      const prevDist = parseFloat(prev[6]) || 0;

      if (level === 1) {
        // Меньше времени — лучше
        if (time < prevTime) best[uid] = r;
      } else if (level === 2) {
        // Больше правильных (distance хранит score) — лучше; при равных — меньше времени
        if (distance > prevDist || (distance === prevDist && time < prevTime)) best[uid] = r;
      } else if (level === 3) {
        // Меньше времени — лучше
        if (time < prevTime) best[uid] = r;
      }
    });

    let topList = Object.values(best);

    // Сортировка
    if (level === 1 || level === 3) {
      topList.sort((a, b) => (parseFloat(a[5]) || 999) - (parseFloat(b[5]) || 999));
    } else if (level === 2) {
      topList.sort((a, b) => {
        const da = parseFloat(a[6]) || 0, db = parseFloat(b[6]) || 0;
        if (db !== da) return db - da;                         // больше очков — выше
        return (parseFloat(a[5]) || 999) - (parseFloat(b[5]) || 999); // меньше времени — выше
      });
    }

    const top5 = topList.slice(0, 5).map((r, i) => ({
      rank:     i + 1,
      name:     r[3] || r[2] || 'Игрок',  // nickname || tgName
      time:     parseFloat(r[5]) || 0,
      score:    parseFloat(r[6]) || 0,
      medal:    r[7] || '-',
    }));

    res.json({ ok: true, leaderboard: top5 });
  } catch (e) {
    console.error('❌ Leaderboard error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /scores  — для admin.html
app.get('/scores', async (req, res) => {
  if (req.query.pass !== process.env.ADMIN_PASS) return res.status(403).json({ error: 'Forbidden' });
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:I',
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
});
