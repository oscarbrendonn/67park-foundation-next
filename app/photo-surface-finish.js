import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const SLABS=[-1,1].flatMap(x=>[-1,1].map(z=>`CENTER_WHITE71_${x}_${z}`));
const TARGETS=new Set(['67D_SKATEPARK_BASE','6_BORDUR','5_YOL',...SLABS]);
const PATHS=[14.2,84.54].flatMap(x=>[-74.65,-29.23].map(z=>`CENTER73_PATH_${x}_${z}`));

// Apply after the previous boundary/stair repairs and before the final terrain
// sampler. The renderer and sampler keep the same mesh references/materials.
export function applyPhotoSurfaceFinish(root,patch){
 if(root.userData.photoSurfaceFinish1)return root.userData.photoSurfaceFinish1;
 if(patch?.version!==1||patch.meshes?.length!==7||new Set(patch.meshes.map(r=>r.name)).size!==7||
    patch.metrics?.bowlHoleChangedArea!==0||patch.metrics?.centralQuadrants!==4||
    !(patch.metrics?.skateAddedArea>1000&&patch.metrics.skateAddedArea<1100)||
    !(patch.metrics?.centralChangedArea>=0&&patch.metrics.centralChangedArea<12))throw Error('Invalid photo surface patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[];
 try{
  for(const row of patch.meshes){
   const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
   if(!TARGETS.has(row.name)||!mesh?.isMesh||Array.isArray(mesh.material)||!g?.index||
      g.attributes.position?.count!==e?.vertices||g.index.count!==e.indices||
      crc(g.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(g.index.array))!==e.indexCRC)
    throw Error('Photo surface source changed: '+row.name);
   if(Object.keys(g.morphAttributes).length||!g.attributes.normal||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported photo surface attributes');
   if(row.replace!==SLABS.concat('67D_SKATEPARK_BASE').includes(row.name))throw Error('Invalid photo surface replacement');
   const count=row.p?.length/3,removed=new Set(row.remove);
   if(!Number.isInteger(count)||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||
      row.ix?.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count)||
      removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count)||
      (row.name==='6_BORDUR'?(count!==0||removed.size!==1270):row.remove.length!==0))throw Error('Invalid photo surface geometry');
   for(let i=0;i<row.n.length;i+=3)if(Math.abs(Math.hypot(...row.n.slice(i,i+3))-1)>.001)throw Error('Invalid photo surface normal');
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));
   added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));
   added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=g.clone(),keep=row.replace?0:e.vertices;allocated.push(next);
   for(const [key,previous]of Object.entries(g.attributes)){
    const values=new previous.array.constructor((keep+count)*previous.itemSize);
    if(keep)values.set(previous.array);
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,keep*previous.itemSize);
    else for(let i=0;i<count;i++)for(let k=0;k<previous.itemSize;k++)values[(keep+i)*previous.itemSize+k]=
     key==='uv'&&previous.itemSize===2?(k===0?row.p[i*3]:-row.p[i*3+2]):previous.array[k];
    next.setAttribute(key,new T.BufferAttribute(values,previous.itemSize,previous.normalized));
   }
   const indices=[];
   if(!row.replace)for(let i=0;i<g.index.count;i+=3)if(!removed.has(i))indices.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
   for(const i of row.ix)indices.push(keep+i);
   next.setIndex(indices);next.clearGroups();next.setDrawRange(0,indices.length);
   next.computeBoundingBox();next.computeBoundingSphere();added.dispose();
   prepared.push({mesh,next,old:g});
  }
  // These four old decorative boxes floated 10 mm above the paving and
  // produced the long dark lines. Remove their faces from BOTH rendering and
  // sampling, retaining the named mesh for old material/scene contracts.
  for(const name of PATHS){
   const mesh=root.getObjectByName(name),g=mesh?.geometry;
   if(!mesh?.isMesh||g?.attributes.position?.count!==24||g.index?.count!==36)throw Error('Central connector changed: '+name);
   const b=new T.Box3().setFromObject(mesh);
   if(Math.abs(b.min.y-9.30)>.0001||Math.abs(b.max.y-9.335)>.0001)throw Error('Central connector height changed');
   const next=g.clone();allocated.push(next);next.setIndex([]);next.clearGroups();next.setDrawRange(0,0);
   prepared.push({mesh,next,old:g});
  }
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((sum,p)=>sum+(p.next.index.count-p.old.index.count)/3,0);
 for(const p of prepared)p.mesh.geometry=p.next;
 return root.userData.photoSurfaceFinish1={...patch.metrics,version:1,triangleDelta,meshes:prepared.map(p=>p.mesh.name),materialsPreserved:true};
}
