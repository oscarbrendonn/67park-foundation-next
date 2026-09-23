// Horizontal position and manual look remain direct. Only vertical travel and
// release from an occluder are damped. No shake, speed zoom or auto-yaw.
export const FEEL_CAMERA = Object.freeze({pitch:.36,distance:6.8,fov:55,targetHeight:1.15,portraitExtra:1.0,padding:.24,releaseRate:8,releaseHold:.10});
const finitePoint = p => p && [p.x,p.y,p.z].every(Number.isFinite);
export function feelCameraPose(feet,yaw,pitch,distance=FEEL_CAMERA.distance,aspect=1.5){
 const p=Math.max(-.15,Math.min(1.1,Number.isFinite(pitch)?pitch:FEEL_CAMERA.pitch));
 const orbit=Math.max(.5,Math.min(18,Number.isFinite(distance)?distance:FEEL_CAMERA.distance));
 const d=orbit + Math.max(0,Math.min(1,(.9-aspect)/.45))*FEEL_CAMERA.portraitExtra*Math.min(1,Math.max(0,(orbit-.5)/1.7));
 const target={x:feet.x,y:feet.y+FEEL_CAMERA.targetHeight,z:feet.z};
 return {target,position:{x:target.x+Math.sin(yaw)*Math.cos(p)*d,y:target.y+Math.sin(p)*d,z:target.z+Math.cos(yaw)*Math.cos(p)*d}};
}
export function createCameraBoom(){
 let length=null,last=null,hold=0;
 const vertical=createVerticalCameraTarget();
 return {
  reset(){length=null;last=null;hold=0;vertical.reset();},
  pose(feet,yaw,pitch,distance,aspect,dt){return feelCameraPose(vertical.step(feet,dt),yaw,pitch,distance,aspect);},
  step(target,desired,dt,cast){
   if(!finitePoint(target)||!finitePoint(desired))return null;
   dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
   const dx=desired.x-target.x,dy=desired.y-target.y,dz=desired.z-target.z,wanted=Math.hypot(dx,dy,dz);
   if(wanted<1e-5)return {...desired};
   const direction={x:dx/wanted,y:dy/wanted,z:dz/wanted};
   const teleport=!last||Math.hypot(target.x-last.x,target.y-last.y,target.z-last.z)>8;
   let safe=wanted;
   if(cast){
    // A centre ray plus four near-plane probes, not just a thin point camera.
    const horizontal=Math.hypot(direction.x,direction.z)||1,rx=direction.z/horizontal,rz=-direction.x/horizontal;
    for(const [side,up] of [[0,0],[.18,0],[-.18,0],[0,.18],[0,-.18]]){
     const origin={x:target.x+side*rx,y:target.y+up,z:target.z+side*rz};
     const hit=cast(origin,direction,wanted);
     if(Number.isFinite(hit)&&hit>=0)safe=Math.min(safe,Math.max(.08,hit-FEEL_CAMERA.padding));
    }
   }
   if(teleport||length===null)length=safe;
   else if(safe<length){length=safe;hold=FEEL_CAMERA.releaseHold;}
   else if(safe<wanted-.01&&safe<length+.04){length=Math.min(length,safe);hold=FEEL_CAMERA.releaseHold;}
   else if(hold>0)hold=Math.max(0,hold-dt);
   else length+=(safe-length)*(1-Math.exp(-FEEL_CAMERA.releaseRate*dt));
   length=Math.min(length,safe);last={...target};
   return {x:target.x+direction.x*length,y:target.y+direction.y*length,z:target.z+direction.z*length,distance:length,occluded:safe<wanted-.01};
  }
 };
}

export function createVerticalCameraTarget(){
 let previous=null,y=null;
 return {
  reset(){previous=null;y=null;},
  step(feet,dt){
   if(!finitePoint(feet))return previous?{...previous,y}:feet;
   const jump=!previous||Math.hypot(feet.x-previous.x,feet.y-previous.y,feet.z-previous.z)>8;
   if(jump||y===null)y=feet.y;
   else{
    const seconds=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    // Reuse the established camera release time constant. Bound vertical lag
    // during a fall so the avatar and the landing area never leave the frame.
    y+=(feet.y-y)*(1-Math.exp(-FEEL_CAMERA.releaseRate*seconds));
    y=Math.max(feet.y-.65,Math.min(feet.y+.65,y));
   }
   previous={...feet};return {x:feet.x,y,z:feet.z};
  },
 };
}

export function createTravelSampler(){
 let previous=null;
 return (position,dt,enabled=true)=>{
  if(!finitePoint(position)||!enabled){previous=null;return null;}
  const p=previous;previous={x:position.x,z:position.z};
  if(!p||!Number.isFinite(dt)||dt<=0)return null;
  const distance=Math.hypot(position.x-p.x,position.z-p.z);
  return distance>Math.max(2,dt*35)?null:distance/dt;
 };
}

// Authored run covers 6.8 world units/s. Do not cap playback below sprint
// speed: a 12.5-unit sprint with a 1.6x cap visibly slides its feet.
export function locomotionRate(clip,speed){
 const reference=clip==='walk'?3.4:6.8;
 return Math.max(.05,Math.min(2.2,(Number.isFinite(speed)?Math.max(0,speed):0)/reference));
}

// Change horizontal velocity along a vector, rather than snapping its direction
// at full speed. This never delays jump or locks movement during a landing.
export function approachVelocity(out,current,target,acceleration,dt){
 const dx=target.x-current.x,dz=target.z-current.z,d=Math.hypot(dx,dz);
 const fraction=d>0?Math.min(1,Math.max(0,acceleration)*Math.max(0,Math.min(.05,dt))/d):1;
 out.x=current.x+dx*fraction;out.z=current.z+dz*fraction;
 return out;
}
