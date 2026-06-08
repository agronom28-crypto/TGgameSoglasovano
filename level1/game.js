let canvas, ctx;
let LANE_WIDTH, GROUND_Y;

const LANES = 3;
const PLAYER_W = 44, PLAYER_H = 80;
const GRAVITY = 0.6;
const GAME_DURATION = 60;
const TOTAL_DIST = 10;
const BASE_SPEED = TOTAL_DIST / GAME_DURATION;

let state = {};

function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  LANE_WIDTH = canvas.width / LANES;
  GROUND_Y = canvas.height * 0.75;

  state = {
    lane: 1, x: 0, y: GROUND_Y,
    vy: 0, isJumping: false, isDucking: false,
    boost: false, boostTimer: 0,
    distance: 0, timeLeft: GAME_DURATION, running: true,
    obstacles: [], boosts: [],
    lastObstacleTime: 0, lastBoostTime: 0,
    lastFrame: Date.now(),
    animTime: 0,   // счётчик времени анимации
    step: 0,       // фаза шага 0..1
  };

  bindControls();
  loop();
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

// ─── РИСОВАНИЕ ПЕРСОНАЖА ГЕОМЕТРИЕЙ ─────────────────────
function drawCharacter(x, ground, phase, isDucking, boost) {
  // phase 0..1 — фаза цикла бега
  const t = phase * Math.PI * 2;
  const color = boost ? '#FFD700' : '#1565C0';   // синий / золотой при бусте
  const skin  = '#FFCC80';
  const suit  = color;
  const tie   = boost ? '#FF6B00' : '#E53935';

  ctx.save();

  if (isDucking) {
    // ── НЫРОК ── приседание
    const bx = x + 22, by = ground - 28;
    // тело
    ctx.fillStyle = suit;
    ctx.fillRect(x + 4, ground - 38, 36, 22);
    // голова
    ctx.beginPath();
    ctx.arc(bx, ground - 44, 14, 0, Math.PI * 2);
    ctx.fillStyle = skin; ctx.fill();
    // ноги
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 6,  ground - 18, 13, 18);
    ctx.fillRect(x + 23, ground - 18, 13, 18);
    // туфли
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 4,  ground - 2, 17, 8);
    ctx.fillRect(x + 21, ground - 2, 17, 8);
    ctx.restore();
    return;
  }

  // ── БЕГ ── анимированные конечности
  const legSwing  = Math.sin(t) * 28;       // размах ног
  const armSwing  = Math.cos(t) * 22;       // размах рук (в противофазе)
  const bodyBob   = Math.abs(Math.sin(t)) * 4; // лёгкое подпрыгивание тела

  const bx = x + 22;                        // центр X
  const baseY = ground - bodyBob;           // нижняя точка тела

  // --- ГАЛСТУК болтается сзади (смещение в сторону, обратную движению) ---
  const tieSway = -Math.sin(t) * 8;
  ctx.save();
  ctx.translate(bx - 2 + tieSway, baseY - 58);
  ctx.rotate(tieSway * 0.06);
  ctx.fillStyle = tie;
  ctx.fillRect(-3, 0, 6, 22);
  ctx.beginPath();
  ctx.moveTo(-5, 22); ctx.lineTo(5, 22); ctx.lineTo(0, 30);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // --- НОГИ (бёдра + голени) ---
  // Нога 1
  ctx.save();
  ctx.translate(bx - 6, baseY - 24);
  ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-5, 0, 10, 24);   // бедро
  ctx.translate(0, 24);
  ctx.rotate((-legSwing * 0.6 * Math.PI) / 180);
  ctx.fillRect(-4, 0, 9, 20);    // голень
  ctx.fillStyle = '#333';
  ctx.fillRect(-6, 18, 16, 7);   // туфля
  ctx.restore();

  // Нога 2 (в противофазе)
  ctx.save();
  ctx.translate(bx + 6, baseY - 24);
  ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-5, 0, 10, 24);
  ctx.translate(0, 24);
  ctx.rotate((legSwing * 0.6 * Math.PI) / 180);
  ctx.fillRect(-4, 0, 9, 20);
  ctx.fillStyle = '#333';
  ctx.fillRect(-6, 18, 16, 7);
  ctx.restore();

  // --- ТЕЛО (пиджак / рубашка) ---
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.roundRect(bx - 16, baseY - 62, 32, 38, 6);
  ctx.fill();

  // Рубашка-вставка
  ctx.fillStyle = '#fff';
  ctx.fillRect(bx - 5, baseY - 62, 10, 24);

  // --- РУКИ ---
  // Рука 1
  ctx.save();
  ctx.translate(bx - 16, baseY - 56);
  ctx.rotate((armSwing * Math.PI) / 180);
  ctx.fillStyle = suit;
  ctx.fillRect(-5, 0, 9, 20);
  ctx.fillStyle = skin;
  ctx.fillRect(-4, 18, 8, 10);
  ctx.restore();

  // Рука 2 (в противофазе)
  ctx.save();
  ctx.translate(bx + 16, baseY - 56);
  ctx.rotate((-armSwing * Math.PI) / 180);
  ctx.fillStyle = suit;
  ctx.fillRect(-4, 0, 9, 20);
  ctx.fillStyle = skin;
  ctx.fillRect(-3, 18, 8, 10);
  ctx.restore();

  // --- ГОЛОВА ---
  ctx.beginPath();
  ctx.arc(bx, baseY - 72, 14, 0, Math.PI * 2);
  ctx.fillStyle = skin; ctx.fill();

  // Волосы
  ctx.beginPath();
  ctx.arc(bx, baseY - 80, 14, Math.PI, 0);
  ctx.fillStyle = '#4E342E'; ctx.fill();

  // Глаз
  ctx.beginPath();
  ctx.arc(bx + 5, baseY - 73, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e'; ctx.fill();

  // Рот
  ctx.beginPath();
  ctx.arc(bx + 4, baseY - 65, 4, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = 1.5; ctx.stroke();

  // --- ПОРТФЕЛЬ (покачивается) ---
  ctx.save();
  ctx.translate(bx + 18, baseY - 50);
  ctx.rotate(Math.sin(t) * 0.15);
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(0, 0, 18, 14);
  ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 18, 14);
  // ручка портфеля
  ctx.beginPath();
  ctx.arc(9, -1, 5, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ─── СПАВН ───────────────────────────────────────────────
function spawnObstacle() {
  const types = ['dog', 'pit', 'ball'];
  const type = types[Math.floor(Math.random() * types.length)];
  let lanes;
  if (type === 'dog') {
    const free = Math.floor(Math.random() * 3);
    lanes = [0,1,2].filter(l => l !== free);
  } else {
    lanes = [Math.floor(Math.random() * 3)];
  }
  state.obstacles.push({ type, lanes, x: canvas.width + 60, y: type === 'ball' ? GROUND_Y - 120 : GROUND_Y });
}
function spawnBoostStrip() {
  state.boosts.push({ x: canvas.width + 60, lane: Math.floor(Math.random() * 3) });
}

// ─── UPDATE ──────────────────────────────────────────────
function update(dt) {
  if (!state.running) return;

  // Анимация шага
  const runSpeed = state.boost ? 8 : 5;  // циклов в сек
  state.animTime += dt * runSpeed;
  state.step = state.animTime % 1;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) { endGame('timeout'); return; }

  const speed = state.boost ? BASE_SPEED * 2.5 : BASE_SPEED;
  state.distance += speed * dt;
  if (state.boostTimer > 0) { state.boostTimer -= dt; if (state.boostTimer <= 0) state.boost = false; }
  if (state.distance >= TOTAL_DIST) { endGame('finish'); return; }

  const targetX = LANE_WIDTH * state.lane + LANE_WIDTH / 2 - PLAYER_W / 2;
  state.x += (targetX - state.x) * 0.2;

  state.y += state.vy;
  state.vy += GRAVITY;
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

// ─── КОЛЛИЗИИ ────────────────────────────────────────────
function checkCollisions() {
  const px = state.x, py = state.y;
  const ph = state.isDucking ? PLAYER_H * 0.5 : PLAYER_H;
  const pTop = py - ph;
  state.obstacles.forEach(o => {
    if (o.x + 50 < px || o.x > px + PLAYER_W) return;
    if (o.type === 'dog'  && o.lanes.includes(state.lane)) endGame('hit');
    if (o.type === 'pit'  && o.lanes.includes(state.lane) && !state.isJumping) endGame('hit');
    if (o.type === 'ball' && o.lanes.includes(state.lane) && !state.isDucking && pTop < o.y) endGame('hit');
  });
  state.boosts.forEach((b, i) => {
    if (b.lane === state.lane && b.x < px + PLAYER_W && b.x + 60 > px) {
      state.boost = true; state.boostTimer = 5; state.boosts.splice(i, 1);
    }
  });
}

// ─── DRAW ─────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Фон
  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Дорожка
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, GROUND_Y - 10, canvas.width, 120);

  // Полосы
  for (let i = 1; i < LANES; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(LANE_WIDTH * i, GROUND_Y - 10);
    ctx.lineTo(LANE_WIDTH * i, GROUND_Y + 110);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Ускорители
  state.boosts.forEach(b => {
    ctx.fillStyle = '#FFF176';
    ctx.fillRect(b.x, GROUND_Y - 10, 60, 120);
    ctx.fillStyle = '#FF6B00';
    ctx.font = '20px sans-serif';
    ctx.fillText('⚡', b.x + 15, GROUND_Y + 50);
  });

  // Препятствия
  state.obstacles.forEach(o => {
    if (o.type === 'dog') {
      o.lanes.forEach(l => {
        ctx.font = '44px sans-serif';
        ctx.fillText('🐕', LANE_WIDTH * l + LANE_WIDTH/2 - 22, GROUND_Y - 5);
      });
    }
    if (o.type === 'pit') {
      o.lanes.forEach(l => {
        ctx.fillStyle = '#111';
        ctx.fillRect(LANE_WIDTH * l + 5, GROUND_Y - 5, LANE_WIDTH - 10, 35);
        ctx.font = '26px sans-serif';
        ctx.fillText('🕳️', LANE_WIDTH * l + LANE_WIDTH/2 - 13, GROUND_Y + 28);
      });
    }
    if (o.type === 'ball') {
      ctx.font = '38px sans-serif';
      ctx.fillText('🎈', o.x, o.y);
    }
  });

  // Персонаж
  drawCharacter(state.x, state.y, state.step, state.isDucking, state.boost);

  // UI
  document.getElementById('timer').textContent = Math.ceil(state.timeLeft);
  document.getElementById('distance').textContent = state.distance.toFixed(2);
}

// ─── END ─────────────────────────────────────────────────
function endGame(reason) {
  state.running = false;
  const el = document.getElementById('result');
  el.style.display = 'block';
  const elapsed = (GAME_DURATION - state.timeLeft).toFixed(1);
  const score = state.distance.toFixed(2);
  if (reason === 'finish') {
    el.innerHTML = `🏁 Финиш!<br>Время: ${elapsed}с`;
    if (window.Telegram?.WebApp) Telegram.WebApp.sendData(JSON.stringify({ score, time: elapsed }));
  } else if (reason === 'timeout') {
    el.innerHTML = `⏰ Время вышло!<br>Пройдено: ${score} км<br><button onclick="location.reload()">Ещё раз</button>`;
  } else {
    el.innerHTML = `💥 Game Over!<br>Пройдено: ${score} км<br><button onclick="location.reload()">Ещё раз</button>`;
  }
}

// ─── LOOP ─────────────────────────────────────────────────
function loop() {
  const now = Date.now();
  const dt = Math.min((now - state.lastFrame) / 1000, 0.05);
  state.lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
