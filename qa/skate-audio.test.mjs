import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPartyAudio} from '../app/party/party-audio.js';
import {createSkateTricks,skateInput} from '../app/skate-tricks.js';
import {publishSkateFeedback} from '../app/skate-feedback.js';

class Param {
  value=0;events=[];
  setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}
  setTargetAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
  linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);}
  cancelScheduledValues(t){this.events=this.events.filter(e=>e[2]<t);}
}
class AudioNode {
  gain=new Param();frequency=new Param();playbackRate=new Param();Q=new Param();
  threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();
  connect(node){this.connectedTo=node;return this;}disconnect(){this.disconnected=true;}
  start(time){this.startTime=time;}stop(time=0){this.stopTime=time;}
}
class AudioContext {
  state='running';sampleRate=8000;currentTime=1;destination=new AudioNode();sources=[];
  createGain(){return new AudioNode();}createDynamicsCompressor(){return new AudioNode();}
  createBiquadFilter(){return new AudioNode();}
  createBuffer(channels,size){return {getChannelData:()=>new Float32Array(size)};}
  source(){const n=new AudioNode();this.sources.push(n);return n;}
  createBufferSource(){return this.source();}createOscillator(){return this.source();}
  resume(){this.state='running';return Promise.resolve();}
  finish(){for(const n of this.sources)if(!n.disconnected)n.onended?.();}
}
function setup(){
  const host=new EventTarget();host.document=new EventTarget();host.document.hidden=false;
  host.AudioContext=AudioContext;host.CustomEvent=CustomEvent;
  let muted=false;
  const settings={sfx:.8,juice:false},sfx=createPartyAudio({host,settings,saveSettings(){},gameMuted:()=>muted});
  host.dispatchEvent(new Event('pointerdown'));
  return {host,settings,sfx,ctx:sfx.ensure(),mute(v){muted=v;}};
}
const position={x:12,y:10,z:21};

test('accepted ollie, single kickflip and landing reach the existing audio graph',()=>{
  const {host,sfx,ctx}=setup(),tricks=createSkateTricks({},{}),lands=[];
  host.addEventListener('candy:skate-land',e=>lands.push(e.detail));
  const step=(overrides={})=>{ctx.currentTime+=.12;const result=tricks.step({riding:true,grounded:false,dt:.04,...overrides});publishSkateFeedback(result.events,position,host);return result;};
  step({grounded:true,queued:true});step();step();step({queued:true});
  // Repeated input in the same airtime must not synthesize phantom flips.
  for(let i=0;i<20;i++)step({queued:true});
  step({grounded:true});
  assert.deepEqual(sfx.stats().counts,{'skate-ollie':1,'skate-flip':1,'skate-land':1});
  assert.deepEqual(lands,[{x:12,y:9.48,z:21,hard:true}]);
  assert.equal(ctx.sources.length,9);assert.equal(sfx.stats().voices,9);
  assert(ctx.sources.every(s=>s.stopTime>s.startTime));ctx.finish();assert.equal(sfx.stats().voices,0);
});

test('keyboard auto-repeat, walking, swimming and rejected presses make no phantom trick sounds',()=>{
  const {host,sfx}=setup(),tricks=createSkateTricks({},{});
  const step=o=>publishSkateFeedback(tricks.step({dt:.04,...o}).events,position,host);
  step({riding:false,grounded:true,queued:true});
  step({riding:true,grounded:true});step({riding:true});step({riding:true});
  skateInput.repeat=true;
  try{step({riding:true,queued:true});}finally{skateInput.repeat=false;}
  step({riding:false,swimming:true,queued:true});
  publishSkateFeedback(['unknown'],position,host);
  publishSkateFeedback(['land'],{x:NaN,y:1,z:1},host);
  assert.deepEqual(sfx.stats().counts,{});
});

test('mute, zero SFX, hidden page and pagehide suppress skate sounds; resume restores them',()=>{
  const {host,sfx,ctx,settings,mute}=setup();
  const play=()=>{ctx.currentTime+=.2;publishSkateFeedback(['ollie','kickflip','land'],position,host);};
  mute(true);play();mute(false);settings.sfx=0;play();settings.sfx=.8;
  host.document.hidden=true;play();host.document.hidden=false;
  host.dispatchEvent(new Event('pagehide'));play();assert.deepEqual(sfx.stats().counts,{});
  host.dispatchEvent(new Event('pageshow'));play();
  assert.deepEqual(sfx.stats().counts,{'skate-ollie':1,'skate-flip':1,'skate-land':1});
  // Visual-juice preference is false throughout: it must not disable audio.
  ctx.finish();assert.equal(sfx.stats().voices,0);
});

test('spam stays bounded and sound node failures never escape into movement',()=>{
  const {host,sfx,ctx}=setup();
  for(let i=0;i<1000;i++)publishSkateFeedback(['ollie','kickflip','land'],position,host);
  assert.equal(sfx.stats().voices,9);assert.equal(sfx.stats().counts['skate-flip'],1);
  for(let i=0;i<100;i++){ctx.currentTime+=.2;publishSkateFeedback(['ollie','kickflip','land-hard'],position,host);assert(sfx.stats().voices<=24);ctx.finish();}
  assert.equal(sfx.stats().voices,0);
  ctx.currentTime+=1;ctx.createOscillator=()=>{throw Error('Audio unavailable')};
  assert.doesNotThrow(()=>publishSkateFeedback(['ollie','kickflip','land'],position,host));
  ctx.finish();assert.equal(sfx.stats().voices,0);
});

