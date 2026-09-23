import {register} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
  const soil=r.name==='4_KIYI_TOPRAK_TABANI',soilCount=patch.metrics.removedCoplanarSoilTriangles;g.setIndex(soil?Array.from({length:(soilCount+1)*3},(_,i)=>i%3):[0,1,2,0,1,2]);r.remove=soil?Array.from({length:soilCount},(_,i)=>(i+1)*3):[3];
  r.expected={vertices:3,indices:g.index.count,positionCRC:crc(g.attributes.position.array),indexCRC:crc(Uint32Array.from(g.index.array))};
  const mesh=new T.Mesh(g,material);mesh.name=r.name;root.add(mesh);
 }
 for(const r of patch.roadEnd.rows){
  const p=r.p.map((v,i)=>i%3===2?v+patch.roadEnd.extension:v),g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(r.name==='6_BORDUR'?Array.from({length:(patch.metrics.mergedCurbTriangles+1)*3},(_,i)=>i%3):[0,1,2]);g.computeVertexNormals();
  if(r.name==='6_BORDUR')patch.curbMerge.remove=Array.from({length:patch.metrics.mergedCurbTriangles},(_,i)=>(i+1)*3);
  r.ids=Array.from({length:p.length/3},(_,i)=>i);r.expected={vertices:p.length/3,indices:g.index.count,positionCRC:crc(g.attributes.position.array),indexCRC:crc(Uint32Array.from(g.index.array))};
  // Store Float32 round-trip coordinates in the fixture, exactly as the baker does.
  r.p=Array.from(g.attributes.position.array,(v,i)=>i%3===2?v-patch.roadEnd.extension:v);
  const mesh=new T.Mesh(g,material);mesh.name=r.name;root.add(mesh);
 }
 return {root,patch,material};
}
test('road endpoint meets the actual pool parcel front without changing width, height or triangle count',()=>{
 const poolSource=fs.readFileSync(new URL('../island/north-pool-v104.js',import.meta.url),'utf8');
 const poolNorth=Number(poolSource.match(/parcel:\{[^}]*north:([-\d.]+)/)[1]);
 const road=data.roadEnd;assert.equal(road.endZ,poolNorth);assert.equal(road.endZ,-240.87256525074335);assert(Math.abs(road.extension-3.5891496456)<1e-6);assert.equal(road.addedTriangles,0);
 assert.deepEqual(road.rows.map(r=>r.name),['5_YOL','6_BORDUR']);
 const r=road.rows[0],x=r.p.filter((_,i)=>i%3===0),z=r.p.filter((_,i)=>i%3===2);
 assert(z.every(v=>Math.abs(v-road.endZ)<1e-6));assert(Math.abs(Math.max(...x)-Math.min(...x)-10.56999)<.00002);
 const {root,patch}=fixture(),before=root.children.slice(3).map(m=>({p:Array.from(m.geometry.attributes.position.array),ix:Array.from(m.geometry.index.array)}));
 applyNorthHousingSurface(root,patch);
 for(let j=0;j<2;j++){const m=root.children[j+3],p=Array.from(m.geometry.attributes.position.array);assert.deepEqual(Array.from(m.geometry.index.array),[0,1,2]);
  p.forEach((v,i)=>assert(Math.abs(v-(before[j].p[i]-(i%3===2?road.extension:0)))<.00002));}
});
test('joined grass buffer is byte-identical to the approved previous release',()=>{
 const grass=data.meshes.find(m=>m.name==='3_CIMEN');
 assert.equal(createHash('sha256').update(JSON.stringify(grass)).digest('hex'),'c4e364d3fa220741c786e2a830d1d0551fc7357731a4e0b089aac3a9c7446e7d');
});
test('western cap repair preserves soil, eastern road and curb removal data byte-for-byte',()=>{
 const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 assert.equal(hash(data.meshes.find(m=>m.name==='4_KIYI_TOPRAK_TABANI')),'debeae0b656ea29d4427146de9a204c89a93648603a9124f9de1fbd9ef2ec318');
 assert.equal(hash(data.roadEnd),'56a995715ff75fdf6bf2371f6fa7d042a8f7f65967acc6a10c3645770920682e');
});
test('western pool pavement ends flush with the western road, without a bulge or inner notch',()=>{
 const row=data.meshes.find(m=>m.name==='7_KALDIRIM_TABANI'),end=-243.564411;
 const scene=new T.Group(),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(row.p,3));g.setIndex(row.ix);
 scene.add(new T.Mesh(g,new T.MeshBasicMaterial()));scene.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 const hit=(x,z)=>{ray.ray.origin.set(x,12,z);return ray.intersectObjects(scene.children)[0]};
 for(let x=-82.214;x<=-80.31;x+=.04){
  assert(hit(x,end+.001),'No recessed tooth at western cap: '+JSON.stringify({x,end}));
  assert.equal(hit(x,end-.001),undefined,'No paving beyond western road cap: '+JSON.stringify({x,end}));
 }
 for(let x=-82.21;x<=-80.13;x+=.04)for(let z=end-.02;z>=end-.65;z-=.04)
  assert.equal(hit(x,z),undefined,'No asymmetric western bulge: '+JSON.stringify({x,z}));
 // The outside corner has one convex 16 cm return, tangent to the cap/side.
 const cx=-80.30304,cz=end+.16,r=.16;
 for(let i=1;i<16;i++){
  const a=-Math.PI/2+i*Math.PI/32;
  assert(hit(cx+Math.cos(a)*(r-.003),cz+Math.sin(a)*(r-.003)),'Rounded return inside');
  assert.equal(hit(cx+Math.cos(a)*(r+.003),cz+Math.sin(a)*(r+.003)),undefined,'Rounded return outside');
 }
});
test('actual coastal triangle boundary follows the lawn at uniform width, including edge midpoints',()=>{
 function boundary(row){
  const edges=new Map();
  for(let i=0;i<row.ix.length;i+=3){const ids=row.ix.slice(i,i+3);if(ids.some(j=>row.n[j*3+1]<.999))continue;
   for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b].map(j=>[row.p[j*3],row.p[j*3+2]]));}
  }return [...edges.values()];
 }
 const grass=boundary(data.meshes.find(m=>m.name==='3_CIMEN')),coast=boundary(data.meshes.find(m=>m.name==='7_KALDIRIM_TABANI')).filter(e=>e.every(p=>p[1]<-220&&p[0]>1&&p[0]<130));
 // The western round return is now a straight road join. Continue measuring
 // the coastal boundary with more than 100 endpoint/midpoint checks.
 assert(coast.length*3>100);
 for(const [a,b]of coast)for(const p of [a,b,[(a[0]+b[0])/2,(a[1]+b[1])/2]]){
  const distance=Math.min(...grass.map(([q,r])=>{const dx=r[0]-q[0],dz=r[1]-q[1],t=Math.max(0,Math.min(1,((p[0]-q[0])*dx+(p[1]-q[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-q[0]-dx*t,p[1]-q[1]-dz*t)}));
  assert(Math.abs(distance-4.34016)<.003,JSON.stringify({p,distance}));
 }
});
test('northern patch reuses meshes and removes only covered coplanar soil; lawns and plots unchanged',()=>{
 assert.equal(data.metrics.existingGrassRemovedArea,0);assert.equal(data.metrics.reservedParcelChangedArea,0);
 assert.equal(data.metrics.triangleDelta,-2096);assert.equal(data.metrics.addedMeshes,0);assert.equal(data.metrics.perFrameWork,0);
 assert.equal(data.metrics.mergedCurbTriangles,987);assert.equal(data.curbMerge.remove.length,987);
 assert.equal(data.metrics.removedCoplanarSoilTriangles,266);assert.equal(data.metrics.retainedSoilTriangles,55);assert.equal(data.metrics.exteriorSoilChangedArea,0);
 assert.equal(data.metrics.coastWalkwayWidth,4.34016);assert(data.metrics.coastWidthSamples>100);
 assert.equal(data.metrics.poolWestCornerRadius,.16);assert.equal(data.metrics.poolWestOutsideChangedArea,0);
 assert(data.metrics.poolWestRemovedArea>.55&&data.metrics.poolWestRemovedArea<.56);
 assert(Math.abs(data.metrics.coastWidthMin-4.34016)<.003);assert(Math.abs(data.metrics.coastWidthMax-4.34016)<.003);
 for(const r of data.meshes)for(let i=0;i<r.ix.length;i+=3){
  const p=r.ix.slice(i,i+3).map(j=>new T.Vector3(...r.p.slice(j*3,j*3+3)));
  const n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));assert(n.length()>1e-10);
  assert(n.normalize().dot(new T.Vector3(...r.n.slice(r.ix[i]*3,r.ix[i]*3+3)))>.999);
 }
});
test('pool-side corner is continuous, with no protruding curb tooth or coplanar soil overlay',()=>{
 assert.equal(data.metrics.poolOutsideCornerChangedArea,0);
 assert(data.metrics.poolCornerAddedArea>23&&data.metrics.poolCornerAddedArea<25);
 const scene=new T.Group();
 for(const r of data.meshes){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(r.p,3));g.setIndex(r.ix);const m=new T.Mesh(g,new T.MeshBasicMaterial());m.name=r.name;scene.add(m)}scene.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 for(let x=-21;x<=-15.2;x+=.2)for(let z=-240.3;z<=-232;z+=.2){
  ray.ray.origin.set(x,12,z);const hits=ray.intersectObjects(scene.children);
  assert.equal(hits[0]?.object.name,'7_KALDIRIM_TABANI',JSON.stringify({x,z}));
  assert(!hits.some(h=>h.object.name==='4_KIYI_TOPRAK_TABANI'));
  assert(Math.abs(hits[0].point.y-9.38008564)<.00001);
 }
 for(const [x,z]of [[-16,-240.9],[-15.5,-240.9],[-15,-240.5]]){
  ray.ray.origin.set(x,12,z);assert.equal(ray.intersectObjects(scene.children).length,0,'No pavement over the beach/road');
 }
 // The old rounded road-facing tip left a tiny triangle at the exact end.
 for(const x of [-15.102,-15.11,-15.15,-15.3])for(const z of [-240.870,-240.85,-240.80,-240.754,-240.75,-240.7]){
  ray.ray.origin.set(x,12,z);assert.equal(ray.intersectObjects(scene.children)[0]?.object.name,'7_KALDIRIM_TABANI','Pave right up to the exact road corner: '+JSON.stringify({x,z}));
 }
});
test('interior is paved, lawns join, apartment plots and exterior sand remain uncovered',()=>{
 const scene=new T.Group();
 for(const r of data.meshes){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(r.p,3));g.setIndex(r.ix);const m=new T.Mesh(g,new T.MeshBasicMaterial());m.name=r.name;scene.add(m)}scene.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 function hit(x,z){ray.ray.origin.set(x,15,z);return ray.intersectObjects(scene.children)[0]}
 for(const [x,z]of [[70,-225],[74,-225],[79,-230]])assert.equal(hit(x,z)?.object.name,'3_CIMEN');
 for(const [x,z]of [[72,-200],[-2,-205],[147,-205],[74,-218]])assert.equal(hit(x,z)?.object.name,'7_KALDIRIM_TABANI');
 for(const x of [-4.4,-3.5,-3.39,-3.38,-3.3,-3.1,-2.8])for(let z=-240.5;z<=-193;z+=.25)assert.equal(hit(x,z)?.object.name,'7_KALDIRIM_TABANI','No gaps along the merged road-side pavement');
 for(const [x,z]of [[72,-242],[145,-225],[16,-202],[94,-202],[-8,-220]])assert.equal(hit(x,z),undefined);
});
test('same mesh/material references, unrelated triangles retained, idempotent',()=>{
 const {root,patch,material}=fixture(),children=[...root.children];const result=applyNorthHousingSurface(root,patch);
 assert.deepEqual(root.children,children);assert.equal(applyNorthHousingSurface(root,patch),result);
 for(let i=0;i<children.length;i++){const m=children[i];assert.equal(m.material,material);assert.deepEqual(Array.from(m.geometry.index.array.slice(0,3)),[0,1,2]);if(i<3){assert.equal(m.geometry.index.count,3+patch.meshes[i].ix.length);assert(m.geometry.attributes.uv)}else assert.equal(m.geometry.index.count,3)}
});
test('last-source mismatch and malformed geometry reject atomically',()=>{
 for(const damage of [p=>p.roadEnd.rows[1].expected.indexCRC='00000000',p=>p.roadEnd.rows[0].p[0]=999,p=>p.roadEnd.endZ=-250,p=>p.meshes[1].expected.indexCRC='00000000',p=>p.meshes[1].p[0]=999,p=>p.meshes[1].n[0]=NaN,p=>p.meshes[1].remove=[0,0],p=>p.metrics.existingGrassRemovedArea=1,p=>p.meshes[1].name=p.meshes[0].name,p=>p.metrics.poolWestOutsideChangedArea=1,p=>p.metrics.poolWestEndZ=-250]){
  const {root,patch}=fixture(),before=root.children.map(m=>m.geometry);damage(patch);assert.throws(()=>applyNorthHousingSurface(root,patch));
  root.children.forEach((m,i)=>assert.equal(m.geometry,before[i]));assert.equal(root.userData.northHousingSurface1,undefined);
 }
});
test('both runtimes apply after photo repair and before shadow refresh; public cache points to this release',()=>{
 for(const file of ['island/runtime.js','island/runtime.bundle.js']){
  const s=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.equal(s.split('dataset.northHousingSurface1=').length,2);
  const i=s.indexOf('dataset.northHousingSurface1=');assert(i>s.indexOf('dataset.photoSurfaceFinish1='));assert(s.slice(i,i+750).includes('67D_SKATEPARK_BASE'));
 }
 for(const file of ['app/main.js','explore/explore.js'])assert(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').includes('runtime.bundle.js?v=north-housing-8'));
 assert(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('app/main.js?v=character-menu-1'));
});
