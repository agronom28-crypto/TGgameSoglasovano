const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { normalizeScore, better, sortRows, verifyTelegramInitData } = require('./lib');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(cors({ origin(origin, cb) { cb(null, !origin || !allowedOrigins.length || allowedOrigins.includes(origin)); } }));
app.use(express.json({ limit: '16kb' }));
app.use((req,res,next)=>{ res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Cache-Control':'no-store'}); next(); });

let creds;
try { creds=JSON.parse(process.env.GOOGLE_CREDS || ''); if(creds.private_key) creds.private_key=creds.private_key.replace(/\\n/g,'\n'); }
catch(e){ console.error('Invalid GOOGLE_CREDS:',e.message); process.exit(1); }
if(!process.env.SHEET_ID){ console.error('SHEET_ID is required'); process.exit(1); }
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets=google.sheets({version:'v4',auth}); const SHEET_ID=process.env.SHEET_ID;
async function getAllRows(){ const out=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:'Sheet1!A:I'}); const rows=out.data.values||[]; return rows[0]?.[0]==='Дата'?rows.slice(1):rows; }

const buckets=new Map();
function rateLimit(req,res,next){ const key=req.ip; const now=Date.now(), item=buckets.get(key)||{at:now,count:0}; if(now-item.at>60000){item.at=now;item.count=0} item.count++;buckets.set(key,item); if(item.count>60)return res.status(429).json({ok:false,error:'Too many requests'});next(); }
app.use(rateLimit);
app.get('/health',(req,res)=>res.json({status:'ok',time:new Date().toISOString()}));

app.post('/score',async(req,res)=>{
 try{
  const requireAuth=process.env.REQUIRE_TELEGRAM_AUTH==='true';
  const validAuth=verifyTelegramInitData(req.body.initData,process.env.TELEGRAM_BOT_TOKEN);
  if(requireAuth&&!validAuth)return res.status(401).json({ok:false,error:'Invalid Telegram authentication'});
  const data=normalizeScore(req.body);
  if(validAuth){ try{ const user=JSON.parse(new URLSearchParams(req.body.initData).get('user')||'{}'); data.userId=String(user.id||data.userId); data.username=String(user.username||user.first_name||data.username).slice(0,32); }catch{} }
  const row=[new Date().toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}),data.userId,data.username,data.nickname,data.level,data.time,data.distance,data.medal,data.result];
  await sheets.spreadsheets.values.append({spreadsheetId:SHEET_ID,range:'Sheet1!A:I',valueInputOption:'RAW',requestBody:{values:[row]}});
  res.status(201).json({ok:true});
 }catch(e){console.error('Score error:',e.message);res.status(500).json({ok:false,error:'Internal server error'});}
});

async function leaderboard(req,res){
 try{
  const level=Math.trunc(Number(req.params.level||req.query.level)); const top=Math.min(50,Math.max(1,Math.trunc(Number(req.query.top)||5)));
  if(level<1||level>10)return res.status(400).json({ok:false,error:'Invalid level'});
  const rows=(await getAllRows()).filter(r=>Number(r[4])===level&&String(r[8]).toLowerCase()==='finish');
  const best=new Map(); for(const r of rows){const uid=r[1]||`anon:${r[2]}`;if(!best.has(uid)||better(level,r,best.get(uid)))best.set(uid,r);}
  const list=sortRows(level,[...best.values()]).slice(0,top).map((r,i)=>({rank:i+1,name:String(r[3]||r[2]||'Игрок').slice(0,32),time:Number(r[5])||0,score:Number(r[6])||0,medal:String(r[7]||'-').slice(0,8)}));
  res.json({ok:true,level,top:list,leaderboard:list});
 }catch(e){console.error('Leaderboard error:',e.message);res.status(500).json({ok:false,error:'Internal server error'});}
}
app.get('/api/leaderboard',leaderboard); app.get('/leaderboard/:level',leaderboard);
app.get('/scores',async(req,res)=>{if(!process.env.ADMIN_PASS||req.query.pass!==process.env.ADMIN_PASS)return res.status(403).json({error:'Forbidden'});try{const out=await sheets.spreadsheets.values.get({spreadsheetId:SHEET_ID,range:'Sheet1!A:I'});res.json({rows:out.data.values||[]});}catch(e){res.status(500).json({error:'Internal server error'});}});
app.use((req,res)=>res.status(404).json({ok:false,error:'Not found'}));
const PORT=Number(process.env.PORT)||3000; if(require.main===module)app.listen(PORT,()=>console.log(`soglasovano-analytics:${PORT}`)); module.exports=app;