test('shared player publishes feedback and entry cache keys include the sound fix',()=>{
  const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
  assert(read('../app/main.js').includes('publishSkateFeedback(sk.events,A)'));
  assert(read('../app/party/party-pack.js').includes('./party-audio.js?v=horn-hold-1'));
  const html=read('../index.html');assert(html.includes('app/main.js?v=cat-fit-glow-1'));
  assert(html.includes('app/party/party-pack.js?v=rail-corner-1'));
});

test('assistive horn tap uses one steady-pitch finite voice and shares mute/SFX/visibility',()=>{
 const {host,sfx,ctx,settings,mute}=setup();
 for(let i=0;i<1000;i++)sfx.play('horn');
 assert.equal(sfx.stats().counts.horn,1);assert.equal(ctx.sources.length,1);assert.equal(ctx.sources[0].frequency.value,440);
 assert(ctx.sources.every(s=>s.stopTime-s.startTime<.25));ctx.finish();
 ctx.currentTime+=1;mute(true);sfx.play('horn');mute(false);settings.sfx=0;sfx.play('horn');settings.sfx=.8;
 host.document.hidden=true;sfx.play('horn');host.document.hidden=false;
 assert.equal(sfx.stats().counts.horn,1);assert.equal(sfx.stats().voices,0);
 sfx.play('horn');assert.equal(sfx.stats().counts.horn,2);ctx.finish();
});

test('held horn is a single constant 440Hz voice until release, without repeating timers',()=>{
 const {sfx,ctx}=setup();for(let i=0;i<1000;i++)sfx.startHorn();
 assert.equal(ctx.sources.length,1);const v=ctx.sources[0];assert.equal(v.frequency.value,440);assert.equal(v.type,'triangle');
 assert.equal(v.stopTime,undefined);ctx.currentTime+=60;assert.equal(sfx.stats().hornActive,true);
 sfx.stopHorn();assert.equal(sfx.stats().hornActive,false);assert.equal(v.stopTime,ctx.currentTime+.045);
 assert.deepEqual(v.connectedTo.gain.events,[['set',0,1],['linear',.2,1.012],['set',.2,61],['linear',0,61.04]]);
 ctx.finish();assert.equal(sfx.stats().voices,0);
});
test('a very short horn tap preserves its attack slope before the release',()=>{
 const {sfx,ctx}=setup();sfx.startHorn();ctx.currentTime=1.003;sfx.stopHorn();
 const events=ctx.sources[0].connectedTo.gain.events;
 assert.equal(events.length,3);assert.deepEqual(events[0],['set',0,1]);
 assert.equal(events[1][0],'linear');assert(Math.abs(events[1][1]-.05)<1e-12);assert.equal(events[1][2],1.003);
 assert.deepEqual(events[2],['linear',0,1.043]);ctx.finish();
});
test('mute, zero volume, hide, blur and pagehide stop a held horn and never auto-restart it',()=>{
 for(const stop of [f=>{f.mute(true);f.host.dispatchEvent(new Event('park:audio-mute-change'));},
  f=>f.sfx.setVolume(0),f=>{f.host.document.hidden=true;f.host.document.dispatchEvent(new Event('visibilitychange'));},
  f=>f.host.dispatchEvent(new Event('blur')),f=>f.host.dispatchEvent(new Event('pagehide'))]){
  const f=setup();f.sfx.startHorn();stop(f);assert.equal(f.sfx.stats().hornActive,false);
  assert(Number.isFinite(f.ctx.sources[0].stopTime));f.ctx.finish();assert.equal(f.sfx.stats().voices,0);
  f.mute(false);f.settings.sfx=.8;f.host.document.hidden=false;f.host.dispatchEvent(new Event('pageshow'));
  assert.equal(f.sfx.stats().hornActive,false);assert.equal(f.ctx.sources.length,1);
 }
});
test('releasing before asynchronous audio unlock prevents a delayed stuck beep',async()=>{
 const f=setup();let resume;f.ctx.state='suspended';f.ctx.resume=()=>new Promise(resolve=>{resume=()=>{f.ctx.state='running';resolve();};});
 f.sfx.startHorn();f.sfx.stopHorn();resume();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.ctx.sources.length,0);assert.equal(f.sfx.stats().hornActive,false);
 f.sfx.startHorn();assert.equal(f.ctx.sources.length,1);f.sfx.stopHorn();f.ctx.finish();
});
test('muted horn holds do not allocate audio and synthesis errors do not break controls',()=>{
 const f=setup();f.mute(true);f.sfx.startHorn();assert.equal(f.ctx.sources.length,0);
 f.mute(false);f.ctx.createOscillator=()=>{throw Error('unavailable');};assert.doesNotThrow(()=>f.sfx.startHorn());
 assert.equal(f.sfx.stats().hornActive,false);assert.equal(f.sfx.stats().voices,0);
});
