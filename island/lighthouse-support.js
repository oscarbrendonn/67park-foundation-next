import {createCityHeightSampler58} from './city-height-sampler58.js';

// Use the rendered, world-space lighthouse faces: its two round plinths are
// floors, not a tower-height AABB. Highest upward faces keep the actual tower
// closed. No geometry/material edits, extra draw calls, or per-frame raycasts.
// The caller must omit the lighthouse from its old box-solid collection.
export function addLighthouseSupport(lunapark){
 const meshes=[];
 lunapark.group.traverse(o=>{if(o.isMesh&&o.name==='LUNA77_lighthouse')meshes.push(o);});
 if(!meshes.length)throw Error('Lighthouse support: rendered meshes missing');
 const support=createCityHeightSampler58(meshes,{cellSize:1});
 support.stats.revision='lighthouse-steps-1';
 const original=lunapark.obstacle;
 return {...lunapark,lighthouseSupport:support,obstacle(x,z,...args){
  const base=original(x,z,...args),height=support.height(x,z);
  return height==null?base:base==null?height:Math.max(base,height);
 }};
}
