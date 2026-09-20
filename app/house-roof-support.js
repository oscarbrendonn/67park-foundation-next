import * as THREE from 'three';
import {createCityHeightSampler58} from '../island/city-height-sampler58.js?v=plaza-climb-1';
import {createPlazaClimbSupports} from './plaza-climb-support.js?v=plaza-climb-1';

const HOUSE_GROUPS=new Set(['SMALL_ISLAND_PROPS_V62','CENTRAL_BUILDINGS_V68',
  'BOTTOM_HOMES_V103','ISLAND_NORTH_HOMES','ISLAND_NORTH_APARTMENTS']);
const CELL=16,APRON=.5;
const isHouse=mesh=>mesh.isInstancedMesh && (mesh.parent.name!=='SMALL_ISLAND_PROPS_V62'||mesh.userData.houseAsset62);
const terrainHeight=(terrain,x,z)=>typeof terrain==='function'?terrain(x,z):terrain;

// Share the existing buffers and one upward-triangle index per house asset.
// These roofs add no render meshes. The separate plaza adapter below also
// supplies its small shared window caps; neither path raycasts per frame.
export function createHouseRoofSupports(scene,{courtyard:west}={}){
  scene.updateMatrixWorld(true);
  const assets=new Map(),placements=[],cells=new Map(),matrix=new THREE.Matrix4();
  for(const name of HOUSE_GROUPS){
    const group=scene.getObjectByName(name);if(!group)continue;
    const batches=new Map();
    for(const mesh of group.children.filter(isHouse))for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
      const key=matrix.elements.join(',');
      if(!batches.has(key))batches.set(key,{matrix:matrix.clone(),parts:[]});
      batches.get(key).parts.push(mesh);
    }
    for(const batch of batches.values()){
      const parts=[...new Map(batch.parts.map(m=>[m.geometry.uuid,m])).values()].sort((a,b)=>a.geometry.uuid.localeCompare(b.geometry.uuid));
      const key=parts.map(m=>m.geometry.uuid).join(',');
      let asset=assets.get(key);
      if(!asset){
        const localMeshes=parts.map(m=>new THREE.Mesh(m.geometry,m.material)),box=new THREE.Box3();
        for(const mesh of parts){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox);}
        asset={sampler:createCityHeightSampler58(localMeshes,{cellSize:2}),box};assets.set(key,asset);
      }
      const box=asset.box.clone().applyMatrix4(batch.matrix),row={asset,box,matrix:batch.matrix,inverse:batch.matrix.clone().invert(),group:name};
      placements.push(row);
      for(let z=Math.floor((box.min.z-APRON)/CELL);z<=Math.floor((box.max.z+APRON)/CELL);z++)
        for(let x=Math.floor((box.min.x-APRON)/CELL);x<=Math.floor((box.max.x+APRON)/CELL);x++){
          const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(row);
        }
    }
  }
  const point=new THREE.Vector3(),worldPoint=new THREE.Vector3();
  function candidates(x,z){return cells.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))??[];}
  // Courtyard facades are baked rather than instanced. Their old solid index
  // intentionally omitted roofs; index only the already rendered roof band,
  // not windows, furniture, all 19 facades or another complete town copy.
  let courtyardSampler=west?.buildingBounds?.length?createCityHeightSampler58(
    west.group.children.filter(m=>m.isMesh&&m.userData.kind102==='detail'&&!m.material.transparent),
    {cellSize:3,minHeight:Math.min(...west.buildingBounds.map(b=>b.min[1]))+9.5}):null;
  let courtyard=courtyardSampler?{buildingBounds:west.buildingBounds,roofGround:courtyardSampler.height}:null;
  let courtyardRows=courtyard?.roofGround?courtyard.buildingBounds:[];
  const courtyardBounds=courtyardRows.reduce((b,r)=>[Math.min(b[0],r.min[0]-APRON),Math.min(b[1],r.min[2]-APRON),Math.max(b[2],r.max[0]+APRON),Math.max(b[3],r.max[2]+APRON)],[Infinity,Infinity,-Infinity,-Infinity]);
  function courtyardAt(x,z){
    if(x<courtyardBounds[0]||z<courtyardBounds[1]||x>courtyardBounds[2]||z>courtyardBounds[3])return null;
    return courtyardRows.find(b=>x>=b.min[0]-APRON&&x<=b.max[0]+APRON&&z>=b.min[2]-APRON&&z<=b.max[2]+APRON);
  }
  function height(row,x,z){
    point.set(x,0,z).applyMatrix4(row.inverse);
    const y=row.asset.sampler.height(point.x,point.z);
    if(y===null)return null;
    return worldPoint.set(point.x,y,point.z).applyMatrix4(row.matrix).y;
  }
  function sample(x,z){
    let result=null;
    for(const row of candidates(x,z)){
      const y=height(row,x,z);
      if(y!==null&&(!result||y>result.y))result={x,y,z,group:row.group};
    }
    if(courtyardAt(x,z)){
      const y=courtyard.roofGround(x,z);
      if(y!==null&&(!result||y>result.y))result={x,y,z,group:'WEST_COURTYARD_V102'};
    }
    return result;
  }
  function ground(x,z,feet,step,base,terrain){
    if(!Number.isFinite(feet))return base;
    if(plaza?.contains(x,z))return plaza.ground(x,z,feet,step,base);
    const courtyardRow=courtyardAt(x,z);
    if(courtyardRow&&feet>courtyardRow.min[1]+1.2&&(base===null||base<=courtyardRow.top+1)){
      const y=courtyard.roofGround(x,z);
      if(y!==null&&feet+step>=y-1e-6)return Math.max(terrainHeight(terrain,x,z)??-Infinity,y);
      if(y===null&&feet>courtyardRow.min[1]+9.2)return terrainHeight(terrain,x,z);
    }
    for(const row of candidates(x,z)){
      const b=row.box;
      if(x<b.min.x-APRON||x>b.max.x+APRON||z<b.min.z-APRON||z>b.max.z+APRON)continue;
      // Leave roads, curbs, wall contact and the vehicle query unchanged below
      // the building. Only an airborne/roof-height character uses its roof.
      if(feet<b.min.y+1.2||base!==null&&base>b.max.y+1)continue;
      const y=height(row,x,z);
      if(y!==null&&feet+step>=y-1e-6)return Math.max(terrainHeight(terrain,x,z)??-Infinity,y);
      // The old conservative box extends slightly past the visible eaves.
      // Do not leave an invisible ledge there when someone jumps off a roof.
      if(y===null&&base!==null&&base>b.min.y+1.2)return terrainHeight(terrain,x,z);
    }
    return base;
  }
  const plaza=createPlazaClimbSupports(scene);
  function obstacleGround(x,z,feet,step,base,terrain){
    if(plaza?.contains(x,z))return plaza.obstacleGround(x,z,feet,step,base);
    return ground(x,z,feet,step,base,terrain);
  }
  const stats={revision:'house-roofs-1',houses:placements.length+courtyardRows.length,assets:assets.size,
    courtyardRoofBand:courtyardRows.length,
    triangles:[...assets.values()].reduce((n,a)=>n+a.sampler.stats.triangles,courtyardSampler?.stats.triangles??0),
    bytes:[...assets.values()].reduce((n,a)=>n+a.sampler.stats.bytes,courtyardSampler?.stats.bytes??0),addedDrawCalls:0,newAssetDownloads:0};
  const sites=placements.map(p=>({group:p.group,x:(p.box.min.x+p.box.max.x)/2,z:(p.box.min.z+p.box.max.z)/2}));
  sites.push(...courtyardRows.map(p=>({group:'WEST_COURTYARD_V102',x:p.x,z:p.z})));
  function dispose(){plaza?.dispose();assets.clear();placements.length=0;cells.clear();sites.length=0;courtyardSampler=courtyard=null;courtyardRows=[];stats.disposed=true;}
  return {ground,obstacleGround,sample,stats,sites,plaza,dispose};
}

