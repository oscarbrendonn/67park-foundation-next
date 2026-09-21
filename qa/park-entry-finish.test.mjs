import {register} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {boundaryPositionCRC}=await import('../app/terrain-boundaries.js');
const {applyParkEntryFinish}=await import('../app/park-entry-finish.js');

const PATCH_URL=new URL('../repairs/park-entry-finish-1.json',import.meta.url);
const BASES=['6_BORDUR','7_KALDIRIM_TABANI'];
const SLOTS=['7_KALDIRIM_TABANI_PARK_ENTRY57_WEST_SLOT','7_KALDIRIM_TABANI_PARK_ENTRY57_EAST_SLOT'];
const TIPS=['6_BORDUR_PARK_ENTRY57_WEST_TIP','6_BORDUR_PARK_ENTRY57_EAST_TIP'];
const TARGETS=[...BASES,...SLOTS,...TIPS];
const WINDOWS=[[167.14,113.48,168.59,116.34474498],[175.58,113.48,177.04,116.34474498]];
const TOP=9.38008564,BOTTOM=8.79;

const indexCRC=g=>boundaryPositionCRC(Uint32Array.from(g.index.array));
const expected=g=>({vertices:g.attributes.position.count,indices:g.index.count,positionCRC:boundaryPositionCRC(g.attributes.position.array),indexCRC:indexCRC(g)});
const close=(actual,expectedValue,message)=>assert(Math.abs(actual-expectedValue)<1e-5,`${message}: ${actual} != ${expectedValue}`);

