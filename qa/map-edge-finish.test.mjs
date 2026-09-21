import {register} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {boundaryPositionCRC}=await import('../app/terrain-boundaries.js');
const {applyMapEdgeFinish}=await import('../app/map-edge-finish.js');

const PATCH_URL=new URL('../repairs/map-edge-finish-1.json',import.meta.url);
const SLABS=['CENTER_WHITE71_-1_-1','CENTER_WHITE71_-1_1','CENTER_WHITE71_1_-1','CENTER_WHITE71_1_1'];
const TARGETS=['7_KALDIRIM_TABANI','6_BORDUR','3_CIMEN',...SLABS,'5_YOL'];
const indexCRC=g=>boundaryPositionCRC(Uint32Array.from(g.index.array));
const close=(a,b,message='values differ')=>assert(Math.abs(a-b)<1e-5,`${message}: ${a} != ${b}`);
const closeRoundTrip=(a,b,message='Float32 round-trip differs')=>assert(Math.abs(a-b)<1e-9,`${message}: ${a} != ${b}`);

function expected(g){return {vertices:g.attributes.position.count,indices:g.index.count,positionCRC:boundaryPositionCRC(g.attributes.position.array),indexCRC:indexCRC(g)};}
function geometry(points=[0,9.38,0,1,9.38,0,0,9.38,1]){
 const count=points.length/3;
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(points,3));
 g.setAttribute('normal',new T.Float32BufferAttribute(Array.from({length:count},()=>[0,1,0]).flat(),3));
 g.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:count},(_,i)=>[i,1-i]).flat(),2));
 g.setAttribute('color',new T.Uint8BufferAttribute(Array.from({length:count},(_,i)=>[17+i,31+i,47+i]).flat(),3,true));
 g.setIndex(count===6?[0,1,2,3,4,5]:[0,1,2]);
 return g;
}
function addMesh(root,name,g=geometry(),material=new T.MeshStandardMaterial({color:0xddc0be})){
 const mesh=new T.Mesh(g,material);mesh.name=name;root.add(mesh);return mesh;
}
function synthetic(){
 const root=new T.Group(),meshes={};
 for(const name of TARGETS)meshes[name]=addMesh(root,name,name==='7_KALDIRIM_TABANI'?geometry([0,9.38,0,1,9.38,0,0,9.38,1,2,9.38,0,3,9.38,0,2,9.38,1]):geometry(),name==='3_CIMEN'?new T.MeshPhysicalMaterial({color:0x4f8b42,roughness:.8}):undefined);
 const divider=addMesh(root,'8_REF_AYIRICI',geometry([
  -150,9.358031075448418,50,-149,9.948030988205531,50,-148,9.358031075448418,51,
  -130,9.358031075448418,70,-129,9.948030988205531,70,-128,9.358031075448418,71
 ]));
 divider.geometry.setIndex([0,1,2,3,4,5]);
 const grass=meshes['3_CIMEN'];
 const fill=addMesh(root,'8_CIM_STUB_DOLGU');root.updateMatrixWorld(true);
 const patch={version:1,metrics:{fixture:true},meshes:TARGETS.map((name,i)=>({
  name,replace:SLABS.includes(name),remove:['7_KALDIRIM_TABANI','3_CIMEN'].includes(name)?[0]:[],expected:expected(meshes[name].geometry),
  p:[i*2,9.38008564,0,i*2+1,9.38008564,0,i*2,8.79,1],
  n:[0,1,0,0,1,0,0,1,0],ix:[0,1,2]
 })),divider:{name:'8_REF_AYIRICI',expected:expected(divider.geometry),vertices:[0,1,2],from:[9.358031075448418,9.948030988205531],to:[9.38008564,9.42494970]},grassFill:{name:'8_CIM_STUB_DOLGU',expected:expected(fill.geometry),source:'3_CIMEN',sourceExpected:expected(grass.geometry)}};
 return {root,patch,meshes,divider,grass,fill};
}
function snapshot(root){return root.children.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,position:mesh.geometry.attributes.position.array.slice(),index:Array.from(mesh.geometry.index.array)}));}
function assertUntouched(before){
 for(const row of before){
  assert.equal(row.mesh.geometry,row.geometry,`${row.mesh.name} geometry was changed`);
  assert.equal(row.mesh.material,row.material,`${row.mesh.name} material was changed`);
  assert.deepEqual(row.mesh.geometry.attributes.position.array,row.position,`${row.mesh.name} position was changed`);
  assert.deepEqual(Array.from(row.mesh.geometry.index.array),row.index,`${row.mesh.name} index was changed`);
 }
}
function worldPosition(mesh,index,out=new T.Vector3()){
 return out.fromBufferAttribute(mesh.geometry.attributes.position,index).applyMatrix4(mesh.matrixWorld);
}
function appendedWorldRoundTrip(mesh,row,index){
 const point=new T.Vector3(Math.fround(row.p[index*3]),Math.fround(row.p[index*3+1]),Math.fround(row.p[index*3+2]));
 point.applyMatrix4(mesh.matrixWorld.clone().invert());
 point.set(Math.fround(point.x),Math.fround(point.y),Math.fround(point.z));
 return point.applyMatrix4(mesh.matrixWorld).toArray();
}
function topCoverage(meshes){
 const bins=new Map(),broad=[],cell=1,put=(key,triangle)=>{if(!bins.has(key))bins.set(key,[]);bins.get(key).push(triangle);};
 for(const mesh of meshes)for(let i=0;i<mesh.geometry.index.count;i+=3){
  const a=worldPosition(mesh,mesh.geometry.index.getX(i)).toArray(),b=worldPosition(mesh,mesh.geometry.index.getX(i+1)).toArray(),c=worldPosition(mesh,mesh.geometry.index.getX(i+2)).toArray();
  const normal=new T.Vector3().fromArray(b).sub(new T.Vector3().fromArray(a)).cross(new T.Vector3().fromArray(c).sub(new T.Vector3().fromArray(a)));
  if(normal.y<=0||Math.abs((b[0]-c[0])*(a[2]-c[2])-(b[2]-c[2])*(a[0]-c[0]))<1e-12)continue;
  const triangle=[a,b,c],x0=Math.floor(Math.min(a[0],b[0],c[0])/cell),x1=Math.floor(Math.max(a[0],b[0],c[0])/cell),z0=Math.floor(Math.min(a[2],b[2],c[2])/cell),z1=Math.floor(Math.max(a[2],b[2],c[2])/cell);
  if((x1-x0+1)*(z1-z0+1)>128)broad.push(triangle);else for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)put(`${x},${z}`,triangle);
 }
 const covers=(triangle,x,z)=>{const [a,b,c]=triangle,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7;};
 return (x,z)=>[...(bins.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)||[]),...broad].some(triangle=>covers(triangle,x,z));
}
const GRASS_SEAM_WINDOWS=[[224.10,130.50,224.50,130.76],[225.05,130.50,225.55,130.76]];
function triangleTouchesWindow(points,[x0,z0,x1,z1]){
 const inside=([x,z])=>x>=x0&&x<=x1&&z>=z0&&z<=z1,orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const on=(a,b,p)=>Math.min(a[0],b[0])<=p[0]&&p[0]<=Math.max(a[0],b[0])&&Math.min(a[1],b[1])<=p[1]&&p[1]<=Math.max(a[1],b[1]);
 const crosses=(a,b,c,d)=>{const ab1=orient(a,b,c),ab2=orient(a,b,d),cd1=orient(c,d,a),cd2=orient(c,d,b);return ab1*ab2<=0&&cd1*cd2<=0&&(!(ab1===0)||on(a,b,c))&&(!(ab2===0)||on(a,b,d))&&(!(cd1===0)||on(c,d,a))&&(!(cd2===0)||on(c,d,b));};
 const inTriangle=point=>{const [a,b,c]=points,u=orient(a,b,point),v=orient(b,c,point),w=orient(c,a,point);return(u>=0&&v>=0&&w>=0)||(u<=0&&v<=0&&w<=0);};
 const corners=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
 const edges=[[corners[0],corners[1]],[corners[1],corners[2]],[corners[2],corners[3]],[corners[3],corners[0]]];
 return points.some(inside)||corners.some(inTriangle)||points.some((point,i)=>edges.some(([a,b])=>crosses(point,points[(i+1)%3],a,b)));
}
function sourceRoot(data){
 const wanted=new Set([...TARGETS,'8_REF_AYIRICI','3_CIMEN','8_CIM_STUB_DOLGU']),root=new T.Group();
 for(const row of data.meshes.filter(row=>wanted.has(row.name))){
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(row.p,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));g.setIndex(row.ix);
  const material=row.name==='3_CIMEN'?new T.MeshPhysicalMaterial({color:0x4f8b42,roughness:.8}):new T.MeshStandardMaterial({color:0xddc0be});
  const mesh=new T.Mesh(g,material);mesh.name=row.name;
  mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(row.matrix);root.add(mesh);
 }
 root.updateMatrixWorld(true);return root;
}
const DIVIDER_PARTS=[
 [-156.95848,83.59622,-135.91720,84.40378],[-156.95848,95.99622,-135.91720,96.80377],[-151.16458,49.98322,-137.09331,63.18735],
 [-143.40377,128.81216,-142.59622,149.85344],[-107.95377,128.81216,-107.14622,149.85344],[14.29918,130.73717,15.10673,151.77844],
 [74.35676,130.73717,75.16432,151.77844],[134.41434,130.73717,135.22189,151.77844],[186.93475,130.73717,187.74231,151.77844],[224.38080,130.40068,225.18834,142.55000]
];
function dividerPart(point){return DIVIDER_PARTS.findIndex(([x0,z0,x1,z1])=>point[0]>=x0-.001&&point[0]<=x1+.001&&point[2]>=z0-.001&&point[2]<=z1+.001);}
function outline(row){
 const [,sx,sz]=row.name.match(/CENTER_WHITE71_(-?1)_(-?1)$/).map(Number),points=[];
 for(let i=0;i<row.ix.length;i+=3){
  const vertices=[row.ix[i],row.ix[i+1],row.ix[i+2]],top=vertices.filter(v=>Math.abs(row.p[v*3+1]-9.38008564)<1e-6);
  if(top.length!==2||vertices.some(v=>Math.abs(row.p[v*3+1]-8.79)<1e-6)===false)continue;
  for(const v of top)points.push([(row.p[v*3]-49.3719545)*sx,(row.p[v*3+2]+32.327407)*sz]);
 }
 return points;
}
function sameOutline(a,b){
 const nearest=(point,points)=>Math.min(...points.map(other=>Math.hypot(point[0]-other[0],point[1]-other[1])));
 return a.length&&b.length&&a.every(point=>nearest(point,b)<5e-4)&&b.every(point=>nearest(point,a)<5e-4);
}

