import {SERVER_PROTOCOL,requestedProtocol,compatibleProtocol} from '../app/protocol-version.js';
// Bounded single-lobby traffic. Does not alter mini-game capacities or simulation.
export function installLobbyLoadGuard(app,{
 capacity=16,nearby=16,farInterval=1000,refreshInterval=120,
 origins=['https://oscarbrendonn.github.io','http://127.0.0.1:8288','http://127.0.0.1:8298']
}={}){
 if(!Number.isInteger(capacity)||capacity<2||capacity>100)throw Error('Lobby capacity must be 2..100');
 const disposers=[],metrics={motionSent:0,motionDeferred:0,backpressureDrops:0,rosterFlushes:0,rosterFailures:0,recoveredSessions:0};
 for(const hub of app.hubs.values()){
  const originalCapacity=hub.lobbyCapacity;
  hub.lobbyCapacity=capacity;
  const refresh=hub.refreshLobby,cast=hub.lobbyBroadcast,close=hub.close,pending=new Map(),interest=new Map(),farSent=new Map();
  let timer=null;
  function flush(){
   timer=null;const batch=[...pending.values()];pending.clear();
   for(const l of batch)if(hub.lobbies.get(l.code)===l){
    try{refresh.call(hub,l);metrics.rosterFlushes++}
    catch{metrics.rosterFailures++} // A timer exception must not kill every lobby.
   }
  }
  hub.refreshLobby=function(l){if(!l)return;pending.set(l.code,l);if(!timer){timer=setTimeout(flush,refreshInterval);timer.unref?.()}};
  function nearSet(recipient,l,now){
   let row=interest.get(recipient.id);
   if(row&&row.until>now&&row.lobby===l.code)return row.ids;
   const p=recipient.lastPosition?.p||[179,12,121];
   const candidates=[...l.members].filter(id=>id!==recipient.id).map(id=>hub.players.get(id)).filter(p=>p?.lobbySocket?.readyState===1);
   candidates.sort((a,b)=>{const x=a.lastPosition?.p||[179,12,121],y=b.lastPosition?.p||[179,12,121];return (x[0]-p[0])**2+(x[2]-p[2])**2-(y[0]-p[0])**2-(y[2]-p[2])**2});
   row={until:now+250,lobby:l.code,ids:new Set(candidates.slice(0,nearby).map(p=>p.id))};interest.set(recipient.id,row);
   if(interest.size>256)for(const [id,v]of interest)if(v.until<now)interest.delete(id);
   return row.ids;
  }
  hub.lobbyBroadcast=function(l,message,except){
   if(!l||message?.t!=='s'||l.members.size<=nearby+1)return cast.call(hub,l,message,except);
   const now=hub.now(),sender=hub.players.get(message.id),wire=JSON.stringify(message),bytes=Buffer.byteLength(wire);
   for(const id of l.members){
    if(id===except)continue;
    const p=hub.players.get(id),ws=p?.lobbySocket;if(ws?.readyState!==1)continue;
    const isNear=nearSet(p,l,now).has(message.id)||p.carryTarget===message.id||sender?.carryTarget===id;
    const key=id+':'+message.id,previous=farSent.get(key);
    if(!isNear&&previous!==undefined&&now-previous<farInterval){metrics.motionDeferred++;continue}
    // Replaceable motion is dropped rather than queued behind a slow receiver.
    if(!Number.isFinite(ws.bufferedAmount)||ws.bufferedAmount+bytes>65536){metrics.backpressureDrops++;continue}
    try{ws.send(wire);farSent.set(key,now);metrics.motionSent++}catch{}
   }
   if(farSent.size>capacity*capacity*2)for(const [key,at]of farSent)if(now-at>farInterval*3)farSent.delete(key);
  };
  hub.close=function(){clearTimeout(timer);pending.clear();interest.clear();farSent.clear();return close.call(hub)};
  disposers.push(()=>{clearTimeout(timer);hub.lobbyCapacity=originalCapacity;hub.refreshLobby=refresh;hub.lobbyBroadcast=cast;hub.close=close;pending.clear();interest.clear();farSent.clear()});
 }
 // Renewals for an already authenticated guest get a per-session limit.
 // New/unknown tokens retain the existing per-IP admission limit and validation.
 const handlers=app.server.listeners('request'),allowed=new Set(origins),renewals=new Map();
 for(const handler of handlers)app.server.removeListener('request',handler);
 const wrapped=(req,res)=>{
  const match=/^\/(codex|kimi)\/api\/session$/.exec((req.url||'').split('?')[0]),auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'',hub=match&&app.hubs.get(match[1]);
  const valid=req.method==='GET'&&allowed.has(req.headers.origin)&&/^[A-Za-z0-9_-]{43}$/.test(token)&&hub?.lookup(token)&&compatibleProtocol(SERVER_PROTOCOL,requestedProtocol(req.url));
  if(valid){
   const now=Date.now();let row=renewals.get(token);if(!row||now-row.at>=60000){row={at:now,n:0};renewals.set(token,row)}
   if(renewals.size>512)for(const [key,v]of renewals)if(now-v.at>60000)renewals.delete(key);
   const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin','Access-Control-Allow-Origin':req.headers.origin};
   if(++row.n>12){res.writeHead(429,{...headers,'Retry-After':'60'});res.end(JSON.stringify({error:'Too many reconnect attempts; please wait.'}));return}
   try{const session=hub.session(token);metrics.recoveredSessions++;res.writeHead(200,headers);res.end(JSON.stringify({id:session.player.id,friendCode:session.player.friendCode,token:session.token,protocol:SERVER_PROTOCOL,mode:'isolated-guest-test',persistentAccount:false,shareOrigin:'https://oscarbrendonn.github.io/67park-foundation-next/'}));return}catch{res.writeHead(503,headers);res.end(JSON.stringify({error:'Session unavailable'}));return}
  }
  for(const handler of handlers)handler.call(app.server,req,res);
 };
 app.server.on('request',wrapped);
 return {metrics,dispose(){for(const dispose of disposers)dispose();app.server.removeListener('request',wrapped);for(const handler of handlers)app.server.on('request',handler);renewals.clear()}};
}
