import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {prepareSeasideAsset89} from '../island/seaside-scale-v89.js';
import {addLighthouseSupport} from '../island/lighthouse-support.js';
import {patchLighthouseStepsBundle} from './refresh-lighthouse-steps-bundle.mjs';

const bytes=fs.readFileSync(new URL('../island/lunapark-v1/lighthouse.glb',import.meta.url));
const original=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const source=prepareSeasideAsset89(original,'lighthouse');
const origin={x:241,y:9.645,z:-83},transform=new T.Matrix4().compose(new T.Vector3(origin.x,origin.y,origin.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2),new T.Vector3(1,1,1));
const group=new T.Group();
source.traverse(o=>{
 if(!o.isMesh)return;
 // The production batch also bakes the same matrices into Float32 vertices.
 const geometry=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(transform,o.matrixWorld));
 const mesh=new T.Mesh(geometry,o.material);mesh.name='LUNA77_lighthouse';group.add(mesh);
});
group.updateMatrixWorld(true);
const snapshot=group.children.map(m=>({mesh:m,geometry:m.geometry,material:m.material,positions:m.geometry.attributes.position.array.slice()}));
const calls=[],old=(x,z,...args)=>{calls.push([x,z,...args]);return x===200?42:null;};
const park=addLighthouseSupport({group,obstacle:old,rides:[],cameraBlockers:group.children});
const ground=(radius,angle=0)=>park.obstacle(origin.x+radius*Math.cos(angle),origin.z+radius*Math.sin(angle));

test('both real round treads have their actual height at 32 approach angles',()=>{
 for(let n=0;n<32;n++){
  const a=n*Math.PI/16;
  assert(Math.abs(ground(4.02,a)-origin.y-.5984)<1e-5,'lower step');
  assert(Math.abs(ground(3.60,a)-origin.y-1.0846)<1e-5,'upper step');
  assert.equal(ground(4.25,a),null,'no invisible square rim');
  assert(ground(2.7,a)>origin.y+3,'tower remains solid');
 }
 assert.equal(park.obstacle(origin.x+4,origin.z+4),null,'old AABB corner is open');
});
test('source sampler agrees with visible downward intersections throughout the lighthouse',()=>{
 const ray=new T.Raycaster(),from=new T.Vector3(),down=new T.Vector3(0,-1,0);let compared=0;
 for(let x=-4.4;x<=4.4;x+=.19)for(let z=-4.4;z<=4.4;z+=.19){
  ray.set(from.set(origin.x+x,80,origin.z+z),down);
  const hit=ray.intersectObject(group,true)[0]?.point.y??null,actual=park.obstacle(origin.x+x,origin.z+z);
  if(hit==null)assert.equal(actual,null);
  else assert(Math.abs(actual-hit)<1e-6,JSON.stringify({x,z,actual,hit}));
  compared++;
 }
 assert(compared>2000);
});
test('no rendered buffers, materials, mesh count, bounds, or ownership changed',()=>{
 assert.equal(group.children.length,snapshot.length);
 for(const s of snapshot){assert.equal(s.mesh.geometry,s.geometry);assert.equal(s.mesh.material,s.material);assert.deepEqual(s.geometry.attributes.position.array,s.positions);}
 assert.equal(park.group,group);assert.equal(park.cameraBlockers,group.children);
 assert(park.lighthouseSupport.stats.bytes<750000);
 console.log('LIGHTHOUSE_SUPPORT',JSON.stringify(park.lighthouseSupport.stats));
});
test('existing park contacts and ignoreRideContacts are preserved',()=>{
 assert.equal(park.obstacle(200,-83,true),42);assert.deepEqual(calls.at(-1),[200,-83,true]);
 assert.equal(park.obstacle(100,-150,false),null);assert.deepEqual(calls.at(-1),[100,-150,false]);
 assert.equal(ground(4.02),park.obstacle(origin.x+4.02,origin.z,true));
 assert.equal(park.lighthouseSupport.height(NaN,0),null);
});
test('source and shipped bundle omit only the lighthouse box and install the same support',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),src=read('island/lunapark-placement-v77.js'),bundle=read('island/runtime.bundle.js');
 assert(src.includes("if(!p.water&&p.asset!=='coaster'&&p.asset!=='lighthouse')"));
 assert(src.includes('return addLighthouseSupport({group,cameraBlockers:blockers,obstacle,update,rides});'));
 assert(bundle.includes('if(!y.water&&y.asset!=="coaster"&&y.asset!=="lighthouse")'));
 assert(bundle.includes('__lighthouseSteps({group:u,cameraBlockers:p,obstacle:A,update:R,rides:b})'));
 assert.equal(patchLighthouseStepsBundle(bundle),bundle,'mechanical updater is idempotent');
});
