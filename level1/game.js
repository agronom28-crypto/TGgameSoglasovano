let canvas, ctx;
let GROUND_Y;

const GRAVITY = 0.6;
const GAME_DURATION = 60;
const TOTAL_DIST = 10;
const BASE_SPEED = TOTAL_DIST / GAME_DURATION;
const PLAYER_X = 80;

// Размер отображаемого спрайта
const SPRITE_W = 64;
const SPRITE_H = 96;

// Хитбокс персонажа (внутри спрайта)
const P = {
  left:    8,
  right:  56,
  fullTop: -SPRITE_H,
  duckTop: -SPRITE_H * 0.55,
};

let playerImg = null;
let imgLoaded = false;

function loadAssets(cb) {
  playerImg = new Image();
  playerImg.onload  = () => { imgLoaded = true; cb(); };
  playerImg.onerror = () => { imgLoaded = false; cb(); };  // fallback — рисуем запасным цветом
  // Путь относительно от level1/
  playerImg.src = '../Pictures/3D%20person.png';
}

let state = {};

// ─── ПАРАЛЛАКС ──────────────────────────────────────────────────────
const PARALLAX_LAYERS = [
  { speed: 0.08, items: [] },
  { speed: 0.30, items: [] },
  { speed: 0.65, items: [] },
];
function initParallax() {
  const W = canvas.width;
  PARALLAX_LAYERS[0].items = [];
  for (let i = 0; i < 6; i++)
    PARALLAX_LAYERS[0].items.push({ x: Math.random() * W * 2, y: GROUND_Y * 0.1 + Math.random() * GROUND_Y * 0.28, w: 80 + Math.random() * 120, h: 28 + Math.random() * 26 });
  PARALLAX_LAYERS[1].items = [];
  for (let i = 0; i < 10; i++)
    PARALLAX_LAYERS[1].items.push({ x: i * (W / 4) + Math.random() * 80, type: Math.random() > 0.5 ? 'pine' : 'round', h: 70 + Math.random() * 60, trunk: 10 + Math.random() * 8 });
  PARALLAX_LAYERS[2].items = [];
  for (let i = 0; i < 14; i++)
    PARALLAX_LAYERS[2].items.push({ x: i * (W / 5) + Math.random() * 60, type: Math.random() > 0.4 ? 'bush' : 'fence', h: 22 + Math.random() * 18 });
}
function updateParallax(dt) {
  const ms = canvas.width / 3, bm = state.boost ? 2.5 : 1;
  PARALLAX_LAYERS.forEach((layer, li) => {
    const dx = ms * layer.speed * bm * dt;
    const wrap = [canvas.width * 2.2, canvas.width * 1.6, canvas.width * 1.4][li];
    layer.items.forEach(item => { item.x -= dx; if (item.x < -300) item.x += wrap; });
  });
}
function drawParallax() {
  const GY = GROUND_Y;
  const sky = ctx.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.6, '#c8e8f7'); sky.addColorStop(1, '#d4edda');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, GY);
  ctx.fillStyle = 'rgba(120,170,100,0.45)';
  ctx.beginPath(); ctx.moveTo(0, GY);
  for (let i = 0; i <= 6; i++) {
    const hx = (i / 6) * canvas.width, peak = GY - 80 - Math.sin(i * 1.3) * 40;
    if (i === 0) ctx.lineTo(hx, peak);
    else ctx.quadraticCurveTo(hx - canvas.width / 12, GY - 55, hx, peak);
  }
  ctx.lineTo(canvas.width, GY); ctx.closePath(); ctx.fill();
  PARALLAX_LAYERS[0].items.forEach(c => {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.shadowColor = 'rgba(200,220,255,0.5)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.3, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.28, c.y - c.h * 0.1, c.w * 0.3, c.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  PARALLAX_LAYERS[1].items.forEach(t => {
    ctx.save(); ctx.globalAlpha = 0.7; const base = GY - 14;
    if (t.type === 'pine') {
      ctx.fillStyle = '#6D4C41'; ctx.fillRect(t.x - 4, base - t.trunk, 8, t.trunk);
      for (let tier = 0; tier < 3; tier++) {
        const tH = t.h * (0.5 - tier * 0.1), tY = base - t.trunk - tier * (t.h * 0.28);
        ctx.fillStyle = ['#2E7D32','#388E3C','#43A047'][tier];
        ctx.beginPath(); ctx.moveTo(t.x, tY - tH); ctx.lineTo(t.x - tH * 0.55, tY); ctx.lineTo(t.x + tH * 0.55, tY); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#5D4037'; ctx.fillRect(t.x - 4, base - t.trunk, 8, t.trunk);
      ctx.fillStyle = '#388E3C'; ctx.beginPath(); ctx.arc(t.x, base - t.trunk - t.h * 0.38, t.h * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#43A047'; ctx.beginPath(); ctx.arc(t.x - t.h * 0.12, base - t.trunk - t.h * 0.45, t.h * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
  PARALLAX_LAYERS[2].items.forEach(item => {
    ctx.save(); const base = GY - 12;
    if (item.type === 'bush') {
      ctx.fillStyle = '#2E7D32'; ctx.beginPath(); ctx.arc(item.x, base - item.h * 0.5, item.h * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#388E3C'; ctx.beginPath(); ctx.arc(item.x + item.h * 0.4, base - item.h * 0.4, item.h * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(item.x - item.h * 0.38, base - item.h * 0.35, item.h * 0.35, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#795548';
      for (let p = 0; p < 3; p++) {
        const px = item.x + p * 18; ctx.fillRect(px, base - item.h, 5, item.h);
        ctx.beginPath(); ctx.moveTo(px, base - item.h); ctx.lineTo(px + 2.5, base - item.h - 8); ctx.lineTo(px + 5, base - item.h); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8D6E63'; ctx.fillRect(item.x - 2, base - item.h * 0.6, 54, 5); ctx.fillRect(item.x - 2, base - item.h * 0.3, 54, 5);
    }
    ctx.restore();
  });
}

// ─── ПЫЛЬ ─────────────────────────────────────────────────────────────────────
let dustParticles = [];
function spawnDust(boost) {
  for (let i = 0; i < (boost ? 3 : 1); i++)
    dustParticles.push({ x: PLAYER_X + 10 + Math.random() * 24, y: GROUND_Y - 2, vx: -(1.5 + Math.random() * 2.5), vy: -(0.5 + Math.random() * 1.5), r: boost ? 4 + Math.random() * 5 : 2 + Math.random() * 4, life: 1.0, decay: 0.04 + Math.random() * 0.04, color: boost ? '255,200,50' : '180,150,100' });
}
function updateDust(dt) {
  dustParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.r *= 0.97; p.life -= p.decay; });
  dustParticles = dustParticles.filter(p => p.life > 0 && p.r > 0.3);
}
function drawDust() {
  dustParticles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${p.color},${p.life * 0.7})`; ctx.fill(); });
}

// ─── БУСТ-ВСПЫШКА ───────────────────────────────────────────────────────────
let flash = { active: false, life: 0 };
let burstParticles = [];
let shake = { x: 0, y: 0, life: 0 };
function triggerBoostFlash() {
  flash = { active: true, life: 1.0 };
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2, speed = 3 + Math.random() * 5;
    burstParticles.push({ x: PLAYER_X + SPRITE_W / 2, y: state.y - SPRITE_H / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, r: 3 + Math.random() * 4, life: 1.0, decay: 0.025 + Math.random() * 0.02, hue: 40 + Math.random() * 30 });
  }
  shake = { x: 0, y: 0, life: 0.35 };
}
function updateFlash(dt) {
  if (flash.active) { flash.life -= dt * 6; if (flash.life <= 0) flash.active = false; }
  burstParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.r *= 0.95; p.life -= p.decay; });
  burstParticles = burstParticles.filter(p => p.life > 0 && p.r > 0.3);
  if (shake.life > 0) { shake.life -= dt; const m = shake.life * 10; shake.x = (Math.random() - 0.5) * m; shake.y = (Math.random() - 0.5) * m; }
  else { shake.x = 0; shake.y = 0; }
}
function drawFlash() {
  if (flash.active && flash.life > 0) { ctx.fillStyle = `rgba(255,220,50,${flash.life * 0.45})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  burstParticles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue},100%,60%,${p.life})`; ctx.fill();
    ctx.strokeStyle = `hsla(${p.hue},100%,80%,${p.life * 0.5})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke();
  });
}

