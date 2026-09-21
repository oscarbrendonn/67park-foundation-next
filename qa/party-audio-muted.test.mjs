import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartyAudio} from '../app/party/party-audio.js';
import fs from 'node:fs';
import vm from 'node:vm';

test('silent gestures never initialize or resume WebAudio; a later audible gesture still unlocks it',()=>{
 const host=new EventTarget();host.document=new EventTarget();host.document.hidden=false;
 let muted=true,created=0,resumed=0;
 const param=()=>({value:0,setTargetAtTime(){}});
 host.AudioContext=class {
  constructor(){created++;this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination={};}
  createGain(){return {gain:param(),connect(){}};}
  createDynamicsCompressor(){return {threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};}
  createBuffer(){return {getChannelData:()=>new Float32Array(1)};}
  resume(){resumed++;this.state='running';return Promise.resolve();}
 };
 const settings={sfx:1},audio=createPartyAudio({host,settings,saveSettings(){},gameMuted:()=>muted});
 const gestures=()=>{for(const name of ['pointerdown','pointerup','touchend','keydown'])host.dispatchEvent(new Event(name));};
 gestures();assert.equal(created,0);assert.equal(audio.state(),'none');
 muted=false;settings.sfx=0;gestures();assert.equal(created,0);
 settings.sfx=1;host.document.hidden=true;gestures();assert.equal(created,0);
 host.document.hidden=false;host.dispatchEvent(new Event('pagehide'));gestures();assert.equal(created,0);
 host.dispatchEvent(new Event('pageshow'));gestures();assert.equal(created,1);
 const context=audio.ensure();context.state='suspended';muted=true;gestures();assert.equal(resumed,0);
 muted=false;gestures();assert.equal(resumed,1);assert.equal(created,1);
});

test('legacy ambient noise graph also stays unallocated on muted gestures, and still unlocks after unmute',()=>{
 const source=fs.readFileSync(new URL('../app/chunk-G7D6MVRW.js',import.meta.url),'utf8');
 const start=source.indexOf('function Jb(){'),end=source.indexOf('var oD=',start);
 assert(start>=0&&end>start);
 let created=0,resumed=0,noiseBuffers=0,ambientGraphs=0;
 const scope=vm.createContext({je:true,J:null,rt:null,zo:null,document:{hidden:false},
  window:{AudioContext:class{constructor(){created++;this.state='running';this.destination={};}createGain(){return {connect(){}};}resume(){resumed++;this.state='running';}}},
  nD(){noiseBuffers++;return {};},ux(){},rD(){ambientGraphs++;}});
 vm.runInContext(source.slice(start,end),scope);
 scope.Jb();scope.Jb();assert.equal(created,0);assert.equal(noiseBuffers,0);assert.equal(ambientGraphs,0);
 scope.je=false;scope.document.hidden=true;scope.Jb();assert.equal(created,0);
 scope.document.hidden=false;scope.Jb();assert.equal(created,1);assert.equal(noiseBuffers,1);assert.equal(ambientGraphs,1);
 scope.J.state='suspended';scope.je=true;scope.Jb();assert.equal(resumed,0);
 scope.je=false;scope.Jb();assert.equal(resumed,1);assert.equal(created,1);
});
