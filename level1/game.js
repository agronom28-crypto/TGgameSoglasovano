let canvas, ctx;
let GROUND_Y;
let PLAYER_X;

const GRAVITY       = 0.6;
const GAME_DURATION = 60;
const TOTAL_DIST    = 10;
const BASE_SPEED    = TOTAL_DIST / GAME_DURATION;

const FRAME_COUNT = 6;
let realFrameW = 128;
let realFrameH = 192;

const SPRITE_W  = 100;
const SPRITE_H  = 150;
const ANIM_FPS  = 12;
const FEET_OFFSET = 0.12;

const P = {
  left:  10,
  right: 90,
  get fullTop() { return -SPRITE_H * (1 - FEET_OFFSET); },
  get duckTop()  { return -Math.round(SPRITE_H * 0.45); },
};

let runImg = null, cleanFrames = null, fallbackImg = null, imgMode = 'none';

function removeWhiteBg(img) {
  const oc = document.createElement('canvas');
  oc.width = img.naturalWidth; oc.height = img.naturalHeight;
  const ox = oc.getContext('2d');
  ox.drawImage(img, 0, 0);
  const data = ox.getImageData(0, 0, oc.width, oc.height), d = data.data;
  for (let i = 0; i < d.length; i += 4)
    if (d[i] > 220 && d[i+1] > 220 && d[i+2] > 220) d[i+3] = 0;
  ox.putImageData(data, 0, 0);
  return oc;
}

function loadAssets(cb) {
  runImg = new Image();
  runImg.crossOrigin = 'anonymous';
  runImg.onload = () => {
    realFrameW  = Math.floor(runImg.naturalWidth / FRAME_COUNT);
    realFrameH  = runImg.naturalHeight;
    cleanFrames = removeWhiteBg(runImg);
    imgMode = 'sheet'; cb();
  };
  runImg.onerror = () => {
    fallbackImg = new Image();
    fallbackImg.onload  = () => { imgMode = 'single'; cb(); };
    fallbackImg.onerror = () => { imgMode = 'none';   cb(); };
    fallbackImg.src = '../Pictures/3D%20person.png';
  };
  runImg.src = '../Pictures/run_spritesheet.webp';
}

let state = {};

