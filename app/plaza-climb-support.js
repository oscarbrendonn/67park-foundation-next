import {createCityHeightSampler58} from '../island/city-height-sampler58.js?v=plaza-climb-1';
import * as T from 'three';
import {RoundedBoxGeometry} from '../island/utils/RoundedBoxGeometry.js';

// The plaza's old obstacle boxes deliberately fill whole shops and planters.
// Characters need the rendered leaves, curved awnings and mouldings instead.
// Keep the original vehicle query. Index existing upward faces once, never
// scene-raycast per frame, and never use a lower window sill INSIDE a shop.
export function createPlazaClimbSupports(scene){
 const group=scene.getObjectByName('LOWER_PLAZA_V83');if(!group)return null;
 let meta;const meshes=[],floors=[];
 group.traverse(m=>{
  if(m.userData.plaza83)meta=m.userData.plaza83;
  if(m.name==='PLAZA83_WALKABLE_GROUND')floors.push(m);
  else if(m.isMesh&&!/COLLIDER|_(glass|reflection|warm|bulb|cord|brass|flower)$/.test(m.name))meshes.push(m);
 });
 if(!meta?.shops?.length||!Array.isArray(meta.colliders)||meta.pad?.length!==4||!floors.length)throw Error('Plaza climbing metadata missing');
 // This district is within +/- 115m. Float32 storage halves this new index;
 // release probes compare interpolation against the original rendered faces.
 let sampler=createCityHeightSampler58(meshes,{cellSize:2,precision:'float32'});
 let pavingSampler=createCityHeightSampler58(floors,{cellSize:4,precision:'float32'});
 const {cx,cz,ground:floor,pad}=meta;
 const shops=meta.shops.map(p=>({...p,cos:Math.cos(p.yaw),sin:Math.sin(p.yaw)}));
 // Short rounded caps extend each existing upper-window sill and head. Their
 // position is measured from authored trim, not an invisible generic staircase.
 // Shared geometry/material, one instanced draw for all 11 shop fronts.
 const caps=[];
 for(const p of shops){
  let start=null;
  const close=end=>{if(start!==null&&end-start>.7)for(const height of [6.04,8.90])caps.push({p,u:(start+end)/2,width:end-start,top:floor+height});start=null;};
  for(let u=-p.width/2+.5;u<=p.width/2-.4;u+=.1){
   const v=p.depth/2+.28,x=cx+p.x+p.cos*u+p.sin*v,z=cz+p.z-p.sin*u+p.cos*v;
   const h=sampler.height(x,z,floor+9.1);
   if(h!==null&&h>floor+8.8){if(start===null)start=u;}
   else close(u);
  }
  close(p.width/2-.4);
 }
 let ledgeMesh=null,ledgeSampler=null;
 if(caps.length){
  const material=meshes.find(m=>m.name==='PLAZA83_edge')?.material;
  if(!material)throw Error('Plaza window trim material missing');
  ledgeMesh=new T.InstancedMesh(new RoundedBoxGeometry(1,.22,1.15,1,.08),material,caps.length);
  ledgeMesh.name='PLAZA83_CLIMB_WINDOW_CAPS';ledgeMesh.castShadow=true;ledgeMesh.receiveShadow=true;ledgeMesh.userData.safeShadowCaster=true;
  const collision=[];
  for(const [n,c]of caps.entries()){
   const {p,u}=c,v=p.depth/2+.47;
   const matrix=new T.Matrix4().compose(new T.Vector3(p.x+p.cos*u+p.sin*v,c.top-floor-.11,p.z-p.sin*u+p.cos*v),
    new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw),new T.Vector3(c.width,1,1));
   ledgeMesh.setMatrixAt(n,matrix);
   const mesh=new T.Mesh(ledgeMesh.geometry,material);
   new T.Matrix4().copy(group.matrixWorld).multiply(matrix).decompose(mesh.position,mesh.quaternion,mesh.scale);collision.push(mesh);
  }
  try{ledgeSampler=createCityHeightSampler58(collision,{cellSize:2});}catch(error){ledgeMesh.geometry.dispose();throw error;}
  ledgeMesh.instanceMatrix.needsUpdate=true;ledgeMesh.computeBoundingSphere();group.add(ledgeMesh);group.updateMatrixWorld(true);
 }
 const props=meta.colliders.filter(p=>!/shop |entrance step/.test(p.label)).map(p=>({...p,cos:Math.cos(p.yaw||0),sin:Math.sin(p.yaw||0)}));
 const inside=(p,x,z,w=p.w,d=p.d)=>{
  const dx=x-p.x,dz=z-p.z;
  return p.kind==='circle'?dx*dx+dz*dz<=p.r*p.r:Math.abs(dx*p.cos-dz*p.sin)<=w/2&&Math.abs(dx*p.sin+dz*p.cos)<=d/2;
 };
 function contains(x,z){return x>=cx+pad[0]&&x<=cx+pad[2]&&z>=cz+pad[1]&&z<=cz+pad[3];}
 function sample(x,z,ceiling=Infinity){let a=sampler?.sample(x,z,ceiling);for(const b of [ledgeSampler?.sample(x,z,ceiling),pavingSampler?.sample(x,z,ceiling)])if(b&&(!a||b.point.y>a.point.y))a=b;return a??null;}
 function ground(x,z,feet,step,base){
  if(!sampler||!Number.isFinite(feet)||!contains(x,z))return base;
  const paving=pavingSampler.height(x,z);if(paving===null)return base;
  const px=x-cx,pz=z-cz;
  const shop=shops.find(p=>inside(p,px,pz,p.width,p.depth));
  if(shop){
   if(base>floor+shop.height+1)return base; // a home interior/other taller model
   // The highest real roof closes the entire building below it, regardless of
   // the current feet height. This is NOT a 'walk through walls' height clamp.
   return Math.max(paving,sample(x,z)?.point.y??floor+shop.height);
  }
  const prop=props.find(p=>inside(p,px,pz));
  if(prop){
   if(prop.label==='central pavilion'||prop.label==='light post'||base>floor+prop.top+1)return base;
   return Math.max(paving,sample(x,z)?.point.y??paving);
  }
  if(base>floor+11.05+1)return base;
  // Layered support: walking under a canopy stays on the paving. Landing on
  // it does not jump up to a roof or window head above the player's feet.
  const surface=sample(x,z,feet+step)?.point.y??paving;
  // Support is strictly below the feet plus the allowed step. A low sill is
  // an obstacle, never an airborne floor that can reset a jump mid-ascent.
  return Math.max(paving,surface);
 }
 function obstacleGround(x,z,feet,step,base){
  const support=ground(x,z,feet,step,base);
  if(!Number.isFinite(support)||!Number.isFinite(feet)||!contains(x,z))return support;
  // Preserve the existing horizontal torso blocker without promoting it into
  // vertical support. Callers use this only for sweeps/curbs, not grounding.
  const overhead=ledgeSampler?.height(x,z,feet+1.45);
  return Math.max(support,overhead!==null&&overhead>feet+step?overhead:-Infinity);
 }
 const stats={revision:'plaza-climb-1',shops:shops.length,...sampler.stats,windowCaps:caps.length,
  bytes:sampler.stats.bytes+pavingSampler.stats.bytes+(ledgeSampler?.stats.bytes??0),addedDrawCalls:ledgeMesh?1:0,newAssetDownloads:0};
 stats.capBounds=ledgeSampler?.stats.bounds;
 return {ground,obstacleGround,sample,contains,stats,dispose(){sampler=ledgeSampler=pavingSampler=null;ledgeMesh?.removeFromParent();ledgeMesh?.geometry.dispose();ledgeMesh=null;meshes.length=floors.length=shops.length=props.length=0;stats.disposed=true;}};
}
