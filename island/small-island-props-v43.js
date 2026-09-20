import {assetFetch} from '/67park-foundation-next/app/entry-loading.js';
const islandFetch=(u,...a)=>assetFetch(typeof u==='string'&&u.startsWith('./')?'/67park-foundation-next/island/'+u.slice(2):u,...a);
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';

// Additive asset layer: no edits to the island GLB, paint, coast, road or player.
export async function loadSmallIslandProps({scene,renderer,sample,variant}){
 const forceDetail=typeof location==='object'?new URLSearchParams(location.search).get('props-detail'):null;
 const [gltf,layout]=await Promise.all([
  new GLTFLoader().loadAsync('/67park-foundation-next/island/small-island-props-v43.glb?v=satin3'),
  islandFetch('./small-island-placements-v38.json').then(r=>{if(!r.ok)throw Error('Küçük ada yerleşimi yüklenemedi');return r.json();})
 ]);
 if(layout.version!==38||layout.variant!==variant||layout.houses.length!==8||layout.failed.length)
  throw Error('Küçük ada yerleşim doğrulaması başarısız');
 const data=renderer.domElement.dataset;
 const group=new THREE.Group();group.name='SMALL_ISLAND_PROPS_V43';
 const assets=new Map(),batches=new Map(),exposure={value:1};
 // Smooth satin replaces the old coarse pigment/bump tile. The existing
 // environment and shadow map are reused; no new texture or render pass.
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(m=>{
  if(!m.isMesh)return;
  const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);g.computeBoundingBox();g.computeBoundingSphere();
  const foliage=/^(tree|shrub)/.test(m.name);
  const material=m.material.clone();material.roughness=foliage?.40:.72;material.metalness=0;
  material.envMapIntensity=foliage?.38:.55;
  material.emissive.set(0x000000);material.emissiveIntensity=0;
  if(foliage)material.specularIntensity=.84;material.side=THREE.FrontSide;
  const cavity=g.getAttribute('_cavity');
  if(foliage&&!cavity)throw Error('Foliage cavity bake missing: '+m.name);
  material.onBeforeCompile=s=>{
   s.uniforms.uPropsExposure38=exposure;
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\n'+(foliage?'attribute float _cavity; varying float vCavity43;':''))
    .replace('#include <begin_vertex>','#include <begin_vertex>\n'+(foliage?'vCavity43=_cavity;':''));
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uPropsExposure38;\n'+(foliage?'varying float vCavity43;':''))
     .replace('#include <color_fragment>',`#include <color_fragment>
      float leaf43=${foliage?'smoothstep(.005,.05,vColor.g-vColor.r)':'0.0'};
      float glass43=${foliage?'0.0':'smoothstep(.03,.09,vColor.b-vColor.r)'};
     `)
     .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(mix(.72,.40,leaf43),.42,glass43);
     `)
     .replace('#include <aomap_fragment>',`#include <aomap_fragment>
      ${foliage?'float localAO43=clamp(vCavity43,.32,1.0); reflectedLight.indirectDiffuse*=localAO43; reflectedLight.indirectSpecular*=localAO43;':''}
     `)
     .replace('#include <opaque_fragment>','outgoingLight *= uPropsExposure38;\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=> 'smooth-satin-props-43-'+(foliage?'foliage':'plaster');
  assets.set(m.name,{geometry:g,material,triangles:(g.index?.count??g.attributes.position.count)/3});
 });
 const transform=new THREE.Object3D();
 const rows=[...layout.houses,...layout.plants].map(p=>({...p}));
 for(const p of rows){
  const hit=sample(p.x,p.z);
  if(!hit||hit.point.y<8.9)throw Error('Model kuru zemine oturmuyor: '+p.id);
  // Stored survey follows the current terrain, not a guessed universal plane.
  if(Math.abs(p.y-(hit.point.y-.02))>.30)throw Error('Arazi yüksekliği değişti: '+p.id);
 }
 function matrix(p){transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.yaw,0);transform.scale.setScalar(p.scale);transform.updateMatrix();return transform.matrix;}
 function batch(key,capacity){
  const a=assets.get(key);if(!a)throw Error('Blender modeli bulunamadı: '+key);
  const m=new THREE.InstancedMesh(a.geometry,a.material,capacity);
  m.name='V43_'+key;m.castShadow=true;m.receiveShadow=!key.endsWith('-far');m.count=0;
  // Aggregate instance bounds are refreshed after every LOD redistribution.
  // Keep normal camera/shadow culling; the source meshes stay shared.
  m.frustumCulled=true;
  // At bird's-eye scale a leaf lobe is smaller than one shadow-map texel.
  // Retain its smooth PBR/baked cavity shading and its shadow on the ground,
  // but omit unstable self-shadow sampling on this distant foliage LOD.
  m.userData.safeShadowCaster=true;group.add(m);batches.set(key,m);return m;
 }
 for(const key of new Set(layout.houses.map(p=>p.asset))){
  const list=rows.filter(p=>p.asset===key),b=batch(key,list.length);
  list.forEach((p,i)=>b.setMatrixAt(i,matrix(p)));b.count=list.length;
  b.instanceMatrix.needsUpdate=true;b.computeBoundingBox();b.computeBoundingSphere();
 }
 for(const kind of ['tree','shrub'])for(const level of ['near','far'])batch(kind+'-'+level,layout.plants.filter(p=>p.asset===kind).length);

 // One merged, terrain-conforming soft contact pass. No per-tree lights or
 // render targets, and no opaque shadow discs floating over water.
 const pos=[],col=[],indices=[];
 for(const p of rows){
  const a=assets.get(p.asset==='tree'?'tree-far':p.asset==='shrub'?'shrub-far':p.asset);
  const b=a.geometry.boundingBox,w=(b.max.x-b.min.x)*p.scale,d=(b.max.z-b.min.z)*p.scale;
  const plant=p.asset==='tree'||p.asset==='shrub',height=(b.max.y-b.min.y)*p.scale;
  const cx=p.x-(plant?height*.26:0),cz=p.z+(plant?height*.19:0);
  const rx=plant?w*.86:w*.63,rz=plant?Math.max(d*.94,w*.7):d*.63,N=12,offset=pos.length/3,valid=[];
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const u=i/N*2-1,v=j/N*2-1,x=cx+u*rx,z=cz+v*rz,h=sample(x,z);
   valid.push(!!h&&h.point.y>8.85);
   pos.push(x,(h?.point.y??0)+.016,z);
   const t=Math.max(0,1-u*u-v*v),alpha=(plant?.20:.13)*t*t;
   col.push(.26,.28,.24,alpha);
  }
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
   const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;
   if([a,b,c,d].every(k=>valid[k]))indices.push(offset+a,offset+c,offset+b,offset+b,offset+c,offset+d);
  }
 }
 const contactGeometry=new THREE.BufferGeometry();contactGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));contactGeometry.setAttribute('color',new THREE.Float32BufferAttribute(col,4));contactGeometry.setIndex(indices);
 const contact=new THREE.Mesh(contactGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));
 contact.name='V43_SOFT_TERRAIN_CONTACT';contact.renderOrder=2;group.add(contact);
 scene.add(group);group.updateMatrixWorld(true);

 const colliders=layout.houses.map(p=>{
  const a=assets.get(p.asset),b=a.geometry.boundingBox;
  // Body + eave bounds are deliberately conservative for a child-friendly
  // camera. The original controller's step/slide logic consumes these heights.
  return {...p,c:Math.cos(p.yaw),s:Math.sin(p.yaw),minX:b.min.x*p.scale-.22,maxX:b.max.x*p.scale+.22,
    minZ:b.min.z*p.scale-.22,maxZ:b.max.z*p.scale+.22,top:p.y+b.max.y*p.scale};
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
  // Kimi retains ACES and its warmer, stronger sun. Balance only the new
  // asset layer; do not repaint its approved terrain or change its renderer.
  exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);
  clock+=dt;if(clock<.25)return;clock=0;
  for(const key of ['tree-near','tree-far','shrub-near','shrub-far'])batches.get(key).count=0;
  for(const p of rows.filter(p=>p.asset==='tree'||p.asset==='shrub')){
   const dist=Math.hypot(camera.position.x-p.x,camera.position.y-p.y,camera.position.z-p.z);
   const near=forceDetail==='near'||forceDetail!=='far'&&dist<58;
   const key=p.asset+(near?'-near':'-far'),b=batches.get(key),i=b.count++;
   b.setMatrixAt(i,matrix(p));
  }
  visibleTriangles=indices.length/3;
  let drawCalls=1,nearPlants=0;
  for(const [key,b] of batches){
   if(key.includes('near')||key.includes('far')){b.instanceMatrix.needsUpdate=true;if(b.count)b.computeBoundingSphere();}
   if(b.count){drawCalls++;visibleTriangles+=b.count*assets.get(key).triangles;if(key.endsWith('near'))nearPlants+=b.count;}
  }
  Object.assign(data,{smallIslandProps:'v43',smallIslandHouses:String(layout.houses.length),smallIslandTrees:String(layout.plants.filter(p=>p.asset==='tree').length),
   smallIslandShrubs:String(layout.plants.filter(p=>p.asset==='shrub').length),smallIslandPropTriangles:String(visibleTriangles),smallIslandPropDrawCalls:String(drawCalls),smallIslandNearPlants:String(nearPlants),
   smallIslandPlacements:JSON.stringify(rows.map(({id,x,y,z,asset})=>({id,x,y,z,asset}))),smallIslandPropsVariant:variant,smallIslandFoliageFinish:'smooth-satin-original-green-v43',smallIslandModelStyle:'rounded-plaster-long-pitched-roof-v41',smallIslandGrainBytes:'0',smallIslandShrubFinish:'smooth-satin-original-green-v43',smallIslandShrubSpecular:'0.84',smallIslandShrubRoughness:'0.40',
   smallIslandBatches:JSON.stringify([...batches].map(([key,b])=>({key,count:b.count,culled:b.frustumCulled,center:b.boundingSphere?.center.toArray(),radius:b.boundingSphere?.radius})))});
 }
 return {group,layout,colliders,obstacle,update,get triangles(){return visibleTriangles;}};
}
