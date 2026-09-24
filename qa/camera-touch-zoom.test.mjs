import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {beginCameraDrag,moveCameraDrag,endCameraDrag} from '../app/camera-pointer.js';
import {createCameraPresentation,firstPersonPose} from '../app/camera-presentation.js';
import {playerSettings,DEFAULTS,sanitizeSettings,setPlayerSetting,resetPlayerSettings} from '../app/player-settings.js';
import {changeCameraZoom,readCameraZoom,flushCameraZoom,cameraZoomLabel} from '../app/camera-zoom.js';
globalThis.window={innerWidth:390,innerHeight:844};
function fixture(){
 const captures=new Set(),canvas={tagName:'CANVAS',closest:()=>null,setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
 const event=(id,x=200,y=400,extra={})=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,target:canvas,...extra});
 return {captures,canvas,event};
}
test('two canvas fingers zoom both directions without rotating, with either lift order',()=>{
 for(const lifted of [1,2]){
  const {event,captures}=fixture();let drag=beginCameraDrag(event(1));
  drag=beginCameraDrag(event(2,280),drag,{pinch:true});
  assert.deepEqual(moveCameraDrag(drag,event(2,360)),{x:0,y:0,zoomScale:.5});
  assert.deepEqual(moveCameraDrag(drag,event(2,280)),{x:0,y:0,zoomScale:2});
  assert.equal(moveCameraDrag(drag,event(3,300)),null);
  drag=endCameraDrag(drag,event(lifted));
  const remaining=lifted===1?2:1,x=remaining===2?280:200;
  assert.deepEqual(moveCameraDrag(drag,event(remaining,x+10)),{x:10,y:0});
  assert.equal(endCameraDrag(drag),null);assert.equal(captures.size,0);
 }
});
test('UI, left movement region and minigame aim cannot become a pinch',()=>{
 const {event}=fixture();let drag=beginCameraDrag(event(1));
 assert.equal(beginCameraDrag(event(2,80,700),drag,{pinch:true}),drag);assert(!drag.second);
 beginCameraDrag(event(2,280,400,{target:{tagName:'BUTTON'}}),drag,{pinch:true});assert(!drag.second);
 beginCameraDrag(event(2,280),drag);assert(!drag.second);
 assert.deepEqual(moveCameraDrag(drag,event(1,220)),{x:20,y:0});
 endCameraDrag(drag);
});
test('cancel/reset releases both touches; near-coincident fingers stay finite',()=>{
 const {event,captures}=fixture();let drag=beginCameraDrag(event(1));
 beginCameraDrag(event(2,201),drag,{pinch:true});
 assert.equal(moveCameraDrag(drag,event(2,200)).zoomScale,1);
 assert.equal(endCameraDrag(drag),null);assert.equal(captures.size,0);
});
test('skate movement reset preserves the active camera boom, full reset still clears it',()=>{
 const source=fs.readFileSync(new URL('../app/claude-gorilla-runtime.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function Ee('),source.indexOf('function Ft('));
 let resets=0;
 const context={feelTravel(){},feelBoom:{reset(){resets++}},cameraPresentation:{reset(){}},Je:null,u:{enabled:false},Ae:0,ze:0,$:{},V:null,Ht(){}};
 vm.createContext(context);vm.runInContext(body+';Ee(true);',context);assert.equal(resets,0);
 vm.runInContext('Ee();',context);assert.equal(resets,1);
 assert(source.includes('const orbitDrag=K?$:null;Ee(K);$=orbitDrag'));
});
test('first person looks from eye height and only hides the local avatar, restoring prior visibility',()=>{
 const pose=firstPersonPose({x:1,y:9,z:3},0,0);
 assert.deepEqual(pose.position,{x:1,y:10.45,z:3});assert.deepEqual(pose.target,{x:1,y:10.45,z:2});
 const view={near:.5,updateProjectionMatrix(){}},local={visible:true},remote={visible:true},p=createCameraPresentation();
 assert(p.apply(view,local,{firstPerson:true,distance:.5}));assert.equal(local.visible,false);assert.equal(remote.visible,true);assert.equal(view.near,.06);
 p.restore();assert.equal(local.visible,true);assert.equal(view.near,.5);
 p.apply(view,local,{distance:1});p.apply(view,local,{distance:1.6});assert.equal(local.visible,false);
 p.apply(view,local,{distance:2});assert.equal(local.visible,true);
 local.visible=false;p.apply(view,local,{firstPerson:true});p.reset();assert.equal(local.visible,false);
});
test('game entries resolve camera and party runtime aliases to the same updated modules',()=>{
 for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','style-studio/index.html']){
  const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const map=JSON.parse(source.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const runtime='/67park-foundation-next/app/claude-gorilla-runtime.js';
  // Same movement implementation, with Cat and Ninja added to the native-base allowlist.
  // Camera/input rules are unchanged; all prior aliases remain singletons.
  const revision='originals-1';
  for(const suffix of ['','?v=skate-corner-recovery-1','?v=camera-touch-1','?v=camera-touch-2'])assert.equal(map[runtime+suffix],runtime+'?v='+revision);
  assert.equal(map['/67park-foundation-next/app/feel-camera.js'],'/67park-foundation-next/app/feel-camera.js?v=camera-touch-1');
  for(const suffix of ['','?v=foundation-basics-1','?v=recovery-graphics-1','?v=camera-settings-1'])assert.equal(map['/67park-foundation-next/app/player-settings.js'+suffix],'/67park-foundation-next/app/player-settings.js?v=camera-settings-1');
  assert.equal(map['/67park-foundation-next/app/party/settings-panel.js?v=recovery-graphics-1'],'/67park-foundation-next/app/party/settings-panel.js?v=camera-settings-1');
 }
});
test('camera distance is bounded, adopts old preferences and preserves the default view',()=>{
 assert.equal(sanitizeSettings({touchSensitivity:1.4}).cameraDistance,6.8);
 for(const [input,expected] of [[0,.5],[100,12],[NaN,6.8],[Infinity,6.8],['1',6.8]])assert.equal(sanitizeSettings({cameraDistance:input}).cameraDistance,expected);
 assert.equal(cameraZoomLabel(.5),'First person');assert.equal(cameraZoomLabel(6.8),'6.8 m');
 assert.equal(DEFAULTS.cameraDistance,6.8);
});
test('pinch and settings share one value; gesture writes are batched and reset is reversible',()=>{
 let writes=0;const values=new Map([['character','keep']]);
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes++;values.set(key,value)}};
 for(let i=0;i<100;i++)changeCameraZoom(1+i/10);
 assert.equal(writes,0);assert.equal(readCameraZoom(),10.9);assert.equal(playerSettings.cameraDistance,10.9);
 flushCameraZoom();assert.equal(writes,1);flushCameraZoom();assert.equal(writes,1);
 assert.equal(JSON.parse(values.get('67park.feel-lab.player-settings.v1')).cameraDistance,10.9);
 setPlayerSetting('cameraDistance',.5);assert.equal(readCameraZoom(),.5);
 resetPlayerSettings();assert.equal(readCameraZoom(),6.8);assert.equal(values.get('character'),'keep');
 const source=fs.readFileSync(new URL('../app/claude-gorilla-runtime.js',import.meta.url),'utf8');
 assert(source.includes('ke=changeCameraZoom(ke*delta.zoomScale)'));
 assert(source.includes('ke=changeCameraZoom(ke+i.deltaY*.004)'));
 assert(source.includes('return false;ke=readCameraZoom();'));
 assert(!source.includes('ke=At.distance'));
});
