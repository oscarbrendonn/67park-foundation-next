const assert=require('node:assert/strict');

const TARGETS=['7_KALDIRIM_TABANI','6_BORDUR','3_CIMEN','CENTER_WHITE71_-1_-1','CENTER_WHITE71_-1_1','CENTER_WHITE71_1_-1','CENTER_WHITE71_1_1','5_YOL'];

module.exports=async(page,{mobile,check})=>{
 await check('reported city curb keeps its bevel across the old corner break',async()=>{
  const result=await page.evaluate(async()=>{
   const T=await import('three'),curb=__islandWorld.terrain.getObjectByName('6_BORDUR'),rows=[];
   for(const y of [9.335,9.35,9.37])for(const z of [114.20,114.30,115.5,116.0]){
    const cast=level=>new T.Raycaster(new T.Vector3(-14,level,z),new T.Vector3(-1,0,0),0,2).intersectObject(curb,false)[0];
    const top=cast(y),base=cast(9.30);rows.push({y,z,inset:top&&base?base.point.x-top.point.x:null});
   }
   return rows;
  });
  assert.equal(result.length,12);assert(result.every(r=>r.inset>.001&&r.inset<.06),JSON.stringify(result));
  for(const y of [9.335,9.35,9.37]){const insets=result.filter(r=>r.y===y).map(r=>r.inset);assert(Math.max(...insets)-Math.min(...insets)<.0002,JSON.stringify(result));}
  console.log('PASS city curb corner profile',JSON.stringify({mobile,samples:result.length}));
 });
 await check('map-edge finish keeps patched ground continuous and its exterior walls front-facing',async()=>{
  const result=await page.evaluate(async targets=>{
   const T=await import('three'),w=__islandWorld,root=w.terrain,live=JSON.parse(w.renderer.domElement.dataset.mapEdgeFinish1||'null');
   const repair=await fetch('/67park-foundation-next/repairs/map-edge-finish-1.json?v=curb-touch-finish-1').then(r=>{if(!r.ok)throw Error('Map-edge repair unavailable');return r.json();});
   const byName=name=>root.getObjectByName(name),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
   const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const meshAudit=targets.map(name=>{const mesh=byName(name),g=mesh?.geometry;return {name,isMesh:!!mesh?.isMesh,indexed:!!g?.index,attributes:Object.keys(g?.attributes||{}).sort(),materials:Array.isArray(mesh?.material)?mesh.material.length:Number(!!mesh?.material)};});
   const fill=byName('8_CIM_STUB_DOLGU'),grass=byName('3_CIMEN');
   const divider=byName('8_REF_AYIRICI'),position=divider?.geometry?.attributes?.position,v=new T.Vector3();let dividerCount=0,dividerMin=Infinity,dividerMax=-Infinity;
   if(position)for(let i=0;i<position.count;i++){
    v.fromBufferAttribute(position,i).applyMatrix4(divider.matrixWorld);
    if(v.x>=-151.17&&v.x<=-137.09&&v.z>=49.98&&v.z<=63.19){dividerCount++;dividerMin=Math.min(dividerMin,v.y);dividerMax=Math.max(dividerMax,v.y);}
   }
   const topAt=(mesh,x,z)=>{
    ray.set(new T.Vector3(x,30,z),down);ray.far=40;return ray.intersectObject(mesh,false).some(hit=>hit.point.y>9.2);
   };
   const sideCandidates=async row=>{
    const mesh=byName(row.name),g=mesh.geometry,start=row.replace?0:row.expected.vertices,out=[];
    for(let i=0,scanned=0;i<row.ix.length;i+=3){
     const pause=++scanned%1000===0;
     const a=new T.Vector3().fromBufferAttribute(g.attributes.position,start+row.ix[i]).applyMatrix4(mesh.matrixWorld),b=new T.Vector3().fromBufferAttribute(g.attributes.position,start+row.ix[i+1]).applyMatrix4(mesh.matrixWorld),c=new T.Vector3().fromBufferAttribute(g.attributes.position,start+row.ix[i+2]).applyMatrix4(mesh.matrixWorld);
     const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a));
     if(normal.lengthSq()<1e-14){if(pause)await yieldFrame();continue}normal.normalize();if(Math.abs(normal.y)>=.5){if(pause)await yieldFrame();continue}
     out.push({mesh,center:a.add(b).add(c).multiplyScalar(1/3),normal,triangle:i/3});
     if(pause)await yieldFrame();
    }
    return out;
   };
   const meshSideCandidates=async mesh=>{
    const g=mesh.geometry,index=g.index,out=[];
    for(let i=0,scanned=0;i<(index?.count??0);i+=3){
     const pause=++scanned%1000===0;
     const a=new T.Vector3().fromBufferAttribute(g.attributes.position,index.getX(i)).applyMatrix4(mesh.matrixWorld),b=new T.Vector3().fromBufferAttribute(g.attributes.position,index.getX(i+1)).applyMatrix4(mesh.matrixWorld),c=new T.Vector3().fromBufferAttribute(g.attributes.position,index.getX(i+2)).applyMatrix4(mesh.matrixWorld);
     const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a));
     if(normal.lengthSq()<1e-14){if(pause)await yieldFrame();continue}normal.normalize();if(Math.abs(normal.y)>=.5){if(pause)await yieldFrame();continue}
     out.push({mesh,center:a.add(b).add(c).multiplyScalar(1/3),normal,triangle:i/3});
     if(pause)await yieldFrame();
    }
    return out;
   };
   const rows=new Map(repair.meshes.map(row=>[row.name,row])),regions=[
    {name:'west grass edge',row:'7_KALDIRIM_TABANI',x:-167,z:63,count:4},
    {name:'west divider grass-fill front',mesh:'8_CIM_STUB_DOLGU',x:-143,z:128.65,count:1},
    {name:'coastal fillet',row:'7_KALDIRIM_TABANI',x:-14,z:141.85,count:2},
    ...targets.filter(name=>name.startsWith('CENTER_WHITE71_')).map(name=>({name:'central mirrored slab '+name,row:name,x:49.3719545,z:-32.327407,count:2}))
   ];
   const sideProbes=[],sideFailures=[];
   for(const region of regions){
    const candidates=(await (region.mesh?meshSideCandidates(byName(region.mesh)):sideCandidates(rows.get(region.row)))).sort((a,b)=>Math.hypot(a.center.x-region.x,a.center.z-region.z)-Math.hypot(b.center.x-region.x,b.center.z-region.z));
    if(candidates.length<region.count){sideFailures.push({region:region.name,reason:'insufficient exterior side candidates',found:candidates.length});continue;}
    let selected=0,inspected=0;
    for(const candidate of candidates.slice(0,Math.max(12,region.count*5))){
     inspected++;
     // Two nearby vertical rays identify the top-bearing interior once per
     // chosen side triangle; we never ray-scan the full terrain to discover it.
     const horizontal=new T.Vector3(candidate.normal.x,0,candidate.normal.z).normalize(),distance=.012;
     const plus=topAt(candidate.mesh,candidate.center.x+horizontal.x*distance,candidate.center.z+horizontal.z*distance),minus=topAt(candidate.mesh,candidate.center.x-horizontal.x*distance,candidate.center.z-horizontal.z*distance);
     const outside=plus!==minus?(plus?horizontal.clone().negate():horizontal):null;
     if(!outside)continue;
     const origin=candidate.center.clone().addScaledVector(outside,.025),direction=outside.clone().negate();
     ray.set(origin,direction);ray.far=.06;const hit=ray.intersectObject(candidate.mesh,false)[0];
     const ok=!!hit&&hit.point.distanceTo(candidate.center)<.055;
     sideProbes.push({region:region.name,mesh:candidate.mesh.name,triangle:candidate.triangle,ok,distance:hit?.distance,at:[candidate.center.x,candidate.center.y,candidate.center.z]});
     if(!ok)sideFailures.push(sideProbes.at(-1));
     if(inspected%4===0)await yieldFrame();
     if(++selected===region.count)break;
    }
    if(selected<region.count)sideFailures.push({region:region.name,reason:'insufficient unambiguous exterior probes',found:selected});
   }
   const entranceCapSamples=[],entranceCapFailures=[],curb=byName('6_BORDUR');let entranceCapMax=-Infinity;
   for(const group of [
    {name:'west entrance cap',xs:[-145.10,-144.84,-144.58,-144.32,-144.06,-143.80,-143.54]},
    {name:'east entrance cap',xs:[-110.08,-109.82,-109.56,-109.30,-109.04,-108.78,-108.52]}
   ])for(const x of group.xs)for(const z of [128.22,128.34,128.46,128.58,128.66]){
    // These samples cover the complete repaired 0.502m-deep entrance window.
    // Unlike a lateral ray started inside the old curb, each must land on the
    // visible cap itself and prove it remains at the authored 9.38008564 level.
    ray.set(new T.Vector3(x,30,z),down);ray.far=40;const hit=ray.intersectObject(curb,false)[0],ok=!!hit&&Math.abs(hit.point.y-9.38008564)<.0001&&hit.point.y<=9.425;
    const row={group:group.name,x,z,ok,hit:hit&&{y:hit.point.y}};entranceCapSamples.push(row);if(hit)entranceCapMax=Math.max(entranceCapMax,hit.point.y);if(!ok)entranceCapFailures.push(row);
    if(entranceCapSamples.length%16===0)await yieldFrame();
   }
   const grassFrontSamples=[],grassFrontFailures=[];
   for(const group of [
    {name:'west grass front',xs:[-146.99,-146,-145,-144,-143,-142,-141.63]},
    {name:'east grass front',xs:[-111.96,-111,-110,-109,-108,-107,-106.59]}
   ])for(const x of group.xs){
    // Each range stays 0.2m inside its repaired stub width.  The new grass
    // front must be a continuous visible line at z=128.60, not a recessed fill.
    ray.set(new T.Vector3(x,30,128.60),down);ray.far=40;const hit=ray.intersectObject(grass,false)[0],ground=w.ground(x,128.60),ok=!!hit&&Math.abs(hit.point.y-9.398031)<.0001&&Math.abs(ground-9.398031)<.0001;
    const row={group:group.name,x,ok,ground,hit:hit&&{y:hit.point.y}};grassFrontSamples.push(row);if(!ok)grassFrontFailures.push(row);
    if(grassFrontSamples.length%8===0)await yieldFrame();
   }
   const grids=[
    ['central plaza and roads',-2,101,-76,11,8,8],
    ['west grass curb',-170,-137,51,70,8,7],
    ['coastal curb fillet',-15.05,-13.96,141.70,142.88,8,5],
    ['central tangent curb',38,61,-42,-22,8,5]
   ];
   const walkableMeshes=[...targets,'3_CIMEN','8_CIM_STUB_DOLGU','8_PARK_PATIKA_UST','6_BORDUR','4_KIYI_TOPRAK_TABANI','4_KURU_IC_ZEMIN_KIYI_EGIMI'].map(byName).filter(Boolean),gridFailures=[];let gridSamples=0;
   for(const [region,x0,x1,z0,z1,nx,nz]of grids)for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
    const x=x0+(x1-x0)*(ix+.5)/nx,z=z0+(z1-z0)*(iz+.5)/nz;ray.set(new T.Vector3(x,35,z),down);ray.far=40;
    const hit=ray.intersectObjects(walkableMeshes,false)[0],ground=w.ground(x,z);gridSamples++;
    if(!hit||!Number.isFinite(ground)||ground<8.79||hit.point.y<8.79||/sand|kum|beach/i.test(hit.object.name))gridFailures.push({region,x,z,ground,hit:hit&&{name:hit.object.name,y:hit.point.y}});
    if(gridSamples%8===0)await yieldFrame();
   }
   return {live,repairVersion:repair.version,repairGrassCarrierParts:repair.metrics.grassCarrierParts,repairGrassSeamWindows:repair.metrics.grassSeamWindows,repairGrassSeamArea:repair.metrics.grassSeamArea,repairGrassFrontZ:repair.metrics.grassFrontZ,repairGrassFrontFillArea:repair.metrics.grassFrontFillArea,meshAudit,fill:{isMesh:!!fill?.isMesh,sharedMaterial:fill?.material===grass?.material},divider:{isMesh:!!divider?.isMesh,count:dividerCount,min:dividerMin,max:dividerMax},sideProbes,sideFailures,entranceCapSamples,entranceCapFailures,entranceCapMax,grassFrontSamples,grassFrontFailures,gridSamples,gridFailures:gridFailures.slice(0,8)};
  },TARGETS);
  assert.equal(result.live?.version,1);assert.equal(result.repairVersion,1);assert.equal(result.live.materialsPreserved,true);
  assert.equal(result.live.addedDrawCalls,0);assert.equal(result.live.perFrameWork,0);assert.equal(result.live.centralSlabs,4);assert.equal(result.live.grassFillMaterialMatched,true);assert(result.fill.isMesh&&result.fill.sharedMaterial);assert.equal(result.live.grassCarrierParts,result.repairGrassCarrierParts);assert(result.live.grassCarrierParts>=18);
  assert.deepEqual(result.repairGrassSeamWindows,[[224.1,130.5,224.5,130.76],[225.05,130.5,225.55,130.76]]);assert(result.repairGrassSeamArea>0);
  assert.equal(result.repairGrassFrontZ,128.58658);assert(result.repairGrassFrontFillArea>0);
  assert.deepEqual([...result.live.meshes].sort(),[...TARGETS,'8_REF_AYIRICI'].sort());assert(result.meshAudit.every(row=>row.isMesh&&row.indexed&&row.materials>0&&['normal','position'].every(key=>row.attributes.includes(key))),JSON.stringify(result.meshAudit));
  assert(result.divider.isMesh);assert.equal(result.divider.count,1242);assert(Math.abs(result.divider.min-9.38008564)<.0001);assert(Math.abs(result.divider.max-9.42494970)<.0001);
  assert.deepEqual(result.sideFailures,[]);assert(result.sideProbes.length>=12&&result.sideProbes.length<=40,JSON.stringify(result.sideProbes));
  assert.deepEqual(result.entranceCapFailures,[],JSON.stringify(result.entranceCapSamples));assert.equal(result.entranceCapSamples.length,70);assert(result.entranceCapMax<=9.425,JSON.stringify(result.entranceCapSamples));
  assert.deepEqual(result.grassFrontFailures,[],JSON.stringify(result.grassFrontSamples));assert.equal(result.grassFrontSamples.length,14);
  assert.equal(result.gridSamples,200);assert.deepEqual(result.gridFailures,[]);
  console.log('PASS map-edge live finish',JSON.stringify({mobile,meshes:result.live.meshes.length,divider:result.divider.count,sideProbes:result.sideProbes.length,gridSamples:result.gridSamples}));
 });
};
