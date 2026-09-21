import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const BASES=['6_BORDUR','7_KALDIRIM_TABANI'];
const SLOTS=['7_KALDIRIM_TABANI_PARK_ENTRY57_WEST_SLOT','7_KALDIRIM_TABANI_PARK_ENTRY57_EAST_SLOT'];
const TIPS=['6_BORDUR_PARK_ENTRY57_WEST_TIP','6_BORDUR_PARK_ENTRY57_EAST_TIP'];
const TARGETS=[...BASES,...SLOTS,...TIPS];
const WINDOWS=[[167.14,113.48,168.59,116.34474498],[175.58,113.48,177.04,116.34474498]];

// One startup transaction before terrain/camera indexing. The two existing
// shoulder solids replace their obsolete rounded join faces. No overlay,
// new material, extra draw call, collider policy or frame callback is added.
export function applyParkEntryFinish(root,patch){
 if(root.userData.parkEntryFinish1)return root.userData.parkEntryFinish1;
 if(patch?.version!==1||patch.top!==9.38008564||patch.bottom!==8.79||JSON.stringify(patch.windows)!==JSON.stringify(WINDOWS)||!Array.isArray(patch.meshes)||patch.meshes.length!==6)throw Error('Invalid park-entry patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[],seen=new Set();
 try{
  for(const row of patch.meshes){
   if(!TARGETS.includes(row.name)||seen.has(row.name))throw Error('Invalid park-entry target');seen.add(row.name);
   const mesh=root.getObjectByName(row.name),old=mesh?.geometry,e=row.expected;
   if(!mesh?.isMesh||Array.isArray(mesh.material)||!old?.index||old.attributes.position?.count!==e?.vertices||old.index.count!==e.indices||crc(old.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(old.index.array))!==e.indexCRC)throw Error('Park-entry source changed: '+row.name);
   if(Object.keys(old.morphAttributes).length||Object.values(old.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported park-entry attributes');
   const count=row.p?.length/3,remove=new Set(row.remove||[]),empty=TIPS.includes(row.name);
   if(row.replace!==!BASES.includes(row.name)||!Number.isInteger(count)||count<0||(!empty&&!count)||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||!Array.isArray(row.ix)||row.ix.length%3||(!empty&&!row.ix.length)||empty&&(count||row.ix.length)||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid park-entry geometry');
   if(!Array.isArray(row.remove)||remove.size!==row.remove.length||[...remove].some(i=>!Number.isInteger(i)||i%3||i<0||i>=old.index.count)||row.replace&&remove.size)throw Error('Invalid park-entry clipping');
   if(SLOTS.includes(row.name)){
    const bounds=WINDOWS[SLOTS.indexOf(row.name)];
    for(let i=0;i<row.p.length;i+=3)if(row.p[i]<bounds[0]-.00001||row.p[i]>bounds[2]+.00001||row.p[i+2]<bounds[1]-.00001||row.p[i+2]>bounds[3]+.00001||![patch.top,patch.bottom].some(y=>Math.abs(row.p[i+1]-y)<1e-8))throw Error('Park-entry shoulder outside repair');
   }
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=old.clone();allocated.push(next);const previousCount=row.replace?0:e.vertices;
   for(const [key,previous] of Object.entries(old.attributes)){
    const values=new previous.array.constructor((previousCount+count)*previous.itemSize);
    if(previousCount)values.set(previous.array);
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,previousCount*previous.itemSize);
    else for(let i=0;i<count;i++)for(let j=0;j<previous.itemSize;j++)values[(previousCount+i)*previous.itemSize+j]=key==='uv'&&previous.itemSize===2?(j===0?row.p[i*3]:-row.p[i*3+2]):previous.array[j];
    next.setAttribute(key,new T.BufferAttribute(values,previous.itemSize,previous.normalized));
   }
   const ix=[];
   if(!row.replace)for(let i=0;i<old.index.count;i+=3)if(!remove.has(i))ix.push(old.index.getX(i),old.index.getX(i+1),old.index.getX(i+2));
   for(const i of row.ix)ix.push(previousCount+i);
   next.setIndex(ix);next.clearGroups();next.setDrawRange(0,ix.length);next.computeBoundingBox();next.computeBoundingSphere();
   prepared.push({mesh,next,old});
  }
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((s,r)=>s+(r.next.index.count-r.old.index.count)/3,0);
 for(const {mesh,next} of prepared)mesh.geometry=next;
 for(const g of allocated)if(!prepared.some(r=>r.next===g))g.dispose();
 return root.userData.parkEntryFinish1={...patch.metrics,version:1,meshes:prepared.map(r=>r.mesh.name),triangleDelta,materialsPreserved:true,addedDrawCalls:0,perFrameWork:0};
}
