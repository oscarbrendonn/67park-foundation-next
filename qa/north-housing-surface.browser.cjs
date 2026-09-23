// Focused northern housing geometry/renderer gate. No broad regression/soak.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const url=process.env.PARK_NORTH_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=north-housing-6';
const output=process.env.PARK_NORTH_EVIDENCE||'.qa-results/north-housing-local';
const cornerOnly=process.env.PARK_NORTH_CORNER_ONLY==='1';
const views=[
 {name:'pool-corner',p:[-17.5,26,-237.5],t:[-17.5,9.4,-237.5]},
 {name:'road-end',p:[-10,60,-225],t:[-10,9.4,-225]},
 {name:'road-level',p:[-10,12,-229],t:[-10,9.2,-243]},
 {name:'overview',p:[40,145,-205],t:[40,9.4,-205]},
 {name:'center',p:[72,13,-197],t:[72,9.4,-226]},
 {name:'left',p:[-1,12.5,-195],t:[-1,9.4,-225]},
 {name:'rear-grass',p:[73,13,-240],t:[73,9.4,-229]},
 {name:'street',p:[72,12.5,-184],t:[72,9.4,-211]},
 {name:'coast-left',p:[15,23,-253],t:[15,9.4,-238]},
 {name:'coast-middle',p:[70,23,-253],t:[70,9.4,-237]},
 {name:'coast-right',p:[110,23,-241],t:[110,9.4,-226]},
];
const selectedViews=cornerOnly?views.filter(v=>['pool-corner','road-end','road-level'].includes(v.name)):views;
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),reports=[];
 try{for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
  try{const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
   const renderer=await assertBrowserRenderer(page);
   const report=await page.evaluate(async(cornerOnly)=>{
    const T=await import('three'),w=__islandWorld,ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
    const points=[];
    for(const x of [-14.9,-10,-4.7])for(const z of [-240.74,-240,-239,-238,-237.29,-237.27,-237,-236])points.push({kind:'road',x,z});
    for(const x of [-16,-3.9])for(const z of [-240.5,-240,-239,-238])points.push({kind:'paving',x,z});
    // Pool-side notch and the removed protruding tooth from the user's crop.
    for(const x of [-19.1,-18.5,-18,-17.5,-17,-16.5,-16,-15.3])for(let z=-240.3;z<=-231.5;z+=.25)points.push({kind:'paving',x,z});
    for(const x of [-16,-15.5])points.push({kind:'sand',x,z:-240.9});
    for(const x of [-15.102,-15.11,-15.15,-15.3])for(const z of [-240.754,-240.75,-240.7])points.push({kind:'paving',x,z});
    // Dense grid over the actual photographed inner seam and triangular gap.
    for(const x of [-4.4,-3.5,-3.39,-3.38,-3.3,-3.1,-2.8])for(let z=-240.5;z<=-193;z+=.5)points.push({kind:'paving',x,z});
    for(const x of [-14,-10,-5])points.push({kind:'sand',x,z:-240.8});
    points.push({kind:'paving',x:27.422581,z:-240.570434},{kind:'paving',x:27.576825,z:-240.684388});
    const coast=await fetch('./repairs/north-housing-surface-1.json?v=north-housing-6').then(r=>r.json());
    for(const q of coast.coastProbes){points.push({kind:'paving',x:q.inside[0],z:q.inside[1]});points.push({kind:'sand',x:q.outside[0],z:q.outside[1]})}
    for(const x of [68.4,70,72,74,76,79])for(let z=-230;z<=-193;z+=1)points.push({kind:z<=-218.5?'grass':'paving',x,z});
    for(const x of [-2,-1,0,146,147])for(const z of [-212,-205,-198,-193])points.push({kind:'paving',x,z});
    // Probe both sides of old joins. Their height must agree with the sampler.
    for(const x of [64.66048,68.24961,77.22244,80.81157])for(const dx of [-.003,.003])for(const z of [-225,-220,-210,-200])points.push({kind:'joined',x:x+dx,z});
    // This former sand probe is now inside the explicitly requested curb extension.
    points.push({kind:'paving',x:-3.8,z:-239});
    for(const [x,z]of [[72,-242],[145,-225]])points.push({kind:'sand',x,z});
    for(const [x,z]of [[16,-202],[56,-202],[94,-202],[134,-202]])points.push({kind:'parcel',x,z});
    const selected=cornerOnly?points.filter(q=>(q.x< -15&&q.x>=-21&&q.z< -231)||(q.kind==='road'&&q.z<=-237)):points;
    const hits=selected.map(q=>{ray.ray.origin.set(q.x,12,q.z);const all=ray.intersectObjects(w.terrain.children,true).filter(h=>h.object.visible&&!h.object.name.startsWith('67D_DIK_')),h=all[0];return {...q,mesh:h?.object.name,y:h?.point.y,ground:w.terrainGround(q.x,q.z),coplanarSoil:all.some(s=>s.object.name==='4_KIYI_TOPRAK_TABANI'&&Math.abs(s.point.y-h.point.y)<.002)}});
    const muted=localStorage.getItem('67park-feel-lab-muted'),frame=w.renderer.info.render.frame;
    const before=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){before?.apply(this,args);if(window.__northView){w.camera.position.fromArray(__northView.p);w.camera.lookAt(...__northView.t);w.camera.updateMatrixWorld(true)}};
    return {patch:w.terrain.userData.northHousingSurface1,hits,muted,frame,dpr:devicePixelRatio,touch:navigator.maxTouchPoints,errors:window.__candyErrors||[]};
   },cornerOnly);
   // Save original results even if any assertion below fails.
   reports.push({mobile,renderer,...report,errors});fs.writeFileSync(output+'/report.json',JSON.stringify({url,reports},null,2));
   assert.equal(report.patch?.version,1);assert.equal(report.patch.addedMeshes,0);assert.equal(report.patch.existingGrassRemovedArea,0);assert.equal(report.patch.reservedParcelChangedArea,0);
   for(const q of report.hits){
    if(q.kind==='sand')assert.match(q.mesh,/KURU_IC_ZEMIN|KUM|KIYI/,'Keep exterior beach: '+JSON.stringify(q));
    else if(q.kind==='parcel')assert.equal(q.mesh,'5_KB_SPOR_ZEMIN');
    else if(q.kind==='road'||q.kind==='curb'){
     assert.equal(q.mesh,q.kind==='road'?'5_YOL':'6_BORDUR','Road/curb extension mismatch: '+JSON.stringify(q));
     assert(Math.abs(q.y-(q.kind==='road'?9.22754747:9.38008564))<.003,'Endpoint height changed: '+JSON.stringify(q));
     assert(Math.abs(q.y-q.ground)<.003,'Endpoint sampler mismatch: '+JSON.stringify(q));
    }
    else{
     assert.equal(q.coplanarSoil,false,'Soil overlaps the visible pavement: '+JSON.stringify(q));
     assert(!/KUM|KURU_IC_ZEMIN|KIYI/.test(q.mesh||''),'Interior sand remains: '+JSON.stringify(q));
     assert(q.y>=9.379&&q.y<=9.399,'Unexpected join height: '+JSON.stringify(q));
     assert(Math.abs(q.y-q.ground)<.002,'Renderer/sampler mismatch: '+JSON.stringify(q));
     if(q.kind==='grass')assert.equal(q.mesh,'3_CIMEN');
     if(q.kind==='paving')assert.equal(q.mesh,'7_KALDIRIM_TABANI');
    }
   }
   for(const v of selectedViews){await page.evaluate(v=>window.__northView=v,v);await page.waitForTimeout(350);await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-${v.name}.png`})}
   assert(await page.evaluate(()=>__islandWorld.renderer.info.render.frame)>report.frame);assert.equal(report.muted,'1');assert.deepEqual(report.errors,[]);assert.deepEqual(errors,[]);
   if(mobile){assert.equal(report.dpr,3);assert(report.touch>0)}
   console.log('NORTH_HOUSING_PASS',JSON.stringify({mobile,cornerOnly,probes:report.hits.length,shots:selectedViews.length,errors:0}));
  }finally{await context.close()}
 }}finally{await browser.close()}
})().catch(e=>{console.error('NORTH_HOUSING_FAIL',e);process.exitCode=1});
