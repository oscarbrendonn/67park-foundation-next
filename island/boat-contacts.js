import * as T from 'three';
import {createRideSolidSampler} from './ride-solid-sampler.js?v=ride-contacts-1';

const HEAD=1.45,SKIN=.012;
const BOATS=new Set(['boatYellow','boatRose','boatBlue','sailRose','sailCream']);
// All five authored hull rims are below local Y .80. Masts, booms and sails
// are obstacles, never a floor extending up to the top of the sail. The actual
// GLB contract is verified in QA; this cutoff does not invent a hull shape.
const HULL_CEILING=.80;
const within=(b,x,z)=>x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z;
const higher=(a,b)=>a==null?b:b==null?a:Math.max(a,b);

export function createBoatContacts(group,placements){
 group.updateWorldMatrix(true,true);
 const rows=placements.filter(p=>p.water&&BOATS.has(p.asset)).map(p=>{
  const meshes=group.children.filter(o=>o.isMesh&&o.name==='LUNA77_'+p.asset);
  if(!meshes.length)throw Error('Boat contact meshes missing: '+p.asset);
  const bounds=new T.Box3();for(const mesh of meshes)bounds.expandByObject(mesh);
  const sampler=createRideSolidSampler(meshes,{cellSize:.75});
  if(sampler.stats.skippedOversized)throw Error('Boat contact index exceeded budget');
  return {asset:p.asset,bounds,sampler,ceiling:p.y+p.scale[1]*HULL_CEILING};
 });
 if(rows.length!==BOATS.size)throw Error('Boat contact placement contract changed');
 let disposed=false;
 const cache=new Map(),stats={revision:'boat-contacts-1',boats:rows.length,triangles:rows.reduce((n,r)=>n+r.sampler.stats.triangles,0),estimatedNumericBytes:rows.reduce((n,r)=>n+r.sampler.stats.bytes,0),queries:0,addedDrawCalls:0,newAssetDownloads:0};
 function contains(x,z){return !disposed&&Number.isFinite(x+z)&&rows.some(r=>within(r.bounds,x,z));}
 function sample(x,z){
  if(!contains(x,z))return {floor:null,intervals:[]};
  const key=x+','+z;if(cache.has(key))return cache.get(key);
  stats.queries++;let floor=null;const intervals=[];
  for(const row of rows){
   if(!within(row.bounds,x,z))continue;
   const hit=row.sampler.sample(x,z);
   for(const y of hit.surfaces)if(y<=row.ceiling+1e-5)floor=higher(floor,y);
   intervals.push(...hit.intervals);
  }
  const hit={floor,intervals};if(cache.size>=128)cache.clear();cache.set(key,hit);return hit;
 }
 function obstacle(x,z,feet,step=.36){
  const hit=sample(x,z);let top=hit.floor;
  if(Number.isFinite(feet))for(const [min,max]of hit.intervals){
   if(max>feet+Math.max(step,SKIN)&&min<feet+HEAD-SKIN)top=higher(top,max);
  }
  return top;
 }
 return {contains,sample,floor:(x,z)=>sample(x,z).floor,obstacle,stats,
  dispose(){disposed=true;for(const r of rows)r.sampler.dispose();cache.clear();stats.disposed=true;}};
}

// Static moored boats only. Driving requires shared server ownership; do not
// silently enable the old single-player prototype in the online park.
export function installBoatContacts(world){
 if(world.boatContacts)return world;
 const placements=JSON.parse(world.renderer.domElement.dataset.lunapark77).placements;
 const boats=createBoatContacts(world.lunapark.group,placements);
 const ground=world.ground,water=world.water,characterGround=world.characterGround,characterObstacle=world.characterObstacle;
 world.ground=(x,z,...args)=>higher(ground(x,z,...args),boats.floor(x,z));
 world.water=(x,z)=>{
  const floor=boats.floor(x,z);
  return floor!=null&&floor>world.sea(x,z)+.006?false:water(x,z);
 };
 world.characterGround=(x,z,feet,step=.36)=>higher(characterGround?characterGround(x,z,feet,step):ground(x,z),boats.floor(x,z));
 world.characterObstacle=(x,z,feet,step=.36)=>higher(characterObstacle?characterObstacle(x,z,feet,step):ground(x,z),boats.obstacle(x,z,feet,step));
 world.boatContacts=boats;world.renderer.domElement.dataset.boatContacts=JSON.stringify(boats.stats);
 const dispose=world.dispose;world.dispose=function(...args){boats.dispose();return dispose?.apply(this,args);};
 return world;
}
