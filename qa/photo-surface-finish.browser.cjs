// Focused local checks for the three reported surfaces. No server, deployment,
// multiplayer messages, broad regression or soak is started by this script.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const url=process.env.PARK_SURFACE_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=photo-surfaces-1';
const output=process.env.PARK_SURFACE_EVIDENCE||'.qa-results/photo-surfaces-final';
const views=[
 {name:'sand-edge',p:[100,12.5,-88.5],t:[-15,10.5,-85]},
 {name:'connector',p:[88,12,-42],t:[85,9,-67]},
 {name:'west-corners',p:[7,12,-32.327],t:[-8,8.5,-32.327]},
 {name:'east-corners',p:[97,12,-32.327],t:[109,8.5,-32.327]},
 {name:'north-corners',p:[49.372,12,-70],t:[49.372,8.5,-82]},
 {name:'south-corners',p:[49.372,12,6],t:[49.372,8.5,18]},
];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch(browserLaunchOptions()),reports=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
   try{
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(()=>{
     localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
     localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
     localStorage.setItem('67park-feel-lab-muted','1');
    });
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
    const renderer=await assertBrowserRenderer(page);
    const report=await page.evaluate(async()=>{
     const T=await import('three'),w=__islandWorld,ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0)),probes=[];
     for(const x of [14.2,84.54])for(const z of [-60,-45,-20,0])for(const dx of [-1.26,-1.24,0,1.24,1.26])probes.push({kind:'connector',x:x+dx,z});
     for(const x of [0,30,80,140])for(const z of [-90,-177])probes.push({kind:'skate',x,z});
     for(const x of [-2.5,147.5])for(const z of [-100,-130,-160])probes.push({kind:'skate',x,z});
     for(const x of [-4.3,103.05])for(const z of [-35.6,-29.05])for(const dx of [-.25,0,.25])for(const dz of [-.25,0,.25])probes.push({kind:'corner',x:x+dx,z:z+dz});
     for(const z of [-77.6,12.94])for(const x of [46.1,52.64])for(const dx of [-.25,0,.25])for(const dz of [-.25,0,.25])probes.push({kind:'corner',x:x+dx,z:z+dz});
     const hits=probes.map(q=>{
      ray.ray.origin.set(q.x,12,q.z);
      const h=ray.intersectObjects(w.terrain.children,true).find(h=>h.object.visible&&!h.object.name.startsWith('67D_DIK_'));
      const ground=w.terrainGround(q.x,q.z);
      return {...q,mesh:h?.object.name,y:h?.point.y,ground};
     });
     return {patch:w.terrain.userData.photoSurfaceFinish1,hits,muted:localStorage.getItem('67park-feel-lab-muted'),errors:window.__candyErrors||[],dpr:devicePixelRatio,touch:navigator.maxTouchPoints,frame:w.renderer.info.render.frame};
    });
    assert.equal(report.patch?.version,1);assert.equal(report.patch.bowlHoleChangedArea,0);
    for(const p of report.hits){
     assert(Number.isFinite(p.ground)&&p.ground>=9.2274,`missing walkable surface ${JSON.stringify(p)}`);
     if(p.kind==='connector'){assert.match(p.mesh,/^CENTER_WHITE71_/);assert(Math.abs(p.y-9.29)<.001);assert(Math.abs(p.ground-9.29)<.001);}
     if(p.kind==='skate'){assert.equal(p.mesh,'67D_SKATEPARK_BASE');assert(Math.abs(p.ground-9.241904107)<.001);}
     if(p.kind==='corner')assert(p.y>=9.2274&&Math.abs(p.y-p.ground)<.002,`render/sampler gap ${JSON.stringify(p)}`);
    }
    await page.evaluate(()=>{const w=__islandWorld,b=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){b?.apply(this,args);if(window.__surfaceView){w.camera.position.fromArray(__surfaceView.p);w.camera.lookAt(...__surfaceView.t);w.camera.updateMatrixWorld(true);}};});
    for(const view of views){await page.evaluate(v=>{window.__surfaceView=v;},view);await page.waitForTimeout(350);await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-${view.name}.png`});}
    const frame=await page.evaluate(()=>__islandWorld.renderer.info.render.frame);
    assert(frame>report.frame);assert.equal(report.muted,'1');assert.deepEqual(report.errors,[]);assert.deepEqual(errors,[]);
    if(mobile){assert.equal(report.dpr,3);assert(report.touch>0);}
    reports.push({mobile,renderer,...report,errors,shots:views.length});
    fs.writeFileSync(`${output}/report.json`,JSON.stringify({url,reports},null,2));
    console.log('PHOTO_SURFACE_PASS',JSON.stringify({mobile,probes:report.hits.length,shots:views.length,errors:0}));
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('PHOTO_SURFACE_FAIL',e);process.exitCode=1;});
