import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

register(new URL('./three-test-loader.mjs',import.meta.url));
const T=await import('three');
const {applySidewalkMaterials,SIDEWALK_CORE,SIDEWALK_DISTRICTS}=await import('../app/sidewalk-materials.js');

function material(name,extra={}){
 return new T.MeshStandardMaterial({name,emissive:0x000000,emissiveIntensity:0,...extra});
}

function mesh(name,meshMaterial){
 const value=new T.Mesh(new T.PlaneGeometry(2,3),meshMaterial);
 value.name=name;value.position.set(name.length*.01,.25,-.5);value.rotation.set(.1,.2,.3);value.scale.set(1.2,.8,1.1);
 value.visible=name!=='CENTER_WHITE71_-1_-1';value.userData.physics={kind:'static',name};
 return value;
}

function fixture({omit=[],duplicate,wrongDistrict,invalidSource=false}={}){
 const scene=new T.Group(),terrain=new T.Group(),source=mesh('6_BORDUR',material(invalidSource?'wrong-sidewalk':'67_KALDIRIM_TABANI_M'));
 terrain.add(source);scene.add(terrain);
 const rim=material('CENTER73_RIM_SHARED',{color:0xd6ccc6,roughness:.48}),planter=mesh('CENTER73_PLANTER_19.617_-51.366',rim);
 const unrelated=mesh('ARCHITECTURE_KEEP',material('architecture',{color:0x553322}));
 const targets=new Map(),previous=new Map();
 for(const name of [...SIDEWALK_CORE,...Object.keys(SIDEWALK_DISTRICTS)]){
  if(omit.includes(name))continue;
  const targetMaterial=SIDEWALK_CORE.includes(name)&&name.startsWith('CENTER73_LAWN_RIM_')?rim:material(SIDEWALK_DISTRICTS[name]||'legacy-'+name);
  const value=mesh(name,targetMaterial);targets.set(name,value);previous.set(name,targetMaterial);scene.add(value);
 }
 if(wrongDistrict){targets.get(wrongDistrict).material=material('wrong-district');previous.set(wrongDistrict,targets.get(wrongDistrict).material);}
 if(duplicate)scene.add(mesh(duplicate,material(SIDEWALK_DISTRICTS[duplicate]||'duplicate')));
 scene.add(planter,unrelated);scene.updateMatrixWorld(true);
 return {scene,terrain,source,targets,previous,rim,planter,unrelated};
}

function snapshot(f){
 return {
  source:f.source.material,
  targets:[...f.targets.values()].map(value=>({value,material:value.material,geometry:value.geometry,visible:value.visible,position:value.position.toArray(),quaternion:value.quaternion.toArray(),scale:value.scale.toArray(),matrix:value.matrix.elements.slice(),world:value.matrixWorld.elements.slice(),physics:value.userData.physics})),
  planter:{material:f.planter.material,geometry:f.planter.geometry,physics:f.planter.userData.physics},
  unrelated:{material:f.unrelated.material,geometry:f.unrelated.geometry,physics:f.unrelated.userData.physics}
 };
}

function assertUnchanged(f,before){
 assert.equal(f.source.material,before.source);
 for(const row of before.targets){
  assert.equal(row.value.material,row.material,`${row.value.name} material changed`);assert.equal(row.value.geometry,row.geometry,`${row.value.name} geometry changed`);assert.equal(row.value.visible,row.visible,`${row.value.name} visibility changed`);
  assert.deepEqual(row.value.position.toArray(),row.position,`${row.value.name} position changed`);assert.deepEqual(row.value.quaternion.toArray(),row.quaternion,`${row.value.name} rotation changed`);assert.deepEqual(row.value.scale.toArray(),row.scale,`${row.value.name} scale changed`);
  assert.deepEqual(row.value.matrix.elements,row.matrix,`${row.value.name} matrix changed`);assert.deepEqual(row.value.matrixWorld.elements,row.world,`${row.value.name} world matrix changed`);assert.equal(row.value.userData.physics,row.physics,`${row.value.name} physics changed`);
 }
 assert.equal(f.planter.material,before.planter.material);assert.equal(f.planter.geometry,before.planter.geometry);assert.equal(f.planter.userData.physics,before.planter.physics);
 assert.equal(f.unrelated.material,before.unrelated.material);assert.equal(f.unrelated.geometry,before.unrelated.geometry);assert.equal(f.unrelated.userData.physics,before.unrelated.physics);
}

