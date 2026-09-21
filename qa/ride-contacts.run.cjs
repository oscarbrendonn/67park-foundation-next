// Bounded local browser runner for the two reported amusement-park contacts.
// The release gate also invokes the same cases in both full foundation runs.
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.PARK_RIDE_URL||'http://127.0.0.1:8496/67park-foundation-next/?qa=ride-contacts';
const jumpDelay=Number(process.env.PARK_RIDE_JUMP_DELAY_MS||0);
assert(Number.isFinite(jumpDelay)&&jumpDelay>=0&&jumpDelay<=1200,'bounded jump delay');
// Test automation latency, separate from a blocked game frame. This reproduces
// the old 2.19s locator delay without changing the game, input or assertions.
const dispatchDelay=Number(process.env.PARK_RIDE_DISPATCH_DELAY_MS||0);
assert(Number.isFinite(dispatchDelay)&&dispatchDelay>=0&&dispatchDelay<=2500,'bounded jump dispatch delay');
// Distinct from event/dispatch delay: the hosted renderer advances the real
// cabin clock between slow game frames after accepting the jump as well.
// Busy callbacks also delay network delivery, so this is a slow-frame stress
// fixture, NOT an exact recreation of the hosted cabin clock. The retained
// real-asset unit replays that exact three-clock collision independently.
const frameDelay=Number(process.env.PARK_RIDE_FRAME_DELAY_MS||0);
assert(Number.isFinite(frameDelay)&&frameDelay>=0&&frameDelay<=1000,'bounded post-arm frame delay');
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  for(const mobile of process.env.PARK_VIEW==='desktop'?[false]:process.env.PARK_VIEW==='mobile'?[true]:[false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
   page.setDefaultTimeout(45000);
   await context.addInitScript(({jumpDelay,frameDelay})=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    localStorage.setItem('67park-feel-lab-muted','1');
    window.__rideRun={lost:0,gap:0,last:0,injected:0,dispatchDelayed:0,blockedFrames:0};document.addEventListener('webglcontextlost',()=>__rideRun.lost++,true);
    const delayJump=e=>{
     const jump=e.type==='keydown'?e.code==='Space':e.target?.closest?.('button')?.getAttribute('aria-label')==='Jump';
     if(!jump||!jumpDelay||!window.__qaRideJumpArmed||__rideRun.injected)return;
     __rideRun.injected++;const start=performance.now();while(performance.now()-start<jumpDelay){}
    };
    addEventListener('keydown',delayJump,true);addEventListener('pointerdown',delayJump,true);
    const frame=now=>{const s=__rideRun;if(s.last)s.gap=Math.max(s.gap,now-s.last);s.last=now;
     if(frameDelay&&window.__qaRideJumpArmed&&s.blockedFrames<8){s.blockedFrames++;const until=performance.now()+frameDelay;while(performance.now()<until){}}
     requestAnimationFrame(frame);
    };requestAnimationFrame(frame);
   },{jumpDelay,frameDelay});
   if(dispatchDelay){
    const delayOnce=async()=>{
     const armed=await page.evaluate(()=>{if(!window.__qaRideJumpArmed||__rideRun.dispatchDelayed)return false;__rideRun.dispatchDelayed++;return true;});
     if(armed)await page.waitForTimeout(dispatchDelay);
    };
    const tap=page.touchscreen.tap.bind(page.touchscreen),press=page.keyboard.press.bind(page.keyboard);
    page.touchscreen.tap=async(...args)=>{await delayOnce();return tap(...args);};
    page.keyboard.press=async(...args)=>{if(args[0]==='Space')await delayOnce();return press(...args);};
   }
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
    if(jumpDelay)assert.equal(await page.evaluate(()=>__rideRun.injected),1,'delayed exactly one real Ferris jump input');
    if(dispatchDelay)assert.equal(await page.evaluate(()=>__rideRun.dispatchDelayed),1,'delayed exactly one trusted Ferris input dispatch');
    if(frameDelay){
     const blockedFrames=await page.evaluate(()=>__rideRun.blockedFrames);
     assert(blockedFrames>=3,'exercised consecutive slow game frames after arming');
     console.log('PASS injected ride slow frames',JSON.stringify({mobile,frameDelay,blockedFrames}));
    }
    await require('./skate-camera.browser.cjs')(page,{mobile,check});
    console.log('RIDE_CONTACT_BROWSER_PASS',JSON.stringify({mobile,errors,stats:await page.evaluate(()=>__islandWorld.rideContacts.stats)}));
   }catch(error){fs.mkdirSync('.qa-results',{recursive:true});await page.screenshot({path:'.qa-results/ride-contacts-failed-'+(mobile?'mobile':'desktop')+'.png'});throw error;}
   finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
