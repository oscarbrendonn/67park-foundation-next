// Reuse the existing curb/stair/swept-wall rules. A blocked diagonal must not
// discard its free tangent. There are at most three sweeps, never a retry loop.
export function resolveCharacterContact(sweep, options) {
  const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
  if(!finite(options.to)||!finite(options.velocity)||(options.from&&!finite(options.from))) {
    const position=finite(options.from)?{...options.from}:finite(options.to)?{...options.to}:{x:0,y:.555,z:0};
    return {position,vertical:0,horizontal:{x:0,z:0},grounded:false,blocked:true,kind:'invalid-motion',samples:0};
  }
  const hit = sweep(options);
  const velocity = options.velocity;
  const horizontal = {x: velocity.x, z: velocity.z};
  if (!hit.blocked) return {...hit, horizontal};
  horizontal.x = horizontal.z = 0;
  if (!options.from || hit.kind === 'sweep-limit') return {...hit, horizontal};

  let best = hit, bestDistance = 0;
  let samples = hit.samples || 0;
  for (const axis of ['x', 'z']) {
    const distance = options.to[axis] - hit.position[axis];
    if (Math.abs(distance) < 1e-7) continue;
    const to = {...hit.position, y: options.to.y, [axis]: options.to[axis]};
    const candidate = sweep({...options, from: hit.position, to, wasGrounded: hit.grounded});
    samples += candidate.samples || 0;
    const moved = Math.abs(candidate.position[axis] - hit.position[axis]);
    if (moved > bestDistance + 1e-7) {best = candidate; bestDistance = moved;}
  }
  for (const axis of ['x', 'z']) {
    if (Math.abs(options.to[axis] - best.position[axis]) < 1e-6) horizontal[axis] = velocity[axis];
  }
  return {...best, blocked: true, horizontal, kind: bestDistance > 1e-7 ? 'slide' : hit.kind,
    stepUp: (hit.stepUp || 0) + (best === hit ? 0 : best.stepUp || 0),
    stepDown: (hit.stepDown || 0) + (best === hit ? 0 : best.stepDown || 0), samples};
}

// Walking, skating and vehicles share this normal curb allowance. It is below
// a building-wall height, while covering the raised road and park curbs.
const TRAVERSABLE_CURB_RISE = .55;

// Skate/swim retain the original slope and water rules, with bounded sampling.
// Sliding uses this same predicate; it cannot bypass an intervening wall.
export function sweepRideContact({from, to, velocity, ground, water=()=>false, blocked=()=>false}) {
  const start = from || to, length = Math.hypot(to.x-start.x, to.z-start.z);
  let samples = 0;
  const sample = (x,z) => {samples++; return ground(x,z);};
  if (length > 8 || !Number.isFinite(length)) return {position:{...start},vertical:velocity.y,blocked:true,kind:'sweep-limit',samples};
  const count = Math.max(1, Math.ceil(length/.12));
  let previous = sample(start.x,start.z), position = {...start};
  // Rapier applies gravity before this sweep. At low FPS, the proposed body
  // can be below a perfectly ordinary curb even though the previous frame was
  // standing on the road. Test supported steps from that floor, not the fallen
  // proposal; zn() still performs the actual floor snap after the contact sweep.
  // Never grant this support to a jump, swim, void, or drop off a tall ledge.
  let supported=previous!=null&&!water(start.x,start.z)&&velocity.y<=.2&&Math.abs(start.y-previous-.555)<=.095;
  for (let i=1; i<=count; i++) {
    const x=start.x+(to.x-start.x)*i/count,z=start.z+(to.z-start.z)*i/count;
    const height=sample(x,z),slope=height!=null&&previous!=null&&Math.abs(height-previous)<=length/count*1.5+.03;
    const rise=height!=null&&previous!=null?height-previous:null;
    const tallStep=supported&&rise!=null&&rise>TRAVERSABLE_CURB_RISE&&!slope;
    supported=supported&&rise!=null&&rise>=-.372&&!water(x,z);
    const contactY=supported&&!tallStep?Math.max(to.y,previous+.555):to.y;
    let collision = tallStep||blocked(x,contactY,z);
    for (const [dx,dz] of [[0,0],[.4,0],[-.4,0],[0,.4],[0,-.4]]) {
      if (collision) break;
      const h=sample(x+dx,z+dz);
      if (h!=null&&h>contactY+.05&&!water(x+dx,z+dz)&&!(slope&&Math.abs(h-height)<.7)) collision=true;
    }
    if (collision) return {position:{...position,y:to.y},vertical:velocity.y,blocked:true,kind:'blocked',samples};
    position={x,y:to.y,z}; previous=height;
  }
  return {position,vertical:velocity.y,blocked:false,kind:'ride',samples};
}