// ─── ПАРАЛЛАКС
const PARALLAX_LAYERS = [
  { speed: 0.08, items: [] },
  { speed: 0.30, items: [] },
  { speed: 0.65, items: [] },
];
function initParallax() {
  const W = canvas.width;
  PARALLAX_LAYERS[0].items = [];
  for (let i = 0; i < 6; i++)
    PARALLAX_LAYERS[0].items.push({ x: Math.random()*W*2, y: GROUND_Y*0.1+Math.random()*GROUND_Y*0.28, w: 80+Math.random()*120, h: 28+Math.random()*26 });
  PARALLAX_LAYERS[1].items = [];
  for (let i = 0; i < 10; i++)
    PARALLAX_LAYERS[1].items.push({ x: i*(W/4)+Math.random()*80, type: Math.random()>0.5?'pine':'round', h: 70+Math.random()*60, trunk: 10+Math.random()*8 });
  PARALLAX_LAYERS[2].items = [];
  for (let i = 0; i < 14; i++)
    PARALLAX_LAYERS[2].items.push({ x: i*(W/5)+Math.random()*60, type: Math.random()>0.4?'bush':'fence', h: 22+Math.random()*18 });
}
function updateParallax(dt) {
  const ms = canvas.width/3, bm = state.boost?2.5:1;
  PARALLAX_LAYERS.forEach((layer,li) => {
    const dx = ms*layer.speed*bm*dt;
    const wrap = [canvas.width*2.2, canvas.width*1.6, canvas.width*1.4][li];
    layer.items.forEach(item => { item.x -= dx; if (item.x < -300) item.x += wrap; });
  });
}
function drawParallax() {
  const GY = GROUND_Y;
  const sky = ctx.createLinearGradient(0,0,0,GY);
  sky.addColorStop(0,'#87CEEB'); sky.addColorStop(0.6,'#c8e8f7'); sky.addColorStop(1,'#d4edda');
  ctx.fillStyle=sky; ctx.fillRect(0,0,canvas.width,GY);
  ctx.fillStyle='rgba(120,170,100,0.45)';
  ctx.beginPath(); ctx.moveTo(0,GY);
  for (let i=0;i<=6;i++) {
    const hx=(i/6)*canvas.width, peak=GY-80-Math.sin(i*1.3)*40;
    if (i===0) ctx.lineTo(hx,peak);
    else ctx.quadraticCurveTo(hx-canvas.width/12,GY-55,hx,peak);
  }
  ctx.lineTo(canvas.width,GY); ctx.closePath(); ctx.fill();
  PARALLAX_LAYERS[0].items.forEach(c => {
    ctx.save(); ctx.fillStyle='rgba(255,255,255,0.82)'; ctx.shadowColor='rgba(200,220,255,0.5)'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.ellipse(c.x,c.y,c.w*0.5,c.h*0.55,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x+c.w*0.3,c.y-c.h*0.2,c.w*0.35,c.h*0.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x-c.w*0.28,c.y-c.h*0.1,c.w*0.3,c.h*0.45,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
  PARALLAX_LAYERS[1].items.forEach(t => {
    ctx.save(); ctx.globalAlpha=0.7; const base=GY-14;
    if (t.type==='pine') {
      ctx.fillStyle='#6D4C41'; ctx.fillRect(t.x-4,base-t.trunk,8,t.trunk);
      for (let tier=0;tier<3;tier++) {
        const tH=t.h*(0.5-tier*0.1),tY=base-t.trunk-tier*(t.h*0.28);
        ctx.fillStyle=['#2E7D32','#388E3C','#43A047'][tier];
        ctx.beginPath(); ctx.moveTo(t.x,tY-tH); ctx.lineTo(t.x-tH*0.55,tY); ctx.lineTo(t.x+tH*0.55,tY); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle='#5D4037'; ctx.fillRect(t.x-4,base-t.trunk,8,t.trunk);
      ctx.fillStyle='#388E3C'; ctx.beginPath(); ctx.arc(t.x,base-t.trunk-t.h*0.38,t.h*0.38,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#43A047'; ctx.beginPath(); ctx.arc(t.x-t.h*0.12,base-t.trunk-t.h*0.45,t.h*0.25,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
  PARALLAX_LAYERS[2].items.forEach(item => {
    ctx.save(); const base=GY-12;
    if (item.type==='bush') {
      ctx.fillStyle='#2E7D32'; ctx.beginPath(); ctx.arc(item.x,base-item.h*0.5,item.h*0.55,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#388E3C'; ctx.beginPath(); ctx.arc(item.x+item.h*0.4,base-item.h*0.4,item.h*0.4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(item.x-item.h*0.38,base-item.h*0.35,item.h*0.35,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle='#795548';
      for (let p=0;p<3;p++) {
        const px=item.x+p*18; ctx.fillRect(px,base-item.h,5,item.h);
        ctx.beginPath(); ctx.moveTo(px,base-item.h); ctx.lineTo(px+2.5,base-item.h-8); ctx.lineTo(px+5,base-item.h); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle='#8D6E63'; ctx.fillRect(item.x-2,base-item.h*0.6,54,5); ctx.fillRect(item.x-2,base-item.h*0.3,54,5);
    }
    ctx.restore();
  });
}

// ─── ПЫЛЬ
let dustParticles = [];
function spawnDust(boost) {
  for (let i=0;i<(boost?3:1);i++)
    dustParticles.push({x:PLAYER_X+10+Math.random()*30,y:GROUND_Y-2,vx:-(1.5+Math.random()*2.5),vy:-(0.5+Math.random()*1.5),r:boost?4+Math.random()*5:2+Math.random()*4,life:1.0,decay:0.04+Math.random()*0.04,color:boost?'255,200,50':'180,150,100'});
}
function updateDust(dt) {
  dustParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.08;p.r*=0.97;p.life-=p.decay;});
  dustParticles=dustParticles.filter(p=>p.life>0&&p.r>0.3);
}
function drawDust() {
  dustParticles.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${p.color},${p.life*0.7})`;ctx.fill();});
}

// ─── БУСТ-ВСПЫШКА
let flash={active:false,life:0}, burstParticles=[], shake={x:0,y:0,life:0};
function triggerBoostFlash() {
  flash={active:true,life:1.0};
  for (let i=0;i<24;i++) {
    const angle=(i/24)*Math.PI*2, speed=3+Math.random()*5;
    burstParticles.push({x:PLAYER_X+SPRITE_W/2,y:state.y-SPRITE_H/2,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-2,r:3+Math.random()*4,life:1.0,decay:0.025+Math.random()*0.02,hue:40+Math.random()*30});
  }
  shake={x:0,y:0,life:0.35};
}
function updateFlash(dt) {
  if (flash.active){flash.life-=dt*6;if(flash.life<=0)flash.active=false;}
  burstParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.r*=0.95;p.life-=p.decay;});
  burstParticles=burstParticles.filter(p=>p.life>0&&p.r>0.3);
  if (shake.life>0){shake.life-=dt;const m=shake.life*10;shake.x=(Math.random()-0.5)*m;shake.y=(Math.random()-0.5)*m;}
  else{shake.x=0;shake.y=0;}
}
function drawFlash() {
  if (flash.active&&flash.life>0){ctx.fillStyle=`rgba(255,220,50,${flash.life*0.45})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
  burstParticles.forEach(p=>{
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`hsla(${p.hue},100%,60%,${p.life})`;ctx.fill();
    ctx.strokeStyle=`hsla(${p.hue},100%,80%,${p.life*0.5})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*3,p.y-p.vy*3);ctx.stroke();
  });
}

// ─── ФИНИШНАЯ РАЗМЕТКА
function getFinishX() {
  const remaining  = TOTAL_DIST - state.distance;
  const pxPerSec   = (canvas.width / 2.2) * (state.boost ? 2.5 : 1);
  const secPerKm   = 1 / BASE_SPEED;
  const pxPerKm    = pxPerSec * secPerKm;
  return PLAYER_X + remaining * pxPerKm;
}

function drawFinishLine() {
  if (state.distance < 8) return;
  const fx = getFinishX();
  if (fx < -300 || fx > canvas.width + 400) return;
  const GY = GROUND_Y;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(fx + 10, GY - 3, 140, 14, 0, 0, Math.PI*2);
  ctx.fill();
  const bW = 280, bH = 240;
  const bX = fx - 40;
  const bY = GY - bH;
  ctx.fillStyle = '#455a64';
  ctx.fillRect(bX - 6, bY - 8, bW + 12, 12);
  ctx.fillStyle = '#cfd8dc';
  ctx.fillRect(bX, bY, bW, bH);
  const cols = 4, rows = 5;
  const winW = Math.floor((bW - 24) / cols) - 6;
  const winH = Math.floor((bH - 44) / rows) - 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = bX + 12 + c * (winW + 6);
      const wy = bY + 10 + r * (winH + 8);
      const lit = (r * cols + c) % 4 !== 2;
      ctx.fillStyle = lit ? 'rgba(255,240,160,0.9)' : 'rgba(90,130,160,0.55)';
      ctx.fillRect(wx, wy, winW, winH);
      ctx.strokeStyle = '#78909c'; ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, winW, winH);
      ctx.strokeStyle = 'rgba(120,144,156,0.6)';
      ctx.beginPath(); ctx.moveTo(wx, wy + winH/2); ctx.lineTo(wx+winW, wy+winH/2); ctx.stroke();
    }
  }
  ctx.fillStyle = '#546e7a';
  ctx.fillRect(bX - 4, bY - 4, 10, bH + 8);
  ctx.fillRect(bX + bW - 6, bY - 4, 10, bH + 8);
  ctx.fillStyle = '#37474f';
  ctx.fillRect(bX + bW/2 - 18, GY - 60, 36, 60);
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath(); ctx.arc(bX + bW/2 + 10, GY - 30, 4, 0, Math.PI*2); ctx.fill();
  const signW = 160, signH = 32;
  const signX = bX + bW/2 - signW/2;
  const signY = bY - signH - 12;
  ctx.fillStyle = '#1b5e20';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 8); ctx.fill(); }
  else { ctx.fillRect(signX, signY, signW, signH); }
  ctx.fillStyle = '#a5d6a7'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('GREENBANK', bX + bW/2, signY + 11);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ГОЛОВНОЙ ОФИС', bX + bW/2, signY + 26);
  const poleH = Math.round(SPRITE_H * 1.35);
  const poleX1 = fx, poleX2 = fx + 80;
  ctx.fillStyle = '#e53935';
  ctx.fillRect(poleX1 - 4, GY - poleH, 7, poleH);
  ctx.fillRect(poleX2 - 4, GY - poleH, 7, poleH);
  const tapeY = GY - Math.round(SPRITE_H * 0.82);
  const tapeW = poleX2 - poleX1, sqW = 12, nSq = Math.ceil(tapeW / sqW);
  for (let i = 0; i < nSq; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e53935' : '#ffffff';
    ctx.fillRect(poleX1 + i * sqW, tapeY, sqW, 14);
  }
  ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = 1.5;
  ctx.strokeRect(poleX1, tapeY, tapeW, 14);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('10 км', poleX1 + tapeW/2, GY + 22);
  ctx.textAlign = 'left';
  ctx.restore();
}

// ─── ХИТБОКСЫ
function playerBox() {
  const duck=state.isDucking;
  return {x1:PLAYER_X+P.left,x2:PLAYER_X+P.right,y1:state.y+(duck?P.duckTop:P.fullTop),y2:state.y};
}
function obstacleBox(o) {
  if (o.type==='low') return {x1:o.x+4,x2:o.x+50,y1:GROUND_Y-60,y2:GROUND_Y-4};
  return {x1:o.x+4,x2:o.x+48,y1:GROUND_Y-180,y2:GROUND_Y-110};
}
function boostBox(b){return{x1:b.x,x2:b.x+44,y1:GROUND_Y-170,y2:GROUND_Y-120};}
function overlaps(a,b){return a.x1<b.x2&&a.x2>b.x1&&a.y1<b.y2&&a.y2>b.y1;}

// ─── РИСУНОК СОБАКИ
function drawDog(x, y) {
  ctx.save();
  ctx.fillStyle = '#8B5E3C';
  ctx.beginPath(); ctx.ellipse(x+22, y-18, 20, 13, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+40, y-26, 13, 11, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#6B3F1A';
  ctx.beginPath(); ctx.ellipse(x+34, y-36, 5, 8, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+44, y-37, 5, 8, 0.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#C4845A';
  ctx.beginPath(); ctx.ellipse(x+50, y-20, 8, 5, 0.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#5C3010';
  ctx.beginPath(); ctx.arc(x+55, y-22, 3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(x+6,  y-6, 7, 18); ctx.fillRect(x+16, y-6, 7, 18);
  ctx.fillRect(x+28, y-6, 7, 18); ctx.fillRect(x+38, y-6, 7, 18);
  ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x+4, y-22); ctx.quadraticCurveTo(x-8, y-40, x+2, y-50); ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(x+46, y-28, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ─── РИСУНОК ШАРИКА
function drawBalloon(x, y) {
  ctx.save();
  const cx = x + 24, top = y - 70;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(cx+4, y+2, 14, 5, 0, 0, Math.PI*2); ctx.fill();
  const grad = ctx.createRadialGradient(cx-6, top+14, 4, cx, top+20, 26);
  grad.addColorStop(0, '#ff6e6e'); grad.addColorStop(1, '#c0002a');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(cx, top+20, 22, 26, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(cx-8, top+12, 7, 10, -0.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8B0000';
  ctx.beginPath(); ctx.arc(cx, top+46, 4, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, top+50); ctx.quadraticCurveTo(cx+10, y-20, cx, y); ctx.stroke();
  ctx.restore();
}

// ─── РИСУНОК МОЛНИИ
function drawBolt(cx, cy, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(cx + size*0.2,  cy - size*0.5);
  ctx.lineTo(cx - size*0.1,  cy + size*0.05);
  ctx.lineTo(cx + size*0.1,  cy + size*0.05);
  ctx.lineTo(cx - size*0.2,  cy + size*0.5);
  ctx.lineTo(cx + size*0.35, cy - size*0.1);
  ctx.lineTo(cx + size*0.1,  cy - size*0.1);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ─── ОБЪЕКТЫ
function spawnObstacle(){state.obstacles.push({type:Math.random()>0.5?'low':'high',x:canvas.width+40});}
function spawnBoost(){state.boosts.push({x:canvas.width+40});}

function drawObstacles() {
  state.obstacles.forEach(o => {
    const b = obstacleBox(o);
    if (o.type === 'low') drawDog(b.x1, b.y2);
    else drawBalloon((b.x1+b.x2)/2 - 24, b.y2 + 4);
  });
}

function drawBoosts() {
  const pulse = 1 + Math.sin(Date.now()/200) * 0.15;
  state.boosts.forEach(b => {
    const box = boostBox(b), cx = (box.x1+box.x2)/2;
    const alpha = state.isJumping ? 0.95 : 0.4;
    drawBolt(cx, box.y2 - 20, 28 * pulse, alpha);
    if (!state.isJumping) {
      ctx.save();
      ctx.globalAlpha = 0.7 + Math.sin(Date.now()/300)*0.3;
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('↑', cx, box.y2 + 22);
      ctx.textAlign = 'left'; ctx.restore();
    }
  });
}

// ─── INIT
const SCALE = 2;
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth  * SCALE;
  canvas.height = window.innerHeight * SCALE;
  GROUND_Y = Math.round(canvas.height * 0.78);
  PLAYER_X = Math.round(canvas.width  * 0.12);
  dustParticles = []; burstParticles = [];
  flash = {active:false,life:0}; shake = {x:0,y:0,life:0};
  initParallax();
  state = {
    y:GROUND_Y, vy:0, isJumping:false, isDucking:false,
    boost:false, boostTimer:0, distance:0, timeLeft:GAME_DURATION, running:true,
    obstacles:[], boosts:[], lastObstacleTime:0, lastBoostTime:0,
    lastFrame:Date.now(), animTime:0, frame:0,
  };
  bindControls();
  loadAssets(() => loop());
}

// ─── УПРАВЛЕНИЕ
let touchStartY = 0;
function bindControls() {
  const doJump = () => { if (!state.isJumping) { state.vy = -15; state.isJumping = true; } };
  const doDuck = () => { if (!state.isDucking) { state.isDucking = true; setTimeout(() => { state.isDucking = false; }, 500); } };
  canvas.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY * SCALE; e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY * SCALE - touchStartY;
    if (dy < -25 * SCALE) doJump();
    if (dy >  25 * SCALE) doDuck();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); doJump(); }
    if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); doDuck(); }
  });
}

// ─── СТИК-ФИГУРА
function drawStickFigure(dX,dY,dW,dH,step,boost) {
  const cx=dX+dW/2, s=Math.sin(step*Math.PI*2);
  ctx.strokeStyle=boost?'#FFD700':'#1a237e'; ctx.fillStyle=boost?'#FFD700':'#1565C0';
  ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(cx,dY+dH*0.1,dH*0.09,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx,dY+dH*0.2); ctx.lineTo(cx,dY+dH*0.58); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx,dY+dH*0.28); ctx.lineTo(cx-dW*0.32,dY+dH*0.44+s*dH*0.07);
  ctx.moveTo(cx,dY+dH*0.28); ctx.lineTo(cx+dW*0.32,dY+dH*0.44-s*dH*0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx,dY+dH*0.58); ctx.lineTo(cx-dW*0.22,dY+dH*0.88-s*dH*0.1);
  ctx.moveTo(cx,dY+dH*0.58); ctx.lineTo(cx+dW*0.22,dY+dH*0.88+s*dH*0.1);
  ctx.stroke();
}

// ─── РИСУЕМ ПЕРСОНАЖА
function drawCharacter() {
  const groundY=state.y,duck=state.isDucking,jumping=state.isJumping,boost=state.boost;
  const step=state.animTime*(boost?ANIM_FPS*1.6:ANIM_FPS)/FRAME_COUNT;
  ctx.save();
  let dW=SPRITE_W,dH=SPRITE_H,dX=PLAYER_X;
  let dY=groundY-dH*(1-FEET_OFFSET);
  if (duck){dH=Math.round(SPRITE_H*0.45);dW=Math.round(SPRITE_W*1.2);dX=PLAYER_X-Math.round((dW-SPRITE_W)/2);dY=groundY-dH;}
  if (boost&&!duck){ctx.translate(dX+dW/2,groundY);ctx.rotate(-0.12);ctx.translate(-(dX+dW/2),-groundY);}
  if (boost){ctx.shadowColor='#FFD700';ctx.shadowBlur=24;}
  if (imgMode==='sheet') {
    const frameIdx=jumping?2:state.frame;
    ctx.drawImage(cleanFrames,frameIdx*realFrameW,0,realFrameW,realFrameH,dX,dY,dW,dH);
  } else if (imgMode==='single') {
    ctx.drawImage(fallbackImg,dX,dY,dW,dH);
  } else {
    drawStickFigure(dX,dY,dW,dH,step,boost);
  }
  ctx.restore();
}

// ─── UPDATE
function update(dt) {
  if (!state.running) return;
  const fps=state.boost?ANIM_FPS*1.6:ANIM_FPS;
  state.animTime+=dt;
  const frameDur=1/fps;
  if (state.animTime>=frameDur){
    state.animTime-=frameDur;
    state.frame=(state.frame+1)%FRAME_COUNT;
    if (!state.isJumping&&(state.frame===0||state.frame===3)) spawnDust(state.boost);
  }
  updateDust(dt);updateFlash(dt);updateParallax(dt);
  state.timeLeft-=dt;
  if (state.timeLeft<=0){endGame('timeout');return;}
  const speed=state.boost?BASE_SPEED*2.5:BASE_SPEED;
  state.distance+=speed*dt;
  if (state.boostTimer>0){state.boostTimer-=dt;if(state.boostTimer<=0)state.boost=false;}
  if (state.distance>=TOTAL_DIST){endGame('finish');return;}
  state.y+=state.vy;state.vy+=GRAVITY;
  if (state.y>=GROUND_Y){state.y=GROUND_Y;state.vy=0;state.isJumping=false;}
  const moveSpeed=(canvas.width/2.2)*(state.boost?2.5:1);
  state.obstacles.forEach(o=>o.x-=moveSpeed*dt);
  state.boosts.forEach(b=>b.x-=moveSpeed*dt);
  const now=Date.now();
  if (state.distance < 8.5) {
    if (now-state.lastObstacleTime>1600){spawnObstacle();state.lastObstacleTime=now;}
    if (now-state.lastBoostTime>4000){spawnBoost();state.lastBoostTime=now;}
  }
  state.obstacles=state.obstacles.filter(o=>o.x>-100);
  state.boosts=state.boosts.filter(b=>b.x>-100);
  checkCollisions();
}

// ─── КОЛЛИЗИИ
function checkCollisions() {
  const pb=playerBox();
  state.obstacles.forEach(o=>{if(overlaps(pb,obstacleBox(o)))endGame('hit');});
  state.boosts=state.boosts.filter(b=>{
    if(state.isJumping&&overlaps(pb,boostBox(b))){state.boost=true;state.boostTimer=5;triggerBoostFlash();return false;}
    return true;
  });
}

// ─── DRAW
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(shake.x,shake.y);
  drawParallax();
  ctx.fillStyle='#8B7355';
  ctx.fillRect(0,GROUND_Y-10,canvas.width,canvas.height-GROUND_Y+10);
  const rs=ctx.createLinearGradient(0,GROUND_Y-10,0,GROUND_Y+10);
  rs.addColorStop(0,'rgba(0,0,0,0.18)');rs.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rs;ctx.fillRect(0,GROUND_Y-10,canvas.width,20);
  drawBoosts();drawObstacles();drawFinishLine();drawDust();drawCharacter();
  if (state.timeLeft>55){
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.font='bold 22px sans-serif';ctx.textAlign='center';
    ctx.fillText('↑ прыжок   ↓ присесть',canvas.width/2,GROUND_Y-160);
    ctx.textAlign='left';
  }
  ctx.restore();
  drawFlash();
  document.getElementById('timer').textContent=Math.ceil(state.timeLeft);
  document.getElementById('distance').textContent=state.distance.toFixed(2);
}

// ─── ФИНИШНЫЙ РОЛИК
function showFinishResult() {
  const video = document.getElementById('finishVideo');
  video.pause();
  document.getElementById('skipBtn').style.display = 'none';
  document.getElementById('finishResult').classList.add('show');
}
function playFinishCutscene(elapsed, score, medal) {
  document.getElementById('frTime').textContent   = `${elapsed}с`;
  document.getElementById('frScore').textContent  = `${score} км`;
  document.getElementById('frMedal').textContent  = medal.icon;
  document.getElementById('frMedalLabel').textContent = medal.label;
  const screen = document.getElementById('finishScreen');
  screen.classList.add('show');
  const video = document.getElementById('finishVideo');
  video.currentTime = 0;
  const playPromise = video.play();
  if (playPromise !== undefined) { playPromise.catch(() => showFinishResult()); }
  video.onended = () => showFinishResult();
}

// ─── РЕЗУЛЬТАТ
function getMedal(reason, score, elapsed) {
  if (reason==='finish') {
    if (elapsed<=30) return {icon:'🥇',label:'Золотая медаль — спринтер!'};
    if (elapsed<=45) return {icon:'🥈',label:'Серебряная медаль'};
    return {icon:'🥉',label:'Бронза — добежали!'};
  }
  if (score>=7) return {icon:'👍',label:'Почти добежал!'};
  if (score>=4) return {icon:'💪',label:'Неплохо — ещё раз!'};
  return {icon:'😅',label:'Попробуй ещё раз'};
}
function endGame(reason) {
  state.running=false;
  const elapsed=parseFloat((GAME_DURATION-state.timeLeft).toFixed(1));
  const score=parseFloat(state.distance.toFixed(2));
  const medal=getMedal(reason,score,elapsed);
  if (window.Telegram?.WebApp)
    Telegram.WebApp.sendData(JSON.stringify({score,time:elapsed,reason}));
  if (reason==='finish') { playFinishCutscene(elapsed, score, medal); return; }
  if (reason==='timeout') {
    document.getElementById('resultEmoji').textContent='⏰';
    document.getElementById('resultTitle').textContent='Время вышло!';
    document.getElementById('resultTitle').style.color='#aaa';
  } else {
    document.getElementById('resultEmoji').textContent='💥';
    document.getElementById('resultTitle').textContent='Game Over';
    document.getElementById('resultTitle').style.color='#ff5252';
  }
  document.getElementById('statScore').textContent=`${score} км`;
  document.getElementById('statTime').textContent=`${elapsed}с`;
  document.getElementById('medal').textContent=medal.icon;
  document.getElementById('medalLabel').textContent=medal.label;
  document.getElementById('result').classList.add('show');
}

function loop() {
  const now=Date.now();
  const dt=Math.min((now-state.lastFrame)/1000,0.05);
  state.lastFrame=now;
  update(dt);draw();
  requestAnimationFrame(loop);
}
