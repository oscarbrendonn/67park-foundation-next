import {isTextEntry} from './text-input-guard.js?v=mobile-29';
// Pointer ownership shared by character and fallback orbit cameras.
// Pinch is opt-in for the park orbit; minigame aim stays single-pointer.
const UI='button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="dialog"],.park-stick,.park-action,.park-touch,.park-toolbar,.park-chat,.claude-emote-panel,.park-inventory-panel,.wardrobe,.online-dialog';
export function cameraCanvasEvent(event){
 if(isTextEntry())return false;
 const target=event?.target;
 if(target?.tagName!=='CANVAS'||target.closest?.(UI))return false;
 const path=event.composedPath?.()||[];
 if(path.some(el=>el!==target&&el?.matches?.(UI)))return false;
 return true;
}
export function beginCameraDrag(event,current=null,{pinch=false}={}){
 if(!cameraCanvasEvent(event))return current;
 const mouse=event.pointerType==='mouse';
 if(mouse&&event.button!==0&&event.button!==2)return current;
 if(!mouse&&event.pointerType!=='touch'&&event.pointerType!=='pen')return current;
 if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return current;
 // Keep the established left-hand movement region separate.
 if(event.pointerType==='touch'&&event.clientX<(globalThis.window?.innerWidth||0)*.45&&event.clientY>(globalThis.window?.innerHeight||0)*.55)return current;
 if(current){
  if(pinch&&current.touch&&event.pointerType==='touch'&&!current.second&&current.id!==event.pointerId){
   current.second={id:event.pointerId,x:event.clientX,y:event.clientY,target:event.target};
   current.span=Math.hypot(current.x-event.clientX,current.y-event.clientY);
   try{event.target.setPointerCapture?.(event.pointerId)}catch{}
  }
  return current;
 }
 const drag={id:event.pointerId,x:event.clientX,y:event.clientY,mouse,touch:event.pointerType==='touch',button:event.button,target:event.target};
 try{event.target.setPointerCapture?.(event.pointerId)}catch{}
 if(mouse&&event.button===2)event.preventDefault?.();
 return drag;
}
export function moveCameraDrag(drag,event){
 if(drag&&isTextEntry())return {ended:true};
 if(!drag)return null;
 if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return null;
 if(drag.second){
  const point=drag.id===event.pointerId?drag:drag.second.id===event.pointerId?drag.second:null;
  if(!point)return null;
  point.x=event.clientX;point.y=event.clientY;
  const span=Math.hypot(drag.x-drag.second.x,drag.y-drag.second.y),previous=drag.span;
  drag.span=span;
  return {x:0,y:0,zoomScale:span>8&&previous>8?previous/span:1};
 }
 if(drag.id!==event.pointerId)return null;
 // A missed release must never leave mouse-look latched.
 if(drag.mouse&&typeof event.buttons==='number'&&!(event.buttons&(drag.button===2?2:1)))return {ended:true};
 const delta={x:event.clientX-drag.x,y:event.clientY-drag.y};
 drag.x=event.clientX;drag.y=event.clientY;
 return delta;
}
export function endCameraDrag(drag,event){
 if(!drag)return drag;
 if(drag.second){
  const second=drag.second;
  if(event&&event.pointerId!==drag.id&&event.pointerId!==second.id)return drag;
  if(event){
   const lifted=event.pointerId===drag.id?{id:drag.id,target:drag.target}:second;
   if(event.pointerId===drag.id)Object.assign(drag,second);
   delete drag.second;delete drag.span;
   try{if(lifted.target.hasPointerCapture?.(lifted.id))lifted.target.releasePointerCapture(lifted.id)}catch{}
   return drag;
  }
  delete drag.second;delete drag.span;
  try{if(second.target.hasPointerCapture?.(second.id))second.target.releasePointerCapture(second.id)}catch{}
 }
 if(event&&drag.id!==event.pointerId)return drag;
 try{if(drag.target.hasPointerCapture?.(drag.id))drag.target.releasePointerCapture(drag.id)}catch{}
 return null;
}
