// ─── WEB AUDIO ЗВУКОВЫЕ ЭФФЕКТЫ ─────────────────────────────────────────────
// Все звуки синтезируются через Web Audio API — никаких файлов не нужно.

let _ctx = null;
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Разблокировка на iOS: resume после первого пользовательского действия
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── ПРЫЖОК: короткий свистящий глиссандо вверх ───────────────────────────────
function sfxJump() {
  const c = ac(), t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.18);
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.start(t); osc.stop(t + 0.22);
}

// ── ПРИЗЕМЛЕНИЕ: тупой удар + лёгкий шорох ───────────────────────────────────
function sfxLand() {
  const c = ac(), t = c.currentTime;
  // низкий удар
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.start(t); osc.stop(t + 0.14);
  // шорох пыли
  const buf = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = c.createBufferSource();
  const ng = c.createGain();
  const filt = c.createBiquadFilter();
  noise.buffer = buf;
  filt.type = 'bandpass'; filt.frequency.value = 800; filt.Q.value = 0.8;
  noise.connect(filt); filt.connect(ng); ng.connect(c.destination);
  ng.gain.setValueAtTime(0.1, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  noise.start(t);
}

// ── БУСТ: нарастающий электрический аккорд + arpeggio ────────────────────────
function sfxBoost() {
  const c = ac(), t = c.currentTime;
  const freqs = [330, 415, 523, 659, 830];
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(f, t + i * 0.04);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + i * 0.04 + 0.35);
    gain.gain.setValueAtTime(0, t + i * 0.04);
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.04 + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.4);
    osc.start(t + i * 0.04);
    osc.stop(t + i * 0.04 + 0.42);
  });
  // "ВАУ" лоу-пасс свуп
  const osc2 = c.createOscillator();
  const g2 = c.createGain();
  const f2 = c.createBiquadFilter();
  osc2.connect(f2); f2.connect(g2); g2.connect(c.destination);
  osc2.type = 'sawtooth'; osc2.frequency.value = 80;
  f2.type = 'lowpass';
  f2.frequency.setValueAtTime(200, t);
  f2.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
  g2.gain.setValueAtTime(0.18, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc2.start(t); osc2.stop(t + 0.36);
}

// ── УДАР / СТОЛКНОВЕНИЕ: грубый удар + нарастающий шум ───────────────────────
function sfxHit() {
  const c = ac(), t = c.currentTime;
  // удар
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.start(t); osc.stop(t + 0.28);
  // белый шум «бам»
  const dur = 0.3;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  const ng = c.createGain();
  const filt = c.createBiquadFilter();
  noise.buffer = buf; filt.type = 'lowpass'; filt.frequency.value = 400;
  noise.connect(filt); filt.connect(ng); ng.connect(c.destination);
  ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.start(t);
}

// ── ФИНИШ: весёлые трезвучия восходящие ──────────────────────────────────────
function sfxFinish() {
  const c = ac(), t = c.currentTime;
  const melody = [523, 659, 784, 1047];
  melody.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'triangle';
    osc.frequency.value = f;
    const st = t + i * 0.13;
    gain.gain.setValueAtTime(0.22, st);
    gain.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
    osc.start(st); osc.stop(st + 0.3);
  });
}

// ── Утка (нырок): низкий «вух» ────────────────────────────────────────────────
function sfxDuck() {
  const c = ac(), t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.14);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.start(t); osc.stop(t + 0.16);
}