test('sidewalk reassignment shares one authored material without touching geometry, transforms, physics, or planter rims',()=>{
 assert.equal(SIDEWALK_CORE.length,21);assert.equal(new Set(SIDEWALK_CORE).size,SIDEWALK_CORE.length);
 assert.equal(SIDEWALK_DISTRICTS['WEST102_floor:COURTYARD102_paving'],'COURTYARD102_paving');
 assert.equal(SIDEWALK_DISTRICTS['SPORTS97_FLOOR_SPORTS97_paving'],'SPORTS97_paving');
 assert.equal(SIDEWALK_DISTRICTS['SPORTS97_SOLID_SPORTS97_paving'],undefined);
 const f=fixture(),before=snapshot(f),result=applySidewalkMaterials(f.scene,f.terrain);
 assert.equal(result.version,1);assert.equal(result.source,'6_BORDUR');assert.equal(result.material,'67_KALDIRIM_TABANI_M');
 assert.deepEqual(result.meshes,[...SIDEWALK_CORE,...Object.keys(SIDEWALK_DISTRICTS)]);assert.deepEqual(result.absentDistricts,[]);
 assert.equal(result.geometryChanged,false);assert.equal(result.collisionChanged,false);assert.equal(result.addedDrawCalls,0);assert.equal(result.perFrameWork,0);
 for(const target of f.targets.values())assert.equal(target.material,before.source,target.name);
 for(const row of before.targets){
  assert.equal(row.value.geometry,row.geometry);assert.equal(row.value.visible,row.visible);assert.deepEqual(row.value.position.toArray(),row.position);assert.deepEqual(row.value.quaternion.toArray(),row.quaternion);assert.deepEqual(row.value.scale.toArray(),row.scale);assert.deepEqual(row.value.matrix.elements,row.matrix);assert.deepEqual(row.value.matrixWorld.elements,row.world);assert.equal(row.value.userData.physics,row.physics);
 }
 assert.equal(f.planter.material,before.planter.material,'shared lawn-rim material mutated decorative planter');assert.equal(f.planter.material,f.rim);
 assert.equal(f.unrelated.material,before.unrelated.material);assert.equal(applySidewalkMaterials(f.scene,f.terrain),result,'result must be idempotent');
});

test('sidewalk reassignment permits absent districts but is atomic for missing, duplicate, invalid, or changed present targets',()=>{
 const absent=Object.keys(SIDEWALK_DISTRICTS).slice(0,2),optional=fixture({omit:absent}),optionalBefore=snapshot(optional);
 const optionalResult=applySidewalkMaterials(optional.scene,optional.terrain);
 assert.deepEqual(optionalResult.absentDistricts,absent);for(const target of optional.targets.values())assert.equal(target.material,optionalBefore.source);
 for(const make of [
  ()=>fixture({omit:[SIDEWALK_CORE[0]]}),
  ()=>fixture({duplicate:SIDEWALK_CORE[1]}),
  ()=>fixture({wrongDistrict:'WEST102_floor:COURTYARD102_paving'}),
  ()=>fixture({invalidSource:true})
 ]){
  const f=make(),before=snapshot(f);assert.throws(()=>applySidewalkMaterials(f.scene,f.terrain));assertUnchanged(f,before);assert.equal(f.terrain.userData.sidewalkMaterials1,undefined);
 }
});

test('published runtimes run sidewalk reassignment once after map-edge repair and before final surface setup',()=>{
 for(const file of ['../island/runtime.js','../island/runtime.bundle.js']){
  const source=fs.readFileSync(new URL(file,import.meta.url),'utf8'),mapEdge=source.indexOf('dataset.mapEdgeFinish1='),sidewalk=source.indexOf('dataset.sidewalkMaterials1='),after=source.indexOf('dataset.stairGeometry=',sidewalk);
  assert(source.includes("import {applySidewalkMaterials} from '../app/sidewalk-materials.js?v=sidewalk-materials-1'"),file);
  assert.equal(source.split('dataset.sidewalkMaterials1=').length,2,file);assert(mapEdge>=0&&sidewalk>mapEdge&&after>sidewalk,file);
 }
 const release=JSON.parse(execFileSync(process.execPath,['qa/refresh-sidewalk-release.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 assert.deepEqual(release,{revision:'sidewalk-materials-1',write:false,files:[]});
 const runtime=fs.readFileSync(new URL('../island/runtime.js',import.meta.url),'utf8');
 assert(runtime.indexOf('dataset.sidewalkMaterials1=')<runtime.indexOf('const surfaceFinish=installSurfaceFinish('));
});
