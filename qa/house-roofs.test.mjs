import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createHouseRoofSupports,installHouseRoofSupports,characterGround} from '../app/house-roof-support.js';

function fixture(){
 const scene=new T.Scene(),group=new T.Group();group.name='CENTRAL_BUILDINGS_V68';scene.add(group);
 const wall=new T.BoxGeometry(3,4,3).translate(0,2,0);
 const roof=new T.PlaneGeometry(4,4).rotateX(-Math.PI/2).rotateZ(.2).translate(0,4.6,0);
 for(const geometry of [wall,roof]){
  const mesh=new T.InstancedMesh(geometry,new T.MeshBasicMaterial(),2);
  mesh.setMatrixAt(0,new T.Matrix4());
  mesh.setMatrixAt(1,new T.Matrix4().compose(new T.Vector3(20,2,8),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2),new T.Vector3(2,1.5,2)));
  group.add(mesh);
 }
 return {scene,group};
}
test('source-matched sloped roofs reuse one index for differently scaled/rotated houses',()=>{
 const {scene}=fixture(),r=createHouseRoofSupports(scene);
 assert.equal(r.stats.houses,2);assert.equal(r.stats.assets,1);
 assert.equal(r.stats.addedDrawCalls,0);assert(r.stats.bytes<20000);
 for(const x of [-1.5,-1,0,1,1.5]){
  const y=4.6+x*Math.tan(.2);assert(Math.abs(r.sample(x,0).y-y)<1e-6);
  assert(Math.abs(r.ground(x,0,y+.5,.012,5,0)-y)<1e-6);
  const p=new T.Vector3(x,y,0).applyMatrix4(new T.Matrix4().compose(new T.Vector3(20,2,8),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2),new T.Vector3(2,1.5,2)));
  assert(Math.abs(r.sample(p.x,p.z).y-p.y)<1e-6);
 }
});
test('walls below roofs stay closed; rising feet must clear the eave before landing',()=>{
 const r=createHouseRoofSupports(fixture().scene),y=r.sample(-1,0).y;
 for(const feet of [0,.3,1,2,3,y-.1])assert.equal(r.ground(-1,0,feet,.012,5,0),5);
 assert(Math.abs(r.ground(-1,0,y+.01,.012,5,0)-y)<1e-6);
 assert.equal(r.ground(-1,0,NaN,.36,5,0),5);
 // Existing curbs, roads and barriers elsewhere are untouched.
 for(const base of [0,.18,.2512388229,8,null])assert.equal(r.ground(10,10,9,.36,base,0),base);
});
test('walking follows slopes, roofs can be left, and unrelated taller geometry is not hidden',()=>{
 const r=createHouseRoofSupports(fixture().scene),y=r.sample(0,0).y;
 assert(Math.abs(r.ground(.3,0,y,.36,5,0)-r.sample(.3,0).y)<1e-6);
 assert.equal(r.ground(2.1,0,5,.36,5,0),0,'No invisible old-box ledge after the eave');
 assert.equal(r.ground(2.1,0,0,.36,5,0),5,'Ground-level contact is not relaxed');
 assert.equal(r.ground(0,0,9,.36,12,0),12,'Other taller models retain their collision');
});
test('home interior replacement and restoration use the current ground hook',()=>{
 const {scene}=fixture(),original=(x,z)=>x<3?5:.25;
 const world={scene,ground:original,terrainGround:()=>0,renderer:{domElement:{dataset:{}}}};
 installHouseRoofSupports(world);assert.equal(world.ground,original);
 assert.equal(installHouseRoofSupports(world),world);
 world.ground=()=>70;assert.equal(characterGround(world,500,500,70),70);
 world.ground=original;assert.equal(characterGround(world,500,500,.25),.25);
 assert.equal(characterGround({ground:()=>2},0,0,2),2);
});
test('baked courtyard roof band excludes low facade detail without changing its roof',()=>{
 const scene=new T.Scene(),group=new T.Group();group.name='WEST_COURTYARD_V102';scene.add(group);
 for(const [height,y]of [[8,4],[.3,10]]){
  const mesh=new T.Mesh(new T.BoxGeometry(4,height,4).translate(0,y,0),new T.MeshBasicMaterial());
  mesh.userData.kind102='detail';group.add(mesh);
 }
 const west={group,buildingBounds:[{min:[-2,0,-2],max:[2,10.15,2],x:0,z:0,top:10.15}]};
 const r=createHouseRoofSupports(scene,{courtyard:west});
 assert.equal(r.stats.houses,1);assert.equal(r.stats.triangles,2,'Only the two roof-top triangles are indexed');
 assert(Math.abs(r.sample(0,0).y-10.15)<1e-6);
 assert(Math.abs(r.ground(0,0,10.3,.012,10.15,0)-10.15)<1e-6);
 assert.equal(r.ground(0,0,0,.36,10.15,0),10.15);
 assert.equal(r.ground(2.1,0,10.3,.36,10.15,0),0,'Baked roofs have no invisible eave apron either');
});
test('ordinary movement never performs a second terrain lookup for roofs',()=>{
 const r=createHouseRoofSupports(fixture().scene);let reads=0;
 const terrain=()=>{reads++;return 0;};
 for(let i=0;i<1000;i++)assert.equal(r.ground(10,10,0,.36,.25,terrain),.25);
 assert.equal(reads,0);
 assert.equal(r.ground(0,0,5,.36,5,terrain),r.sample(0,0).y);assert.equal(reads,1);
});
test('world disposal releases collision indices without disposing shared render geometry',()=>{
 const {scene,group}=fixture();let originalDisposals=0,geometryDisposals=0;
 for(const m of group.children)m.geometry.addEventListener('dispose',()=>geometryDisposals++);
 const world={scene,ground:()=>5,terrainGround:()=>0,renderer:{domElement:{dataset:{}}},dispose(){originalDisposals++;}};
 installHouseRoofSupports(world);const roofs=world.roofSupports;
 assert(roofs.sample(0,0));world.dispose();
 assert.equal(originalDisposals,1);assert.equal(geometryDisposals,0);
 assert.equal(roofs.sample(0,0),null);assert.equal(roofs.sites.length,0);assert(roofs.stats.disposed);
 assert.equal(world.characterGround(0,0,5),5);
});
test('an invalid optional roof cannot stop the lobby or replace its safe original walls',()=>{
 const {scene,group}=fixture();group.children[0].geometry=new T.BufferGeometry();
 const ground=()=>7,world={scene,ground,terrainGround:()=>0,renderer:{domElement:{dataset:{}}}};
 assert.doesNotThrow(()=>installHouseRoofSupports(world));
 assert.equal(world.ground,ground);assert.equal(world.characterGround,undefined);
 assert.equal(characterGround(world,0,0,10),7);assert(JSON.parse(world.renderer.domElement.dataset.houseRoofs).disabled);
});
test('both runtime entry points and walking/skate queries retain roof support',()=>{
 const source=fs.readFileSync(new URL('../island/runtime.js',import.meta.url),'utf8');
 const bundle=fs.readFileSync(new URL('../island/runtime.bundle.js',import.meta.url),'utf8');
 const movement=fs.readFileSync(new URL('../app/chunk-OZ77422N.js',import.meta.url),'utf8');
 assert(source.includes('installHouseRoofSupports(installIslandSwimBoundary(world))'));
 assert(bundle.includes('installHouseRoofSupports(await ll(options))'));
 assert(movement.includes('wasGrounded:u,ground:obstacleGround,supportGround:roofGround'));
 assert(movement.includes('characterObstacle(t,sx,sz'));
 assert(movement.includes('Math.max(b.y,previous??b.y)-ke.foot'));
  assert(movement.includes('characterGround(t,e.x,e.z,e.y-ke.foot)'));
  const fx=fs.readFileSync(new URL('../app/claude-gorilla-runtime.js',import.meta.url),'utf8');
  assert(fx.includes('p.characterGround?.(e,f,(x?.position?.y??NaN)-.555)'),'Roof landing effects use the same surface as the feet');
});
