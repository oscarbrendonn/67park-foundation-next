const finite=value=>Number.isFinite(value);
const TAU=Math.PI*2;

function normalizedAngle(delta){return Math.atan2(Math.sin(delta),Math.cos(delta));}

/**
 * Return true only for the free, grounded avatar standing on a carousel deck.
 * Mounted and seated riders are positioned by their own ride-passenger path,
 * so this deliberately never carries those contexts a second time.
 */
export function isCarouselDeckContact({deck,position,grounded,vertical=0,footOffset=.555,tolerance=.12,context=null}){
 if(!deck||deck.kind!=='carousel'||!position||!grounded||vertical>.2)return false;
 if(context&&(context.mounted||context.seated||context.riding||context.vehicle||context.resting||context.swimming||context.carried||context.carryTarget||context.jumpQueued||context.jumping||context.blocked||context.hawk))return false;
 const {center,radius,ground}=deck;
 if(!center||!finite(center.x)||!finite(center.z)||!finite(radius)||typeof ground!=='function')return false;
 if(!finite(position.x)||!finite(position.y)||!finite(position.z))return false;
 const distance=Math.hypot(position.x-center.x,position.z-center.z);
 if(distance<(deck.innerRadius??0)-.02||distance>radius+.02)return false;
 const floor=ground(position.x,position.z);
 return finite(floor)&&Math.abs(position.y-footOffset-floor)<=tolerance;
}

/** Rotate an X/Z point exactly as a Three.js Y-axis carousel rotor does. */
export function rotateCarouselDeckPoint(position,center,delta){
 const x=position.x-center.x,z=position.z-center.z,c=Math.cos(delta),s=Math.sin(delta);
 return {x:center.x+c*x+s*z,z:center.z-s*x+c*z,delta};
}

/**
 * Keep one of these per free avatar. `step` always samples the current angle,
 * including while the avatar is in the air or outside the deck. That prevents
 * a later landing/rejoin from replaying skipped rotation as a teleport.
 */
export function createCarouselDeckCarry({maxAngleStep=.25}={}){
 let previousDeck=null,previousAngle=null;
 return {
  reset(){previousDeck=null;previousAngle=null;},
  step(sample){
   const deck=sample?.deck,angle=deck?.angle;
   if(!finite(angle)){previousDeck=null;previousAngle=null;return null;}
   const changed=deck!==previousDeck||previousAngle===null;
   const delta=changed?0:normalizedAngle(angle-previousAngle);
   previousDeck=deck;previousAngle=angle;
   // A late/restarted network clock must not fling a nearby avatar through a
   // half-turn. Normal render/network updates are far below this threshold.
   if(changed||Math.abs(delta)<1e-9||Math.abs(delta)>maxAngleStep||!isCarouselDeckContact(sample))return null;
   return rotateCarouselDeckPoint(sample.position,deck.center,delta);
  },
 };
}

export {normalizedAngle as normalizeCarouselDeckAngle,TAU as CAROUSEL_DECK_TAU};
