import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,randomInt} from 'node:crypto';
import {createReplyBudget} from './reply-budget.mjs';
import {startTargetRound,shootTarget,ROUND_SECONDS,nearTargetBooth} from '../app/party/target-club-rules.js';

export function targetWeek(at){const d=new Date(at);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return {key:d.toISOString().slice(0,10),resetAt:d.getTime()+7*86400000};}
const site={x:168,y:9.212547645568847,z:-143,yaw:Math.PI/2};
const nameOf=p=>String(p.name||'Guest').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,32);
// Score is replayed from accepted aim events, never supplied by the browser.
// This bounds fabricated totals/timing/replays; it is not an aimbot detector.
export function installTargetClubWeekly(app,{file=null,now=Date.now}={}){
 let saved={version:1,weeks:{}},storageError=null;const runs=new Map(),disposers=[];
 if(file&&fs.existsSync(file))try{const d=JSON.parse(fs.readFileSync(file,'utf8'));
  if(d.version!==1||!d.weeks||Array.isArray(d.weeks)||typeof d.weeks!=='object')throw Error('Invalid weekly store');
  for(const[k,rows]of Object.entries(d.weeks)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!Array.isArray(rows)||rows.length>10000)throw Error('Invalid weekly rows');
   for(const r of rows)if(typeof r.id!=='string'||typeof r.name!=='string'||!Number.isInteger(r.score)||r.score<0||r.score>20000||!Number.isFinite(r.at))throw Error('Invalid weekly score');
  }saved=d;
 }catch{storageError='Weekly storage needs attention';}
 const healthy=()=>!!file&&!storageError;
 function board(p){const w=targetWeek(now()),rows=[...(saved.weeks[w.key]||[])].sort((a,b)=>b.score-a.score||a.at-b.at||a.id.localeCompare(b.id)),own=rows.findIndex(r=>r.id===p.id);
  return {week:w.key,resetAt:w.resetAt,available:healthy(),persistent:!!file,rows:rows.slice(0,10).map((r,i)=>({rank:i+1,name:r.name,score:r.score,you:r.id===p.id})),you:own<0?null:{rank:own+1,score:rows[own].score},message:healthy()?'':storageError||'Weekly ranking is not enabled on this server.'};
 }
 function save(p,run){
  if(!healthy())throw Error('Weekly ranking is unavailable.');
  if(run.week!==targetWeek(now()).key)throw Error('A new week started. Play another round.');
  const rows=(saved.weeks[run.week]||[]).map(r=>({...r})),previous=rows.find(r=>r.id===p.id);
  if(previous&&previous.score>=run.round.score)return;
  if(!previous&&rows.length>=10000)throw Error('Weekly table is full.');
  const entry={id:p.id,name:nameOf(p),score:run.round.score,hits:run.round.hits,shots:run.round.shots,at:now()};
  if(previous)Object.assign(previous,entry);else rows.push(entry);
  const weeks={...saved.weeks,[run.week]:rows};for(const key of Object.keys(weeks).sort().slice(0,-4))delete weeks[key];
  const next={version:1,weeks},tmp=file+'.tmp';
  try{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(tmp,JSON.stringify(next),{mode:0o600});fs.renameSync(tmp,file);saved=next;}
  catch{storageError='Weekly score could not be saved.';throw Error(storageError);}
 }
 for(const[variant,hub]of app.hubs){
  const original=hub.message,update=hub.update,reply=createReplyBudget({now,burst:12,interval:120}),accept=createReplyBudget({now,burst:12,interval:120}),rates=new WeakMap();
  const key=p=>variant+':'+p.id;
  const eligible=p=>p.online&&hub.lobbies.get(p.lobbyId)?.members.has(p.id)&&!p.roomId&&!hub.islandWorld?.(p)?.mounts.has(p.id)&&!p.carryTarget&&nearTargetBooth(p.lastPosition?.p&&{x:p.lastPosition.p[0],y:p.lastPosition.p[1],z:p.lastPosition.p[2]},site);
  const send=(p,m)=>reply(p,()=>hub.send(p.online,m));
  hub.message=function(p,m){
   if(typeof m?.t!=='string'||!m.t.startsWith('target.'))return original.call(this,p,m);
   if(!p?.online||hub.players.get(p.id)!==p)return;
   if(!accept(p,()=>{}))return;
   const request=typeof m.request==='string'?m.request.slice(0,48):'',at=now();
   const result=(ok,extra={})=>send(p,{t:'target.reply',request,ok,...extra});
   try{
    if(m.t==='target.board'){result(true,{board:board(p)});return;}
    if(m.t==='target.cancel'){if(runs.get(key(p))?.id===m.run)runs.delete(key(p));return;}
    if(!healthy())throw Error('Weekly ranking is unavailable. Play a practice round.');
    if(!eligible(p)){runs.delete(key(p));throw Error('Walk to the front of Target Club first.');}
    if(m.t==='target.start'){
     if(at-(rates.get(p)||-Infinity)<2000)throw Error('Please wait before starting another round.');
     rates.set(p,at);if(runs.has(key(p)))throw Error('A round is already running.');
     const round=startTargetRound();round.seed=randomInt(1,1000000);
     const run={id:randomUUID(),round,week:targetWeek(at).key,start:at,lobby:p.lobbyId,seq:0};runs.set(key(p),run);
     result(true,{run:run.id,seed:round.seed,duration:ROUND_SECONDS,week:run.week});return;
    }
    const run=runs.get(key(p));if(!run||m.run!==run.id||p.lobbyId!==run.lobby)throw Error('This round has expired.');
    const elapsed=(at-run.start)/1000;
    if(m.t==='target.shot'){
     if(!Number.isInteger(m.seq)||m.seq!==run.seq+1||m.seq>190||![m.x,m.y,m.time].every(Number.isFinite)||m.x<0||m.x>900||m.y<0||m.y>600||m.time<run.round.time||m.time>=ROUND_SECONDS||elapsed>ROUND_SECONDS+1||Math.abs(m.time-elapsed)>.8)throw Error('Shot timing was not accepted.');
     run.seq=m.seq;run.round.time=m.time;
     const hit=shootTarget(run.round,m.x,m.y,false);if(!hit)throw Error('Shot was too fast.');
     result(true,{run:run.id,score:run.round.score,hits:run.round.hits,shots:run.round.shots});return;
    }
    if(m.t==='target.finish'){
     if(elapsed<ROUND_SECONDS||elapsed>ROUND_SECONDS+10)throw Error('Round completion was not accepted.');
     runs.delete(key(p));save(p,run);result(true,{finished:true,score:run.round.score,board:board(p)});return;
    }
    throw Error('Unknown Target Club action.');
   }catch(e){result(false,{message:e.message});}
  };
  hub.update=function(...args){const value=update.apply(this,args);const at=now();for(const[k,r]of runs)if(k.startsWith(variant+':')){const p=hub.players.get(k.slice(variant.length+1));if(!p?.online||p.lobbyId!==r.lobby||at-r.start>41000||r.week!==targetWeek(at).key)runs.delete(k);}return value;};
  disposers.push(()=>{hub.message=original;hub.update=update;});
 }
 return {get storageError(){return storageError;},get activeRounds(){return runs.size;},dispose(){for(const d of disposers)d();runs.clear();}};
}
