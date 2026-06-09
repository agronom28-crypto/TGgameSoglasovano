/**
 * progress.js — единый модуль прогресса игрока
 *
 * Хранит данные в Telegram CloudStorage (привязано к аккаунту)
 * Fallback — localStorage (если открыто в браузере без Telegram)
 */

const STORAGE_KEY   = 'soglasovano_progress';
const ANALYTICS_URL = 'https://soglasovano-analytics-production.up.railway.app';

// tgCloud можно читать сразу — он не зависит от initData
const tgCloud = window.Telegram?.WebApp?.CloudStorage;

// tgUser — читаем каждый раз заново, чтобы Telegram успел инициализироваться
function getTgUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

// ─── Примитивы чтения/записи ───────────────────────────────

function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { levels: {} };
  } catch(e) { return { levels: {} }; }
}

function saveCloud(data) {
  if (!tgCloud) return;
  tgCloud.setItem(STORAGE_KEY, JSON.stringify(data), () => {});
}

function loadCloud(callback) {
  if (!tgCloud) { callback(null); return; }
  tgCloud.getItem(STORAGE_KEY, (err, value) => {
    if (err || !value) { callback(null); return; }
    try { callback(JSON.parse(value)); } catch(e) { callback(null); }
  });
}

// ─── Отправка в аналитику ────────────────────────────────

function sendAnalytics(levelN, data) {
  try {
    // Читаем пользователя в момент отправки — Telegram уже точно инициализировался
    const user     = getTgUser();
    const userId   = user?.id       || 'anonymous';
    const username = user?.username || user?.first_name || 'anonymous';
    fetch(ANALYTICS_URL + '/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        level:    levelN,
        time:     data.time     || 0,
        distance: data.distance || data.score || 0,
        medal:    data.medal    || '-',
        result:   data.result   || 'unknown',
      }),
    }).catch(() => {});
  } catch(e) {}
}

// ─── Публичный API ────────────────────────────────────────────

function loadProgress(callback) {
  const local = loadLocal();
  loadCloud(cloud => {
    if (!cloud) { callback(local); return; }
    const merged = { levels: { ...local.levels } };
    Object.keys(cloud.levels || {}).forEach(n => {
      if (!merged.levels[n] || cloud.levels[n].done) {
        merged.levels[n] = cloud.levels[n];
      }
    });
    saveLocal(merged);
    callback(merged);
  });
}

function completeLevel(levelN, result) {
  loadCloud(cloudData => {
    const base = cloudData || loadLocal();
    const prev = base.levels?.[levelN];
    base.levels = base.levels || {};
    base.levels[levelN] = {
      done:     true,
      time:     prev?.time ? Math.min(prev.time, result.time || 999) : (result.time || 0),
      medal:    result.medal || prev?.medal || '-',
      score:    result.score || prev?.score || 0,
      date:     new Date().toISOString().split('T')[0],
      attempts: (prev?.attempts || 0) + 1,
    };
    saveLocal(base);
    saveCloud(base);
    localStorage.setItem(`level${levelN}_done`, '1');
  });

  sendAnalytics(levelN, {
    time:     result.time,
    distance: result.score,
    medal:    result.medal,
    result:   'finish',
  });
}

function isLevelUnlocked(levelN, progressData) {
  if (levelN === 1) return true;
  const prev = progressData?.levels?.[levelN - 1];
  return !!prev?.done;
}

function getLevelStats(levelN, progressData) {
  return progressData?.levels?.[levelN] || null;
}

window.Progress = { loadProgress, completeLevel, isLevelUnlocked, getLevelStats, sendAnalytics };
