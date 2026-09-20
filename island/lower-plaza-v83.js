import * as T from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {finishCityMaterial60} from './city-props-v60.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';

// Additive, reversible lower-central district. No source terrain, road, grass,
// approved upper-square architecture, or player-interface code is replaced.
export async function loadLowerPlaza83({scene,renderer,sample,variant}){
  const gltf=await new GLTFLoader().loadAsync('/67park-foundation-next/island/lower-plaza-v83.glb?v=83.1');
  let metadata;gltf.scene.traverse(o=>{if(o.userData.plaza83)metadata=o.userData.plaza83;});
  if(metadata?.version!==83||metadata.shops?.length!==11)throw Error('Lower plaza asset contract mismatch');
  const {cx,cz,ground}=metadata;
  for(const [dx,dz]of [[0,0],[0,-40],[0,40],[-40,0],[40,0]]){
    const hit=sample(cx+dx,cz+dz);
    if(!hit||/YOL|YAYA_GECIDI|DENIZ|SU$/.test(hit.object.name)||hit.point.y>ground+.01)throw Error('Lower plaza support changed at '+[dx,dz]);
  }
  const group=gltf.scene;group.name='LOWER_PLAZA_V83';group.position.set(cx,ground,cz);
  const exposure={value:1};let draws=0,triangles=0;const floors=[];
  group.traverse(m=>{
    if(!m.isMesh)return;
    const floor=m.name==='PLAZA83_WALKABLE_GROUND';
    m.material=finishCityMaterial60(m.material,exposure);
    // All materials share the same exposure transform; colours stay uniforms.
    m.material.customProgramCacheKey=()=> 'lower-plaza83-exposure';
    m.castShadow=!floor&&!m.material.transparent&&!/bulb/.test(m.material.name);
    m.receiveShadow=!m.material.transparent;m.userData.safeShadowCaster=m.castShadow;
    if(m.material.transparent)m.material.depthWrite=false;
    if(floor)floors.push(m);
    draws++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;
  });
  if(floors.length!==1||draws>24)throw Error('Lower plaza render budget mismatch');
  group.updateMatrixWorld(true);
  const floorSampler=createCityHeightSampler58(floors,{cellSize:4});
  const blockers=[...floors],invisible=new T.MeshBasicMaterial({visible:false}),solids=metadata.colliders;
  for(const c of solids){
    const geometry=c.kind==='circle'?new T.CylinderGeometry(c.r,c.r,c.top,10):new T.BoxGeometry(c.w,c.top,c.d);
    const m=new T.Mesh(geometry,invisible);m.name='PLAZA83_COLLIDER_'+c.label;
    m.position.set(c.x,c.top/2,c.z);m.rotation.y=c.yaw||0;group.add(m);blockers.push(m);
  }
  function obstacle(x,z){
    let height=floorSampler.height(x,z);if(height==null)return null;
    const px=x-cx,pz=z-cz;
    for(const c of solids){
      const dx=px-c.x,dz=pz-c.z,cos=Math.cos(c.yaw||0),sin=Math.sin(c.yaw||0);
      const u=dx*cos-dz*sin,v=dx*sin+dz*cos;
      if(c.kind==='circle'?dx*dx+dz*dz<=c.r*c.r:Math.abs(u)<=c.w/2&&Math.abs(v)<=c.d/2)height=Math.max(height,ground+c.top);
    }
    return height;
  }
  function update(){exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);}
  update();scene.add(group);group.updateMatrixWorld(true);
  const stats={version:83,revision:metadata.revision||0,shops:metadata.shops.length,center:metadata.center,benches:metadata.benches,
    rectangularPlanters:metadata.rectangularPlanters,roundPlanters:metadata.roundPlanters,posts:metadata.posts,bulbs:metadata.bulbs,
    draws,triangles,origin:[cx,ground,cz],sourceTerrainModified:false};
  renderer.domElement.dataset.lowerPlaza83=JSON.stringify(stats);
  return {group,stats,metadata,update,obstacle,ground:floorSampler.height,cameraBlockers:blockers,floorSampler};
}