export function installHouseRoofSupports(world){
  if(world.roofSupports)return world;
  let roofs;
  try{roofs=createHouseRoofSupports(world.scene,{courtyard:world.renderer.domElement.__westCourtyard102});}
  catch(error){
    // This additive playground feature must not stop the lobby loading. The
    // original walls/ground remain safe. Release QA still rejects a fallback.
    world.renderer.domElement.dataset.houseRoofs=JSON.stringify({revision:'house-roofs-1',disabled:true,error:String(error?.message||error).slice(0,180)});
    return world;
  }
  world.roofSupports=roofs;
  // Read the current ground function, not a captured one: home interiors and
  // their cleanup replace it. A home transition must retain its own floor.
  world.characterGround=(x,z,feet,step=.36)=>roofs.ground(x,z,feet,step,
    world.ground(x,z),world.terrainGround);
  world.characterObstacle=(x,z,feet,step=.36)=>roofs.obstacleGround(x,z,feet,step,
    world.ground(x,z),world.terrainGround);
  world.renderer.domElement.dataset.houseRoofs=JSON.stringify(roofs.stats);
  if(roofs.plaza)world.renderer.domElement.dataset.plazaClimb=JSON.stringify(roofs.plaza.stats);
  const originalDispose=world.dispose;
  world.dispose=function(...args){roofs.dispose();return originalDispose?.apply(this,args);};
  return world;
}

export function characterGround(world,x,z,feet,step=.36){
  return world?.characterGround?world.characterGround(x,z,feet,step):world?.ground(x,z)??null;
}

export function characterObstacle(world,x,z,feet,step=.36){
  return world?.characterObstacle?world.characterObstacle(x,z,feet,step):characterGround(world,x,z,feet,step);
}