test('map-edge finish is atomic, preserves materials and attributes, and fits only the selected divider',()=>{
 const {root,patch,meshes,divider,grass,fill}=synthetic(),before=snapshot(root),dividerBefore=divider.geometry.attributes.position.array.slice();
 const result=applyMapEdgeFinish(root,patch);
 assert.equal(result.addedDrawCalls,0);assert.equal(result.perFrameWork,0);assert.equal(result.grassFillMaterialMatched,true);assert.equal(applyMapEdgeFinish(root,patch),result);
 for(const name of TARGETS){
  const mesh=meshes[name],old=before.find(row=>row.mesh===mesh),g=mesh.geometry;
  assert.equal(mesh.material,old.material);assert.deepEqual(Object.keys(g.attributes).sort(),['color','normal','position','uv']);
  if(!SLABS.includes(name)){
   assert.deepEqual(g.attributes.position.array.slice(0,old.position.length),old.position);
   assert.deepEqual(g.attributes.uv.array.slice(0,old.geometry.attributes.uv.array.length),old.geometry.attributes.uv.array);
   assert.deepEqual(g.attributes.color.array.slice(0,old.geometry.attributes.color.array.length),old.geometry.attributes.color.array);
  }
 }
 const curb=meshes['7_KALDIRIM_TABANI'];assert.deepEqual(Array.from(curb.geometry.index.array),[3,4,5,6,7,8],'curb clipping must retain only the source-index complement before its new faces');
 assert.equal(grass.material,before.find(row=>row.mesh===grass).material);assert.deepEqual(grass.geometry.attributes.position.array.slice(0,before.find(row=>row.mesh===grass).position.length),before.find(row=>row.mesh===grass).position,'grass source positions changed');
 assert.equal(fill.geometry,before.find(row=>row.mesh===fill).geometry,'grass fill geometry changed');assert.equal(fill.material,grass.material,'grass fill did not share the source grass material');
 const after=divider.geometry.attributes.position.array,selected=new Set(patch.divider.vertices),scale=(patch.divider.to[1]-patch.divider.to[0])/(patch.divider.from[1]-patch.divider.from[0]);
 for(let i=0;i<divider.geometry.attributes.position.count;i++){
  const at=i*3;if(selected.has(i)){
   close(after[at],dividerBefore[at],'selected divider x');close(after[at+2],dividerBefore[at+2],'selected divider z');
   close(after[at+1],dividerBefore[at+1]*scale+patch.divider.to[0]-patch.divider.from[0]*scale,'selected divider y');
  }else assert.deepEqual([...after.slice(at,at+3)],[...dividerBefore.slice(at,at+3)],'unselected divider vertex changed');
 }
});

