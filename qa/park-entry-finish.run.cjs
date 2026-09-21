// Bounded acceptance and near-angle evidence; mobile here is a viewport, not
// a physical phone. The same geometry/movement cases also run in the full gate.
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.PARK_ENTRY_URL||'http://127.0.0.1:8496/67park-foundation-next/?qa=park-entry-finish';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());fs.mkdirSync('.qa-results/park-entry-finish',{recursive:true});
 try{for(const mobile of process.env.PARK_VIEW==='desktop'?[false]:process.env.PARK_VIEW==='mobile'?[true]:[false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(45000);
  await context.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');
   window.__entryRun={lost:0,gap:0,last:0};document.addEventListener('webglcontextlost',()=>__entryRun.lost++,true);
   const frame=t=>{const s=__entryRun;if(s.last)s.gap=Math.max(s.gap,t-s.last);s.last=t;requestAnimationFrame(frame)};requestAnimationFrame(frame);
  });
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  await assertBrowserRenderer(page);
  const check=async(name,fn)=>{
   await page.evaluate(()=>{__entryRun.gap=0});await fn();const frame=await page.evaluate(()=>__islandWorld.renderer.info.render.frame);
   await page.waitForFunction(n=>__islandWorld.renderer.info.render.frame>=n+2,frame,{timeout:2500});
   const stats=await page.evaluate(()=>({...__entryRun,muted:localStorage.getItem('67park-feel-lab-muted')}));
   assert.deepEqual(errors,[]);assert.equal(stats.lost,0);assert.equal(stats.muted,'1');assert(stats.gap<2500,name+' stall '+stats.gap);
   console.log('PASS',mobile,name,JSON.stringify({maxGap:stats.gap}));
  };
  await require('./park-entry-finish.browser.cjs')(page,{mobile,check});
  await require('./curb-traversal.browser.cjs')(page,{mobile,check});
  await require('./skate-camera.browser.cjs')(page,{mobile,check});
  // Both orientations for each shoulder. These captures deliberately use a
  // detached inspection camera; the real-input captures above show the avatar.
  const views=[['east-front',[178,13,119],[176,9.38,114.9]],['east-reverse',[177,12,112.5],[176,9.38,115.4]],['west-front',[167,12,117.8],[168,9.38,114.9]],['west-reverse',[166.5,12,112],[168,9.38,115.5]]];
  await page.evaluate(()=>{const w=__islandWorld;window.__entryBeforeRender=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){__entryBeforeRender?.apply(this,args);if(window.__entryView){w.camera.position.fromArray(__entryView.p);w.camera.lookAt(...__entryView.t);w.camera.updateMatrixWorld(true)}};const label=document.createElement('div');label.id='entry-survey-label';label.textContent='Zemin incelemesi · bağımsız kamera';label.style.cssText='position:fixed;left:8px;bottom:78px;z-index:9999;background:#fff7df;padding:5px;font:11px sans-serif';document.body.append(label)});
  for(const [name,p,t]of views){await page.evaluate(v=>{window.__entryView=v},{p,t});await page.waitForTimeout(300);await page.screenshot({path:'.qa-results/park-entry-finish/'+(mobile?'mobile-':'desktop-')+name+'.png'})}
  await page.evaluate(()=>{__islandWorld.scene.onBeforeRender=__entryBeforeRender;delete window.__entryView;delete window.__entryBeforeRender;document.getElementById('entry-survey-label')?.remove()});
  assert.deepEqual(errors,[]);console.log('PARK_ENTRY_BROWSER_PASS',JSON.stringify({mobile,errors,views:views.length}));await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error('PARK_ENTRY_BROWSER_FAIL',e);process.exitCode=1});
