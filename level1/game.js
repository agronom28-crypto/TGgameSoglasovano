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
  runImg.src = '../Pictures/run_spritesheet.png';
}

let state = {};

// ─── ПАРАЛЛАКС ───────────────────────────────────────────────────────────────
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

// ─── ПЫЛЬ ────────────────────────────────────────────────────────────────────
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

// ─── БУСТ-ВСПЫШКА ────────────────────────────────────────────────────────────
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

// ─── ХИТБОКСЫ ────────────────────────────────────────────────────────────────
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

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initGame() {
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;
  GROUND_Y=Math.round(canvas.height*0.65);
  PLAYER_X=Math.round(canvas.width*0.12);
  dustParticles=[];burstParticles=[];
  flash={active:false,life:0};shake={x:0,y:0,life:0};
  initParallax();
  state={
    y:GROUND_Y,vy:0,isJumping:false,isDucking:false,
    boost:false,boostTimer:0,distance:0,timeLeft:GAME_DURATION,running:true,
    obstacles:[],boosts:[],lastObstacleTime:0,lastBoostTime:0,
    lastFrame:Date.now(),animTime:0,frame:0,
  };
  bindControls();
  loadAssets(()=>loop());
}

// ─── УПРАВЛЕНИЕ ──────────────────────────────────────────────────────────────
let touchStartY=0;
function bindControls() {
  const doJump=()=>{if(!state.isJumping){state.vy=-15;state.isJumping=true;}};
  const doDuck=()=>{if(!state.isDucking){state.isDucking=true;setTimeout(()=>{state.isDucking=false;},500);}};
  canvas.addEventListener('touchstart',e=>{touchStartY=e.touches[0].clientY;e.preventDefault();},{passive:false});
  canvas.addEventListener('touchend',e=>{
    const dy=e.changedTouches[0].clientY-touchStartY;
    if(dy<-25)doJump(); if(dy>25)doDuck();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp'||e.key===' '){e.preventDefault();doJump();}
    if(e.key==='ArrowDown'||e.key==='s'){e.preventDefault();doDuck();}
  });
}

// ─── СТИК-ФИГУРА ─────────────────────────────────────────────────────────────
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

// ─── РИСУЕМ ПЕРСОНАЖА ─────────────────────────────────────────────────────────
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

// ─── ОБЪЕКТЫ ──────────────────────────────────────────────────────────────────
function spawnObstacle(){state.obstacles.push({type:Math.random()>0.5?'low':'high',x:canvas.width+40});}
function spawnBoost(){state.boosts.push({x:canvas.width+40});}
function drawObstacles() {
  state.obstacles.forEach(o=>{
    const b=obstacleBox(o);
    if (o.type==='low'){ctx.font='44px sans-serif';ctx.fillText('🐕',b.x1-2,b.y2+2);}
    else{ctx.font='42px sans-serif';ctx.textAlign='center';ctx.fillText('🎈',(b.x1+b.x2)/2,b.y2+4);ctx.textAlign='left';}
  });
}
function drawBoosts() {
  const pulse=1+Math.sin(Date.now()/200)*0.15;
  state.boosts.forEach(b=>{
    const box=boostBox(b),cx=(box.x1+box.x2)/2;
    ctx.save(); ctx.globalAlpha=state.isJumping?1:0.35;
    ctx.shadowColor='#FFD700';ctx.shadowBlur=18*pulse;
    ctx.font=`${Math.round(34*pulse)}px sans-serif`;ctx.textAlign='center';
    ctx.fillText('⚡',cx,box.y2);
    if (!state.isJumping){ctx.globalAlpha=0.6+Math.sin(Date.now()/300)*0.3;ctx.font='bold 16px sans-serif';ctx.fillStyle='#FFD700';ctx.fillText('↑',cx,box.y2+28);}
    ctx.textAlign='left';ctx.restore();
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
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
  if (now-state.lastObstacleTime>1600){spawnObstacle();state.lastObstacleTime=now;}
  if (now-state.lastBoostTime>4000){spawnBoost();state.lastBoostTime=now;}
  state.obstacles=state.obstacles.filter(o=>o.x>-100);
  state.boosts=state.boosts.filter(b=>b.x>-100);
  checkCollisions();
}

// ─── КОЛЛИЗИИ ─────────────────────────────────────────────────────────────────
function checkCollisions() {
  const pb=playerBox();
  state.obstacles.forEach(o=>{if(overlaps(pb,obstacleBox(o)))endGame('hit');});
  state.boosts=state.boosts.filter(b=>{
    if(state.isJumping&&overlaps(pb,boostBox(b))){state.boost=true;state.boostTimer=5;triggerBoostFlash();return false;}
    return true;
  });
}

// ─── DRAW ─────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(shake.x,shake.y);
  drawParallax();
  ctx.fillStyle='#8B7355';
  ctx.fillRect(0,GROUND_Y-10,canvas.width,canvas.height-GROUND_Y+10);
  const rs=ctx.createLinearGradient(0,GROUND_Y-10,0,GROUND_Y+10);
  rs.addColorStop(0,'rgba(0,0,0,0.18)');rs.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rs;ctx.fillRect(0,GROUND_Y-10,canvas.width,20);
  drawBoosts();drawObstacles();drawDust();drawCharacter();
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

// ─── ФИНИШНЫЙ РОЛИК ───────────────────────────────────────────────────────────
function showFinishResult() {
  const video = document.getElementById('finishVideo');
  video.pause();
  document.getElementById('skipBtn').style.display = 'none';
  document.getElementById('finishResult').classList.add('show');
}

function playFinishCutscene(elapsed, score, medal) {
  // Заполняем данные в карточке финиша
  document.getElementById('frTime').textContent   = `${elapsed}с`;
  document.getElementById('frScore').textContent  = `${score} км`;
  document.getElementById('frMedal').textContent  = medal.icon;
  document.getElementById('frMedalLabel').textContent = medal.label;

  // Показываем финишный экран
  const screen = document.getElementById('finishScreen');
  screen.classList.add('show');

  // Запускаем видео
  const video = document.getElementById('finishVideo');
  video.currentTime = 0;
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Автовоспроизведение заблокировано — сразу показываем результат
      showFinishResult();
    });
  }

  // Когда видео закончится — показываем результат
  video.onended = () => showFinishResult();
}

// ─── РЕЗУЛЬТАТ ────────────────────────────────────────────────────────────────
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

  if (reason==='finish') {
    // Запускаем финишный ролик с результатом поверх
    playFinishCutscene(elapsed, score, medal);
    return;
  }

  // Проигрыш или таймаут — обычный экран
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