test('map-edge finish rolls back a corrupt index CRC and malformed late divider selection',()=>{
 for(const mutate of [p=>p.meshes[2].expected.indexCRC='00000000',p=>p.divider.vertices.push(3)]){
  const {root,patch}=synthetic(),before=snapshot(root);mutate(patch);
  assert.throws(()=>applyMapEdgeFinish(root,patch));assertUntouched(before);assert.equal(root.userData.mapEdgeFinish1,undefined);
 }
});

test('invalid grass-fill source CRC rolls back both grass and fill without changing geometry',()=>{
 const {root,patch,grass,fill}=synthetic(),before=snapshot(root);patch.grassFill.sourceExpected.indexCRC='00000000';
 assert.throws(()=>applyMapEdgeFinish(root,patch),/source changed/);assertUntouched(before);assert.equal(grass.geometry,before.find(row=>row.mesh===grass).geometry);assert.equal(fill.geometry,before.find(row=>row.mesh===fill).geometry);assert.equal(root.userData.mapEdgeFinish1,undefined);
});

test('map-edge finish rejects malformed clipping without changing the map',()=>{
 for(const mutate of [p=>p.meshes[0].remove=[1],p=>p.meshes[0].remove=[0,0],p=>p.meshes[0].remove=[99],p=>p.meshes[3].remove=[0]]){
  const {root,patch}=synthetic(),before=snapshot(root);mutate(patch);
  assert.throws(()=>applyMapEdgeFinish(root,patch),/clipping/);assertUntouched(before);assert.equal(root.userData.mapEdgeFinish1,undefined);
 }
});

