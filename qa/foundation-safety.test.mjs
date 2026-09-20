import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {OnlineHub} from '../server/runtime/server/online-hub.js';
import {CommunityHub} from '../server/runtime/server/community-hub.js';
import {createFeatureBoundary} from '../app/feature-boundary.js';
import {createPreviewServer} from '../server/create-server.mjs';
import WebSocket from 'ws';
class Socket extends EventEmitter{readyState=1;bufferedAmount=0;messages=[];send(s){this.messages.push(JSON.parse(s));}close(){this.readyState=3;this.emit('close');}}
test('a throwing room cannot starve another room or lobby; waiting party can leave safely',()=>{
 let now=10000,steps=0;const h=new OnlineHub({now:()=>now});
 const players=Array.from({length:5},()=>{const p=h.session().player;h.attach(p,new Socket(),'online');return p;});
 const bad=h.newRoom(players[0],2);h.joinRoom(players[1],bad);bad.status='playing';bad.sim={step(){throw Error('Injected room failure');},snapshot(){return {};}};
 const good=h.newRoom(players[2],2);h.joinRoom(players[3],good);good.status='playing';good.sim={step(){steps++;},snapshot(){return {tick:steps};},over:false};
 now+=100;h.update();assert(steps>0);assert.equal(bad.status,'waiting');assert.equal(bad.sim,null);assert.equal(good.status,'playing');assert.equal(h.roomFaults.length,1);assert.equal(players[4].online.readyState,1);assert.doesNotThrow(()=>h.leaveRoom(players[0]));h.close();
});
test('snapshot failure is isolated even during roster refresh; slow or broken socket cannot stop broadcasts',()=>{
 const h=new OnlineHub(),a=h.session().player,b=h.session().player;h.attach(a,new Socket(),'online');h.attach(b,new Socket(),'online');const r=h.newRoom(a,2);r.sim={snapshot(){throw Error('snapshot failure')}};r.status='playing';assert.doesNotThrow(()=>h.allState());assert.equal(r.sim,null);
 a.online.send=()=>{throw Error('socket closed in flight')};assert.doesNotThrow(()=>h.allState());assert(b.online.messages.length>0);h.close();
});
test('feature errors are bounded, sibling hooks continue and retry is explicit',()=>{
 const boundary=createFeatureBoundary();let a=0,b=0;for(let i=0;i<1000;i++){boundary.run('bad',()=>{a++;throw Error('bad');});boundary.run('good',()=>b++);}assert.equal(a,1);assert.equal(b,1000);assert.equal(boundary.snapshot().length,1);boundary.retry('bad');boundary.run('bad',()=>a++);assert.equal(a,2);
});
test('an island vehicle failure and a ride failure do not stop another island',()=>{
 let now=10000,steps=0;const h=new CommunityHub({now:()=>now,worldSource:{rides:[{advance(){throw Error('ride')}}]}});
 h.players.set('observer',{id:'observer',lastSeen:now,online:null,lobbySocket:null});
 h.lobbies.set('broken',{members:new Set(['observer'])});h.lobbies.set('healthy',{members:new Set(['observer'])});
 h.worlds.set('broken',{mounts:new Map(),step(){throw Error('vehicle');}});
 h.worlds.set('healthy',{mounts:new Map(),step(){steps++;},snapshot(){return {}}});
 now+=100;assert.doesNotThrow(()=>h.update());now+=100;assert.doesNotThrow(()=>h.update());assert.equal(steps,2);assert(h.worldFaults.has('broken'));h.close();
});
test('real sockets enforce chat policy and reconnect guest identity on isolated authority',async()=>{
 const origin='http://127.0.0.1:8499',app=await createPreviewServer({origins:[origin],worldSource:null});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const sockets=[];
 try{
  assert.equal((await fetch(base+'/codex/api/session',{headers:{Origin:origin}})).status,404);
  const guest=await (await fetch(base+'/kimi/api/session',{headers:{Origin:origin}})).json();
  assert.equal(guest.shareOrigin,'https://oscarbrendonn.github.io/67park-foundation-next/');
  const ws=new WebSocket(base.replace('http','ws')+'/kimi/ws',['67park-v1','guest.'+guest.token],{headers:{Origin:origin}});sockets.push(ws);const messages=[];ws.on('message',b=>messages.push(JSON.parse(b)));await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
  ws.send(JSON.stringify({t:'chat',text:'porn',nonce:'blocked'}));await new Promise(r=>setTimeout(r,80));assert(messages.some(m=>m.t==='chat.result'&&!m.ok));assert(!messages.some(m=>m.t==='chat'));
  ws.send(JSON.stringify({t:'chat',text:'Ready to play',nonce:'fine'}));await new Promise(r=>setTimeout(r,80));assert(messages.some(m=>m.t==='chat'&&m.text==='Ready to play'));
  const resumed=await (await fetch(base+'/kimi/api/session',{headers:{Origin:origin,Authorization:'Bearer '+guest.token}})).json();assert.equal(resumed.id,guest.id);assert.equal(resumed.shareOrigin,guest.shareOrigin);assert.equal((await (await fetch(base+'/health')).json()).ok,true);
 }finally{for(const ws of sockets)ws.terminate();await app.close();}
});
test('a failed connection attachment closes only that socket and leaves the authority alive',async()=>{
 const origin='http://127.0.0.1:8499',app=await createPreviewServer({origins:[origin],worldSource:null});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,hub=app.hubs.get('kimi'),attach=hub.attach;let ws;
 try{
  const guest=await(await fetch(base+'/kimi/api/session',{headers:{Origin:origin}})).json();
  hub.attach=()=>{throw Error('QA connection setup failure')};
  ws=new WebSocket(base.replace('http','ws')+'/kimi/ws',['67park-v1','guest.'+guest.token],{headers:{Origin:origin}});
  assert.equal(await new Promise((r,j)=>{ws.once('close',r);ws.once('error',j)}),1011);
  hub.attach=attach;
  assert.equal((await fetch(base+'/kimi/api/session',{headers:{Origin:origin}})).status,200);
  assert.equal((await(await fetch(base+'/health')).json()).ok,true);
 }finally{hub.attach=attach;ws?.terminate();await app.close();}
});
