let canvas, ctx;
let GROUND_Y;

const PLAYER_W = 44, PLAYER_H = 80;
const GRAVITY = 0.6;
const GAME_DURATION = 60;
const TOTAL_DIST = 10;
const BASE_SPEED = TOTAL_DIST / GAME_DURATION;

// Позиция персонажа — фиксированная X
const PLAYER_X = 80;

let state = {};

// ─── ПАРАЛЛАКС ─────────────────────────────────────────────
const PARALLAX_LAYERS = [
  { speed: 0.08, items: [] },
  { speed: 0.30, items: [] },
  { speed: 0.65, items: [] },
];

function initParallax() {
  const W = canvas.width, H = GROUND_Y;
  PARALLAX_LAYERS[0].items = [];
  for (let i = 0; i < 6; i++) {
    PARALLAX_LAYERS[0].items.push({
      x: Math.random() * W * 2, y: H * 0.05 + Math.random() * H * 0.28,
      w: 80 + Math.random() * 120, h: 28 + Math.random() * 26,
    });
  }
  PARALLAX_LAYERS[1].items = [];
  for (let i = 0; i < 10; i++) {
    PARALLAX_LAYERS[1].items.push({
      x: i * (W / 4) + Math.random() * 80,
      type: Math.random() > 0.5 ? 'pine' : 'round',
      h: 70 + Math.random() * 60, trunk: 10 + Math.random() * 8,
    });
  }
  PARALLAX_LAYERS[2].items = [];
  for (let i = 0; i < 14; i++) {
    PARALLAX_LAYERS[2].items.push({
      x: i * (W / 5) + Math.random() * 60,
      type: Math.random() > 0.4 ? 'bush' : 'fence',
      h: 22 + Math.random() * 18,
    });
  }
}

function updateParallax(dt) {
  const moveSpeed = canvas.width / 3;
  const boostMult = state.boost ? 2.5 : 1;
  PARALLAX_LAYERS.forEach(layer => {
    const dx = moveSpeed * layer.speed * boostMult * dt;
    layer.items.forEach(item => {
      item.x -= dx;
      const wrap = layer === PARALLAX_LAYERS[0] ? canvas.width * 2.2
                 : layer === PARALLAX_LAYERS[1] ? canvas.width * 1.6
                 : canvas.width * 1.4;
      if (item.x < -300) item.x += wrap;
    });
  });
}

