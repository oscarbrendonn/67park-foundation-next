import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';

// Exercise the isolated preview itself, not the unpublished main-game draft.
const modelURL=new URL('../pet-play-preview/app/pets/pet-model.js',import.meta.url);
const code=fs.readFileSync(modelURL,'utf8')
  .replace("from 'three'","from '"+new URL('../vendor/three.module.js',import.meta.url).href+"'")
  .replaceAll('/67park-foundation-next/app/pets/',new URL('../app/pets/',import.meta.url).href);
const {createPetModels}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

function floors(pet){
  pet.root.updateMatrixWorld(true);pet.mesh.skeleton.update();
  const geometry=pet.mesh.geometry,result={},v=new T.Vector3();
  for(let i=0;i<geometry.attributes.position.count;i++){
    const name=pet.mesh.skeleton.bones[geometry.attributes.skinIndex.getX(i)].name;
    v.fromBufferAttribute(geometry.attributes.position,i);pet.mesh.applyBoneTransform(i,v);
    assert(v.toArray().every(Number.isFinite));result[name]=Math.min(result[name]??Infinity,v.y);
  }
  return result;
}
const tick=(pet,pose,seconds=1)=>{for(let i=0;i<60*seconds;i++)pet.update(1/60,{pose,autoSit:false,reducedMotion:true});};

for(const kind of ['dog','cat'])test(kind+': Sit visibly seats the rump with planted paws; Follow stands again',()=>{
  const factory=createPetModels({shadows:false}),pet=factory.create(kind,{scale:1});
  const bones=Object.fromEntries(pet.mesh.skeleton.bones.map(b=>[b.name,b]));
  const position=pet.mesh.geometry.attributes.position.array.slice(),budget=factory.stats();
  tick(pet,'idle',6);const standing=floors(pet);
  assert.equal(pet.stats.pose,'idle','Waiting for a command must not silently sit');
  assert.equal(Math.abs(bones.body.rotation.x),0);
  for(let i=0;i<60;i++){
    pet.update(1/60,{pose:'sit',autoSit:false,reducedMotion:true});
    const f=floors(pet);
    for(const name of ['frontL','frontR','backL','backR'])assert(f[name]>=0&&f[name]<.04,'Paw stays planted during transition: '+name);
    assert(f.body>=0,'Rump must not sink through the ground');
  }
  const seated=floors(pet);
  assert.equal(pet.stats.pose,'sit');assert(bones.body.rotation.x<-.54,'Chest must be clearly upright');
  assert(standing.body-seated.body>.10,'Rump must visibly descend');
  assert(seated.body>.015&&seated.body<.05,'Rump close to ground, not a standing crouch');
  assert(Math.abs(bones.body.rotation.x+bones.head.rotation.x)<.002,'Head remains level');
  tick(pet,'sit',3);assert.equal(pet.stats.pose,'sit');
  tick(pet,'idle',2);assert.equal(pet.stats.pose,'idle');assert(Math.abs(bones.body.rotation.x)<.0001);
  for(const b of pet.mesh.skeleton.bones)assert.deepEqual(b.scale.toArray(),[1,1,1]);
  assert.deepEqual(pet.mesh.geometry.attributes.position.array,position,'Do not distort or regenerate the sculpt');
  assert.deepEqual(factory.stats(),budget,'No extra meshes/textures/draw calls');factory.dispose();
});

test('local command controller disables only its renderer auto-sit',()=>{
  const source=fs.readFileSync(new URL('../pet-play-preview/app/pets/park-pets.js',import.meta.url),'utf8');
  assert.match(source,/autoSit:!behavior/);
});

test('Follow releases a long Sit without immediately falling into automatic rest',async()=>{
  const source=fs.readFileSync(new URL('../pet-play-preview/app/pets/pet-commands.js',import.meta.url),'utf8')
    .replaceAll('/67park-foundation-next/app/pets/',new URL('../app/pets/',import.meta.url).href);
  const {createPetCompanion}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  for(const kind of ['dog','cat']){
    const pet=createPetCompanion(kind,()=>0),owner={x:0,y:0,z:0};
    const step=seconds=>{for(let i=0;i<seconds*40;i++)pet.step(.025,owner,0);};
    step(6);assert(pet.command('sit',owner).ok);step(15);assert.equal(pet.state.pose,'sit');
    assert(pet.command('follow',owner).ok);step(1);assert.equal(pet.state.pose,'idle');assert.equal(pet.state.phase,'follow');
  }
});
