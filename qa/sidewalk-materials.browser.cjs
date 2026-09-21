// Close-angle acceptance on loopback only. Baseline is a local comparison, not
// a publication gate bypass; the production scene must pass the live contract.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const verify=require('./sidewalk-materials.live.cjs');
const base='http://127.0.0.1:8499/67park-foundation-next/';
const output='.qa-results/sidewalk-materials';
const views=[
 ['central-corner-west',[36.5,12,-31],[39.35,9.32,-35.48]],
 ['central-corner-east',[62,12,-31],[59.4,9.32,-35.48]],
 ...[-1,1].flatMap(x=>[-1,1].flatMap(z=>{
  const cx=x<0?4.426:94.318,cz=z<0?-41.981:-22.674;
  return [-1,1].map(side=>['lawn-'+x+'-'+z+'-'+side,[cx+side*8,12,cz-z*8],[cx,9.4,cz]]);
 })),
 ['lower-plaza-west',[-9,12.5,54],[-1,9.35,58]],
 ['lower-plaza-east',[108,12.5,91],[99,9.35,95]],
 ['courtyard-left',[-101,12.5,19],[-99,9.35,11]],
 ['courtyard-right',[-18,12.5,-83],[-21,9.35,-75]],
 ['sports-left',[-112,12.5,-143],[-104,9.35,-149]],
 ['sports-right',[-76,12.5,-143],[-82,9.35,-149]],
 ['pool-entrance-left',[-48,12.5,-182],[-49,9.4,-193]],
 ['pool-entrance-right',[-55,12.5,-182],[-49,9.4,-193]],
 ['northwest-left',[-155,12.5,-170],[-146,9.4,-178]],
 ['northwest-right',[-136,12.5,-166],[-142,9.4,-175]]
];

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch(browserLaunchOptions()),results=[];
 try{
  for(const mode of ['before','after','mobile']){
   const mobile=mode==='mobile',context=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.addInitScript(()=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    localStorage.setItem('67park-feel-lab-muted','1');
   });
   if(mode==='before')await page.route('**/app/sidewalk-materials.js?*',route=>route.fulfill({contentType:'text/javascript',body:'export function applySidewalkMaterials(){return {version:0};}'}));
   await page.goto(base+'?v=sidewalk-close-'+mode,{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>window.__islandWorld?.ready&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:180000});
   await page.locator('.return-entry').waitFor({state:'hidden',timeout:180000});
   await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
   await assertBrowserRenderer(page);
   if(mode!=='before')await verify(page,{check:async(name,fn)=>fn()});
   const start=await page.evaluate(()=>{
    const w=__islandWorld,previous=w.scene.onBeforeRender;
    window.__sidewalkContextLosses=0;w.renderer.domElement.addEventListener('webglcontextlost',()=>window.__sidewalkContextLosses++);
    w.scene.onBeforeRender=function(...args){previous?.apply(this,args);const v=window.__sidewalkView;if(v){w.camera.position.fromArray(v[1]);w.camera.lookAt(...v[2]);w.camera.updateMatrixWorld(true);}};
    return w.renderer.info.render.frame;
   });
   const selected=mode==='before'?views.filter((_,i)=>i<4||i===10):mobile?views.filter((_,i)=>[0,2,10,13,17].includes(i)):views;
   for(const view of selected){
    await page.evaluate(v=>{window.__sidewalkView=v;},view);
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(output,mode+'-'+view[0]+'.png')});
   }
   const state=await page.evaluate(()=>({frame:__islandWorld.renderer.info.render.frame,contextLosses:window.__sidewalkContextLosses,muted:localStorage.getItem('67park-feel-lab-muted'),errors:window.__candyErrors||[]}));
   assert(state.frame>start);assert.equal(state.contextLosses,0);assert.equal(state.muted,'1');assert.deepEqual(state.errors,[]);assert.deepEqual(errors,[]);
   results.push({mode,views:selected,frames:state.frame-start,contextLosses:state.contextLosses,errors});
   await context.close();
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));
  console.log('SIDEWALK_CLOSE_VIEWS_PASS',JSON.stringify(results.map(r=>({mode:r.mode,views:r.views.length,frames:r.frames,errors:r.errors}))));
 }finally{await browser.close();}
})().catch(error=>{console.error('SIDEWALK_CLOSE_VIEWS_FAIL',error);process.exitCode=1;});
