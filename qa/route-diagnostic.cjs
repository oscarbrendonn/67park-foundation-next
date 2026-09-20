// A focused reproduction of the existing required roof/plaza tests. This does
// not replace the full release gate or count as a foundation/performance pass.
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const mobile=process.env.PARK_VIEW==='mobile';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  const frameMs=Number(process.env.PARK_DIAGNOSTIC_FRAME_MS||0);
  if(frameMs)await context.addInitScript(frameMs=>{
   // Synthetic slow-frame reproduction only: do not rewrite game delta time.
   const raf=requestAnimationFrame.bind(window),caf=cancelAnimationFrame.bind(window),pending=new Map();let next=0;
   window.requestAnimationFrame=callback=>{const id=++next,job={timer:null,raf:null};pending.set(id,job);job.timer=setTimeout(()=>{job.raf=raf(t=>{pending.delete(id);callback(t)})},frameMs);return id};
   window.cancelAnimationFrame=id=>{const job=pending.get(id);if(job){clearTimeout(job.timer);if(job.raf!==null)caf(job.raf);pending.delete(id)}};
  },frameMs);
  await context.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
   localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
  });
  if(process.env.PARK_DIAGNOSTIC_INPUT_TRACE==='1')await context.addInitScript(()=>{
   window.__qaRouteInputEvents=[];
   const record=type=>event=>{if(!event.target?.closest?.('[aria-label="Jump"]'))return;const b=window.__eggyInput?.playerRef?.body,p=b?.translation?.(),v=b?.linvel?.();window.__qaRouteInputEvents.push({type,trusted:event.isTrusted,t:Math.round(performance.now()),frame:window.__islandWorld?.renderer?.info?.render?.frame,p:p&&{...p},v:v&&{...v}});if(window.__qaRouteInputEvents.length>16)window.__qaRouteInputEvents.shift();};
   document.addEventListener('pointerdown',record('pointerdown'),true);document.addEventListener('pointerup',record('pointerup'),true);document.addEventListener('click',record('click'),true);
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PARK_DIAGNOSTIC_URL||'http://127.0.0.1:8521/67park-foundation-next/?claudeQA=passive',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__candyOnline?.data.connected&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  await assertBrowserRenderer(page);fs.mkdirSync('.qa-results',{recursive:true});
  const check=async(name,action)=>{await action();assert.deepEqual(errors,[]);console.log('ROUTE_DIAGNOSTIC_PASS',name)};
  try{
   if(process.env.PARK_DIAGNOSTIC_PLAZA_ONLY!=='1')await require('./house-roofs.browser.cjs')(page,{mobile,check});
   if(process.env.PARK_DIAGNOSTIC_ROOF_ONLY!=='1')await require('./plaza-climb.browser.cjs')(page,{mobile,check});
   if(process.env.PARK_DIAGNOSTIC_INPUT_TRACE==='1')console.log('ROUTE_INPUT_EVIDENCE',JSON.stringify(await page.evaluate(()=>window.__qaRouteInputEvents)));
  }catch(error){
   if(process.env.PARK_DIAGNOSTIC_INPUT_TRACE==='1')console.log('ROUTE_INPUT_EVIDENCE',JSON.stringify(await page.evaluate(()=>window.__qaRouteInputEvents)));
   throw error;
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
