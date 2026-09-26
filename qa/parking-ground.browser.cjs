const {chromium}=require('playwright'),fs=require('node:fs');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const candidate=process.argv.includes('--candidate');
const out='.qa-results/parking-ground-20260926/'+new Date().toISOString().replaceAll(':','-');
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions()),ctx=await browser.newContext({viewport:{width:1100,height:900},serviceWorkers:'block'}),page=await ctx.newPage();
 const report={errors:[],out,candidate};fs.mkdirSync(out,{recursive:true});
 try{
  await ctx.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));});
  page.on('pageerror',e=>report.errors.push(String(e)));
  if(candidate){
   const {patchParkingGroundBundle}=await import('./refresh-parking-ground-bundle.mjs');
   const original=execFileSync('git',['show','HEAD:island/runtime.bundle.js'],{encoding:'utf8',maxBuffer:8*1024*1024});
   await page.route('**/island/runtime.bundle.js*',r=>r.fulfill({contentType:'text/javascript',body:patchParkingGroundBundle(original)}));
   for(const file of ['parking-ground-finish.js','parked-fleet.js'])await page.route('**/app/'+file+'*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('app/'+file,'utf8')}));
  }
  await page.goto('https://oscarbrendonn.github.io/67park-foundation-next/?v=horn-hold-1&claudeQA=passive&qa=parking-ground',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&typeof __tp==='function',null,{timeout:120000});
  await page.evaluate(()=>__tp([-119,12,-158]));
  report.geometry=await page.evaluate(async()=>{
   const w=__islandWorld,T=await import('three'),ray=new T.Raycaster(),meshes=[];
   w.terrain.traverse(o=>{if(o.isMesh&&['5_KB_SPOR_ZEMIN','8_KB_UST_PAD_CIZGILERI','5_YOL','7_KALDIRIM_TABANI','6_BORDUR'].includes(o.name))meshes.push(o);});
   const probes=[];
   for(const z of [-171,-168.8,-165,-159,-153,-148.8,-146])for(const x of [-116,-115,-114,-113,-112,-111,-110,-109,-108.25,-108,-107]){
    ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));probes.push({x,z,ground:w.ground(x,z),hits:ray.intersectObjects(meshes).slice(0,2).map(h=>({name:h.object.name,y:h.point.y}))});
   }
   const sports=w.scene.getObjectByName('NORTHWEST_SPORTS_V97');
   return {probes,finish:sports.userData.parkingGroundFinish?.stats,fleetY:sports.userData.parkedFleet38.root.position.y,rootMatrix:w.terrain.matrixWorld.elements,meshes:meshes.map(m=>({name:m.name,matrix:m.matrixWorld.elements,bounds:new T.Box3().setFromObject(m)}))};
  });
  if(candidate){
   assert.equal(report.geometry.finish.revision,'parking-ground-1');
   assert.equal(report.geometry.fleetY,-.13);
   const heights=report.geometry.probes.filter(p=>p.z===-159&&p.x!==-114).map(p=>p.ground);
   assert(Math.max(...heights)-Math.min(...heights)<.001,'old slab edge is level with approach');
   if(await page.evaluate(()=>__candy.state().board))await page.keyboard.press('KeyV');
   await page.evaluate(()=>__tp([-111,10,-159]));
   await page.evaluate(async()=>{for(let n=0;n<100;n++)await new Promise(requestAnimationFrame);});
   report.walk=await page.evaluate(async()=>{
    const {claudeGorillaState}=await import('/67park-foundation-next/app/claude-gorilla-runtime.js?v=skate-corner-recovery-1');
    const trace=[],start=performance.now(),i=__eggyInput.input;
    while(performance.now()-start<7000){
     const p=__eggyInput.playerRef.body.translation(),dx=-105-p.x,dz=-159-p.z,d=Math.hypot(dx,dz),yaw=__islandWorld.camera.userData.feelLab.yaw,s=claudeGorillaState();
     trace.push({x:p.x,y:p.y,z:p.z,grounded:s.grounded});
     if(d<.12)break;
     const k=Math.min(.8,Math.max(.17,d*.7))/d;
     i.x=(dx*Math.cos(yaw)-dz*Math.sin(yaw))*k;i.z=(-dx*Math.sin(yaw)-dz*Math.cos(yaw))*k;i.run=false;
     await new Promise(requestAnimationFrame);
    }i.x=i.z=0;return trace;
   });
   const last=report.walk.at(-1);
   assert(Math.hypot(last.x+105,last.z+159)<.15,'walk across former slab lip');
   assert(report.walk.every(p=>p.grounded),'no support loss across parking join');
   assert(Math.max(...report.walk.map(p=>p.y))-Math.min(...report.walk.map(p=>p.y))<.04,'no step or drop at retired slab');
  }
  await page.evaluate(()=>{const w=__islandWorld,old=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...a){old?.apply(this,a);if(!window.__parkingView)return;w.camera.position.fromArray(__parkingView.p);w.camera.lookAt(...__parkingView.t);w.camera.fov=52;w.camera.updateProjectionMatrix();w.camera.updateMatrixWorld(true);};});
  for(const v of [{name:'front',p:[-122,14,-158.8],t:[-94,9.5,-158.8]},{name:'top',p:[-100,55,-158.8],t:[-99.9,9.3,-158.8]},{name:'corner',p:[-115,13,-174],t:[-106,9.4,-165]}]){
   await page.evaluate(v=>window.__parkingView=v,v);
   await page.waitForFunction(p=>__islandWorld.camera.position.distanceTo({x:p[0],y:p[1],z:p[2]})<.001,v.p,{timeout:10000});
   await page.evaluate(async()=>{for(let n=0;n<15;n++)await new Promise(requestAnimationFrame);});
   await page.screenshot({path:`${out}/${v.name}.png`});
  }
  assert.deepEqual(report.errors,[]);report.pass=true;
  console.log(JSON.stringify({out,pass:report.pass,errors:report.errors,walkFrames:report.walk?.length}));
 }finally{fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