// ─── ХИТБОКСЫ ────────────────────────────────────────────────────────────────────
function playerBox() {
  const duck = state.isDucking;
  const topOffset = duck ? P.duckTop : P.fullTop;
  return {
    x1: PLAYER_X + P.left,
    x2: PLAYER_X + P.right,
    y1: state.y + topOffset,
    y2: state.y,
  };
}
function obstacleBox(o) {
  if (o.type === 'low') {
    return { x1: o.x + 4, x2: o.x + 38, y1: GROUND_Y - 46, y2: GROUND_Y - 4 };
  } else {
    return { x1: o.x + 4, x2: o.x + 36, y1: GROUND_Y - 110, y2: GROUND_Y - 62 };
  }
}
function boostBox(b) {
  return { x1: b.x, x2: b.x + 32, y1: GROUND_Y - 130, y2: GROUND_Y - 90 };
}
function overlaps(a, b) {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

// ─── INIT ───────────────────────────────────────────────────────────────────────
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  GROUND_Y = canvas.height * 0.75;
  dustParticles = []; burstParticles = [];
  flash = { active: false, life: 0 }; shake = { x: 0, y: 0, life: 0 };
  initParallax();
  state = {
    y: GROUND_Y, vy: 0,
    isJumping: false, isDucking: false,
    boost: false, boostTimer: 0,
    distance: 0, timeLeft: GAME_DURATION, running: true,
    obstacles: [], boosts: [],
    lastObstacleTime: 0, lastBoostTime: 0,
    lastFrame: Date.now(), animTime: 0, step: 0,
  };
  bindControls();
  // Загружаем спрайт персонажа, затем стартуем цикл
  loadAssets(() => loop());
}

