import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {playerSettings} from '../app/player-settings.js';
import {createRunningCamera} from '../app/running-camera.js';
import {createPunchBurst,punchBurstGeometry,PUNCH_BURST_SECONDS} from '../app/punch-burst.js';

test('running first person is at eye level, hides only local visual, restores near plane and visibility',()=>{
 const camera=new THREE.PerspectiveCamera(55,390/844,.1,200),local=new THREE.Group(),peer=new THREE.Group(),adapter=createRunningCamera();
 const feet={x:3,y:2,z:4};playerSettings.cameraDistance=.5;
 const first=adapter.update(camera,local,feet,0,.3);
 assert(first.firstPerson);assert.equal(local.visible,false);assert.equal(peer.visible,true);assert.equal(camera.near,.06);assert.deepEqual(camera.position.toArray(),[3,3.45,4]);
 playerSettings.cameraDistance=8;adapter.update(camera,local,feet,0,.3);
 assert.equal(local.visible,true);assert.equal(camera.near,.1);
 local.visible=false;playerSettings.cameraDistance=.5;adapter.update(camera,local,feet,0,.3);adapter.reset();assert.equal(local.visible,false);
 playerSettings.cameraDistance=6.8;
});
test('third-person keeps course collision resolver; eye view never uses orbit correction',()=>{
 const adapter=createRunningCamera(),camera=new THREE.PerspectiveCamera(),local=new THREE.Group(),feet={x:0,y:0,z:0};let called=0;
 const resolve=(pose,camera)=>{called++;camera.position.z=1;};
 playerSettings.cameraDistance=6.8;adapter.update(camera,local,feet,0,0,{resolve});assert.equal(called,1);assert.equal(local.visible,false);
 playerSettings.cameraDistance=.5;adapter.update(camera,local,feet,0,0,{resolve});assert.equal(called,1);
 adapter.reset();playerSettings.cameraDistance=6.8;
});
test('burst has 24 triangles, one pooled mesh, no idle drawing, bounded lifetime and disposal',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),burst=createPunchBurst(scene);
 assert.equal(burst.stats.triangles,24);assert.equal(scene.children.length,1);assert.equal(burst.mesh.visible,false);
 assert.equal(burst.trigger({x:0,y:.555,z:0},0),true);burst.update(.01,camera);assert.equal(burst.mesh.visible,true);
 assert.equal(burst.mesh.position.z,1.05);assert.equal(burst.mesh.material.depthWrite,false);
 for(let i=0;i<100;i++)burst.trigger({x:0,y:.555,z:0},0);
 assert.equal(scene.children.length,1);burst.update(PUNCH_BURST_SECONDS+.01,camera);assert.equal(burst.mesh.visible,false);
 let disposed=0;burst.mesh.geometry.addEventListener('dispose',()=>disposed++);burst.mesh.material.addEventListener('dispose',()=>disposed++);burst.dispose();assert.equal(disposed,2);assert.equal(scene.children.length,0);
 assert.equal(burst.trigger({x:0,y:0,z:0},0),false);
});
test('reduced motion keeps fixed shape and gentle fade; disabled feel suppresses effect',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let enabled=true;
 const burst=createPunchBurst(scene,{reducedMotion:()=>true,enabled:()=>enabled});burst.trigger({x:0,y:0,z:0},0);burst.update(.01,camera);const scale=burst.mesh.scale.x,opacity=burst.mesh.material.opacity;burst.update(.1,camera);assert.equal(burst.mesh.scale.x,scale);assert(burst.mesh.material.opacity<opacity);
 enabled=false;burst.update(.01,camera);assert.equal(burst.mesh.visible,false);assert.equal(burst.trigger({x:0,y:0,z:0},0),false);burst.dispose();
 const geometry=punchBurstGeometry();assert(geometry.attributes.position.array.every(Number.isFinite));geometry.dispose();
});
test('non-running camera/input remain unchanged apart from character and shared lobby-contact cache keys',()=>{
 const normalizeEntry=source=>{
  const match=source.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const characterModules=['balloon/chunk-U4P5F7P3.js','app/chunk-G7D6MVRW.js','app/chunk-55YKN7VY.js','race/race.js','rockets/rockets.js','sports/sports.js','skybound-soft/course-edf81ca8e2af595ed4d3.js','app/main.js','app/avatar-entry-runtime.js','app/claude-remote-character.js','app/playable-character.js','app/native-character.js','app/studio-catalog.js','app/gorilla-studio-items.js','app/claude-gorilla-runtime.js','app/minigame-character-motion.js'];
  if(match){const map=JSON.parse(match[1]);for(const key of Object.keys(map.imports)){
   if(characterModules.some(file=>key.split('?')[0]==='/67park-foundation-next/'+file))delete map.imports[key];
   // Keep the aliases themselves and all actual minigame camera/input code.
   // Only the explicitly advanced city-contact URL may differ this release.
   else if(key.split('?')[0]==='/67park-foundation-next/app/chunk-OZ77422N.js'){
    assert(['/67park-foundation-next/app/chunk-OZ77422N.js?v=ride-jump-contact-1','/67park-foundation-next/app/chunk-OZ77422N.js?v=rail-corner-1'].includes(map.imports[key]));
    map.imports[key]='/67park-foundation-next/app/chunk-OZ77422N.js?v=LOBBY_CONTACT_REVISION';
   }
  }source=source.replace(match[1],JSON.stringify(map));}
  return source.replace(/(\.\/(?:race|rockets|sports)\.js\?v=)(?:online-next-1|gorilla-only-1|cat-character-1|cat-fit-glow-1)/g,'$1CHARACTER_REVISION');
 };
 for(const file of ['app/minigame-input.js','balloon/player-input.js','race/rally-orbit.js','race/index.html','balloon/index.html','rockets/index.html','sports/index.html']){
  const actual=fs.readFileSync(file,'utf8'),before=execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'});
  assert.equal(file.endsWith('.html')?normalizeEntry(actual):actual,file.endsWith('.html')?normalizeEntry(before):before,file);
 }
});
