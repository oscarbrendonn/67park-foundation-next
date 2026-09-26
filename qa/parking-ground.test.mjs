import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {finishParkingGround} from '../app/parking-ground-finish.js';
import {installParkedFleet} from '../app/parked-fleet.js';
import {finishSportsStands} from '../app/sports-stand-finish.js';
import {patchParkingGroundBundle} from './refresh-parking-ground-bundle.mjs';
const bytes=fs.readFileSync(new URL('../island/northwest-sports-v97.glb',import.meta.url));
async function fixture(){
 const {scene:group}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let metadata;group.traverse(o=>{if(o.userData.sports97)metadata=o.userData.sports97;});
 finishSportsStands(group,metadata);
 const terrain=new T.Group(),m=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial());m.name='5_KB_SPOR_ZEMIN';terrain.add(m);
 const runtime=fs.readFileSync(new URL('../island/runtime.js',import.meta.url),'utf8');
 const govde=runtime.match(/const UST_PAD_GLSL=`([\s\S]*?)`;/)[1];
 m.material.userData.sahaCizgi67List=[{anahtar:'ust-pad',govde}];
 return {group,metadata,terrain,entry:m.material.userData.sahaCizgi67List[0],govde};
}
test('retires only floating slab and parking tint; drops markers/stops without any X/Z edits',async()=>{
 const {group,metadata,terrain,entry,govde}=await fixture(),saved=[];
 group.traverse(m=>{if(m.isMesh)saved.push({m,g:m.geometry,p:m.geometry.attributes.position.array.slice(),n:m.geometry.attributes.normal.array.slice(),mat:m.material});});
 const result=finishParkingGround(group,metadata,terrain);
 assert.equal(result.drop,.13);assert.equal(finishParkingGround(group,metadata,terrain),result);
 const changed=saved.filter(s=>s.m.geometry!==s.g);assert.deepEqual(changed.map(s=>s.m.name).sort(),['SPORTS97_FLOOR_SPORTS97_line','SPORTS97_SOLID_SPORTS97_edge']);
 assert.equal(group.getObjectByName('SPORTS97_FLOOR_SPORTS97_paving'),undefined);
 let moved=0;
 for(const s of saved){
  assert.equal(s.m.material,s.mat);const p=s.m.geometry.attributes.position.array;
  assert.deepEqual(s.m.geometry.attributes.normal.array,s.n);
  for(let i=0;i<p.length;i+=3){
   assert.equal(p[i],s.p[i]);assert.equal(p[i+2],s.p[i+2]);
   if(p[i+1]!==s.p[i+1]){assert(Math.abs(p[i+1]-s.p[i+1]+.13)<1e-7);assert(s.p[i]>-43.251&&s.p[i]<-14.749&&s.p[i+2]>-34.801&&s.p[i+2]<-14.799);moved++;}
  }
 }
 assert(moved>100);assert.equal(entry.govde,govde.replace('+(1.0-smoothstep(1.6,2.2,ud2_67))',''));
 assert.equal(result.stats.extraDrawCalls,0);assert.equal(result.stats.extraTextures,0);
 result.restore();assert.equal(entry.govde,govde);for(const s of saved)assert.equal(s.m.geometry,s.g);
 assert(group.getObjectByName('SPORTS97_FLOOR_SPORTS97_paving'));assert(!group.userData.parkingGroundFinish);
});
test('shared fleet keeps all eight XZ positions and colors and rests on new ground level',async()=>{
 const {group,metadata,terrain}=await fixture();finishParkingGround(group,metadata,terrain);const fleet=installParkedFleet(group);
 assert.equal(fleet.stats.cars,8);assert.equal(fleet.stats.draws,13);assert.equal(fleet.root.position.y,-.13);
 assert.equal(fleet.root.position.x,0);assert.equal(fleet.root.position.z,0);assert.equal(fleet.stats.removedTriangles,30880);
 assert.equal(fleet.stats.removedVertices,18024,'includes orphan vertices left by the preceding stand finish');
 assert.equal(fleet.stats.removedAttributeBytes,432576);
 group.userData.parkingGroundFinish.restore();assert.equal(fleet.root.position.y,0);
});
test('source changes fail closed and bundle patch is bounded/idempotent',async()=>{
 const {group,metadata,terrain,entry}=await fixture(),floor=group.getObjectByName('SPORTS97_FLOOR_SPORTS97_paving'),parent=floor.parent;entry.govde='unexpected';
 assert.throws(()=>finishParkingGround(group,metadata,terrain));assert(floor.parent===parent);assert(!group.userData.parkingGroundFinish);
 const bundle=fs.readFileSync(new URL('../island/runtime.bundle.js',import.meta.url),'utf8');assert.equal(patchParkingGroundBundle(bundle),bundle);assert(bundle.includes('__parkingGroundFinish(l,a,s)'));
});