function sourceGeometry(offset=0){
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute([offset,9.38,0,offset+1,9.38,0,offset,9.38,1,offset+2,9.38,0,offset+3,9.38,0,offset+2,9.38,1],3));
 g.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3));
 g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],2));
 g.setAttribute('color',new T.Uint8BufferAttribute([10,20,30,11,21,31,12,22,32,13,23,33,14,24,34,15,25,35],3,true));
 g.setIndex([0,1,2,3,4,5]);
 return g;
}
function add(root,name,geometry=sourceGeometry(),material=new T.MeshStandardMaterial({color:0xdcc0be})){
 const mesh=new T.Mesh(geometry,material);mesh.name=name;root.add(mesh);return mesh;
}
function shoulder(window){
 const [x0,z0,x1,z1]=window;
 const corners=[[x0,TOP,z0],[x1,TOP,z0],[x1,TOP,z1],[x0,TOP,z1],[x0,BOTTOM,z0],[x1,BOTTOM,z0],[x1,BOTTOM,z1],[x0,BOTTOM,z1]];
 const p=[],n=[],ix=[];
 for(const [ids,normal] of [
  [[0,1,2,3],[0,1,0]],[[4,5,6,7],[0,-1,0]],[[0,1,5,4],[0,0,-1]],
  [[1,2,6,5],[1,0,0]],[[2,3,7,6],[0,0,1]],[[3,0,4,7],[-1,0,0]]
 ])for(const triangle of [[0,1,2],[0,2,3]]){
  const start=p.length/3;
  for(const id of triangle){p.push(...corners[ids[id]]);n.push(...normal);}
  ix.push(start,start+1,start+2);
 }
 return {p,n,ix};
}
function synthetic(){
 const root=new T.Group(),meshes={};
 for(const [index,name] of TARGETS.entries())meshes[name]=add(root,name,sourceGeometry(index*10));
 const grass=add(root,'3_CIMEN',sourceGeometry(80),new T.MeshPhysicalMaterial({color:0x4f8b42,roughness:.8}));
 const pathMesh=add(root,'8_PARK_PATIKA_UST',sourceGeometry(90),new T.MeshStandardMaterial({color:0xf0d5c5}));
 root.updateMatrixWorld(true);
 const rows=TARGETS.map((name,index)=>{
  const replace=!BASES.includes(name),row={name,replace,expected:expected(meshes[name].geometry),remove:[]};
  if(TIPS.includes(name))return {...row,p:[],n:[],ix:[]};
  if(SLOTS.includes(name))return {...row,...shoulder(WINDOWS[SLOTS.indexOf(name)])};
  return {...row,remove:[0],p:[index,TOP,0,index+1,TOP,0,index,TOP,1],n:[0,1,0,0,1,0,0,1,0],ix:[0,1,2]};
 });
 return {root,meshes,grass,pathMesh,patch:{version:1,top:TOP,bottom:BOTTOM,windows:structuredClone(WINDOWS),metrics:{fixture:true},meshes:rows}};
}
function snapshot(root){
 return root.children.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,position:mesh.geometry.attributes.position.array.slice(),normal:mesh.geometry.attributes.normal.array.slice(),index:Array.from(mesh.geometry.index.array)}));
}
function assertUntouched(before){
 for(const row of before){
  assert.equal(row.mesh.geometry,row.geometry,`${row.mesh.name} geometry changed during rejected transaction`);
  assert.equal(row.mesh.material,row.material,`${row.mesh.name} material changed during rejected transaction`);
  assert.deepEqual(row.mesh.geometry.attributes.position.array,row.position,`${row.mesh.name} positions changed during rejected transaction`);
  assert.deepEqual(row.mesh.geometry.attributes.normal.array,row.normal,`${row.mesh.name} normals changed during rejected transaction`);
  assert.deepEqual(Array.from(row.mesh.geometry.index.array),row.index,`${row.mesh.name} indices changed during rejected transaction`);
 }
}
function triangle(row,offset){
 return [0,1,2].map(index=>new T.Vector3().fromArray(row.p,(row.ix[offset+index]||0)*3));
}
function shoulderContract(row,window){
 assert.equal(row.p.length/3,36,`${row.name} must use twelve independent shoulder triangles`);
 assert.equal(row.ix.length,36,`${row.name} must have twelve shoulder faces`);
 const seen=new Set(),counts={top:0,bottom:0,side:0};
 const centre=new T.Vector3((window[0]+window[2])/2,0,(window[1]+window[3])/2);
 for(let i=0;i<row.ix.length;i+=3){
  const vertices=triangle(row,i),edgeA=vertices[1].clone().sub(vertices[0]),edgeB=vertices[2].clone().sub(vertices[0]);
  const normal=edgeA.cross(edgeB),area=normal.length();
  assert(area>1e-6,`${row.name} has a degenerate shoulder face`);normal.normalize();
  const key=vertices.map(v=>v.toArray().map(value=>value.toFixed(7)).join(',')).sort().join('|');
  assert(!seen.has(key),`${row.name} duplicates a shoulder face`);seen.add(key);
  const levels=vertices.map(v=>v.y),allTop=levels.every(y=>Math.abs(y-TOP)<1e-7),allBottom=levels.every(y=>Math.abs(y-BOTTOM)<1e-7);
  if(allTop){counts.top++;assert(normal.y>.999,`${row.name} cap is not upward`);}
  else if(allBottom){counts.bottom++;assert(normal.y<-.999,`${row.name} underside is not outward`);}
  else{
   counts.side++;assert(levels.some(y=>Math.abs(y-TOP)<1e-7)&&levels.some(y=>Math.abs(y-BOTTOM)<1e-7),`${row.name} mixes shoulder faces`);
   const midpoint=vertices.reduce((sum,v)=>sum.add(v),new T.Vector3()).multiplyScalar(1/3);
   const outward=new T.Vector3(midpoint.x-centre.x,0,midpoint.z-centre.z);
   assert(normal.dot(outward)>1e-5,`${row.name} side face is inward-wound`);
  }
 }
 assert.deepEqual(counts,{top:2,bottom:2,side:8},`${row.name} must be a closed six-face shoulder`);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(row.p,3));g.setIndex(row.ix);
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.FrontSide}));mesh.updateMatrixWorld(true);
 for(let x=window[0]+.11;x<window[2]-.10;x+=.19)for(let z=window[1]+.09;z<window[3]-.08;z+=.23){
  const hits=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)).intersectObject(mesh,false).filter(hit=>Math.abs(hit.point.y-TOP)<1e-5);
  assert.equal(hits.length,1,`${row.name} cap hole or duplicate at ${x.toFixed(3)},${z.toFixed(3)}`);
 }
 g.dispose();mesh.material.dispose();
}
function sourceRoot(data){
 const wanted=new Set([...TARGETS,'3_CIMEN','8_PARK_PATIKA_UST']),root=new T.Group();
 for(const row of data.meshes.filter(row=>wanted.has(row.name))){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(row.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));g.setIndex(row.ix);
  const material=row.name==='3_CIMEN'?new T.MeshPhysicalMaterial({color:0x4f8b42,roughness:.8}):new T.MeshStandardMaterial({color:0xddc0be});
  const mesh=new T.Mesh(g,material);mesh.name=row.name;mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(row.matrix);root.add(mesh);
 }
 root.updateMatrixWorld(true);return root;
}