// ─── УПРАВЛЕНИЕ ───────────────────────────────────────────────────────────────
let touchStartY = 0;
function bindControls() {
  const doJump = () => { if (!state.isJumping) { state.vy = -15; state.isJumping = true; } };
  const doDuck = () => { if (!state.isDucking) { state.isDucking = true; setTimeout(() => { state.isDucking = false; }, 500); } };
  canvas.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy < -25) doJump();
    if (dy > 25) doDuck();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp'   || e.key === ' ') { e.preventDefault(); doJump(); }
    if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); doDuck(); }
  });
}

// ─── РИСУЕМ ПЕРСОНАЖА ─────────────────────────────────────────────────────────
function drawCharacter(groundY, isDucking, boost) {
  if (!imgLoaded) {
    // Запасной рендер: простой цветной прямоугольник
    ctx.fillStyle = boost ? '#FFD700' : '#1565C0';
    ctx.fillRect(PLAYER_X + P.left, groundY + P.fullTop, P.right - P.left, -P.fullTop);
    return;
  }

  ctx.save();

  // Боб при беге
  const bob = state.isJumping ? 0 : Math.abs(Math.sin(state.step * Math.PI * 2)) * 3;

  let drawW = SPRITE_W;
  let drawH = SPRITE_H;
  let drawX = PLAYER_X;
  let drawY = groundY - SPRITE_H - bob;

  if (isDucking) {
    // Присед — сжимаем по вертикали, растягиваем по горизонтали
    drawH = SPRITE_H * 0.55;
    drawW = SPRITE_W * 1.2;
    drawX = PLAYER_X - (drawW - SPRITE_W) / 2;
    drawY = groundY - drawH;
  }

  // Буст-оверлей: золотой оттенок
  if (boost) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 24;
  }

  ctx.drawImage(playerImg, drawX, drawY, drawW, drawH);

  ctx.restore();
}

// ─── ОБЪЕКТЫ ────────────────────────────────────────────────────────────────────
function spawnObstacle() {
  const type = Math.random() > 0.5 ? 'low' : 'high';
  state.obstacles.push({ type, x: canvas.width + 40 });
}
function spawnBoost() {
  state.boosts.push({ x: canvas.width + 40 });
}

function drawObstacles() {
  state.obstacles.forEach(o => {
    const b = obstacleBox(o);
    if (o.type === 'low') {
      ctx.font = '40px sans-serif';
      ctx.fillText('🐕', b.x1 - 2, b.y2 + 2);
    } else {
      ctx.font = '38px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🎈', (b.x1 + b.x2) / 2, b.y2 + 4);
      ctx.textAlign = 'left';
    }
  });
}

