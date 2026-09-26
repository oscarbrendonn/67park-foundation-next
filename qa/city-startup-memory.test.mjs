import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../island/utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from '../island/city-height-sampler58.js';

const source=fs.readFileSync(new URL('../island/city-props-v60.js',import.meta.url),'utf8');
const hash=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
async function exercise(clearScratch){
 const maps=[],scene=new THREE.Scene(),original=new THREE.Group(),material=new THREE.MeshStandardMaterial({name:'fixture-shell',color:0xd9cabd});
 const geometry=new THREE.BoxGeometry(4,4,4);geometry.translate(0,2,0);
 const mesh=new THREE.Mesh(geometry,material);mesh.name='fixture-house';original.add(mesh);
 let sourceDisposed=0;geometry.addEventListener('dispose',()=>sourceDisposed++);
 const layout={version:60,spawn:[0,1,0],buildings:Array.from({length:8},(_,i)=>({id:'house-'+i,node:mesh.name,x:i*8,z:0,width:4,depth:4,yaw:0,groundY:0,embed:0}))};
 const sample=(x,z)=>({object:{name:'5_PARSEL_ZEMIN'},point:{x,y:0,z}});
 class ScratchMap extends Map{
  constructor(){super();this.clears=0;this.released=0;maps.push(this);}
  clear(){this.clears++;this.released+=[...this.values()].reduce((n,b)=>n+b.geometry.length,0);super.clear();}
 }
 class Loader{async loadAsync(){return {scene:original};}}
 const fetch=async url=>({ok:true,json:async()=>url.includes('city-layout')?layout:{version:58,rails:[{},{}]}});
 // Execute the actual production constructor with only network dependencies
 // replaced by deterministic fixtures. The baseline differs by the one clear.
 const code=source.replace(/^import[^\n]*\n/gm,'').replaceAll('export ','');
 const factory=new Function('THREE','GLTFLoader','mergeGeometries','createCityHeightSampler58','assetFetch','Map',
  (clearScratch?code:code.replace('buckets.clear();',''))+'\nreturn loadCityProps60;');
 const renderer={toneMappingExposure:1,domElement:{dataset:{}}};
 const result=await factory(THREE,Loader,mergeGeometries,createCityHeightSampler58,fetch,ScratchMap)({scene,renderer,sample,variant:'kimi'});
 const snapshot=[];result.group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,attributes={};
  for(const[k,a]of Object.entries(g.attributes))attributes[k]=[a.itemSize,a.normalized,hash(a.array)];
  const mat=m.material.toJSON();delete mat.uuid;delete mat.metadata;
  snapshot.push({name:m.name,attributes,index:g.index&&hash(g.index.array),material:mat,matrix:m.matrixWorld.toArray()});
 });
 return {maps,result,snapshot,renderer,sourceDisposed,geometry,layout};
}

test('only copied City60 construction geometry is released; model bytes/materials/contacts stay exact',async()=>{
 const before=await exercise(false),after=await exercise(true);
 assert.equal(before.maps.length,1);assert.equal(after.maps.length,1);
 assert.equal(before.maps[0].size,1);assert.equal(before.maps[0].clears,0);
 assert.equal(after.maps[0].size,0);assert.equal(after.maps[0].clears,1);assert.equal(after.maps[0].released,8);
 assert.deepEqual(after.snapshot,before.snapshot);
 assert.equal(after.sourceDisposed,0,'Do not dispose the original source or shared resources');
 for(const p of after.layout.buildings){assert.equal(after.result.ground(p.x,p.z),4);assert.equal(after.result.obstacle(p.x,p.z),before.result.obstacle(p.x,p.z));}
 assert.equal(after.result.cameraBlockers.length,before.result.cameraBlockers.length);
 after.renderer.toneMappingExposure=.5;after.result.update();
 const shader={uniforms:{},fragmentShader:'#include <common>\n#include <opaque_fragment>'};
 after.result.group.children[0].material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.uCityExposure60.value,1.76,'Live material updates still work after scratch release');
});

test('source and shipped bundle release scratch after merge without touching character ownership',()=>{
 assert(source.indexOf('buckets.clear();')>source.indexOf('for(const g of bucket.geometry)g.dispose();'));
 assert.equal(source.split('buckets.clear();').length,2);
 const bundle=fs.readFileSync(new URL('../island/runtime.bundle.js',import.meta.url),'utf8');
 assert.equal(bundle.split('for(let H of k.geometry)H.dispose()}u.clear();l.updateMatrixWorld(!0);let x=n3(').length,2);
 const character=fs.readFileSync(new URL('../app/character-assets.js',import.meta.url),'utf8');
 assert(character.includes("if(records.get(url)?.status==='error')records.delete(url)"));
 assert(!character.includes('dispose('),'No active character disposal was introduced');
});
