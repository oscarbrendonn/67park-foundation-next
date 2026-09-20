import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCarouselDeckCarry,isCarouselDeckContact,rotateCarouselDeckPoint} from '../island/carousel-deck-carry-v1.js';
import {loadIslandWorldSource} from '../server/runtime/server/island-world-source.js';
import {isLocalCarryActive,registerRemoteCarryAvatar,setCarryLocalId} from '../app/park-carry.js';
import carouselBrowser from './carousel-deck.browser.cjs';

const deck={kind:'carousel',center:{x:10,z:-4},innerRadius:.5,radius:3,angle:0,ground:()=>2};
const standing=(x=12,z=-4,extra={})=>({deck,position:{x,y:2.555,z},grounded:true,vertical:0,footOffset:.555,...extra});

test('a grounded free avatar receives the carousel rotation, without changing height',()=>{
 const carry=createCarouselDeckCarry();
 assert.equal(carry.step(standing()),null,'first sample establishes the clock');
 deck.angle=.1;
 const moved=carry.step(standing());
 assert.ok(moved);
 assert.ok(Math.abs(moved.x-(10+2*Math.cos(.1)))<1e-12);
 assert.ok(Math.abs(moved.z-(-4-2*Math.sin(.1)))<1e-12);
 assert.equal(standing().position.y,2.555,'transport only changes the deck-plane coordinates');
 const direct=rotateCarouselDeckPoint({x:12,z:-4},deck.center,.1);
 assert.deepEqual(moved,direct);
});

test('airborne, jump-queued, mounted, seated, nearby and off-deck avatars are never transported',()=>{
 const carry=createCarouselDeckCarry();deck.angle=0;carry.step(standing());
 for(const sample of [
  standing(12,-4,{grounded:false}),
  standing(12,-4,{vertical:.21}),
  standing(12,-4,{context:{jumpQueued:true}}),
  standing(12,-4,{context:{mounted:true}}),
  standing(12,-4,{context:{seated:true}}),
  standing(14,-4),
  standing(12,-4,{position:{x:12,y:2.9,z:-4}}),
 ]){deck.angle+=.1;assert.equal(carry.step(sample),null);}
 assert.equal(isCarouselDeckContact(standing(12,-4)),true);
 assert.equal(isCarouselDeckContact(standing(10,-4)),false,'the center mast is not a rotating deck contact');
});

test('leaving, rejoining, and a stale clock do not replay skipped rotation as a fling',()=>{
 const carry=createCarouselDeckCarry();deck.angle=0;carry.step(standing());
 deck.angle=.1;assert.ok(carry.step(standing(14,-4))===null,'walked off the deck');
 deck.angle=.2;assert.equal(carry.step(standing(14,-4)),null,'off-deck frames still sample the latest angle');
 deck.angle=.3;assert.ok(carry.step(standing()),'normal rotation resumes after rejoin');
 deck.angle=Math.PI;assert.equal(carry.step(standing()),null,'large stale/network clock discontinuity is discarded');
 deck.angle=Math.PI+.1;assert.ok(carry.step(standing()),'the next normal network tick carries again');
});

