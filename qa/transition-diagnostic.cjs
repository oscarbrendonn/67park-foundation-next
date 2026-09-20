// Optional profiling of the actual scene. This is not a release pass and does
// not alter production rendering or the required recovery/foundation suites.
const {chromium}=require('playwright');
const fs=require('node:fs');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const base=process.env.PARK_DIAGNOSTIC_URL||'http://127.0.0.1:8521/67park-foundation-next/';
const software=process.env.PARK_SOFTWARE_RENDER==='1';
const backend=process.env.PARK_SOFTWARE_DRIVER==='webgl'?'swiftshader-webgl':'swiftshader';
(async()=>{
 const options=browserLaunchOptions();
 if(software&&process.env.PARK_SOFTWARE_DRIVER==='webgl')options.args=['--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader'];
 const browser=await chromium.launch(options);
 let trace,cdp,friend;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
   localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
   for(const type of ['candy:depart','candy:portal-travel','pagehide'])addEventListener(type,()=>console.log('TRANSITION_EVENT',JSON.stringify({type,at:Date.now()})));
  });
  const page=await context.newPage();
  page.on('console',m=>{if(m.text().startsWith('TRANSITION_EVENT'))console.log(m.text())});
  page.on('request',r=>{if(r.isNavigationRequest())console.log('NAVIGATION_REQUEST',Date.now(),new URL(r.url()).pathname)});
  page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('NAVIGATION_COMMIT',Date.now(),new URL(f.url()).pathname)});
  page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
  await page.goto(base+'?claudeQA=passive',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__candyOnline?.data.connected&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  console.log('DIAGNOSTIC_READY',Date.now());
  await assertBrowserRenderer(page);
  cdp=await context.newCDPSession(page);
  trace=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
  await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,v8,gpu,disabled-by-default-v8.cpu_profiler',transferMode:'ReturnAsStream'});
  if(process.env.PARK_DIAGNOSTIC_COAST==='1'){
   const start=Date.now();
   await page.evaluate(()=>{__candyCamera.parked={p:[249,29,174],t:[224,9.4,140]};});
   await page.waitForTimeout(5000);
   await page.screenshot({path:'.qa-results/coast-profile.png',timeout:90000});
   console.log('COAST_CAPTURE',Date.now()-start);
  }else{
   const {onlinePeer}=await import('./online-fixture.mjs');
   friend=await onlinePeer(new URL(base).origin,{name:'Transition diagnostic'});
   await page.evaluate(()=>__candyOnline.send({t:'room.create',capacity:2,mode:'balloon'}));
   await page.waitForFunction(()=>__candyOnline.data.room?.code);
   const code=await page.evaluate(()=>__candyOnline.data.room.code);
   friend.send({t:'room.join',code});
   await page.waitForFunction(()=>__candyOnline.data.room.members.length===2);
   await page.route('**/online-match-3GT2AEG7.js*',r=>r.fulfill({status:503,body:'Diagnostic failure'}));
   const start=Date.now();console.log('TRANSITION_START',start);
   await Promise.all([page.waitForURL('**/balloon/**',{waitUntil:'commit',timeout:60000}),page.evaluate(()=>__candyOnline.send({t:'room.start'}))]);
   console.log('DIAGNOSTIC_TRANSITION_MS',Date.now()-start);
   await page.locator('#park-connection-recovery[data-state=loading-error]').waitFor({timeout:60000});
  }
 }finally{
  if(cdp&&trace){
   await cdp.send('Tracing.end');const {stream}=await trace;
   const file=fs.createWriteStream('.qa-results/transition-profile-'+(process.env.PARK_DIAGNOSTIC_COAST==='1'?'coast':'room')+'-'+(software?backend:'hardware')+'.json');
   try{for(;;){const chunk=await cdp.send('IO.read',{handle:stream});file.write(chunk.base64Encoded?Buffer.from(chunk.data,'base64'):chunk.data);if(chunk.eof)break;}}
   finally{await new Promise(r=>file.end(r));await cdp.send('IO.close',{handle:stream})}
  }
  friend?.close();await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
