const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

// Bounded breadcrumb following. Pets never write to a player's rigid body.
// A blocked route waits/recalls safely; it never pushes through a wall or water.
export function createPetFollower(probe) {
  const state={x:0,y:0,z:0,heading:0,speed:0,visible:false,distance:0,recalls:0,blocked:0};
  const trail=[]; let lastOwner=null,stuck=0,initialized=false;
  function safe(x,z,reference,limit=.42) {
    const y=probe(x,z,reference);
    return Number.isFinite(y)&&Math.abs(y-reference)<limit?y:null;
  }
  function place(owner,heading) {
    for(const angle of [Math.PI/2,-Math.PI/2,Math.PI,Math.PI*.75,-Math.PI*.75,0]) {
      const x=owner.x+Math.sin(heading+angle)*1.15,z=owner.z+Math.cos(heading+angle)*1.15;
      const y=safe(x,z,owner.y,.7);
      if(y===null)continue;
      Object.assign(state,{x,y,z,heading,speed:0,visible:true});initialized=true;stuck=0;trail.length=0;return true;
    }
    state.visible=false;return false;
  }
  function step(dt,owner,heading=0) {
    dt=clamp(Number.isFinite(dt)?dt:0,0,.1);state.distance=0;
    if(!finitePoint(owner)||!Number.isFinite(heading)||dt===0){state.speed=0;return state;}
    if(!initialized||!lastOwner||dist(owner,lastOwner)>18||dist(state,owner)>24) {
      const again=initialized;place(owner,heading);if(again)state.recalls++;
      lastOwner={...owner};return state;
    }
    if(!trail.length||dist(trail[trail.length-1],owner)>.32){trail.push({...owner,heading});if(trail.length>80)trail.shift();}
    lastOwner={...owner};
    let target;
    // Use the player's traversed route around corners rather than cutting
    // directly through a building. Skip only points already reached.
    while(trail.length>2&&dist(state,trail[0])<.7)trail.shift();
    if(trail.length>3) target=trail[0];
    else {
      const side=.87,behind=.85;
      target={x:owner.x+Math.cos(heading)*side-Math.sin(heading)*behind,z:owner.z-Math.sin(heading)*side-Math.cos(heading)*behind};
    }
    const dx=target.x-state.x,dz=target.z-state.z,d=Math.hypot(dx,dz);
    if(d<.16){state.speed=0;stuck=0;return state;}
    // Speed depends on the owner gap, not the short next breadcrumb. Otherwise
    // a running player outruns a pet that slows down at every path sample.
    const desired=Math.min(10,Math.max(.25,(Math.max(d,dist(state,owner)-.9)-.13)*3.5));
    let move=Math.min(d,desired*dt),nx=dx/d,nz=dz/d,moved=0;
    // Max 7 short probes even after a long frame; no unbounded catch-up loop.
    for(let i=0;i<7&&move>.001;i++) {
      const amount=Math.min(.16,move),x=state.x+nx*amount,z=state.z+nz*amount;
      const y=safe(x,z,state.y);
      if(y===null){state.blocked++;break;}
      state.x=x;state.y=y;state.z=z;moved+=amount;move-=amount;
    }
    if(moved>.001){state.heading+=wrap(Math.atan2(nx,nz)-state.heading)*(1-Math.exp(-12*dt));stuck=0;state.visible=true;}
    else stuck+=dt;
    state.speed=moved/dt;state.distance=moved;
    if(stuck>2.5&&dist(state,owner)>4){state.visible=false;initialized=false;state.recalls++;stuck=0;}
    return state;
  }
  // Commands use the same terrain probe as following, never a tween through
  // colliders. A long frame cannot skip a wall or allocate a second navigator.
  function moveTo(dt,target,{speed=2.6,radius=.12,face}={}) {
    dt=clamp(Number.isFinite(dt)?dt:0,0,.1);state.distance=0;state.speed=0;
    if(!initialized||!finitePoint(target)||!dt)return false;
    const dx=target.x-state.x,dz=target.z-state.z,d=Math.hypot(dx,dz);
    if(d<=radius){if(Number.isFinite(face))state.heading+=wrap(face-state.heading)*(1-Math.exp(-12*dt));return true;}
    let left=Math.min(d-radius,Math.max(0,speed)*dt),moved=0;
    const nx=dx/d,nz=dz/d;
    for(let i=0;i<7&&left>.001;i++) {
      const amount=Math.min(.13,left),x=state.x+nx*amount,z=state.z+nz*amount,y=safe(x,z,state.y);
      if(y===null){state.blocked++;break;}
      state.x=x;state.y=y;state.z=z;moved+=amount;left-=amount;
    }
    if(moved){state.heading+=wrap(Math.atan2(nx,nz)-state.heading)*(1-Math.exp(-14*dt));state.visible=true;}
    state.distance=moved;state.speed=moved/dt;
    return d-moved<=radius+.002;
  }
  return {state,step,moveTo,hold(){state.speed=state.distance=0;trail.length=0;},reset(){initialized=false;lastOwner=null;trail.length=0;state.visible=false;state.speed=0;},stats:()=>({trail:trail.length,initialized,...state})};
}
