import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const revision='skate-corner-recovery-1';
test('camera preparation completes before the world is returned, with one shared module instance',()=>{
 for(const file of ['island/runtime.js','island/runtime.bundle.js']){
  const source=read(file);assert(source.includes("../app/feel-camera-meshes.js?v="+revision));
  assert(source.includes('await prepareCameraMeshes('),file);
  assert(source.includes('dataset.cameraMeshesReady="'+revision+'"'),file);
  assert(source.includes('repairs/map-edge-finish-1.json?v='+revision),file);
 }
 assert(read('app/claude-gorilla-runtime.js').includes('./feel-camera-meshes.js?v='+revision));
 const main=read('app/main.js');
 for(const name of ['claude-gorilla-runtime.js','wardrobe-gpu-handoff.js','runtime.bundle.js'])assert(main.includes(name+'?v='+revision),name);
 assert(read('qa/plaza-climb.browser.cjs').includes('claude-gorilla-runtime.js?v='+revision),'plaza controller observer must import the same runtime singleton as main');
 assert(read('app/party/party-pack.js').includes('./party-audio.js?v='+revision));
 assert(read('index.html').includes('app/main.js?v='+revision));
 assert(read('index.html').includes('app/party/party-pack.js?v='+revision));
 assert(read('index.html').includes('__partyConfig={runtime:"'+revision+'"'));
 assert(read('explore/index.html').includes('explore.js?v='+revision));
 assert(read('explore/explore.js').includes('runtime.bundle.js?v='+revision));
 const imports=JSON.parse(read('index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 for(const key of ['chunk-G7D6MVRW.js','chunk-G7D6MVRW.js?v=online-next-1'])assert.equal(imports['/67park-foundation-next/app/'+key],'/67park-foundation-next/app/chunk-G7D6MVRW.js?v='+revision);
});

test('shipped world export awaits camera preparation after all island layers, not the central-building loader',async()=>{
 const source=read('island/runtime.bundle.js');
 assert(!source.includes('const __beforeCameraPreparation=no;'));
 const start=source.indexOf('async function __parkDriveRuntime('),end=source.indexOf('export{__parkDriveRuntime',start);
 assert(start>=0&&end>start);
 const events=[],world={blockers:[{}]},options={renderer:{domElement:{dataset:{}}}};
 let finish;const pending=new Promise(resolve=>{finish=resolve;});
 const loader=Function('__parkInstallDriving','__parkCourtRuntime','installSkateRailFinish','prepareCameraMeshes',source.slice(start,end)+';return __parkDriveRuntime;')(
  w=>{events.push('driving');return w;},async()=>{events.push('island loaded');return world;},w=>{assert.equal(w,world);events.push('existing rail finish');},async w=>{assert.equal(w,world);assert(w.blockers.length);events.push('prepare');await pending;return {geometries:1};});
 const result=loader(options);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(events,['island loaded','driving','existing rail finish','prepare']);assert.equal(options.renderer.domElement.dataset.cameraMeshesReady,undefined);
 finish();assert.equal(await result,world);assert.equal(options.renderer.domElement.dataset.cameraMeshesReady,revision);
 assert.deepEqual(JSON.parse(options.renderer.domElement.dataset.cameraMeshPreparation),{geometries:1});
});
