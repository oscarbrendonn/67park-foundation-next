import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {prepareSeasideAsset89,seasideScale89} from '../island/seaside-scale-v89.js';
import {createBoatContacts,installBoatContacts} from '../island/boat-contacts.js';
import {patchBoatContacts} from './refresh-boat-contacts-integration.mjs';

const sea=9,group=new T.Group(),placements=[],snapshots=[],models=new Map();
const assets=['boatYellow','boatRose','boatBlue','sailRose','sailCream'];
for(const [i,asset]of assets.entries()){
 const b=fs.readFileSync(new URL('../island/lunapark-v1/'+asset+'.glb',import.meta.url));
 const source=prepareSeasideAsset89((await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,asset);
 const p={asset,water:true,x:200+i*15,z:-130,y:sea-.12*seasideScale89[asset][1],yaw:asset==='sailCream'?.22:asset==='sailRose'?-.28:0,scale:seasideScale89[asset]};
 placements.push(p);const transform=new T.Matrix4().compose(new T.Vector3(p.x,p.y,p.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw),new T.Vector3(1,1,1)),parts=[];
 source.traverse(o=>{
  if(!o.isMesh)return;
  const geometry=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(transform,o.matrixWorld));
  const mesh=new T.Mesh(geometry,o.material);mesh.name='LUNA77_'+asset;mesh.userData.sourceName=o.name;group.add(mesh);parts.push(mesh);
  snapshots.push({mesh,geometry,material:mesh.material,position:geometry.attributes.position.array.slice()});
  if(/^(hollow_hull|rounded_rim|recessed_cockpit_floor|seat_bench)/.test(o.name))assert(new T.Box3().setFromObject(o).max.y<=p.scale[1]*.8,'authored hull ceiling');
 });models.set(asset,parts);
}
group.updateMatrixWorld(true);
const contacts=createBoatContacts(group,placements);
const point=(p,x,z)=>({x:p.x+x*Math.cos(p.yaw)+z*Math.sin(p.yaw),z:p.z-x*Math.sin(p.yaw)+z*Math.cos(p.yaw)});

test('all five real boat floors support the avatar, rather than the sail top or seabed',()=>{
 for(const p of placements){
  const q=point(p,-.45,.3),floor=contacts.floor(q.x,q.z);
  assert(Math.abs(floor-(p.y+.29*p.scale[1]))<2e-5,JSON.stringify({p,q,floor}));
  const outside=point(p,2.1,0);assert.equal(contacts.floor(outside.x,outside.z),null);
  if(p.asset.startsWith('sail')){
   const mast=point(p,0,0);
   assert(contacts.obstacle(mast.x,mast.z,floor,.36)>p.y+7,'mast remains solid');
   const underSail=point(p,.12,.9);
   assert(contacts.floor(underSail.x,underSail.z)<p.y+1.5,'sail is not a raised walking floor');
  }
 }
});
test('sampled support agrees with the visible hull, floor, benches and rim, including their empty corners',()=>{
 const ray=new T.Raycaster();let count=0;
 for(const p of placements)for(let x=-1.95;x<=1.95;x+=.29)for(let z=-3.9;z<=3.9;z+=.29){
  const q=point(p,x,z);ray.set(new T.Vector3(q.x,sea+20,q.z),new T.Vector3(0,-1,0));
  const expected=ray.intersectObjects(models.get(p.asset),false).find(h=>h.point.y<=p.y+p.scale[1]*.8+1e-5)?.point.y??null;
  const actual=contacts.floor(q.x,q.z);
  if(expected===null)assert.equal(actual,null);else assert(Math.abs(actual-expected)<1e-5,JSON.stringify({asset:p.asset,x,z,actual,expected}));count++;
 }
 assert(count>1800);
});
test('installation makes real decks dry but preserves surrounding sea and unrelated contacts',()=>{
 const calls=[];let disposed=0;
 const world={lunapark:{group},renderer:{domElement:{dataset:{lunapark77:JSON.stringify({placements})}}},ground:(x,z,...args)=>{calls.push(args);return 2;},water:()=>true,sea:()=>sea,characterGround:()=>2,characterObstacle:()=>3,dispose(){disposed++;}};
 assert.equal(installBoatContacts(world),world);assert.equal(installBoatContacts(world),world);
 const p=placements.at(-1),q=point(p,-.45,.3),outside=point(p,2.1,0);
 assert(!world.water(q.x,q.z));assert(world.water(outside.x,outside.z));
 assert(world.ground(q.x,q.z)>sea);assert.equal(world.ground(0,0,true,true),2);assert.deepEqual(calls.at(-1),[true,true]);
 assert.equal(world.characterGround(0,0,2,.36),2);assert.equal(world.characterObstacle(0,0,2,.36),3);
 assert(world.characterGround(q.x,q.z,sea,.36)>sea);
 world.dispose();assert.equal(disposed,1);assert(world.boatContacts.stats.disposed);assert.equal(world.boatContacts.floor(q.x,q.z),null);
});
test('same geometry/material buffers and bounded contact index; no model or draw additions',()=>{
 for(const s of snapshots){assert.equal(s.mesh.geometry,s.geometry);assert.equal(s.mesh.material,s.material);assert.deepEqual(s.geometry.attributes.position.array,s.position);}
 assert.equal(contacts.stats.addedDrawCalls,0);assert.equal(contacts.stats.newAssetDownloads,0);
 assert(contacts.stats.estimatedNumericBytes<8*1024*1024);console.log('BOAT_CONTACTS',JSON.stringify(contacts.stats));
});
test('source and preserved bundle install boat support; updater is idempotent',()=>{
 for(const name of ['runtime.js','runtime.bundle.js']){
  const code=fs.readFileSync(new URL('../island/'+name,import.meta.url),'utf8');
  assert(code.includes('installBoatContacts(installRideContacts('));assert.equal(patchBoatContacts(code,{bundle:name.includes('bundle')}),code);
 }
});
