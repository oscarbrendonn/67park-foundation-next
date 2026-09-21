const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict');
const base=process.env.PARK_VEHICLE_URL||'http://127.0.0.1:8496/67park-foundation-next/?qa=vehicle-feedback';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
   await context.addInitScript(()=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');
    window.__vehicleQA={last:0,gap:0,lost:0};document.addEventListener('webglcontextlost',()=>__vehicleQA.lost++,true);
    const tick=t=>{if(__vehicleQA.last)__vehicleQA.gap=Math.max(__vehicleQA.gap,t-__vehicleQA.last);__vehicleQA.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);
   });
   page.on('pageerror',e=>errors.push(String(e)));
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__party?.horn&&window.__candyOnline?.data.connected&&!document.querySelector('.wardrobe'),null,{timeout:180000});
    await assertBrowserRenderer(page);
    const audio=await page.evaluate(async()=>{
     // Render to an in-memory buffer, NEVER to the physical audio device.
     const {createPartyAudio}=await import('./app/party/party-audio.js?v=vehicle-feedback-1');
     const offline=new OfflineAudioContext(1,24000,48000),host=new EventTarget();host.document=new EventTarget();host.document.hidden=false;
     host.AudioContext=class{constructor(){return new Proxy(offline,{get(target,key){if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});}};
     const sfx=createPartyAudio({host,settings:{sfx:.8},saveSettings(){},gameMuted:()=>false});sfx.ensure();sfx.play('horn');
     const buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0;for(const x of samples){peak=Math.max(peak,Math.abs(x));energy+=x*x;}
     return {peak,rms:Math.sqrt(energy/samples.length),stats:sfx.stats(),gameMuted:localStorage.getItem('67park-feel-lab-muted')};
    });
    assert(audio.peak>.01&&audio.peak<1&&audio.rms>.003);assert.equal(audio.gameMuted,'1');assert.equal(audio.stats.counts.horn,1);assert.equal(audio.stats.voices,0);
    console.log('OFFLINE_HORN_AUDIO_PASS',JSON.stringify({mobile,...audio}));
    await require('./car-curb.browser.cjs')(page,{mobile,check:async(name,fn)=>{
     await page.evaluate(()=>{__vehicleQA.gap=0});await fn();
     const frame=await page.evaluate(()=>__islandWorld.renderer.info.render.frame);await page.waitForFunction(f=>__islandWorld.renderer.info.render.frame>f+2,frame,{timeout:2500});
     const state=await page.evaluate(()=>__vehicleQA);assert(state.gap<2500);assert.equal(state.lost,0);assert.deepEqual(errors,[]);console.log('PASS',mobile,name,JSON.stringify(state));
    }});
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
