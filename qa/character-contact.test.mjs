import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {resolveCharacterContact,sweepRideContact} from '../app/character-contact.js';
import {createBuildingFootprint,insideBuildingFootprint} from '../app/building-footprint.js';

// Exercise the exact production curb/stair predicate, not a simplified mock.
const source=fs.readFileSync(new URL('../app/chunk-OZ77422N.js',import.meta.url),'utf8');
const begin=source.indexOf('var ke=Object.freeze'),end=source.indexOf('f();function nt(',begin);
assert(begin>0&&end>begin,'Ground movement source anchor changed');
const walk=Function(source.slice(begin,end)+';return tt;')();
const base=(ground,from,to,velocity={x:3,y:0,z:3})=>({ground,from:{y:.555,...from},to:{y:.555,...to},velocity,wasGrounded:true});

test('walking slides both directions along every wall orientation without entering it',()=>{
 for(const axis of ['x','z'])for(const sign of [-1,1])for(const tangent of [-1,1]){
  const other=axis==='x'?'z':'x',ground=(x,z)=>({x,z}[axis]*sign>=0?8:0);
  const from={x:0,z:0,[axis]:-.41*sign},to={...from,[axis]:.3*sign,[other]:tangent};
  const args=base(ground,from,to,{x:3,y:0,z:3});
  const old=walk(args),next=resolveCharacterContact(walk,args);
  assert(Math.abs(old.position[other])<.1,'Reproduction must stop before sliding');
  assert.equal(next.kind,'slide');assert(Math.abs(next.position[other]-tangent)<1e-6);
  assert(next.position[axis]*sign<=-.39);assert.equal(next.horizontal[axis],0);assert.equal(next.horizontal[other],3);
 }
});
test('convex and concave corners allow retreat but never diagonal tunnelling',()=>{
 for(const ground of [(x,z)=>x>=0&&z>=0?9:0,(x,z)=>x>=0||z>=0?9:0]){
  let from={x:-.41,y:.555,z:-.41};
  for(let i=0;i<1000;i++){
   const to={...from,x:from.x+.12,z:from.z+.12};
   const r=resolveCharacterContact(walk,base(ground,from,to));
   assert(ground(r.position.x,r.position.z)===0);assert(r.samples<400);from=r.position;
  }
  const retreat=resolveCharacterContact(walk,base(ground,from,{...from,x:from.x-1,z:from.z-1},{x:-3,y:0,z:-3}));
  assert(retreat.position.x<from.x-.9&&retreat.position.z<from.z-.9);
 }
});
test('low curbs and stairs remain walkable; building-height edges and thin walls stay closed',()=>{
 const curb=(x,z)=>x>=0?.18:0;
 const r=resolveCharacterContact(walk,base(curb,{x:-1,z:0},{x:1,z:0}));
 assert.equal(r.blocked,false);assert(Math.abs(r.position.y-.735)<1e-6);
 const stairs=(x,z)=>Math.floor(Math.max(0,x)*2)*.3;
 const s=resolveCharacterContact(walk,{...base(stairs,{x:-.5,z:0},{x:2,z:0}),stairs:()=>true});
 assert.equal(s.blocked,false);assert(s.position.y>1.7);
 for(const ground of [(x,z)=>x>=0?4:0,(x,z)=>x>=0&&x<=.15?6:0]){
  const r=resolveCharacterContact(walk,base(ground,{x:-1,z:0},{x:2,z:0}));assert(r.blocked);assert(r.position.x<0);
 }
});
test('25 cm park entrances and normal raised curbs through 55 cm are traversable in every direction',()=>{
 // Exact production heights at the pictured southern park entrance (170,116).
 // Testing only an 18 cm synthetic curb previously missed this regression.
 const road=9.227547645568848,path=9.47878646850586;
 for(const rise of [path-road,.3,.32,.4,.5,.55])for(const axis of ['x','z'])for(const sign of [-1,1]){
  const ground=(x,z)=>road+({x,z}[axis]*sign>=0?rise:0);
  const low={x:0,z:0,y:road+.555,[axis]:-sign},high={...low,[axis]:sign};
  const up=resolveCharacterContact(walk,base(ground,low,high));
  assert(!up.blocked,JSON.stringify({axis,sign,rise,up}));
  assert(Math.abs(up.position.y-(road+rise+.555))<1e-6);
  const down=resolveCharacterContact(walk,base(ground,up.position,low));
  assert(!down.blocked);assert(Math.abs(down.position.y-(road+.555))<1e-6);
 }
});
test('building-height walls, unsupported ledges and explicit house/tree barriers remain closed',()=>{
 for(const ground of [x=>x>=0?.57:0,x=>x<0?0:x<=.15?.3:-3,x=>x>=0?8:0]){
  const result=resolveCharacterContact(walk,base(ground,{x:-1,z:0},{x:2,z:0}));
  assert(result.blocked);assert(result.position.x<0);
 }
 const result=resolveCharacterContact(walk,{...base(()=>0,{x:-1,z:0},{x:2,z:0}),blocked:x=>x>=0});
 assert(result.blocked);assert(result.position.x<0);
 const shortSolid=resolveCharacterContact(walk,{...base(x=>x>=0?.4:0,{x:-1,z:0},{x:2,z:0}),blocked:x=>x>=0});
 assert(shortSolid.blocked);assert(shortSolid.position.x<0,'a solid fence still vetoes a normal curb-height rise');
});
test('a curb corner can lead down onto a still-raised sidewalk instead of acting as a wall',()=>{
 // Crossing the tip of a rounded curb need not land at its exact crown height.
 // Both the crown and the slightly lower sidewalk are safely above the road.
 const ground=x=>x<0?0:x<.15?.2512388229370117:.17;
 const r=resolveCharacterContact(walk,base(ground,{x:-1,z:0},{x:1,z:0}));
 assert(!r.blocked,JSON.stringify(r));assert(Math.abs(r.position.y-.725)<1e-6);
});
test('descending a roof bevel never mistakes the safe floor behind for a new wall',()=>{
 // Exact 28 cm lip transition from the plaza roof. The rear probe still sees
 // the previously safe upper surface; only movement AWAY may disregard it.
 for(const axis of ['x','z'])for(const sign of [-1,1]){
  const ground=(x,z)=>{const q={x,z}[axis]*sign;return q<-.02?.44:q<.01?.2834:0;};
  const from={x:0,z:0,y:.2834+.555},to={...from,[axis]:sign*.08,y:.8334-.005};
  const down=resolveCharacterContact(walk,base(ground,from,to,{x:axis==='x'?3*sign:0,y:-.3,z:axis==='z'?3*sign:0}));
  assert(!down.blocked,JSON.stringify({axis,sign,down}));assert(Math.abs(down.position[axis]-sign*.08)<1e-6);
  assert(Math.abs(down.position.y-.555)<1e-6);
  const wall=(x,z)=>{const q={x,z}[axis]*sign;return q>=.02?4:ground(x,z);};
  assert(resolveCharacterContact(walk,base(wall,from,to)).blocked,'Forward walls stay closed');
 }
});
test('skate contacts preserve slopes, slide at a wall, and stay bounded after a bad frame',()=>{
 const wall=(x,z)=>x>=0?8:0;
 const r=resolveCharacterContact(sweepRideContact,base(wall,{x:-.41,z:0},{x:.5,z:1}));
 assert.equal(r.kind,'slide');assert(r.position.x<0);assert(r.position.z>.95);
 const slope=resolveCharacterContact(sweepRideContact,base((x,z)=>x*.35,{x:0,z:0},{x:1,y:1,z:0}));assert(!slope.blocked);
 for(const sweep of [walk,sweepRideContact])for(const x of [1e9,NaN,Infinity]){
  const r=resolveCharacterContact(sweep,base(wall,{x:-1,z:0},{x,z:1}));assert(r.blocked);assert(r.samples<30);assert(Object.values(r.position).every(Number.isFinite));
 }
});
test('a grounded skateboard can climb the real path curb after a slow gravity frame',()=>{
 const rise=9.47878646850586-9.227547645568848,ground=x=>x>=0?rise:0;
 for(const drop of [0,.1,.3,.5]){
  const r=resolveCharacterContact(sweepRideContact,base(ground,{x:-1,z:0},{x:1,y:.555-drop,z:0},{x:6,y:-4,z:0}));
  assert(!r.blocked,JSON.stringify({drop,r}));assert.equal(r.position.x,1);
 }
 // The correction needs a supported previous frame, not just a nearby floor.
 const airborne=resolveCharacterContact(sweepRideContact,base(ground,{x:-1,y:1.4,z:0},{x:1,y:.15,z:0},{x:6,y:-4,z:0}));
 assert(airborne.blocked);
 for(const wall of [x=>x>=0?4:0,x=>x>=0&&x<=.15?6:0]){
  const r=resolveCharacterContact(sweepRideContact,base(wall,{x:-1,z:0},{x:1,y:.15,z:0},{x:6,y:-4,z:0}));assert(r.blocked);assert(r.position.x<0);
 }
});
test('skate accepts the same 55 cm curb envelope, but not a higher ledge or solid fence',()=>{
 for(const rise of [.4,.5,.55])for(const axis of ['x','z'])for(const sign of [-1,1]){
  const ground=(x,z)=>({x,z}[axis]*sign>=0?rise:0);
  const from={x:0,z:0,y:.555,[axis]:-sign},to={...from,y:.305,[axis]:sign};
  const velocity={x:0,y:-4,z:0};velocity[axis]=6*sign;
  const result=resolveCharacterContact(sweepRideContact,base(ground,from,to,velocity));
  assert.equal(result.blocked,false,JSON.stringify({rise,axis,sign,result}));assert.equal(result.position[axis],sign);
 }
 const high=x=>x>=0?.57:0;
 assert(resolveCharacterContact(sweepRideContact,base(high,{x:-1,z:0},{x:1,y:.305,z:0},{x:6,y:-4,z:0})).blocked,'unsupported high ledge remains closed');
 const fence=x=>x>=0?.4:0;
 assert(resolveCharacterContact(sweepRideContact,{...base(fence,{x:-1,z:0},{x:1,y:.305,z:0},{x:6,y:-4,z:0}),blocked:x=>x>=0}).blocked,'explicit solid vetoes a short curb');
});
test('building footprint follows rounded lower walls, not an oversized roof or square envelope',()=>{
 const wall=new T.CylinderGeometry(2,2,4,24);wall.translate(0,2,0);
 const roof=new T.BoxGeometry(8,.5,8);roof.translate(0,5,0);
 const shape=createBuildingFootprint([wall,roof]);assert(shape);assert(shape.points.length>=12);
 assert(insideBuildingFootprint(shape,0,0));assert(insideBuildingFootprint(shape,1.8,0));
 assert(!insideBuildingFootprint(shape,1.8,1.8));assert(!insideBuildingFootprint(shape,3,0));
 assert.equal(createBuildingFootprint([roof]),null);wall.dispose();roof.dispose();
});
test('production runtime shares contact resolver for walking and skating, no full-axis freeze',()=>{
 assert(source.includes('resolveCharacterContact(tt,'));assert(source.includes('resolveCharacterContact(sweepRideContact,'));
 assert(!source.includes('x:x.blocked?0:r.x'));
 const bundle=fs.readFileSync(new URL('../island/runtime.bundle.js',import.meta.url),'utf8');
 assert(bundle.includes('no=async options=>__centralContacts(await __centralBeforeContacts(options),options.renderer)'));
 assert.equal((bundle.match(/async function no\(/g)||[]).length,1,'Bundled central loader anchor changed');
 const release=fs.readFileSync(new URL('../.github/workflows/release.yml',import.meta.url),'utf8');
 assert(release.includes('needs: regression'));assert(release.includes("PARK_SOAK_MS: '900000'"));
});
