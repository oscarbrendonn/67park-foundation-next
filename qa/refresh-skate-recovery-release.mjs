// Asserted mechanical cache/integration edits; never rebuild from old sources.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='skate-corner-recovery-1',changed=[];
const edit=(file,change)=>{const url=new URL(file,root),old=fs.readFileSync(url,'utf8'),next=change(old);if(next!==old){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}};
const replaceOnce=(source,before,after,file)=>{
 if(source.includes(after))return source;
 if(source.split(before).length!==2)throw Error('Ambiguous recovery integration: '+file+' '+before.slice(0,80));
 return source.replace(before,after);
};
for(const file of ['island/runtime.js','island/runtime.bundle.js'])edit(file,source=>{
 const line="import {prepareCameraMeshes} from '../app/feel-camera-meshes.js?v="+revision+"';\n";
 let next=source.includes(line)?source:line+source;
 const rails="import {installSkateRailFinish} from '../app/party/skate-rail-finish.js?v=1';\n";
 if(!next.includes(rails))next=rails+next;
 next=next.replace(/repairs\/map-edge-finish-1\.json(?:\?v=[a-zA-Z0-9_-]+)?/g,'repairs/map-edge-finish-1.json?v='+revision);
 if(file==='island/runtime.js'&&!next.includes('const completedWorld='))next=replaceOnce(next,
  'return installLobbyCourts(installHouseRoofSupports(installIslandSwimBoundary(world)));',
  'const completedWorld=installLobbyCourts(installHouseRoofSupports(installIslandSwimBoundary(world)));\nawait prepareCameraMeshes(completedWorld);\nrenderer.domElement.dataset.cameraMeshesReady="'+revision+'";\nreturn completedWorld;',file);
 else if(file==='island/runtime.bundle.js') {
  // `no` loads only the central buildings; index the exported, complete world.
  const early='\n// Complete cooperative camera indexing before exposing gameplay controls.\nconst __beforeCameraPreparation=no;\nno=async options=>{const world=await __beforeCameraPreparation(options);await prepareCameraMeshes(world);options.renderer.domElement.dataset.cameraMeshesReady="'+revision+'";return world;};\n';
  next=next.replace(early,'');
  if(!next.includes('async function __parkDriveRuntime(options){const world=__parkInstallDriving('))next=replaceOnce(next,
   'async function __parkDriveRuntime(options){return __parkInstallDriving(await __parkCourtRuntime(options))}',
   'async function __parkDriveRuntime(options){const world=__parkInstallDriving(await __parkCourtRuntime(options));if(!world.blockers?.length)throw Error("Camera preparation needs the loaded island");const cameraPreparation=await prepareCameraMeshes(world);options.renderer.domElement.dataset.cameraMeshPreparation=JSON.stringify(cameraPreparation);options.renderer.domElement.dataset.cameraMeshesReady="'+revision+'";return world;}',file);
 }
 if(file==='island/runtime.js'&&!next.includes('const cameraPreparation=await prepareCameraMeshes(completedWorld)'))next=next.replace('await prepareCameraMeshes(completedWorld);',
  'if(!completedWorld.blockers?.length)throw Error("Camera preparation needs the loaded island");\nconst cameraPreparation=await prepareCameraMeshes(completedWorld);\nrenderer.domElement.dataset.cameraMeshPreparation=JSON.stringify(cameraPreparation);');
 // Existing party finishing replaces twelve coping/accent geometries. Apply
 // its idempotent installer before indexing, rather than on the first frame.
 next=replaceOnce(next,file==='island/runtime.js'?'const cameraPreparation=await prepareCameraMeshes(completedWorld);':'const cameraPreparation=await prepareCameraMeshes(world);',
  file==='island/runtime.js'?'installSkateRailFinish(completedWorld);\nconst cameraPreparation=await prepareCameraMeshes(completedWorld);':'installSkateRailFinish(world);const cameraPreparation=await prepareCameraMeshes(world);',file+' rails before camera');
 return next;
});
edit('app/claude-gorilla-runtime.js',s=>s.replace(/\.\/feel-camera-meshes\.js(?:\?v=[a-zA-Z0-9_-]+)?/g,'./feel-camera-meshes.js?v='+revision));
edit('app/party/party-pack.js',s=>s.replace(/\.\/party-audio\.js\?v=[a-zA-Z0-9_-]+/g,'./party-audio.js?v='+revision));
edit('app/chunk-G7D6MVRW.js',s=>replaceOnce(s,'function Jb(){if(J)',
 'function Jb(){if(je||(typeof document!=="undefined"&&document.hidden))return;if(J)','ambient audio unlock'));
for(const file of ['app/main.js','explore/explore.js'])edit(file,s=>s
 .replace(/runtime\.bundle\.js\?v=[a-zA-Z0-9_-]+/g,'runtime.bundle.js?v='+revision)
 .replace(/claude-gorilla-runtime\.js\?v=[a-zA-Z0-9_-]+/g,'claude-gorilla-runtime.js?v='+revision)
 .replace(/wardrobe-gpu-handoff\.js(?:\?v=[a-zA-Z0-9_-]+)?/g,'wardrobe-gpu-handoff.js?v='+revision));
for(const file of ['index.html','explore/index.html','play/index.html'])edit(file,s=>s
 .replace(/app\/main\.js\?v=[a-zA-Z0-9_-]+/g,'app/main.js?v='+revision)
 .replace(/explore\.js\?v=[a-zA-Z0-9_-]+/g,'explore.js?v='+revision)
 .replace(/app\/party\/party-pack\.js\?v=[a-zA-Z0-9_-]+/g,'app/party/party-pack.js?v='+revision)
 .replace(/app\/party\/party-audio\.js\?v=[a-zA-Z0-9_-]+/g,'app/party/party-audio.js?v='+revision)
 .replace(/(__partyConfig=\{runtime:")[^"]+/,`$1${revision}`));
// Preserve both legacy import keys so every caller shares one game store.
edit('index.html',s=>s.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_m,start,json,end)=>{
 const map=JSON.parse(json);
 for(const key of Object.keys(map.imports))if(/^\/67park-foundation-next\/app\/chunk-G7D6MVRW\.js(?:\?v=[a-zA-Z0-9_-]+)?$/.test(key))map.imports[key]='/67park-foundation-next/app/chunk-G7D6MVRW.js?v='+revision;
 return start+JSON.stringify(map)+end;
}));
edit('qa/map-edge-finish.live.cjs',s=>s.replace(/repairs\/map-edge-finish-1\.json(?:\?v=[a-zA-Z0-9_-]+)?/g,'repairs/map-edge-finish-1.json?v='+revision));
edit('qa/plaza-climb.browser.cjs',s=>s.replace(/claude-gorilla-runtime\.js\?v=[a-zA-Z0-9_-]+/g,'claude-gorilla-runtime.js?v='+revision));
edit('package.json',s=>{
 const add='qa/party-audio-muted.test.mjs qa/wardrobe-gpu-handoff.test.mjs qa/skate-recovery-release.test.mjs';
 return s.includes(add)?s:replaceOnce(s,'qa/jump-input.test.cjs"','qa/jump-input.test.cjs '+add+'"','package.json');
});
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),changed}));
