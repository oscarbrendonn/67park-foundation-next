import {register} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {applyPhotoSurfaceFinish}=await import('../app/photo-surface-finish.js');
const {boundaryPositionCRC:crc}=await import('../app/terrain-boundaries.js');
const data=JSON.parse(fs.readFileSync(new URL('../repairs/photo-surface-finish-1.json',import.meta.url),'utf8'));
function fixture(){
 const root=new T.Group(),patch=structuredClone(data),material=new T.MeshStandardMaterial();
 for(const r of patch.meshes){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,9.29,0,0,9.29,1,1,9.29,0],3));
  g.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));
  g.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,0],2));
  g.setIndex(r.name==='6_BORDUR'?Array.from({length:3810},(_,i)=>i%3):[0,1,2]);
  if(r.name==='6_BORDUR')r.remove=Array.from({length:1270},(_,i)=>i*3);
  r.expected={vertices:3,indices:g.index.count,positionCRC:crc(g.attributes.position.array),indexCRC:crc(Uint32Array.from(g.index.array))};
  const m=new T.Mesh(g,material);m.name=r.name;root.add(m);
 }
 for(const x of [14.2,84.54])for(const [a,b] of [[-74.65,-35.42],[-29.23,9.8]]){
  const g=new T.BoxGeometry(2.5,.035,b-a);g.translate(x,9.3175,(a+b)/2);
  const m=new T.Mesh(g,material);m.name=`CENTER73_PATH_${x}_${a}`;root.add(m);
 }
 return {root,patch,material};
}
test('three-photo patch preserves bowl opening and limits district/ground changes',()=>{
 assert.equal(data.metrics.bowlHoleChangedArea,0);
 assert.equal(data.metrics.removedRaisedConnectors,4);
 assert(data.metrics.centralChangedArea<5);
 for(const row of data.meshes){
  assert.equal(row.p.length,row.n.length);assert.equal(row.ix.length%3,0);
  for(let i=0;i<row.ix.length;i+=3){
   const p=row.ix.slice(i,i+3).map(j=>new T.Vector3(...row.p.slice(j*3,j*3+3)));
   const n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));
   assert(n.length()>1e-10,`${row.name} degenerate face`);
   assert(n.normalize().dot(new T.Vector3(...row.n.slice(row.ix[i]*3,row.ix[i]*3+3)))>.999);
  }
 }
});
test('same mesh/material references, no floating connector faces, idempotent',()=>{
 const {root,patch,material}=fixture(),children=[...root.children];
 const report=applyPhotoSurfaceFinish(root,patch);
 assert.equal(report.addedMeshes,0);assert.equal(report.perFrameWork,0);
 assert.deepEqual(root.children,children);
 for(const m of children){assert.equal(m.material,material);assert(m.geometry.attributes.uv);if(m.name.startsWith('CENTER73_PATH'))assert.equal(m.geometry.index.count,0);}
 assert.equal(applyPhotoSurfaceFinish(root,patch),report);
});
test('bad final source and bad connector leave every earlier mesh untouched',()=>{
 for(const mode of ['crc','connector']){
  const {root,patch}=fixture(),before=root.children.map(m=>m.geometry);
  if(mode==='crc')patch.meshes.at(-1).expected.positionCRC='00000000';
  else root.children.at(-1).geometry.translate(0,1,0);
  assert.throws(()=>applyPhotoSurfaceFinish(root,patch),/changed/);
  root.children.forEach((m,i)=>assert.equal(m.geometry,before[i]));
  assert.equal(root.userData.photoSurfaceFinish1,undefined);
 }
});
test('invalid scope, normals and duplicate targets reject before commit',()=>{
 for(const damage of [p=>{p.metrics.bowlHoleChangedArea=1;},p=>{p.meshes[0].n[0]=NaN;},p=>{p.meshes[1].name=p.meshes[0].name;}]){
  const {root,patch}=fixture(),before=root.children.map(m=>m.geometry);damage(patch);
  assert.throws(()=>applyPhotoSurfaceFinish(root,patch));
  root.children.forEach((m,i)=>assert.equal(m.geometry,before[i]));
 }
});
test('both maintained entry runtimes install before sampler and refresh skate shadows',()=>{
 for(const f of ['runtime.js','runtime.bundle.js']){
  const text=fs.readFileSync(new URL('../island/'+f,import.meta.url),'utf8');
  assert.equal(text.split('dataset.photoSurfaceFinish1=').length,2);
  const start=text.indexOf('dataset.photoSurfaceFinish1=');
  assert(text.slice(start,start+1100).includes('67D_SKATEPARK_BASE'));
 }
});
