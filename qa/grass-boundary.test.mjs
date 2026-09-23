import {register} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {applyGrassBoundary}=await import('../app/grass-boundary.js');
const {boundaryPositionCRC}=await import('../app/terrain-boundaries.js');
const patch=JSON.parse(fs.readFileSync(new URL('../repairs/grass-boundary-1.json',import.meta.url)));

function fixture(){
 const root=new T.Group(),p=structuredClone(patch);
 for(const row of p.meshes){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([235,9.4,129,236,9.4,129,235,9.4,130],3));
  g.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));g.setIndex([0,2,1]);
  const m=new T.Mesh(g,new T.MeshStandardMaterial({color:0xddc0be}));m.name=row.name;root.add(m);
  row.expected={vertices:3,indices:3,positionCRC:boundaryPositionCRC(g.attributes.position.array)};
  row.remove=[0];row.p=[235,9.4,129,236,9.4,129,235.2,9.4,130];row.n=Array.from(g.attributes.normal.array);row.ix=[0,2,1];
 }
 return {root,p};
}

test('grass contour patch is bounded and uses the existing two surface materials',()=>{
 assert.equal(patch.version,1);assert.equal(patch.metrics.repairedSteps,2);
 assert.equal(patch.metrics.surveyedMeshes,23);assert(patch.metrics.surveyedParts>=100);
 assert(patch.metrics.grassAddedArea<.5);assert(patch.metrics.grassRemovedArea<1);
 assert(patch.metrics.uncoveredArea<1e-8);assert(patch.metrics.grassPavementOverlap<1e-8);
 assert(patch.metrics.triangleDelta<500);assert.equal(patch.metrics.addedDrawCalls,0);
 assert.deepEqual(patch.meshes.map(m=>m.name),['3_CIMEN','7_KALDIRIM_TABANI']);
 for(const row of patch.meshes){assert.equal(row.p.length,row.n.length);assert(row.p.every(Number.isFinite));assert(row.n.every(Number.isFinite));assert(row.ix.every(i=>Number.isInteger(i)&&i>=0&&i<row.p.length/3));}
});

test('grass repair is atomic when the second source changed',()=>{
 const {root,p}=fixture(),original=root.children.map(m=>m.geometry);
 p.meshes[1].expected.positionCRC='00000000';
 assert.throws(()=>applyGrassBoundary(root,p),/source changed/);
 assert.deepEqual(root.children.map(m=>m.geometry),original);assert.equal(root.userData.grassBoundary1,undefined);
});

test('grass repair preserves materials and original vertex data, and is idempotent',()=>{
 const {root,p}=fixture(),old=root.children.map(m=>({material:m.material,p:m.geometry.attributes.position.array.slice()}));
 const result=applyGrassBoundary(root,p);
 assert.equal(result.perFrameWork,0);assert.equal(applyGrassBoundary(root,p),result);
 root.children.forEach((m,i)=>{assert.equal(m.material,old[i].material);assert.deepEqual(m.geometry.attributes.position.array.slice(0,9),old[i].p);assert.equal(m.geometry.index.count,3);});
});

test('invalid or non-finite geometry cannot partially change the map',()=>{
 for(const mutate of [p=>p.meshes[1].p[0]=NaN,p=>p.meshes[1].ix[0]=1e9,p=>p.meshes[1].remove=[1],p=>p.meshes[1].name='5_YOL',p=>p.sites=null]){
  const {root,p}=fixture(),old=root.children.map(m=>m.geometry);mutate(p);
  assert.throws(()=>applyGrassBoundary(root,p));assert.deepEqual(root.children.map(m=>m.geometry),old);
 }
});

test('published loader runs the contour repair before the final terrain sampler',()=>{
 for(const file of ['../island/runtime.js','../island/runtime.bundle.js']){
  const s=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  assert(s.includes("import {applyGrassBoundary} from '../app/grass-boundary.js?v=grass-boundary-1'"));
  assert.equal(s.split('dataset.grassBoundary1=').length,2);
  assert(s.indexOf('dataset.grassBoundary1=')>s.indexOf('applyTerrainBoundaries('));
 }
 const main=fs.readFileSync(new URL('../app/main.js',import.meta.url),'utf8');
 assert(main.includes('runtime.bundle.js?v=photo-surfaces-1'));
 assert(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('app/main.js?v=camera-touch-1'));
});

test('live geometry: no sand opening, height discontinuity or material change', {skip:!process.env.GRASS_FIXTURE},async()=>{
 const {createTerrainSampler}=await import('../island/terrain-sampler-v27.js');
 const data=JSON.parse(fs.readFileSync(process.env.GRASS_FIXTURE)),root=new T.Group();
 for(const row of data.meshes.filter(m=>['3_CIMEN','7_KALDIRIM_TABANI'].includes(m.name))){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(row.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));g.setIndex(row.ix);
  const m=new T.Mesh(g,new T.MeshStandardMaterial({color:'#'+row.material[0][1]}));m.name=row.name;m.matrixAutoUpdate=false;m.matrix.fromArray(row.matrix);root.add(m);
 }
 root.updateMatrixWorld(true);
 const before=createTerrainSampler(root.children),materials=root.children.map(m=>m.material);
 const result=applyGrassBoundary(root,patch),after=createTerrainSampler(root.children);
 assert.deepEqual(root.children.map(m=>m.material),materials);
 let probes=0,maxDelta=0,worst=null;
 const [x0,z0,x1,z1]=patch.metrics.bounds;
 for(let x=x0-.03;x<x1+.03;x+=.02)for(let z=z0-.03;z<z1+.03;z+=.02){
  const a=before.sample(x,z),b=after.sample(x,z);
  if(!a||a.point.y<9.35)continue;
  assert(b&&b.point.y>9.375,'New opening at '+x+','+z);
  const delta=Math.abs(b.point.y-a.point.y);if(delta>maxDelta){maxDelta=delta;worst={x,z,before:a.point.y,after:b.point.y};}probes++;
 }
 // The grass is 18 mm above the pavement crown; the old notch also had
 // an 8 mm bevel. Filling that bevel must stay below a 3 cm walking step.
 assert(maxDelta<.03,JSON.stringify(worst));assert(probes>70000);assert.equal(result.triangleDelta,patch.metrics.triangleDelta);
 console.log('Live grass/pavement probes:',JSON.stringify({probes,maxDelta,triangleDelta:result.triangleDelta}));
});