test('park-entry finish is atomic, idempotent, and preserves objects, materials, attributes, and clipped complements',()=>{
 const {root,meshes,grass,pathMesh,patch}=synthetic(),before=snapshot(root);
 const result=applyParkEntryFinish(root,patch);
 assert.equal(result.addedDrawCalls,0);assert.equal(result.perFrameWork,0);assert.equal(result.materialsPreserved,true);assert.equal(applyParkEntryFinish(root,patch),result);
 for(const name of TARGETS){
  const mesh=meshes[name],old=before.find(row=>row.mesh===mesh),geometry=mesh.geometry;
  assert.equal(mesh,old.mesh,`${name} object was replaced`);assert.equal(mesh.material,old.material,`${name} material was replaced`);
  assert.deepEqual(Object.keys(geometry.attributes).sort(),['color','normal','position','uv']);
  assert.equal(geometry.attributes.color.normalized,true,`${name} normalized colour attribute changed`);
  if(BASES.includes(name)){
   assert.deepEqual(geometry.attributes.position.array.slice(0,old.position.length),old.position,`${name} source positions changed`);
   assert.deepEqual(geometry.attributes.normal.array.slice(0,old.normal.length),old.normal,`${name} source normals changed`);
   assert.deepEqual(Array.from(geometry.index.array),[3,4,5,6,7,8],`${name} does not retain the exact source-index complement`);
  }else if(SLOTS.includes(name))assert.equal(geometry.attributes.position.count,36,`${name} did not replace its obsolete rounded shoulder`);
  else {assert.equal(geometry.attributes.position.count,0,`${name} obsolete tip still has geometry`);assert.equal(geometry.index.count,0,`${name} obsolete tip still has faces`);}
 }
 for(const mesh of [grass,pathMesh]){
  const old=before.find(row=>row.mesh===mesh);assert.equal(mesh.geometry,old.geometry,`${mesh.name} geometry changed outside patch targets`);assert.equal(mesh.material,old.material,`${mesh.name} material changed outside patch targets`);
  assert.deepEqual(mesh.geometry.attributes.position.array,old.position,`${mesh.name} positions changed outside patch targets`);assert.deepEqual(Array.from(mesh.geometry.index.array),old.index,`${mesh.name} indices changed outside patch targets`);
 }
});

test('park-entry finish rejects source CRC/index CRC and late malformed geometry without partial mutation',()=>{
 const mutations=[
  patch=>patch.meshes[5].expected.positionCRC='00000000',
  patch=>patch.meshes[5].expected.indexCRC='00000000',
  patch=>patch.meshes[5].p=[0,TOP,0],
  patch=>patch.meshes[4].remove=[0],
  patch=>patch.meshes[3].p[1]=TOP+.01,
  patch=>patch.meshes[1].remove=[0,0]
 ];
 for(const mutate of mutations){
  const {root,patch}=synthetic(),before=snapshot(root);mutate(patch);
  assert.throws(()=>applyParkEntryFinish(root,patch));assertUntouched(before);assert.equal(root.userData.parkEntryFinish1,undefined);
 }
});

test('published park-entry patch is six bounded targets with closed, upward, outward, gap-free shoulders',()=>{
 const patch=JSON.parse(fs.readFileSync(PATCH_URL));
 assert.equal(patch.version,1);assert.equal(patch.top,TOP);assert.equal(patch.bottom,BOTTOM);assert.deepEqual(patch.windows,WINDOWS);
 assert.deepEqual(patch.meshes.map(row=>row.name).sort(),[...TARGETS].sort());assert.equal(patch.metrics.shoulders,2);assert.equal(patch.metrics.addedDrawCalls,0);assert.equal(patch.metrics.perFrameWork,0);assert.equal(patch.metrics.pathAndGrassUnchanged,true);
 for(const name of BASES){const row=patch.meshes.find(row=>row.name===name);assert.equal(row.replace,false);assert(row.remove.length>0,`${name} must clip source faces`);assert(row.p.length&&row.ix.length,`${name} must append the clipped-face complement`);}
 for(const [index,name] of SLOTS.entries()){
  const row=patch.meshes.find(row=>row.name===name);assert.equal(row.replace,true);assert.deepEqual(row.remove,[]);shoulderContract(row,WINDOWS[index]);
 }
 for(const name of TIPS){const row=patch.meshes.find(row=>row.name===name);assert.equal(row.replace,true);assert.deepEqual(row.remove,[]);assert.deepEqual(row.p,[]);assert.deepEqual(row.n,[]);assert.deepEqual(row.ix,[]);}
});

