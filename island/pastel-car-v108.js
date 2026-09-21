import * as T from 'three';
import {updateParkDriving} from '../app/park-driving-tuning.js?v=car-45';
import {CAR110,BUS110,createCandyVehicle110} from './candy-vehicle-model-v110.js?v=110.2';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {restoreBasePose} from './six-seven-movement-v28.js';

// The two public-road cars and the school service share the reference toy style.
export const CAR108=CAR110;
export const createPastelCar108=opts=>{const car=createCandyVehicle110(opts);return car.kind==='car'?useReferenceCarBody(car):styleParkBus(car);};
import {styleParkBus} from '../app/vehicle-branding.js?v=fleet-38';
import {useReferenceCarBody} from '../app/reference-car-body.js?v=vehicle-feedback-1';
const clamp=T.MathUtils.clamp,approach=(a,b,d)=>a<b?Math.min(b,a+d):Math.max(b,a-d);
const up=new T.Vector3(0,1,0);

// Public road only, not arbitrary grey paving. A 0.4m perimeter grid includes
// bumpers/mirrors plus interior probes; swept 120Hz movement prevents tunnelling.
export function createRoadArea108({roadMeshes,ground,water=()=>false}){
 const road=createCityHeightSampler58(roadMeshes,{cellSize:3}),grids=new Map();
 function footprint(spec){
  if(grids.has(spec))return grids.get(spec);const points=[],nx=Math.ceil(spec.halfWidth*2/.38),nz=Math.ceil(spec.halfLength*2/.38);
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)if(i===0||i===nx||j===0||j===nz||(i%2===1&&j%3===1))points.push([(i/nx*2-1)*spec.halfWidth,(j/nz*2-1)*spec.halfLength]);
  grids.set(spec,points);return points;
 }
 const points=footprint(CAR108);
 function check(x,z,yaw,spec=CAR108){
  if(!Number.isFinite(x+z+yaw))return {ok:false,reason:'invalid'};
  const center=road.height(x,z);if(center==null||water(x,z))return {ok:false,reason:'road-edge'};
  const s=Math.sin(yaw),c=Math.cos(yaw);
  for(const [u,v] of footprint(spec)){
   const px=x+c*u+s*v,pz=z-s*u+c*v,y=road.height(px,pz);
   if(y==null||water(px,pz)||Math.abs(y-center)>.28)return {ok:false,reason:'road-edge'};
   const obstacle=ground(px,pz);
   // Road paint sits millimetres above asphalt. A 15 cm sidewalk is NOT road,
   // even where the exported asphalt carrier continues underneath it.
   if(obstacle==null||obstacle>y+.06||obstacle<y-.25)return {ok:false,reason:'obstacle'};
  }
  return {ok:true,y:center};
 }
 return {check,road,points,footprint,stats:{...road.stats,footprintProbes:points.length}};
}
export class RoadCarPhysics108{
 constructor({area,x,z,yaw=0,blocked=()=>false,spec=CAR108}){
  this.area=area;this.spec=spec;this.blocked=blocked;this.x=x;this.z=z;this.yaw=yaw;this.speed=0;this.steer=0;this.accumulator=0;this.distance=0;this.reason='';
  const p=area.check(x,z,yaw,spec);if(!p.ok)throw Error('Unsafe Car108 spawn '+x+','+z+': '+p.reason);this.y=p.y;
 }
 stop(){this.speed=0;this.accumulator=0;}
 update(dt,{throttle=0,steer=0,brake=false}={}){
  if(this.spec.halfLength<3)return updateParkDriving(this,dt,{throttle,steer,brake});
  if(!Number.isFinite(dt+throttle+steer)){this.stop();return;}
  dt=clamp(dt,0,.05);throttle=clamp(throttle,-1,1);steer=clamp(steer,-1,1);this.accumulator+=dt;this.distance=0;this.reason='';
  while(this.accumulator+1e-9>=CAR108.step){
   const h=CAR108.step;this.accumulator-=h;
   // Model forward is +Z. A driver's right turn is negative Y rotation.
   const maxAngle=.52/(1+Math.abs(this.speed)*.035);this.steer=approach(this.steer,-steer*maxAngle,2.6*h);
   if(brake)this.speed=approach(this.speed,0,11*h);
   else if(Math.abs(throttle)>.06){
    const reverseDirection=this.speed*throttle<-.03;
    this.speed=approach(this.speed,throttle>0?this.spec.maxSpeed*throttle:this.spec.reverseSpeed*throttle,(reverseDirection?9:3.8)*h);
   }else this.speed=approach(this.speed,0,1.6*h);
   const turn=this.speed/this.spec.wheelbase*Math.tan(this.steer)*h;
   const heading=this.yaw+turn*.5,d=this.speed*h,nx=this.x+Math.sin(heading)*d,nz=this.z+Math.cos(heading)*d,nyaw=this.yaw+turn;
   if(Math.abs(d)<1e-7)continue;
   const result=this.area.check(nx,nz,nyaw,this.spec);
   if(!result.ok||this.blocked(nx,nz,nyaw)){this.speed=0;this.reason=result.ok?'car':result.reason;continue;}
   this.x=nx;this.z=nz;this.y=result.y;this.yaw=nyaw;this.distance+=d;
  }
 }
}
const localPoint=(x,z,yaw,u,v)=>({x:x+Math.cos(yaw)*u+Math.sin(yaw)*v,z:z-Math.sin(yaw)*u+Math.cos(yaw)*v});
function overlap(a,b){
 for(const angle of [a.yaw,b.yaw])for(const axis of [angle,angle+Math.PI/2]){
  const ax=Math.cos(axis),az=-Math.sin(axis),d=Math.abs((a.x-b.x)*ax+(a.z-b.z)*az);
  const radius=p=>(p.spec??CAR108).halfWidth*Math.abs(Math.cos(p.yaw)*ax-Math.sin(p.yaw)*az)+(p.spec??CAR108).halfLength*Math.abs(Math.sin(p.yaw)*ax+Math.cos(p.yaw)*az);
  if(d>radius(a)+radius(b)+.12)return false;
 }return true;
}

