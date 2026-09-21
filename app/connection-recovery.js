import {CLIENT_BUILD} from './protocol-version.js';

const key=Symbol.for('67park.connection-recovery.v1');
const state=globalThis[key]??={channels:new Map(),error:'',blocked:false,changedAt:Date.now(),retryAt:0,suspended:false};
state.readyRooms??=new Set();
const RETURN_KEY='67park.feel-lab.return-intent.v1';
const tabStorage=()=>{try{return globalThis.sessionStorage}catch{return null}};
export const connectionRecoverySnapshot=()=>({error:state.error,blocked:state.blocked,retryAt:state.retryAt,changedAt:state.changedAt});
// Match entry can reject before this independent module is evaluated. The
// page's inline listener records that first error in __candyErrors, so retain
// the same load-failure predicate for the late listener and the initial read.
export function recordedEntryLoadFailure(errors){
 return Array.isArray(errors)&&errors.some(error=>{
  const message=typeof error==='object'&&error!==null?(error.message||error.reason?.message||error.reason||''):error;
  return /loading|fetch|import|module|load/i.test(String(message));
 });
}
export function currentParkSocket(channel){const ws=state.channels.get(channel);return ws&&ws.readyState<2?ws:null;}
export function connectionProblem(message,{blocked=false,retryAt=0}={}){
 if(message!==state.error||blocked!==state.blocked)state.changedAt=Date.now();
 state.error=message;state.blocked=blocked;state.retryAt=retryAt;
 globalThis.dispatchEvent?.(new Event('park:connection-change'));
}
export function assertConnectionAllowed(){
 if(state.suspended)throw Error('The game is paused in another page.');
 if(state.blocked||Date.now()<state.retryAt)throw Error(state.error||'Please wait before reconnecting.');
}
export function readReturnIntent(storage=tabStorage(),now=Date.now()){
 try{const value=JSON.parse(storage?.getItem(RETURN_KEY)||'null');
  if(value&&typeof value.room==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(value.room)&&Number.isFinite(value.at)&&now-value.at<300000&&now>=value.at)return value;
  storage?.removeItem(RETURN_KEY);
 }catch{}
 return null;
}
export function rememberReturn(room,storage=tabStorage()){
 try{if(!storage)return false;storage.setItem(RETURN_KEY,JSON.stringify({room,at:Date.now()}));return true;}catch{return false;}
}
export function returningFromMatch(message,ws,{storage=tabStorage(),now=Date.now()}={}){
 const intent=readReturnIntent(storage,now);if(!intent||message.t!=='state')return false;
 if(!message.room||message.room.code!==intent.room){try{storage?.removeItem(RETURN_KEY)}catch{}return false;}
 // One acknowledged leave, never a stored queue of interactions to replay.
 if(ws.__parkLeaving!==intent.room){ws.__parkLeaving=intent.room;ws.send(JSON.stringify({t:'room.leave'}));}
 return true;
}
export function watchParkSocket(ws,channel,{win=globalThis,now=Date.now,handshakeMs=15000,staleMs=30000}={}){
 const old=state.channels.get(channel);state.channels.set(channel,ws);
 if(old&&old!==ws&&old.readyState<2)old.close(1000,'Replaced connection');
 let last=now(),ack=false,closed=false;
 const send=ws.send;
 ws.send=function(wire){
  const result=send.call(this,wire);
  if(channel==='online'&&typeof wire==='string'&&wire.includes('match.ready')){
   try{const m=JSON.parse(wire);if(m.t==='match.ready'&&typeof m.code==='string'){state.readyRooms.add(m.code);if(state.readyRooms.size>4)state.readyRooms.delete(state.readyRooms.values().next().value);}}catch{}
  }
  return result;
 };
 const message=e=>{
  if(state.channels.get(channel)!==ws)return;
  last=now();let m;try{m=JSON.parse(e.data)}catch{return;}
  if((channel==='ws'&&m.t==='welcome')||(channel==='online'&&m.t==='state')){
   // A healthy sibling channel must not cancel an HTTP 429 cooldown while
   // the other channel is still renewing authentication.
   ack=true;if(!state.blocked&&now()>=state.retryAt)connectionProblem('');
   if(channel==='online'&&returningFromMatch(m,ws)){
    e.stopImmediatePropagation?.();
    win.__candyOnline?.update?.({...m,connected:true,connecting:false,notice:'Returning to the park…'});
   }
  }
 };
 const close=e=>{
  closed=true;clearInterval(timer);ws.removeEventListener('message',message);
  if(state.channels.get(channel)!==ws)return;
  state.channels.delete(channel);
  if(e.code===4001)connectionProblem('This character is open in another tab. Continue there, or reload here.',{blocked:true});
  else if(e.code===4009)connectionProblem('The game version changed. Reload to update; your saved character stays safe.',{blocked:true});
 };
 const timer=setInterval(()=>{
  if(closed||state.suspended)return;
  const age=now()-last;
  if(age>(ack?staleMs:handshakeMs)&&ws.readyState<2){
   connectionProblem('The server stopped responding. Reconnecting…');
   ws.close(4000,'Connection timed out');
  }else if(ack&&ws.readyState===1&&ws.bufferedAmount<8192&&age>8000){
   try{ws.send(JSON.stringify({t:'ping',at:now()}));}catch{}
  }
 },2000);
 timer.unref?.();
 ws.addEventListener('message',message);ws.addEventListener('close',close,{once:true});
 return ws;
}

