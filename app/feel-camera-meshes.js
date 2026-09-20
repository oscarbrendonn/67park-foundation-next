import {Raycaster,Box3,Mesh,MeshBasicMaterial,DoubleSide,Vector3,Matrix4} from 'three';
// Reuse the world's authored collision mesh list, never traverse avatars/FX.
// Bounding-box rejection keeps triangle work local to the short camera boom.
const indexes=new WeakMap();
function refresh(record,material){
 const {mesh}=record,count=mesh.isInstancedMesh?mesh.count:1;
 const geometry=mesh.geometry;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 mesh.updateWorldMatrix(true,false);
 const version=mesh.isInstancedMesh?mesh.instanceMatrix.version:0;
 if(record.geometry===geometry&&record.count===count&&record.version===version&&record.world.equals(mesh.matrixWorld))return;
 if(record.geometry!==geometry||record.count!==count){
  record.rows=Array.from({length:count},()=>{const proxy=new Mesh(geometry,material);proxy.matrixAutoUpdate=false;return {proxy,box:new Box3()}});
 }
 for(let i=0;i<count;i++){
  const row=record.rows[i];
  if(mesh.isInstancedMesh){mesh.getMatrixAt(i,record.instance);row.proxy.matrixWorld.multiplyMatrices(mesh.matrixWorld,record.instance)}
  else row.proxy.matrixWorld.copy(mesh.matrixWorld);
  row.box.copy(geometry.boundingBox).applyMatrix4(row.proxy.matrixWorld);
 }
 record.geometry=geometry;record.count=count;record.version=version;record.world.copy(mesh.matrixWorld);
}
export function cameraMeshCast(world,origin,direction,length){
 if(!world?.blockers?.length)return null;
 let index=indexes.get(world);
 if(!index||index.source!==world.blockers||index.count!==world.blockers.length){
  index?.material.dispose();
  const material=new MeshBasicMaterial({side:DoubleSide});
  // Authored house batches are InstancedMesh too. They belong to the same
  // explicit camera-blocker list; excluding them lets the boom enter houses.
  // Per-instance bounds avoid treating empty space between houses as a wall.
  // Proxies share buffers, never join the scene and add no draw calls.
  const records=world.blockers.filter(m=>m.isMesh&&!m.isSkinnedMesh).map(mesh=>({mesh,rows:[],world:new Matrix4(),instance:new Matrix4(),count:-1}));
  index={records,material,ray:new Raycaster(),hits:[],point:new Vector3(),source:world.blockers,count:world.blockers.length};indexes.set(world,index);
 }
 const {ray,hits,point}=index;ray.ray.origin.set(origin.x,origin.y,origin.z);ray.ray.direction.set(direction.x,direction.y,direction.z);ray.near=.02;ray.far=length;
 let closest=null;
 for(const record of index.records){
  let visible=true;for(let node=record.mesh;node;node=node.parent)if(!node.visible){visible=false;break;}
  if(!visible||record.mesh.userData?.cameraIgnore)continue;
  refresh(record,index.material);
  for(const row of record.rows){
   if(!row.box.containsPoint(ray.ray.origin)&&(!ray.ray.intersectBox(row.box,point)||point.distanceTo(ray.ray.origin)>ray.far))continue;
   hits.length=0;row.proxy.raycast(ray,hits);
   for(const hit of hits)if(closest===null||hit.distance<closest){closest=hit.distance;ray.far=closest;}
  }
 }
 return closest;
}
