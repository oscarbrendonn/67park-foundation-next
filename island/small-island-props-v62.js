import {assetFetch} from '/67park-foundation-next/app/entry-loading.js';
const islandFetch=(u,...a)=>assetFetch(typeof u==='string'&&u.startsWith('./')?'/67park-foundation-next/island/'+u.slice(2):u,...a);
import {withIslandFoliage} from '../app/island-asset-cache.js';
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';

const HOUSE_FORBIDDEN_TEXTURE_KEYS=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap'];

function expose62(material,key,exposure){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uPropsExposure62=exposure;
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>','#include <common>\nuniform float uPropsExposure62;')
   .replace('#include <opaque_fragment>','outgoingLight *= uPropsExposure62;\n#include <opaque_fragment>');
 };
 material.customProgramCacheKey=()=>key;
}

export function finishHouseMaterial62(source,exposure={value:1}){
 const material=source.clone(),glass=source.name==='room59_glass_sage';
 for(const key of HOUSE_FORBIDDEN_TEXTURE_KEYS)if(material[key])throw Error('Unexpected V62 house texture: '+source.name+' '+key);
 material.name=source.name;material.side=THREE.FrontSide;material.metalness=0;
 if(glass){
  material.transparent=true;material.opacity=.18;material.depthWrite=false;material.depthTest=true;
  material.roughness=.18;material.envMapIntensity=.65;material.alphaTest=0;
  material.userData.houseGlass62=true;
 }else{
  material.transparent=false;material.opacity=1;material.depthWrite=true;
  material.envMapIntensity=/roof_stone|chimney_recess/.test(source.name)?.38:.55;
  material.userData.houseOpaque62=true;
 }
 expose62(material,'house-v62-'+source.name+'-'+(glass?'glass':'opaque'),exposure);
 return {material,glass};
}

