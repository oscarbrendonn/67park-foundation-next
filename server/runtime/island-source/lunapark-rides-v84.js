import * as T from 'three';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';

const TAU=Math.PI*2;
const labels={ferris:'Dönme dolap',carousel:'Atlıkarınca',carouselSmall:'Küçük atlıkarınca'};
const meshList=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
const partOf=o=>{for(let n=o;n;n=n.parent)if(n.userData.ridePart84)return n.userData.ridePart84;return null;};

/** Batch the toy model without flattening its mechanical articulation.
 * Twelve open gondolas share material batches; horses share five draws.
 * Only rigid transforms change; source vertices/materials remain untouched.
 */
export function createRideAsset84(source,{asset,transform,material}){
 source.updateMatrixWorld(true);
 let authored;source.traverse(o=>{if(o.userData.ride84)authored=o;});
 if(!authored)throw Error('Ride articulation missing: '+asset);
 const meta=authored.userData.ride84,scale=new T.Vector3().setFromMatrixScale(authored.matrixWorld);
 const group=new T.Group();group.name='LUNA84_'+asset;
 transform.decompose(group.position,group.quaternion,group.scale);group.updateMatrixWorld(true);
 const inv=transform.clone().invert(),origin=new T.Vector3().setFromMatrixPosition(transform);
 const yaw=new T.Euler().setFromQuaternion(group.quaternion,'YXZ').y;
 const blockers=[],instances=[],local=new T.Vector3(),matrix=new T.Matrix4();
 const center=meta.center?new T.Vector3(...meta.center).applyMatrix4(authored.matrixWorld):new T.Vector3();
 const radius=meta.radius*scale.x,hang=(meta.hang||0)*scale.y;
 const entry=new T.Vector3(...meta.entry).applyMatrix4(authored.matrixWorld).applyMatrix4(transform);
 const seats=[],cabinPositions=[],cabinColors=[],horseBases=[];
 const poleBases=[];source.traverse(o=>{if(Number.isInteger(o.userData.ridePole87)){const b=new T.Box3().setFromObject(o),p=b.getCenter(new T.Vector3());poleBases.push({p,minY:b.min.y,maxY:b.max.y,radius:Math.max(b.max.x-b.min.x,b.max.z-b.min.z)/2});}});
 const slotOffsets=meta.kind==='ferris'?(meta.seatOffsets||[meta.seat]):null,seatsPerCabin=slotOffsets?.length||1;
 const occupants=new Map();
 let angle=0,rotor=null,occupied=false,liftScale=1;
 const lift=index=>(meta.lift?.stroke||0)*scale.y*liftScale*.5*(1-Math.cos(angle*(meta.lift?.cycles||1)+index*Math.PI));
 function batches(meshes,space=new T.Matrix4(),paint=false){
  const bins=new Map();
  for(const o of meshes){
   const isPaint=paint&&['rose','blue','yellow','sage'].includes(o.material.name);
   const key=isPaint?'cabin-paint':o.material.uuid;
   let b=bins.get(key);
   if(!b){let src=o.material;if(isPaint){src=src.clone();src.name='ride84 cabin paint';src.color.set(0xffffff);}
    b={material:material(src),geometries:[],paint:isPaint};bins.set(key,b);}
   const geo=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(space,o.matrixWorld));
   for(const name of Object.keys(geo.attributes))if(!['position','normal'].includes(name))geo.deleteAttribute(name);
   if(!geo.index)geo.setIndex(Array.from({length:geo.attributes.position.count},(_,i)=>i));
   b.geometries.push(geo);
  }
  return [...bins.values()].map(b=>{const geometry=mergeGeometries(b.geometries);for(const g of b.geometries)g.dispose();
   if(!geometry)throw Error('Ride batch failed: '+asset);geometry.computeBoundingBox();geometry.computeBoundingSphere();return {...b,geometry};});
 }
 function addBatches(parent,bins){for(const b of bins){const m=new T.Mesh(b.geometry,b.material);m.name=group.name+'_'+b.material.name;
  m.castShadow=!b.material.transparent;m.receiveShadow=true;m.userData.safeShadowCaster=m.castShadow;parent.add(m);blockers.push(m);}}
 const all=meshList(source);
 addBatches(group,batches(all.filter(o=>!partOf(o))));
 if(meta.kind==='ferris'){
  rotor=new T.Group();rotor.name='LUNA84_WHEEL';rotor.position.copy(center);group.add(rotor);
  addBatches(rotor,batches(all.filter(o=>partOf(o)==='wheel'),new T.Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
  const cabins=[];source.traverse(o=>{if(o.userData.ridePart84==='cabin')cabins.push(o);});cabins.sort((a,b)=>a.userData.rideIndex84-b.userData.rideIndex84);
  if(cabins.length!==12)throw Error('Ferris requires 12 gondolas');
  const first=new T.Vector3().setFromMatrixPosition(cabins[0].matrixWorld);
  const bins=batches(meshList(cabins[0]),new T.Matrix4().makeTranslation(-first.x,-first.y,-first.z),true);
  for(const cabin of cabins){cabinPositions.push(new T.Vector3());cabinColors.push(new T.Color(cabin.userData.ridePaint84));}
  for(const b of bins){const m=new T.InstancedMesh(b.geometry,b.material,12);m.name='LUNA84_UPRIGHT_CABINS_'+b.material.name;
   m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.castShadow=!b.material.transparent;m.receiveShadow=true;m.userData.safeShadowCaster=m.castShadow;
   // A fixed conservative bound covers the complete wheel at every phase.
   const cb=b.geometry.boundingBox,extent=new T.Vector3(Math.max(Math.abs(cb.min.x),Math.abs(cb.max.x)),Math.max(Math.abs(cb.min.y),Math.abs(cb.max.y)),Math.max(Math.abs(cb.min.z),Math.abs(cb.max.z))).length();
   m.boundingSphere=new T.Sphere(center.clone().add(new T.Vector3(0,-hang,0)),radius+extent);
   if(b.paint)for(let i=0;i<12;i++)m.setColorAt(i,cabinColors[i]);
   group.add(m);instances.push(m);blockers.push(m);
  }
 }else{
  rotor=new T.Group();rotor.name='LUNA84_CAROUSEL';group.add(rotor);
  addBatches(rotor,batches(all.filter(o=>partOf(o)==='platform')));
  source.traverse(o=>{if(Number.isInteger(o.userData.rideSeat84)){
   const position=new T.Vector3().setFromMatrixPosition(o.matrixWorld);
   const facing=new T.Vector3(1,0,0).transformDirection(o.matrixWorld);
   seats.push({index:o.userData.rideSeat84,position,heading:Math.atan2(facing.x,facing.z)});
  }});seats.sort((a,b)=>a.index-b.index);
  if(seats.length!==(asset==='carouselSmall'?6:10))throw Error('Carousel saddles missing');
  const horses=[];source.traverse(o=>{if(o.userData.ridePart84==='horse')horses.push(o);});horses.sort((a,b)=>a.userData.rideIndex84-b.userData.rideIndex84);
  if(horses.length!==seats.length)throw Error('Individually lifted horses missing');
  for(const horse of horses)horseBases.push(horse.matrixWorld.clone());
  const bins=batches(meshList(horses[0]),horses[0].matrixWorld.clone().invert());
  for(const b of bins){const m=new T.InstancedMesh(b.geometry,b.material,horses.length);m.name='LUNA85_LIFTING_HORSES_'+b.material.name;
   m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.castShadow=true;m.receiveShadow=true;m.userData.safeShadowCaster=true;
   m.boundingSphere=new T.Sphere(new T.Vector3(0,2*scale.y,0),radius+3.5);
   rotor.add(m);instances.push(m);blockers.push(m);
  }
 }
 function sync(){
  if(meta.kind==='ferris'){
   rotor.rotation.z=angle;
   for(let i=0;i<12;i++){
    const a=i/12*TAU+angle,p=cabinPositions[i];
    p.set(center.x+radius*Math.cos(a),center.y+radius*Math.sin(a)-hang,center.z);
    matrix.makeTranslation(p.x,p.y,p.z);
    for(const m of instances)m.setMatrixAt(i,matrix); // no rotation: cabins stay upright
   }
   for(const m of instances)m.instanceMatrix.needsUpdate=true;
  }else{
   rotor.rotation.y=angle;
   for(let i=0;i<horseBases.length;i++){
    matrix.copy(horseBases[i]);matrix.elements[13]+=lift(i);
    for(const m of instances)m.setMatrixAt(i,matrix);
   }
   for(const m of instances)m.instanceMatrix.needsUpdate=true;
  }
  group.updateMatrixWorld(true);
 }
 function advance(dt,{paused=false,reduced=false,camera=null}={}){
  const carrying=occupied||occupants.size>0;
  if(paused||!(dt>0)||(!carrying&&reduced))return;
  if(!carrying&&camera&&Math.hypot(camera.position.x-origin.x,camera.position.z-origin.z)>110)return;
  liftScale=reduced?.25:1;
  angle=(angle+Math.min(dt,.05)*TAU/meta.period*(reduced?.5:1))%TAU;sync();
 }
 function seat(index){
  if(!Number.isInteger(index)||index<0||index>=(meta.kind==='ferris'?12*seatsPerCabin:seats.length))throw RangeError('Invalid ride seat');
  let position,heading,floor,ceiling,cameraOffset=null;
  if(meta.kind==='ferris'){
   position=cabinPositions[Math.floor(index/seatsPerCabin)].clone();
   floor=position.clone().add(new T.Vector3(0,meta.floor*scale.y,0)).applyMatrix4(transform).y;
   ceiling=position.clone().add(new T.Vector3(0,(meta.roofUnderside??1.045)*scale.y,0)).applyMatrix4(transform).y;
   position.add(new T.Vector3(...slotOffsets[index%seatsPerCabin]).multiply(scale));heading=yaw;
   cameraOffset=new T.Vector3(-slotOffsets[index%seatsPerCabin][0]*scale.x,0,0).applyQuaternion(group.quaternion);
  }else{
   const s=seats[index];position=s.position.clone();position.y+=lift(index);position.applyAxisAngle(T.Object3D.DEFAULT_UP,angle);heading=yaw+s.heading+angle;
  }
  position.applyMatrix4(transform);
  return {position,heading,kind:meta.kind,posture:meta.kind==='ferris'?'bench':'saddle',floor,ceiling,cameraOffset,cabin:meta.kind==='ferris'?Math.floor(index/seatsPerCabin):null,slot:index%seatsPerCabin};
 }
 function nearestSeat(){
  let best=0,d=Infinity;
  for(let i=0;i<(meta.kind==='ferris'?12*seatsPerCabin:seats.length);i++){
   const p=seat(i).position,v=meta.kind==='ferris'?p.y:p.distanceToSquared(entry);
   if(v<d){d=v;best=i;}
  }return best;
 }
 function boardingSeat(){
  const nearest=nearestSeat();
  // A full low cabin is full: do not teleport a fifth passenger into another
  // cabin already high in the air. It becomes boardable as the wheel turns.
  if(meta.kind==='ferris'){
   const first=Math.floor(nearest/seatsPerCabin)*seatsPerCabin;
   for(let i=first;i<first+seatsPerCabin;i++)if(!occupants.has(i))return i;
   return -1;
  }
  let best=-1,d=Infinity;for(let i=0;i<seats.length;i++)if(!occupants.has(i)){
   const distance=seat(i).position.distanceToSquared(entry);if(distance<d){d=distance;best=i;}
  }return best;
 }
 function claimSeat(index,owner){
  if(!Number.isInteger(index)||index<0||index>=(meta.kind==='ferris'?12*seatsPerCabin:seats.length)||typeof owner!=='string'||!owner)return false;
  if(occupants.has(index))return occupants.get(index)===owner;
  if([...occupants.values()].includes(owner))return false;
  occupants.set(index,owner);return true;
 }
 function releaseSeat(index,owner){if(occupants.get(index)!==owner)return false;return occupants.delete(index);}
 function seatStatus(index=nearestSeat()){
  const start=meta.kind==='ferris'?Math.floor(index/seatsPerCabin)*seatsPerCabin:0,capacity=meta.kind==='ferris'?seatsPerCabin:seats.length;
  return {capacity,occupied:Array.from({length:capacity},(_,i)=>start+i).filter(i=>occupants.has(i)),totalOccupied:occupants.size};
 }
 function ground(x,z){
  local.set(x,origin.y,z).applyMatrix4(inv);const u=local.x/scale.x,v=local.z/scale.z,r=Math.hypot(u,v);let h=null;
  if(meta.kind==='ferris'){
   if(Math.abs(u)<=3.5&&Math.abs(v)<=2)h=.35;
   if(Math.abs(u)<=1.75&&v>=1.65&&v<=2.95)h=Math.max(h??0,.33);
   for(const sx of [-2.55,2.55])for(const sz of [-meta.frameZ,meta.frameZ])if(Math.hypot(u-sx,v-sz)<.34)h=meta.center[1];
  }else{
   if(asset==='carouselSmall'&&r<=meta.radius+.7)h=.16;
   if(r<=meta.radius+.22)h=.36;
   if(r<=meta.radius)h=meta.floor;
   if(r<=.5)h=asset==='carouselSmall'?3.3:5.1;
  }
  return h==null?null:origin.y+h*scale.y;
 }
 const deckLocal=new T.Vector3();
 const deck=meta.kind==='carousel'?{kind:'carousel',asset,center:{x:origin.x,z:origin.z},innerRadius:.5*Math.min(scale.x,scale.z),radius:(meta.radius+.22)*Math.max(scale.x,scale.z),get angle(){return angle;},ground:(x,z)=>{
  // The mast is fixed at the carousel's center and horse saddles sit above
  // the deck. Neither is a standing-deck contact that should be transported.
  const p=deckLocal.set(x,origin.y,z).applyMatrix4(inv),r=Math.hypot(p.x/scale.x,p.z/scale.z);
  return r<=.5||r>meta.radius+.22?null:ground(x,z);
 }}:null;
 sync();const bounds=new T.Box3().setFromObject(source).applyMatrix4(transform);
 const draws=blockers.length,triangles=blockers.reduce((n,m)=>n+(m.geometry.index.count/3)*(m.isInstancedMesh?m.count:1),0);
 return {asset,label:labels[asset],group,blockers,bounds,entry,ground,deck:()=>deck,advance,seat,nearestSeat,boardingSeat,claimSeat,releaseSeat,seatStatus,
  poles:()=>poleBases.map(b=>{const p=b.p.clone().applyAxisAngle(T.Object3D.DEFAULT_UP,angle).applyMatrix4(transform);return {x:p.x,z:p.z,minY:origin.y+b.minY,maxY:origin.y+b.maxY,radius:b.radius};}),
  get occupied(){return occupied||occupants.size>0;},set occupied(value){occupied=!!value;},
  get angle(){return angle;},stats:{draws,triangles,seats:meta.kind==='ferris'?12*seatsPerCabin:seats.length,seatsPerCabin,cabinCount:meta.kind==='ferris'?12:0,period:meta.period,instancedCabins:meta.kind==='ferris'?instances.length:0,instancedHorses:meta.kind==='carousel'?instances.length:0,openCabin:!!meta.openCabin,liftStroke:(meta.lift?.stroke||0)*scale.y,liftPeriod:meta.lift?meta.period/meta.lift.cycles:null},
  state:()=>({asset,angle,occupied:occupied||occupants.size>0,occupancy:seatStatus(),entry:entry.toArray(),seat:seat(nearestSeat()).position.toArray(),lift:meta.kind==='carousel'?seats.map((_,i)=>lift(i)):null})};
}

/** A small explicit mount/dismount control. No UI entrance/keyboard animation.
 * The existing player and camera remain in use; the core movement equations and
 * character selection are not replaced. Temporary ride sampling is restored in
 * finally, and leaving always resets onto a pre-validated dry boarding point.
 */
export function installRideControls84({rides,controller,isGame,data,headless=false}){
 const button=document.createElement('button');button.type='button';button.id='parkRide84';button.hidden=true;button.setAttribute('aria-pressed','false');
 const style=document.createElement('style');style.textContent=`
 #parkRide84{position:fixed;z-index:45;left:50%;bottom:max(28px,env(safe-area-inset-bottom));transform:translateX(-50%);min-height:52px;max-width:90vw;padding:12px 22px;border:2px solid #eee1d1;border-radius:20px;background:#fff7ed;color:#66575b;font:600 15px/1.35 system-ui;box-shadow:0 5px 16px #62535925;cursor:pointer;touch-action:manipulation}
 #parkRide84[hidden]{display:none}#parkRide84:focus-visible{outline:3px solid #9989b4;outline-offset:4px}#parkRide84[aria-pressed=true]{background:#f5dbe3}
 @media(max-width:600px){#parkRide84{bottom:max(26px,env(safe-area-inset-bottom));font-size:14px}}
 `;if(!headless){document.head.append(style);document.body.append(button);}
 const abort=new AbortController();let active=null,near=null,lastLabel='',probeTime=0;
 const tmp=new T.Vector3(),seatContacts=new WeakMap();
 function soleHeight(c){
  c.body.updateMatrixWorld(true);let sole=Infinity;
  if(c.soleMesh?.isSkinnedMesh&&c.soleIndices?.length){
   c.soleMesh.skeleton.update();
   for(const i of c.soleIndices){c.soleMesh.getVertexPosition(i,tmp).applyMatrix4(c.soleMesh.matrixWorld);sole=Math.min(sole,tmp.y);}
  }else c.footBones?.forEach((b,i)=>{b.getWorldPosition(tmp);sole=Math.min(sole,tmp.y-(c.footSoles[i]||0));});
  return sole;
 }
 function benchContactHeight(c){
  const m=c.soleMesh;if(!m?.isSkinnedMesh)return Infinity;
  c.body.updateMatrixWorld(true);m.skeleton.update();
  let indices=seatContacts.get(c);
  if(!indices){
   const skin=m.geometry.getAttribute('skinIndex'),weight=m.geometry.getAttribute('skinWeight'),candidates=[];
   if(!skin||!weight)return Infinity;
   const inv=c.body.matrixWorld.clone().invert(),get=['getX','getY','getZ','getW'];
   for(let i=0;i<skin.count;i++){
    let hip=0,lower=0;
    for(const key of get){const name=m.skeleton.bones[skin[key](i)].name.replace(/_\d+$/,'');const w=weight[key](i);
     if(['ThighL','ThighR','Spine1'].includes(name))hip+=w;if(/Shin|Toe/.test(name))lower+=w;}
    if(hip<.8||lower>.12)continue;
    m.getVertexPosition(i,tmp).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
    if(tmp.z<=.025)candidates.push({i,y:tmp.y});
   }
   indices=candidates.sort((a,b)=>a.y-b.y).slice(0,16).map(p=>p.i);seatContacts.set(c,indices);
  }
  let contact=Infinity;
  for(const i of indices){m.getVertexPosition(i,tmp).applyMatrix4(m.matrixWorld);contact=Math.min(contact,tmp.y);}
  return contact;
 }
 const valid=c=>c&&c.ready&&c.body.visible&&!c.swimming&&!c.slam?.active&&c.grounded;
 function refresh(){
  const status=active?active.ride.seatStatus?.(active.index):near?.seatStatus?.();
  const full=!active&&near?.boardingSeat?.()===-1,usage=status?' · '+status.occupied.length+'/'+status.capacity+' dolu':'';
  const label=active?'İn · E'+usage:near?near.label+(full?' · Dolu':' · Bin · E')+usage:'';
  button.hidden=headless||!isGame()||(!active&&!near);button.disabled=!!full;
  if(status)data.rideSeats87=JSON.stringify({...status,seat:active?.index??null});
  if(label!==lastLabel){button.textContent=label;button.setAttribute('aria-label',active?active.ride.label+' — güvenli zemine in':near?near.label+' — bin':'Lunapark');button.setAttribute('aria-pressed',String(!!active));lastLabel=label;}
 }
 function enter(){
  const c=controller();if(active||!isGame()||!valid(c))return false;
  // Recheck proximity at click time; a stale button can never board remotely.
  const candidates=rides().filter(r=>Math.hypot(c.sim.position.x-r.entry.x,c.sim.position.z-r.entry.z)<3.8&&Math.abs(c.foot-r.entry.y)<1.6);
  const ride=candidates.sort((a,b)=>a.entry.distanceToSquared(c.body.position)-b.entry.distanceToSquared(c.body.position))[0];if(!ride)return false;
  const index=ride.boardingSeat?ride.boardingSeat():ride.nearestSeat(),owner=c.body.uuid;
  if(index<0||(ride.claimSeat&&!ride.claimSeat(index,owner)))return false;
  active={ride,index,owner,c,boardOn:c.boardOn,distance:c.distance,cameraShift:new T.Vector3()};if(!ride.claimSeat)ride.occupied=true;
  c.boardOn=false;c.boardBlend=0;c.emote=null;c.slam?.cancel();c.hideExtras();c.cameraReady=false;c.distance=Math.max(c.distance,ride.stats?.seatsPerCabin>1?7.4:5.4);
  c.body.userData.parkRide84=ride.asset;data.ride84=JSON.stringify({state:'riding',asset:ride.asset,seat:active.index});refresh();return true;
 }
 function exit(){
  if(!active)return false;const {ride,index,owner,c,boardOn,distance,cameraShift}=active;active=null;
  c.camera?.position.sub(cameraShift);
  if(ride.releaseSeat)ride.releaseSeat(index,owner);else ride.occupied=false;
  c.probeX=NaN;c.probeZ=NaN;c.reset(ride.entry.x,ride.entry.z,0);c.boardOn=boardOn;c.distance=distance;c.body.rotation.z=0;
  delete c.body.userData.parkRide84;data.ride84=JSON.stringify({state:'on-ground',asset:ride.asset,position:[c.sim.position.x,c.foot,c.sim.position.z]});near=ride;refresh();return true;
 }
 function update(dt){
  if(active&&(controller()!==active.c||!isGame()))exit();
  probeTime-=dt;
  if(probeTime<=0){probeTime=.12;const c=controller();near=null;
   if(!active&&isGame()&&valid(c)){
    let distance=3.8;for(const ride of rides()){
     const d=Math.hypot(c.sim.position.x-ride.entry.x,c.sim.position.z-ride.entry.z);
     if(d<distance&&Math.abs(c.foot-ride.entry.y)<1.6){near=ride;distance=d;}
    }
   }
  }refresh();
 }
 function passenger(dt,input){
  if(!active)return null;const {ride,index,c}=active,p=ride.seat(index),seated=p.kind==='carousel'||p.posture==='bench';
  // The foot plane transports physics with the ride; no gravity accumulation,
  // speed impulse, water state or skateboard can leak into the seated state.
  const foot=p.floor??p.position.y-(seated?c.height*.42:0),env=c.env;
  const original={ground:env.ground,water:env.water,cameraGround:env.cameraGround};
  c.body.position.set(p.position.x,foot+env.footOffset(),p.position.z);c.body.rotation.set(0,p.heading,0);
  c.sim.position.copy(c.body.position);c.previousPosition.copy(c.body.position);c.foot=c.previousFoot=foot;
  c.velocity.set(0,0,0);c.vertical=0;c.grounded=true;c.swimming=false;c.jumpQueue=c.jumpHeld=false;c.accumulator=0;c.boardOn=false;c.emote=null;
  c.probeX=NaN;c.probeZ=NaN;env.ground=()=>foot;env.water=()=>false;
  // The ride's roof is not a camera obstruction box. Existing terrain remains
  // available to the chase camera via its regular, low-level ground sampler.
  if(c.camera)c.camera.position.sub(active.cameraShift);
  active.cameraShift.set(0,0,0);
  let state;try{state=c.update(dt,{yaw:input.yaw,pitch:Math.min(input.pitch,-.18),forward:0,right:0,jump:false,sprint:false});}
  finally{Object.assign(env,original);c.probeX=NaN;c.probeZ=NaN;}
  if(p.cameraOffset&&c.camera&&c.pivot){active.cameraShift.copy(p.cameraOffset);c.camera.position.add(active.cameraShift);c.camera.lookAt(tmp.copy(c.pivot).add(active.cameraShift));}
  if(!seated){
   const sole=soleHeight(c);
   if(Number.isFinite(sole))c.body.position.y+=p.position.y+.008-sole;
  }
  if(seated&&c.pose){
   c.pose('ThighL',-1.05,0,-.16);c.pose('ThighR',-1.05,0,.16);c.pose('ShinL',1.1);c.pose('ShinR',1.1);
   c.pose('Spine1',.10);c.pose('BiscepL',-.35,0,-.10);c.pose('BiscepR',-.35,0,.10);c.pose('ArmL',.35);c.pose('ArmR',.35);
   // Equipped rig copies must receive the same seated pose as the base body.
   for(const arr of c.bones.values())for(let i=1;i<arr.length;i++)arr[i].o.quaternion.copy(arr[0].o.quaternion);
   // Actual lower-hip contact plants the rider on both the bench and the
   // raised saddle cushion. The feet tuck ahead onto the lower saddle pad or
   // hang past the bench edge instead of making the body float above its seat.
   let contact=benchContactHeight(c);
   if(!Number.isFinite(contact))contact=soleHeight(c);
   if(Number.isFinite(contact))c.body.position.y+=p.position.y+.008-contact;
   data.rideSeating85=p.posture==='bench'?'hip-contact-open-bench':'wide-saddle';
  }
  c.hideExtras();data.characterAnimation='ride-'+ride.asset;data.characterFeet=foot.toFixed(3);data.swimming='false';
  data.ridePassenger84=[c.body.position.x,c.body.position.y,c.body.position.z].map(v=>v.toFixed(3)).join(',');
  return {...state,x:c.body.position.x,z:c.body.position.z,state:'ride-'+ride.asset,swimming:false,speed:0};
 }
 if(!headless)button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();active?exit():enter();},{signal:abort.signal});
 if(!headless)window.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable=true],dialog'))return;
  if(!isGame())return;
  if(e.code==='KeyE'||(active&&e.code==='Escape')){e.preventDefault();e.stopImmediatePropagation();active?exit():enter();}
 },{capture:true,signal:abort.signal});
 return {enter,exit,update,passenger,get active(){return !!active;},get ride(){return active?.ride??null;},
  dispose(){exit();abort.abort();button.remove();style.remove();}};
}
