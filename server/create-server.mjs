import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import path from 'node:path';
import {WebSocketServer} from 'ws';
import {installHousing} from './housing.mjs';
import {installTargetClubWeekly} from './target-club-weekly.mjs';
import {installSocialSafety} from './social-safety.mjs';
import {installLobbyLoadGuard} from './lobby-load-guard.mjs';
import {SERVER_PROTOCOL,requestedProtocol,compatibleProtocol} from '../app/protocol-version.js';
register('./three-loader.mjs',import.meta.url);

// Dedicated preview service. Never imports serve.mjs or opens the live social store.
export async function createPreviewServer({origins=['https://oscarbrendonn.github.io'],maxPlayers=128,dataDir=null,worldSource}={}){
 const hubs=new Map();
 for(const variant of ['kimi']){
  const {CommunityHub}=await import('./runtime/server/community-hub.js');
  const {loadWorld}=await import('./world-source.mjs');
  hubs.set(variant,new CommunityHub({worldSource:worldSource===undefined?await loadWorld():worldSource,socialPath:dataDir?path.join(dataDir,'social.json'):null}));
 }
 const allowed=new Set(origins),limits=new Map();let faults=0;
 const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
 const limited=req=>{
  const ip=req.headers['cf-connecting-ip']||req.socket.remoteAddress;
  const now=Date.now();let entry=limits.get(ip);
  if(!entry||now-entry.at>60000){entry={at:now,n:0};limits.set(ip,entry);}
  if(limits.size>2048)for(const [key,value]of limits)if(now-value.at>60000)limits.delete(key);
  return ++entry.n>120;
 };
 const route=req=>/^\/(codex|kimi)\/(api\/session|online|ws|health)$/.exec((req.url||'').split('?')[0]);
 const headers=origin=>({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{} )});
 const server=http.createServer((req,res)=>{
  const origin=req.headers.origin;
  const reply=(status,value)=>{res.writeHead(status,headers(origin));res.end(JSON.stringify(value));};
  if(req.url==='/health'&&req.method==='GET'){const ok=Date.now()-lastHealthy<2000&&!safety.metrics.storageError&&![...hubs.values()].some(h=>h.storageError);reply(ok?200:503,{ok,revision:SERVER_PROTOCOL.build,protocol:SERVER_PROTOCOL,faults,lobbyFaults:loadGuard.metrics.rosterFailures,roomFaults:[...hubs.values()].reduce((n,h)=>n+(h.roomFaults?.length||0),0),variants:Object.fromEntries([...hubs].map(([v,h])=>[v,{online:[...h.players.values()].filter(p=>p.online).length,rooms:h.rooms.size}]))});return;}
  const match=route(req);if(!match){reply(404,{error:'Not found'});return;}
  if(!allowed.has(origin)){reply(403,{error:'Origin not allowed'});return;}
  if(req.method==='OPTIONS'){
   if(req.headers['access-control-request-method']!=='GET'||String(req.headers['access-control-request-headers']||'').split(',').some(h=>h.trim()&&!['authorization'].includes(h.trim().toLowerCase()))){reply(403,{error:'Preflight rejected'});return;}
   res.writeHead(204,{...headers(origin),'Access-Control-Allow-Methods':'GET','Access-Control-Allow-Headers':'Authorization','Access-Control-Max-Age':'600'});res.end();return;
  }
  if(req.method!=='GET'){reply(405,{error:'GET only'});return;}
  const hub=hubs.get(match[1]);
  if(!hub){reply(404,{error:'Unknown preview variant'});return;}
  if(match[2]==='health'){reply(200,{ok:!faults});return;}
  if(match[2]!=='api/session'){reply(426,{error:'WebSocket required'});return;}
  if(!compatibleProtocol(SERVER_PROTOCOL,requestedProtocol(req.url))){reply(426,{error:'Game version changed. Reload the latest game; your saved character is safe.',code:'CLIENT_UPDATE_REQUIRED',protocol:SERVER_PROTOCOL});return;}
  if(limited(req)){reply(429,{error:'Too many connection attempts; please wait.'});return;}
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(auth&&!tokenPattern.test(token)){reply(401,{error:'Invalid guest session'});return;}
  if(!hub.lookup(token)&&hub.players.size>=maxPlayers){reply(503,{error:'Preview is full'});return;}
  try{
   const session=hub.session(token||undefined);
   reply(200,{id:session.player.id,friendCode:session.player.friendCode,token:session.token,protocol:SERVER_PROTOCOL,mode:'isolated-guest-test',persistentAccount:false,shareOrigin:'https://oscarbrendonn.github.io/67park-foundation-next/'});
  }catch{reply(503,{error:'Session unavailable'});}
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false,handleProtocols:protocols=>protocols.has('67park-v1')?'67park-v1':false});
 server.on('upgrade',(req,socket,head)=>{
  const reject=()=>{socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');};
  const match=route(req),protocols=String(req.headers['sec-websocket-protocol']||'').split(',').map(v=>v.trim());
  if(!match||!['ws','online'].includes(match[2])||!allowed.has(req.headers.origin)||protocols.length!==2||protocols[0]!=='67park-v1'||!protocols[1].startsWith('guest.')||wss.clients.size>=maxPlayers*4){reject();return;}
  const token=protocols[1].slice(6),hub=hubs.get(match[1]),player=tokenPattern.test(token)&&hub?.lookup(token);
  if(!player){reject();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   if(!compatibleProtocol(SERVER_PROTOCOL,requestedProtocol(req.url))){ws.close(4009,'Game version changed. Reload the latest game.');return;}
   ws.alive=true;ws.on('error',()=>{});ws.on('pong',()=>{ws.alive=true;});
   try{hub.attach(player,ws,match[2]==='ws'?'lobby':'online');}
   catch{faults++;ws.close(1011,'Connection setup failed; please reconnect.');}
  });
 });
 let lastHealthy=Date.now();
 const app={server,hubs,get faults(){return faults;},async close(){clearInterval(tick);clearInterval(heartbeat);targetClub.dispose();safety.dispose();for(const hub of hubs.values())hub.close();for(const ws of wss.clients)ws.terminate();wss.close();await new Promise(r=>server.close(r));}};
 const loadGuard=installLobbyLoadGuard(app,{capacity:16,origins});installHousing(app);
 const safety=installSocialSafety(app,{file:dataDir?path.join(dataDir,'safety.json'):null});
 const targetClub=installTargetClubWeekly(app,{file:dataDir?path.join(dataDir,'target-club-weekly.json'):null});
 const tick=setInterval(()=>{let ok=true;for(const hub of hubs.values())try{hub.update();}catch{faults++;ok=false;}if(ok)lastHealthy=Date.now();},1000/60);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},15000);
 tick.unref();heartbeat.unref();
 return app;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const origins=['https://oscarbrendonn.github.io'];
 if(process.env.PREVIEW_LOCAL_ORIGIN)origins.push(process.env.PREVIEW_LOCAL_ORIGIN);
 const app=await createPreviewServer({origins,dataDir:process.env.PARK_DATA_DIR||null});
 app.server.listen(Number(process.env.PREVIEW_PORT||8498),'127.0.0.1',()=>console.log('Feel Lab foundation backend ready on '+app.server.address().port));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
