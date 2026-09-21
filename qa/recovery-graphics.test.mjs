import test from 'node:test';
import assert from 'node:assert/strict';
import {qualityPixelRatio,installGraphicsQuality} from '../app/graphics-quality.js';
import {compatibleProtocol,requestedProtocol,SERVER_PROTOCOL} from '../app/protocol-version.js';
import {rememberReturn,readReturnIntent,returningFromMatch,watchParkSocket,connectionProblem,connectionRecoverySnapshot,recordedEntryLoadFailure,recoveryCoveredByWardrobe} from '../app/connection-recovery.js';
import {createCameraBoom,createVerticalCameraTarget,FEEL_CAMERA} from '../app/feel-camera.js';

test('protocol compatibility rejects malformed and incompatible contracts, not visual builds',()=>{
 assert(compatibleProtocol(SERVER_PROTOCOL,1));assert(compatibleProtocol({...SERVER_PROTOCOL,build:'another-visual-release'},1));
 for(const p of [null,{}, {min:2,max:3}, {min:1,max:0},{min:'1',max:1}])assert.equal(compatibleProtocol(p),false);
 assert.equal(requestedProtocol('/kimi/api/session'),1);
 assert.equal(requestedProtocol('/kimi/api/session?protocol=2'),2);
 assert(Number.isNaN(requestedProtocol('/kimi/api/session?protocol=bad')));
});
test('a match recovery mounted after a rejected entry import preserves the inline failure signal',()=>{
 assert(recordedEntryLoadFailure(['TypeError: Failed to fetch dynamically imported module: /balloon/online-match.js']));
 assert(recordedEntryLoadFailure([{reason:{message:'NetworkError: failed to load module'}}]));
 assert(recordedEntryLoadFailure([{reason:'NetworkError: failed to fetch module'}]));
 assert.equal(recordedEntryLoadFailure([]),false);
 assert.equal(recordedEntryLoadFailure(['ordinary chat update',null]),false);
});
test('only transient root recovery yields to an open wardrobe',()=>{
 const open={querySelector:selector=>selector==='.wardrobe'?{}:null},closed={querySelector:()=>null};
 assert(recoveryCoveredByWardrobe(null,open));
 assert.equal(recoveryCoveredByWardrobe('ROOM-A',open),false);
 assert.equal(recoveryCoveredByWardrobe(null,open,true),false,'terminal Reload remains reachable while the entry wardrobe loads');
 assert.equal(recoveryCoveredByWardrobe(null,closed),false);
 assert.equal(recoveryCoveredByWardrobe(null,{}),false,'minimal document stubs need no querySelector');
});
test('return from a failed match leaves that room once; stale intent cannot leave a new match',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const messages=[],ws={send:s=>messages.push(JSON.parse(s))};
 assert(rememberReturn('ROOM-A',storage));assert.equal(readReturnIntent(storage).room,'ROOM-A');
 for(let i=0;i<1000;i++)assert(returningFromMatch({t:'state',room:{code:'ROOM-A'}},ws,{storage}));
 assert.deepEqual(messages,[{t:'room.leave'}]);
 assert.equal(returningFromMatch({t:'state',room:{code:'ROOM-B'}},ws,{storage}),false);assert.equal(readReturnIntent(storage),null);
 rememberReturn('ROOM-A',storage);assert.equal(readReturnIntent(storage,Date.now()+300001),null);
});
test('healthy sibling socket cannot erase an authentication cooldown',()=>{
 const ws=new EventTarget();Object.assign(ws,{readyState:1,bufferedAmount:0,send(){},close(){}});
 let now=10;watchParkSocket(ws,'ws',{now:()=>now});
 const welcome=()=>{const event=new Event('message');event.data=JSON.stringify({t:'welcome'});ws.dispatchEvent(event)};
 try{
  connectionProblem('Please wait before reconnecting.',{retryAt:100});welcome();
  assert.equal(connectionRecoverySnapshot().retryAt,100);
  assert.equal(connectionRecoverySnapshot().error,'Please wait before reconnecting.');
  now=101;welcome();assert.equal(connectionRecoverySnapshot().retryAt,0);
  assert.equal(connectionRecoverySnapshot().error,'');
 }finally{const event=new Event('close');event.code=1000;ws.dispatchEvent(event);connectionProblem('');}
});
function rendererFixture(){
 const host=new EventTarget();host.devicePixelRatio=3;
 const settings={graphics:'auto'};let ratio=2,draws=0,destroyed=0;
 const scene={traverse:fn=>fn(light)};
 const shadow={mapSize:{x:2048,y:2048,set(x,y){this.x=x;this.y=y}},map:{dispose(){destroyed++}},mapPass:null};
 const light={isLight:true,shadow,parent:scene};
 const renderer={domElement:{dataset:{}},getPixelRatio:()=>ratio,setPixelRatio(n){ratio=n},shadowMap:{enabled:true},render(){draws++},dispose(){destroyed++}};
 installGraphicsQuality(renderer,{settings,host});
 return {host,settings,scene,renderer,shadow,counts:()=>({draws,destroyed}),set(level){settings.graphics=level;host.dispatchEvent(new Event('park:settings-change'));renderer.render(scene,{})}};
}
test('graphics levels change the real renderer and shadow allocation, keep drawing and restore authored high',()=>{
 const f=rendererFixture();f.renderer.render(f.scene,{});
 f.set('low');assert.equal(f.renderer.getPixelRatio(),.8);assert.equal(f.renderer.shadowMap.enabled,false);assert.equal(f.shadow.mapSize.x,512);assert.equal(f.counts().destroyed,1);
 f.renderer.setPixelRatio(2);assert.equal(f.renderer.getPixelRatio(),.8,'resize or old adaptive controller cannot undo manual quality');
 f.set('medium');assert.equal(f.renderer.getPixelRatio(),1.25);assert(f.renderer.shadowMap.enabled);assert.equal(f.shadow.mapSize.x,1024);
 f.set('high');assert.equal(f.renderer.getPixelRatio(),2);assert.equal(f.shadow.mapSize.x,2048);
 f.set('auto');f.renderer.setPixelRatio(1.1);assert.equal(f.renderer.getPixelRatio(),1.1);
 for(let i=0;i<100;i++)f.set(['low','medium','high'][i%3]);
 assert.equal(f.counts().draws,105);f.renderer.dispose();assert.equal(f.counts().destroyed,2);
 assert.equal(qualityPixelRatio('high',2,1),1);assert.equal(qualityPixelRatio('low',2,3),.8);
});
test('vertical camera follows smoothly at 30/60/120 FPS without horizontal or look-input lag',()=>{
 for(const fps of [30,60,120]){
  const target=createVerticalCameraTarget();target.step({x:0,y:0,z:0},1/fps);
  const n=target.step({x:1,y:.4,z:2},1/fps);assert.equal(n.x,1);assert.equal(n.z,2);assert(n.y>0&&n.y<.4);
  let p=n;for(let i=0;i<fps;i++)p=target.step({x:1,y:.4,z:2},1/fps);assert(Math.abs(p.y-.4)<.001);
  const fall=target.step({x:1,y:-4,z:2},1/fps);assert(fall.y<=-3.35);
  assert.equal(target.step({x:100,y:20,z:2},1/fps).y,20);
  const boom=createCameraBoom();boom.pose({x:0,y:0,z:0},0,.36,6.8,1,1/fps);
  const pose=boom.pose({x:1,y:.4,z:2},Math.PI/2,.2,6.8,1,1/fps);
  assert(Math.abs(pose.position.z-pose.target.z)<1e-8);assert(pose.position.x>pose.target.x);
  const blocked=boom.step(pose.target,pose.position,1/fps,()=>1);assert.equal(blocked.distance,1-FEEL_CAMERA.padding);
 }
});
test('denied storage does not crash return recovery, and a quality fault cannot stop rendering',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 try{
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw Error('Storage denied')}});
  assert.equal(readReturnIntent(),null);assert.equal(rememberReturn('ROOM-A'),false);
  assert.equal(returningFromMatch({t:'state',room:{code:'ROOM-A'}},{}),false);
 }finally{if(descriptor)Object.defineProperty(globalThis,'sessionStorage',descriptor);else delete globalThis.sessionStorage;}
 const f=rendererFixture();let faults=0;
 f.host.addEventListener('park:graphics-fault',()=>faults++);
 f.scene.traverse=()=>{throw Error('QA optional shadow scan failure')};
 for(let i=0;i<1000;i++)f.renderer.render(f.scene,{});
 assert.equal(f.counts().draws,1000);assert.equal(faults,1);assert.equal(f.renderer.shadowMap.enabled,false);
 assert.equal(JSON.parse(f.renderer.domElement.dataset.parkGraphics).level,'fallback');
 f.renderer.dispose();
});