test('published map-edge patch has its eight exact targets and four mirrored slab outlines',()=>{
 const patch=JSON.parse(fs.readFileSync(PATCH_URL));
 assert.equal(patch.version,1);assert.deepEqual(patch.meshes.map(row=>row.name).sort(),[...TARGETS].sort());
 assert.equal(patch.divider.name,'8_REF_AYIRICI');assert.equal(patch.divider.vertices.length,1242);
 const outlines=patch.meshes.filter(row=>SLABS.includes(row.name)).map(outline);
 for(const other of outlines.slice(1))assert(sameOutline(other,outlines[0]),'mirrored slabs must share one outer outline');
});

test('city curb keeps one rounded profile through the reported U08 corner tail',()=>{
 const patch=JSON.parse(fs.readFileSync(PATCH_URL)),profile=patch.metrics.cityCurbProfile;
 assert(profile,'missing authored city-curb repair');
 assert.deepEqual(profile.bounds,[-99.64092,23.7272,-15.099,116.34467]);
 assert.equal(profile.components,2);assert.deepEqual(profile.waterfrontBounds,[-123.94377,52.26979,-48.67662,115.88031]);
 assert(profile.outlineChangedArea<1.2&&profile.maxOutlineDeviation<.0101,'repair exceeded its sub-centimetre outline cleanup');
 assert.equal(profile.closedMicroscopicCracks,23);
 assert.equal(profile.bevelRadius,.06);close(profile.top,9.38008564);
 const row=patch.meshes.find(row=>row.name==='6_BORDUR'),g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(row.p,3));g.setIndex(row.ix);
 const curb=new T.Mesh(g,new T.MeshBasicMaterial());curb.updateMatrixWorld(true);
 // The old last 1.9 m went straight to the cap, instead of retaining this
 // 6 cm bevel. Probe both sides of that exact transition, not just its top.
 for(const y of [9.335,9.35,9.37]){
  const insets=[];
  for(const z of [113.8,114.20,114.30,114.8,115.5,116.0]){
   const hit=new T.Raycaster(new T.Vector3(-14,y,z),new T.Vector3(-1,0,0),0,2).intersectObject(curb,false)[0];
   const base=new T.Raycaster(new T.Vector3(-14,9.30,z),new T.Vector3(-1,0,0),0,2).intersectObject(curb,false)[0];
   assert(hit&&base,`missing city bevel at ${y},${z}`);
   const inset=base.point.x-hit.point.x;insets.push(inset);
   assert(inset>.001&&inset<.06,`unrounded city tail at ${y},${z}`);
  }
  // Compare the inset relative to the finished outer edge, so minor outline
  // cleanup cannot hide a return to the old full-height, unrounded tail.
  assert(Math.max(...insets)-Math.min(...insets)<.0002,`bevel changes at the old join: ${insets}`);
 }
 const ray=new T.Raycaster(new T.Vector3(-15.18,20,115.5),new T.Vector3(0,-1,0));
 close(ray.intersectObject(curb,false)[0]?.point.y,9.38008564,'city cap height');
 g.dispose();curb.material.dispose();
});