test('both published loaders apply the park repair before final stair and terrain indexing',()=>{
 const revision='park-entry-finish-1';
 for(const file of ['island/runtime.js','island/runtime.bundle.js']){
  const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert(source.includes("import {applyParkEntryFinish} from '../app/park-entry-finish.js?v="+revision+"'"),file);
  assert.equal(source.split('dataset.parkEntryFinish1=').length,2,file);
  const repair=source.indexOf('dataset.parkEntryFinish1='),stairs=source.indexOf('dataset.stairGeometry=',repair);
  assert(repair>source.indexOf('dataset.mapEdgeFinish1=')&&repair>source.indexOf('dataset.sidewalkMaterials1='),file+' requires the exact source geometry and material first');
  assert(stairs>repair,file+' must precede the final stair and terrain pass');
  const finalSampler=file.endsWith('bundle.js')?'B9=z8(N8(B8(P8(G8(':'terrainSampler=wrapParkEntryCapsSampler57(';
  assert(source.indexOf(finalSampler,stairs)>stairs,file+' must rebuild final ground queries');
  assert(source.includes('repairs/park-entry-finish-1.json?v='+revision),file);
 }
 const gate=fs.readFileSync(new URL('./foundation-browser.cjs',import.meta.url),'utf8');
 assert(gate.includes("require('./park-entry-finish.browser.cjs')(page,{mobile,check})"));
});

if(process.env.PARK_ENTRY_FIXTURE)test('park-entry fixture keeps unrelated grass/path pointers and fully covers both repaired entry shoulders',()=>{
 const data=JSON.parse(fs.readFileSync(path.resolve(process.env.PARK_ENTRY_FIXTURE))),patch=JSON.parse(fs.readFileSync(PATCH_URL)),root=sourceRoot(data);
 const required=[...TARGETS,'3_CIMEN','8_PARK_PATIKA_UST'];for(const name of required)assert(root.getObjectByName(name),`fixture missing ${name}`);
 const before=new Map(root.children.map(mesh=>[mesh.name,{mesh,geometry:mesh.geometry,material:mesh.material,position:mesh.geometry.attributes.position.array.slice(),index:Array.from(mesh.geometry.index.array)}]));
 const result=applyParkEntryFinish(root,patch);assert.equal(result.addedDrawCalls,0);assert.equal(result.perFrameWork,0);root.updateMatrixWorld(true);
 for(const name of ['3_CIMEN','8_PARK_PATIKA_UST']){
  const mesh=root.getObjectByName(name),old=before.get(name);assert.equal(mesh.geometry,old.geometry,`${name} geometry pointer changed`);assert.equal(mesh.material,old.material,`${name} material changed`);assert.deepEqual(mesh.geometry.attributes.position.array,old.position,`${name} positions changed`);assert.deepEqual(Array.from(mesh.geometry.index.array),old.index,`${name} indices changed`);
 }
 for(const name of BASES){
  const mesh=root.getObjectByName(name),old=before.get(name),row=patch.meshes.find(row=>row.name===name),removed=new Set(row.remove),complement=[];
  for(let i=0;i<old.index.length;i+=3)if(!removed.has(i))complement.push(old.index[i],old.index[i+1],old.index[i+2]);
  assert.deepEqual(Array.from(mesh.geometry.index.array.slice(0,complement.length)),complement,`${name} did not preserve exact clipped source complement`);
  assert.deepEqual(mesh.geometry.attributes.position.array.slice(0,old.position.length),old.position,`${name} changed original source vertices`);
 }
 for(const [index,name] of SLOTS.entries()){
  const mesh=root.getObjectByName(name),window=WINDOWS[index];
  for(let x=window[0]+.12;x<window[2]-.11;x+=.17)for(let z=window[1]+.10;z<window[3]-.09;z+=.21){
   const hit=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)).intersectObject(mesh,false).find(hit=>Math.abs(hit.point.y-TOP)<1e-4);
   assert(hit,`${name} has an actual fixture cap gap at ${x.toFixed(3)},${z.toFixed(3)}`);close(hit.point.y,TOP,`${name} fixture cap height`);
  }
 }
});
