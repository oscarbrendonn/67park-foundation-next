import {installGraphicsQuality as __installGraphicsQuality} from "../app/graphics-quality.js";
import {createMinigameFeedback} from "../app/minigame-feedback.js";
const feelFeedback=createMinigameFeedback();
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {i as createCharacter,f as equipment} from '../balloon/chunk-U4P5F7P3.js';
import {bindHeldAction} from '../app/minigame-input.js';
import {bindRunningLook,createRunningCamera} from '../app/running-camera.js?v=running-camera-1';
import {installRunningCameraSettings} from '../app/running-camera-settings.js?v=running-camera-1';
import {settingsOpen} from '../app/player-settings.js';
import {CHARACTER_CONTROL as profile,characterDirection} from '../app/character-control-profile.js';
import {poseCarryHands} from '../app/carry-hand-pose.js?v=carry-hands-1';

const $=s=>document.querySelector(s),canvas=$('#game'),placeEl=$('#place'),timerEl=$('#timer'),hint=$('#hint'),countdown=$('#countdown'),restart=$('#restart');
const renderer=__installGraphicsQuality(new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}));
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c5cddd');scene.fog=new THREE.Fog('#c5cddd',65,160);
const camera=new THREE.PerspectiveCamera(profile.fov,1,.1,220);
scene.add(new THREE.HemisphereLight('#fff6ed','#82917e',1.6));
const sun=new THREE.DirectionalLight('#fff4e5',2.1);sun.position.set(-22,38,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-28,right:28,top:38,bottom:-38});sun.shadow.bias=-.0002;scene.add(sun);scene.add(sun.target);
const course=new THREE.Group();scene.add(course);const obstacles=[],racers=[],particles=[],reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,lanes=[-7.5,-2.5,2.5,7.5],colors=['#dcaebf','#e6d6ac','#b5cfb5','#b4cbd9'];
const mat=(color,rough=.82)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0});function box(w,h,d,color,x,y,z,group=course){const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.18,h*.18,w*.1,d*.1)),mat(color));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o}
box(22,.7,142,'#fff5df',0,-.42,-48);lanes.forEach((x,i)=>{box(4.7,.12,136,colors[i],x,.02,-48);for(let z=17;z>-116;z-=7)box(4.2,.025,.08,'#ffffff',x,.095,z)});box(.65,1.15,142,'#f7f0e4',-11.3,.35,-48);box(.65,1.15,142,'#f7f0e4',11.3,.35,-48);for(let z=18;z>-117;z-=12){box(.35,.35,.35,'#f4b7cd',-11.25,1.2,z);box(.35,.35,.35,'#9cd9e8',11.25,1.2,z)}
[-9,-43,-78].forEach((z,row)=>{for(let i=0;i<2;i++){const mesh=box(3.8,1.9,2.5,row%2?'#a8d7ef':'#ffc09b',0,1,z);obstacles.push({kind:'slider',mesh,z,row,phase:i*Math.PI,speed:.65+row*.09})}});[-26,-61,-96].forEach((z,row)=>{const g=new THREE.Group();g.position.set(0,.55,z);course.add(g);box(1.1,2.7,1.1,'#fff1c8',0,1.05,0,g);box(18,.62,.78,row%2?'#f493b8':'#8bd4b3',0,.18,0,g);obstacles.push({kind:'spinner',mesh:g,z,row,speed:(row%2?-.7:.78)+row*.08})});
box(22,.12,1.1,'#fff',0,.12,-112);for(let x=-10;x<10;x+=2)box(1.05,.14,1.2,((x+10)/2)%2?'#32474f':'#fff',x+.55,.19,-112);box(1.1,6,1.1,'#ffedb8',-10.5,3,-113);box(1.1,6,1.1,'#ffedb8',10.5,3,-113);box(22,1,1,'#f08eb4',0,6,-113);[12,-20,-54,-88].forEach((z,i)=>box(21.3,.035,.45,['#fff0ba','#c7f0d0','#c6e8fa','#f7bfd4'][i],0,.14,z));