function drawBoosts() {
  const pulse = 1 + Math.sin(Date.now() / 200) * 0.15;
  state.boosts.forEach(b => {
    const box = boostBox(b);
    const cx = (box.x1 + box.x2) / 2;
    ctx.save();
    ctx.globalAlpha = state.isJumping ? 1 : 0.35;
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18 * pulse;
    ctx.font = `${Math.round(30 * pulse)}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('⚡', cx, box.y2);
    if (!state.isJumping) {
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 300) * 0.3;
      ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#FFD700';
      ctx.fillText('↑', cx, box.y2 + 26);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  });
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────────
function update(dt) {
  if (!state.running) return;
  const runSpeed = state.boost ? 8 : 5;
  const prevStep = state.step;
  state.animTime += dt * runSpeed;
  state.step = state.animTime % 1;
  if (!state.isJumping && !state.isDucking) {
    const crossed = (ph, prev, cur) => (prev < ph && cur >= ph) || (prev > cur && (cur >= ph || prev < ph));
    if (crossed(0.0, prevStep, state.step) || crossed(0.5, prevStep, state.step)) spawnDust(state.boost);
  }
  updateDust(dt); updateFlash(dt); updateParallax(dt);
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) { endGame('timeout'); return; }
  const speed = state.boost ? BASE_SPEED * 2.5 : BASE_SPEED;
  state.distance += speed * dt;
  if (state.boostTimer > 0) { state.boostTimer -= dt; if (state.boostTimer <= 0) state.boost = false; }
  if (state.distance >= TOTAL_DIST) { endGame('finish'); return; }
  state.y += state.vy; state.vy += GRAVITY;
  if (state.y >= GROUND_Y) { state.y = GROUND_Y; state.vy = 0; state.isJumping = false; }
  const moveSpeed = (canvas.width / 2.2) * (state.boost ? 2.5 : 1);
  state.obstacles.forEach(o => o.x -= moveSpeed * dt);
  state.boosts.forEach(b => b.x -= moveSpeed * dt);
  const now = Date.now();
  if (now - state.lastObstacleTime > 1600) { spawnObstacle(); state.lastObstacleTime = now; }
  if (now - state.lastBoostTime    > 4000)  { spawnBoost();    state.lastBoostTime    = now; }
  state.obstacles = state.obstacles.filter(o => o.x > -100);
  state.boosts    = state.boosts.filter(b => b.x > -100);
  checkCollisions();
}

// ─── КОЛЛИЗИИ ─────────────────────────────────────────────────────────────────
function checkCollisions() {
  const pb = playerBox();
  state.obstacles.forEach(o => {
    if (overlaps(pb, obstacleBox(o))) endGame('hit');
  });
  state.boosts = state.boosts.filter(b => {
    if (state.isJumping && overlaps(pb, boostBox(b))) {
      state.boost = true; state.boostTimer = 5;
      triggerBoostFlash();
      return false;
    }
    return true;
  });
}

// ─── DRAW ──────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(shake.x, shake.y);
  drawParallax();
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, GROUND_Y - 10, canvas.width, canvas.height - GROUND_Y + 10);
  const rs = ctx.createLinearGradient(0, GROUND_Y - 10, 0, GROUND_Y + 10);
  rs.addColorStop(0, 'rgba(0,0,0,0.18)'); rs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rs; ctx.fillRect(0, GROUND_Y - 10, canvas.width, 20);
  drawBoosts();
  drawObstacles();
  drawDust();
  drawCharacter(state.y, state.isDucking, state.boost);
  if (state.timeLeft > 55) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('↑ прыжок   ↓ присесть', canvas.width / 2, GROUND_Y - 120);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  drawFlash();
  document.getElementById('timer').textContent = Math.ceil(state.timeLeft);
  document.getElementById('distance').textContent = state.distance.toFixed(2);
}

// ─── РЕЗУЛЬТАТ ─────────────────────────────────────────────────────────────────────
function getMedal(reason, score, elapsed) {
  if (reason === 'finish') {
    if (elapsed <= 30) return { icon: '🥇', label: 'Золотая медаль — спринтер!' };
    if (elapsed <= 45) return { icon: '🥈', label: 'Серебряная медаль' };
    return { icon: '🥉', label: 'Бронза — добежали!' };
  }
  if (score >= 7) return { icon: '👍', label: 'Почти добежал!' };
  if (score >= 4) return { icon: '💪', label: 'Неплохо — ещё раз!' };
  return { icon: '😅', label: 'Попробуй ещё раз' };
}
function endGame(reason) {
  state.running = false;
  const elapsed = parseFloat((GAME_DURATION - state.timeLeft).toFixed(1));
  const score   = parseFloat(state.distance.toFixed(2));
  const medal   = getMedal(reason, score, elapsed);
  if (reason === 'finish') {
    document.getElementById('resultEmoji').textContent = '🏁';
    document.getElementById('resultTitle').textContent = 'Финиш!';
  } else if (reason === 'timeout') {
    document.getElementById('resultEmoji').textContent = '⏰';
    document.getElementById('resultTitle').textContent = 'Время вышло!';
    document.getElementById('resultTitle').style.color = '#aaa';
  } else {
    document.getElementById('resultEmoji').textContent = '💥';
    document.getElementById('resultTitle').textContent = 'Game Over';
    document.getElementById('resultTitle').style.color = '#ff5252';
  }
  document.getElementById('statScore').textContent  = `${score} км`;
  document.getElementById('statTime').textContent   = `${elapsed}с`;
  document.getElementById('medal').textContent      = medal.icon;
  document.getElementById('medalLabel').textContent = medal.label;
  document.getElementById('result').classList.add('show');
  if (window.Telegram?.WebApp)
    Telegram.WebApp.sendData(JSON.stringify({ score, time: elapsed, reason }));
}

function loop() {
  const now = Date.now();
  const dt = Math.min((now - state.lastFrame) / 1000, 0.05);
  state.lastFrame = now;
  update(dt); draw();
  requestAnimationFrame(loop);
}
