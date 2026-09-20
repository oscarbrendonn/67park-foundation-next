import {assetFetch} from '/67park-foundation-next/app/entry-loading.js';
const islandFetch=(u,...a)=>assetFetch(typeof u==='string'&&u.startsWith('./')?'/67park-foundation-next/island/'+u.slice(2):u,...a);
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {mergeGeometries} from '/67park-foundation-next/island/utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';

const readJSON=async path=>{const r=await islandFetch(path);if(!r.ok)throw Error('City60 missing '+path);return r.json();};
const dry=hit=>hit&&!/GOLET.*SU|WATER|DENIZ|^1_TABAN/.test(hit.object?.name??'');

export function finishCityMaterial60(source,exposure){
 const glass=source.name==='room59_glass_sage';
 const m=source.clone();m.metalness=0;m.envMapIntensity=glass?.70:.45;m.side=THREE.FrontSide;
 // Keep authored warm room and lamp emission. The unchanged bridge palette
 // already has zero emission, so its established finish is preserved too.
 if(glass){m.transparent=true;m.depthWrite=false;m.forceSinglePass=true;}
 m.userData.cityGlass60=glass;
 if(source.name==='city_honey_softwood'||source.name==='city_sanded_timber'){m.emissive.set(0x000000);m.emissiveIntensity=0;}
 m.onBeforeCompile=shader=>{
  shader.uniforms.uCityExposure60=exposure;
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uCityExposure60;')
   .replace('#include <opaque_fragment>','outgoingLight *= uCityExposure60;\n#include <opaque_fragment>');
 };
 m.customProgramCacheKey=()=> 'reference-city60-'+source.name;
 return m;
}

