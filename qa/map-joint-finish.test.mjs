import {register} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {applyMapJointFinish}=await import('../app/map-joint-finish.js');
const {boundaryPositionCRC:crc}=await import('../app/terrain-boundaries.js');
const baked=JSON.parse(fs.readFileSync(new URL('../repairs/map-joint-finish-1.json',import.meta.url)));
function fixture(){
 const root=new T.Group(),patch=structuredClone(baked),material=new T.MeshStandardMaterial();
 for(const r of [...patch.meshes,...patch.donors]){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([0,9,0,0,9,1,1,9,0,50,9,0,50,9,1,51,9,0],3));
  g.setAttribute('normal',new T.Float32BufferAttribute(Array.from({length:18},(_,i)=>i%3===1?1:0),3));
  g.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:12},(_,i)=>i/12),2));g.setIndex([3,4,5,0,1,2]);
  r.expected={vertices:6,indices:6,positionCRC:crc(g.attributes.position.array),indexCRC:crc(Uint32Array.from(g.index.array))};
  if(r.remove)r.remove=r.name==='7_DOGU_SAHIL_MEYDAN_APRON'?[0,3]:[3];
  const mesh=new T.Mesh(g,material);mesh.name=r.name;root.add(mesh);
 }
 return {root,patch,material};
}
test('atomic patch preserves retained vertices/UVs, mesh identities and materials; compacts unused history',()=>{
 const {root,patch,material}=fixture(),children=root.children.slice(),donors=root.children.slice(4).map(m=>m.geometry);
 const info=applyMapJointFinish(root,patch);
 assert.equal(info.addedDrawCalls,0);assert.equal(info.perFrameWork,0);assert.equal(info.materialsPreserved,true);
 assert.deepEqual(root.children,children);root.children.forEach(m=>assert.equal(m.material,material));
 for(const r of patch.meshes){const g=root.getObjectByName(r.name).geometry;
  if(r.name==='7_DOGU_SAHIL_MEYDAN_APRON'){assert.equal(g.index.count,0);assert.equal(g.attributes.position.count,0);continue;}
  assert.equal(g.attributes.position.count,3+r.p.length/3);
  assert.deepEqual(Array.from(g.attributes.position.array.slice(0,9)),[50,9,0,50,9,1,51,9,0]);
  assert.deepEqual(Array.from(g.index.array.slice(0,3)),[0,1,2]);
  assert.deepEqual(Array.from(g.attributes.uv.array.slice(0,6)),Array.from(Float32Array.from([6,7,8,9,10,11],v=>v/12)));
 }
 root.children.slice(4).forEach((m,i)=>assert.equal(m.geometry,donors[i]));
 assert.equal(applyMapJointFinish(root,patch),info);
});
test('bad source, donor, clipping, normals or target cannot commit a partial repair',()=>{
 for(const damage of [p=>p.meshes.at(-1).expected.positionCRC='bad',p=>p.donors[0].expected.indexCRC='bad',p=>p.meshes[0].remove=[1],p=>p.meshes[0].n[0]=NaN,p=>p.meshes[0].n.splice(0,3,0,0,0),p=>p.meshes[1].name=p.meshes[0].name,p=>p.meshes[2].ix[0]=-1]){
  const {root,patch}=fixture(),before=root.children.map(m=>m.geometry);damage(patch);assert.throws(()=>applyMapJointFinish(root,patch));
  root.children.forEach((m,i)=>assert.equal(m.geometry,before[i]));assert.equal(root.userData.mapJointFinish1,undefined);
 }
});
test('world-coordinate patch transforms correctly under a translated/scaled root',()=>{
 const {root,patch}=fixture();root.position.set(2,3,4);root.scale.setScalar(2);root.updateMatrixWorld(true);applyMapJointFinish(root,patch);root.updateMatrixWorld(true);
 for(const r of patch.meshes){if(!r.p.length)continue;const m=root.getObjectByName(r.name),p=m.geometry.attributes.position;
  for(const id of [0,Math.floor(r.p.length/6),r.p.length/3-1]){
   const v=new T.Vector3().fromBufferAttribute(p,3+id).applyMatrix4(m.matrixWorld);
   assert(v.distanceTo(new T.Vector3(...r.p.slice(id*3,id*3+3)))<.00004);
  }
 }
});
test('baked shape repairs contain finite, correctly oriented triangles and preserve narrow scope',()=>{
 assert(baked.metrics.cityGapArea>.08&&baked.metrics.cityGapArea<.5);
 assert(baked.metrics.cityContourDelta<.4);assert.equal(baked.metrics.fairgroundWidth,1.14224);
 assert.deepEqual(baked.meshes.map(m=>m.name),['6_BORDUR','7_DOGU_SAHIL_MEYDAN_APRON','5_YOL','7_KALDIRIM_TABANI']);
 for(const r of baked.meshes){
  assert.equal(new Set(r.remove).size,r.remove.length);assert.equal(r.p.length,r.n.length);assert.equal(r.ix.length%3,0);
  for(let i=0;i<r.ix.length;i+=3){
   const ps=r.ix.slice(i,i+3).map(j=>new T.Vector3(...r.p.slice(j*3,j*3+3)));
   const face=new T.Vector3().crossVectors(ps[1].clone().sub(ps[0]),ps[2].clone().sub(ps[0]));
   assert(face.length()>1e-11);const normal=new T.Vector3();
   for(const j of r.ix.slice(i,i+3))normal.add(new T.Vector3(...r.n.slice(j*3,j*3+3)));
   assert(face.dot(normal)>-1e-8,'Face must agree with its shading normals');
  }
 }
});
test('southern city curb has no transverse tooth and both return edges progress monotonically',()=>{
 assert.equal(baked.metrics.citySouthTangent,true);
 const row=baked.meshes.find(r=>r.name==='6_BORDUR');let teeth=0;
 for(let i=0;i<row.ix.length;i+=3){
  const ids=row.ix.slice(i,i+3),p=ids.map(v=>row.p.slice(v*3,v*3+3));
  if(p.every(v=>v[0]>-38.2&&v[0]<-36.9&&Math.abs(v[2]-114.4)<1e-6)
   &&ids.some(v=>Math.abs(row.n[v*3+2])>.9&&Math.abs(row.n[v*3+1])<.1))teeth++;
 }
 assert.equal(teeth,0,'The old patch exposed four transverse faces at the return');
 for(const [minX,maxX,minZ,maxZ]of [[-38.2,-38,113.6789,116.1149],[-37.05,-36.9,113.165,115.1937]]){
  const points=new Map();
  for(let i=0;i<row.p.length;i+=3){
   const [x,y,z]=row.p.slice(i,i+3),[nx,ny]=row.n.slice(i,i+2);
   if(x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ&&Math.abs(ny)<.001&&Math.abs(nx)>.98)
    points.set(x+','+z,[x,z]);
  }
  const ordered=[...points.values()].sort((a,b)=>a[1]-b[1]);assert(ordered.length>=10,'Curved-to-straight samples are present');
  for(let i=1;i<ordered.length;i++)assert(ordered[i][0]>=ordered[i-1][0]-1e-7,'An edge must not turn backwards into a tooth');
 }
});
test('both runtime variants apply the joint patch after previous repairs and before terrain/shadow refresh',()=>{
 for(const name of ['island/runtime.js','island/runtime.bundle.js']){
  const s=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),i=s.indexOf('dataset.mapJointFinish1=');
  assert.equal(s.split('dataset.mapJointFinish1=').length,2);assert(i>s.indexOf('dataset.northHousingSurface1='));assert(s.slice(i,i+650).includes('67D_SKATEPARK_BASE'));
  assert(s.includes('/repairs/map-joint-finish-1.json?v=city-curb-tangent-2'));
 }
 for(const name of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
  const s=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),map=JSON.parse(s.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const path='/67park-foundation-next/island/runtime.bundle.js';
  for(const [key,value]of Object.entries(map))if(key.split('?')[0]===path)assert.equal(value,path+'?v=city-startup-memory-1');
  const raw=s.match(/67park.entry.downloads.v1"\)\]=([^;]+);/);
  if(raw){const files=JSON.parse(raw[1]),r=files.filter(r=>r.url.includes('/map-joint-finish-1.json'));
   assert.equal(r.length,1);assert(r[0].url.endsWith('?v=city-curb-tangent-2'));assert.equal(r[0].bytes,fs.statSync(new URL('../repairs/map-joint-finish-1.json',import.meta.url)).size);
  }
 }
});
