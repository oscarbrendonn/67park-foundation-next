import {createVehicleSurfaceDomain} from './vehicle-surface-domain.js?v=rail-corner-1';
// The same domain and complete car/bus footprint are used by prediction and
// server authority. No widening by bounding boxes at rounded sidewalk corners.
export function expandIslandDriveArea(area,{ground,water=()=>false,blocked=()=>false,domain}){
 const surface=domain?.height??((x,z)=>area.road?.height(x,z));
 const solid=domain?.blocked;
 const check=(x,z,yaw,spec)=>{
  if(![x,z,yaw].every(Number.isFinite))return {ok:false,reason:'invalid'};
  const center=surface(x,z);if(!Number.isFinite(center)||(solid?solid(x,z):water(x,z)))return {ok:false,reason:'surface-edge'};
  const s=Math.sin(yaw),c=Math.cos(yaw);let low=center,high=center;
  for(const [u,v] of spec?area.footprint(spec):area.points){
   const px=x+c*u+s*v,pz=z-s*u+c*v,y=surface(px,pz);
   if(!Number.isFinite(y)||(solid?solid(px,pz):water(px,pz)))return {ok:false,reason:'surface-edge'};
   low=Math.min(low,y);high=Math.max(high,y);
   // Normal curbs are traversable, but walls, roofs, cliffs and large steps
   // still fail the complete bumper/mirror footprint before moving there.
   // Finished-map clearance is identical online/offline and avoids invoking
   // the legacy raw-map ground query (which has obsolete roofs and walls).
   const actual=solid?y:ground(px,pz);
   if(high-low>.55||!Number.isFinite(actual)||actual>y+.55||(!solid&&blocked(px,center+.6,pz)))return {ok:false,reason:'obstacle'};
  }
  return {ok:true,y:center};
 };
 area.check=check;area.stats={...area.stats,roadOnly:false,driveSurfaces:'dry-open-terrain',maxStep:.55,domain:domain?.stats};return area;
}
export function installIslandDriving(world){
 if(!world.traffic||world.traffic.freeDrive)return world;
 const domain=createVehicleSurfaceDomain(world.terrain);
 expandIslandDriveArea(world.traffic.area,{domain,ground:(x,z)=>world.ground(x,z,true),water:world.water,blocked:world.treeBlocked});
 world.traffic.freeDrive=true;world.traffic.stats.roadOnly=false;
 world.renderer.domElement.dataset.islandDriveArea=JSON.stringify(world.traffic.area.stats);
 return world;
}
