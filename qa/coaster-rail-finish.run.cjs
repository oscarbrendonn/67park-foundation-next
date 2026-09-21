const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.PARK_RAIL_URL||'http://127.0.0.1:8507/67park-foundation-next/?qa=coaster-rail-finish';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());fs.mkdirSync('.qa-results/coaster-rail-finish',{recursive:true});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
  await context.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  await assertBrowserRenderer(page);
  const report=await page.evaluate(()=>JSON.parse(__islandWorld.renderer.domElement.dataset.coasterRailFinish1));assert.equal(report.caps,4);assert.equal(report.addedDraws,0);
  const ends=await page.evaluate(()=>{const data=JSON.parse(__islandWorld.renderer.domElement.dataset.lunapark77).placements.find(p=>p.asset==='coaster');return {entry:data.skateRoute[0],exit:data.skateRoute.at(-1)};});
  await page.evaluate(()=>{const w=__islandWorld;window.__railBefore=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){__railBefore?.apply(this,args);if(window.__railView){w.camera.position.fromArray(__railView.p);w.camera.lookAt(...__railView.t);w.camera.updateMatrixWorld(true)}};});
  for(const [end,point]of Object.entries(ends))for(const side of [-1,1]){
   const [x,y,z]=point,view={p:[x+side*3.7,y+1.2,z+(end==='entry'?4.7:-4.2)],t:[x+(mobile&&end==='entry'?side*2.13:0),y+.15,z]};
   await page.evaluate(v=>{__railView=v},view);await page.waitForTimeout(450);await page.screenshot({path:'.qa-results/coaster-rail-finish/'+(mobile?'mobile':'desktop')+'-'+end+'-'+(side<0?'left':'right')+'.png'});
  }
  await page.evaluate(()=>{__islandWorld.scene.onBeforeRender=__railBefore;delete window.__railView;delete window.__railBefore});
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
  console.log('COASTER_RAIL_PASS',JSON.stringify({mobile,report,ends,errors}));await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