export function createPastelTraffic108({scene,terrainRoot,ground,water,renderer}){
 const roadMesh=terrainRoot.getObjectByName('5_YOL');if(!roadMesh)throw Error('Car108 public road missing');
 const area=createRoadArea108({roadMeshes:[roadMesh],ground,water}),cars=[];
 const placements=[{id:'main-mint',kind:'car',island:'main',color:'#8ebfb5',x:183,z:122,yaw:Math.PI/2},
  {id:'small-blue',kind:'car',island:'small',color:'#a2bbce',x:-133,z:97,yaw:0},
  {id:'school-service',kind:'bus',island:'main',x:-73,z:-182,yaw:Math.PI/2}];
 for(const row of placements){
  const spec=row.kind==='bus'?BUS110:CAR110;
  // A bounded search at the intended road stop, with the entire vehicle
  // checked. Never silently substitute a second main-island passenger car.
  let spawn=null;for(const dz of [0,-1,1,-2,2,-4,4,-6,6]){for(const dx of [0,-1,1,-2,2,-4,4]){const test=area.check(row.x+dx,row.z+dz,row.yaw,spec);if(test.ok){spawn={...row,x:row.x+dx,z:row.z+dz};break;}}if(spawn)break;}
  if(!spawn){cars.forEach(c=>c.dispose());throw Error('No safe road stop for '+row.id);}
  const car=createPastelCar108(row);car.island=row.island;car.physics=new RoadCarPhysics108({area,...spawn,spec,blocked:(x,z,yaw)=>cars.some(o=>o!==car&&overlap({x,z,yaw,spec},o.physics))});
  car.group.position.set(spawn.x,car.physics.y+.015,spawn.z);car.group.rotation.y=spawn.yaw;scene.add(car.group);car.group.updateMatrixWorld(true);cars.push(car);
 }
 if(!cars.length)throw Error('Car108 could not find a safe public-road placement');
 const stats={version:110,cars:cars.filter(c=>c.kind==='car').length,buses:cars.filter(c=>c.kind==='bus').length,placements:cars.map(c=>({id:c.id,island:c.island,capacity:c.capacity,x:c.physics.x,z:c.physics.z})),roadOnly:true,multiplayer:false,geometryRoadsModified:false,probes:area.points.length,draws:cars.reduce((n,c)=>n+c.stats.draws,0),triangles:cars.reduce((n,c)=>n+c.stats.triangles,0)};
 renderer.domElement.dataset.pastelTraffic108=JSON.stringify(stats);
 function obstacle(x,z){for(const car of cars){const p=car.physics,u=localPoint(0,0,-p.yaw,x-p.x,z-p.z);if(Math.abs(u.x)<car.spec.halfWidth&&Math.abs(u.z)<car.spec.halfLength)return p.y+car.roofUnderside+.4;}return null;}
 function exitPoint(car){
  const p=car.physics,w=car.spec.halfWidth+.65,l=car.spec.halfLength+.8;
  for(const [u,v] of [[-w,-.35],[w,-.35],[-w,-1.7],[w,-1.7],[0,-l],[0,l]]){
   const pt=localPoint(p.x,p.z,p.yaw,u,v),y=ground(pt.x,pt.z);
   if(y==null||Math.abs(y-p.y)>.65||water(pt.x,pt.z)||obstacle(pt.x,pt.z)!=null)continue;
   let clear=true;for(const [dx,dz] of [[.34,0],[-.34,0],[0,.34],[0,-.34]]){const h=ground(pt.x+dx,pt.z+dz);if(h==null||Math.abs(h-y)>.25||water(pt.x+dx,pt.z+dz)||obstacle(pt.x+dx,pt.z+dz)!=null)clear=false;}
   if(clear)return {...pt,y};
  }return null;
 }
 return {cars,area,stats,ground,water,obstacle,exitPoint,dispose(){cars.forEach(c=>c.dispose());}};
}

