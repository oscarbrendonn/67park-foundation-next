import * as T from 'three';
import {GLTFLoader} from '../GLTFLoader.js';
import {finishHouseMaterial62} from '../small-island-props-v62.js';
import {createCityHeightSampler58} from '../city-height-sampler58.js';

// Preview-only additive layer. Never removes or edits terrain or old props.
export async function loadNorthwest92({scene,renderer,sample,variant}){
 const group=new T.Group();group.name='NORTHWEST_MODEL_PREVIEW_V92';
 const exposure={value:1},materials=new Map(),opaque=[],placements=[],loader=new GLTFLoader();
 const ground=(x,z)=>{const h=sample(x,z);if(!h||!/CIMEN/.test(h.object.name))throw Error('NW92 model çim dışında: '+x+','+z+' '+h?.object.name);return h.point.y;};
 function finish(model){model.traverse(m=>{if(!m.isMesh)return;if(!materials.has(m.material))materials.set(m.material,finishHouseMaterial62(m.material,exposure));const f=materials.get(m.material);m.material=f.material;m.castShadow=!f.glass;m.receiveShadow=!f.glass;m.userData.safeShadowCaster=!f.glass;if(!f.glass)opaque.push(m);});}
 const road=(await loader.loadAsync('/67park-foundation-next/island/northwest-v92/track.glb?v=92.2')).scene;
 road.name='NW92 unbroken curved track';road.position.set(-132,0,-208);
 road.traverse(m=>{if(!m.isMesh)return;m.geometry=m.geometry.clone();const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+ground(p.getX(i)-132,p.getZ(i)-208));p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});finish(road);group.add(road);
 for(const p of [{asset:'blush',x:-141,z:-128},{asset:'ivory',x:-141,z:-113},{asset:'annex',x:-141,z:-99}]){
  const root=(await loader.loadAsync('/67park-foundation-next/island/northwest-v92/'+p.asset+'.glb?v=92.3')).scene;root.name='NW92 detached '+p.asset;root.position.set(p.x,ground(p.x,p.z)-.012,p.z);root.rotation.y=Math.PI/2;finish(root);group.add(root);root.updateWorldMatrix(true,true);
  const b=new T.Box3().setFromObject(root);for(let x=b.min.x;x<=b.max.x;x+=.5)for(let z=b.min.z;z<=b.max.z;z+=.5)ground(x,z);
  placements.push({...p,y:root.position.y,yaw:root.rotation.y,bounds:[b.min.toArray(),b.max.toArray()]});
 }
 const tree=(await loader.loadAsync('/67park-foundation-next/island/northwest-v92/tree.glb?v=92')).scene;
 for(const [x,z,scale]of [[-138,-236,.85],[-123,-237,.75],[-147,-171,.9]]){
  // Trees are optional; their complete canopy footprint must stay on grass.
  let dry=true;for(const sx of [-1,1])for(const sz of [-1,1]){const h=sample(x+sx*2*scale,z+sz*1.6*scale);if(!h||!/CIMEN/.test(h.object.name))dry=false;}if(!dry)continue;
  const root=tree.clone(true);root.position.set(x,ground(x,z),z);root.scale.setScalar(scale);finish(root);group.add(root);
 }
 group.updateMatrixWorld(true);const collision=createCityHeightSampler58(opaque),stats={version:92,previewOnly:true,variant,houseCount:3,trackClosed:true,clearTrackWidth:5.2,placements,draws:0,triangles:0};
 group.traverse(m=>{if(m.isMesh){stats.draws++;stats.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});
 scene.add(group);renderer.domElement.dataset.northwest92=JSON.stringify(stats);
 const update=()=>{exposure.value=(variant==='kimi'?.88:1.27)/renderer.toneMappingExposure;};update();
 return {group,stats,update,obstacle:collision.height,ground:collision.height,cameraBlockers:opaque};
}

