import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import {createVehicleSurfaceDomain} from '../app/vehicle-surface-domain.js';
import {expandIslandDriveArea} from '../app/island-drive-area.js';
import {repairEastRoadEnd} from '../app/east-road-end.js';
export async function terrainFixture(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(parser=>({name:'GEOMETRY_ONLY',loadMaterial(){return Promise.resolve(new T.MeshBasicMaterial());}}));
 const b=await fs.readFile(new URL('../island/ada_calisma.glb',import.meta.url));
 const root=(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const scale=320/1.7831611037254333;
 root.scale.setScalar(scale);root.updateMatrixWorld(true);
 root.position.set(.04531264305114746*scale,-new T.Box3().setFromObject(root).min.y-2.15,-.012233048677444458*scale);root.updateMatrixWorld(true);
 repairEastRoadEnd(root);return root;
}
const root=await terrainFixture(),domain=createVehicleSurfaceDomain(root);
const counts={allowed:0,rejected:0};
for(let x=-250;x<280;x+=2)for(let z=-250;z<240;z+=2)counts[domain.height(x,z)==null?'rejected':'allowed']++;
console.log('Terrain domain',domain.stats,counts);
let lawnLeaks=0,lawnSamples=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
for(const name of ['3_CIMEN','5_PARSEL_ZEMIN','3_CIMEN_KOYU']){
 const mesh=root.getObjectByName(name),p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
 for(let i=0;i<(ix?.count??p.count);i+=3){
  a.fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(mesh.matrixWorld);
  b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
  c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
  if((b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z)<1e-7)continue;
  lawnSamples++;if(domain.height((a.x+b.x+c.x)/3,(a.z+b.z+c.z)/3)!=null)lawnLeaks++;
 }
}
console.log({lawnSamples,lawnLeaks});
for(const [x,z]of [[183,122],[-133,97],[-73,-182]])assert.ok(Number.isFinite(domain.height(x,z)),`spawn ${x},${z}`);
// Exact fixture: road, raised sidewalk, grass parcel and sand. Exercise car
// AND long bus footprints at all headings, including their outer corners.
const surface=(x,z)=>Math.abs(x)<=10&&Math.abs(z)<=30?(Math.abs(x)>7?.2:0):null;
const footprint=spec=>{const out=[];for(let x=-spec.w;x<=spec.w+.001;x+=spec.w/4)for(let z=-spec.l;z<=spec.l+.001;z+=spec.l/8)out.push([x,z]);return out;};
const area={footprint};expandIslandDriveArea(area,{domain:{height:surface},ground:(x,z)=>surface(x,z)??0});
for(const spec of [{w:1,l:2},{w:1.5,l:5}]){
 assert.equal(area.check(8,0,0,spec).ok,true,'sidewalk reachable');
 assert.equal(area.check(11,0,0,spec).ok,false,'sand / parcel blocked');
 for(let i=0;i<360;i++){
  const yaw=i*Math.PI/180;assert.equal(area.check(0,0,yaw,spec).ok,true);
  assert.equal(area.check(10,0,yaw,spec).ok,false,'bumper must not cross domain');
 }
 for(let n=0;n<1000;n++)assert.equal(area.check(0,0,n/100,spec).ok,true);
}
const raisedCurb=(x,z)=>Math.abs(x)<=10&&Math.abs(z)<=30?(Math.abs(x)>7?.55:0):null;
const raisedArea={footprint};expandIslandDriveArea(raisedArea,{domain:{height:raisedCurb},ground:(x,z)=>raisedCurb(x,z)??0});
for(const spec of [{w:1,l:2},{w:1.5,l:5}])assert.equal(raisedArea.check(8,0,0,spec).ok,true,'55 cm curb remains drivable');
assert.equal(area.check(NaN,0,0,{w:1,l:2}).ok,false);
console.log('PASS: both footprints, 360 headings, repeated checks and 55 cm curb transition');
