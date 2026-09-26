import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createVehicleHorn} from '../app/party/vehicle-horn.js';

class FakeTarget {
  constructor(){ this.listeners = new Map(); }
  addEventListener(type, listener){ const set = this.listeners.get(type) || new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener){ this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}){ for (const listener of this.listeners.get(type) || []) listener({type, ...event}); }
}
class FakeButton extends FakeTarget {
  constructor(){ super(); this.style = {}; this.attributes = new Map(); this.removed = false; }
  setAttribute(name, value){ this.attributes.set(name, String(value)); }
  remove(){ this.removed = true; this.parentNode?.removeChild(this); }
}
function fixture({driver = true, blocked = false, hidden = false} = {}) {
  const windowRef = new FakeTarget(), body = {
    children: [], appendChild(node){ node.parentNode = this; this.children.push(node); },
    removeChild(node){ this.children = this.children.filter(item => item !== node); node.parentNode = null; },
  };
  const documentRef = Object.assign(new FakeTarget(), {body, hidden, createElement: () => new FakeButton()});
  let time = 0, local = 0, remote = 0, starts = 0, stops = 0;
  const horn = createVehicleHorn({document: documentRef, window: windowRef, driver: () => driver, blocked: () => blocked,
    now: () => time, play: () => local++, start:()=>{local++;starts++;}, stop:()=>stops++, send: () => remote++});
  return {horn, windowRef, documentRef, body, setDriver: value => { driver = value; }, setBlocked: value => { blocked = value; },
    setTime: value => { time = value; }, counts: () => ({local, remote}), heldCounts:()=>({starts,stops})};
}

test('only an eligible driver receives the fixed accessible horn control', () => {
  const f = fixture({driver: false});
  assert.equal(f.body.children.length, 0);
  f.setDriver(true); f.horn.step();
  const button = f.body.children[0];
  assert.equal(button.id, 'vehicle-horn-button');
  assert.equal(button.className, 'vehicle-horn-control');
  assert.equal(button.attributes.get('aria-label'), 'Sound vehicle horn');
  assert.equal(button.style.position, 'fixed');
  assert.match(button.style.bottom, /safe-area-inset-bottom/);
});

test('a horn press invokes existing local SFX and send adapters once', () => {
  const f = fixture();
  assert.equal(f.horn.press(), true);
  assert.deepEqual(f.counts(), {local: 1, remote: 1});
  assert.equal(f.horn.stats().emitted, 1);
});

test('H sustains one voice for an arbitrary hold and stops on keyup; repeats never layer voices', () => {
  const f = fixture();
  f.windowRef.emit('keydown', {code: 'KeyH', repeat: true});
  f.windowRef.emit('keydown', {code: 'KeyH', ctrlKey: true});
  f.windowRef.emit('keydown', {code: 'KeyH'});
  f.windowRef.emit('keydown', {code: 'KeyH'});
  f.setTime(60000); f.windowRef.emit('keydown', {code: 'KeyH',repeat:true});f.horn.step();
  assert.deepEqual(f.counts(), {local: 1, remote: 1});assert.equal(f.horn.stats().held,true);
  f.windowRef.emit('keyup',{code:'KeyH'});assert.equal(f.horn.stats().held,false);
  assert.deepEqual(f.heldCounts(),{starts:1,stops:1});
  f.windowRef.emit('keydown',{code:'KeyH'});assert.equal(f.heldCounts().starts,2);
});

test('text entry, hidden state, blocked state, and driver exit reject horn input', () => {
  const f = fixture();
  f.windowRef.emit('keydown', {code: 'KeyH', target: {tagName: 'INPUT'}});
  f.windowRef.emit('keydown', {code: 'KeyH', target: {closest: selector => selector.includes('[role="textbox"]') ? {} : null}});
  f.documentRef.hidden = true; f.windowRef.emit('keydown', {code: 'KeyH'});
  f.documentRef.hidden = false; f.setBlocked(true); f.windowRef.emit('keydown', {code: 'KeyH'});
  f.setBlocked(false); f.setDriver(false); f.horn.step(); f.windowRef.emit('keydown', {code: 'KeyH'});
  assert.deepEqual(f.counts(), {local: 0, remote: 0});
  assert.equal(f.body.children.length, 0);
});

