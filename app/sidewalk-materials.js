// These are pedestrian ground meshes, not a colour/name search over buildings.
// Keep the existing heights, grass, architecture, sports markings and physics.
export const SIDEWALK_CORE = Object.freeze([
 '7_MERKEZ_KALDIRIM_TABANI',
 ...[-1,1].flatMap(x=>[-1,1].map(z=>'CENTER_WHITE71_'+x+'_'+z)),
 ...Array.from({length:12},(_,i)=>'CENTER73_LAWN_RIM_'+i),
 ...[14.2,84.54].flatMap(x=>[-74.65,-29.23].map(z=>'CENTER73_PATH_'+x+'_'+z))
]);

// Optional districts may fail independently without blocking park entry.
// Only their separately authored paving is eligible, never a shell/edge group.
export const SIDEWALK_DISTRICTS = Object.freeze({
 'PLAZA83_WALKABLE_GROUND':'PLAZA83_paving',
 'SPORTS97_FLOOR_SPORTS97_paving':'SPORTS97_paving',
 'WEST102_floor:COURTYARD102_paving':'COURTYARD102_paving',
 'POOL104_floor:POOL104_paving':'POOL104_paving',
 'NW93_single_continuous_walking_surface':'NW93_mauve_paving'
});

export function applySidewalkMaterials(scene,terrain){
 if(terrain.userData.sidewalkMaterials1)return terrain.userData.sidewalkMaterials1;
 const source=terrain.getObjectByName('6_BORDUR'),material=source?.material;
 if(!source?.isMesh||Array.isArray(material)||!material?.isMeshStandardMaterial||
    material.name!=='67_KALDIRIM_TABANI_M'||material.transparent||material.vertexColors||
    material.emissive?.getHex()!==0||material.emissiveIntensity!==0)
  throw Error('Shared sidewalk material missing or changed');
 const allowed=new Set([...SIDEWALK_CORE,...Object.keys(SIDEWALK_DISTRICTS)]),found=new Map();
 scene.traverse(mesh=>{
  if(!allowed.has(mesh.name))return;
  if(found.has(mesh.name)||!mesh.isMesh||mesh.isSkinnedMesh||Array.isArray(mesh.material)||!mesh.material?.isMeshStandardMaterial)
   throw Error('Invalid sidewalk material target: '+mesh.name);
  const expected=SIDEWALK_DISTRICTS[mesh.name];
  if(expected&&mesh.material.name!==expected)
   throw Error('District paving material changed: '+mesh.name);
  found.set(mesh.name,mesh);
 });
 for(const name of SIDEWALK_CORE)if(!found.has(name))throw Error('Sidewalk ground missing: '+name);
 // Validate everything before assigning. Sharing the complete authored material
 // also matches its shader, roughness and lighting; matching only RGB leaves
 // the old ivory emission/ceramic finish visible. Do not edit the old materials:
 // lawn rims share one with decorative planters that must retain their finish.
 for(const mesh of found.values())mesh.material=material;
 return terrain.userData.sidewalkMaterials1={
  version:1,source:source.name,material:material.name,meshes:[...found.keys()],
  absentDistricts:Object.keys(SIDEWALK_DISTRICTS).filter(name=>!found.has(name)),
  geometryChanged:false,collisionChanged:false,addedDrawCalls:0,perFrameWork:0
 };
}
