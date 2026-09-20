// Bounded visual diagnostic. Does not replace the release regression gate.
const {chromium}=require('playwright');
const fs=require('node:fs');
const {browserLaunchOptions}=require('./browser-launch.cjs');
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
   localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PARK_DIAGNOSTIC_URL||'http://127.0.0.1:8537/67park-foundation-next/?claudeQA=passive',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__candyOnline?.data.connected&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  const report=await page.evaluate(async()=>{
   const w=__islandWorld;
   __tp([172,w.ground(172,118)+.555,118]);
   for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);
   return {keys:Object.keys(w),rides:w.rides?.map(r=>({keys:Object.keys(r),state:r.state?.(),entry:r.entry,asset:r.asset,stats:r.stats})),traffic:w.traffic?{keys:Object.keys(w.traffic),state:w.traffic.state?.()}:null,position:__eggyInput.playerRef.body.translation(),input:Object.keys(__eggyInput),muted:localStorage.getItem('67park-feel-lab-muted'),contact:document.querySelector('#park-contact-cue')?.textContent};
  });
  fs.mkdirSync('.qa-results',{recursive:true});
  await page.screenshot({path:'.qa-results/movement-spots-baseline.png'});
  console.log(JSON.stringify({report,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
