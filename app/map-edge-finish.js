import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const SLABS=['CENTER_WHITE71_-1_-1','CENTER_WHITE71_-1_1','CENTER_WHITE71_1_-1','CENTER_WHITE71_1_1'];
const TARGETS=new Set(['7_KALDIRIM_TABANI','6_BORDUR','3_CIMEN','5_YOL',...SLABS]);
const indexCRC=g=>crc(Uint32Array.from(g.index.array));

// One startup transaction after all earlier baked patches, before sampling.
// Only existing ground meshes are changed; no collision rules or frame hooks.
export function applyMapEdgeFinish(root,patch){
 if(root.userData.mapEdgeFinish1)return root.userData.mapEdgeFinish1;
 if(patch?.version!==1||!Array.isArray(patch.meshes)||patch.meshes.length!==8||patch.divider?.name!=='8_REF_AYIRICI'||patch.grassFill?.name!=='8_CIM_STUB_DOLGU'||patch.grassFill.source!=='3_CIMEN')throw Error('Invalid map-edge patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[],seen=new Set();let fill,grass;
 function source(row,allowed){
  if(!allowed.has(row.name)||seen.has(row.name))throw Error('Invalid map-edge target');seen.add(row.name);
  const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
  if(!mesh?.isMesh||Array.isArray(mesh.material)||!g?.index||g.attributes.position?.count!==e?.vertices||g.index.count!==e.indices||crc(g.attributes.position.array)!==e.positionCRC||indexCRC(g)!==e.indexCRC)throw Error('Map-edge source changed: '+row.name);
  if(Object.keys(g.morphAttributes).length||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported map-edge attributes');
  return {mesh,g};
 }
 try{
  // The old grass filler was Standard while the source grass was Physical.
  // Sharing the actual authored material fixes the bright seam without
  // repainting the map or adding a shader. Its two local seam repairs below
  // retain the source positions and alter only the bounded triangle subset.
  fill=source(patch.grassFill,new Set(['8_CIM_STUB_DOLGU'])).mesh;
  grass=source({name:patch.grassFill.source,expected:patch.grassFill.sourceExpected},new Set(['3_CIMEN'])).mesh;
  seen.delete('3_CIMEN'); // This separately validated source is also a patch row.
  for(const row of patch.meshes){
   const {mesh,g}=source(row,TARGETS),count=row.p?.length/3,remove=new Set(row.remove||[]);
   if(row.replace!==SLABS.includes(row.name)||!Number.isInteger(count)||count<=0||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||!Array.isArray(row.ix)||!row.ix.length||row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid map-edge geometry');
   if(remove.size!==(row.remove||[]).length||[...remove].some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count)||row.replace&&remove.size)throw Error('Invalid map-edge clipping');
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=g.clone();allocated.push(next);const oldCount=row.replace?0:g.attributes.position.count;
   for(const [key,previous]of Object.entries(g.attributes)){
    const values=new previous.array.constructor((oldCount+count)*previous.itemSize);
    if(oldCount)values.set(previous.array);
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,oldCount*previous.itemSize);
    else for(let i=0;i<count;i++)for(let j=0;j<previous.itemSize;j++)values[(oldCount+i)*previous.itemSize+j]=key==='uv'&&previous.itemSize===2?(j===0?row.p[i*3]:-row.p[i*3+2]):previous.array[j];
    next.setAttribute(key,new T.BufferAttribute(values,previous.itemSize,previous.normalized));
   }
   const ix=[];if(!row.replace)for(let i=0;i<g.index.count;i+=3)if(!remove.has(i))ix.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));for(const i of row.ix)ix.push(oldCount+i);
   next.setIndex(ix);next.clearGroups();next.setDrawRange(0,ix.length);next.computeBoundingBox();next.computeBoundingSphere();
   added.dispose();prepared.push({mesh,next,old:g});
  }
  const row=patch.divider,{mesh,g}=source(row,new Set(['8_REF_AYIRICI']));
  if(!Array.isArray(row.vertices)||!row.vertices.length||new Set(row.vertices).size!==row.vertices.length||row.vertices.some(i=>!Number.isInteger(i)||i<0||i>=g.attributes.position.count)||row.from?.length!==2||!row.from.every(Number.isFinite)||Math.abs(row.from[1]-row.from[0]-.59)>.00001||row.to?.length!==2||row.to[0]!==9.38008564||row.to[1]!==9.42494970)throw Error('Invalid divider fit');
  const next=g.clone();allocated.push(next);const position=next.attributes.position,normal=next.attributes.normal,v=new T.Vector3(),n=new T.Vector3(),inverse=mesh.matrixWorld.clone().invert();
  const sy=(row.to[1]-row.to[0])/(row.from[1]-row.from[0]),fit=new T.Matrix4().makeScale(1,sy,1);fit.setPosition(0,row.to[0]-row.from[0]*sy,0);
  const localFit=inverse.clone().multiply(fit).multiply(mesh.matrixWorld),normalFit=new T.Matrix3().getNormalMatrix(localFit);
  for(const i of row.vertices){
   v.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
   if(v.x< -151.17||v.x> -137.09||v.z<49.98||v.z>63.19||v.y<row.from[0]-.00001||v.y>row.from[1]+.00001)throw Error('Divider selection outside repair');
   v.fromBufferAttribute(position,i).applyMatrix4(localFit);position.setXYZ(i,v.x,v.y,v.z);
   if(normal){n.fromBufferAttribute(normal,i).applyMatrix3(normalFit).normalize();normal.setXYZ(i,n.x,n.y,n.z);}
  }
  next.computeBoundingBox();next.computeBoundingSphere();prepared.push({mesh,next,old:g});
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((sum,r)=>sum+(r.next.index.count-r.old.index.count)/3,0);
 for(const {mesh,next}of prepared)mesh.geometry=next;
 fill.material=grass.material;
 return root.userData.mapEdgeFinish1={...patch.metrics,version:1,triangleDelta,meshes:prepared.map(r=>r.mesh.name),materialsPreserved:true,grassFillMaterialMatched:true,addedDrawCalls:0,perFrameWork:0};
}
