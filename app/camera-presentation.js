// Local camera presentation only: never changes avatar geometry, animation,
// physics, network state, other players, or the requested orbit yaw/pitch.
export const FIRST_PERSON_ZOOM=.55;
export const MIN_CAMERA_ZOOM=.5;
export function firstPersonPose(feet,yaw,pitch){
 const p=Math.max(-.15,Math.min(1.1,pitch)),eye={x:feet.x,y:feet.y+1.45,z:feet.z};
 return {position:eye,target:{x:eye.x-Math.sin(yaw)*Math.cos(p),y:eye.y-Math.sin(p),z:eye.z-Math.cos(yaw)*Math.cos(p)}};
}
export function createCameraPresentation(){
 let visual=null,visible=true,near=false,camera=null,nearPlane=null;
 function restore(){
  if(visual){visual.visible=visible;visual=null;}
  if(camera){camera.near=nearPlane;camera.updateProjectionMatrix();camera=null;}
 }
 return {
  restore,
  reset(){restore();near=false;},
  apply(view,avatar,{firstPerson=false,distance=Infinity}={}){
   restore();
   // Hysteresis stops a near-plane contact from toggling the local model every
   // frame. A camera inside the head must show the world, not sliced polygons.
   near=firstPerson||distance<(near?1.75:1.45);
   if(near&&avatar){visual=avatar;visible=avatar.visible;avatar.visible=false;}
   if(firstPerson&&view.near>.06){camera=view;nearPlane=view.near;view.near=.06;view.updateProjectionMatrix();}
   return near;
  }
 };
}
