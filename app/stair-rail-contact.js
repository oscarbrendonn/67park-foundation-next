// Character contact against the existing authored handrail centerlines.
// No new meshes/colliders; keep the same capsule dimensions as the stair asset.
function contact(s, p) {
  const vx=s.b[0]-s.a[0], vz=s.b[2]-s.a[2], length=vx*vx+vz*vz;
  const t=length?Math.max(0,Math.min(1,((p.x-s.a[0])*vx+(p.z-s.a[2])*vz)/length)):0;
  const h=s.a[1]+(s.b[1]-s.a[1])*t;
  const low=length?h:Math.min(s.a[1],s.b[1]), high=length?h:Math.max(s.a[1],s.b[1]);
  const dx=p.x-s.a[0]-vx*t, dz=p.z-s.a[2]-vz*t, distance=Math.hypot(dx,dz);
  return {dx,dz,distance,clearance:distance-.42-s.radius,
    active:high+s.radius>p.y-.555+.06&&low-s.radius<p.y+1.2};
}

export function createStairRailBlocker(segments, otherBlocked=()=>false) {
  const blocked=(x,y,z)=>otherBlocked(x,y,z)||segments.some(s=>{
    const c=contact(s,{x,y,z});return c.active&&c.clearance<0;
  });
  // A jump can land with the capsule already intersecting a rail. Permit only
  // motion monotonically OUT of that initial overlap, never through its axis,
  // toward a new segment, or into another solid (tree, house, etc.).
  blocked.canEscape=(from,to)=>{
    if(!from||otherBlocked(to.x,to.y,to.z))return false;
    for(const s of segments){
      const next=contact(s,to);if(!next.active||next.clearance>=0)continue;
      const old=contact(s,from);
      if(!old.active||old.clearance>=0||next.distance<=old.distance+1e-8||
        old.dx*(to.x-from.x)+old.dz*(to.z-from.z)<-1e-10)return false;
    }
    return true;
  };
  // Near a rounded end, the free tangent is diagonal, not necessarily X or Z.
  blocked.normal=p=>{
    let best=null;
    for(const s of segments){const c=contact(s,p);
      if(c.active&&c.distance>1e-7&&c.clearance<.18&&(!best||c.clearance<best.clearance))best=c;
    }
    return best?{x:best.dx/best.distance,z:best.dz/best.distance}:null;
  };
  return blocked;
}
