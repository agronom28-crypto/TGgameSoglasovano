let canvas, ctx;
let LANE_WIDTH, GROUND_Y;

const LANES = 3;
const PLAYER_W = 50, PLAYER_H = 80;
const GRAVITY = 0.6;
const GAME_DURATION = 60;
const TOTAL_DIST = 10;
const BASE_SPEED = TOTAL_DIST / GAME_DURATION;

let state = {};
let gameLoopId = null;

function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  LANE_WIDTH = canvas.width / LANES;
  GROUND_Y = canvas.height * 0.75;

  state = {
    lane: 1,
    x: 0, y: GROUND_Y,
    vy: 0,
    isJumping: false,
    isDucking: false,
    boost: false,
    boostTimer: 0,
    distance: 0,
    timeLeft: GAME_DURATION,
    running: true,
    obstacles: [],
    boosts: [],
    lastObstacleTime: 0,
    lastBoostTime: 0,
    lastFrame: Date.now(),
  };

  bindControls();
  loop();
}

let touchStartX = 0, touchStartY = 0;

function bindControls() {
  canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -30 && state.lane > 0) state.lane--;
      if (dx > 30  && state.lane < 2) state.lane++;
    } else {
      if (dy < -30 && !state.isJumping) { state.vy = -15; state.isJumping = true; }
      if (dy > 30)  { state.isDucking = true; setTimeout(() => { state.isDucking = false; }, 600); }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  && state.lane > 0) state.lane--;
    if (e.key === 'ArrowRight' && state.lane < 2) state.lane++;
    if (e.key === 'ArrowUp'   && !state.isJumping) { state.vy = -15; state.isJumping = true; }
    if (e.key === 'ArrowDown') { state.isDucking = true; setTimeout(() => state.isDucking = false, 600); }
  });
}

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

function update(dt) {
  if (!state.running) return;

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

function checkCollisions() {
  const px = state.x, py = state.y;
  const ph = state.isDucking ? PLAYER_H * 0.5 : PLAYER_H;
  const pTop = py - ph;

  state.obstacles.forEach(o => {
    if (o.x + 50 < px || o.x > px + PLAYER_W) return;
    if (o.type === 'dog' && o.lanes.includes(state.lane)) endGame('hit');
    if (o.type === 'pit' && o.lanes.includes(state.lane) && !state.isJumping) endGame('hit');
    if (o.type === 'ball' && o.lanes.includes(state.lane) && !state.isDucking && pTop < o.y) endGame('hit');
  });

  state.boosts.forEach((b, i) => {
    if (b.lane === state.lane && b.x < px + PLAYER_W && b.x + 60 > px) {
      state.boost = true; state.boostTimer = 5; state.boosts.splice(i, 1);
    }
  });
}

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

  // Жёлтые ускорители
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

  // Игрок
  ctx.font = '44px sans-serif';
  ctx.fillText(state.isDucking ? '🧎' : '🏃', state.x - 5, state.y - (state.isDucking ? 8 : 5));

  // UI
  document.getElementById('timer').textContent = Math.ceil(state.timeLeft);
  document.getElementById('distance').textContent = state.distance.toFixed(2);
}

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

function loop() {
  const now = Date.now();
  const dt = Math.min((now - state.lastFrame) / 1000, 0.05);
  state.lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}