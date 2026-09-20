const finite=value=>Number.isFinite(value);
const TAU=Math.PI*2;

function normalizedAngle(delta){return Math.atan2(Math.sin(delta),Math.cos(delta));}
const monotonicNow=()=>globalThis.performance?.now?.()??Date.now();

function deckAngularSpeed(deck){
 const speed=deck?.angularSpeed;
 return finite(speed)&&speed>0?speed:null;
}

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
export function createCarouselDeckCarry({maxAngleStep=.25,maxElapsed=5,angleJitter=.06,maxDeckArc=6,now=monotonicNow}={}){
 let previousDeck=null,previousAngle=null,previousTime=null,angleCredit=0;
 return {
  reset(){previousDeck=null;previousAngle=null;previousTime=null;angleCredit=0;},
  step(sample){
   const deck=sample?.deck,angle=deck?.angle,time=finite(sample?.now)?sample.now:now();
   if(!finite(angle)||!finite(time)){previousDeck=null;previousAngle=null;previousTime=null;angleCredit=0;return null;}
   const changed=deck!==previousDeck||previousAngle===null;
   const delta=changed?0:normalizedAngle(angle-previousAngle);
   const elapsed=changed?0:(time-previousTime)/1e3;
   previousDeck=deck;previousAngle=angle;previousTime=time;
   const contact=isCarouselDeckContact(sample),speed=deckAngularSpeed(deck),magnitude=Math.abs(delta);
   // A trusted carousel rate funds one bounded angle budget. This bridges the
   // capped local extrapolation followed by a delayed network packet without
   // granting fresh jitter on every frame or replaying a hidden-tab interval.
   if(changed){angleCredit=speed===null?0:angleJitter;return null;}
   if(elapsed<0||elapsed>maxElapsed){angleCredit=speed===null?0:angleJitter;return null;}
   const maxCredit=speed===null?0:speed*maxElapsed+angleJitter;
   if(speed!==null)angleCredit=Math.min(maxCredit,angleCredit+speed*elapsed);
   const orbitRadius=contact?Math.hypot(sample.position.x-deck.center.x,sample.position.z-deck.center.z):Infinity;
   const travel=orbitRadius*magnitude;
   const allowed=speed===null?maxAngleStep:angleCredit;
   if(magnitude<1e-9)return null;
   if(magnitude>allowed||(speed!==null&&delta<-angleJitter)){angleCredit=speed===null?0:angleJitter;return null;}
   if(speed!==null)angleCredit=Math.min(maxCredit,angleCredit-delta);
   // Valid off-deck samples still spend their budget so rejoining cannot replay
   // skipped rotation. Only a contacting avatar is subject to deck arc carry.
   if(travel>maxDeckArc||!contact)return null;
   return rotateCarouselDeckPoint(sample.position,deck.center,delta);
  },
 };
}

export {normalizedAngle as normalizeCarouselDeckAngle,TAU as CAROUSEL_DECK_TAU};
