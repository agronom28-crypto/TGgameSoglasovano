let canvas, ctx;
let LANE_WIDTH, GROUND_Y;

const LANES = 3;
const PLAYER_W = 44, PLAYER_H = 80;
const GRAVITY = 0.6;
const GAME_DURATION = 60;
const TOTAL_DIST = 10;
const BASE_SPEED = TOTAL_DIST / GAME_DURATION;

let state = {};

// ─── ПЫЛЬ ───────────────────────────────────────────────
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

// ─── ВСПЫШКА БУСТА ──────────────────────────────────
let flash = { active: false, life: 0 };
let burstParticles = [];
let shake = { x: 0, y: 0, life: 0 };

function triggerBoostFlash(px, py) {
  flash = { active: true, life: 1.0 };
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
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

function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  LANE_WIDTH = canvas.width / LANES; GROUND_Y = canvas.height * 0.75;
  dustParticles = []; burstParticles = [];
  flash = { active: false, life: 0 }; shake = { x: 0, y: 0, life: 0 };

  state = {
    lane: 1, x: 0, y: GROUND_Y,
    vy: 0, isJumping: false, isDucking: false,
    boost: false, boostTimer: 0,
    distance: 0, timeLeft: GAME_DURATION, running: true,
    obstacles: [], boosts: [],
    lastObstacleTime: 0, lastBoostTime: 0,
    lastFrame: Date.now(), animTime: 0, step: 0,
  };
  bindControls(); loop();
}

let touchStartX = 0, touchStartY = 0;
function bindControls() {
  canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -30 && state.lane > 0) state.lane--;
      if (dx > 30  && state.lane < 2) state.lane++;
    } else {
      if (dy < -30 && !state.isJumping) { state.vy = -15; state.isJumping = true; }
      if (dy > 30) { state.isDucking = true; setTimeout(() => { state.isDucking = false; }, 600); }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  && state.lane > 0) state.lane--;
    if (e.key === 'ArrowRight' && state.lane < 2) state.lane++;
    if (e.key === 'ArrowUp'   && !state.isJumping) { state.vy = -15; state.isJumping = true; }
    if (e.key === 'ArrowDown') { state.isDucking = true; setTimeout(() => state.isDucking = false, 600); }
  });
}

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

function spawnObstacle() {
  const types = ['dog', 'pit', 'ball'];
  const type = types[Math.floor(Math.random() * types.length)];
  let lanes;
  if (type === 'dog') { const free = Math.floor(Math.random() * 3); lanes = [0,1,2].filter(l => l !== free); }
  else lanes = [Math.floor(Math.random() * 3)];
  state.obstacles.push({ type, lanes, x: canvas.width + 60, y: type === 'ball' ? GROUND_Y - 120 : GROUND_Y });
}
function spawnBoostStrip() {
  state.boosts.push({ x: canvas.width + 60, lane: Math.floor(Math.random() * 3) });
}

function update(dt) {
  if (!state.running) return;
  const runSpeed = state.boost ? 8 : 5;
  const prevStep = state.step;
  state.animTime += dt * runSpeed;
  state.step = state.animTime % 1;
  if (!state.isJumping && !state.isDucking) {
    const crossed = (ph, prev, cur) => (prev < ph && cur >= ph) || (prev > cur && (cur >= ph || prev < ph));
    if (crossed(0.0, prevStep, state.step) || crossed(0.5, prevStep, state.step))
      spawnDust(state.x, state.y, state.boost);
  }
  updateDust(dt); updateFlash(dt);
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) { endGame('timeout'); return; }
  const speed = state.boost ? BASE_SPEED * 2.5 : BASE_SPEED;
  state.distance += speed * dt;
  if (state.boostTimer > 0) { state.boostTimer -= dt; if (state.boostTimer <= 0) state.boost = false; }
  if (state.distance >= TOTAL_DIST) { endGame('finish'); return; }
  const targetX = LANE_WIDTH * state.lane + LANE_WIDTH / 2 - PLAYER_W / 2;
  state.x += (targetX - state.x) * 0.2;
  state.y += state.vy; state.vy += GRAVITY;
  if (state.y >= GROUND_Y) { state.y = GROUND_Y; state.vy = 0; state.isJumping = false; }
  const moveSpeed = canvas.width / 3;
  state.obstacles.forEach(o => o.x -= moveSpeed * dt);
  state.boosts.forEach(b => b.x -= moveSpeed * dt);
  if (Date.now() - state.lastObstacleTime > 1800) { spawnObstacle(); state.lastObstacleTime = Date.now(); }
  if (Date.now() - state.lastBoostTime > 4000)    { spawnBoostStrip(); state.lastBoostTime = Date.now(); }
  state.obstacles = state.obstacles.filter(o => o.x > -100);
  state.boosts    = state.boosts.filter(b => b.x > -100);
  checkCollisions();
}

