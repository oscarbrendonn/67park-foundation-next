// Opt-in: only the two running / jumping courses import this adapter.
import {beginCameraDrag,moveCameraDrag,endCameraDrag} from './camera-pointer.js?v=touch-zoom-1';
import {cameraLookDelta} from './control-tuning.js';
import {readCameraZoom,changeCameraZoom,flushCameraZoom} from './camera-zoom.js?v=camera-settings-1';
import {FIRST_PERSON_ZOOM,firstPersonPose,createCameraPresentation} from './camera-presentation.js';
import {feelCameraPose} from './feel-camera.js';
import {settingsOpen} from './player-settings.js';

export function bindRunningLook(canvas,enabled,onLook){
 let drag=null;const listeners=[];
 const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
 const allowed=()=>enabled()&&!settingsOpen()&&!document.hidden;
 const end=e=>{drag=endCameraDrag(drag,e);if(!drag)flushCameraZoom();};
 listen(canvas,'pointerdown',e=>{if(allowed())drag=beginCameraDrag(e,drag,{pinch:true});});
 listen(canvas,'pointermove',e=>{
  if(!allowed()){end();return;}
  const delta=moveCameraDrag(drag,e);if(!delta)return;
  if(delta.ended){end();return;}
  e.preventDefault();
  if(delta.zoomScale){changeCameraZoom(readCameraZoom()*delta.zoomScale);return;}
  const d=cameraLookDelta(delta,drag.mouse);onLook(-d.x,d.y);
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,type,end);
 listen(canvas,'wheel',e=>{if(allowed()){e.preventDefault();changeCameraZoom(readCameraZoom()+e.deltaY*.004);}},{passive:false});
 listen(canvas,'contextmenu',e=>e.preventDefault());
 listen(window,'blur',()=>end());listen(window,'pagehide',()=>end());
 listen(window,'park:release-controls',()=>end());
 listen(document,'visibilitychange',()=>{if(document.hidden)end();});
 return {reset:()=>end(),dispose(){end();listeners.splice(0).forEach(off=>off());}};
}

export function createRunningCamera(){
 const presentation=createCameraPresentation();
 return {
  restore:presentation.restore,
  reset:presentation.reset,
  update(camera,visual,feet,yaw,pitch,{resolve,dt=0}={}){
   presentation.restore();
   const distance=readCameraZoom(),firstPerson=distance<=FIRST_PERSON_ZOOM;
   const pose=firstPerson?firstPersonPose(feet,yaw,pitch):feelCameraPose(feet,yaw,pitch,distance,camera.aspect);
   camera.up.set(0,1,0);camera.position.set(pose.position.x,pose.position.y,pose.position.z);
   if(!firstPerson)resolve?.(pose,camera,dt,distance);
   camera.lookAt(pose.target.x,pose.target.y,pose.target.z);
   const actual=Math.hypot(camera.position.x-feet.x,camera.position.y-feet.y-1.15,camera.position.z-feet.z);
   const hidden=presentation.apply(camera,visual,{firstPerson,distance:actual});
   camera.userData.runningCamera={revision:'running-camera-1',requestedDistance:distance,firstPerson,avatarHidden:hidden,localAvatarVisible:visual?.visible??null,yaw,pitch,position:camera.position.toArray(),eye:[feet.x,feet.y+1.45,feet.z]};
   return camera.userData.runningCamera;
  }
 };
}
