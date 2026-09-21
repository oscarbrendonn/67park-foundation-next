const assert=require('node:assert/strict');

module.exports=async(page,{check})=>{
 await check('all grass-corner and district paving shares the real sidewalk material',async()=>{
  const result=await page.evaluate(async()=>{
   const {SIDEWALK_CORE,SIDEWALK_DISTRICTS}=await import('/67park-foundation-next/app/sidewalk-materials.js?v=sidewalk-materials-1');
   const w=__islandWorld,source=w.terrain.getObjectByName('6_BORDUR').material;
   const names=[...SIDEWALK_CORE,...Object.keys(SIDEWALK_DISTRICTS)],rows=names.map(name=>{
    const mesh=w.scene.getObjectByName(name),m=mesh?.material;
    return {name,same:m===source,color:m?.color?.getHexString(),emission:m?.emissive?.getHex(),intensity:m?.emissiveIntensity,stone:!!m?.customProgramCacheKey().includes('park-surface-v2-stone')};
   });
   const protectedNames=['3_CIMEN','CENTER73_LAWN_0','CENTER73_PLANTER_19.617_-51.366','CENTER73_67','SPORTS97_FLOOR_SPORTS97_line','SPORTS97_FLOOR_SPORTS97_turf','SPORTS97_SOLID_SPORTS97_paving','POOL104_floor:POOL104_basin'];
   return {rows,protected:protectedNames.map(name=>({name,present:!!w.scene.getObjectByName(name),preserved:w.scene.getObjectByName(name)?.material!==source})),stats:JSON.parse(w.renderer.domElement.dataset.sidewalkMaterials1||'null'),muted:localStorage.getItem('67park-feel-lab-muted')};
  });
  assert.equal(result.stats?.version,1);assert.equal(result.rows.length,26);
  assert.deepEqual(result.stats.absentDistricts,[]);
  for(const row of result.rows){assert.equal(row.same,true,row.name);assert.equal(row.color,'d8b7ae',row.name);assert.equal(row.emission,0,row.name);assert.equal(row.intensity,0,row.name);assert.equal(row.stone,true,row.name);}
  for(const row of result.protected){assert.equal(row.present,true,row.name);assert.equal(row.preserved,true,row.name);}
  assert.equal(result.stats.geometryChanged,false);assert.equal(result.stats.collisionChanged,false);assert.equal(result.stats.addedDrawCalls,0);assert.equal(result.stats.perFrameWork,0);assert.equal(result.muted,'1');
  console.log('SIDEWALK_MATERIALS_LIVE_PASS',JSON.stringify(result));
  return result;
 });
};
