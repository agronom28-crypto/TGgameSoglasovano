const crypto = require('crypto');

function cleanText(value, max = 64) {
  return String(value ?? '').replace(/[<>\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}
function finiteNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function normalizeScore(body = {}) {
  return {
    userId: cleanText(body.userId || 'anonymous', 64),
    username: cleanText(body.username || 'anonymous', 32) || 'anonymous',
    nickname: cleanText(body.nickname, 32),
    level: Math.trunc(finiteNumber(body.level, 1, 10, 1)),
    time: finiteNumber(body.time, 0, 3600, 0),
    distance: finiteNumber(body.distance, 0, 1000000, 0),
    medal: cleanText(body.medal || '-', 8),
    result: ['finish','fail','hit','timeout','unknown'].includes(body.result) ? body.result : 'unknown',
  };
}
function scoreFirst(level) { return [2,4,5].includes(Number(level)); }
function better(level, candidate, previous) {
  const ct=Number(candidate[5])||999, pt=Number(previous[5])||999;
  const cs=Number(candidate[6])||0, ps=Number(previous[6])||0;
  return scoreFirst(level) ? cs>ps || (cs===ps && ct<pt) : ct<pt;
}
function sortRows(level, rows) {
  return [...rows].sort((a,b) => scoreFirst(level)
    ? (Number(b[6])||0)-(Number(a[6])||0) || (Number(a[5])||999)-(Number(b[5])||999)
    : (Number(a[5])||999)-(Number(b[5])||999));
}
function verifyTelegramInitData(initData, botToken, maxAgeSeconds=86400) {
  if (!initData || !botToken) return false;
  const params = new URLSearchParams(initData), hash=params.get('hash');
  if (!hash) return false;
  params.delete('hash'); params.delete('signature');
  const check=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(botToken).digest();
  const expected=crypto.createHmac('sha256',secret).update(check).digest('hex');
  if (hash.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected))) return false;
  const authDate=Number(params.get('auth_date'));
  return Number.isFinite(authDate) && Math.abs(Date.now()/1000-authDate)<=maxAgeSeconds;
}
module.exports={cleanText,normalizeScore,better,sortRows,verifyTelegramInitData};
