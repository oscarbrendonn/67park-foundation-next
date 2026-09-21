// Bounded local browser runner for the two reported amusement-park contacts.
// The release gate also invokes the same cases in both full foundation runs.
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.PARK_RIDE_URL||'http://127.0.0.1:8496/67park-foundation-next/?qa=ride-contacts';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  for(const mobile of process.env.PARK_VIEW==='desktop'?[false]:process.env.PARK_VIEW==='mobile'?[true]:[false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
   page.setDefaultTimeout(45000);
   await context.addInitScript(()=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    localStorage.setItem('67park-feel-lab-muted','1');
    window.__rideRun={lost:0,gap:0,last:0};document.addEventListener('webglcontextlost',()=>__rideRun.lost++,true);
    const frame=now=>{const s=__rideRun;if(s.last)s.gap=Math.max(s.gap,now-s.last);s.last=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);
   });
   page.on('pageerror',error=>errors.push(String(error)));
   page.on('console',message=>{if(message.type()==='error')console.log('BROWSER_ERROR',message.text());});
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&window.__candyOnline?.data.connected&&!document.querySelector('.wardrobe'),null,{timeout:180000});
   await assertBrowserRenderer(page);
   const check=async(name,fn)=>{
    await page.evaluate(()=>{__rideRun.gap=0;});
    await fn();const frame=await page.evaluate(()=>__islandWorld.renderer.info.render.frame);
    await page.waitForFunction(before=>__islandWorld.renderer.info.render.frame>=before+2,frame,{timeout:2500});
    assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>__rideRun.lost),0);
    const maxGap=await page.evaluate(()=>__rideRun.gap);assert(maxGap<2500,name+' frame stall '+maxGap);
    console.log('PASS',mobile,name,JSON.stringify({maxGap}));
   };
   try{
    await require('./ride-contacts.browser.cjs')(page,{mobile,check});
    await require('./skate-camera.browser.cjs')(page,{mobile,check});
    console.log('RIDE_CONTACT_BROWSER_PASS',JSON.stringify({mobile,errors,stats:await page.evaluate(()=>__islandWorld.rideContacts.stats)}));
   }catch(error){fs.mkdirSync('.qa-results',{recursive:true});await page.screenshot({path:'.qa-results/ride-contacts-failed-'+(mobile?'mobile':'desktop')+'.png'});throw error;}
   finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
