import {register} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {applyNorthHousingSurface}=await import('../app/north-housing-surface.js');
const {boundaryPositionCRC:crc}=await import('../app/terrain-boundaries.js');
const data=JSON.parse(fs.readFileSync(new URL('../repairs/north-housing-surface-1.json',import.meta.url)));
function fixture(){
 const root=new T.Group(),patch=structuredClone(data),material=new T.MeshStandardMaterial();
 for(const r of patch.meshes){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([1000,9,0,1000,9,1,1001,9,0],3));
  g.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,0],2));
  g.setIndex([0,1,2,0,1,2]);r.remove=[3];
  r.expected={vertices:3,indices:6,positionCRC:crc(g.attributes.position.array),indexCRC:crc(Uint32Array.from(g.index.array))};
  const mesh=new T.Mesh(g,material);mesh.name=r.name;root.add(mesh);
 }return {root,patch,material};
}
test('northern patch is two compact existing meshes, unchanged lawns and apartment plots',()=>{
 assert.equal(data.metrics.existingGrassRemovedArea,0);assert.equal(data.metrics.reservedParcelChangedArea,0);
 assert.equal(data.metrics.triangleDelta,-452);assert.equal(data.metrics.addedMeshes,0);assert.equal(data.metrics.perFrameWork,0);
 for(const r of data.meshes)for(let i=0;i<r.ix.length;i+=3){
  const p=r.ix.slice(i,i+3).map(j=>new T.Vector3(...r.p.slice(j*3,j*3+3)));
  const n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));assert(n.length()>1e-10);
  assert(n.normalize().dot(new T.Vector3(...r.n.slice(r.ix[i]*3,r.ix[i]*3+3)))>.999);
 }
});
test('interior is paved, lawns join, apartment plots and exterior sand remain uncovered',()=>{
 const scene=new T.Group();
 for(const r of data.meshes){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(r.p,3));g.setIndex(r.ix);const m=new T.Mesh(g,new T.MeshBasicMaterial());m.name=r.name;scene.add(m)}scene.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 function hit(x,z){ray.ray.origin.set(x,15,z);return ray.intersectObjects(scene.children)[0]}
 for(const [x,z]of [[70,-225],[74,-225],[79,-230]])assert.equal(hit(x,z)?.object.name,'3_CIMEN');
 for(const [x,z]of [[72,-200],[-2,-205],[147,-205],[74,-218]])assert.equal(hit(x,z)?.object.name,'7_KALDIRIM_TABANI');
 for(const [x,z]of [[-3.8,-239],[72,-242],[145,-225],[16,-202],[94,-202],[-8,-220]])assert.equal(hit(x,z),undefined);
});
test('same mesh/material references, unrelated triangles retained, idempotent',()=>{
 const {root,patch,material}=fixture(),children=[...root.children];const result=applyNorthHousingSurface(root,patch);
 assert.deepEqual(root.children,children);assert.equal(applyNorthHousingSurface(root,patch),result);
 for(let i=0;i<children.length;i++){const m=children[i];assert.equal(m.material,material);assert.deepEqual(Array.from(m.geometry.index.array.slice(0,3)),[0,1,2]);assert.equal(m.geometry.index.count,3+patch.meshes[i].ix.length);assert(m.geometry.attributes.uv)}
});
test('last-source mismatch and malformed geometry reject atomically',()=>{
 for(const damage of [p=>p.meshes[1].expected.indexCRC='00000000',p=>p.meshes[1].p[0]=999,p=>p.meshes[1].n[0]=NaN,p=>p.meshes[1].remove=[0,0],p=>p.metrics.existingGrassRemovedArea=1,p=>p.meshes[1].name=p.meshes[0].name]){
  const {root,patch}=fixture(),before=root.children.map(m=>m.geometry);damage(patch);assert.throws(()=>applyNorthHousingSurface(root,patch));
  root.children.forEach((m,i)=>assert.equal(m.geometry,before[i]));assert.equal(root.userData.northHousingSurface1,undefined);
 }
});
test('both runtimes apply after photo repair and before shadow refresh; public cache points to this release',()=>{
 for(const file of ['island/runtime.js','island/runtime.bundle.js']){
  const s=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.equal(s.split('dataset.northHousingSurface1=').length,2);
  const i=s.indexOf('dataset.northHousingSurface1=');assert(i>s.indexOf('dataset.photoSurfaceFinish1='));assert(s.slice(i,i+750).includes('67D_SKATEPARK_BASE'));
 }
 for(const file of ['app/main.js','explore/explore.js'])assert(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').includes('runtime.bundle.js?v=north-housing-1'));
 assert(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('app/main.js?v=north-housing-1'));
});
