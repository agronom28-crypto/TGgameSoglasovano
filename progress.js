/**
 * progress.js — единый модуль прогресса игрока
 *
 * Хранит данные в Telegram CloudStorage (привязано к аккаунту)
 * Fallback — localStorage (если открыто в браузере без Telegram)
 *
 * Структура объекта progress:
 * {
 *   levels: {
 *     1: { done: true, time: 42.3, medal: '🥇', date: '2026-06-09' },
 *     2: { done: true, time: 88.1, medal: '🥈', date: '2026-06-09' },
 *   }
 * }
 */

const STORAGE_KEY  = 'soglasovano_progress';
const ANALYTICS_URL = 'https://soglasovano-analytics-production.up.railway.app';

const tgCloud = window.Telegram?.WebApp?.CloudStorage;
const tgUser  = window.Telegram?.WebApp?.initDataUnsafe?.user;

// ─── Примитивы чтения/записи ─────────────────────────────

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

function sendAnalytics(levelN, result) {
  try {
    const userId   = tgUser?.id       || 'anonymous';
    const username = tgUser?.username || tgUser?.first_name || 'anonymous';
    fetch(ANALYTICS_URL + '/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        level:    levelN,
        time:     result.time     || 0,
        distance: result.score    || 0,
        medal:    result.medal    || '-',
      }),
    }).catch(() => {}); // тихо игнорируем сетевые ошибки
  } catch(e) {}
}

// ─── Публичный API ─────────────────────────────────────

/**
 * Загрузить прогресс (сначала Cloud, потом local)
 * @param {function} callback(progressData)
 */
function loadProgress(callback) {
  const local = loadLocal();
  loadCloud(cloud => {
    if (!cloud) { callback(local); return; }
    // Мержим: берём лучшее из обоих источников
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

/**
 * Сохранить результат уровня
 * @param {number} levelN - номер уровня
 * @param {object} result - { time, medal, score }
 */
function completeLevel(levelN, result) {
  const data = loadLocal();
  const prev = data.levels[levelN];
  // Сохраняем лучший результат
  data.levels[levelN] = {
    done:     true,
    time:     prev?.time ? Math.min(prev.time, result.time || 999) : (result.time || 0),
    medal:    result.medal || prev?.medal || '-',
    score:    result.score || prev?.score || 0,
    date:     new Date().toISOString().split('T')[0],
    attempts: (prev?.attempts || 0) + 1,
  };
  saveLocal(data);
  saveCloud(data);
  // Обратная совместимость со старым форматом
  localStorage.setItem(`level${levelN}_done`, '1');
  // Отправляем в аналитику (всегда, даже при повторном прохождении)
  sendAnalytics(levelN, result);
  return data;
}

/**
 * Проверить открыт ли уровень (синхронно, без обновления UI)
 */
function isLevelUnlocked(levelN, progressData) {
  if (levelN === 1) return true;
  const prev = progressData?.levels?.[levelN - 1];
  return !!prev?.done;
}

/**
 * Получить статистику уровня
 */
function getLevelStats(levelN, progressData) {
  return progressData?.levels?.[levelN] || null;
}

window.Progress = { loadProgress, completeLevel, isLevelUnlocked, getLevelStats };