// Use weighted lower-hip vertices, as for the existing ride benches. Root
// origins and character hats differ, so a guessed constant seat offset is wrong.
const hipCache=new WeakMap(),temp=new T.Vector3();
export function seatContact108(c){
 c.body.updateMatrixWorld(true);let record=hipCache.get(c);
 if(!record){
  const meshes=[];c.body.traverse(m=>{if(m.isSkinnedMesh&&m.geometry.getAttribute('skinIndex'))meshes.push(m);});
  const get=['getX','getY','getZ','getW'],inv=c.body.matrixWorld.clone().invert();let best=0;
  for(const m of meshes){
   m.skeleton.update();const skin=m.geometry.getAttribute('skinIndex'),weights=m.geometry.getAttribute('skinWeight'),candidates=[];
   for(let i=0;i<skin.count;i++){
    let hip=0,lower=0;for(const k of get){const name=m.skeleton.bones[skin[k](i)].name.replace(/_\d+$/,'');if(['ThighL','ThighR','Spine1'].includes(name))hip+=weights[k](i);if(/Shin|Toe/.test(name))lower+=weights[k](i);}
    if(hip<.8||lower>.12)continue;m.getVertexPosition(i,temp).applyMatrix4(m.matrixWorld).applyMatrix4(inv);if(temp.z<=.025)candidates.push({i,y:temp.y});
   }
   if(candidates.length>best){best=candidates.length;record={m,indices:candidates.sort((a,b)=>a.y-b.y).slice(0,16).map(p=>p.i)};}
  }
  if(!record)return NaN;hipCache.set(c,record);
 }
 const {m,indices}=record;m.skeleton.update();let y=Infinity;
 for(const i of indices){m.getVertexPosition(i,temp).applyMatrix4(m.matrixWorld);y=Math.min(y,temp.y);}return y;
}
function visibleBodyBounds109(body){
 const bounds=new T.Box3(),p=new T.Vector3();body.updateMatrixWorld(true);
 body.traverse(m=>{if(!m.isMesh||!m.geometry.attributes.position)return;for(let n=m;n;n=n.parent)if(!n.visible)return;if(m.isSkinnedMesh)m.skeleton.update();
  for(let i=0;i<m.geometry.attributes.position.count;i++){if(m.isSkinnedMesh)m.getVertexPosition(i,p);else p.fromBufferAttribute(m.geometry.attributes.position,i);p.applyMatrix4(m.matrixWorld);bounds.expandByPoint(p);}
 });return bounds;
}
export function poseCarDriver108(c,car,index=0){
 const slot=car.seats[index];if(!slot)throw RangeError('Invalid vehicle seat');
 const newDriver=slot.rig!==c;
 if(newDriver){slot.position.copy(slot.base);slot.group.position.y=0;}
 restoreBasePose(c.bones);
 if(c.restPositions)for(const [bone,p] of c.restPositions)bone.position.copy(p);
 if(c.restScales)for(const [bone,s] of c.restScales)bone.scale.copy(s);
 if(c.visualHome&&c.visual!==c.body)c.visual.position.copy(c.visualHome);
 c.pose('ThighL',-1.05,0,-.11);c.pose('ThighR',-1.05,0,.11);c.pose('ShinL',1.1);c.pose('ShinR',1.1);
 c.pose('Spine1',.08);c.pose('BiscepL',index?-.34:-.55,0,-.15);c.pose('BiscepR',index?-.34:-.55,0,.15);c.pose('ArmL',index?.90:.65,0,.20);c.pose('ArmR',index?.90:.65,0,-.20);
 for(const arr of c.bones.values())for(let i=1;i<arr.length;i++)arr[i].o.quaternion.copy(arr[0].o.quaternion);
 car.group.updateMatrixWorld(true);const seat=car.group.localToWorld(slot.position.clone());
 c.body.rotation.set(0,car.physics.yaw,0);c.body.position.set(seat.x,car.physics.y+c.env.footOffset(),seat.z);
 const contact=seatContact108(c);if(Number.isFinite(contact))c.body.position.y+=seat.y+.008-contact;
 c.body.updateMatrixWorld(true);
 if(newDriver){
  // A real adjustable cushion keeps short characters above the belt line;
  // taller hats keep their clearance without changing the car silhouette.
  const bounds=visibleBodyBounds109(c.body),lift=clamp(car.group.position.y+car.roofUnderside-.085-bounds.max.y,0,.28);
  if(slot.group){
   slot.position.y+=lift;slot.group.position.y=lift/car.spec.scale;seat.y+=lift;c.body.position.y+=lift;c.body.updateMatrixWorld(true);
   const top=Math.max(car.floorTop,(bounds.min.y+lift-car.group.position.y)-.014);
   slot.footRest.position.y=top/car.spec.scale-.035;slot.footRest.userData.top=top;
  }
  const left=c.bones.get('HandL')?.[0]?.o,right=c.bones.get('HandR')?.[0]?.o;
  if(index===0&&left&&right){
   const a=left.getWorldPosition(new T.Vector3()),b=right.getWorldPosition(new T.Vector3());
   car.model.worldToLocal(a.add(b).multiplyScalar(.5));a.z+=.018;car.steering.position.copy(a);
   const end=new T.Vector3(a.x,car.kind==='bus'?1.49:1.13,car.dashboardZ),delta=end.clone().sub(a);car.column.position.copy(a).add(end).multiplyScalar(.5);
   car.column.scale.y=delta.length();car.column.quaternion.setFromUnitVectors(up,delta.normalize());
  }slot.rig=c;if(index===0)car.driverRig=c;
 }
 c.sim.position.copy(c.body.position);c.previousPosition.copy(c.body.position);
 c.foot=c.previousFoot=car.group.position.y+(slot.footRest.userData.top??car.floorTop);c.velocity.set(0,0,0);c.vertical=0;c.grounded=true;c.swimming=false;
 c.boardOn=false;c.boardBlend=0;c.jumpQueue=c.jumpHeld=false;c.accumulator=0;c.probeX=c.probeZ=NaN;c.hideExtras();
 return seat;
}