function checkCollisions() {
  const px = state.x, py = state.y;
  const ph = state.isDucking ? PLAYER_H * 0.5 : PLAYER_H, pTop = py - ph;
  state.obstacles.forEach(o => {
    if (o.x + 50 < px || o.x > px + PLAYER_W) return;
    if (o.type === 'dog'  && o.lanes.includes(state.lane)) endGame('hit');
    if (o.type === 'pit'  && o.lanes.includes(state.lane) && !state.isJumping) endGame('hit');
    if (o.type === 'ball' && o.lanes.includes(state.lane) && !state.isDucking && pTop < o.y) endGame('hit');
  });
  state.boosts.forEach((b, i) => {
    if (b.lane === state.lane && b.x < px + PLAYER_W && b.x + 60 > px) {
      state.boost = true; state.boostTimer = 5; state.boosts.splice(i, 1);
      triggerBoostFlash(state.x, state.y);
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#2d5a27'; ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
  ctx.fillStyle = '#8B7355'; ctx.fillRect(0, GROUND_Y - 10, canvas.width, 120);
  for (let i = 1; i < LANES; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([20, 15]);
    ctx.beginPath(); ctx.moveTo(LANE_WIDTH * i, GROUND_Y - 10); ctx.lineTo(LANE_WIDTH * i, GROUND_Y + 110);
    ctx.stroke(); ctx.setLineDash([]);
  }
  state.boosts.forEach(b => {
    ctx.fillStyle = '#FFF176'; ctx.fillRect(b.x, GROUND_Y - 10, 60, 120);
    ctx.fillStyle = '#FF6B00'; ctx.font = '20px sans-serif'; ctx.fillText('⚡', b.x + 15, GROUND_Y + 50);
  });
  state.obstacles.forEach(o => {
    if (o.type === 'dog') o.lanes.forEach(l => { ctx.font = '44px sans-serif'; ctx.fillText('🐕', LANE_WIDTH * l + LANE_WIDTH/2 - 22, GROUND_Y - 5); });
    if (o.type === 'pit') o.lanes.forEach(l => {
      ctx.fillStyle = '#111'; ctx.fillRect(LANE_WIDTH * l + 5, GROUND_Y - 5, LANE_WIDTH - 10, 35);
      ctx.font = '26px sans-serif'; ctx.fillText('🕳️', LANE_WIDTH * l + LANE_WIDTH/2 - 13, GROUND_Y + 28);
    });
    if (o.type === 'ball') { ctx.font = '38px sans-serif'; ctx.fillText('🎈', o.x, o.y); }
  });
  drawDust();
  drawCharacter(state.x, state.y, state.step, state.isDucking, state.boost);
  ctx.restore();
  drawFlash();
  document.getElementById('timer').textContent = Math.ceil(state.timeLeft);
  document.getElementById('distance').textContent = state.distance.toFixed(2);
}

// ─── ЭКРАН РЕЗУЛЬТАТА ──────────────────────────────────
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

  // Заполняем карточку
  if (reason === 'finish') {
    document.getElementById('resultEmoji').textContent  = '🏁';
    document.getElementById('resultTitle').textContent  = 'Финиш!';
  } else if (reason === 'timeout') {
    document.getElementById('resultEmoji').textContent  = '⏰';
    document.getElementById('resultTitle').textContent  = 'Время вышло!';
    document.getElementById('resultTitle').style.color  = '#aaa';
  } else {
    document.getElementById('resultEmoji').textContent  = '💥';
    document.getElementById('resultTitle').textContent  = 'Game Over';
    document.getElementById('resultTitle').style.color  = '#ff5252';
  }

  document.getElementById('statScore').textContent  = `${score} км`;
  document.getElementById('statTime').textContent   = `${elapsed}с`;
  document.getElementById('medal').textContent      = medal.icon;
  document.getElementById('medalLabel').textContent = medal.label;

  // Показываем экран
  document.getElementById('result').classList.add('show');

  // Отправляем данные в Telegram
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
