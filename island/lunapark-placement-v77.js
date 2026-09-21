import * as T from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';
import {finishCityMaterial60} from './city-props-v60.js';
import {createRideAsset84} from './lunapark-rides-v84.js?v=carousel-time-1.1';
import {seasideScale89,prepareSeasideAsset89} from './seaside-scale-v89.js?v=91';
export const layout77=[
 ['ferris',173,-173.7,0],['carousel',192.7,-161.5,0],['carouselSmall',188.845,-135.693,0],
 ['coaster',181,-103.5,0],['kiosk',168,-143,Math.PI/2],['van',196.7,-119,Math.PI/2],
 ['lighthouse',241,-83,Math.PI/2],
 ['umbrellaYellow',210,-174,0],['umbrellaBlue',210,-156,0],['umbrellaRose',210,-137,0],['umbrellaYellow',210,-126.8,0],
 ['boatYellow',222,-165.4,0,true],['boatRose',229,-165,0,true],['boatBlue',234,-141.8,0,true],
 ['sailRose',248,-156,-.28,true],['sailCream',245,-128,.22,true]
].map(([asset,x,z,yaw,water=false])=>({asset,x,z,yaw,water,scale:seasideScale89[asset]}));
export async function loadLunapark77({scene,renderer,sample,sea,variant,terrainRoot,timberSample}){
 const loader=new GLTFLoader(),assets=new Map(),exposure={value:1},group=new T.Group();group.name='SEASIDE_LUNAPARK_V77';
 const blockers=[],solids=[],records=[],rides=[],walkMeshes=[],walkBounds=new T.Box3(),walkRay=new T.Raycaster();
 const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 const materials=new Map();
 const finish=source=>{if(!materials.has(source.uuid)){const m=finishCityMaterial60(source,exposure);m.side=source.side;if(m.transparent){m.depthWrite=false;m.forceSinglePass=true;}materials.set(source.uuid,m);}return materials.get(source.uuid);};
 const queue=[...new Set(layout77.map(p=>p.asset))];let nextAsset=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(nextAsset<queue.length){const asset=queue[nextAsset++],articulated=['ferris','carousel','carouselSmall'].includes(asset);
   const version=asset.startsWith('carousel')?'88':articulated?'87.1':'78';
   assets.set(asset,(await loader.loadAsync('/67park-foundation-next/island/lunapark-v1/'+asset+'.glb?v='+version)).scene);
  }
 }));
 for(const p of layout77){
  const articulated=['ferris','carousel','carouselSmall'].includes(p.asset);
  const assetVersion=p.asset.startsWith('carousel')?'88':articulated?'87.1':'78';
  if(!assets.has(p.asset))assets.set(p.asset,(await loader.loadAsync('/67park-foundation-next/island/lunapark-v1/'+p.asset+'.glb?v='+assetVersion)).scene);
  const source=prepareSeasideAsset89(assets.get(p.asset),p.asset);
  let hit=p.water?null:sample(p.x,p.z);
  // The walking sampler omits decorative timber; anchor umbrellas to its
  // visible top rather than the road underneath the promenade.
  if(p.asset.startsWith('umbrella')){
   const timberHit=timberSample?.(p.x,p.z);
   if(timberHit)hit=timberHit;
   else if(terrainRoot){const decks=[];terrainRoot.traverse(o=>{if(o.isMesh&&o.visible&&/ISKELE_AHSAP_PROMENAD/.test(o.name))decks.push(o);});const ray=new T.Raycaster(new T.Vector3(p.x,50,p.z),new T.Vector3(0,-1,0));hit=ray.intersectObjects(decks)[0]??hit;}
  }
  if(!p.water&&(!hit||/YAYA_GECIDI|BORDUR/.test(hit.object.name)||(/YOL/.test(hit.object.name)&&p.asset!=='lighthouse')))throw Error('Unsafe placement '+p.asset);
  const y=p.water?sea-.12*p.scale[1]:hit.point.y-.015;
  const transform=new T.Matrix4().compose(new T.Vector3(p.x,y,p.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw),new T.Vector3(1,1,1));
  if(articulated){
   const ride=createRideAsset84(source,{asset:p.asset,transform,material:finish});
   const entry=sample(ride.entry.x,ride.entry.z);
   if(!entry||/DENIZ|WATER|GOLET.*SU|^1_TABAN/.test(entry.object.name))throw Error('Unsafe boarding point '+p.asset);
   ride.entry.y=entry.point.y;
   group.add(ride.group);blockers.push(...ride.blockers);rides.push(ride);
   records.push({...p,y,support:hit.object.name,bounds:[ride.bounds.min.toArray(),ride.bounds.max.toArray()],ride:ride.stats,entry:ride.entry.toArray()});continue;
  }
  const bins=new Map();let skateRoute;
  source.traverse(o=>{if(o.userData.skateRoute)skateRoute=o.userData.skateRoute.map(pt=>new T.Vector3(...pt).applyMatrix4(o.matrixWorld).applyMatrix4(transform).toArray());if(!o.isMesh)return;const walk=p.asset==='coaster'&&/continuous.track.deck|grounded.skating.base/.test(o.name);const key=o.material.uuid+'_'+walk;let b=bins.get(key);if(!b){const m=finishCityMaterial60(o.material,exposure);m.side=o.material.side;if(m.transparent)m.depthWrite=false;b={material:m,geometries:[],walk};bins.set(key,b);}
   let geo=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(transform,o.matrixWorld));if(geo.index)geo=geo.toNonIndexed();for(const a of Object.keys(geo.attributes))if(!['position','normal'].includes(a))geo.deleteAttribute(a);b.geometries.push(geo);
  });
  const bounds=new T.Box3();
  for(const b of bins.values()){const geo=mergeGeometries(b.geometries);for(const g of b.geometries)g.dispose();geo.computeBoundingBox();bounds.union(geo.boundingBox);const m=new T.Mesh(geo,b.material);m.name='LUNA77_'+p.asset;m.castShadow=!b.material.transparent;m.receiveShadow=true;m.userData.safeShadowCaster=m.castShadow;group.add(m);blockers.push(m);if(b.walk){walkMeshes.push(m);walkBounds.union(geo.boundingBox);}}
  if(!p.water&&p.asset!=='coaster'){
   const b=bounds.clone();
   if(p.asset.startsWith('umbrella')){
    // A canopy is overhead shade, not an invisible three-metre wall.
    b.min.set(p.x-.10*p.scale[0],y,p.z-.10*p.scale[2]);b.max.set(p.x+.10*p.scale[0],y+2.95*p.scale[1],p.z+.10*p.scale[2]);
   }
   solids.push({b,height:b.max.y});
  }
  records.push({...p,y,support:hit?.object.name??'sea',bounds:[bounds.min.toArray(),bounds.max.toArray()],skateRoute});
 }
 function obstacle(x,z,ignoreRideContacts=false){let top=null;for(const {b,height}of solids)if(x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z)top=Math.max(top??-Infinity,height);
  for(const ride of rides){if(ignoreRideContacts&&ride.asset==='ferris')continue;const h=ride.ground(x,z);if(h!=null)top=Math.max(top??-Infinity,h);}
  if(!ignoreRideContacts&&x>=walkBounds.min.x&&x<=walkBounds.max.x&&z>=walkBounds.min.z&&z<=walkBounds.max.z){walkRay.set(new T.Vector3(x,80,z),new T.Vector3(0,-1,0));const hit=walkRay.intersectObjects(walkMeshes,false)[0];if(hit)top=Math.max(top??-Infinity,hit.point.y);}return top;}
 function update(dt=0,options={}){exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);for(const ride of rides)ride.advance(dt,{reduced:!!reduced?.matches,...options});}
 update();scene.add(group);group.updateMatrixWorld(true);
 let draws=0;group.traverse(o=>{if(o.isMesh)draws++;});
 renderer.domElement.dataset.lunapark77=JSON.stringify({count:records.length,draws,rideVersion:87.1,horseTailVersion:88,scaleVersion:89,rideCount:rides.length,walkableMeshes:walkMeshes.length,placements:records});
 return {group,cameraBlockers:blockers,obstacle,update,rides};
}
