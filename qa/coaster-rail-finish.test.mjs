import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {finishCoasterRails} from '../app/coaster-rail-finish.js';
const bytes=fs.readFileSync(new URL('../island/lunapark-v1/coaster.glb',import.meta.url));
const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const before=[];scene.traverse(o=>{if(o.isMesh)before.push({o,g:o.geometry,m:o.material,transform:o.matrix.toArray()});});
const report=finishCoasterRails(scene);
test('source and shipped bundle finish coaster rails before batching; entry cache advances',()=>{
 const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const source=read('island/lunapark-placement-v77.js'),bundle=read('island/runtime.bundle.js');
 assert(source.indexOf('finishCoasterRails(source)')<source.indexOf('const bins=new Map()'));
 assert(bundle.includes('dataset.coasterRailFinish1=JSON.stringify(finishCoasterRails1(z))'));
 assert(read('app/main.js').includes('runtime.bundle.js?v=english-ui-1'));
 assert(read('index.html').includes('app/main.js?v=english-ui-1'));
});
test('only the two authored red rails change, with four rounded caps and zero new draw calls',()=>{
 assert.deepEqual(report,{version:1,rails:2,caps:4,addedTriangles:528,addedDraws:0,deckChanged:false});
 assert.equal(finishCoasterRails(scene),report);
 let count=0;scene.traverse(o=>{if(o.isMesh)count++;});assert.equal(count,before.length);
 for(const {o,g,m,transform}of before){assert.equal(o.material,m);assert.deepEqual(o.matrix.toArray(),transform);if(!/^soft_skating_edge/.test(o.name))assert.equal(o.geometry,g);}
});
test('preserve every original tube vertex, normal, UV and triangle exactly',()=>{
 for(const {o,g}of before.filter(r=>/^soft_skating_edge/.test(r.o.name))){
  for(const [key,attr]of Object.entries(g.attributes))assert.deepEqual(o.geometry.attributes[key].array.slice(0,attr.array.length),attr.array);
  assert.deepEqual(Array.from(o.geometry.index.array.slice(0,g.index.count)),Array.from(g.index.array));
 }
});
test('both red tubes are closed and manifold after welding only coincident UV seams',()=>{
 for(const {o}of before.filter(r=>/^soft_skating_edge/.test(r.o.name))){
  const g=o.geometry,p=g.attributes.position,ids=[],vertices=new Map(),edges=new Map();
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e5)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);ids.push(vertices.get(key));}
  for(let i=0;i<g.index.count;i+=3){const v=[0,1,2].map(j=>ids[g.index.getX(i+j)]);for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],key=a<b?a+','+b:b+','+a;edges.set(key,(edges.get(key)||0)+1);}}
  assert.equal([...edges.values()].filter(n=>n!==2).length,0,'no open boundary or overlapping caps');
 }
});
test('cap faces are finite, outward and smoothly normalled; extension bounded to authored radius',()=>{
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3();
 for(const {o,g}of before.filter(r=>/^soft_skating_edge/.test(r.o.name))){
  const next=o.geometry;for(const attr of Object.values(next.attributes))assert(attr.array.every(Number.isFinite));
  for(let i=g.index.count;i<next.index.count;i+=3){const v=[0,1,2].map(j=>next.index.getX(i+j));a.fromBufferAttribute(next.attributes.position,v[0]);b.fromBufferAttribute(next.attributes.position,v[1]);c.fromBufferAttribute(next.attributes.position,v[2]);n.fromBufferAttribute(next.attributes.normal,v[0]);assert(b.sub(a).cross(c.sub(a)).dot(n)>1e-9);}
  g.computeBoundingBox();const expanded=g.boundingBox.clone().expandByScalar(.101);assert(expanded.containsBox(next.boundingBox));
 }
});
