import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';

// Test the published experiment, never the separate uncommitted game draft.
async function previewModule(name){
  const source=fs.readFileSync(new URL('../pet-play-preview/app/pets/'+name,import.meta.url),'utf8')
    .replace("from 'three'","from '"+new URL('../vendor/three.module.js',import.meta.url).href+"'")
    .replace('/67park-foundation-next/app/pets/pet-follow.js',new URL('../pet-play-preview/app/pets/pet-follow.js',import.meta.url).href)
    .replaceAll('/67park-foundation-next/app/pets/',new URL('../app/pets/',import.meta.url).href);
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const {createPetCompanion,PET_COMMANDS}=await previewModule('pet-commands.js');
const {createPetModels}=await previewModule('pet-model.js');
const {createPetToys}=await previewModule('pet-toys.js');
function fixture(kind,probe=()=>0){
  const pet=createPetCompanion(kind,probe),owner={x:0,y:0,z:0};
  const tick=seconds=>{for(let i=0;i<seconds*40;i++)pet.step(.025,owner,0);};
  tick(.5);return {pet,owner,tick,command:id=>pet.command(id,owner,0)};
}
for(const toy of ['ball','frisbee'])test('dog fetches and carries '+toy+' back to the owner',()=>{
  const {pet,owner,command}=fixture('dog');assert(command(toy).ok);
  const phases=new Set(),toyPhases=new Set();
  for(let i=0;i<650;i++){pet.step(.025,owner);phases.add(pet.state.phase);if(pet.state.toy)toyPhases.add(pet.state.toy.phase);}
  for(const p of ['throw','chase','pickup','return','drop','follow'])assert(phases.has(p),p);
  assert(toyPhases.has('carried'));assert.equal(pet.state.fetches,1);assert.equal(pet.state.toy,null);
  assert(!command('feather').ok);
});
for(const toy of ['ball','feather'])test('cat '+toy+' uses hunting poses and NEVER picks up or returns a toy',()=>{
  const {pet,owner,command}=fixture('cat');assert(command(toy).ok);
  const phases=new Set(),poses=new Set(),sides=new Set();let rollCount=0,previous='';
  for(let i=0;i<800;i++){
    pet.step(.025,owner);const s=pet.state;phases.add(s.phase);poses.add(s.pose);
    assert(!['throw','pickup','return','drop'].includes(s.phase));assert.notEqual(s.toy?.phase,'carried');assert.equal(s.fetches,0);
    if(s.pose==='swat')sides.add(s.playSide);
    if(s.phase==='roll'&&previous!=='roll')rollCount++;
    if(s.toy?.kind==='ball')assert(Math.abs(s.toy.position.y-.065)<.00001,'Small ball rolls on the ground');
    previous=s.phase;
  }
  for(const pose of ['stalk','pounce','swat'])assert(poses.has(pose),pose);
  assert.deepEqual([...sides].sort(),[-1,1]);
  if(toy==='ball'){for(const p of ['roll-out','stalk','chase','pounce','bat','roll','watch','follow'])assert(phases.has(p),p);assert.equal(rollCount,3);}
  assert.equal(pet.state.command,'follow');assert.equal(pet.state.toy,null);assert(!command('frisbee').ok);
});
test('cat batting checks the entire roll corridor and can be interrupted by Sit',()=>{
  let obstacle=false;
  const {pet,owner,command}=fixture('cat',(x,z)=>obstacle&&z>3.05?null:0);assert(command('ball').ok);
  for(let i=0;i<400;i++){
    pet.step(.025,owner);if(pet.state.phase==='bat')obstacle=true;
    if(pet.state.toy)assert(pet.state.toy.position.z<=3.05);
    if(pet.state.phase==='roll'){assert(command('sit').ok);break;}
  }
  assert.equal(pet.state.phase,'hold');assert.equal(pet.state.pose,'sit');assert.equal(pet.state.toy,null);assert.equal(pet.state.ownerAction,'');
});
test('species-specific labels describe the different ball actions',()=>{
  const ball=PET_COMMANDS.find(c=>c.id==='ball');assert.equal(ball.label,'Fetch ball');assert.equal(ball.catLabel,'Roll & chase ball');
  const source=fs.readFileSync(new URL('../pet-play-preview/app/pets/pet-controls.js',import.meta.url),'utf8');
  assert.match(source,/s.kind==='cat'\?\(item.catLabel\|\|item.label\)/);
});
test('cat pounce is a visible rig change, paws alternate, reduced motion removes the hop; no new geometry',()=>{
  const factory=createPetModels({shadows:false}),cat=factory.create('cat',{scale:1});
  const bones=Object.fromEntries(cat.mesh.skeleton.bones.map(b=>[b.name,b]));
  const original=cat.mesh.geometry.attributes.position.array.slice(),budget=factory.stats();
  for(let i=0;i<30;i++)cat.update(1/60,{pose:'stalk',autoSit:false,reducedMotion:true});
  const crouch=bones.body.position.y;assert(crouch<.40);
  let peak=0;
  for(let i=0;i<24;i++){cat.update(1/60,{pose:'pounce',actionTime:i/60,autoSit:false});peak=Math.max(peak,bones.body.position.y);}
  assert(peak>.53,'Pounce must change the actual rig, not only its pose label');assert(peak-crouch>.13);
  for(const side of [1,-1]){
    for(let i=0;i<60;i++)cat.update(1/60,{pose:'idle',autoSit:false,reducedMotion:true});
    for(let i=0;i<20;i++)cat.update(1/60,{pose:'swat',actionTime:.24,playSide:side,autoSit:false});
    const active=side===1?bones.frontR:bones.frontL,other=side===1?bones.frontL:bones.frontR;
    assert(active.rotation.x<other.rotation.x-.70,'Only the selected paw reaches forward');
  }
  for(let i=0;i<120;i++)cat.update(1/60,{pose:'pounce',actionTime:.2,autoSit:false,reducedMotion:true});
  assert.equal(bones.body.position.y,.47,'No decorative hop with reduced motion');
  cat.root.updateMatrixWorld(true);cat.mesh.skeleton.update();const point=new T.Vector3();
  for(let i=0;i<cat.mesh.geometry.attributes.position.count;i++){
    point.fromBufferAttribute(cat.mesh.geometry.attributes.position,i);cat.mesh.applyBoneTransform(i,point);assert(point.toArray().every(Number.isFinite));
  }
  for(const b of cat.mesh.skeleton.bones)if(b.name!=='eyes')assert.deepEqual(b.scale.toArray(),[1,1,1]);
  assert.deepEqual(cat.mesh.geometry.attributes.position.array,original);assert.deepEqual(factory.stats(),budget);factory.dispose();
});
test('rolling cat ball is smaller and rotates without allocating a second toy kit',()=>{
  const scene=new T.Scene(),kit=createPetToys(scene),count=kit.root.children.length;
  const toy={kind:'ball',phase:'rolling',radius:.065,position:{x:0,y:.065,z:0}};
  kit.update(toy);const mesh=kit.root.children.find(o=>o.visible),q=mesh.quaternion.clone();
  toy.position.z=.12;kit.update(toy);assert(mesh.quaternion.angleTo(q)>1);assert.equal(mesh.scale.x,.065/.09);
  assert.equal(kit.root.children.length,count);kit.update(null);assert(!kit.root.visible);kit.dispose();assert.equal(scene.children.length,0);
});
test('dog carry contact follows the animated mouth in world space',()=>{
  const factory=createPetModels({shadows:false}),dog=factory.create('dog',{scale:.48});
  dog.root.position.set(2,3,4);dog.root.rotation.y=1.2;
  dog.update(.025,{speed:2.8,autoSit:false});const point=dog.contactPoint('carry').clone();
  const head=dog.root.getObjectByName('head'),expected=new T.Vector3(0,-.10,.39);head.localToWorld(expected);
  assert(point.distanceTo(expected)<1e-8);dog.root.position.x+=1;
  assert(Math.abs(dog.contactPoint('carry').x-point.x-1)<1e-8);factory.dispose();
});
