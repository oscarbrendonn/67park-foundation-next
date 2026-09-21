import assert from 'node:assert/strict';
import test from 'node:test';
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
  const documentRef = {body, hidden, createElement: () => new FakeButton()};
  let time = 0, local = 0, remote = 0;
  const horn = createVehicleHorn({document: documentRef, window: windowRef, driver: () => driver, blocked: () => blocked,
    now: () => time, play: () => local++, send: () => remote++});
  return {horn, windowRef, documentRef, body, setDriver: value => { driver = value; }, setBlocked: value => { blocked = value; },
    setTime: value => { time = value; }, counts: () => ({local, remote})};
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

test('keyboard repeat, modifiers, and the 800ms rate guard cannot sustain a horn', () => {
  const f = fixture();
  f.windowRef.emit('keydown', {code: 'KeyH', repeat: true});
  f.windowRef.emit('keydown', {code: 'KeyH', ctrlKey: true});
  f.windowRef.emit('keydown', {code: 'KeyH'});
  f.windowRef.emit('keydown', {code: 'KeyH'});
  f.setTime(799); f.windowRef.emit('keydown', {code: 'KeyH'});
  f.setTime(800); f.windowRef.emit('keydown', {code: 'KeyH'});
  assert.deepEqual(f.counts(), {local: 2, remote: 2});
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
  button.emit('click');
  assert.deepEqual(f.counts(), {local: 1, remote: 1});
  assert.equal(f.horn.stats().emitted, 1);
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
