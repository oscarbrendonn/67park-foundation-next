import {createApprovedParkPlants99} from '../approved-park-plants-v99.js';
import * as T from 'three';
import {GLTFLoader} from '../GLTFLoader.js';
import {finishHouseMaterial62} from '../small-island-props-v62.js';
import {createCityHeightSampler58} from '../city-height-sampler58.js';

// Preview-only additive layer. Never removes or edits terrain or old props.
export async function loadNorthwest93({scene,renderer,sample,variant}){
 const group=new T.Group();group.name='NORTHWEST_MODEL_PREVIEW_V93';
 const exposure={value:1},materials=new Map(),opaque=[],placements=[],loader=new GLTFLoader();
 const ground=(x,z)=>{const h=sample(x,z);if(!h||!/CIMEN/.test(h.object.name))throw Error('NW93 model is outside the grass: '+x+','+z+' '+h?.object.name);return h.point.y;};
 function finish(model){model.traverse(m=>{if(!m.isMesh)return;if(!materials.has(m.material))materials.set(m.material,finishHouseMaterial62(m.material,exposure));const f=materials.get(m.material);m.material=f.material;m.castShadow=!f.glass;m.receiveShadow=!f.glass;m.userData.safeShadowCaster=!f.glass;if(!f.glass)opaque.push(m);});}
 const road=(await loader.loadAsync('/67park-foundation-next/island/northwest-v93/track.glb?v=93.2')).scene;
 road.name='NW93 unbroken curved track';road.position.set(-132,0,-208);
 const grades=new Map();
 road.traverse(m=>{if(!m.isMesh)return;m.geometry=m.geometry.clone();const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i)-132,z=p.getZ(i)-208,key=x.toFixed(5)+','+z.toFixed(5);let grade=grades.get(key);
   if(!grade){const h=ground(x,z),e=.04,y=(a,b)=>sample(a,b)?.point.y??h;grade={h,dx:(y(x+e,z)-y(x-e,z))/(2*e),dz:(y(x,z+e)-y(x,z-e))/(2*e)};grades.set(key,grade);}
   p.setY(i,p.getY(i)+grade.h);
   // Preserve the authored smooth curb normals under the height deformation.
   // Recomputing normals on exported non-indexed triangles makes dotted seams.
   if(n){const ny=n.getY(i),nx=n.getX(i)-grade.dx*ny,nz=n.getZ(i)-grade.dz*ny,len=Math.hypot(nx,ny,nz);n.setXYZ(i,nx/len,ny/len,nz/len);}
  }
  p.needsUpdate=true;if(n)n.needsUpdate=true;m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();
 });finish(road);group.add(road);
 for(const p of [{asset:'blush',x:-141,z:-128},{asset:'ivory',x:-141,z:-113},{asset:'annex',x:-141,z:-99}]){
  const root=(await loader.loadAsync('/67park-foundation-next/island/northwest-v93/'+p.asset+'.glb?v=93.3')).scene;root.name='NW93 detached '+p.asset;root.position.set(p.x,ground(p.x,p.z)-.012,p.z);root.rotation.y=Math.PI/2;finish(root);group.add(root);root.updateWorldMatrix(true,true);
  const b=new T.Box3().setFromObject(root);for(let x=b.min.x;x<=b.max.x;x+=.5)for(let z=b.min.z;z<=b.max.z;z+=.5)ground(x,z);
  placements.push({...p,y:root.position.y,yaw:root.rotation.y,bounds:[b.min.toArray(),b.max.toArray()]});
 }
 const plants=createApprovedParkPlants99({scene,sample,name:'NW93_APPROVED_PARK_PLANTS',placements:[[-126,-237,.92],[-119,-238,.9],[-111,-237,.85],[-150,-162,1],[-144,-162,.9],[-138,-161,.8]].map(([x,z,scale])=>({asset:'tree',x,z,scale}))});
 group.updateMatrixWorld(true);const collision=createCityHeightSampler58(opaque),stats={version:93,previewOnly:false,variant,houseCount:3,trackClosed:true,clearTrackWidth:5.12,curbHeight:.48,houseSource:'approved-v62',placements,draws:0,triangles:0};
 group.traverse(m=>{if(m.isMesh){stats.draws++;stats.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});
 scene.add(group);renderer.domElement.dataset.northwest93=JSON.stringify(stats);
 const update=(dt,camera)=>{plants.update(dt,camera);exposure.value=(variant==='kimi'?.88:1.27)/renderer.toneMappingExposure;};update(.25);
 return {group,stats,update,obstacle:(x,z)=>{const h=collision.height(x,z),p=plants.obstacle(x,z);return h==null?p:p==null?h:Math.max(h,p);},ground:collision.height,cameraBlockers:opaque};
}

