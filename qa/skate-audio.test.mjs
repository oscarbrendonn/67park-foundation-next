import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPartyAudio} from '../app/party/party-audio.js';
import {createSkateTricks,skateInput} from '../app/skate-tricks.js';
import {publishSkateFeedback} from '../app/skate-feedback.js';

class Param {
  value=0;
  setValueAtTime(v){this.value=v;}
  setTargetAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
}
class AudioNode {
  gain=new Param();frequency=new Param();playbackRate=new Param();Q=new Param();
  threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();
  connect(){return this;}disconnect(){this.disconnected=true;}
  start(time){this.startTime=time;}stop(time){this.stopTime=time;}
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
  assert(read('../app/party/party-pack.js').includes('./party-audio.js?v=vehicle-feedback-1'));
  const html=read('../index.html');assert(html.includes('app/main.js?v=coaster-rail-finish-1'));
  assert(html.includes('app/party/party-pack.js?v=vehicle-feedback-1'));
});

test('horn uses two finite voices, shares mute/SFX/visibility, and rejects held spam',()=>{
 const {host,sfx,ctx,settings,mute}=setup();
 for(let i=0;i<1000;i++)sfx.play('horn');
 assert.equal(sfx.stats().counts.horn,1);assert.equal(ctx.sources.length,2);
 assert(ctx.sources.every(s=>s.stopTime-s.startTime<.25));ctx.finish();
 ctx.currentTime+=1;mute(true);sfx.play('horn');mute(false);settings.sfx=0;sfx.play('horn');settings.sfx=.8;
 host.document.hidden=true;sfx.play('horn');host.document.hidden=false;
 assert.equal(sfx.stats().counts.horn,1);assert.equal(sfx.stats().voices,0);
 sfx.play('horn');assert.equal(sfx.stats().counts.horn,2);ctx.finish();
});