function drawParallax() {
  const GY = GROUND_Y;
  const sky = ctx.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.6, '#c8e8f7'); sky.addColorStop(1, '#d4edda');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, GY);

  ctx.fillStyle = 'rgba(120,170,100,0.45)';
  ctx.beginPath(); ctx.moveTo(0, GY);
  const hc = 6;
  for (let i = 0; i <= hc; i++) {
    const hx = (i / hc) * canvas.width;
    const peak = GY - 80 - Math.sin(i * 1.3) * 40;
    if (i === 0) ctx.lineTo(hx, peak);
    else ctx.quadraticCurveTo(hx - canvas.width / hc / 2, GY - 55, hx, peak);
  }
  ctx.lineTo(canvas.width, GY); ctx.closePath(); ctx.fill();

  PARALLAX_LAYERS[0].items.forEach(c => {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.shadowColor = 'rgba(200,220,255,0.5)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.3, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.28, c.y - c.h * 0.1, c.w * 0.3, c.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  PARALLAX_LAYERS[1].items.forEach(t => {
    ctx.save(); ctx.globalAlpha = 0.7;
    const base = GY - 14;
    if (t.type === 'pine') {
      ctx.fillStyle = '#6D4C41'; ctx.fillRect(t.x - 4, base - t.trunk, 8, t.trunk);
      for (let tier = 0; tier < 3; tier++) {
        const tH = t.h * (0.5 - tier * 0.1);
        const tY = base - t.trunk - tier * (t.h * 0.28);
        ctx.fillStyle = tier === 0 ? '#2E7D32' : tier === 1 ? '#388E3C' : '#43A047';
        ctx.beginPath(); ctx.moveTo(t.x, tY - tH);
        ctx.lineTo(t.x - tH * 0.55, tY); ctx.lineTo(t.x + tH * 0.55, tY);
        ctx.closePath(); ctx.fill();
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
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.arc(item.x, base - item.h * 0.5, item.h * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath(); ctx.arc(item.x + item.h * 0.4, base - item.h * 0.4, item.h * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(item.x - item.h * 0.38, base - item.h * 0.35, item.h * 0.35, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#795548';
      for (let p = 0; p < 3; p++) {
        const px = item.x + p * 18;
        ctx.fillRect(px, base - item.h, 5, item.h);
        ctx.beginPath(); ctx.moveTo(px, base - item.h); ctx.lineTo(px + 2.5, base - item.h - 8); ctx.lineTo(px + 5, base - item.h); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(item.x - 2, base - item.h * 0.6, 54, 5);
      ctx.fillRect(item.x - 2, base - item.h * 0.3, 54, 5);
    }
    ctx.restore();
  });
}

// ─── ПЫЛЬ ─────────────────────────────────────────────────────────────────────
let dustParticles = [];

function spawnDust(x, groundY, boost) {
  const count = boost ? 3 : 1;
  for (let i = 0; i < count; i++) {
    dustParticles.push({
      x: x + 10 + Math.random() * 24, y: groundY - 2,
      vx: -(1.5 + Math.random() * 2.5), vy: -(0.5 + Math.random() * 1.5),
      r: boost ? (4 + Math.random() * 5) : (2 + Math.random() * 4),
      life: 1.0, decay: 0.04 + Math.random() * 0.04,
      color: boost ? '255,200,50' : '180,150,100',
    });
  }
}
function updateDust(dt) {
  dustParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.r *= 0.97; p.life -= p.decay; });
  dustParticles = dustParticles.filter(p => p.life > 0 && p.r > 0.3);
}
function drawDust() {
  dustParticles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${p.life * 0.7})`; ctx.fill();
  });
}

// ─── ВСПЫШКА БУСТА ───────────────────────────────────────────────────────────
let flash = { active: false, life: 0 };
let burstParticles = [];
let shake = { x: 0, y: 0, life: 0 };

function triggerBoostFlash(px, py) {
  flash = { active: true, life: 1.0 };
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2, speed = 3 + Math.random() * 5;
    burstParticles.push({
      x: px + 22, y: py - 40,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      r: 3 + Math.random() * 4, life: 1.0,
      decay: 0.025 + Math.random() * 0.02,
      hue: 40 + Math.random() * 30,
    });
  }
  shake = { x: 0, y: 0, life: 0.35 };
}
function updateFlash(dt) {
  if (flash.active) { flash.life -= dt * 6; if (flash.life <= 0) { flash.active = false; flash.life = 0; } }
  burstParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.r *= 0.95; p.life -= p.decay; });
  burstParticles = burstParticles.filter(p => p.life > 0 && p.r > 0.3);
  if (shake.life > 0) {
    shake.life -= dt; const mag = shake.life * 10;
    shake.x = (Math.random() - 0.5) * mag; shake.y = (Math.random() - 0.5) * mag;
  } else { shake.x = 0; shake.y = 0; }
}
function drawFlash() {
  if (flash.active && flash.life > 0) {
    ctx.fillStyle = `rgba(255,220,50,${flash.life * 0.45})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  burstParticles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue},100%,60%,${p.life})`; ctx.fill();
    ctx.strokeStyle = `hsla(${p.hue},100%,80%,${p.life * 0.5})`;
    ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke();
  });
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
  loop();
}

// ─── УПРАВЛЕНИЕ: только вверх/вниз ───────────────────────────────────────
let touchStartY = 0;

function bindControls() {
  const doJump = () => { if (!state.isJumping) { state.vy = -15; state.isJumping = true; } };
  const doDuck = () => {
    if (!state.isDucking) {
      state.isDucking = true;
      setTimeout(() => { state.isDucking = false; }, 600);
    }
  };

  canvas.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; });
  canvas.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy < -30) doJump();
    if (dy > 30)  doDuck();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp'   || e.key === ' ') doJump();
    if (e.key === 'ArrowDown' || e.key === 's') doDuck();
  });
}

// ─── ПЕРСОНАЖ ─────────────────────────────────────────────────────────────────
function drawCharacter(x, ground, phase, isDucking, boost) {
  const t = phase * Math.PI * 2;
  const color = boost ? '#FFD700' : '#1565C0';
  const skin = '#FFCC80', suit = color, tie = boost ? '#FF6B00' : '#E53935';
  ctx.save();
  if (isDucking) {
    const bx = x + 22;
    ctx.fillStyle = suit; ctx.fillRect(x + 4, ground - 38, 36, 22);
    ctx.beginPath(); ctx.arc(bx, ground - 44, 14, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(x + 6, ground - 18, 13, 18); ctx.fillRect(x + 23, ground - 18, 13, 18);
    ctx.fillStyle = '#333'; ctx.fillRect(x + 4, ground - 2, 17, 8); ctx.fillRect(x + 21, ground - 2, 17, 8);
    ctx.restore(); return;
  }
  const legSwing = Math.sin(t) * 28, armSwing = Math.cos(t) * 22;
  const bodyBob = Math.abs(Math.sin(t)) * 4, bx = x + 22, baseY = ground - bodyBob;
  const tieSway = -Math.sin(t) * 8;
  ctx.save(); ctx.translate(bx - 2 + tieSway, baseY - 58); ctx.rotate(tieSway * 0.06);
  ctx.fillStyle = tie; ctx.fillRect(-3, 0, 6, 22);
  ctx.beginPath(); ctx.moveTo(-5, 22); ctx.lineTo(5, 22); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(bx - 6, baseY - 24); ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(-5, 0, 10, 24); ctx.translate(0, 24);
  ctx.rotate((-legSwing * 0.6 * Math.PI) / 180); ctx.fillRect(-4, 0, 9, 20);
  ctx.fillStyle = '#333'; ctx.fillRect(-6, 18, 16, 7); ctx.restore();
  ctx.save(); ctx.translate(bx + 6, baseY - 24); ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(-5, 0, 10, 24); ctx.translate(0, 24);
  ctx.rotate((legSwing * 0.6 * Math.PI) / 180); ctx.fillRect(-4, 0, 9, 20);
  ctx.fillStyle = '#333'; ctx.fillRect(-6, 18, 16, 7); ctx.restore();
  ctx.fillStyle = suit; ctx.beginPath(); ctx.roundRect(bx - 16, baseY - 62, 32, 38, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(bx - 5, baseY - 62, 10, 24);
  ctx.save(); ctx.translate(bx - 16, baseY - 56); ctx.rotate((armSwing * Math.PI) / 180);
  ctx.fillStyle = suit; ctx.fillRect(-5, 0, 9, 20); ctx.fillStyle = skin; ctx.fillRect(-4, 18, 8, 10); ctx.restore();
  ctx.save(); ctx.translate(bx + 16, baseY - 56); ctx.rotate((-armSwing * Math.PI) / 180);
  ctx.fillStyle = suit; ctx.fillRect(-4, 0, 9, 20); ctx.fillStyle = skin; ctx.fillRect(-3, 18, 8, 10); ctx.restore();
  ctx.beginPath(); ctx.arc(bx, baseY - 72, 14, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, baseY - 80, 14, Math.PI, 0); ctx.fillStyle = '#4E342E'; ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 5, baseY - 73, 3, 0, Math.PI * 2); ctx.fillStyle = '#1a1a2e'; ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 4, baseY - 65, 4, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); ctx.translate(bx + 18, baseY - 50); ctx.rotate(Math.sin(t) * 0.15);
  ctx.fillStyle = '#5D4037'; ctx.fillRect(0, 0, 18, 14);
  ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, 18, 14);
  ctx.beginPath(); ctx.arc(9, -1, 5, Math.PI, 0); ctx.stroke(); ctx.restore();
  ctx.restore();
}

// ─── ОБЪЕКТЫ: спавн справа, летят влево ───────────────────────────────
function spawnObstacle() {
  // тип: low (на земле), high (в воздухе — нужно присесть)
  const type = Math.random() > 0.5 ? 'low' : 'high';
  state.obstacles.push({
    type,
    x: canvas.width + 60,
    y: type === 'low' ? GROUND_Y : GROUND_Y - 90,   // low — перепрыгнуть, high — присесть
    w: type === 'low' ? 36 : 44,
    h: type === 'low' ? 50 : 36,
  });
}

function spawnBoost() {
  // Буст появляется на средней высоте
  state.boosts.push({ x: canvas.width + 60, y: GROUND_Y - 40 });
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────────
function update(dt) {
  if (!state.running) return;

  const runSpeed = state.boost ? 8 : 5;
  const prevStep = state.step;
  state.animTime += dt * runSpeed;
  state.step = state.animTime % 1;

  // Пыль следам
  if (!state.isJumping && !state.isDucking) {
    const crossed = (ph, prev, cur) => (prev < ph && cur >= ph) || (prev > cur && (cur >= ph || prev < ph));
    if (crossed(0.0, prevStep, state.step) || crossed(0.5, prevStep, state.step))
      spawnDust(PLAYER_X, state.y, state.boost);
  }

  updateDust(dt); updateFlash(dt); updateParallax(dt);

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) { endGame('timeout'); return; }

  const speed = state.boost ? BASE_SPEED * 2.5 : BASE_SPEED;
  state.distance += speed * dt;
  if (state.boostTimer > 0) { state.boostTimer -= dt; if (state.boostTimer <= 0) state.boost = false; }
  if (state.distance >= TOTAL_DIST) { endGame('finish'); return; }

  // Физика прыжка
  state.y += state.vy; state.vy += GRAVITY;
  if (state.y >= GROUND_Y) { state.y = GROUND_Y; state.vy = 0; state.isJumping = false; }

  // Объекты летят на игрока
  const moveSpeed = canvas.width / 2.2;
  const boostMul  = state.boost ? 2.5 : 1;
  state.obstacles.forEach(o => o.x -= moveSpeed * boostMul * dt);
  state.boosts.forEach(b => b.x    -= moveSpeed * boostMul * dt);

  if (Date.now() - state.lastObstacleTime > 1600) { spawnObstacle(); state.lastObstacleTime = Date.now(); }
  if (Date.now() - state.lastBoostTime    > 4000)  { spawnBoost();    state.lastBoostTime    = Date.now(); }

  state.obstacles = state.obstacles.filter(o => o.x > -100);
  state.boosts    = state.boosts.filter(b => b.x > -100);

  checkCollisions();
}

// ─── КОЛЛИЗИИ ─────────────────────────────────────────────────────────────────
function checkCollisions() {
  const px = PLAYER_X, py = state.y;
  const ph = state.isDucking ? PLAYER_H * 0.5 : PLAYER_H;
  const pTop = py - ph, pRight = px + PLAYER_W;

  state.obstacles.forEach(o => {
    // Горизонтальное пересечение
    if (o.x + o.w < px || o.x > pRight) return;
    // Вертикальное пересечение
    if (o.type === 'low') {
      // препятствие на земле — избегается прыжком
      if (!state.isJumping && py > o.y - o.h) endGame('hit');
    } else {
      // препятствие в воздухе — избегается приседанием
      if (!state.isDucking && pTop < o.y + o.h) endGame('hit');
    }
  });

  state.boosts.forEach((b, i) => {
    if (b.x + 40 < px || b.x > pRight) return;
    if (py - 70 < b.y + 20 && py > b.y - 20) {
      state.boost = true; state.boostTimer = 5; state.boosts.splice(i, 1);
      triggerBoostFlash(PLAYER_X, state.y);
    }
  });
}

// ─── DRAW ──────────────────────────────────────────────────────────────────────
function drawObstacles() {
  state.obstacles.forEach(o => {
    if (o.type === 'low') {
      // Собака на земле
      ctx.font = '44px sans-serif';
      ctx.fillText('🐕', o.x, o.y);
    } else {
      // Шарик в воздухе
      ctx.font = '38px sans-serif';
      ctx.fillText('🎈', o.x, o.y + o.h);
    }
  });
}

function drawBoosts() {
  state.boosts.forEach(b => {
    // Свечение — пульсация
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.15;
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 18 * pulse;
    ctx.font = `${Math.round(32 * pulse)}px sans-serif`;
    ctx.fillText('⚡', b.x, b.y);
    ctx.restore();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(shake.x, shake.y);

  // 1. Параллакс-фон
  drawParallax();

  // 2. Дорожка
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, GROUND_Y - 10, canvas.width, canvas.height - GROUND_Y + 10);
  const roadShadow = ctx.createLinearGradient(0, GROUND_Y - 10, 0, GROUND_Y + 10);
  roadShadow.addColorStop(0, 'rgba(0,0,0,0.18)'); roadShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = roadShadow; ctx.fillRect(0, GROUND_Y - 10, canvas.width, 20);

  // 3. Объекты + пыль + персонаж
  drawBoosts();
  drawObstacles();
  drawDust();
  drawCharacter(PLAYER_X, state.y, state.step, state.isDucking, state.boost);

  // Подсказка управления в начале
  if (state.timeLeft > 55) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑ прыжок   ↓ присесть', canvas.width / 2, GROUND_Y - 120);
    ctx.restore();
  }

  ctx.restore();
  drawFlash();

  document.getElementById('timer').textContent = Math.ceil(state.timeLeft);
  document.getElementById('distance').textContent = state.distance.toFixed(2);
}

// ─── ЭКРАН РЕЗУЛЬТАТА ────────────────────────────────────────────────────────
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
