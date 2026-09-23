import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const TARGETS=new Set(['3_CIMEN','7_KALDIRIM_TABANI']);
// Baked union of the two northern lawns and their interior pavement. Installed
// after earlier repairs, before shadow helpers and the final terrain sampler.
export function applyNorthHousingSurface(root,patch){
 if(root.userData.northHousingSurface1)return root.userData.northHousingSurface1;
 const m=patch?.metrics;
 if(patch?.version!==1||patch.meshes?.length!==2||new Set(patch.meshes.map(r=>r.name)).size!==2||
    m?.joinedLawns!==2||m.existingGrassRemovedArea!==0||m.reservedParcelChangedArea!==0||
    !(m.pavingAddedArea>800&&m.pavingAddedArea<2000)||!(m.grassAddedArea>250&&m.grassAddedArea<400)||
    m.addedMeshes!==0||m.addedMaterials!==0||m.perFrameWork!==0)throw Error('Invalid northern housing surface patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[];
 try{
  for(const row of patch.meshes){
   const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
   if(!TARGETS.has(row.name)||!mesh?.isMesh||Array.isArray(mesh.material)||!g?.index||
      g.attributes.position?.count!==e?.vertices||g.index.count!==e.indices||
      crc(g.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(g.index.array))!==e.indexCRC)
    throw Error('Northern housing surface source changed: '+row.name);
   if(Object.keys(g.morphAttributes).length||!g.attributes.normal||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported northern housing attributes');
   const count=row.p?.length/3,removed=new Set(row.remove);
   if(!Number.isInteger(count)||count<3||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||
      !row.ix?.length||row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count)||
      !removed.size||removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count))throw Error('Invalid northern housing geometry');
   for(let i=0;i<row.p.length;i+=3){
    const [x,y,z]=row.p.slice(i,i+3);
    if(x< -3.387||x>148.335||z< -240.490||z> -191.062||y<8.796||y>9.399)throw Error('Northern housing patch outside district');
    if(Math.abs(Math.hypot(...row.n.slice(i,i+3))-1)>.001)throw Error('Invalid northern housing normal');
   }
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));
   added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));
   added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=g.clone();allocated.push(next);
   for(const [key,previous] of Object.entries(g.attributes)){
    const values=new previous.array.constructor((e.vertices+count)*previous.itemSize);values.set(previous.array);
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,e.vertices*previous.itemSize);
    else for(let i=0;i<count;i++)for(let k=0;k<previous.itemSize;k++)values[(e.vertices+i)*previous.itemSize+k]=
     key==='uv'&&previous.itemSize===2?(k===0?row.p[i*3]:-row.p[i*3+2]):previous.array[k];
    next.setAttribute(key,new T.BufferAttribute(values,previous.itemSize,previous.normalized));
   }
   const indices=[];
   for(let i=0;i<g.index.count;i+=3)if(!removed.has(i))indices.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
   for(const i of row.ix)indices.push(e.vertices+i);
   next.setIndex(indices);next.clearGroups();next.setDrawRange(0,indices.length);
   next.computeBoundingBox();next.computeBoundingSphere();added.dispose();prepared.push({mesh,next,old:g});
  }
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((n,p)=>n+(p.next.index.count-p.old.index.count)/3,0);
 for(const p of prepared)p.mesh.geometry=p.next;
 return root.userData.northHousingSurface1={...m,version:1,triangleDelta,meshes:prepared.map(p=>p.mesh.name),materialsPreserved:true};
}
