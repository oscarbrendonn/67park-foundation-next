import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRideSolidSampler} from '../island/ride-solid-sampler.js';

const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-5,`${message??'height'}: ${actual} !== ${expected}`);
const box=({x=0,y=1,z=0,width=2,height=2,depth=2}={})=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),new THREE.MeshBasicMaterial());
 mesh.position.set(x,y,z);mesh.updateMatrixWorld(true);return mesh;
};
const plane=(y,down=false)=>{
 const geometry=new THREE.PlaneGeometry(8,8);geometry.rotateX(down?Math.PI/2:-Math.PI/2);geometry.translate(0,y,0);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld(true);return mesh;
};

test('closed cube and cylinder yield exact upward caps plus finite solid intervals',()=>{
 const cube=box(),cylinder=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2,20),new THREE.MeshBasicMaterial());
 cylinder.position.set(4,1,0);cylinder.updateMatrixWorld(true);
 const sampler=createRideSolidSampler([cube,cylinder],{cellSize:1});
 for(const [x,z] of [[0,0],[4,0]]){
  const hit=sampler.sample(x,z);assert.equal(hit.surfaces.length,1);close(hit.surfaces[0],2,'cap');assert.deepEqual(hit.intervals.length,1);close(hit.intervals[0][0],0,'bottom');close(hit.intervals[0][1],2,'top');
 }
 assert.equal(sampler.stats.closedComponents,2);
});

test('stacked closed slabs preserve their open vertical gap',()=>{
 const sampler=createRideSolidSampler([box({y:.25,height:.5}),box({y:2.25,height:.5})]);
 const hit=sampler.sample(0,0);assert.deepEqual(hit.intervals,[[0,.5],[2,2.5]]);assert.deepEqual(hit.surfaces,[.5,2.5]);
});

test('overlapping closed shells union while separated layers stay distinct',()=>{
 const sampler=createRideSolidSampler([box({y:1,height:2}),box({y:2,height:2})]);
 assert.deepEqual(sampler.sample(0,0).intervals,[[0,3]]);
});

test('a column remains solid under an open deck without inventing a giant volume',()=>{
 const sampler=createRideSolidSampler([box({width:.6,height:4,y:2}),plane(6)]);
 const column=sampler.sample(0,0),bay=sampler.sample(1,0);
 assert.deepEqual(column.intervals,[[0,4],[6,6]]);assert.deepEqual(column.surfaces,[4,6]);
 assert.deepEqual(bay.intervals,[[6,6]]);assert.deepEqual(bay.surfaces,[6]);
});

test('shared diagonal triangles and open upward/downward planes remain thin surfaces',()=>{
 const sampler=createRideSolidSampler([plane(3),plane(7,true)]);
 const hit=sampler.sample(0,0);
 assert.deepEqual(hit.surfaces,[3],'the two triangles of one cap de-duplicate at their diagonal');
 assert.deepEqual(hit.intervals,[[3,3],[7,7]],'unconnected opposite-facing planes stay thin, never fill the gap');
});

test('world transforms are applied before indexing the actual triangle geometry',()=>{
 const mesh=box({width:2,height:1,depth:2});mesh.position.set(10,3,-2);mesh.rotation.y=.43;mesh.scale.set(1.5,2,.5);mesh.updateMatrixWorld(true);
 const sampler=createRideSolidSampler([mesh]),hit=sampler.sample(10,-2);
 assert.deepEqual(hit.intervals,[[2,4]]);assert.deepEqual(hit.surfaces,[4]);
});

test('outside, invalid, instanced, and disposed queries are safe',()=>{
 const source=box(),instanced=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),1);instanced.setMatrixAt(0,new THREE.Matrix4());instanced.updateMatrixWorld(true);
 const sampler=createRideSolidSampler([source,instanced]);
 assert.deepEqual(sampler.sample(100,100),{surfaces:[],intervals:[]});assert.deepEqual(sampler.sample(NaN,0),{surfaces:[],intervals:[]});assert.equal(sampler.stats.skippedInstanced,1);
 sampler.dispose();assert.equal(sampler.stats.disposed,true);assert.deepEqual(sampler.sample(0,0),{surfaces:[],intervals:[]});
});

test('the XZ grid keeps query work bounded below all indexed triangles',()=>{
 const meshes=Array.from({length:40},(_,index)=>box({x:index*4,width:.8,depth:.8,height:1,y:.5}));
 const sampler=createRideSolidSampler(meshes,{cellSize:1});
 sampler.sample(0,0);
 assert(sampler.stats.indexedTriangles>100);assert(sampler.stats.bytes>sampler.stats.triangles*96);assert(sampler.stats.lastCandidates<sampler.stats.indexedTriangles);assert(sampler.stats.maxBucket<sampler.stats.indexedTriangles);
 assert(sampler.stats.references<=sampler.stats.indexedTriangles*4,JSON.stringify(sampler.stats));
});

test('pathological projected triangles are skipped before they can exhaust the grid budget',()=>{
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2e6,2e6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial());mesh.updateMatrixWorld(true);
 const sampler=createRideSolidSampler([mesh],{cellSize:1,maxCellSpan:32,maxReferences:100});
 assert.equal(sampler.stats.indexedTriangles,0);assert.equal(sampler.stats.skippedOversized,2);assert.equal(sampler.stats.references,0);assert.equal(sampler.stats.cells,0);
 assert.deepEqual(sampler.sample(0,0),{surfaces:[],intervals:[]});
});
