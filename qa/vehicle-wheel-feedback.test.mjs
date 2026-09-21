import test from 'node:test';
import assert from 'node:assert/strict';
import {createCandyVehicle110} from '../island/candy-vehicle-model-v110.js';
import {useReferenceCarBody} from '../app/reference-car-body.js';

test('all compact wheels roll by signed distance, steer only in front and stop at rest',()=>{
 const car=createCandyVehicle110({kind:'car'}),spec=car.spec,seats=car.seats,claim=car.claimSeat;
 useReferenceCarBody(car);
 try{
  assert.equal(car.spec,spec);assert.equal(car.seats,seats);assert.equal(car.claimSeat,claim);
  assert.equal(car.referenceBody.wheelVents,3);assert.equal(car.referenceBody.wheelFeedbackDraws,0);
  const radius=car.referenceBody.wheelRadius;
  car.animate(radius*.6,.25);
  for(const w of car.wheels){assert(Math.abs(w.roll.rotation.x-.6)<1e-12);assert.equal(w.pivot.rotation.y,w.front?.25:0);assert.equal(w.roll.children.length,2);}
  car.animate(0,0);assert(car.wheels.every(w=>w.roll.rotation.x===.6));
  car.animate(-radius*.2,-.2);assert(car.wheels.every(w=>Math.abs(w.roll.rotation.x-.4)<1e-12));
  car.animate(NaN,NaN);assert(car.wheels.every(w=>Math.abs(w.roll.rotation.x-.4)<1e-12&&w.pivot.rotation.y===0));
  for(let i=0;i<10000;i++)car.animate(.5,0);
  assert(car.wheels.every(w=>Number.isFinite(w.roll.rotation.x)&&Math.abs(w.roll.rotation.x)<Math.PI*2));
  for(const w of car.wheels)for(const mesh of w.roll.children)for(const attr of Object.values(mesh.geometry.attributes))assert(attr.array.every(Number.isFinite));
 }finally{car.dispose();}
});

test('visible hub details share geometry and resources across the two compact cars',()=>{
 const a=useReferenceCarBody(createCandyVehicle110({kind:'car'})),b=useReferenceCarBody(createCandyVehicle110({kind:'car'}));
 try{
  assert.equal(a.wheels[0].roll.children[0].geometry,b.wheels[3].roll.children[0].geometry);
  const g=a.wheels[0].roll.children[0].geometry,p=g.attributes.position;
  let vents=0;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))>.19&&Math.hypot(p.getY(i),p.getZ(i))<.28)vents++;
  assert(vents>0,'the dark radial hub detail must exist outside the hub, inside the tyre');
  assert(a.referenceBody.geometryTriangles<14500,'small native detail must stay in a bounded geometry budget');
 }finally{a.dispose();b.dispose();}
});
