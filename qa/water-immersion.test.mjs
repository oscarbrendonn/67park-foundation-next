import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {immerseSwimmingVisual,applyParkWaterSurface} from '../app/park-water-surface.js';
import {createPastelWater} from '../island/pastel-water-v23.js';

function swimmer(level) {
 const root=new THREE.Group();root.rotation.x=1.18;root.position.set(20,level+.49,30);
 return {root,p:{x:20,y:level+.58,z:30},world:{water:()=>true,sea:()=>level}};
}
test('all public entry notices request the new water adapter',()=>{
 for(const path of ['index.html','play/index.html','explore/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html']){
  const html=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(html,/github-preview-notice\.js\?v=water-5-all-swim/);
 }
 assert.match(readFileSync(new URL('../app/github-preview-notice.js',import.meta.url),'utf8'),/park-water-surface\.js\?v=park-water-5-all-swim/);
});
test('pond, coast and elevated pool immerse at their own water level without moving the capsule',()=>{
 for(const level of [8.91888237,8.77685173,9.69303128]){
  const {root,p,world}=swimmer(level),body={...p},rotation=root.rotation.clone();
  immerseSwimmingVisual(world,root,p);
  assert(Math.abs(root.position.y-(level+.02))<1e-10);
  assert.deepEqual(p,body);assert(root.rotation.equals(rotation));
  const y=root.position.y;immerseSwimmingVisual(world,root,p);assert.equal(root.position.y,y,'no repeated lowering in one visual frame');
 }
});
test('dry land/bowl, air, homes, non-swimming and other visuals retain their pose',()=>{
 for(const change of [
  f=>{f.world.water=()=>false;},f=>{f.p.y+=2;},f=>{f.root.rotation.x=0;},
  f=>{f.root.position.x+=1;},f=>{f.world.homeScene={active:true};},f=>{f.world.sea=()=>NaN;}
 ]){
  const f=swimmer(9);change(f);const before=f.root.position.clone();
  immerseSwimmingVisual(f.world,f.root,f.p);assert(f.root.position.equals(before));
 }
});
test('normal per-frame pose rebuild and shoreline exit restore the original dry height',()=>{
 const {root,p,world}=swimmer(9);
 for(let i=0;i<60;i++){root.position.y=9.49;immerseSwimmingVisual(world,root,p);assert(Math.abs(root.position.y-9.02)<1e-10);}
 world.water=()=>false;root.rotation.x=0;root.position.y=9.49;
 immerseSwimmingVisual(world,root,p);assert.equal(root.position.y,9.49);
});
test('coast gains approved ripple contrast while masks, wave clock, geometry and pond appearance are preserved',()=>{
 const scene=new THREE.Scene(),terrain=new THREE.Group();scene.add(terrain);
 const U={zaman:{value:0},oyuncu:{value:new THREE.Vector2()},karaDoku:{value:null},karaMin:{value:new THREE.Vector2()},karaBoy:{value:new THREE.Vector2(1,1)},oyuncuSuda:{value:0}};
 const source=createPastelWater(U,{}),fragment=source.fragmentShader,vertex=source.vertexShader,uniforms=source.uniforms;
 const ocean=new THREE.Mesh(new THREE.PlaneGeometry(5,5),source);ocean.name='KIMI_WATERBODY_GORUNUR';scene.add(ocean);
 const original=new THREE.MeshBasicMaterial(),pond=new THREE.Mesh(new THREE.PlaneGeometry(2,2),original);pond.name='67D_PARK_WATER_UNIFIED_V65';terrain.add(pond);
 const dry=new THREE.Mesh(new THREE.PlaneGeometry(1,1),original);dry.name='9_GOLET_MINI';terrain.add(dry);
 let disposed=0;const world={scene,terrain,renderer:{domElement:{dataset:{}}},dispose(){disposed++;},water:()=>true,sea:()=>9};
 const oceanGeometry=ocean.geometry,pondGeometry=pond.geometry,objects=[];scene.traverse(o=>objects.push(o));
 const report=applyParkWaterSurface(world),pondMaterial=pond.material;
 assert.equal(applyParkWaterSurface(world),report);assert.equal(pond.material,pondMaterial);
 assert.equal(ocean.material,source);assert.equal(ocean.geometry,oceanGeometry);assert.equal(pond.geometry,pondGeometry);
 assert.equal(source.uniforms,uniforms);assert.equal(source.uniforms.uTime,U.zaman);assert.equal(pondMaterial.uniforms.uTime,U.zaman);
 assert.equal(source.uniforms.uAmp.value,.012);assert.equal(pondMaterial.uniforms.uAmp.value,.025);
 assert.equal(source.vertexShader,vertex);assert.equal(pondMaterial.vertexShader,vertex.replace('p.z+=','p.y+='));
 const mask='if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))&&texture2D(uLand,uv).r>.5)discard;';
 assert(source.fragmentShader.includes(mask));assert(!pondMaterial.fragmentShader.includes(mask));
 assert.equal(pondMaterial.fragmentShader,source.fragmentShader.replace(mask,''));
 assert(source.fragmentShader.includes('sheen*.20*detail'));assert.equal(dry.visible,false);
 const after=[];scene.traverse(o=>after.push(o));assert.deepEqual(after,objects);
 source.userData.update(.016);assert.equal(source.uniforms.uTime,U.zaman,'existing water update retained');
 world.dispose();assert.equal(disposed,1);assert.equal(pond.material,original);assert.equal(source.fragmentShader,fragment);
 assert.equal(world.parkSwimVisual,undefined);
 oceanGeometry.dispose();pondGeometry.dispose();dry.geometry.dispose();source.dispose();original.dispose();
});
