import * as T from 'three';
import {createCandyVehicle110} from '../island/candy-vehicle-model-v110.js?v=110.2';
import {useReferenceCarBody} from './reference-car-body.js?v=release-40';
import {mergeGeometries} from '../island/utils/BufferGeometryUtils.js';

// Exact eight occupied bays from the SPORTS97 asset, in its local coordinates.
export const PARKED_FLEET=Object.freeze([
 [-36.2,-31.0,0,'#58b8bb'],[-32.6,-31.0,0,'#df92ac'],[-29,-31.0,0,'#9aabd3'],[-21.8,-31.0,0,'#e3bf75'],
 [-32.6,-18.6,Math.PI,'#92b998'],[-29,-18.6,Math.PI,'#d49379'],[-25.4,-18.6,Math.PI,'#ac95c5'],[-21.8,-18.6,Math.PI,'#88b7d3']
].map(Object.freeze));
// The sage bay also used the shared wood material for its old exterior trim.
// Retire it only inside the existing car bounds; benches stay untouched.
const materials=new Set(['SPORTS97_blue','SPORTS97_sage','SPORTS97_rose','SPORTS97_glass','SPORTS97_warm','SPORTS97_cream','SPORTS97_tyre','SPORTS97_metal','SPORTS97_line','SPORTS97_wood']);
// Remove only unreachable vertices after the existing triangle cut. No weld,
// quantisation, normal regeneration or simplification of visible surfaces.
export function compactParkedGeometry(source,retained){
 if(source.groups.length||Object.keys(source.morphAttributes).length||source.drawRange.start!==0||source.drawRange.count!==Infinity)throw Error('Unsupported parked geometry layout');
 const count=source.attributes.position.count,remap=new Int32Array(count).fill(-1),used=[],index=[];
 for(const old of retained){
  if(!Number.isInteger(old)||old<0||old>=count)throw Error('Invalid parked vertex index');
  if(remap[old]<0){remap[old]=used.length;used.push(old);}index.push(remap[old]);
 }
 const result=new T.BufferGeometry();result.name=source.name;result.userData={...source.userData};
 for(const [name,attr]of Object.entries(source.attributes)){
  if(attr.isInterleavedBufferAttribute||attr.count!==count){result.dispose();throw Error('Unsupported parked vertex attribute');}
  const array=new attr.array.constructor(used.length*attr.itemSize);
  for(let i=0;i<used.length;i++){const start=used[i]*attr.itemSize;array.set(attr.array.subarray(start,start+attr.itemSize),i*attr.itemSize);}
  const packed=new T.BufferAttribute(array,attr.itemSize,attr.normalized);packed.name=attr.name;packed.setUsage(attr.usage);packed.gpuType=attr.gpuType;result.setAttribute(name,packed);
 }
 result.setIndex(index);result.computeBoundingBox();result.computeBoundingSphere();return result;
}
export function installParkedFleet(group){
 if(group.userData.parkedFleet38)return group.userData.parkedFleet38;
 const cuts=[],counts=Array(8).fill(0);
 group.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.sportsFloor||!materials.has(mesh.material?.name))return;
  const geometry=mesh.geometry,p=geometry.attributes.position,indices=geometry.index;
  const retained=[];let removed=0;
  for(let i=0;i<(indices?.count??p.count);i+=3){
   const triangle=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);
   const bay=PARKED_FLEET.findIndex(([x,z])=>triangle.every(j=>Math.abs(p.getX(j)-x)<1.31&&Math.abs(p.getZ(j)-z)<2.51&&p.getY(j)>.15&&p.getY(j)<2.07));
   if(bay>=0){counts[bay]++;removed++;}else retained.push(...triangle);
  }
  if(removed){const replacement=compactParkedGeometry(geometry,retained);cuts.push({mesh,replacement,old:geometry});}
 });
 // Fail closed: never remove unrelated geometry if the source layout changes.
 if(counts.some(n=>n<100)){for(const c of cuts)c.replacement.dispose();throw Error('Parked fleet source layout mismatch: '+counts.join(','));}
 const root=new T.Group();root.name='67PARK_MATCHING_PARKED_FLEET';const buckets=new Map(),cars=[];
 for(const [i,[x,z,yaw,color]] of PARKED_FLEET.entries()){
  const car=useReferenceCarBody(createCandyVehicle110({id:'parked-'+i,color}));
  cars.push(car);
  car.group.scale.setScalar(.80);car.group.position.set(x,.145,z);car.group.rotation.y=yaw;car.group.updateMatrixWorld(true);
  car.group.traverse(o=>{
   if(!o.isMesh)return;
   const key=o.material.name,source=o.geometry,g=source.index?source.toNonIndexed():source.clone();
   g.applyMatrix4(o.matrixWorld);g.deleteAttribute('uv1');if(!o.material.map)g.deleteAttribute('uv');
   const c=o.material.color,colours=new Float32Array(g.attributes.position.count*3);
   for(let j=0;j<colours.length;j+=3){colours[j]=c.r;colours[j+1]=c.g;colours[j+2]=c.b;}
   g.setAttribute('color',new T.BufferAttribute(colours,3));
   if(!buckets.has(key)){const mat=o.material.clone();mat.color.set('#ffffff');mat.vertexColors=true;buckets.set(key,{material:mat,geometries:[]});}
   buckets.get(key).geometries.push(g);
  });
 }
 for(const car of cars)car.dispose();
 for(const [name,b] of buckets){
  const g=mergeGeometries(b.geometries);b.geometries.forEach(g=>g.dispose());
  if(!g)throw Error('Could not batch parked vehicle '+name);
  const mesh=new T.Mesh(g,b.material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=!b.material.transparent;root.add(mesh);
 }
 let removedVertices=0,removedAttributeBytes=0;
 for(const c of cuts){removedVertices+=c.old.attributes.position.count-c.replacement.attributes.position.count;for(const key of Object.keys(c.old.attributes))removedAttributeBytes+=c.old.attributes[key].array.byteLength-c.replacement.attributes[key].array.byteLength;c.mesh.geometry=c.replacement;c.old.dispose();}
 root.position.y=-(group.userData.parkingGroundFinish?.drop??0);
 group.add(root);group.updateMatrixWorld(true);
 const stats={cars:8,body:'same-as-driveable-reference-car',colours:PARKED_FLEET.map(p=>p[3]),plates:'authentic-colour-67park-front-and-rear',draws:root.children.length,removedTriangles:counts.reduce((a,b)=>a+b,0),removedVertices,removedAttributeBytes,floorChanged:false};
 const result={root,stats};group.userData.parkedFleet38=result;return result;
}