// Independent of the 3D entry module: even a failed module download has a way
// out. No camera/input lock and no automatic reload or guest-data deletion.
export function installConnectionRecoveryUI(win=window,doc=document){
 if(doc.getElementById('park-connection-recovery'))return;
 const panel=doc.createElement('section');panel.id='park-connection-recovery';panel.hidden=true;panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 panel.style.cssText='position:fixed;z-index:10040;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));margin:auto;max-width:420px;padding:14px 16px;background:#fff8ed;color:#463f49;border:1px solid #e0d5c4;border-radius:18px;font:600 14px/1.4 system-ui;box-shadow:0 4px 18px #403b4820';
 const label=doc.createElement('p');label.style.margin='0 0 8px';
 const retry=doc.createElement('button'),back=doc.createElement('button');
 for(const b of [retry,back]){b.type='button';b.style.cssText='min-height:44px;padding:8px 12px;margin:3px;border:1px solid #d9cbb5;border-radius:12px;background:#fffdf7;color:inherit;font:inherit';}
 retry.textContent='Retry connection';back.textContent='Return to park';panel.append(label,retry,back);doc.body.append(panel);
 const match=new URLSearchParams(win.location.search).get('match');
 const started=Date.now();let disconnectedAt=started,lastSignature='',entryError=!!match&&recordedEntryLoadFailure(win.__candyErrors),loadingFailed=false,leaving=false;
 const release=()=>win.dispatchEvent(new Event('park:release-controls'));
 const reload=()=>{release();const url=new URL(win.location.href);url.searchParams.set('v',CLIENT_BUILD);win.location.replace(url.href)};
 retry.onclick=()=>{
  if(state.blocked||loadingFailed){reload();return;}
  if(Date.now()<state.retryAt)return;
  release();
  for(const client of [win.__eggyNet,win.__candyOnline]){
   if(!client||client.displaced||client.stopped)continue;
   if(client.ws?.readyState===1)continue;
   clearTimeout(client.retryTimer);clearTimeout(client.retry);client.connect?.();
  }
 };
 back.onclick=()=>{
  if(leaving)return;leaving=true;release();
  if(match)rememberReturn(match);
  win.__candyOnline?.send?.({t:'room.leave'});
  win.location.assign(new URL('../?v='+CLIENT_BUILD,win.location.href).href);
 };
 // Existing top-of-page Return links must follow the same room-leave path.
 // Otherwise a still-active room redirects straight back into the failed game.
 const returnLink=e=>{
  if(!match||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const link=e.target.closest?.('a[href]');if(!link)return;
  const target=new URL(link.href,win.location.href),park=new URL('../',win.location.href);
  if(target.origin===park.origin&&target.pathname===park.pathname&&!target.searchParams.has('match')){e.preventDefault();back.onclick();}
 };
 doc.addEventListener('click',returnLink,true);
 const check=()=>{
  const client=win.__candyOnline,s=client?.data,world=win.__eggyNet;
  if(!match&&!win.__islandWorld?.ready&&!state.blocked){panel.hidden=true;return;}
  const online=s?.connected===true,connected=online&&(match||world?.connected===true);
  if(connected)disconnectedAt=Date.now();
  // The authority bounds match loading too. This UI covers a missing bundle,
  // stopped download, lost room, or a server that cannot be reached at all.
  const slow=Date.now()-started>45000;
  const abandoned=match&&online&&(!s.room||s.room.code!==match);
  const stopped=match&&online&&['waiting','results'].includes(s.room?.status);
  const failed=entryError||(match&&slow&&!state.readyRooms.has(match));
  loadingFailed=failed;
  const disconnected=!connected&&Date.now()-disconnectedAt>8000;
  const visible=state.blocked||failed||abandoned||stopped||disconnected;
  const text=state.blocked?state.error:abandoned?'This match is no longer available. Return to the park and choose another.':failed?'This game could not finish loading. Retry, or return to the park. Your saved character is safe.':stopped&&s.room.status==='waiting'?'The match is back in its waiting room. Return to the park to start again.':disconnected?(state.error||'Connection interrupted. Trying to reconnect; your saved character is safe.') :'';
  // Results already have their own rematch UI. Do not cover it.
  panel.hidden=!visible||(!text&&!state.blocked);
  const signature=[text,failed,state.blocked,match,Date.now()<state.retryAt].join('|');
  if(signature===lastSignature)return;lastSignature=signature;
  label.textContent=text;retry.textContent=state.blocked?'Reload latest version':failed?'Retry loading':'Retry connection';
  retry.disabled=!state.blocked&&Date.now()<state.retryAt;retry.hidden=!!abandoned;
  back.hidden=!match;
  panel.dataset.state=state.blocked?'incompatible':failed?'loading-error':abandoned?'match-ended':'reconnecting';
 };
 const onError=e=>{if(match&&(recordedEntryLoadFailure([e])||e.target?.tagName==='SCRIPT')){entryError=true;check();}};
 const timer=setInterval(check,1000);
 win.addEventListener('error',onError,true);win.addEventListener('unhandledrejection',onError);
 win.addEventListener('park:connection-change',check);check();
 return()=>{clearInterval(timer);doc.removeEventListener('click',returnLink,true);win.removeEventListener('error',onError,true);win.removeEventListener('unhandledrejection',onError);win.removeEventListener('park:connection-change',check);panel.remove()};
}
if(typeof window!=='undefined'){
 const ui=()=>installConnectionRecoveryUI();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui,{once:true});else ui();
 window.addEventListener('pagehide',()=>{state.suspended=true;for(const ws of state.channels.values())ws.close(1000,'Page suspended')});
 window.addEventListener('pageshow',()=>{state.suspended=false;});
}
