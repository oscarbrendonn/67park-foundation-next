import * as T from 'three';
import {installParkedFleet} from '../app/parked-fleet.js?v=parking-ground-1';
import {finishParkingGround} from '../app/parking-ground-finish.js?v=parking-ground-1';
import {GLTFLoader} from './GLTFLoader.js';
import {finishCityMaterial60} from './city-props-v60.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {createApprovedParkPlants99} from './approved-park-plants-v99.js';
import {finishSportsStands} from '../app/sports-stand-finish.js?v=stand-finish-1';

// Additive sports district. Source road, curb and field geometry is kept.
export async function loadNorthwestSports97({scene,renderer,sample,variant,terrainRoot}){
 const gltf=await new GLTFLoader().loadAsync('/67park-foundation-next/island/northwest-sports-v97.glb?v=97.5');
 let metadata;gltf.scene.traverse(o=>{if(o.userData.sports97)metadata=o.userData.sports97;});
 if(metadata?.version!==97||metadata.buildings?.length!==2||metadata.track?.lanes!==6)throw Error('Sports97 asset contract mismatch');
 const anchor=sample(-47,-160.5);
 if(anchor?.object.name!=='5_KB_SPOR_ZEMIN')throw Error('Sports97 anchor is no longer sports paving');
 const ground=anchor.point.y;
 for(const b of metadata.buildings)for(const dx of [-b.w/2-.5,0,b.w/2+.5])for(const dz of [-b.d/2-.5,0,b.d/2+.5]){
  const hit=sample(b.x+dx,b.z+dz);
  if(!hit||!/^(5_KB_SPOR_ZEMIN|8_KB_UST_PAD_CIZGILERI)$/.test(hit.object.name)||Math.abs(hit.point.y-ground)>.08)throw Error('Sports97 building footprint crossed its pad: '+b.id);
 }
 const group=gltf.scene;group.name='NORTHWEST_SPORTS_V97';group.position.set(metadata.origin[0],ground,metadata.origin[1]);
 const standFinish=finishSportsStands(group,metadata);
 finishParkingGround(group,metadata,terrainRoot);
 const concrete=terrainRoot.getObjectByName('67D_SKATEPARK_INNER_OUTER_SURFACE')?.material;
 if(!concrete?.color)throw Error('Sports97 skatepark colour reference is missing');
 const exposure={value:1},meshes=[],floors=[];let draws=0,triangles=0;
 group.traverse(m=>{
  if(!m.isMesh)return;const floor=m.userData.sportsFloor===true;
  m.material=finishCityMaterial60(m.material,exposure);m.material.customProgramCacheKey=()=> 'northwest-sports97-exposure';
  const tones={SPORTS97_shell:1,SPORTS97_edge:1.045,SPORTS97_cream:1.015,SPORTS97_roof:.83,SPORTS97_shadow:.62};
  if(tones[m.material.name]!=null){m.material.color.copy(concrete.color).multiplyScalar(tones[m.material.name]);m.material.roughness=.64;m.material.envMapIntensity=.34;}
  m.castShadow=!floor;m.receiveShadow=true;m.userData.safeShadowCaster=!floor;
  meshes.push(m);if(floor)floors.push(m);draws++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;
 });
 if(draws>28||triangles>180000||floors.length<3)throw Error('Sports97 render budget or floor contract mismatch');
 group.updateMatrixWorld(true);
 // Overhead canopies block the camera, not a character walking underneath.
 const heightSampler=createCityHeightSampler58(meshes.filter(m=>!m.userData.sportsOverhead),{cellSize:3}),floorSampler=createCityHeightSampler58(floors,{cellSize:3});
 const placements=[];
 for(const [i,[x,z]]of metadata.plantClusters.entries()){
  placements.push({asset:'tree',x,z,scale:[1.5,1.65,1.4,1.45][i],yaw:i*1.618,base:ground+.27});
  placements.push({asset:'shrub',x:x+(i%2?-2.3:2.4),z:z+1.7,scale:1.0,yaw:i*.8,base:ground+.27});
  placements.push({asset:'shrub',x:x+1.0,z:z-2.0,scale:.85,yaw:i+1,base:ground+.27});
 }
 const plants=createApprovedParkPlants99({scene,placements,sample,name:'SPORTS97_APPROVED_PARK_PLANTS'});
 const hiddenTerrain=['8_KB_ATLETIZM_ZEMIN','8_KB_ATLETIZM_CIZGILERI','8_KB_BEYZBOL_KIL_ZEMIN','8_KB_BEYZBOL_CIZGILERI'];
 // Only retire the old track overlay after the replacement has fully loaded.
 for(const name of hiddenTerrain){const old=terrainRoot.getObjectByName(name);if(old)old.visible=false;}
 // Use the very same exposure as the existing skatepark, without whitening it.
 function update(dt,camera){exposure.value=1;plants.update(dt,camera);}
 update();scene.add(group);group.updateMatrixWorld(true);
 const fleet=installParkedFleet(group);
 group.userData.fleetStats=fleet.stats;
 const stats={version:97,revision:metadata.revision,buildings:2,grandstands:2,lanes:6,parkedCars:metadata.parking.cars,parkingSpaces:metadata.parking.spaces,baseball:'grass, ochre fan, green square, four bases, pitcher mound, lines',concreteReference:concrete.color.getHexString(),trees:metadata.trees,benches:metadata.benches,draws,triangles,
  origin:[metadata.origin[0],ground,metadata.origin[1]],hiddenTerrain,roadsModified:false,curbsModified:false,standFinish:standFinish.stats};
 renderer.domElement.dataset.northwestSports97=JSON.stringify(stats);
 stats.platforms=metadata.platforms;stats.foliage=plants.stats;
 return {group,stats,metadata,plants,update,obstacle:(x,z)=>{const a=heightSampler.height(x,z),b=plants.obstacle(x,z);return a===null?b:b===null?a:Math.max(a,b);},ground:floorSampler.height,cameraBlockers:meshes,heightSampler,floorSampler};
}