// V62 enlarges only the already-approved house roofs for clean corner cover.
// Terrain, roads,
// dividers, placements and the approved v45 foliage remain independent inputs.
async function loadSmallIslandPropsUncached({scene,renderer,sample,variant},foliageShared){
 const forceDetail=typeof location==='object'?new URLSearchParams(location.search).get('props-detail'):null;
 const [houseGltf,foliageGltf,layout]=await Promise.all([
  new GLTFLoader().loadAsync('/67park-foundation-next/island/small-island-houses-v62.glb?v=roof1'),
  foliageShared,
  islandFetch('./small-island-placements-v47.json?v=placement2').then(r=>{if(!r.ok)throw Error('Could not load the small-island layout');return r.json();})
 ]);
 if(layout.version!==47||layout.variant!==variant||layout.houses.length!==8||layout.failed.length)
  throw Error('Small-island layout validation failed');
 const data=renderer.domElement.dataset;
 const group=new THREE.Group();group.name='SMALL_ISLAND_PROPS_V62';
 const houseAssets=new Map(),foliageAssets=new Map(),batches=new Map(),exposure={value:1};
 function finishFoliageMaterial(source,geometry,name){
  const material=source.clone();material.roughness=.26;material.metalness=0;material.envMapIntensity=.40;
  material.emissive.set(0x000000);material.emissiveIntensity=0;material.specularIntensity=1.0;
  material.side=THREE.FrontSide;
  const cavity=geometry.getAttribute('_cavity');if(!cavity)throw Error('Foliage cavity bake missing: '+name);
  material.onBeforeCompile=shader=>{
   shader.uniforms.uPropsExposure62=exposure;
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float _cavity; varying float vCavity43;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvCavity43=_cavity;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uPropsExposure62;\nvarying float vCavity43;')
    .replace('#include <color_fragment>',`#include <color_fragment>
     float leaf43=smoothstep(.005,.05,vColor.g-vColor.r);
    `)
    .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=mix(.72,.26,leaf43);
    `)
    .replace('#include <aomap_fragment>',`#include <aomap_fragment>
     float localAO43=clamp(vCavity43,.32,1.0); reflectedLight.indirectDiffuse*=localAO43; reflectedLight.indirectSpecular*=localAO43;
    `)
    .replace('#include <opaque_fragment>','outgoingLight *= uPropsExposure62;\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=> 'smooth-candy-foliage-v45-preserved';
  return material;
 }

 houseGltf.scene.updateMatrixWorld(true);
 houseGltf.scene.traverse(root=>{
  if(root.isMesh||!root.userData?.asset_id)return;
  const key=root.userData.asset_id;
  if(houseAssets.has(key))return;
  const asset={key,parts:[],bounds:new THREE.Box3(),triangles:0};
  root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   if(Array.isArray(mesh.material))throw Error('V62 house part must have one authored material: '+mesh.name);
   const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
   geometry.computeBoundingBox();geometry.computeBoundingSphere();asset.bounds.union(geometry.boundingBox);
   const finished=finishHouseMaterial62(mesh.material,exposure);
   const triangles=(geometry.index?.count??geometry.attributes.position.count)/3;
   asset.parts.push({name:mesh.name,geometry,material:finished.material,glass:finished.glass,triangles});
   asset.triangles+=triangles;
  });
  if(!asset.parts.length)throw Error('Missing V62 house parts: '+key);
  houseAssets.set(key,asset);
 });
 for(const key of ['cottage-pink','cottage-taupe','cottage-annex'])if(!houseAssets.has(key))throw Error('Missing V62 house model: '+key);

 foliageGltf.scene.updateMatrixWorld(true);
 foliageGltf.scene.traverse(mesh=>{
  if(!mesh.isMesh||!/^(tree|shrub)-(near|far)$/.test(mesh.name))return;
  const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  foliageAssets.set(mesh.name,{geometry,material:finishFoliageMaterial(mesh.material,geometry,mesh.name),
   triangles:(geometry.index?.count??geometry.attributes.position.count)/3});
 });
 for(const kind of ['tree','shrub'])for(const level of ['near','far'])if(!foliageAssets.has(kind+'-'+level))throw Error('Missing V45 foliage model');

 const transform=new THREE.Object3D();
 const rows=[...layout.houses,...layout.plants].map(p=>({...p}));
 for(const p of rows){
  const hit=sample(p.x,p.z);
  if(!hit||hit.point.y<8.9)throw Error('Model is not on dry ground: '+p.id);
  if(Math.abs(p.y-(hit.point.y-.02))>.30)throw Error('Terrain height has changed: '+p.id);
 }
 function matrix(p){transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.yaw,0);transform.scale.setScalar(p.scale);transform.updateMatrix();return transform.matrix;}
 function houseBatch(asset,part,list,partIndex){
  const batch=new THREE.InstancedMesh(part.geometry,part.material,list.length);
  const key=asset.key+'::'+partIndex;
  batch.name='V62_'+asset.key+'_'+part.material.name;batch.count=list.length;
  batch.castShadow=!part.glass;batch.receiveShadow=!part.glass;batch.frustumCulled=true;
  batch.userData.houseAsset62=asset.key;batch.userData.housePart62=part.name;
  batch.userData.safeShadowCaster=!part.glass;
  list.forEach((p,index)=>batch.setMatrixAt(index,matrix(p)));
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();
  group.add(batch);batches.set(key,batch);return batch;
 }
 for(const key of new Set(layout.houses.map(p=>p.asset))){
  const asset=houseAssets.get(key),list=rows.filter(p=>p.asset===key);
  asset.parts.forEach((part,index)=>houseBatch(asset,part,list,index));
 }
 function foliageBatch(key,capacity){
  const asset=foliageAssets.get(key),batch=new THREE.InstancedMesh(asset.geometry,asset.material,capacity);
  batch.name='V62_'+key;batch.castShadow=true;batch.receiveShadow=!key.endsWith('-far');batch.count=0;
  batch.frustumCulled=true;batch.userData.safeShadowCaster=true;group.add(batch);batches.set(key,batch);return batch;
 }
 for(const kind of ['tree','shrub'])for(const level of ['near','far'])foliageBatch(kind+'-'+level,layout.plants.filter(p=>p.asset===kind).length);

 // Preserve the one merged terrain-conforming contact pass and its intensity.
 const pos=[],col=[],indices=[];
 for(const p of rows){
  const plant=p.asset==='tree'||p.asset==='shrub';
  const bounds=plant?foliageAssets.get(p.asset+'-far').geometry.boundingBox:houseAssets.get(p.asset).bounds;
  const w=plant?(bounds.max.x-bounds.min.x)*p.scale:p.footprint.maxX-p.footprint.minX;
  const d=plant?(bounds.max.z-bounds.min.z)*p.scale:p.footprint.maxZ-p.footprint.minZ;
  const height=(bounds.max.y-bounds.min.y)*p.scale;
  const cx=p.x-(plant?height*.26:0),cz=p.z+(plant?height*.19:0);
  const rx=plant?w*.86:w*.63,rz=plant?Math.max(d*.94,w*.7):d*.63,N=12,offset=pos.length/3,valid=[];
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const u=i/N*2-1,v=j/N*2-1,x=cx+u*rx,z=cz+v*rz,hit=sample(x,z);
   valid.push(!!hit&&hit.point.y>8.85);pos.push(x,(hit?.point.y??0)+.016,z);
   const t=Math.max(0,1-u*u-v*v),alpha=(plant?.20:.13)*t*t;col.push(.26,.28,.24,alpha);
  }
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
   const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;
   if([a,b,c,d].every(index=>valid[index]))indices.push(offset+a,offset+c,offset+b,offset+b,offset+c,offset+d);
  }
 }
 const contactGeometry=new THREE.BufferGeometry();contactGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));contactGeometry.setAttribute('color',new THREE.Float32BufferAttribute(col,4));contactGeometry.setIndex(indices);
 const contact=new THREE.Mesh(contactGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));
 contact.name='V62_SOFT_TERRAIN_CONTACT';contact.renderOrder=2;group.add(contact);
 scene.add(group);group.updateMatrixWorld(true);

 // The surveyed v47 footprints are already placement-scale adjusted.  Using
 // them verbatim preserves the controller envelope despite the richer meshes.
 const colliders=layout.houses.map(p=>{
  const top=p.y+houseAssets.get(p.asset).bounds.max.y*p.scale,footprint=p.footprint;
  return {...p,c:Math.cos(p.yaw),s:Math.sin(p.yaw),minX:footprint.minX-.22,maxX:footprint.maxX+.22,
   minZ:footprint.minZ-.22,maxZ:footprint.maxZ+.22,top};
 });
 for(const p of layout.plants.filter(p=>p.asset==='tree'))colliders.push({...p,radius:.40*p.scale+.22,top:p.y+1.4*p.scale});
 function obstacle(x,z){
  let top=null;
  for(const p of colliders){
   const dx=x-p.x,dz=z-p.z;
   const inside=p.radius?dx*dx+dz*dz<p.radius*p.radius:
    (p.c*dx-p.s*dz>p.minX&&p.c*dx-p.s*dz<p.maxX&&p.s*dx+p.c*dz>p.minZ&&p.s*dx+p.c*dz<p.maxZ);
   if(inside)top=top===null?p.top:Math.max(top,p.top);
  }return top;
 }
 let clock=.3,visibleTriangles=0;
 function update(dt,camera){
  exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);
  clock+=dt;if(clock<.25)return;clock=0;
  for(const key of ['tree-near','tree-far','shrub-near','shrub-far'])batches.get(key).count=0;
  for(const p of rows.filter(p=>p.asset==='tree'||p.asset==='shrub')){
   const dist=Math.hypot(camera.position.x-p.x,camera.position.y-p.y,camera.position.z-p.z);
   const near=forceDetail==='near'||forceDetail!=='far'&&dist<58,key=p.asset+(near?'-near':'-far'),batch=batches.get(key),index=batch.count++;
   batch.setMatrixAt(index,matrix(p));
  }
  visibleTriangles=indices.length/3;let drawCalls=1,nearPlants=0;
  for(const [key,batch] of batches){
   if(/^(tree|shrub)-(near|far)$/.test(key)){batch.instanceMatrix.needsUpdate=true;if(batch.count)batch.computeBoundingSphere();}
   if(!batch.count)continue;drawCalls++;
   if(/^(tree|shrub)-(near|far)$/.test(key)){
    visibleTriangles+=batch.count*foliageAssets.get(key).triangles;if(key.endsWith('near'))nearPlants+=batch.count;
   }else{
    const [assetKey,index]=key.split('::');visibleTriangles+=batch.count*houseAssets.get(assetKey).parts[Number(index)].triangles;
   }
  }
  Object.assign(data,{smallIslandProps:'v62',smallIslandHouses:String(layout.houses.length),smallIslandTrees:String(layout.plants.filter(p=>p.asset==='tree').length),
   smallIslandShrubs:String(layout.plants.filter(p=>p.asset==='shrub').length),smallIslandPropTriangles:String(visibleTriangles),smallIslandPropDrawCalls:String(drawCalls),smallIslandNearPlants:String(nearPlants),
   smallIslandPlacements:JSON.stringify(rows.map(({id,x,y,z,asset})=>({id,x,y,z,asset}))),smallIslandPropsVariant:variant,
   smallIslandFoliageFinish:'smooth-candy-original-green-v45-preserved',smallIslandModelStyle:'v61-detached-house-with-corrected-roof-corner-cover-v62',
   smallIslandHouseGlass:'real-alpha-room59',smallIslandHouseDoors:'8-opaque-single-leaf',smallIslandGrainBytes:'0',
   smallIslandShrubFinish:'smooth-candy-original-green-v45',smallIslandShrubSpecular:'1.00',smallIslandShrubRoughness:'0.26',
   smallIslandBatches:JSON.stringify([...batches].map(([key,batch])=>({key,count:batch.count,culled:batch.frustumCulled,center:batch.boundingSphere?.center.toArray(),radius:batch.boundingSphere?.radius})))});
 }
 return {group,layout,colliders,obstacle,update,get triangles(){return visibleTriangles;}};
}

export function loadSmallIslandProps(options){
 return withIslandFoliage(options.assetSession,()=>new GLTFLoader().loadAsync('/67park-foundation-next/island/small-island-props-v45.glb?v=round1'),foliage=>loadSmallIslandPropsUncached(options,foliage));
}
