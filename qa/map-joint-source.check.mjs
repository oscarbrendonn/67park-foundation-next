// Independent application against the exported production source, compared
// with the freshly rendered result. Does not edit either evidence capture.
import {register} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {applyMapJointFinish}=await import('../app/map-joint-finish.js');
const patch=JSON.parse(fs.readFileSync('repairs/map-joint-finish-1.json'));
const before=JSON.parse(fs.readFileSync('.qa-results/crack-audit-682fa42-20260924/terrain-live.json'));
const after=JSON.parse(fs.readFileSync('.qa-results/map-joint-finish-1/after-refined/terrain.json'));
const root=new T.Group(),all=new Map(before.meshes.map(m=>[m.name,m])),result=new Map(after.meshes.map(m=>[m.name,m]));
for(const row of [...patch.meshes,...patch.donors]){
 const m=all.get(row.name),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.p,3));g.setIndex(m.ix);g.computeVertexNormals();
 const mesh=new T.Mesh(g,new T.MeshStandardMaterial());mesh.name=m.name;mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(m.matrix);root.add(mesh);
}
const info=applyMapJointFinish(root,patch);root.updateMatrixWorld(true);
for(const row of patch.meshes){
 const g=root.getObjectByName(row.name).geometry,actual=result.get(row.name);
 assert.deepEqual(Array.from(g.attributes.position.array),actual.p,row.name+' rendered positions differ');
 assert.deepEqual(Array.from(g.index.array),actual.ix,row.name+' rendered indices differ');
 const original=all.get(row.name),removed=new Set(row.remove);let cursor=0;
 for(let i=0;i<original.ix.length;i+=3)if(!removed.has(i))for(let j=0;j<3;j++){
  const old=original.ix[i+j],next=g.index.getX(cursor++);
  for(let axis=0;axis<3;axis++)assert.equal(g.attributes.position.array[next*3+axis],original.p[old*3+axis],'Retained source vertex moved');
 }
}
const changed=new Set(patch.meshes.map(m=>m.name));let untouched=0;
for(const m of before.meshes)if(!changed.has(m.name)){
 const a=result.get(m.name);assert(a,m.name+' removed');assert.deepEqual(a.p,m.p,m.name+' positions changed');assert.deepEqual(a.ix,m.ix,m.name+' indices changed');assert.equal(a.material,m.material);untouched++;
}
console.log('MAP_JOINT_SOURCE_PASS',JSON.stringify({untouchedMeshes:untouched,affectedMeshes:changed.size,triangleDelta:info.triangleDelta,vertexDelta:info.vertexDelta}));
