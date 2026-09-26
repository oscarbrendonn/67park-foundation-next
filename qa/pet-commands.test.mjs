import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPetCompanion} from '../app/pets/pet-commands.js';
import {createPetModels} from '../app/pets/pet-model.js';
import {createParkPets} from '../app/pets/park-pets.js';
import {createPetToys} from '../app/pets/pet-toys.js';
import {queuePetOwnerPose} from '../app/pets/pet-owner-pose.js';

function fixture(kind='dog',probe=()=>0){
  const pet=createPetCompanion(kind,probe),owner={x:0,y:0,z:0};
  const tick=(seconds,options)=>{for(let i=0;i<seconds*40;i++)pet.step(.025,owner,0,options);};
  tick(.5);return {pet,owner,tick,command:id=>pet.command(id,owner,0)};
}
test('come, stay, sit, lie and follow have separate interruptible behavior',()=>{
  for(const kind of ['dog','cat']){
    const {pet,owner,tick,command}=fixture(kind);
    for(const id of ['stay','sit','lie']){
      assert(command(id).ok);const p={...pet.follow.state};owner.z+=3;tick(2);
      assert.equal(pet.state.phase,'hold');assert.equal(pet.follow.state.x,p.x);assert.equal(pet.follow.state.z,p.z);
      assert.equal(pet.state.pose,id==='stay'?'idle':id);
    }
    assert(command('come').ok);tick(8);assert.equal(pet.state.command,'follow');assert(Math.hypot(pet.follow.state.x-owner.x,pet.follow.state.z-owner.z)<2);
    command('lie');tick(.5);command('follow');owner.z+=2;tick(4);assert.equal(pet.state.phase,'follow');
  }
});
test('dog fetch flies, picks up, returns, drops and cleans up both toys',()=>{
  for(const toy of ['ball','frisbee']){
    const {pet,tick,command}=fixture();assert(command(toy).ok);const phases=new Set(),toyPhases=new Set();
    for(let i=0;i<650;i++){pet.step(.025,{x:0,y:0,z:0},0);phases.add(pet.state.phase);if(pet.state.toy)toyPhases.add(pet.state.toy.phase);}
    for(const phase of ['throw','chase','pickup','return','drop','follow'])assert(phases.has(phase),phase);
    for(const phase of ['flying','carried','ground'])assert(toyPhases.has(phase),phase);
    assert.equal(pet.state.fetches,1);assert.equal(pet.state.toy,null);
    tick(.4);assert(command('ball').ok);tick(.3);assert(command('stay').ok);tick(2);assert.equal(pet.state.toy,null);assert.equal(pet.state.phase,'hold');
  }
});
test('cat stalks, pounces and swats a ball or feather; species commands stay distinct',()=>{
  for(const toy of ['ball','feather']){
    const {pet,command}=fixture('cat');assert(command(toy).ok);const poses=new Set();
    for(let i=0;i<700;i++){pet.step(.025,{x:0,y:0,z:0},0);poses.add(pet.state.pose);}
    for(const pose of ['stalk','pounce','swat'])assert(poses.has(pose),toy+' '+pose);
    assert.equal(pet.state.toy,null);assert.equal(pet.state.command,'follow');
    assert(!command('frisbee').ok);
  }
  const {command}=fixture('dog');assert(!command('feather').ok);
});
test('care approaches before animation; rubbing, eating and paw respond then release',()=>{
  for(const kind of ['cat','dog'])for(const action of ['pet','paw','treat']){
    const {pet,owner,tick,command}=fixture(kind);assert(command(action).ok);const poses=new Set(),owners=new Set();
    for(let i=0;i<240;i++){pet.step(.025,owner,0);poses.add(pet.state.pose);owners.add(pet.state.ownerAction);}
    assert(poses.has(action==='pet'?(kind==='cat'?'rub':'happy'):action==='paw'?'paw':'eat'));
    assert(owners.has(action));assert.equal(pet.state.ownerAction,'');assert.equal(pet.state.toy,null);
    tick(.3);command(action);tick(.3);owner.x+=2;tick(.2);assert.equal(pet.state.phase,'follow');
  }
});
test('throws stop before walls/water, blocked care times out, teleports/minigames clear actions',()=>{
  const {pet,owner,tick,command}=fixture('dog',(x,z)=>z>2.3?null:0);
  assert(command('ball').ok);assert(pet.state.toy.target.z<2.3);tick(12);assert.equal(pet.state.fetches,1);
  tick(.5);command('sit');tick(.5);owner.x=50;tick(.1);assert.equal(pet.state.phase,'follow');assert(Math.abs(pet.follow.state.x-50)<2);
  const blocked=fixture('dog',(x,z)=>z>.5?null:0);assert(!blocked.command('ball').ok);assert.equal(blocked.pet.state.toy,null);
  blocked.command('pet');blocked.tick(25);assert.equal(blocked.pet.state.phase,'follow');
  assert(!pet.command('javascript:bad',owner,0).ok);assert(!pet.command('sit',{x:NaN,y:0,z:0},0).ok);
});
test('idle owner rests beside the pet, movement wakes it, no command pushes the owner',()=>{
  const {pet,owner,tick}=fixture('cat');tick(12);assert.equal(pet.state.pose,'lie');
  owner.z+=1;tick(.1);assert.equal(pet.state.pose,'idle');tick(4,{resting:true});assert.equal(pet.state.pose,'lie');
  assert.deepEqual(owner,{x:0,y:0,z:1});
});
test('new poses retain finite unit-weight meshes, planted lying paws and shared resource budget',()=>{
  const factory=createPetModels({shadows:false}),v=new T.Vector3();
  for(const kind of ['cat','dog']){
    const pet=factory.create(kind,{scale:1}),g=pet.mesh.geometry,before=factory.stats();
    for(const pose of ['lie','paw','stalk','pounce','swat','rub','eat','happy']){
      for(let i=0;i<120;i++)pet.update(1/60,{pose,actionTime:i/60,happy:1});
      assert.equal(pet.stats.pose,pose);pet.root.updateMatrixWorld(true);pet.mesh.skeleton.update();let min=Infinity;
      for(let i=0;i<g.attributes.position.count;i++){
        v.fromBufferAttribute(g.attributes.position,i);pet.mesh.applyBoneTransform(i,v);assert(v.toArray().every(Number.isFinite));
        const bone=pet.mesh.skeleton.bones[g.attributes.skinIndex.getX(i)].name;
        if(pose==='lie'&&/^(front|back)/.test(bone))min=Math.min(min,v.y);
      }
      if(pose==='lie')assert(min>=0&&min<.04,'lying paws grounded: '+min);
    }
    for(let i=0;i<120;i++)pet.update(1/60,{pose:'rub',reducedMotion:true});assert.equal(pet.mesh.skeleton.bones[0].rotation.z,0);
    assert.deepEqual(factory.stats(),before);pet.dispose();
  }factory.dispose();
});
test('toy geometry is reused and fully disposed; wand never has a zero quaternion',()=>{
  const scene=new T.Scene(),toys=createPetToys(scene);let disposal=0;
  for(const mesh of toys.root.children)mesh.geometry.addEventListener('dispose',()=>disposal++);
  const count=toys.root.children.length;
  for(let i=0;i<100;i++)toys.update({kind:'feather',position:{x:1,y:.2,z:2},from:{x:0,y:.8,z:0}});
  assert.equal(toys.root.children.length,count);for(const m of toys.root.children)assert(m.quaternion.toArray().every(Number.isFinite));
  toys.update(null);assert.equal(toys.root.visible,false);toys.dispose();assert.equal(scene.children.length,0);assert.equal(disposal,count);
});
test('integrated commands clear on pet change and map travel without leaking toy resources',()=>{
  const world={ready:true,scene:new T.Scene(),ground:()=>0,water:()=>false,treeBlocked:()=>false};
  const body={translation:()=>({x:0,y:.555,z:0})},pets=createParkPets({world:()=>world,net:()=>null});
  pets.select('dog');for(let i=0;i<80;i++)pets.step(body,.025,'city');assert(pets.command('ball').ok);
  pets.step(body,.025,'city');assert(pets.debug().toyVisible);pets.select('cat');pets.step(body,.025,'city');assert(!pets.debug().toyVisible);
  for(let i=0;i<40;i++)pets.step(body,.025,'city');pets.command('feather');for(let i=0;i<120;i++)pets.step(body,.025,'city');
  pets.step(body,.025,'cloud');assert(!pets.debug().active);assert(!pets.debug().toyVisible);assert.equal(pets.debug().local.behavior.command,'follow');
  pets.dispose();assert.equal(world.scene.children.length,0);pets.select('');
});
test('owner care overlay never scales bones and restores a paused skeleton after release',()=>{
  const scene=new T.Scene(),root=new T.Group(),spine=new T.Bone(),upper=new T.Bone(),lower=new T.Bone(),hand=new T.Bone();
  spine.name='Spine1';upper.name='BiscepR';lower.name='ArmR';hand.name='HandR';root.add(spine);spine.add(upper);upper.add(lower);lower.add(hand);lower.position.set(0,-.3,0);hand.position.set(0,-.25,0);scene.add(root);
  const before=[spine,upper,lower,hand].map(b=>b.quaternion.toArray());
  for(let i=0;i<50;i++){queuePetOwnerPose(root,{action:'pet',time:i*.025,heading:0,point:{x:.4,y:-.5,z:.7}},.025);scene.onBeforeRender();}
  assert(root.userData.petCare.active);for(const b of [spine,upper,lower,hand])assert.deepEqual(b.scale.toArray(),[1,1,1]);
  queuePetOwnerPose(root,null,.025);scene.onBeforeRender();assert.deepEqual([spine,upper,lower,hand].map(b=>b.quaternion.toArray()),before);
});
test('care approaches the rig right side and head contact tracks the animated sculpt',()=>{
  const {pet,command,tick}=fixture();assert.equal(pet.state.completed,0);command('pet');tick(2);
  assert(pet.follow.state.x<-.28&&pet.follow.state.x>-.35);assert(pet.follow.state.z<.37);
  const factory=createPetModels({shadows:false}),cat=factory.create('cat',{scale:.48});
  cat.root.position.set(2,3,4);cat.root.rotation.y=.8;
  const original=cat.contactPoint('pet').clone();
  for(let i=0;i<30;i++)cat.update(.025,{pose:'rub',actionTime:i*.025});
  const rubbed=cat.contactPoint('pet').clone();assert(rubbed.distanceTo(original)>.005);assert(rubbed.toArray().every(Number.isFinite));factory.dispose();
});
test('float32 authored spine keys do not accumulate lean across a long play or after release',()=>{
  const scene=new T.Scene(),root=new T.Group(),spine=new T.Bone();spine.name='Spine1';root.add(spine);scene.add(root);
  spine.quaternion.set(.01688697375357151,0,0,.9998573660850525);const base=spine.quaternion.clone();let settled;
  for(let i=0;i<400;i++){
    queuePetOwnerPose(root,{action:'feather',time:i*.025,heading:0,point:{x:0,y:0,z:0}},.025);scene.onBeforeRender();
    if(i===20)settled=spine.quaternion.clone();if(i>20)assert(spine.quaternion.angleTo(settled)<1e-6,'lean does not accumulate');
  }
  queuePetOwnerPose(root,null,.025);scene.onBeforeRender();assert.deepEqual(spine.quaternion.toArray(),base.toArray());
});
