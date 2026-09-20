// Egg Party-style carry interaction. One small state machine owns both ambient
// bots and online avatars so repeated taps cannot queue work or freeze a frame.
import {poseCarryHands} from './carry-hand-pose.js?v=carry-hands-1';
const botControllers = new Set();
const remotes = new Map();

let localId = '';
let targetId = '';
let pose = {x:0,y:0,z:0,heading:0,valid:false};
let lastToggle = -Infinity;
let localLift = null;

const finite = value => Number.isFinite(value);
const validPoint = point => point && finite(point.x) && finite(point.y) && finite(point.z);
const now = () => typeof performance === 'object' ? performance.now() : Date.now();
const heldPoint = (carrier, heading) => ({
  x: carrier.x + Math.sin(heading) * .36,
  y: carrier.y + .04,
  z: carrier.z + Math.cos(heading) * .36,
});
const lifted = (from,to,started) => {
  const t=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,Math.max(0,(now()-started)/200));
  const w=t*t*(3-2*t);
  return {x:from.x+(to.x-from.x)*w,y:from.y+(to.y-from.y)*w,z:from.z+(to.z-from.z)*w};
};

export function updateLocalCarryHands(root,dt) {
  let point=null;
  if(targetId && pose.valid) {
    const target=remotes.get(targetId)?.root;
    point=target?{x:target.position.x,y:target.position.y-.555,z:target.position.z}:heldPoint(pose,pose.heading);
  } else for(const controller of botControllers) if(controller.hasPassenger()) {
    point=controller.passengerPoint();break;
  }
  poseCarryHands(root,point,pose.heading,dt);
}

export function setCarryLocalId(id) {
  localId = typeof id === 'string' ? id : '';
  if (targetId === localId) targetId = '';
}

export function carryPacket() { return targetId || ''; }

export function readCarryPacket(remote, value) {
  if (!remote) return;
  remote.carryTarget = typeof value === 'string' && value.length <= 64 ? value : '';
}

export function updateCarryPose(position, heading) {
  if (!validPoint(position) || !finite(heading)) { pose.valid = false; return; }
  pose = {x:position.x,y:position.y,z:position.z,heading,valid:true};
}

function nearestRemote() {
  if (!pose.valid) return null;
  let chosen = null, distance = 1.9;
  for (const [id, entry] of remotes) {
    if (id === localId || !entry.root?.visible || globalThis.__parkHousing?.isPlayerResting?.(id)) continue;
    const p = entry.root.position, dx = p.x-pose.x, dz = p.z-pose.z;
    const d = Math.hypot(dx,dz);
    if (d >= distance || Math.abs(p.y-pose.y) > 1.7) continue;
    if (d > .35 && (dx*Math.sin(pose.heading)+dz*Math.cos(pose.heading))/d < .25) continue;
    distance = d; chosen = id;
  }
  return chosen;
}

export function toggleParkCarry() {
  if(globalThis.__parkHousing?.interact?.())return true;
  const stamp = now();
  if (stamp-lastToggle < 220 || !pose.valid) return false;
  if (targetId) { targetId=''; lastToggle=stamp; return true; }
  // Release an existing bot before looking for an online player nearby.
  for (const c of botControllers) if(c.hasPassenger()) {
    c.toggle(pose,pose.heading); lastToggle=stamp; return true;
  }
  const online = nearestRemote();
  if (online) { targetId=online; lastToggle=stamp; return true; }
  for (const controller of botControllers) {
    if (controller.toggle(pose,pose.heading)) { lastToggle=stamp; return true; }
  }
  return false;
}

