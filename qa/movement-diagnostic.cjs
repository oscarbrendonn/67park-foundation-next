// Focused real-input checks; never a replacement for the full release gate.
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const mobile=process.env.PARK_VIEW==='mobile';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
   localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PARK_DIAGNOSTIC_URL||'http://127.0.0.1:8537/67park-foundation-next/?claudeQA=passive',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__candyOnline?.data.connected&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  await assertBrowserRenderer(page);fs.mkdirSync('.qa-results',{recursive:true});
  const check=async(name,action)=>{await action();assert.deepEqual(errors,[]);console.log('MOVEMENT_DIAGNOSTIC_PASS',name)};
  for(const name of (process.env.PARK_MOVEMENT_CHECKS||'curb-traversal,carousel-deck').split(','))await require('./'+name+'.browser.cjs')(page,{mobile,check});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
