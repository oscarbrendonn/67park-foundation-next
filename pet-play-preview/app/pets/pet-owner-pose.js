import {Vector3,Quaternion} from 'three';
import {canonicalPoseBoneName} from '/67park-foundation-next/app/character-pose-bones.js';

const rigs=new WeakMap(),scenes=new WeakMap(),failed=new WeakSet();
const a=new Vector3(),b=new Vector3(),target=new Vector3(),axis=new Vector3(),q=new Quaternion(),parent=new Quaternion(),world=new Quaternion();
const end=new Vector3(),pole=new Vector3(),elbow=new Vector3(),goal=new Vector3();
function unchanged(a,b){
  // Authored float32 quaternion keys are not always exactly unit length;
  // angleTo can report an angle even for the same quaternion. Compare the
  // components instead so an untouched overlay never accumulates lean.
  return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z)+Math.abs(a.w-b.w)<1e-8;
}
function aim(bone,child,point){
  bone.getWorldPosition(a);child.getWorldPosition(b);b.sub(a).normalize();target.copy(point).sub(a).normalize();
  bone.getWorldQuaternion(world);bone.parent.getWorldQuaternion(parent).invert();
  q.setFromUnitVectors(b,target).multiply(world).premultiply(parent);
  bone.quaternion.copy(q).normalize();bone.updateWorldMatrix(false,true);
}
function rig(root){
  const bones=[];root.traverse(o=>{const name=canonicalPoseBoneName(o);if(o.isBone&&['Spine1','Spine2','BiscepR','ArmR','HandR'].includes(name))bones.push({o,name,base:o.quaternion.clone(),last:o.quaternion.clone(),applied:false});});
  const r={bones,weight:0};rigs.set(root,r);return r;
}
function apply(root,sample,dt){
  const r=rigs.get(root)||(sample&&rig(root));if(!r)return;
  for(const b of r.bones){if(b.applied&&unchanged(b.o.quaternion,b.last))b.o.quaternion.copy(b.base);b.applied=false;}
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  r.weight=sample?Math.min(1,r.weight+Math.min(.05,dt||0)/.18):0;
  if(!sample){root.updateWorldMatrix(true,true);root.userData.petCare={active:false};return;}
  const w=reduced?1:r.weight*r.weight*(3-2*r.weight);
  root.updateWorldMatrix(true,true);
  for(const bone of r.bones){
    const {o,name}=bone;bone.base.copy(o.quaternion);
    if(name.startsWith('Spine')){
      axis.set(Math.cos(sample.heading),0,-Math.sin(sample.heading));
      o.getWorldQuaternion(world);o.parent.getWorldQuaternion(parent).invert();
      q.setFromAxisAngle(axis,(sample.action==='throw'?.045:.18)*w);
      o.quaternion.copy(parent).multiply(q).multiply(world).normalize();
    }else continue;
    bone.last.copy(o.quaternion);bone.applied=true;o.updateWorldMatrix(false,true);
  }
  let handPoint=null,reachGap=null;
  for(const bone of r.bones.filter(b=>b.name==='BiscepR')){
    const upper=bone.o,lower=upper.children.find(n=>canonicalPoseBoneName(n)==='ArmR'),hand=lower?.children.find(n=>canonicalPoseBoneName(n)==='HandR');
    const lowerRow=r.bones.find(b=>b.o===lower);if(!hand||!lowerRow)continue;
    bone.base.copy(upper.quaternion);lowerRow.base.copy(lower.quaternion);
    upper.getWorldPosition(a);lower.getWorldPosition(b);hand.getWorldPosition(end);
    const l1=a.distanceTo(b),l2=b.distanceTo(end);if(l1<.001||l2<.001)continue;
    goal.set(sample.point.x,sample.point.y,sample.point.z);
    if(sample.action==='pet')goal.y+=reduced?0:Math.sin(sample.time*5)*.025;
    if(sample.action==='throw')goal.y+=.35;
    axis.copy(goal).sub(a);const distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,axis.length()));axis.normalize();
    pole.set(Math.cos(sample.heading),-.6,-Math.sin(sample.heading));pole.addScaledVector(axis,-pole.dot(axis)).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    elbow.copy(a).addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
    aim(upper,lower,elbow);aim(lower,hand,goal);
    upper.quaternion.slerp(bone.base,1-w);lower.quaternion.slerp(lowerRow.base,1-w);
    for(const row of [bone,lowerRow]){row.o.quaternion.normalize();row.last.copy(row.o.quaternion);row.applied=true;row.o.updateWorldMatrix(false,true);}
    hand.getWorldPosition(end);handPoint={x:end.x,y:end.y,z:end.z};reachGap=end.distanceTo(goal);
  }
  root.userData.petCare={active:true,action:sample.action,bones:r.bones.length,weight:w,hand:handPoint,reachGap};
}
export function queuePetOwnerPose(root,sample,dt){
  if(!root||failed.has(root)||(!sample&&!rigs.has(root)))return;
  let scene=root;while(scene.parent)scene=scene.parent;if(!scene.isScene)return;
  let pending=scenes.get(scene);
  if(!pending){pending=new Map();scenes.set(scene,pending);const previous=scene.onBeforeRender;scene.onBeforeRender=function(...args){previous?.apply(this,args);for(const [actor,row]of pending)try{apply(actor,...row);}catch(error){failed.add(actor);actor.userData.petCare={active:false,error:String(error)};}pending.clear();};}
  pending.set(root,[sample,dt]);
}
