// Bounded public-preview smoke only. Run manually with, for example:
// LIVE_SMOKE_ENDPOINT=https://preview.example.com \
// LIVE_SMOKE_ORIGIN=https://oscarbrendonn.github.io node qa/live-online-smoke.mjs
import {randomUUID} from 'node:crypto';
import WebSocket from 'ws';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const created=[];
let timeout,endpoint,origin,apiUrl,socketProtocol,runId,stage='configuration';
const requireCheck=(condition,message)=>{if(!condition)throw Error(message);};

async function waitUntil(predicate,label){
 const end=Date.now()+timeout;
 while(Date.now()<end){const value=predicate();if(value)return value;await delay(25);}
 throw Error('timed out waiting for '+label);
}
const socketUrl=channel=>{
 const url=new URL('kimi/'+channel+'?protocol=1',endpoint);url.protocol=socketProtocol;return url;
};
async function session(token){
 const response=await fetch(apiUrl,{headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Error('session request was rejected');
 const guest=await response.json();
 requireCheck(typeof guest.id==='string','session response is missing a guest id');
 requireCheck(typeof guest.token==='string','session response is missing a guest token');
 return guest;
}
function openSocket(url,protocols){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(url,protocols,{headers:{Origin:origin}});
  const timer=setTimeout(()=>{ws.terminate();reject(Error('WebSocket open timed out'));},timeout);
  ws.once('open',()=>{clearTimeout(timer);resolve(ws);});
  ws.once('error',()=>{clearTimeout(timer);reject(Error('WebSocket connection failed'));});
 });
}
function closeSocket(ws){
 if(!ws||ws.readyState===WebSocket.CLOSED)return Promise.resolve();
 return new Promise(resolve=>{
  const timer=setTimeout(()=>{ws.terminate();resolve();},1000);
  ws.once('close',()=>{clearTimeout(timer);resolve();});
  if(ws.readyState===WebSocket.OPEN)ws.close();else ws.terminate();
 });
}
async function connect(peer,island){
 const protocols=['67park-v1','guest.'+peer.token];
 peer.lobby=await openSocket(socketUrl('ws'),protocols);
 peer.online=await openSocket(socketUrl('online'),protocols);
 for(const ws of [peer.lobby,peer.online])ws.on('message',wire=>{
  let message;try{message=JSON.parse(String(wire));}catch{return;}
  peer.messages.push(message);if(peer.messages.length>200)peer.messages.shift();
  if(message.t==='state')peer.state=message;
 });
 peer.lobby.send(JSON.stringify({t:'hello',name:peer.name,combo:JSON.stringify({base:'goril'})}));
 peer.online.send(JSON.stringify({t:'hello',name:peer.name,combo:JSON.stringify({base:'goril'}),...(island?{island}:{})}));
 await waitUntil(()=>peer.state?.me?.id===peer.id,'authenticated guest state');
}
async function run(){
 timeout=Number(process.env.LIVE_SMOKE_TIMEOUT_MS||15000);
 requireCheck(Number.isFinite(timeout)&&timeout>=1000&&timeout<=60000,'timeout must be between 1000 and 60000 ms');
 requireCheck(typeof process.env.LIVE_SMOKE_ENDPOINT==='string'&&process.env.LIVE_SMOKE_ENDPOINT.length>0,'LIVE_SMOKE_ENDPOINT is required');
 endpoint=new URL(process.env.LIVE_SMOKE_ENDPOINT);endpoint.hash='';endpoint.search='';if(!endpoint.pathname.endsWith('/'))endpoint.pathname+='/';
 requireCheck(endpoint.protocol==='https:'||process.env.LIVE_SMOKE_ALLOW_INSECURE==='1','LIVE_SMOKE_ENDPOINT must use HTTPS');
 origin=new URL(process.env.LIVE_SMOKE_ORIGIN||'https://oscarbrendonn.github.io').origin;
 socketProtocol=endpoint.protocol==='https:'?'wss:':endpoint.protocol==='http:'?'ws:':null;
 requireCheck(!!socketProtocol,'LIVE_SMOKE_ENDPOINT must be HTTP(S)');
 apiUrl=new URL('kimi/api/session?protocol=1',endpoint);runId=randomUUID().slice(0,8);

 stage='health';
 const health=await fetch(new URL('health',endpoint),{headers:{Origin:origin},signal:AbortSignal.timeout(timeout)});
 requireCheck(health.ok,'preview health check failed');
 stage='guest sessions';
 const first={...(await session()),name:'Smoke A '+runId,messages:[]},second={...(await session()),name:'Smoke B '+runId,messages:[]};
 created.push(first,second);await connect(first);
 const island=first.state.island?.code;requireCheck(typeof island==='string','first guest did not receive a lobby');
 await connect(second,island);await waitUntil(()=>second.state?.island?.code===island,'same lobby');

 stage='lobby chat';
 first.lobby.send(JSON.stringify({t:'chat',text:'live smoke '+runId+' one',nonce:'smoke-a-'+runId}));
 await waitUntil(()=>second.messages.some(message=>message.t==='chat'&&message.nonce==='smoke-a-'+runId),'first lobby chat');
 second.lobby.send(JSON.stringify({t:'chat',text:'live smoke '+runId+' two',nonce:'smoke-b-'+runId}));
 await waitUntil(()=>first.messages.some(message=>message.t==='chat'&&message.nonce==='smoke-b-'+runId),'second lobby chat');

 stage='movement';
 const secondMove=[180,12,121],firstMove=[181,12,121];
 second.lobby.send(JSON.stringify({t:'s',p:secondMove,ry:0,cm:[1,0,0,0,0,0,0,0,0]}));
 await waitUntil(()=>first.messages.some(message=>message.t==='s'&&message.id===second.id&&message.p?.[0]===secondMove[0]),'first movement');

 stage='reconnect';
 await Promise.all([closeSocket(second.lobby),closeSocket(second.online)]);
 const renewed=await session(second.token);requireCheck(renewed.id===second.id,'authenticated reconnect changed guest identity');
 second.messages=[];second.state=null;await connect(second,island);
 requireCheck(first.lobby.readyState===WebSocket.OPEN&&first.online.readyState===WebSocket.OPEN,'unaffected guest socket closed');
 first.lobby.send(JSON.stringify({t:'s',p:firstMove,ry:0,cm:[1,0,0,0,0,0,0,0,0]}));
 await waitUntil(()=>second.messages.some(message=>message.t==='s'&&message.id===first.id&&message.p?.[0]===firstMove[0]),'continued movement');
 console.log('LIVE_ONLINE_SMOKE_PASS',JSON.stringify({guests:2,lobbyChat:true,movement:true,reconnectIdentity:true,homeContext:false}));
}
try{await run();}catch{
 console.error('LIVE_ONLINE_SMOKE_FAIL',JSON.stringify({stage}));
 process.exitCode=1;
}finally{await Promise.allSettled(created.flatMap(peer=>[closeSocket(peer.lobby),closeSocket(peer.online)]));}
