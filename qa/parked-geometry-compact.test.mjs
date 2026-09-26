import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {installParkedFleet,compactParkedGeometry,PARKED_FLEET} from '../app/parked-fleet.js';

function digest(g,indices){
 const hash=createHash('sha256');
 for(const [name,a]of Object.entries(g.attributes)){
  hash.update(name+':'+a.array.constructor.name+':'+a.itemSize+':'+a.normalized);
  const bytes=Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength),size=a.itemSize*a.array.BYTES_PER_ELEMENT;
  for(const i of indices)hash.update(bytes.subarray(i*size,(i+1)*size));
 }
 return hash.digest('hex');
}
test('actual SPORTS97: every retained triangle attribute is byte-identical; zero orphan vertices',async()=>{
 const bytes=fs.readFileSync(new URL('../island/northwest-sports-v97.glb',import.meta.url));
 const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const before=new Map();scene.traverse(o=>{if(o.isMesh)before.set(o,{geometry:o.geometry,material:o.material,matrix:o.matrix.clone()});});
 const fleet=installParkedFleet(scene);let changed=0;
 for(const [mesh,old]of before){
  assert.equal(mesh.material,old.material);assert(mesh.matrix.equals(old.matrix));
  if(mesh.geometry===old.geometry)continue;changed++;
  const p=old.geometry.attributes.position,ix=old.geometry.index,kept=[];
  for(let i=0;i<(ix?.count??p.count);i+=3){
   const tri=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);
   if(!PARKED_FLEET.some(([x,z])=>tri.every(j=>Math.abs(p.getX(j)-x)<1.31&&Math.abs(p.getZ(j)-z)<2.51&&p.getY(j)>.15&&p.getY(j)<2.07)))kept.push(...tri);
  }
  const packed=Array.from(mesh.geometry.index.array);
  assert.equal(packed.length,kept.length);assert.equal(digest(mesh.geometry,packed),digest(old.geometry,kept),mesh.name);
  assert.equal(new Set(packed).size,mesh.geometry.attributes.position.count,mesh.name+' has no unreferenced vertices');
  assert.equal(!!mesh.userData.sportsFloor,false,'floor geometry not replaced');
 }
 assert(changed>0);assert.equal(fleet.stats.removedVertices,17856);assert.equal(fleet.stats.removedAttributeBytes,428544);
 assert.equal(fleet.stats.cars,8);assert.equal(fleet.stats.draws,13);assert.equal(fleet.stats.removedTriangles,30880);
 console.log(JSON.stringify({changedMeshes:changed,...fleet.stats}));
});
test('raw normal/UV/normalised colour data, empty cut and unsupported layouts',()=>{
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,99,99,99],3));
 g.setAttribute('color',new T.Uint8BufferAttribute([1,2,3,4,5,6,7,8,9,10,11,12],3,true));
 const packed=compactParkedGeometry(g,[2,0,1]);assert.equal(digest(g,[2,0,1]),digest(packed,[0,1,2]));assert.equal(packed.attributes.color.normalized,true);
 const empty=compactParkedGeometry(g,[]);assert.equal(empty.attributes.position.count,0);assert.equal(empty.index.count,0);assert(Number.isFinite(empty.boundingSphere.radius));
 assert.throws(()=>compactParkedGeometry(g,[9]),/Invalid/);g.addGroup(0,3,0);assert.throws(()=>compactParkedGeometry(g,[0,1,2]),/Unsupported/);
});
