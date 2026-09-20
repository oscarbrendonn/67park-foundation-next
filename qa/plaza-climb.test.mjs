import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCityHeightSampler58} from '../island/city-height-sampler58.js';
import {createPlazaClimbSupports} from '../app/plaza-climb-support.js';
import {resolveCharacterContact} from '../app/character-contact.js';
import fs from 'node:fs';

// Exercise the exact walking resolver used by zn(), with the real plaza
// support and obstacle queries rather than a hand-written floor approximation.
const movement=fs.readFileSync(new URL('../app/chunk-OZ77422N.js',import.meta.url),'utf8');
const walkBegin=movement.indexOf('var ke=Object.freeze'),walkEnd=movement.indexOf('f();function nt(',walkBegin);
assert(walkBegin>0&&walkEnd>walkBegin,'Ground movement source anchor changed');
const walk=Function(movement.slice(walkBegin,walkEnd)+';return tt;')();
function fixture(){
 const scene=new T.Scene(),group=new T.Group();group.name='LOWER_PLAZA_V83';scene.add(group);
 group.userData.plaza83={cx:0,cz:0,ground:0,pad:[-20,-20,20,20],shops:[{id:'A',x:0,z:0,yaw:0,width:4,depth:4,height:11}],
  colliders:[{kind:'box',x:0,z:0,w:4.5,d:4.5,yaw:0,top:11,label:'shop A'},{kind:'circle',x:8,z:0,r:1.5,top:3.8,label:'flower planter'}]};
 const material=new T.MeshBasicMaterial();
 const put=(name,geo)=>{const m=new T.Mesh(geo,material);m.name=name;group.add(m);return m;};
 put('PLAZA83_WALKABLE_GROUND',new T.PlaneGeometry(24,24).rotateX(-Math.PI/2));
 put('PLAZA83_porcelain',new T.BoxGeometry(4,11,4).translate(0,5.5,0));
 put('PLAZA83_roof',new T.PlaneGeometry(8,8).rotateX(-Math.PI/2).translate(0,11.1,0));
 put('PLAZA83_rose',new T.PlaneGeometry(4,2).rotateX(-Math.PI/2).translate(0,2.8,3.4));
 put('PLAZA83_leaf',new T.SphereGeometry(1.2,16,12).translate(8,1.5,0));
 for(const x of [-1,1])put('PLAZA83_edge',new T.BoxGeometry(1.4,.2,.4).translate(x,8.85,2.2));
 scene.updateMatrixWorld(true);return {scene,group,material};
}
test('layered sampler cache keys include ceiling and retain the default highest surface',()=>{
 const {group}=fixture(),r=createCityHeightSampler58(group.children);
 assert(Math.abs(r.height(0,3.3)-11.1)<1e-5);
 assert(Math.abs(r.height(0,3.3,3)-2.8)<1e-5);
 assert(Math.abs(r.height(0,3.3,1))<1e-8);
 assert(Math.abs(r.height(0,3.3)-11.1)<1e-5);
 assert.equal(r.height(50,50),null);
});
test('plaza keeps roofs solid from below, but canopies have distinct upper and lower floors',()=>{
 const r=createPlazaClimbSupports(fixture().scene);
 for(const feet of [0,1,2,6,10])assert(r.ground(0,0,feet,.012,11)>11);
 assert(Math.abs(r.ground(0,3.3,0,.36,0))<1e-8);
 assert(Math.abs(r.ground(0,3.3,2.9,.012,0)-2.8)<1e-5);
 assert(Math.abs(r.ground(0,3.3,11.2,.012,0)-11.1)<1e-5);
 assert.equal(r.ground(0,0,70,.36,70),70,'Home replacement floor is not hidden');
});
test('foliage support follows the rounded mesh, not the old floating planter box',()=>{
 const r=createPlazaClimbSupports(fixture().scene);
 const peak=r.ground(8,0,0,.36,3.8),shoulder=r.ground(8.7,0,0,.36,3.8);
 assert(Math.abs(peak-2.7)<1e-4);assert(shoulder<peak-.1&&shoulder>2);
 assert.equal(r.ground(17,17,0,.36,.25),.25,'No invisible padding beyond actual paving');
 assert.equal(r.ground(30,30,0,.36,8),8);
 assert.equal(r.ground(8,0,NaN,.36,3.8),3.8);
});
test('visible window caps and their rotated collision surfaces agree and dispose cleanly',()=>{
 const {scene,group,material}=fixture();let materialDisposals=0;material.addEventListener('dispose',()=>materialDisposals++);
 const r=createPlazaClimbSupports(scene),caps=group.getObjectByName('PLAZA83_CLIMB_WINDOW_CAPS');
 assert.equal(caps.count,4);assert.equal(r.stats.addedDrawCalls,1);assert.equal(r.stats.newAssetDownloads,0);
 const ray=new T.Raycaster(new T.Vector3(1,10,2.65),new T.Vector3(0,-1,0));
 const hit=ray.intersectObject(caps,false)[0];assert(hit);assert(Math.abs(hit.point.y-r.sample(1,2.65,10).point.y)<.0001);
 assert(r.ground(1,2.65,5.1,.012,0)<6,'An overhead sill is not vertical support during descent');
 assert(r.obstacleGround(1,2.65,5.1,.012,0)>6,'The same sill remains a horizontal torso blocker');
 assert(r.ground(1,2.65,6.05,.012,0)>6,'Descending from above the sill still lands on its rendered cap');
 assert(Math.abs(r.ground(1,2.65,0,.36,0))<1e-6,'Normal head clearance below the sill stays open');
 r.dispose();assert.equal(group.getObjectByName('PLAZA83_CLIMB_WINDOW_CAPS'),undefined);assert.equal(materialDisposals,0);
 assert.equal(r.sample(1,2.65),null);assert.equal(r.ground(1,2.65,9,.36,12),12);
});
test('contact resolver keeps a descending body below a cap airborne, then lands from above',()=>{
 const r=createPlazaClimbSupports(fixture().scene),x=1,z=2.65,foot=.555;
 const descend=(feet,toY)=>resolveCharacterContact(walk,{from:{x,y:feet+foot,z},to:{x,y:toY,z},velocity:{x:0,y:-.4,z:0},wasGrounded:false,
  ground:()=>r.obstacleGround(x,z,feet,.36,0),supportGround:()=>r.ground(x,z,feet,.36,0)});
 const under=descend(5.1,5.5);
 assert.equal(under.grounded,false);assert.equal(under.vertical,-.4);assert(Math.abs(under.position.y-5.5)<1e-6,'The horizontal cap must not snap an airborne body upward');
 const landing=descend(6.05,6.45),cap=r.ground(x,z,6.05,.36,0);
 assert(landing.grounded);assert.equal(landing.vertical,0);assert(Math.abs(landing.position.y-(cap+foot))<1e-6,'A genuine descent from above still lands on the rendered cap');
 r.dispose();
});
test('compact plaza index retains sub-millimetre agreement with full precision',()=>{
 const {group}=fixture(),full=createCityHeightSampler58(group.children),compact=createCityHeightSampler58(group.children,{precision:'float32'});
 for(let x=-3.9;x<10;x+=.17)for(let z=-3.9;z<4;z+=.17){const a=full.height(x,z),b=compact.height(x,z);assert(a===null?b===null:Math.abs(a-b)<.001);}
 assert(compact.stats.bytes<full.stats.bytes*.6);
});
