import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {finishSportsStands} from '../app/sports-stand-finish.js';
import {createCityHeightSampler58} from '../island/city-height-sampler58.js';
const bytes=fs.readFileSync(new URL('../island/northwest-sports-v97.glb',import.meta.url));
const load=async()=>{
 const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let meta;scene.traverse(o=>{if(o.userData.sports97)meta=o.userData.sports97;});return {scene,meta};
};
const meshes=scene=>{const out=[];scene.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
const localPoint=(s,origin,x,y,z)=>new T.Vector3(s.x-origin[0]+Math.cos(s.yaw)*x+Math.sin(s.yaw)*z,y,s.z-origin[1]-Math.sin(s.yaw)*x+Math.cos(s.yaw)*z);

test('four supported rails and closed east rear preserve render budget and all floor assets',async()=>{
 const {scene,meta}=await load(),before=meshes(scene),saved=before.map(m=>({m,geometry:m.geometry,material:m.material,positions:m.geometry.attributes.position.array.slice(),normals:m.geometry.attributes.normal.array.slice()}));
 const result=finishSportsStands(scene,meta);assert.equal(result.stats.rails,4);assert.equal(result.stats.supports,14);assert.equal(result.stats.extraDrawCalls,0);assert.equal(result.stats.extraTextures,0);
 assert.equal(finishSportsStands(scene,meta),result);assert.deepEqual(meshes(scene),before);
 let triangles=0;for(const old of saved){
  const g=old.m.geometry;assert.equal(old.m.material,old.material);triangles+=g.index.count/3;
  assert.deepEqual(g.attributes.position.array.slice(0,old.positions.length),old.positions);
  assert.deepEqual(g.attributes.normal.array.slice(0,old.normals.length),old.normals);
  for(const a of Object.values(g.attributes))assert(a.array.every(Number.isFinite));
  if(old.m.userData.sportsFloor||!/_SOLID_SPORTS97_(shell|edge|cream)$/.test(old.m.name))assert.equal(g,old.geometry);
 }
 assert(triangles<=180000,'Keep the existing district triangle limit');assert.equal(triangles,178069);
});

test('every support meets an actual tread; interior aisles keep their old walk surfaces',async()=>{
 const {scene,meta}=await load(),original=createCityHeightSampler58(meshes(scene)),oldSamples=[];
 for(const s of meta.stands)for(const x of [-s.w*.17,s.w*.17])for(let row=0;row<s.rows;row++){
  const p=localPoint(s,meta.origin,x,0,s.d/2-.72-row*1.08);oldSamples.push([p,original.height(p.x,p.z)]);
 }
 const {rails}=finishSportsStands(scene,meta),sampler=createCityHeightSampler58(meshes(scene));
 for(const r of rails)for(const f of r.feet){const [x,y,z]=f.position;assert(Math.abs(original.height(x,z,f.tread+.01)-f.tread)<.005,'Support floats above its tread');assert(y<f.tread&&f.tread-y<.04);}
 for(const [p,y]of oldSamples)assert(Math.abs(sampler.height(p.x,p.z)-y)<1e-6,'Do not turn an aisle into a wall');
 // New rear shell/cap participates in the same geometry-derived sampler.
 const east=meta.stands.find(s=>s.id==='east'),p=localPoint(east,meta.origin,0,0,-2.3);assert(Math.abs(sampler.height(p.x,p.z)-4.22)<1e-4);
});

test('rear faces and all four swept rails remain visible/solid from both sides',async()=>{
 const {scene,meta}=await load(),{rails}=finishSportsStands(scene,meta);scene.updateMatrixWorld(true);
 const cast=(origin,target,list)=>{const delta=target.clone().sub(origin),ray=new T.Raycaster(origin,delta.clone().normalize(),0,delta.length()+.3);return ray.intersectObjects(list,true);};
 const shell=scene.getObjectByName('SPORTS97_SOLID_SPORTS97_shell'),cream=scene.getObjectByName('SPORTS97_SOLID_SPORTS97_cream'),east=meta.stands.find(s=>s.id==='east');
 for(const [from,to]of [[-5,0],[0,-5]])assert(cast(localPoint(east,meta.origin,0,2.8,from),localPoint(east,meta.origin,0,2.8,to),[shell]).length,'Missing rear/front face');
 for(const r of rails){
  const s=meta.stands.find(s=>s.id===r.stand),mid=new T.Vector3(...r.a).lerp(new T.Vector3(...r.b),.5),normal=new T.Vector3(Math.cos(s.yaw),0,-Math.sin(s.yaw));
  for(const sign of [-1,1])assert(cast(mid.clone().addScaledVector(normal,sign*.3),mid,[cream]).length,'Rail side missing');
 }
});

test('source and shipped runtime repair before building obstacle/camera samplers; fresh entry aliases',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),source=read('island/northwest-sports-v97.js'),bundle=read('island/runtime.bundle.js');
 assert(source.indexOf('finishSportsStands(group,metadata)')<source.indexOf('createCityHeightSampler58(meshes'));
 assert(bundle.includes('__finishSportsStands(l,a);__parkingGroundFinish(l,a,s);let u=s.getObjectByName'));
 for(const f of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
  const map=JSON.parse(read(f).match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,path='/67park-foundation-next/island/runtime.bundle.js';
  assert.equal(map[path],path+'?v=city-startup-memory-1');for(const[k,v]of Object.entries(map))if(k.split('?')[0]===path)assert.equal(v,map[path]);
 }
});

test('unexpected source revision is rejected without changing a mesh',async()=>{
 const {scene,meta}=await load(),before=meshes(scene).map(m=>m.geometry);assert.throws(()=>finishSportsStands(scene,{...meta,revision:6}),/revision changed/);assert.deepEqual(meshes(scene).map(m=>m.geometry),before);
});
