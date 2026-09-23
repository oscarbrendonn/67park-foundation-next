import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {Box3,Matrix4} from 'three';
const root=new URL('../',import.meta.url),read=f=>fs.readFileSync(new URL(f,root));
async function load(f){const b=read(f);return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const old=await load('island/park-toys-v57.glb'),next=await load('island/park-animals-1.glb');
const layout=JSON.parse(read('island/park-layout-v57.json'));
function snapshot(root){
 root.updateMatrixWorld(true);const parts=[];
 root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,values=[];
  for(let j=0;j<g.index.count;j++){const i=g.index.getX(j);for(const key of Object.keys(g.attributes).sort()){const a=g.attributes[key];for(let k=0;k<a.itemSize;k++)values.push(a.getComponent(i,k));}}
  const mat=m.material;
  parts.push({data:createHash('sha256').update(Buffer.from(new Float64Array(values).buffer)).digest('hex'),triangles:g.index.count/3,world:m.matrixWorld.toArray(),color:mat.color.toArray(),roughness:mat.roughness,metalness:mat.metalness,ior:mat.ior,specular:mat.specularIntensity,side:mat.side});
 });return parts;
}
test('original cows, kennels and existing platform retain exact rendered geometry/materials',()=>{
 for(const name of ['toy-bull-orange','kennel-coral','kennel-blue','kennel-yellow','sculpture-plinth-warm-blush'])assert.deepEqual(snapshot(next.getObjectByName(name)),snapshot(old.getObjectByName(name)),name);
 assert(!next.getObjectByName('toy-figure-pink'));assert(!next.getObjectByName('toy-ball-pink'));
 assert.equal(next.children.filter(n=>/plinth/.test(n.name)).length,1);
});
test('both approved elephants retain exact optimized geometry and colors; shared binary stays smaller',async()=>{
 for(const color of ['yellow','pink']){
  const source=await load(`../2026-09-23-67park-elephant-pair/optimized/${color}-elephant.glb`);
  assert.deepEqual(snapshot(next.getObjectByName(`toy-elephant-${color}`)),snapshot(source.children[0]));
 }
 assert(read('island/park-animals-1.glb').length<read('island/park-toys-v57.glb').length);
});
test('four evenly spaced facing animals, grounded and clear of the center and platform rim',()=>{
 const rows=layout.props.filter(p=>p.zone==='sculpture');assert.equal(rows.length,4);
 const byId=new Map(rows.map(p=>[p.id,p]));
 for(const [cow,elephant]of [['bull-north','elephant-yellow'],['bull-west','elephant-pink']]){
  const a=byId.get(cow),b=byId.get(elephant);assert.equal(a.z,b.z);assert.equal(a.yaw,0);assert.equal(b.yaw,Math.PI);
 }
 for(const p of rows){const box=new Box3().setFromObject(next.getObjectByName(p.asset));assert(Math.abs(box.min.y)<1e-6);
  const m=new Matrix4().makeRotationY(p.yaw);m.scale({x:p.scale,y:p.scale,z:p.scale});m.setPosition(p.x,9.718031,p.z);box.applyMatrix4(m);
  assert(box.max.x<138.6||box.min.x>143.8,'at least 5.2m center corridor');
  for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])assert(Math.hypot(x-140.705,z-47.002)<11.5,'rim clearance');
  assert(box.max.y-box.min.y>3.9&&box.max.y-box.min.y<4.05,'coherent animal heights');
 }
 const before=JSON.parse(execFileSync('git',['show','HEAD:island/park-layout-v57.json'],{cwd:root,encoding:'utf8'}));
 assert.deepEqual(layout.props.filter(p=>p.zone!=='sculpture'),before.props.filter(p=>p.zone!=='sculpture'));assert.deepEqual(layout.plants,before.plants);
});
test('source and integrated runtime match asset paths and include sculpture colliders only',()=>{
 const bundle=read('island/runtime.bundle.js').toString(),source=read('island/park-props-v63.js').toString();
 for(const file of ['park-animals-1.glb?v=animals-1','park-layout-v57.json?v=animals-1']){assert(bundle.includes(file));assert(source.includes(file));}
 const previous=execFileSync('git',['show','HEAD:island/runtime.bundle.js'],{cwd:root,encoding:'utf8',maxBuffer:10e6});
 assert(source.includes("rows.filter(p=>!['plinth','bridge'].includes(p.zone)&&p.asset!=='shrub')"));
 assert.equal(bundle,previous.replaceAll('park-toys-v57.glb?v=1','park-animals-1.glb?v=animals-1').replaceAll('park-layout-v57.json?v=1','park-layout-v57.json?v=animals-1').replace('v.filter(C=>!["plinth","bridge","sculpture"].includes(C.zone)&&C.asset!=="shrub")','v.filter(C=>!["plinth","bridge"].includes(C.zone)&&C.asset!=="shrub")'));
});