let carClientSequence110=0;
export function installCarControls108({traffic,controller,isGame,canBoard=()=>true,data={},onExit=()=>{},headless=false,owner='local-car-'+(++carClientSequence110)}){
 let active=null,near=null,message='',messageUntil=0,clock=0,probe=0,cameraReady=false;
 const keys=new Set(),pointers=new Map(),abort=new AbortController(),target=new T.Vector3(),cameraPos=new T.Vector3();
 const button=headless?null:document.createElement('button'),hud=headless?null:document.createElement('div'),style=headless?null:document.createElement('style'),seatPanel=headless?null:document.createElement('div');
 if(!headless){
  button.type='button';button.id='parkCar108';button.hidden=true;
  hud.id='parkCarHUD108';hud.hidden=true;hud.innerHTML='<div class="car-readout"><strong>Pastel araba</strong><span id="carSpeed108">0 km/h</span><small>WASD / oklar · Boşluk: fren · E: enter / exit</small><span id="carMessage108" role="status" aria-live="polite"></span></div><div class="car-pad car-steer"><button data-drive="left" aria-label="Sola dön">◀</button><button data-drive="right" aria-label="Sağa dön">▶</button></div><div class="car-pad car-pedals"><button data-drive="reverse" aria-label="Geri git">Geri</button><button data-drive="brake" aria-label="Fren">Fren</button><button data-drive="gas" aria-label="Gaz">Gaz</button></div>';
  style.textContent=`#parkCar108{position:fixed;z-index:46;left:50%;bottom:max(25px,env(safe-area-inset-bottom));transform:translateX(-50%);min-height:50px;padding:12px 22px;border:2px solid #e7ded0;border-radius:20px;background:#e0e9df;color:#4b5955;font:600 15px system-ui;cursor:pointer;touch-action:manipulation}#parkCar108:disabled{opacity:.7}#parkCar108[hidden],#parkCarHUD108[hidden]{display:none!important}#parkCarHUD108{position:fixed;inset:0;z-index:44;pointer-events:none;color:#4b5955;font:600 14px system-ui}.car-readout{position:absolute;top:94px;left:20px;padding:12px 16px;border-radius:18px;background:#f6f0e7ed;display:grid;gap:4px;max-width:240px}.car-readout small{font-size:11px;font-weight:500}.car-readout span:empty{display:none}.car-pad{position:absolute;bottom:max(26px,env(safe-area-inset-bottom));display:flex;gap:10px;pointer-events:auto;touch-action:none}.car-steer{left:22px}.car-pedals{right:22px}.car-pad button{width:62px;height:62px;border:2px solid #e7ded0;border-radius:22px;background:#f6f0e7ed;color:#4b5955;font:700 15px system-ui;touch-action:none;user-select:none;-webkit-user-select:none}.car-pad button[data-held=true]{background:#c4d8c8;box-shadow:inset 0 2px 5px #52706430}#parkCar108:focus-visible,.car-pad button:focus-visible{outline:3px solid #899dbe;outline-offset:3px}@media(max-width:600px){.car-readout{left:12px;top:94px;padding:9px 12px;max-width:175px}.car-readout small{display:none}.car-pad{gap:6px;bottom:max(80px,env(safe-area-inset-bottom))}.car-steer{left:12px}.car-pedals{right:12px}.car-pad button{width:52px;height:56px;font-size:13px}#parkCar108{font-size:14px;bottom:max(18px,env(safe-area-inset-bottom))}}`;
  seatPanel.id='parkCarSeats110';seatPanel.hidden=true;seatPanel.setAttribute('aria-label','Araç koltuğu seç');
  style.textContent+='#parkCarSeats110{position:fixed;z-index:46;bottom:92px;left:50%;transform:translateX(-50%);display:grid;grid-template-columns:repeat(2,minmax(90px,1fr));gap:5px;padding:7px;background:#f6f0e7ed;border-radius:16px;max-width:245px}#parkCarSeats110[hidden]{display:none!important}#parkCarSeats110 button{min-height:37px;border:0;border-radius:11px;padding:5px 9px;background:#dce6dc;color:#4b5955;font:600 12px system-ui;cursor:pointer;touch-action:manipulation}#parkCarSeats110 button:disabled{opacity:.48;cursor:default}#parkCarSeats110 button[aria-pressed=true]{outline:2px solid #899d92}.car-pad[hidden]{display:none!important}@media(max-width:600px){#parkCarSeats110{bottom:156px;max-width:218px}}';
  document.head.append(style);document.body.append(button,hud,seatPanel);
 }
 const valid=c=>c?.ready&&c.body.visible&&c.grounded&&!c.swimming&&!c.slam?.active;
 const notify=text=>{message=text;messageUntil=clock+2.8;};
 function clearInput(){keys.clear();pointers.clear();hud?.querySelectorAll('[data-drive]').forEach(b=>b.dataset.held='false');}
 function nearest(){
  const c=controller(),world=traffic();if(!world||!valid(c)||!canBoard())return null;
  let result=null,distance=4.3;for(const car of world.cars){const p=car.physics,d=Math.hypot(c.body.position.x-p.x,c.body.position.z-p.z);if(d<distance&&Math.abs(c.foot-p.y)<.7){distance=d;result=car;}}return result;
 }
 function enter(index=null){
  if(active||!isGame())return false;const car=nearest(),c=controller();if(!car||!traffic().exitPoint(car))return false;
  if(Math.abs(car.physics.speed)>.12){notify('Binmek için aracın durmasını bekle.');return false;}
  index=index??car.availableSeat();if(!car.claimSeat(index,owner)){notify('Bu koltuk dolu.');return false;}
  active={car,c,index,boardOn:c.boardOn,distance:c.distance,boarding:{x:c.body.position.x,z:c.body.position.z}};car.riders.set(index,c);
  c.reset(c.body.position.x,c.body.position.z,c.body.rotation.y);c.mixer.stopAllAction();c.active=null;c.state=index?'car-passenger':'driving';
  c.boardOn=false;c.boardBlend=0;c.emote=null;c.slam?.cancel();c.hideExtras();c.body.userData.car108=car.id;
  clearInput();cameraReady=false;if(index===0)car.physics.stop();poseCarDriver108(c,car,index);
  // Reject unusual oversized accessories instead of letting them cut the roof.
  let top=-Infinity;const point=new T.Vector3();c.body.traverse(m=>{
   if(!m.isMesh)return;for(let n=m;n;n=n.parent)if(!n.visible)return;
   if(m.isSkinnedMesh)m.skeleton.update();
   for(let i=0;i<m.geometry.attributes.position.count;i++){if(m.isSkinnedMesh)m.getVertexPosition(i,point);else point.fromBufferAttribute(m.geometry.attributes.position,i);point.applyMatrix4(m.matrixWorld);top=Math.max(top,point.y);}
  });
  if(top>car.group.position.y+car.roofUnderside-.025){exit(true);notify('Bu büyük aksesuarı çıkarıp tekrar bin.');return false;}
  active.lastYaw=null;active.orbit=0;refresh();return true;
 }
 function exit(force=false){
  if(!active)return false;const {car,c,index,boardOn,distance,boarding}=active;
  if(Math.abs(car.physics.speed)>.12&&!force){notify('Önce frenle dur, sonra in.');return false;}
  let point=traffic()?.exitPoint(car);
  if(!point&&!force){notify('Bu tarafta yer yok; biraz ilerle.');return false;}
  if(!point)point=boarding;if(index===0)car.physics.stop();car.releaseSeat(index,owner);active=null;clearInput();
  delete c.body.userData.car108;c.probeX=c.probeZ=NaN;c.reset(point.x,point.z,car.physics.yaw);c.boardOn=boardOn;c.distance=distance;c.body.rotation.z=0;
  data.car108=JSON.stringify({state:'on-ground',id:car.id,speed:0,x:point.x,z:point.z});
  onExit(car.physics.yaw+Math.PI);cameraReady=false;refresh();return true;
 }
 function changeSeat(index){
  if(!active||!Number.isInteger(index))return false;const {car,c,index:old}=active;
  if(index===old)return true;if(Math.abs(car.physics.speed)>.12||index<0||index>=car.capacity||car.ownerAt(index))return false;
  car.releaseSeat(old,owner);if(!car.claimSeat(index,owner)){car.claimSeat(old,owner);car.riders.set(old,c);return false;}
  active.index=index;car.riders.set(index,c);c.state=index?'car-passenger':'driving';clearInput();poseCarDriver108(c,car,index);refresh();return true;
 }
 function refresh(){
  if(headless)return;const show=isGame(),riding=!!active;button.hidden=!show||(!riding&&!near);hud.hidden=!show||!riding;
  button.disabled=riding&&Math.abs(active.car.physics.speed)>.12;
  button.textContent=riding?(button.disabled?'İnmek için dur':'Arabadan in · E'):(clock<messageUntil?message:'Pastel arabaya bin · E');button.setAttribute('aria-label',riding?'Arabadan güvenle in':'Pastel arabaya bin');button.setAttribute('aria-pressed',String(riding));
  const vehicle=active?.car??near;seatPanel.hidden=!show||!vehicle;
  if(vehicle){
   if(seatPanel.dataset.car!==vehicle.id){seatPanel.dataset.car=vehicle.id;seatPanel.replaceChildren();for(let i=0;i<vehicle.capacity;i++){const b=document.createElement('button');b.type='button';b.dataset.seat=String(i);b.textContent=i===0?'Sürücü':i===1?'Ön sağ':'Sıra '+(Math.floor(i/2)+1)+(i%2?' · Sağ':' · Sol');seatPanel.append(b);}}
   for(const b of seatPanel.children){const i=+b.dataset.seat;b.disabled=(vehicle.ownerAt(i)!=null&&vehicle.ownerAt(i)!==owner)||Math.abs(vehicle.physics.speed)>.12;b.setAttribute('aria-pressed',String(riding&&active.index===i));}
  }
  if(riding){
   const status=active.car.seatStatus(),driver=active.car.canDrive(owner);hud.querySelector('strong').textContent=(active.car.kind==='bus'?'Okul servisi':'Pastel araba')+' · '+(driver?'Sürücü':'Yolcu');
   hud.querySelector('#carSpeed108').textContent=Math.round(Math.abs(active.car.physics.speed)*3.6)+' km/h · '+status.occupied.length+'/'+status.capacity+' koltuk';
   hud.querySelector('small').textContent=driver?'WASD / oklar · Boşluk: fren · E: in':'Yolcu koltuğu · Araç durunca E ile in';
   for(const pad of hud.querySelectorAll('.car-pad'))pad.hidden=!driver;
   hud.querySelector('#carMessage108').textContent=clock<messageUntil?message:'';
  }
 }
 function update(dt){
  clock+=Math.max(0,dt);probe-=dt;
  if(active&&(controller()!==active.c||!isGame()))exit(true);
  if(probe<=0){probe=.12;near=!active&&isGame()?nearest():null;}refresh();
 }
 function drive(dt,input={}){
  if(!active)return null;const {car,c,index}=active,p=car.physics,driver=car.canDrive(owner)&&index===0;
  if(car.ownerAt(index)!==owner){exit(true);return null;}
  const held=key=>[...keys].some(code=>keymap[code]===key)||[...pointers.values()].includes(key);
  const throttle=input.throttle??((held('gas')?1:0)-(held('reverse')?1:0)),steer=input.steer??((held('right')?1:0)-(held('left')?1:0)),brake=input.brake??held('brake');
  if(driver){p.update(dt,{throttle,steer,brake});car.group.position.set(p.x,p.y+.015,p.z);car.group.rotation.y=p.yaw;car.animate(p.distance,p.steer);for(const [i,rider] of car.riders)if(rider!==c)poseCarDriver108(rider,car,i);}
  const seat=poseCarDriver108(c,car,index);
  if(p.reason)notify(p.reason==='road-edge'?'Road boundary · geri manevra yap.':'Önün dolu · geri manevra yap.');
  // Fixed-FOV, damped chase camera with terrain/building probes. No camera roll,
  // shake, animated UI or per-frame raycasts through all scene meshes.
  const yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw+Math.PI;
  if(active.lastYaw==null)active.lastYaw=yaw;
  const delta=Math.atan2(Math.sin(yaw-active.lastYaw),Math.cos(yaw-active.lastYaw));active.lastYaw=yaw;
  active.orbit=clamp((active.orbit||0)+delta,-Math.PI*.8,Math.PI*.8);
  if(Math.abs(p.speed)>.3&&Math.abs(delta)<.0001)active.orbit*=Math.exp(-dt*1.8);
  const angle=p.yaw+Math.PI+active.orbit,elev=clamp(-(input.pitch??-.34),.19,.72),distance=car.kind==='bus'?11.2:9.4;
  target.set(p.x+Math.sin(p.yaw)*.7,p.y+1.28,p.z+Math.cos(p.yaw)*.7);
  const arm=new T.Vector3(Math.sin(angle)*Math.cos(elev),Math.sin(elev),Math.cos(angle)*Math.cos(elev));let safe=distance;
  for(let d=2.4;d<=distance;d+=.35){temp.copy(target).addScaledVector(arm,d);const y=traffic().ground(temp.x,temp.z);if(y!=null&&y>temp.y-.20){safe=Math.max(2.2,d-.35);break;}}
  cameraPos.copy(target).addScaledVector(arm,safe);
  if(!cameraReady)c.camera.position.copy(cameraPos);else c.camera.position.lerp(cameraPos,1-Math.exp(-dt*7));cameraReady=true;
  c.camera.lookAt(target);c.camera.fov=58;c.camera.updateProjectionMatrix();c.cameraReady=false;
  data.car108=JSON.stringify({state:driver?'driving':'passenger',id:car.id,seatIndex:index,capacity:car.capacity,occupied:car.seatStatus().occupied.length,speed:+p.speed.toFixed(3),x:+p.x.toFixed(3),z:+p.z.toFixed(3),heading:+p.yaw.toFixed(3),boundary:p.reason,seat:seat.toArray()});
  data.characterAnimation=driver?'seated-driver':'seated-passenger';data.characterPose='hip-contact-driving';data.characterSpeed='0';data.swimming='false';refresh();
  return {x:p.x,z:p.z,state:driver?'driving':'car-passenger',speed:Math.abs(p.speed),swimming:false};
 }
 const keymap={KeyW:'gas',ArrowUp:'gas',KeyS:'reverse',ArrowDown:'reverse',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};
 if(!headless){
  button.addEventListener('click',()=>active?exit():enter(),{signal:abort.signal});
  seatPanel.addEventListener('click',e=>{const b=e.target.closest('button[data-seat]');if(!b||b.disabled)return;active?changeSeat(+b.dataset.seat):enter(+b.dataset.seat);},{signal:abort.signal});
  window.addEventListener('keydown',e=>{
   if(e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable=true],dialog')||!isGame())return;
   if((e.code==='KeyE'||(active&&e.code==='Escape'))&&!e.repeat){if(active||nearest()){e.preventDefault();e.stopImmediatePropagation();active?exit():enter();}}
   else if(active&&['KeyV','KeyQ','KeyR'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();notify('Araç içindeyken kaykay ve yetenekler kapalı.');}
   else if(active&&keymap[e.code]){e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);}
  },{capture:true,signal:abort.signal});
  window.addEventListener('keyup',e=>{if(keymap[e.code])keys.delete(e.code);},{capture:true,signal:abort.signal});
  window.addEventListener('blur',()=>{clearInput();active?.car.physics.stop();},{signal:abort.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();active?.car.physics.stop();if(!isGame())exit(true);}},{signal:abort.signal});
  const releasePointer=e=>{pointers.delete(e.pointerId);hud.querySelectorAll('[data-drive]').forEach(b=>b.dataset.held=String([...pointers.values()].includes(b.dataset.drive)));};
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,releasePointer,{signal:abort.signal});
  for(const b of hud.querySelectorAll('[data-drive]')){
   b.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();e.stopPropagation();try{b.setPointerCapture(e.pointerId);}catch{}pointers.set(e.pointerId,b.dataset.drive);b.dataset.held='true';},{signal:abort.signal});
   const release=e=>{pointers.delete(e.pointerId);b.dataset.held='false';};
   for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,release,{signal:abort.signal});
   b.addEventListener('contextmenu',e=>e.preventDefault(),{signal:abort.signal});
  }
 }
 return {enter,exit,changeSeat,drive,update,clearInput,get active(){return !!active;},get car(){return active?.car??null;},get seatIndex(){return active?.index??null;},
  state:()=>active?{id:active.car.id,seatIndex:active.index,role:active.index?'passenger':'driver',capacity:active.car.capacity,occupied:active.car.seatStatus().occupied,speed:active.car.physics.speed,position:active.car.group.position.toArray(),driver:active.c.body.position.toArray()}:null,
  dispose(){exit(true);abort.abort();button?.remove();hud?.remove();seatPanel?.remove();style?.remove();}};
}
