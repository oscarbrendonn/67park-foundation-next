// Reuse the real sports parcel rather than leaving a raised rectangular mat
// over the older blue-grey court paint. No new meshes, textures or frame work.
export const PARKING_GROUND_DROP=.13;
const assert=(ok,message)=>{if(!ok)throw Error('Parking ground finish: '+message);};
export function finishParkingGround(group,metadata,terrainRoot){
 if(group.userData.parkingGroundFinish)return group.userData.parkingGroundFinish;
 assert(metadata?.version===97&&metadata.revision===5,'source revision changed');
 const floor=group.getObjectByName('SPORTS97_FLOOR_SPORTS97_paving');
 assert(floor?.isMesh&&floor.userData.sportsFloor,'missing parking slab');
 floor.geometry.computeBoundingBox();const box=floor.geometry.boundingBox;
 assert(Math.abs(box.min.x+43.25)<1e-4&&Math.abs(box.max.x+14.75)<1e-4&&Math.abs(box.max.y-PARKING_GROUND_DROP)<1e-5,'slab bounds changed');
 const material=terrainRoot.getObjectByName('5_KB_SPOR_ZEMIN')?.material;
 const entry=material?.userData.sahaCizgi67List?.find(e=>e.anahtar==='ust-pad');
 const oldMask='(1.0-smoothstep(1.6,2.2,ud1_67))+(1.0-smoothstep(1.6,2.2,ud2_67))';
 assert(entry&&entry.govde.split(oldMask).length===2,'legacy court mask changed');
 const changes=[];
 for(const name of ['SPORTS97_FLOOR_SPORTS97_line','SPORTS97_SOLID_SPORTS97_edge']){
  const mesh=group.getObjectByName(name);assert(mesh?.isMesh,'missing '+name);
  const g=mesh.geometry,p=g.attributes.position,ix=g.index,inside=new Set(),outside=new Set();
  for(let i=0;i<(ix?.count??p.count);i+=3){
   const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);
   const hit=ids.every(j=>p.getX(j)>-43.251&&p.getX(j)<-14.749&&p.getZ(j)>-34.801&&p.getZ(j)<-14.799&&p.getY(j)>.14&&p.getY(j)<.28);
   for(const id of ids)(hit?inside:outside).add(id);
  }
  assert(inside.size>0,'missing parking marks/stops '+name);
  assert([...inside].every(i=>!outside.has(i)),'shared outside vertex '+name);
  const next=g.clone(),np=next.attributes.position;
  for(const i of inside)np.setY(i,np.getY(i)-PARKING_GROUND_DROP);
  np.needsUpdate=true;next.computeBoundingBox();next.computeBoundingSphere();
  changes.push({mesh,old:g,next,vertices:inside.size});
 }
 // Commit after all geometry/shader guards pass. The retired source buffers
 // remain available in this result for a reversible inspection, not a reload.
 const originalMask=entry.govde,oldKey=material.customProgramCacheKey,originalParent=floor.parent;
 entry.govde=entry.govde.replace(oldMask,'(1.0-smoothstep(1.6,2.2,ud1_67))');
 material.customProgramCacheKey=function(){return oldKey.call(this)+'|parking-ground-1';};material.needsUpdate=true;
 for(const c of changes)c.mesh.geometry=c.next;
 floor.removeFromParent();
 const result={drop:PARKING_GROUND_DROP,stats:{revision:'parking-ground-1',retiredSlabs:1,removedLegacyParkingTint:true,otherCourtPreserved:true,extraDrawCalls:0,extraTextures:0,xyUnchanged:true,drop:PARKING_GROUND_DROP,changedVertices:changes.map(c=>({name:c.mesh.name,count:c.vertices}))},restore(){
  if(group.userData.parkingGroundFinish!==result)return;
  for(const c of changes){c.mesh.geometry=c.old;c.next.dispose();}originalParent.add(floor);
  entry.govde=originalMask;material.customProgramCacheKey=oldKey;material.needsUpdate=true;
  const fleet=group.userData.parkedFleet38?.root;if(fleet){fleet.position.y=0;fleet.updateMatrix();fleet.updateMatrixWorld(true);}
  delete group.userData.parkingGroundFinish;
 }};
 group.userData.parkingGroundFinish=result;return result;
}