test('a touch pointerdown plus its click emits one bounded horn without affecting driving touches', () => {
  const f = fixture(), button = f.body.children[0];
  button.emit('pointerdown', {pointerType: 'touch', pointerId: 9});
  f.windowRef.emit('pointerup',{pointerId:3});assert.equal(f.horn.stats().held,true);
  f.windowRef.emit('pointerup',{pointerId:9});assert.equal(f.horn.stats().held,false);
  button.emit('click');
  assert.deepEqual(f.counts(), {local: 1, remote: 1});
  assert.equal(f.horn.stats().emitted, 1);
  assert.deepEqual(f.heldCounts(),{starts:1,stops:1});
});

test('touch and H share a voice until both inputs are released',()=>{
 const f=fixture(),button=f.body.children[0];button.emit('pointerdown',{pointerType:'touch',pointerId:9});
 f.windowRef.emit('keydown',{code:'KeyH'});f.windowRef.emit('keyup',{code:'KeyH'});
 assert.equal(f.horn.stats().held,true);assert.equal(f.heldCounts().starts,1);
 button.emit('lostpointercapture',{pointerId:9});assert.equal(f.horn.stats().held,false);assert.equal(f.heldCounts().stops,1);
});
test('blur, hidden page, pagehide, driver exit, blocked UI and text focus all release immediately',()=>{
 for(const end of [f=>f.windowRef.emit('blur'),f=>f.windowRef.emit('pagehide'),
  f=>{f.documentRef.hidden=true;f.documentRef.emit('visibilitychange');},
  f=>{f.setDriver(false);f.horn.step();},f=>{f.setBlocked(true);f.horn.step();},
  f=>f.documentRef.emit('focusin',{target:{tagName:'INPUT'}})]){
  const f=fixture();f.windowRef.emit('keydown',{code:'KeyH'});end(f);
  assert.equal(f.horn.stats().held,false);assert.equal(f.heldCounts().stops,1);
 }
});
test('focused button Space/Enter hold and release; rapid press spam remains bounded',()=>{
 for(const code of ['Space','Enter']){const f=fixture(),target=f.body.children[0];
  f.windowRef.emit('keydown',{code,target});assert.equal(f.horn.stats().held,true);
  f.windowRef.emit('keyup',{code,target});assert.equal(f.horn.stats().held,false);
  for(let i=0;i<1000;i++)f.horn.press();assert.equal(f.horn.stats().emitted,1);
  f.setTime(120);assert.equal(f.horn.press(),true);
 }
});

test('a cancelled touch cannot suppress a later keyboard accessibility click', () => {
  const f = fixture(), button = f.body.children[0];
  button.emit('pointerdown', {pointerType: 'touch', pointerId: 9});
  button.emit('pointercancel', {pointerId: 9});
  f.setTime(800);
  button.emit('click', {detail: 0});
  assert.deepEqual(f.counts(), {local: 2, remote: 2});
});

test('dispose removes listeners and the mounted control', () => {
  const f = fixture();
  f.horn.dispose();
  f.windowRef.emit('keydown', {code: 'KeyH'});
  assert.equal(f.body.children.length, 0);
  assert.deepEqual(f.counts(), {local: 0, remote: 0});
  assert.equal(f.horn.stats().eligible, false);
});

test('entry resolves old and new horn aliases to one revision, with local driver-only wiring',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const html=read('index.html'),map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 for(const name of ['party-pack','party-audio','vehicle-horn']){
  const path='/67park-foundation-next/app/party/'+name+'.js',entries=Object.entries(map).filter(([key])=>key.split('?')[0]===path);
  const version=name==='party-pack'?'target-club-1':name==='party-audio'?'pet-play-2':'horn-hold-1';
  assert(entries.length>=2,name);assert(entries.every(([,value])=>value===path+'?v='+version),name);
 }
 assert(html.includes('src="/67park-foundation-next/app/party/party-pack.js?v=target-club-1"'));
 const pack=read('app/party/party-pack.js'),wiring=pack.slice(pack.indexOf('const horn = createVehicleHorn('),pack.indexOf('let stateApi'));
 assert(wiring.includes("player.map==='city'&&!!n?.connected&&!!n.id"));assert(wiring.includes('car.ownerAt?.(0)===n.id'));
 assert(wiring.includes('start:()=>sfx.startHorn()'));assert(wiring.includes('stop:()=>sfx.stopHorn()'));assert(!wiring.includes('send:'));
});
