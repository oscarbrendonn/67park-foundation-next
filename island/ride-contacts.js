import * as T from 'three';
import {createRideSolidSampler} from './ride-solid-sampler.js?v=ride-contacts-1';

const FOOT=.555,HEAD=1.45,SKIN=.012;
const TAU=Math.PI*2,MAX_ELAPSED=5,ANGLE_JITTER=.06,MAX_CARRY_DISTANCE=6;
const monotonicNow=()=>globalThis.performance?.now?.()??Date.now();
const finite=p=>p&&Number.isFinite(p.x+p.y+p.z);
const inBox=(b,x,z)=>x>=b.min.x-.001&&x<=b.max.x+.001&&z>=b.min.z-.001&&z<=b.max.z+.001;

// The coaster is hollow underneath, and the Ferris cabins move. Index their
// rendered surfaces once; do not cast through the entire park on every step.
// A single cabin index is shared by all twelve upright cabin instances.
export function createRideContacts({group,rides},{now=monotonicNow}={}){
 group.updateWorldMatrix(true,true);
 const coaster=group.children.filter(m=>m.isMesh&&m.name==='LUNA77_coaster');
 const ferris=rides.find(r=>r.asset==='ferris');
 if(!coaster.length||!ferris)throw Error('Ride contact geometry missing');
 const angularSpeed=TAU/ferris.stats.period;
 if(!Number.isFinite(angularSpeed)||angularSpeed<=0)throw Error('Ferris contact clock missing');
 const fixed=ferris.group.children.filter(m=>m.isMesh&&!m.isInstancedMesh);
 const cabins=ferris.group.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('LUNA84_UPRIGHT_CABINS_'));
 if(cabins.length!==3||cabins.some(m=>m.count!==12))throw Error('Ferris cabin instances changed');
 const staticMeshes=[...coaster,...fixed];
 const statics=createRideSolidSampler(staticMeshes,{cellSize:1});
 const localMeshes=cabins.map(m=>new T.Mesh(m.geometry,m.material));
 const cabin=createRideSolidSampler(localMeshes,{cellSize:.5});
 if(statics.stats.skippedOversized||cabin.stats.skippedOversized)throw Error('Ride contact index exceeded its safety budget');
 const staticBox=new T.Box3();for(const m of staticMeshes)staticBox.expandByObject(m);
 const cabinBox=new T.Box3();for(const m of localMeshes)cabinBox.expandByObject(m);
 const regions=[new T.Box3().setFromObject(ferris.group),new T.Box3()];
 for(const m of coaster)regions[1].expandByObject(m);
 // The static AABB is only a broad phase, never a filled-in solid.
 const matrices=Array.from({length:12},()=>({matrix:new T.Matrix4(),inverse:new T.Matrix4(),box:new T.Box3(),origin:new T.Vector3()}));
 const point=new T.Vector3();let version=-1,disposed=false;
 const cache=new Map(),bodyStates=new WeakMap(),jumpGrounded=new WeakMap();
 const stats={revision:'ride-contacts-1',groundedJumpVersion:1,launchSyncVersion:1,staticTriangles:statics.stats.triangles,cabinTriangles:cabin.stats.triangles,
  cabinInstances:12,estimatedNumericBytes:statics.stats.bytes+cabin.stats.bytes,addedDrawCalls:0,newAssetDownloads:0,queries:0};
 function sync(){
  if(version===cabins[0].instanceMatrix.version)return;
  version=cabins[0].instanceMatrix.version;cache.clear();
  for(let i=0;i<12;i++){
   const row=matrices[i];cabins[0].getMatrixAt(i,row.matrix);row.matrix.premultiply(cabins[0].matrixWorld);
   const e=row.matrix.elements;
   if(Math.abs(e[1])+Math.abs(e[4])+Math.abs(e[6])+Math.abs(e[9])>1e-6||e[5]<=0)throw Error('Ferris cabins must remain upright');
   row.inverse.copy(row.matrix).invert();row.origin.setFromMatrixPosition(row.matrix);row.box.copy(cabinBox).applyMatrix4(row.matrix);
  }
 }
 function contains(x,z){return !disposed&&Number.isFinite(x+z)&&regions.some(b=>inBox(b,x,z));}
 function sample(x,z){
  if(!contains(x,z))return {surfaces:[],intervals:[]};
  sync();const key=x+','+z;if(cache.has(key))return cache.get(key);
  stats.queries++;const out={surfaces:[],intervals:[]};
  if(inBox(staticBox,x,z)){
   const hit=statics.sample(x,z);
   for(const y of hit.surfaces)out.surfaces.push({y,cabin:null});
   for(const span of hit.intervals)out.intervals.push({min:span[0],max:span[1],cabin:null});
  }
  for(let i=0;i<12;i++){
   const row=matrices[i];if(!inBox(row.box,x,z))continue;
   point.set(x,0,z).applyMatrix4(row.inverse);
   const hit=cabin.sample(point.x,point.z),sy=row.matrix.elements[5],oy=row.origin.y;
   for(const y of hit.surfaces)out.surfaces.push({y:oy+sy*y,cabin:i});
   for(const span of hit.intervals)out.intervals.push({min:oy+sy*span[0],max:oy+sy*span[1],cabin:i});
  }
  if(cache.size>=128)cache.clear();cache.set(key,out);return out;
 }
 function support(x,z,feet,step=.36){
  if(!Number.isFinite(feet))return null;
  const ceiling=feet+(step>.02?Math.max(.55,step):step)+1e-5;
  let best=null;for(const s of sample(x,z).surfaces)if(s.y<=ceiling&&(!best||s.y>best.y))best=s;
  return best;
 }
 function ground(x,z,feet,step,base){const hit=support(x,z,feet,step);return hit?Math.max(base??-Infinity,hit.y):base;}
 function obstacle(x,z,feet,step,base){
  let top=ground(x,z,feet,step,base);if(!Number.isFinite(feet))return top;
  for(const s of sample(x,z).intervals)if(s.max>feet+Math.max(step,SKIN)&&s.min<feet+HEAD-SKIN)top=Math.max(top??-Infinity,s.max);
  return top;
 }
 function ceiling(x,z,feet){
  let y=Infinity;for(const s of sample(x,z).intervals)if(s.min>=feet+HEAD-SKIN)y=Math.min(y,s.min);
  return y;
 }
 function prepareBody(body,{skip=false,jumpQueued=false}={}){
  if(disposed||skip){bodyStates.delete(body);jumpGrounded.delete(body);return;}
  let p={...body.translation()},v=body.linvel(),before=bodyStates.get(body),carried=null;
  if(!finite(p)||!finite(v)||!contains(p.x,p.z)){bodyStates.delete(body);jumpGrounded.delete(body);return;}
  jumpGrounded.delete(body);
  sync();
  if(before&&Math.hypot(p.x-before.position.x,p.y-before.position.y,p.z-before.position.z)>8)before=null;
  const time=now(),angle=ferris.angle,maxCredit=angularSpeed*MAX_ELAPSED+ANGLE_JITTER;
  let angleCredit=ANGLE_JITTER,continuous=false;
  if(before&&Number.isFinite(time+angle+before.time+before.angle)){
   const elapsed=(time-before.time)/1e3,delta=Math.atan2(Math.sin(angle-before.angle),Math.cos(angle-before.angle));
   if(elapsed>=0&&elapsed<=MAX_ELAPSED){
    angleCredit=Math.min(maxCredit,before.angleCredit+angularSpeed*elapsed);
    continuous=Math.abs(delta)<=angleCredit&&delta>=-ANGLE_JITTER;
    angleCredit=continuous?Math.min(maxCredit,angleCredit-delta):ANGLE_JITTER;
   }
  }
  // Queueing a jump does not make the rider airborne until the controller
  // consumes it. Synchronize its verified support BEFORE launch, just as for
  // a standing rider. Save the narrow release proof before moving p.
  const supported=continuous&&before?.contact&&v.y<=.2&&Math.abs(p.y-FOOT-before.contact.y)<.22;
  const queuedRelease=!!(jumpQueued&&supported&&Math.hypot(p.x-before.position.x,p.z-before.position.z)<=.12);
  if(supported&&(!jumpQueued||queuedRelease)){
   const row=matrices[before.contact.cabin],delta=row.origin.clone().sub(before.origin);
   // Prove continuous travel from the authored wheel rate and elapsed time.
   // A slow frame may legitimately cover >2m; a stale/resumed clock still
   // cannot fling an avatar. Credit also bridges capped network extrapolation.
   if(delta.length()<=MAX_CARRY_DISTANCE){p.x+=delta.x;p.y+=delta.y;p.z+=delta.z;body.setTranslation(p,true);carried={x:delta.x,y:delta.y,z:delta.z};}
  }
  if(before&&v.y>0){
   let cap=Infinity;
   for(const [dx,dz]of [[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]])cap=Math.min(cap,ceiling(p.x+dx,p.z+dz,before.position.y-FOOT));
   const limit=cap-HEAD+FOOT-SKIN;
   if(p.y>limit){p.y=limit;body.setTranslation(p,true);body.setLinvel({x:v.x,y:0,z:v.z},true);}
  }
  const hit=support(p.x,p.z,p.y-FOOT,.012);
  // Record a near floor even after the gravity substep; acquiring contact must
  // never attach a jumping avatar or somebody walking underneath a cabin.
  const near=hit&&hit.cabin!==null&&Math.abs(p.y-FOOT-hit.y)<.12?hit:
   sample(p.x,p.z).surfaces.find(s=>s.cabin!==null&&Math.abs(p.y-FOOT-s.y)<.095);
  // Exactly one grounded query can consume this synchronized launch. Do not
  // retain contact for the next frame, even if vertical speed is still zero.
  // Walk-off, teleport, stale clock, oversized carrier travel and an already
  // upward body cannot acquire this token or queued transport.
  if(queuedRelease&&carried)jumpGrounded.set(body,true);
  const contact=v.y<=.2&&!jumpQueued?near:null;
  bodyStates.set(body,{position:p,contact,origin:contact?matrices[contact.cabin].origin.clone():null,time,angle,angleCredit});
  // The caller moves its previous sweep anchor by the same carrier delta.
  // Only the player's own relative motion is swept against cabin walls.
  return carried;
 }
 function consumeJumpGrounded(body,vertical=0){
  const token=jumpGrounded.get(body);jumpGrounded.delete(body);
  return !disposed&&token===true&&Number.isFinite(vertical)&&vertical<=.2;
 }
 return {contains,sample,support,ground,obstacle,prepareBody,consumeJumpGrounded,stats,dispose(){disposed=true;statics.dispose();cabin.dispose();cache.clear();localMeshes.length=0;stats.disposed=true;}};
}

export function installRideContacts(world){
 if(world.rideContacts)return world;
 if(!world.lunapark||typeof world.rideGround!=='function')throw Error('Ride contact world adapter missing');
 const contacts=createRideContacts(world.lunapark);
 const priorGround=world.characterGround,priorObstacle=world.characterObstacle;
 // Forward through the current ground decorators (toys and home interiors).
 // The fourth argument omits only the obsolete coaster/Ferris height boxes.
 const enabled=(x,z)=>contacts.contains(x,z);
 world.characterGround=(x,z,feet,step=.36)=>enabled(x,z)?contacts.ground(x,z,feet,step,world.ground(x,z,false,true)):
  priorGround?priorGround(x,z,feet,step):world.ground(x,z);
 world.characterObstacle=(x,z,feet,step=.36)=>enabled(x,z)?contacts.obstacle(x,z,feet,step,world.ground(x,z,false,true)):
  priorObstacle?priorObstacle(x,z,feet,step):world.characterGround(x,z,feet,step);
 world.rideContacts=contacts;
 world.renderer.domElement.dataset.rideContacts=JSON.stringify(contacts.stats);
 const dispose=world.dispose;world.dispose=function(...args){contacts.dispose();return dispose?.apply(this,args);};
 return world;
}
