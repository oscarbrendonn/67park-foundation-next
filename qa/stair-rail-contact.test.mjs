import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStairRailBlocker} from '../app/stair-rail-contact.js';
import {stairsRailBlocked} from '../app/island-stair-geometry.js';
import {resolveCharacterContact,sweepRideContact} from '../app/character-contact.js';
const source=fs.readFileSync(new URL('../app/chunk-OZ77422N.js',import.meta.url),'utf8');
const walk=Function(source.slice(source.indexOf('var ke=Object.freeze'),source.indexOf('f();function nt('))+';return tt;')();
const segment={a:[0,0,0],b:[0,1,0],radius:.105};
const blocked=createStairRailBlocker([segment]);
const step=(sweep,from,dx,dz,solid=blocked,ground=()=>0)=>resolveCharacterContact(sweep,
  {from,to:{x:from.x+dx,y:from.y,z:from.z+dz},velocity:{x:dx*60,y:0,z:dz*60},wasGrounded:true,ground,blocked:solid});

test('new blocker preserves the original solid volume, including sloped elbows',()=>{
 const segments=[segment,{a:[0,1,0],b:[0,1.3,2],radius:.105},{a:[0,1.3,2],b:[0,0,2],radius:.09}];
 const solid=createStairRailBlocker(segments);
 for(let x=-.8;x<=.8;x+=.08)for(let z=-.6;z<=2.6;z+=.08)for(const y of [.4,1,1.7,2.5])
  assert.equal(solid(x,y,z),stairsRailBlocked(segments,x,y,z),JSON.stringify({x,y,z}));
});
test('source and shipped bundle install the same rail-only adapter',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 assert(read('island/runtime.js').includes('createStairRailBlocker(stairGeometry.railSegments,treeTrunksBlocked)'));
 assert(read('island/runtime.bundle.js').includes('Ze=__railCornerBlocker(h8.railSegments,Je)'));
 assert(source.includes('character-contact.js?v=rail-corner-1'));
});

test('landing inside a rail capsule permits continuous retreat, not a freeze',()=>{
 for(const sweep of [walk,sweepRideContact])for(const side of [-1,1]){
  let p={x:side*.08,y:.555,z:0};
  for(let i=0;i<10;i++){const r=step(sweep,p,side*.08,0);assert(Math.abs(r.position.x)>Math.abs(p.x)+.07);p=r.position;}
  assert(!blocked(p.x,p.y,p.z));
 }
});
test('escape cannot cross a rail axis, enter another segment, or bypass another solid',()=>{
 for(const sweep of [walk,sweepRideContact]){
  const p={x:.1,y:.555,z:0};
  const toward=step(sweep,p,-.08,0);assert.equal(toward.position.x,p.x);
  const through=step(sweep,p,-1,0);assert(through.position.x>=p.x);
  const other=createStairRailBlocker([segment],x=>x>.15);
  assert(step(sweep,p,.08,0,other).blocked);
  const two=createStairRailBlocker([segment,{...segment,a:[.7,0,0],b:[.7,1,0]}]);
  assert(step(sweep,p,.08,0,two).blocked);
 }
});
test('rounded tip uses its diagonal tangent without entering the rail',()=>{
 for(const sweep of [walk,sweepRideContact]){
  const p={x:.38,y:.555,z:-.38};
  const r=step(sweep,p,-.07,-.025);
  assert.equal(r.kind,'slide');assert(Math.hypot(r.position.x-p.x,r.position.z-p.z)>.05);
  assert(!blocked(r.position.x,r.position.y,r.position.z));
 }
});
test('normal head-on contact remains closed, including a long sweep',()=>{
 for(const sweep of [walk,sweepRideContact]){
  const r=step(sweep,{x:1,y:.555,z:0},-2,0);assert(r.blocked);assert(r.position.x>.52);
  assert(blocked(0,.555,0));assert(!blocked(0,2,0),'a jump can clear the rail');
 }
});
test('skate can leave an already overlapping rear tread but not enter a forward wall',()=>{
 const ground=(x,z)=>x<0?1.0229:0;
 const p={x:.04,y:.555,z:0};
 const r=step(sweepRideContact,p,.08,0,()=>false,ground);
 assert(!r.blocked);assert.equal(r.position.x,.12);
 const high=x=>x<0?.8:0;
 assert(!step(sweepRideContact,p,.08,0,()=>false,high).blocked);
 assert(step(sweepRideContact,p,-.08,0,()=>false,high).blocked);
});
test('invalid and huge motion remain finite and bounded',()=>{
 for(const sweep of [walk,sweepRideContact])for(const d of [NaN,Infinity,100]){
  const r=step(sweep,{x:1,y:.555,z:0},d,0);assert(r.blocked);assert(Object.values(r.position).every(Number.isFinite));assert(r.samples<50);
 }
});