test('the production free-player tick samples deck carry before the normal contact sweep',async()=>{
 const source=await fs.readFile(new URL('../app/chunk-OZ77422N.js',import.meta.url),'utf8');
 const shipped=await fs.readFile(new URL('../island/runtime.bundle.js',import.meta.url),'utf8');
 const carry=source.indexOf('carouselDeckCarry.step({deck:carouselDeckFor(t,n)');
 const contact=source.indexOf('resolveCharacterContact(tt');
 assert.ok(carry>0&&carry<contact,'deck transport feeds the existing contact sweep instead of bypassing collision');
 assert.match(source,/grounded:x\?\.grounded\?\?\(Math\.abs\(n\.y-ke\.foot-\(characterGround/,'fallback uses the actual current foot contact');
 assert.match(source,/jumpQueued:!!N\.jumpQueued/,'queued jumps cannot be carried before takeoff');
 assert.match(source,/carried:isLocalCarryActive\(\)/,'the authoritative local-carry context is excluded');
 assert.match(source,/swimming:t\.water\(n\.x,n\.z\)/,'skate mode is not misclassified as swimming');
 assert.match(source,/let b=!!D\|\|n\.x!==x\.position\.x/,'a clear swept deck move is still committed to the physics body');
 assert.match(source,/if\(x\.blocked\|\|D\)\{Object\.assign\(n,x\.position\);e\.setTranslation/,'skate contact commits a clear deck move too');
 assert.match(shipped,/deck:\(\)=>carouselDeck84/,'the shipped island runtime exposes the descriptor used by the player tick');
 assert.match(shipped,/get angle\(\)\{return P\}/,'the shipped descriptor reads the existing network-synchronised angle');
});

test('real ride descriptors expose only rotating carousel deck contacts',async()=>{
 const {rides}=await loadIslandWorldSource();
 assert.equal(rides.find(ride=>ride.asset==='ferris').deck(),null);
 for(const asset of ['carousel','carouselSmall']){
  const ride=rides.find(candidate=>candidate.asset===asset),deck=ride.deck();
  assert.equal(deck.kind,'carousel');
  assert.equal(deck.ground(deck.center.x,deck.center.z),null,'fixed center mast is excluded');
  assert.ok(Number.isFinite(deck.ground(deck.center.x+deck.innerRadius+.1,deck.center.z)),'standing deck surface is included');
  const before=deck.angle;ride.advance(.05);assert.notEqual(deck.angle,before,'descriptor observes the existing ride clock');
 }
});

test('authoritative local carry context blocks deck transport until its carrier clears',()=>{
 setCarryLocalId('deck-rider');
 const carrier=registerRemoteCarryAvatar('deck-carrier');
 carrier.update({position:{x:0,y:0,z:0},rotation:{y:0}},{carryTarget:'deck-rider'});
 assert.equal(isLocalCarryActive(),true);
 carrier.dispose();assert.equal(isLocalCarryActive(),false);
 setCarryLocalId('');
});

test('switching decks and resetting establish fresh clocks instead of replaying another deck',()=>{
 const carry=createCarouselDeckCarry();
 const first={...deck,center:{x:10,z:-4},angle:0};
 const second={...deck,center:{x:30,z:-4},angle:1};
 const sample=(active,x)=>({deck:active,position:{x,y:2.555,z:-4},grounded:true,vertical:0,footOffset:.555});
 assert.equal(carry.step(sample(first,12)),null);
 first.angle=.1;assert.ok(carry.step(sample(first,12)),'the first deck advances normally');
 assert.equal(carry.step(sample(second,32)),null,'a different deck never inherits the first deck angle');
 second.angle=1.1;assert.ok(carry.step(sample(second,32)),'the second deck begins on its own next tick');
 carry.reset();second.angle=1.2;
 assert.equal(carry.step(sample(second,32)),null,'reset discards the pre-respawn deck clock');
 second.angle=1.3;assert.ok(carry.step(sample(second,32)),'post-reset rotation resumes only after a fresh sample');
});

test('angle wrap carries the short forward arc rather than treating it as a stale jump',()=>{
 const carry=createCarouselDeckCarry(),wrapped={...deck,angle:Math.PI*2-.04};
 const sample=()=>({deck:wrapped,position:{x:12,y:2.555,z:-4},grounded:true,vertical:0,footOffset:.555});
 assert.equal(carry.step(sample()),null);
 wrapped.angle=.05;
 const moved=carry.step(sample()),expected=rotateCarouselDeckPoint({x:12,z:-4},wrapped.center,.09);
 assert.ok(moved,'a short wrap-around update carries');
 assert(Math.hypot(moved.x-expected.x,moved.z-expected.z)<1e-12,JSON.stringify({moved,expected}));
});

async function orbitBrowserFixture(initialAngle=0){
 const stop=Symbol('first orbit complete'),center={x:10,z:-4},state={x:12,y:2.555,z:-4},deck={center,radius:3,angle:initialAngle,ground:()=>2};
 const body={translation:()=>({...state}),linvel:()=>({x:0,y:0,z:0}),setLinvel:()=>{}};
 const keys=['__islandWorld','__eggyInput','__candy','__tp','localStorage','requestAnimationFrame'],saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const restore=()=>{for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];};
 const install=(key,value)=>Object.defineProperty(globalThis,key,{value,configurable:true,writable:true,enumerable:true});
 let rafs=0;const rotate=delta=>{const x=state.x-center.x,z=state.z-center.z,c=Math.cos(delta),s=Math.sin(delta);state.x=center.x+c*x+s*z;state.z=center.z-s*x+c*z;};
 const ride={asset:'carousel',deck:()=>deck,group:{getObjectByName:()=>({rotation:{y:deck.angle}})}};
 install('__islandWorld',{spawn:[0,.555,0],rides:[ride]});install('__eggyInput',{playerRef:{body},input:{x:0,z:0,run:false}});install('__candy',{state:()=>({mounted:null})});install('__tp',([x,y,z])=>Object.assign(state,{x,y,z}));install('localStorage',{getItem:key=>key==='67park-feel-lab-muted'?'1':null});
 install('requestAnimationFrame',callback=>{rafs++;if(rafs>19){deck.angle=(deck.angle+.23)%(Math.PI*2);rotate(.23);}callback(rafs*16);return rafs;});
 const reports=[],oldLog=console.log;console.log=(name,payload)=>{if(name==='PASS carousel deck orbit')reports.push(JSON.parse(payload));};
 const page={evaluate:async(fn,arg)=>fn(arg),screenshot:async()=>{},keyboard:{press:async()=>{}},getByRole:()=>({tap:async()=>{}})};
 try{
  let error;try{await carouselBrowser(page,{mobile:false,check:async(name,action)=>{await action();if(name.includes('standing avatar follows'))throw stop;}});}catch(caught){error=caught;}
  assert.equal(error,stop);assert.equal(reports.length,1);return reports[0];
 }finally{console.log=oldLog;restore();}
}

test('browser orbit sampling waits for three animation frames across a short threshold crossing and TAU wrap',async()=>{
 for(const angle of [0,Math.PI*2-.04]){
  const result=await orbitBrowserFixture(angle);
  assert.equal(result.frames,3,JSON.stringify(result));assert(result.delta>=.45&&result.error<.12,JSON.stringify(result));
 }
});