// Additive city layer: no source map, road, curb, foliage, park or game-core edits.
// Bake each approved placement once; shared authored finishes become shared draws.
export async function loadCityProps60({scene,renderer,sample,variant}){
 const loader=new GLTFLoader();
 const [buildings,bridge,layout,bridgeMeta]=await Promise.all([
  loader.loadAsync('/67park-foundation-next/island/city-buildings-v60.glb?v=1'),Promise.resolve(null),
  readJSON('./city-layout-v60.json?v=1'),readJSON('./city-bridge-v58.json?v=1')
 ]);
 if(layout.version!==60||layout.buildings.length!==8||bridgeMeta.version!==58||bridgeMeta.rails?.length!==2)throw Error('City60 contract mismatch');
 const group=new THREE.Group();group.name='REFERENCE_CITY_V60';
 const buckets=new Map(),placements=[],exposure={value:1};
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1);
 function append(asset,placement,kind){
  if(!asset)throw Error('City60 missing node '+placement.node);
  asset.updateWorldMatrix(true,true);
  q.setFromAxisAngle(new THREE.Vector3(0,1,0),placement.yaw??0);
  scale.setScalar(placement.scale??1);
  matrix.compose(new THREE.Vector3(placement.x,placement.y,placement.z),q,scale);
  const bounds=new THREE.Box3(),parts=[];
  asset.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const source=mesh.material;
   if(Array.isArray(source)||Object.values(source).some(v=>v?.isTexture)||(source.vertexColors&&kind!=='bridge'))throw Error('Unexpected City60 material contract '+mesh.name);
   const geometry=mesh.geometry.clone();
   // UVs are deliberately absent from the untextured model palette; all other
   // unexpected attributes are rejected, not silently discarded.
   for(const name of Object.keys(geometry.attributes)){
    if(name==='uv'||name==='uv1')geometry.deleteAttribute(name);
    else if(!['position','normal'].includes(name)&&!(kind==='bridge'&&name==='color'))throw Error('Unexpected City60 vertex channel '+name);
   }
   geometry.applyMatrix4(mesh.matrixWorld).applyMatrix4(matrix);
   if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
   geometry.computeBoundingBox();bounds.union(geometry.boundingBox);
   const materialContract=source.toJSON();delete materialContract.uuid;delete materialContract.metadata;
   const key=JSON.stringify([kind,materialContract]);
   if(!buckets.has(key))buckets.set(key,{kind,name:source.name,material:finishCityMaterial60(source,exposure),geometry:[]});
   buckets.get(key).geometry.push(geometry);parts.push({name:mesh.name,triangles:geometry.index.count/3});
  });
  if(!parts.length)throw Error('City60 empty node '+placement.node);
  placements.push({...placement,kind,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},parts});
 }
 for(const p of layout.buildings){
  const h=sample(p.x,p.z);if(!dry(h)||Math.abs(h.point.y-p.groundY)>.02)throw Error('City60 building support changed '+p.id);
  append(buildings.scene.getObjectByName(p.node),{...p,y:p.groundY-p.embed},'building');
 }
 // v67: keep the original canal road; the optional timber deck is removed.
 const meshes=[];let triangles=0;
 for(const bucket of buckets.values()){
  const geometry=mergeGeometries(bucket.geometry,false);if(!geometry)throw Error('City60 batch merge failed '+bucket.name);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,bucket.material);mesh.name='C60_'+bucket.kind+'_'+bucket.name;
  mesh.castShadow=!bucket.material.userData.cityGlass60;mesh.receiveShadow=!bucket.material.userData.cityGlass60;mesh.userData.safeShadowCaster=mesh.castShadow;
  group.add(mesh);meshes.push(mesh);triangles+=geometry.index.count/3;
  for(const g of bucket.geometry)g.dispose();
 }
 group.updateMatrixWorld(true);
 const heightSampler=createCityHeightSampler58(meshes.filter(m=>!m.material.userData.cityGlass60));
 // Ground-only contact halos keep far-map foundations readable when the sun's
 // existing following shadow frustum is focused on the player elsewhere.
 const positions=[],colors=[],indices=[],N=20,fade=1.05;
 for(const p of layout.buildings){
  const offset=positions.length/3,w=p.width/2,d=p.depth/2,c=Math.cos(p.yaw),s=Math.sin(p.yaw),valid=[];
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const u=(i/N*2-1)*(w+fade),v=(j/N*2-1)*(d+fade),x=p.x+c*u+s*v,z=p.z-s*u+c*v,h=sample(x,z);
   const dist=Math.hypot(Math.max(0,Math.abs(u)-w+.15),Math.max(0,Math.abs(v)-d+.15));
   positions.push(x,(h?.point.y??p.groundY)+.013,z);valid.push(dry(h));
   colors.push(.25,.23,.25,.105*Math.max(0,1-dist/fade)**2);
  }
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;if([a,b,c,d].every(k=>valid[k]))indices.push(offset+a,offset+c,offset+b,offset+b,offset+c,offset+d);}
 }
 const contactGeometry=new THREE.BufferGeometry();contactGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));contactGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));contactGeometry.setIndex(indices);contactGeometry.computeBoundingSphere();
 const contacts=new THREE.Mesh(contactGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));
 contacts.name='C60_FOUNDATION_CONTACTS';contacts.renderOrder=2;group.add(contacts);
 scene.add(group);group.updateMatrixWorld(true);
 const railColliders=[].map(rail=>{
  if(rail.points.length<2||rail.points.some(p=>![p.x,p.z,p.topY].every(Number.isFinite)))throw Error('City60 invalid rail');
  const radius=rail.collisionRadius??.30,points=rail.points;
  const bounds=[Math.min(...points.map(p=>p.x))-radius,Math.min(...points.map(p=>p.z))-radius,Math.max(...points.map(p=>p.x))+radius,Math.max(...points.map(p=>p.z))+radius];
  const segments=points.slice(1).map((b,i)=>{const a=points[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;if(length<1e-12)throw Error('City60 zero rail segment');return {a,b,dx,dz,length};});
  return {bounds,segments,radiusSquared:radius*radius};
 });
 const ground=(x,z)=>heightSampler.height(x,z);
 const obstacle=(x,z)=>{
  let y=ground(x,z);
  for(const rail of railColliders){
   const b=rail.bounds;if(x<b[0]||z<b[1]||x>b[2]||z>b[3])continue;
   for(const {a,b,dx,dz,length} of rail.segments){
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length));
    if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<rail.radiusSquared){const top=a.topY+(b.topY-a.topY)*t;y=y===null?top:Math.max(y,top);}
   }
  }
  return y;
 };
 const stats={version:60,buildings:8,bridges:0,draws:meshes.length+1,triangles:triangles+indices.length/3,sampler:heightSampler.stats};
 function update(){exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);}
 update();Object.assign(renderer.domElement.dataset,{cityProps60:'ready',cityBuildings60:'8',cityBridge60:'0',cityDraws60:String(stats.draws)});
 return {group,ground,obstacle,cameraBlockers:meshes.filter(m=>!m.material.userData.cityGlass60),placements,layout,bridgeMeta,stats,heightSampler,update,spawn:layout.spawn};
}
