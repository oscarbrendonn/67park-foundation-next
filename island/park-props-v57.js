import {assetFetch} from '/67park-foundation-next/app/entry-loading.js';
const islandFetch=(u,...a)=>assetFetch(typeof u==='string'&&u.startsWith('./')?'/67park-foundation-next/island/'+u.slice(2):u,...a);
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {createPlinthSampler57} from './park-plinth-sampler57.js';
import {createBridgeLandings57} from './park-bridge-landings57.js';

const FURNITURE={'picnic-table':'picnic-table-v57',bench:'back-bench-v57','trash-bin':'slatted-bin-v57','globe-lamp':'globe-lamp-v57','balance-beam-tan':'balance-beam-tan-v57','balance-beam-coral':'balance-beam-coral-v57','stepping-cylinder':'stepping-cylinder-v57','bridge-upper':'arched-bridge-upper-v57','bridge-lower':'arched-bridge-lower-v57'};
const isPlant=p=>p.asset==='tree'||p.asset==='shrub';
const isWater=h=>!h||/GOLET.*SU|WATER|DENIZ|^1_TABAN/.test(h.object?.name??'');

// A scoped, instanced park layer. Source maps, approved foliage buffers and
// all small-island placements remain untouched. No new lights/render targets.
export async function loadParkProps57({scene,renderer,sample,variant}){
 const loader=new GLTFLoader();
 const [furniture,toys,foliage,layout,landingProfiles]=await Promise.all([
  loader.loadAsync('/67park-foundation-next/island/park-furniture-v57.glb?v=1'),loader.loadAsync('/67park-foundation-next/island/park-toys-v57.glb?v=1'),
  loader.loadAsync('/67park-foundation-next/island/small-island-props-v45.glb?v=round1'),
  islandFetch('./park-layout-v57.json?v=1').then(r=>{if(!r.ok)throw Error('Park layout unavailable');return r.json();}),
  islandFetch('./park-bridge-landings57.json?v=1').then(r=>{if(!r.ok)throw Error('Park bridge landings unavailable');return r.json();})
 ]);
 if(layout.version!==57||layout.props.length!==31)throw Error('Park layout version mismatch');
 const group=new THREE.Group();group.name='REFERENCE_PARK_V57';
 const assets=new Map(),batches=new Map(),exposure={value:1};
 function finish(source,plant,geometry){
  const material=source.clone();material.metalness=0;material.envMapIntensity=plant?.40:.45;
  material.emissive?.set(0);material.emissiveIntensity=0;material.side=THREE.FrontSide;
  if(plant){material.roughness=.26;material.specularIntensity=1;}
  const cavity=geometry.getAttribute('_cavity');if(plant&&!cavity)throw Error('Approved foliage cavity missing');
  material.onBeforeCompile=s=>{
   s.uniforms.uParkExposure57=exposure;
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\n'+(plant?'attribute float _cavity; varying float vCavity57;':''))
    .replace('#include <begin_vertex>','#include <begin_vertex>\n'+(plant?'vCavity57=_cavity;':''));
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uParkExposure57;\n'+(plant?'varying float vCavity57;':''));
   if(plant)s.fragmentShader=s.fragmentShader
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat leaf57=smoothstep(.005,.05,vColor.g-vColor.r); roughnessFactor=mix(.72,.26,leaf57);')
    .replace('#include <aomap_fragment>','#include <aomap_fragment>\nfloat localAO57=clamp(vCavity57,.32,1.0); reflectedLight.indirectDiffuse*=localAO57; reflectedLight.indirectSpecular*=localAO57;');
   s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= uParkExposure57;\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=> 'reference-park-57-'+(plant?'approved-foliage':source.uuid);
  return material;
 }
 function assetFrom(root,key,plant=false){
  const parts=[],bounds=new THREE.Box3();root.updateMatrixWorld(true);
  root.traverse(m=>{if(!m.isMesh)return;
   const g=m.geometry.clone();if(!m.matrixWorld.equals(new THREE.Matrix4()))g.applyMatrix4(m.matrixWorld);g.computeBoundingBox();g.computeBoundingSphere();
   if(Array.isArray(m.material)){
    // GLTFLoader normally splits multiple primitives into child meshes.
    throw Error('Unexpected unsplit park material groups: '+m.name);
   }
   bounds.union(g.boundingBox);parts.push({geometry:g,material:finish(m.material,plant,g),triangles:(g.index?.count??g.attributes.position.count)/3,name:m.name});
  });
  if(!parts.length)throw Error('Empty park asset: '+key);assets.set(key,{parts,bounds});
 }
 for(const [key,name]of Object.entries(FURNITURE)){
  const root=furniture.scene.getObjectByName(name);if(!root)throw Error('Missing furniture: '+name);assetFrom(root,key);
 }
 for(const key of new Set(layout.props.filter(p=>!FURNITURE[p.asset]).map(p=>p.asset))){const root=toys.scene.getObjectByName(key);if(!root)throw Error('Missing park toy: '+key);assetFrom(root,key);}
 foliage.scene.updateMatrixWorld(true);
 for(const key of ['tree-near','tree-far','shrub-near','shrub-far']){
  const root=foliage.scene.getObjectByName(key);if(!root)throw Error('Missing approved foliage: '+key);assetFrom(root,key,true);
 }
 const rows=[...layout.props,...layout.plants].map(p=>({...p}));
 const plinth=rows.find(p=>p.zone==='plinth');plinth.y=9.398031;
 for(const p of rows){
  if(p.zone==='plinth')continue;
  if(p.zone==='sculpture'){p.y=plinth.y+.32;continue;}
  if(p.zone==='bridge'){
   // Both authored path and abutment caps are at this measured datum. The
   // old placeholder deck sits 0.36m above it and must not lift the new arch.
   p.y=9.4787868+.015;continue;
  }
  const h=sample(p.x,p.z);if(!h||isWater(h))throw Error('Park asset has no dry support: '+p.id);
  p.y=h.point.y-.018;
 }
 const transform=new THREE.Object3D();
 const matrix=p=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.yaw,0);transform.scale.setScalar(p.scale);transform.updateMatrix();return transform.matrix;};
 function makeBatch(key,count){
  const asset=assets.get(key),parts=asset.parts.map(a=>{
   const mesh=new THREE.InstancedMesh(a.geometry,a.material,count);mesh.name='P57_'+key+'_'+a.name;
   mesh.castShadow=true;mesh.receiveShadow=!key.endsWith('-far');mesh.userData.safeShadowCaster=true;
   mesh.count=0;group.add(mesh);return mesh;
  });batches.set(key,{parts,asset});return batches.get(key);
 }
 for(const key of new Set(layout.props.map(p=>p.asset))){
  const list=rows.filter(p=>p.asset===key),b=makeBatch(key,list.length);
  for(const mesh of b.parts){list.forEach((p,i)=>mesh.setMatrixAt(i,matrix(p)));mesh.count=list.length;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
 }
 for(const kind of ['tree','shrub'])for(const level of ['near','far'])makeBatch(kind+'-'+level,layout.plants.filter(p=>p.asset===kind).length);
 const bridges=rows.filter(p=>p.zone==='bridge');
 const plinthLocal57=createPlinthSampler57(assets.get('sculpture-plinth-warm-blush').parts);
 const bridgeLandings57=createBridgeLandings57(landingProfiles);
 function ground(x,z){
  const localPlinthY=plinthLocal57(x-plinth.x,z-plinth.z);
  let y=localPlinthY===null?null:plinth.y+localPlinthY;
  for(const p of bridges){
   const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw),u=c*dx-s*dz,v=s*dx+c*dz;
   // The central south gate joins the entry ramp at the full deck edge;
   // its walkable surface must not inherit the other rail edges' 4cm guard.
   const entryGate=p.asset==='bridge-lower'&&u>=-3.4385&&u<=3.5215&&v>=0;
   if(Math.abs(u)<=p.span/2&&Math.abs(v)<=p.width/2-(entryGate?0:.04)){const h=p.y+p.rise*Math.max(0,1-(2*u/p.span)**2);y=y===null?h:Math.max(y,h);}
   if(p.asset==='bridge-lower'){const landing=bridgeLandings57.sample(u,v);if(landing!==null){const h=p.y+landing;y=y===null?h:Math.max(y,h);}}
  }
  return y;
 }
 const colliders=rows.filter(p=>!['plinth','bridge','sculpture'].includes(p.zone)&&p.asset!=='shrub').map(p=>{
  const asset=assets.get(isPlant(p)?p.asset+'-far':p.asset),b=asset.bounds;
  return {...p,c:Math.cos(p.yaw),s:Math.sin(p.yaw),minX:b.min.x*p.scale,maxX:b.max.x*p.scale,minZ:b.min.z*p.scale,maxZ:b.max.z*p.scale,top:p.y+b.max.y*p.scale,radius:p.asset==='tree'?.4*p.scale:null};
 });
 function obstacle(x,z){
  let y=ground(x,z);
  // Feed the unchanged controller's step-height collision contract. Rail tops
  // are too high to step through, while the south entry gate stays clear.
  for(const p of bridges){
   const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw),u=c*dx-s*dz,v=s*dx+c*dz;
   const gate=p.asset==='bridge-lower'&&v>0&&u> -3.6195&&u<3.6225;
   if(!gate&&Math.abs(u)<p.span/2&&Math.abs(Math.abs(v)-(p.width/2-.17))<.30){
    const h=p.y+p.rise*Math.max(0,1-(2*u/p.span)**2)+1.27;y=y===null?h:Math.max(y,h);
   }
  }
  for(const p of colliders){
   const dx=x-p.x,dz=z-p.z,u=p.c*dx-p.s*dz,v=p.s*dx+p.c*dz;
   if(p.radius?dx*dx+dz*dz<p.radius*p.radius:u>p.minX&&u<p.maxX&&v>p.minZ&&v<p.maxZ)y=y===null?p.top:Math.max(y,p.top);
  }
  return y;
 }
 // A single shared contact mesh; skip water and bridge spans completely.
 const pos=[],color=[],ix=[],N=8;
 for(const p of rows){
  if(p.zone==='bridge'||p.zone==='plinth'||p.zone==='sculpture')continue;
  const b=assets.get(isPlant(p)?p.asset+'-far':p.asset).bounds;
  const w=(b.max.x-b.min.x)*p.scale,d=(b.max.z-b.min.z)*p.scale,h=(b.max.y-b.min.y)*p.scale,plant=isPlant(p);
  const cx=p.x-(plant?h*.26:0),cz=p.z+(plant?h*.19:0),rx=w*(plant?.86:.60),rz=Math.max(d*(plant?.94:.60),plant?w*.7:0),off=pos.length/3,valid=[];
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const u=i/N*2-1,v=j/N*2-1,x=cx+u*rx,z=cz+v*rz,hit=sample(x,z),special=ground(x,z),y=special??hit?.point.y;
   valid.push(special!==null||!isWater(hit));pos.push(x,(y??0)+.016,z);
   const t=Math.max(0,1-u*u-v*v);color.push(.26,.28,.24,(plant?.17:.12)*t*t);
  }
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;if([a,b,c,d].every(k=>valid[k]))ix.push(off+a,off+c,off+b,off+b,off+c,off+d);}
 }
 // Tiny source-derived foot contacts anchor sculptures to the plinth. A single
 // large bounding-box oval reads as a detached shadow between spread feet.
 // These share the existing contact draw; prototype geometry is never altered.
 const footCache=new Map();
 for(const p of rows.filter(p=>p.zone==='sculpture')){
  if(!footCache.has(p.asset)){
   const a=assets.get(p.asset),points=[],groups=[];
   for(const part of a.parts){const q=part.geometry.attributes.position;for(let i=0;i<q.count;i++)if(q.getY(i)<a.bounds.min.y+.04)points.push([q.getX(i),q.getZ(i)]);}
   const unseen=new Set(points.map((_,i)=>i));
   while(unseen.size){const seed=unseen.values().next().value,list=[seed];unseen.delete(seed);for(let k=0;k<list.length;k++)for(const i of unseen){const a=points[list[k]],b=points[i];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.22){unseen.delete(i);list.push(i);}}
    const xs=list.map(i=>points[i][0]),zs=list.map(i=>points[i][1]);
    groups.push({x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,r:Math.min(.40,Math.max(.16,Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2+.11))});
   }
   footCache.set(p.asset,groups);
  }
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  for(const f of footCache.get(p.asset)){
   const x=p.x+(c*f.x+s*f.z)*p.scale,z=p.z+(-s*f.x+c*f.z)*p.scale,r=f.r*p.scale,y=ground(x,z);
   if(y===null)continue;
   const off=pos.length/3,S=16;pos.push(x,y+.009,z);color.push(.24,.24,.23,.25);
   for(let i=0;i<S;i++){const a=i/S*Math.PI*2;pos.push(x+r*Math.cos(a),y+.009,z+r*Math.sin(a));color.push(.24,.24,.23,0);}
   for(let i=0;i<S;i++)ix.push(off,off+1+(i+1)%S,off+1+i);
  }
 }
 const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cg.setAttribute('color',new THREE.Float32BufferAttribute(color,4));cg.setIndex(ix);
 const contact=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false}));
 contact.name='P57_SOFT_TERRAIN_CONTACT';contact.renderOrder=2;group.add(contact);
 scene.add(group);group.updateMatrixWorld(true);
 let clock=1,triangles=0;
 function update(dt,camera){
  exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);
  clock+=dt;if(clock<.25)return;clock=0;
  for(const key of ['tree-near','tree-far','shrub-near','shrub-far'])for(const m of batches.get(key).parts)m.count=0;
  for(const p of rows.filter(isPlant)){
   const near=Math.hypot(camera.position.x-p.x,camera.position.y-p.y,camera.position.z-p.z)<58,b=batches.get(p.asset+(near?'-near':'-far'));
   for(const m of b.parts)m.setMatrixAt(m.count++,matrix(p));
  }
  triangles=ix.length/3;let draws=1;
  for(const [key,b]of batches)for(let i=0;i<b.parts.length;i++){
   const m=b.parts[i];if(/-(near|far)$/.test(key)){m.instanceMatrix.needsUpdate=true;if(m.count)m.computeBoundingSphere();}
   if(m.count){draws++;triangles+=m.count*b.asset.parts[i].triangles;}
  }
  Object.assign(renderer.domElement.dataset,{parkProps57:'ready',parkPropCount:String(layout.props.length),parkTreeCount:String(layout.plants.filter(p=>p.asset==='tree').length),parkShrubCount:String(layout.plants.filter(p=>p.asset==='shrub').length),parkPropTriangles:String(triangles),parkPropDrawCalls:String(draws),parkFoliageSource:'unchanged-v45',parkAddedLights:'0'});
 }
 return {group,layout:rows,ground,obstacle,update,hiddenTerrain:['67D_REF_HILL_DOME','8_PARK_KOPRU_UST'],get triangles(){return triangles;}};
}
