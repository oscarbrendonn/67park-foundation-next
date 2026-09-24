import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const TARGETS=['6_BORDUR','7_DOGU_SAHIL_MEYDAN_APRON','5_YOL','7_KALDIRIM_TABANI'];
const DONORS=['5_DOGU_SAHIL_MEYDAN_ZEMIN','3_CIMEN_KOYU'];

// One checked startup transaction before shadow/collision sampling. Keeps the
// existing mesh identities, materials, children and all unaffected triangles.
export function applyMapJointFinish(root,patch){
 if(root.userData.mapJointFinish1)return root.userData.mapJointFinish1;
 if(patch?.version!==1||patch.meshes?.length!==TARGETS.length||patch.donors?.length!==DONORS.length)throw Error('Invalid map-joint patch');
 root.updateMatrixWorld(true);
 const seen=new Set(),prepared=[],allocated=[];
 function source(row,allowed){
  if(!allowed.includes(row?.name)||seen.has(row.name))throw Error('Invalid map-joint target');seen.add(row.name);
  const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
  if(!mesh?.isMesh||Array.isArray(mesh.material)||!g?.index||g.attributes.position?.count!==e?.vertices||g.index.count!==e.indices||crc(g.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(g.index.array))!==e.indexCRC)throw Error('Map-joint source changed: '+row.name);
  if(Object.keys(g.morphAttributes).length||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported map-joint attributes');
  return {mesh,g};
 }
 try{
  for(const donor of patch.donors)source(donor,DONORS);
  for(const row of patch.meshes){
   const {mesh,g}=source(row,TARGETS),count=row.p?.length/3,remove=new Set(row.remove);
   if(!Array.isArray(row.p)||!Number.isInteger(count)||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||!Array.isArray(row.ix)||row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid map-joint geometry');
   if(!Array.isArray(row.remove)||remove.size!==row.remove.length||[...remove].some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count))throw Error('Invalid map-joint clipping');
   if(!count&&(row.name!=='7_DOGU_SAHIL_MEYDAN_APRON'||remove.size*3!==g.index.count))throw Error('Unexpected empty map-joint geometry');
   for(let i=0;i<row.n.length;i+=3)if(Math.abs(Math.hypot(row.n[i],row.n[i+1],row.n[i+2])-1)>.001)throw Error('Invalid map-joint normal');
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=g.clone();allocated.push(next);
   // Compact only vertices orphaned by these cuts. No growth from the old
   // repeated repair history; every retained attribute is copied exactly.
   const kept=[],used=new Map();
   for(let i=0;i<g.index.count;i+=3)if(!remove.has(i))for(let j=0;j<3;j++){
    const old=g.index.getX(i+j);if(!used.has(old))used.set(old,used.size);kept.push(used.get(old));
   }
   for(const [key,previous] of Object.entries(g.attributes)){
    const values=new previous.array.constructor((used.size+count)*previous.itemSize);
    for(const [old,id]of used)for(let j=0;j<previous.itemSize;j++)values[id*previous.itemSize+j]=previous.array[old*previous.itemSize+j];
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,used.size*previous.itemSize);
    else for(let i=0;i<count;i++)for(let j=0;j<previous.itemSize;j++)values[(used.size+i)*previous.itemSize+j]=key==='uv'&&previous.itemSize===2?(j===0?row.p[i*3]:-row.p[i*3+2]):previous.array[j];
    next.setAttribute(key,new T.BufferAttribute(values,previous.itemSize,previous.normalized));
   }
   for(const i of row.ix)kept.push(used.size+i);
   next.setIndex(kept);next.clearGroups();next.setDrawRange(0,kept.length);next.computeBoundingBox();next.computeBoundingSphere();
   prepared.push({mesh,next,old:g});
  }
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((sum,r)=>sum+(r.next.index.count-r.old.index.count)/3,0);
 const vertexDelta=prepared.reduce((sum,r)=>sum+r.next.attributes.position.count-r.old.attributes.position.count,0);
 for(const {mesh,next} of prepared)mesh.geometry=next;
 for(const g of allocated)if(!prepared.some(p=>p.next===g))g.dispose();
 return root.userData.mapJointFinish1={...patch.metrics,version:1,triangleDelta,vertexDelta,meshes:prepared.map(p=>p.mesh.name),materialsPreserved:true,addedDrawCalls:0,perFrameWork:0};
}
