// TEST SETUP ONLY. Serialized into the isolated acceptance page, never shipped.
// A 0.728s arming band cannot reliably be sampled by 1.0-1.25s CI frames.
// Establish a deterministic initial phase while the rider settles, then retain
// every real network-angle delta during input, launch and airborne observation.
// Normal/delayed moving-cabin carry and walk-off use the unmodified clock.
function installFerrisJumpPhase(ride){
 const inPage=!ride;
 if(inPage)ride=globalThis.__islandWorld.rides.find(r=>r.asset==='ferris');
 if(!ride||typeof ride.setNetworkAngle!=='function')throw Error('Missing real Ferris clock');
 const original=ride.setNetworkAngle,TAU=Math.PI*2;
 const seats=Array.from({length:12},(_,n)=>ride.seat(n*4));
 const cx=seats.reduce((s,p)=>s+p.position.x,0)/12,cy=seats.reduce((s,p)=>s+p.position.y,0)/12;
 const p=seats[0].position,radius=Math.hypot(p.x-cx,p.y-cy),rate=TAU/ride.stats.period;
 const targetPhase=TAU-Math.acos(-.35/(radius*rate));
 const currentPhase=Math.atan2(p.y-cy,p.x-cx);
 const normalize=a=>((a%TAU)+TAU)%TAU;
 const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const target=normalize(ride.angle+targetPhase-currentPhase);
 let lastSource=ride.angle,held=true,restored=false,heldWrites=0,movingWrites=0,travel=0,maxDeltaError=0;
 const wrapped=function(angle){
  if(!Number.isFinite(angle))throw Error('Invalid real Ferris network angle');
  if(held){lastSource=angle;heldWrites++;return original.call(this,target);}
  const step=delta(angle,lastSource),before=ride.angle;
  lastSource=angle;movingWrites++;travel+=Math.abs(step);
  const result=original.call(this,normalize(before+step));
  maxDeltaError=Math.max(maxDeltaError,Math.abs(delta(ride.angle,before)-step));
  return result;
 };
 ride.setNetworkAngle=wrapped;original.call(ride,target);
 const fixture={cabin:0,target,
  release(){if(!held||restored)throw Error('Ferris fixture can only release once');held=false;},
  stats(){return {held,restored,heldWrites,movingWrites,travel,maxDeltaError};},
  restore(){if(restored)return;restored=true;ride.setNetworkAngle=original;original.call(ride,lastSource);}
 };
 if(inPage){globalThis.__qaFerrisPhase=fixture;return {cabin:0,target};}
 return fixture;
}
module.exports={installFerrisJumpPhase};
