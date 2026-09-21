import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createWardrobeGpuHandoff} from '../app/wardrobe-gpu-handoff.js';

function createFixture(){
 const documentRef=new EventTarget(),eventTarget=new EventTarget();
 Object.defineProperty(documentRef,'hidden',{value:false,writable:true});
 return {documentRef,eventTarget,handoff:createWardrobeGpuHandoff({documentRef,eventTarget})};
}
function client({capture=()=>{},dispose=()=>{}}={}){return {capture,dispose};}

test('wardrobe fault closes established sockets before enabling HTTP offline emulation',()=>{
 const code=fs.readFileSync(new URL('./wardrobe-recovery.browser.cjs',import.meta.url),'utf8');
 const refuse=code.indexOf('await page.routeWebSocket('),close=code.indexOf('__eggyNet.ws?.close();'),
  disconnected=code.indexOf('await page.waitForFunction(()=>!__eggyNet.connected&&!__candyOnline.data.connected)'),
  offline=code.indexOf('await page.context().setOffline(true)');
 assert(refuse>=0&&refuse<close&&close<disconnected&&disconnected<offline);
 assert(code.includes('!navigator.onLine&&!__eggyNet.connected&&!__candyOnline.data.connected'));
 assert(code.includes("await page.locator('#park-connection-recovery').waitFor({state:'visible',timeout:5000})"));
 assert(code.includes('interruptSockets=false;await page.context().setOffline(false)'));
 assert(code.includes('await page.waitForFunction(()=>__eggyNet.connected&&__candyOnline.data.connected'));
});

test('visible pageshow and visibilitychange redraw active preview clients',()=>{
 const {documentRef,eventTarget,handoff}=createFixture();let captures=0;
 handoff.register(client({capture:()=>captures++}));
 eventTarget.dispatchEvent(new Event('pageshow'));
 documentRef.dispatchEvent(new Event('visibilitychange'));
 assert.equal(captures,2);
 handoff.dispose();
});

test('hidden and GPU-paused previews do not redraw',()=>{
 const {documentRef,eventTarget,handoff}=createFixture();let captures=0;
 handoff.register(client({capture:()=>captures++}));
 documentRef.hidden=true;
 eventTarget.dispatchEvent(new Event('pageshow'));
 documentRef.dispatchEvent(new Event('visibilitychange'));
 assert.equal(captures,0);
 documentRef.hidden=false;handoff.request();
 const pausedCaptures=captures;
 eventTarget.dispatchEvent(new Event('pageshow'));
 documentRef.dispatchEvent(new Event('visibilitychange'));
 assert.equal(handoff.snapshot().paused,true);
 assert.equal(captures,pausedCaptures);
 handoff.dispose();
});

test('disposed clients and factories leave no resume redraw listener behind',()=>{
 const {documentRef,eventTarget,handoff}=createFixture();let captures=0,disposed=0;
 const unregister=handoff.register(client({capture:()=>captures++,dispose:()=>disposed++}));
 unregister();eventTarget.dispatchEvent(new Event('pageshow'));documentRef.dispatchEvent(new Event('visibilitychange'));
 assert.equal(captures,0);
 handoff.register(client({capture:()=>captures++,dispose:()=>disposed++}));
 handoff.dispose();eventTarget.dispatchEvent(new Event('pageshow'));documentRef.dispatchEvent(new Event('visibilitychange'));
 assert.equal(captures,0);assert.equal(disposed,1);
});

test('one broken capture does not prevent another preview redraw',()=>{
 const {eventTarget,handoff}=createFixture();let captures=0;
 handoff.register(client({capture:()=>{throw Error('expected test capture failure');}}));
 handoff.register(client({capture:()=>captures++}));
 eventTarget.dispatchEvent(new Event('pageshow'));
 assert.equal(captures,1);
 handoff.dispose();
});