test('maintained runtimes remove the divider highlight and finish edges before final ground sampling',()=>{
 for(const [file,sampler] of [['../island/runtime.js','terrainSampler=wrapParkEntryCapsSampler57'],['../island/runtime.bundle.js','B9=z8(']]){
  const runtime=fs.readFileSync(new URL(file,import.meta.url),'utf8'),finish=runtime.indexOf('dataset.mapEdgeFinish1='),ground=runtime.indexOf(sampler,finish);
  assert(!runtime.includes('diffuseColor.rgb*=1.0+k2A67*0.03;'),`${file} retains the stale divider highlight`);
  assert(runtime.includes('// No painted divider highlight: use the physical edge.'),`${file} is missing the physical-edge replacement`);
  assert(finish>=0&&ground>finish,`${file} must apply map-edge finish before final ground sampling`);
 }
});

test('actual source fixture: appended surfaces ray-hit, divider fit is isolated, and original grass positions are preserved',{skip:!process.env.MAP_EDGE_FIXTURE},()=>{
 const input=JSON.parse(fs.readFileSync(path.resolve(process.env.MAP_EDGE_FIXTURE))),patch=JSON.parse(fs.readFileSync(PATCH_URL));
 const root=sourceRoot(input),grass=root.getObjectByName('3_CIMEN'),fill=root.getObjectByName('8_CIM_STUB_DOLGU'),divider=root.getObjectByName('8_REF_AYIRICI');
 assert(grass&&fill&&divider,'fixture is missing required baseline meshes');
 const before=new Map(root.children.map(mesh=>[mesh.name,{geometry:mesh.geometry,material:mesh.material,position:mesh.geometry.attributes.position.array.slice(),world:Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>worldPosition(mesh,i).toArray())}]));
 const selected=new Set(patch.divider.vertices),dividerParts=before.get('8_REF_AYIRICI').world.map(dividerPart);
 assert(dividerParts.every(part=>part>=0),'fixture divider vertex falls outside its ten surveyed components');
 assert.deepEqual([...new Set(dividerParts)].sort((a,b)=>a-b),Array.from({length:10},(_,i)=>i),'fixture must retain all ten divider components');
 assert([...selected].every(i=>dividerParts[i]===2),'fit must be confined to the third divider component');
 assert.equal(dividerParts.filter(part=>part===2).length,selected.size,'fit must select every third-component vertex');
 const result=applyMapEdgeFinish(root,patch);assert.equal(result.perFrameWork,0);assert.equal(result.addedDrawCalls,0);
 assert.equal(grass.material,before.get('3_CIMEN').material);assert.deepEqual(grass.geometry.attributes.position.array.slice(0,before.get('3_CIMEN').position.length),before.get('3_CIMEN').position,'live grass source positions changed');
 assert.equal(fill.geometry,before.get('8_CIM_STUB_DOLGU').geometry,'live grass-fill geometry changed');assert.equal(fill.material,grass.material,'live grass fill did not share source grass material');
 assert.equal(patch.metrics.stubEntryClosures,2);assert.equal(patch.metrics.stubEntryOverlap,.002);
 const grassRow=patch.meshes.find(row=>row.name==='3_CIMEN'),grassBefore=before.get('3_CIMEN');
 assert.deepEqual(patch.metrics.grassSeamWindows,GRASS_SEAM_WINDOWS);assert(grassRow.remove.length>0,'grass seam must remove the old internal faces');
 for(const start of grassRow.remove){
  const points=[0,1,2].map(offset=>grassBefore.world[grassBefore.geometry.index.getX(start+offset)]).map(([x,,z])=>[x,z]);
  assert(GRASS_SEAM_WINDOWS.some(window=>triangleTouchesWindow(points,window)),`grass seam removed source face ${start} outside its two bounded windows`);
 }
 const border=root.getObjectByName('6_BORDUR'),groundMeshes=[...TARGETS,'8_CIM_STUB_DOLGU'].map(name=>root.getObjectByName(name));
 for(const [x0,x1,z0,z1] of [[-146.80959,-141.84496,128.18393,128.68593],[-111.74627,-106.80014,128.18393,128.68593]])for(let x=x0+.1;x<x1-.099;x+=.25)for(let z=z0+.025;z<z1-.024;z+=.1){
  const ray=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)),cap=ray.intersectObject(border,false),all=ray.intersectObjects(groundMeshes,false);
  assert(cap.some(hit=>Math.abs(hit.point.y-9.38008564)<1e-4),`6_BORDUR cap gap at ${x.toFixed(3)},${z.toFixed(3)}`);
  assert(!all.some(hit=>hit.point.y>9.425),`entry blocker above safe cap at ${x.toFixed(3)},${z.toFixed(3)}`);
 }
 for(const [x0,z0,x1,z1] of GRASS_SEAM_WINDOWS)for(let x=x0+.02;x<x1-.019;x+=.08)for(let z=z0+.02;z<z1-.019;z+=.06){
  const ray=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)),grassHits=ray.intersectObject(grass,false),all=ray.intersectObjects(groundMeshes,false);
  assert(grassHits.some(hit=>hit.point.y>=9.38&&hit.point.y<=9.425),`grass seam cap gap at ${x.toFixed(3)},${z.toFixed(3)}`);
  assert(!all.some(hit=>hit.point.y>9.425),`grass seam blocker above safe cap at ${x.toFixed(3)},${z.toFixed(3)}`);
 }
 assert.equal(patch.metrics.grassFrontZ,128.58658);assert(patch.metrics.grassFrontFillArea>1,'straight grass fronts were not filled');
 for(const [x0,x1] of [[-146.80959,-141.84496],[-111.74627,-106.80014]])for(let x=x0-.19;x<x1+.19;x+=.1){
  const hits=new T.Raycaster(new T.Vector3(x,20,128.60),new T.Vector3(0,-1,0)).intersectObject(grass,false);
  assert(hits.some(hit=>Math.abs(hit.point.y-9.398031)<1e-4),`crooked grass front at x=${x.toFixed(3)}`);
 }
 const dividerBefore=before.get('8_REF_AYIRICI').world,scale=(patch.divider.to[1]-patch.divider.to[0])/(patch.divider.from[1]-patch.divider.from[0]);
 for(let i=0;i<divider.geometry.attributes.position.count;i++){
  const now=worldPosition(divider,i).toArray(),old=dividerBefore[i];
  if(selected.has(i)){
   close(now[0],old[0],'divider x');close(now[2],old[2],'divider z');close(now[1],old[1]*scale+patch.divider.to[0]-patch.divider.from[0]*scale,'divider y');
  }else assert.deepEqual(now,old,`divider vertex ${i} outside selected fit changed`);
 }
 for(let i=0;i<dividerParts.length;i++)if(dividerParts[i]!==2)assert.deepEqual(worldPosition(divider,i).toArray(),dividerBefore[i],`unchanged divider component vertex ${i}`);
 const groundCoverage=topCoverage([...TARGETS,'8_CIM_STUB_DOLGU'].map(name=>root.getObjectByName(name)));
 let top=0,side=0,rays=0;
 for(const row of patch.meshes){
  const target=root.getObjectByName(row.name),start=row.replace?0:row.expected.vertices;
  // Ask the final target, not an isolated added mesh, which side of an
  // appended wall is solid. A clipped curb can intentionally rely on its
  // retained source-index complement at that boundary.
  const topAt=groundCoverage;
  for(let i=0;i<row.ix.length;i+=3){
   const a=worldPosition(target,start+row.ix[i]),b=worldPosition(target,start+row.ix[i+1]),c=worldPosition(target,start+row.ix[i+2]);
   const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a));assert(normal.lengthSq()>1e-24,`${row.name} has a degenerate appended triangle ${i/3} [${row.ix.slice(i,i+3)}]`);normal.normalize();
   if(normal.y>.5)top++;else if(Math.abs(normal.y)<.5)side++;
   const center=a.clone().add(b).add(c).multiplyScalar(1/3);let origin,direction;
   let sideProbe='';if(Math.abs(normal.y)<.5){
    // Determine exterior from the top cap, then approach each wall from that
    // exterior point. This rejects inward-wound walls that a normal-following
    // ray would incorrectly accept.
    const horizontal=new T.Vector3(normal.x,0,normal.z).normalize();let outside=null,buried=false,probes=[];
    for(const distance of [.000016,.00008,.0004,.002,.01]){
     const plus=topAt(center.x+horizontal.x*distance,center.z+horizontal.z*distance),minus=topAt(center.x-horizontal.x*distance,center.z-horizontal.z*distance);
     probes.push(`${distance}:${plus?'in':'out'}/${minus?'in':'out'}`);
     if(plus&&minus){buried=true;break;}
     if(plus!==minus){outside=(plus?horizontal.clone().negate():horizontal).multiplyScalar(distance);break;}
    }
    // A clipped source complement can bury a join wall on both sides. It is
    // still covered, but has no visible exterior for a winding assertion.
    sideProbe=probes.join(',');assert(outside||buried,`${row.name} side ${i/3} leaves neither exterior nor supported coverage (${sideProbe})`);
    if(outside){origin=center.clone().add(outside);direction=outside.clone().negate().normalize();}
    else {origin=center.clone().addScaledVector(normal,.000016);direction=normal.clone().negate();}
   }else{origin=center.clone().addScaledVector(normal,.01);direction=normal.clone().negate();}
   const hit=new T.Ray(origin,direction).intersectTriangle(a,b,c,true,new T.Vector3());
   assert(hit&&hit.distanceTo(origin)<.011,`${row.name} appended triangle ${i/3} is not ray-covered ${sideProbe}`);rays++;
  }
  if(!row.replace)assert.deepEqual(target.geometry.attributes.position.array.slice(0,before.get(row.name).position.length),before.get(row.name).position,`${row.name} changed original vertices`);
  if(!row.replace){
   const removed=new Set(row.remove||[]),expectedIndex=[];
   for(let j=0;j<before.get(row.name).geometry.index.count;j+=3)if(!removed.has(j))expectedIndex.push(before.get(row.name).geometry.index.getX(j),before.get(row.name).geometry.index.getX(j+1),before.get(row.name).geometry.index.getX(j+2));
   expectedIndex.push(...row.ix.map(index=>row.expected.vertices+index));assert.deepEqual(Array.from(target.geometry.index.array),expectedIndex,`${row.name} did not retain exactly its source-index complement`);
  }
  for(let i=0;i<row.p.length/3;i++){
   const actual=worldPosition(target,start+i).toArray(),expectedPoint=appendedWorldRoundTrip(target,row,i);for(let j=0;j<3;j++)closeRoundTrip(actual[j],expectedPoint[j],`${row.name} appended vertex ${i}`);
  }
 }
 assert(top>0&&side>0,'actual patch must contain both top and side faces');assert.equal(rays,patch.meshes.reduce((n,row)=>n+row.ix.length/3,0));
});
