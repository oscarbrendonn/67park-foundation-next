import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const SOIL='4_KIYI_TOPRAK_TABANI';
const TARGETS=new Set(['3_CIMEN','7_KALDIRIM_TABANI',SOIL]);
// Baked union of the two northern lawns and their interior pavement. Installed
// after earlier repairs, before shadow helpers and the final terrain sampler.
export function applyNorthHousingSurface(root,patch){
 if(root.userData.northHousingSurface1)return root.userData.northHousingSurface1;
 const m=patch?.metrics;
 if(patch?.version!==1||patch.meshes?.length!==3||new Set(patch.meshes.map(r=>r.name)).size!==3||
    m?.joinedLawns!==2||m.existingGrassRemovedArea!==0||m.reservedParcelChangedArea!==0||
    !(m.pavingAddedArea>800&&m.pavingAddedArea<2000)||!(m.grassAddedArea>250&&m.grassAddedArea<400)||
    m.removedCoplanarSoilTriangles!==266||m.retainedSoilTriangles!==55||m.exteriorSoilChangedArea!==0||
    !(m.poolCornerAddedArea>20&&m.poolCornerAddedArea<50)||m.poolOutsideCornerChangedArea!==0||
    !Number.isFinite(m.poolWestEndZ)||Math.abs(m.poolWestEndZ+243.56441144026343)>.00002||
    m.poolWestCornerRadius!==.16||m.poolWestOutsideChangedArea!==0||
    !(m.poolWestRemovedArea>.2&&m.poolWestRemovedArea<1)||!(m.poolWestAddedArea>0&&m.poolWestAddedArea<.05)||
    m.coastWalkwayWidth!==4.34016||!Number.isInteger(m.coastWidthSamples)||m.coastWidthSamples<100||
    !Number.isFinite(m.coastWidthMin)||!Number.isFinite(m.coastWidthMax)||
    Math.abs(m.coastWidthMin-m.coastWalkwayWidth)>.003||Math.abs(m.coastWidthMax-m.coastWalkwayWidth)>.003||
    m.addedMeshes!==0||m.addedMaterials!==0||m.perFrameWork!==0)throw Error('Invalid northern housing surface patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[];
 try{
  const road=patch.roadEnd;
  if(!road||![road.oldZ,road.extension].every(Number.isFinite)||road.endZ!==-240.87256525074335||Math.abs(road.oldZ+237.28341624)>.00002||
     Math.abs(road.extension-(road.oldZ-road.endZ))>1e-8||road.addedTriangles!==0||
     road.rows?.length!==2||road.rows[0].name!=='5_YOL'||road.rows[1].name!=='6_BORDUR')throw Error('Invalid northern road endpoint');
  for(const row of road.rows){
   const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
   if(!mesh?.isMesh||g?.attributes.position?.count!==e?.vertices||g.index?.count!==e.indices||
      crc(g.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(g.index.array))!==e.indexCRC||
      !row.ids?.length||new Set(row.ids).size!==row.ids.length||row.p?.length!==row.ids.length*3)throw Error('Northern road source changed');
   const next=g.clone();allocated.push(next);const inverse=mesh.matrixWorld.clone().invert(),v=new T.Vector3(),old=new T.Vector3();
   for(let j=0;j<row.ids.length;j++){
    const i=row.ids[j];v.fromArray(row.p,j*3);
    if(!Number.isInteger(i)||i<0||i>=e.vertices||![v.x,v.y,v.z].every(Number.isFinite))throw Error('Invalid northern road vertex');
    old.fromBufferAttribute(g.attributes.position,i).applyMatrix4(mesh.matrixWorld);
    if(old.x<=-16.5||old.x>=-3.3||old.z>=-237||old.z<=-237.5||
       Math.abs(v.x-old.x)>1e-6||Math.abs(v.y-old.y)>1e-6||Math.abs(v.z-(old.z-road.extension))>1e-6)throw Error('Northern road edit outside endpoint');
    v.applyMatrix4(inverse);next.attributes.position.setXYZ(i,v.x,v.y,v.z);
   }
   // The end cap is translated and the straight side faces lengthened; their
   // normals are unchanged. Retain all authored shading outside this endpoint.
   next.attributes.position.needsUpdate=true;next.computeBoundingBox();next.computeBoundingSphere();prepared.push({mesh,next,old:g});
   if(row.name==='6_BORDUR'){
    const merge=patch.curbMerge,removed=new Set(merge?.remove);
    if(merge?.name!=='6_BORDUR'||!Number.isInteger(m.mergedCurbTriangles)||m.mergedCurbTriangles<100||removed.size!==m.mergedCurbTriangles||removed.size!==merge.remove.length||
       merge.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count))throw Error('Invalid northern curb merge');
    const indices=[];for(let i=0;i<g.index.count;i+=3)if(!removed.has(i))indices.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
    next.setIndex(indices);next.clearGroups();next.setDrawRange(0,indices.length);
   }
  }
  for(const row of patch.meshes){
   const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
   if(!TARGETS.has(row.name)||!mesh?.isMesh||Array.isArray(mesh.material)||!g?.index||
      g.attributes.position?.count!==e?.vertices||g.index.count!==e.indices||
      crc(g.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(g.index.array))!==e.indexCRC)
    throw Error('Northern housing surface source changed: '+row.name);
   if(Object.keys(g.morphAttributes).length||!g.attributes.normal||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported northern housing attributes');
   const count=row.p?.length/3,removed=new Set(row.remove);
   if(!Number.isInteger(count)||count<3||!row.ix?.length||(row.name===SOIL&&(row.ix.length!==m.retainedSoilTriangles*3||removed.size!==m.removedCoplanarSoilTriangles))||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||
      row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count)||
      !removed.size||removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count))throw Error('Invalid northern housing geometry');
   for(let i=0;i<row.p.length;i+=3){
    const [x,y,z]=row.p.slice(i,i+3);
    if(x< -82.217||x>149.478||z< -244.830||z> -189.920||y<8.796||y>9.399)throw Error('Northern housing patch outside district');
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
 return root.userData.northHousingSurface1={...m,version:1,triangleDelta,roadEnd:{endZ:patch.roadEnd.endZ,extension:patch.roadEnd.extension,addedTriangles:0},meshes:prepared.map(p=>p.mesh.name),materialsPreserved:true};
}
