import * as T from 'three';
import {FITTED_ITEMS} from './studio-catalog.js';

const owned=Symbol.for('67park.avatar-owned-resources');
const canon=name=>name.replace(/_\d+$/,'');

// Shared by entry preview, local/remote park avatars and all mini-game avatars.
// Runs during assembly only. Original GLBs, skin weights and gorilla hands stay
// untouched; the normal avatar disposer owns the cloned accessory resources.
export function applyGorillaStudioItems(rig,equipment,source) {
  if(!['goril','cat67'].includes(equipment.base))return;
  rig.updateMatrixWorld(true);
  const bones=new Map();
  rig.traverse(o=>{if(o.isBone&&!bones.has(canon(o.name)))bones.set(canon(o.name),o)});
  for(const [id,item] of Object.entries(FITTED_ITEMS)) {
    if(equipment[item.slot]!==id)continue;
    const donor=source(id.split(':')[0]+'.glb');
    if(!donor)throw Error('Outfit asset is not loaded: '+id);
    donor.updateMatrixWorld(true);
    let src;
    donor.traverse(o=>{if(!src&&o.isSkinnedMesh&&o.geometry.attributes.position.count===item.vertices)src=o});
    if(!src)throw Error('Outfit mesh is unavailable: '+id);
    const geometry=src.geometry.clone(),a=geometry.attributes,index=geometry.index,keep=[];
    const allowed=i=>!item.range||item.range.some(([lo,hi])=>i>=lo&&i<hi);
    const hand=i=>{for(let n=0;n<4;n++)if(/^Hand[LR]$/.test(canon(src.skeleton.bones[a.skinIndex.getComponent(i,n)].name))&&a.skinWeight.getComponent(i,n)>.95)return true;return false};
    let removed=0;
    for(let i=0;i<index.count;i+=3){
      const tri=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      if(!tri.every(allowed))continue;
      if(item.clothes){const hands=tri.filter(hand).length;if(hands&&hands!==3){geometry.dispose();throw Error('Outfit wrist topology changed')}if(hands===3){removed++;continue}}
      keep.push(...tri);
    }
    if(item.clothes&&removed!==1120){geometry.dispose();throw Error('Outfit hands validation failed')}
    geometry.setIndex(keep);
    geometry.userData.removedHandTriangles=removed;
    const material=Array.isArray(src.material)?src.material.map(m=>m.clone()):src.material.clone();
    let mesh;
    if(item.rigid){
      src.skeleton.update();
      const used=new Set(keep),position=a.position,v=new T.Vector3(),box=new T.Box3();
      for(const i of used){src.getVertexPosition(i,v).applyMatrix4(src.matrixWorld);position.setXYZ(i,v.x,v.y,v.z);box.expandByPoint(v)}
      const head=rig.getObjectByName(equipment.base==='cat67'?'67Park_Cat_Head':'GORIL_KAFA'),headBone=bones.get('Head');
      if(!head||!headBone)throw Error('Gorilla head attachment is missing');
      const headBox=new T.Box3().setFromObject(head,true),headSize=headBox.getSize(new T.Vector3()),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
      const factor=item.rigid==='hat'?headSize.x*(item.cap?.57:.4)/size.x:headSize.x*.86/size.x;
      // Cat bounds include the tall ears; its eyes sit below the head-box centre.
      const eyeHeight=equipment.base==='cat67'?.295:.46;
      const target=new T.Vector3((headBox.min.x+headBox.max.x)/2,item.rigid==='hat'?headBox.max.y-size.y*factor*(item.cap?.39:.22):headBox.min.y+headSize.y*eyeHeight,item.rigid==='hat'?(headBox.min.z+headBox.max.z)/2:headBox.max.z+.009);
      const inverse=new T.Matrix4().copy(headBone.matrixWorld).invert();
      for(const i of used){v.fromBufferAttribute(position,i);v.x=(v.x-center.x)*factor+target.x;v.y=(v.y-(item.rigid==='hat'?box.min.y:center.y))*factor+target.y;v.z=(v.z-(item.rigid==='hat'?center.z:box.max.z))*factor+target.z;v.applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z)}
      for(let i=0;i<position.count;i++)if(!used.has(i))position.setXYZ(i,0,0,0);
      geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();geometry.computeBoundingSphere();
      mesh=new T.Mesh(geometry,material);headBone.add(mesh);
    }else{
      const mapped=src.skeleton.bones.map(b=>bones.get(canon(b.name)));
      if(mapped.some(b=>!b))throw Error('Outfit rig is incompatible');
      mesh=new T.SkinnedMesh(geometry,material);
      new T.Matrix4().copy(donor.matrixWorld).invert().multiply(src.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);
      rig.add(mesh);rig.updateMatrixWorld(true);
      mesh.bind(new T.Skeleton(mapped,src.skeleton.boneInverses.map(m=>m.clone())),mesh.matrixWorld.clone());
    }
    Object.defineProperty(mesh,owned,{value:true});
    mesh.name='Studio_'+item.slot;mesh.userData.studioEquipment=id;
    mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;
    if(item.clothes){rig.userData.bodySelection=id;const body=rig.getObjectByName('FS_Body');if(body)body.visible=false;for(const name of ['Goril_El_L','Goril_El_R']){const hand=rig.getObjectByName(name);if(hand)hand.visible=true}}
  }
  rig.userData.studioEquipment={...equipment};
  rig.updateMatrixWorld(true);
}