const keys=new Set(),touch={x:0,z:0};let phase='loading',elapsed=0,raceTime=0,worldTime=0,frameNumber=0,cameraYaw=0,cameraPitch=profile.pitch,stickPointer=null,actionPending=false,actionCooldown=0,jumpUntil=0;
const runningCamera=createRunningCamera();
const look=bindRunningLook(canvas,()=>phase==='racing'||phase==='ready',(yaw,pitch)=>{cameraYaw+=yaw;cameraPitch=THREE.MathUtils.clamp(cameraPitch+pitch,-.15,1.05);});
installRunningCameraSettings();
const jump=bindHeldAction($('#jump')),sprint=bindHeldAction($('#sprint'));
const start=$('#start'),stick=$('#stick'),knob=$('#knob');
function clearInput(){keys.clear();touch.x=touch.z=0;stickPointer=null;knob.style.transform='translate(0,0)';jump.reset();sprint.reset();look.reset();actionPending=false;jumpUntil=0;}
addEventListener('park:release-controls',clearInput);
addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if(e.target.closest('button')&&['Space','Enter'].includes(e.code))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.code==='Space')jumpUntil=performance.now()+180;if(!e.repeat&&['KeyE','KeyF'].includes(e.code))actionPending=true;
});
addEventListener('keyup',e=>keys.delete(e.code));
function moveStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,n=Math.hypot(dx,dy),scale=n?Math.min(n,42)/n:0;touch.x=dx*scale/42;touch.z=-dy*scale/42;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
stick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e)});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.z=0;knob.style.transform='translate(0,0)'}});
$('#grab').addEventListener('click',()=>{actionPending=true;});
start.addEventListener('click',()=>{if(phase!=='ready')return;clearInput();phase='countdown';elapsed=0;start.blur();start.hidden=true;canvas.tabIndex=0;canvas.focus();hint.textContent='Get ready';});
restart.addEventListener('click',()=>location.reload());
function racer(name,lane){
 const root=new THREE.Group(),pivot=new THREE.Group(),visual=new THREE.Group();
 root.add(pivot);pivot.position.y=.65;pivot.add(visual);visual.position.y=-.65;
 const spawn=[{x:-.2,z:11},{x:-1.2,z:15},{x:-1.7,z:8},{x:.3,z:6.6}][lane];
 root.position.set(spawn.x,.15,spawn.z);root.rotation.y=Math.PI;scene.add(root);
 const label=document.createElement('span');label.className='racer-name';label.textContent=name;$('#labels').append(label);
 const r={name,lane,root,pivot,visual,label,avatar:null,y:0,vx:0,vz:0,vy:0,grounded:true,stun:0,immune:0,carry:null,carriedBy:null,carryAge:0,checkpoint:15,finished:false,finishTime:0};racers.push(r);return r;
}
const player=racer('You',1);racer('Mint',0);racer('Sky',2);racer('Honey',3);
async function loadCharacters(){
 const ids=['friendsie_1','friendsie_100','friendsie_404'];
 await Promise.all(racers.map(async(r,i)=>{
  const selected=i===0?{...equipment}:{base:ids[i-1],body:null,head:null,sprout:null,back:null,kicks:null,held:null,power:null,vibe:null};
  const avatar=await createCharacter(selected);r.avatar=avatar;r.visual.add(avatar.root);r.root.userData.equipment=selected;
  await avatar.animator.ready;
  r.labelHeight=new THREE.Box3().setFromObject(avatar.root).getSize(new THREE.Vector3()).y+.18;
 }));
 phase='ready';start.hidden=false;start.textContent='Start race';countdown.textContent='';hint.textContent='Race with 3 bots · Move, jump and grab';
}
function release(r,throwing=false){
 const target=r.carry;if(!target)return;
 if(r===player&&throwing)feelFeedback.play("throw");r.carry=null;target.carriedBy=null;target.y=Math.max(0,target.root.position.y-.15);target.vy=throwing?5:0;
 target.vx=throwing?Math.sin(r.root.rotation.y)*10:0;target.vz=throwing?Math.cos(r.root.rotation.y)*10:0;
 target.stun=throwing?.55:0;target.immune=1.1;target.grounded=false;target.pivot.rotation.set(0,0,0);
}
function grab(){
 if(actionCooldown>0||player.stun>0||player.carriedBy||player.finished)return;
 actionCooldown=.32;
 if(player.carry){release(player,true);return}
 let target=null,best=2.1;
 for(const r of racers){if(r===player||r.carriedBy||r.carry||r.finished)continue;const distance=player.root.position.distanceTo(r.root.position);if(distance<best){target=r;best=distance}}
 if(target){feelFeedback.play("grab");player.carry=target;target.carriedBy=player;player.carryAge=0;target.pickupFrom=target.root.position.clone();target.stun=0;target.vx=target.vz=target.vy=0;}
}
function hit(r,x,z){if(r.immune>0||r.carriedBy||r.finished)return;release(r);if(r===player)feelFeedback.play("hit");r.stun=.58;r.immune=1.05;r.vx=x*5;r.vz=z*5;r.vy=3.8;r.grounded=false;}
function collisions(r){
 if(r.stun>0||r.carriedBy)return;
 for(const o of obstacles){
  const dx=r.root.position.x-o.mesh.position.x,dz=r.root.position.z-o.z;
  if(o.kind==='slider'){
   if(r.y<1.9&&Math.abs(dx)<2.35&&Math.abs(dz)<1.8)hit(r,Math.sign(dx)||1,.45);
  }else{
   const a=o.mesh.rotation.y,c=Math.cos(a),s=Math.sin(a),lx=dx*c-dz*s,lz=dx*s+dz*c;
   if(Math.hypot(dx,dz)<1.1&&r.y<2.5){hit(r,Math.sign(dx)||1,1);continue}
   if(r.y<1.05&&Math.abs(lx)<9.4&&Math.abs(lz)<.8)hit(r,Math.sin(a)*Math.sign(lx||1),Math.cos(a)*Math.sign(lx||1));
  }
 }
}
function move(r,dt){
 r.immune=Math.max(0,r.immune-dt);
 if(r.carriedBy)return;
 if(r.finished){r.avatar.animator.update(dt,{speed:0,grounded:true});return}
 let direction={x:0,z:0},speed=profile.run,wantsJump=false;
 if(r===player){
  let x=touch.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  let z=touch.z+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
  direction=characterDirection(x,z,cameraYaw);speed=keys.has('ShiftLeft')||keys.has('ShiftRight')||sprint.held()?profile.sprint:profile.run;
  wantsJump=keys.has('Space')||performance.now()<jumpUntil||jump.consume();
 }else{
  direction.x=THREE.MathUtils.clamp((lanes[r.lane]-r.root.position.x)*.65,-1,1);direction.z=-1;
  for(const o of obstacles){const ahead=r.root.position.z-o.z;if(ahead>0&&ahead<5){
   if(o.kind==='spinner')wantsJump=true;
   else if(Math.abs(r.root.position.x-o.mesh.position.x)<3)direction.x=Math.sign(r.root.position.x-o.mesh.position.x)||1;
  }}
  const len=Math.hypot(direction.x,direction.z);direction.x/=len;direction.z/=len;speed=5.8+r.lane*.12;
 }
 if(r.stun>0)r.stun=Math.max(0,r.stun-dt);
 else{
  const acceleration=r.grounded?profile.groundAcceleration:profile.airAcceleration;
  const approach=(a,b)=>a+THREE.MathUtils.clamp(b-a,-acceleration*dt,acceleration*dt);
  r.vx=approach(r.vx,direction.x*speed);r.vz=approach(r.vz,direction.z*speed);
  if(Math.hypot(direction.x,direction.z)>.05){
   const target=Math.atan2(direction.x,direction.z),difference=Math.atan2(Math.sin(target-r.root.rotation.y),Math.cos(target-r.root.rotation.y));r.root.rotation.y+=difference*Math.min(1,dt*18);
  }
  if(wantsJump&&r.grounded){r.vy=profile.jump;r.grounded=false;r.avatar.animator.signal('jump');if(r===player){jumpUntil=0;feelFeedback.play('jump');}}
 }
 const previousGround=r.grounded;r.vy-=profile.gravity*dt;r.y+=r.vy*dt;
 if(r.y<=0){r.y=0;r.vy=0;r.grounded=true;if(!previousGround){r.avatar.animator.signal('land');if(r===player)feelFeedback.play('land');}}
 r.root.position.x=THREE.MathUtils.clamp(r.root.position.x+r.vx*dt,-10.1,10.1);
 r.root.position.z=THREE.MathUtils.clamp(r.root.position.z+r.vz*dt,-119,20);
 r.root.position.y=r.y+.15;
 r.avatar.animator.update(dt,{speed:Math.hypot(r.vx,r.vz),grounded:r.grounded,verticalVelocity:r.vy});
 // Rotate about the torso, never about the feet or through the floor.
 r.pivot.rotation.x=r.stun>0?(reduced?-.18:Math.sin((.58-r.stun)/.58*Math.PI)*-.85):0;
 r.pivot.rotation.z=r.stun>0?(reduced?0:Math.sin((.58-r.stun)*15)*.18):0;
 collisions(r);
 for(const cp of [12,-20,-54,-88])if(r.root.position.z<cp)r.checkpoint=cp;
 if(r.carry){r.carryAge+=dt;if(r.carryAge>3.5)release(r,true);}
 if(r.root.position.z<-112){release(r);r.finished=true;r.finishTime=raceTime;if(r===player){phase='finished';restart.hidden=false;countdown.textContent=`Finished #${racers.filter(p=>p.finished).length}`;countdown.classList.remove('out');}}
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
const position=new THREE.Vector3(),clock=new THREE.Clock();
function frame(){
 const dt=Math.min(.033,clock.getDelta());worldTime+=dt;frameNumber++;
 runningCamera.restore();
 if(phase==='countdown'&&!settingsOpen()){elapsed+=dt;countdown.textContent=String(Math.max(1,3-Math.floor(elapsed)));if(elapsed>=3){phase='racing';countdown.classList.add('out');hint.textContent='WASD / joystick · Jump · Grab / throw';}}
 if(phase==='racing'&&!settingsOpen()){
  raceTime+=dt;actionCooldown=Math.max(0,actionCooldown-dt);
  for(const o of obstacles){if(o.kind==='slider')o.mesh.position.x=Math.sin(worldTime*o.speed+o.phase+o.row)*6.9;else o.mesh.rotation.y=worldTime*o.speed;}
  if(actionPending){actionPending=false;grab();}
  for(const r of racers)move(r,dt);
  for(const r of racers)if(r.carriedBy){
   const carrier=r.carriedBy,heading=carrier.root.rotation.y;
   // Mini-game roots are at the feet; the island root is 0.555 m higher.
   // Keep the same hand-supported height without the old 1.8 m teleport.
   const t=reduced?1:Math.min(1,carrier.carryAge/.2),blend=t*t*(3-2*t);
   position.set(carrier.root.position.x+Math.sin(heading)*.36,carrier.root.position.y+.595,carrier.root.position.z+Math.cos(heading)*.36);
   r.root.position.copy(r.pickupFrom).lerp(position,blend);
   r.y=Math.max(0,r.root.position.y-.15);r.root.rotation.y=heading;
   r.pivot.rotation.set(0,0,0);
   r.avatar.animator.update(dt,{speed:0,grounded:true,verticalVelocity:0});
  }
 }else for(const r of racers){
  if(phase==='finished'){
   release(r);r.vy-=profile.gravity*dt;r.y=Math.max(0,r.y+r.vy*dt);r.root.position.y=r.y+.15;r.pivot.rotation.set(0,0,0);
   if(r.y===0)r.vy=0;
  }
  r.avatar?.animator.update(dt,{speed:0,grounded:r.y===0,verticalVelocity:r.vy});
 }
 for(const r of racers)poseCarryHands(r.root,r.carry?.root.position||null,r.root.rotation.y,dt);
 $('#grab span').textContent=player.carry?'THROW':'GRAB';
 const view=runningCamera.update(camera,player.visual,player.root.position,cameraYaw,cameraPitch);camera.updateMatrixWorld();
 sun.position.set(player.root.position.x-22,38,player.root.position.z+20);sun.target.position.copy(player.root.position);
 for(const r of racers){position.copy(r.root.position);position.y+=r.labelHeight||1.5;position.project(camera);r.label.hidden=(r===player&&view.avatarHidden)||position.z>1||position.z< -1;r.label.style.transform=`translate(${(position.x*.5+.5)*innerWidth}px,${(-position.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`;}
 const sorted=[...racers].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:a.root.position.z-b.root.position.z);
 placeEl.textContent=`${sorted.indexOf(player)+1} / 4`;timerEl.textContent=raceTime.toFixed(1)+'s';
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
window.__rushReadState=()=>({phase,frames:frameNumber,time:raceTime,yaw:cameraYaw,cameraSettings:camera.userData.runningCamera,otherAvatars:racers.slice(1).map(r=>r.visual.visible),player:{x:player.root.position.x,y:player.y,z:player.root.position.z,facing:player.root.rotation.y,carry:player.carry?.name,stun:player.stun},racers:racers.map(r=>({name:r.name,base:r.avatar?.root.userData.equipment?.base,clip:r.avatar?.animator.stats?.clip,x:r.root.position.x,y:r.root.position.y,carriedBy:r.carriedBy?.name,z:r.root.position.z,hands:r.root.userData.carryHands})),touch:{...touch}});
countdown.textContent='Loading characters';frame();loadCharacters().catch(error=>{console.error(error);phase='error';countdown.textContent='Could not load characters';hint.textContent='Please reload to retry';restart.hidden=false;restart.textContent='Reload'});