export function registerRemoteCarryAvatar(id) {
  const key = String(id||'');
  const entry = {root:null,carryTarget:'',lift:null};
  if (key) remotes.set(key,entry);
  return {
    update(root,remote) {
      entry.root=root||null;
      entry.carryTarget=typeof remote?.carryTarget === 'string' ? remote.carryTarget : '';
      if (!root) return;
      let carrier = null, heading = 0;
      if (targetId===key && pose.valid) carrier=pose,heading=pose.heading;
      else for (const candidate of remotes.values()) if (candidate.carryTarget===key && candidate.root) {
        carrier=candidate.root.position; heading=candidate.root.rotation.y; break;
      }
      if (carrier) {
        const p=heldPoint(carrier,heading);
        if(!entry.lift) entry.lift={from:{...root.position},started:now()};
        const smooth=lifted(entry.lift.from,{x:p.x,y:p.y+.555,z:p.z},entry.lift.started);
        root.position.set(smooth.x,smooth.y,smooth.z);
        root.rotation.set(-.12,heading,0);
      } else entry.lift=null;
    },
    visual(root,dt) {
      if (!root) return;
      const p=root.position,heading=root.rotation.y;
      const target=remotes.get(entry.carryTarget)?.root;
      const point=target?{x:target.position.x,y:target.position.y-.555,z:target.position.z}:heldPoint(p,heading);
      poseCarryHands(root,entry.carryTarget?point:null,heading,dt);
    },
    dispose(){ if(remotes.get(key)===entry) remotes.delete(key); if(targetId===key)targetId=''; }
  };
}

export function applyLocalCarry(body, position) {
  if (!localId || !body || !validPoint(position)) return false;
  let carrier = null;
  for (const entry of remotes.values()) if (entry.carryTarget===localId && entry.root) {carrier=entry.root;break;}
  if (!carrier) {localLift=null;return false;}
  const p=heldPoint(carrier.position,carrier.rotation.y);
  if(!localLift || localLift.carrier!==carrier) localLift={carrier,from:{...position},started:now()};
  const smooth=lifted(localLift.from,{x:p.x,y:p.y+.555,z:p.z},localLift.started);
  try {
    body.setLinvel?.({x:0,y:0,z:0},true);
    body.setTranslation?.(smooth,true);
  } catch { return false; }
  position.x=smooth.x; position.y=smooth.y; position.z=smooth.z;
  return true;
}

export function isLocalCarryActive() {
 if (!localId) return false;
 for (const entry of remotes.values()) if (entry.carryTarget===localId&&entry.root) return true;
 return false;
}

export function createParkBotCarryController({actors}) {
  let carried=null, disposed=false;
  let pickup=null,point=null;
  const delays=new Map();
  const controller={
    toggle(player,heading){
      if(disposed||!validPoint(player)||!finite(heading))return false;
      if(carried){carried.entry.carryPhase='released';carried=null;return true;}
      let nearest=1.9,target=null;
      for(const actor of actors()){
        if(!actor?.root?.visible)continue;
        const p=actor.root.position,dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);
        if(d>=nearest||Math.abs(p.y-player.y)>1.7)continue;
        if(d>.35&&(dx*Math.sin(heading)+dz*Math.cos(heading))/d<.25)continue;
        nearest=d;target=actor;
      }
      if(!target)return false;
      carried=target;pickup={from:{...target.root.position},started:now()};point={...target.root.position};target.entry.carryPhase='held';return true;
    },
    sample(actor,sample){
      if(actor!==carried||!pose.valid)return sample;
      const p=lifted(pickup.from,heldPoint(pose,pose.heading),pickup.started);point=p;
      return {...sample,position:p,velocity:{x:0,y:0,z:0},speed:0,heading:pose.heading,hitTiltX:-.12,hitTiltZ:0};
    },
    routeTime(actor,clock,dt){
      if(actor===carried&&Number.isFinite(dt))delays.set(actor,(delays.get(actor)||0)+Math.max(0,Math.min(.05,dt)));
      return clock-(delays.get(actor)||0);
    },
    isCarried(actor){return actor===carried;},
    hasPassenger(){return !!carried;},
    passengerPoint(){return carried?point:null;},
    dispose(){disposed=true;if(carried)carried.entry.carryPhase='released';carried=null;delays.clear();botControllers.delete(controller);}
  };
  botControllers.add(controller);
  return controller;
}

if (typeof window !== 'undefined') window.addEventListener('keydown', event => {
  if (event.code!=='KeyE'||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  if (event.target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]'))return;
  if(toggleParkCarry()){event.preventDefault();event.stopImmediatePropagation();}
},{capture:true});
