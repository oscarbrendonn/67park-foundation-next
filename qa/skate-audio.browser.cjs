const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const mobile=process.env.MOBILE==='1';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','0');
   window.__qaAudioOutputs=[];window.__qaSkateEvents=[];
   const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(target,...rest){const result=connect.call(this,target,...rest);if(target===this.context.destination)__qaAudioOutputs.push({node:this,context:this.context});return result;};
   for(const type of ['candy:skate-trick','candy:skate-land'])addEventListener(type,e=>{if(__qaSkateEvents.length<100)__qaSkateEvents.push({type,detail:e.detail,time:performance.now()})});
  });
  await page.goto(base+'?v=skate-sfx-1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&window.__party,null,{timeout:180000});
  await page.evaluate(()=>__tp([200,10.3,88]));await page.waitForTimeout(700);
  if(mobile){await page.getByRole('button',{name:'Skate',exact:true}).tap();}else await page.keyboard.press('KeyV');
  await page.waitForFunction(()=>__skateState.riding&&__skateState.air===0);
  await page.waitForFunction(()=>__party.sfx.state()==='running');
  await page.evaluate(()=>{
   const ctx=__party.sfx.ensure(),output=__qaAudioOutputs.find(o=>o.context===ctx);
   if(!output)throw Error('Party audio output missing');
   const analyser=ctx.createAnalyser();analyser.fftSize=2048;output.node.connect(analyser);
   const data=new Float32Array(analyser.fftSize);window.__qaAudioMeter={peak:0,samples:0};
   const timer=setInterval(()=>{analyser.getFloatTimeDomainData(data);for(const v of data)__qaAudioMeter.peak=Math.max(__qaAudioMeter.peak,Math.abs(v));__qaAudioMeter.samples++;},8);
   window.__qaStopMeter=()=>{clearInterval(timer);output.node.disconnect(analyser);analyser.disconnect();};
   // Visual bounce disabled must not silence the accepted trick.
   __party.settings.juice=false;
  });
  const jump=async()=>{if(mobile)await page.getByRole('button',{name:'Jump',exact:true}).tap();else await page.keyboard.press('Space');};
  const before=await page.evaluate(()=>__party.sfx.stats().counts),cycles=4;
  for(let i=0;i<cycles;i++){
   await jump();await page.waitForFunction(()=>__skateState.air>.08,null,{timeout:5000});
   await jump();await page.waitForFunction(n=>(__party.sfx.stats().counts['skate-flip']||0)>=n,(before['skate-flip']||0)+i+1,{timeout:5000});
   await page.waitForFunction(()=>__skateState.air===0,null,{timeout:5000});await page.waitForTimeout(180);
  }
  await page.waitForTimeout(400);
  const audible=await page.evaluate(()=>({stats:__party.sfx.stats(),meter:{...__qaAudioMeter},events:__qaSkateEvents,frame:__islandWorld.renderer.info.render.frame}));
  for(const name of ['skate-ollie','skate-flip','skate-land'])assert.equal(audible.stats.counts[name]-(before[name]||0),cycles,name);
  assert(audible.meter.peak>.003,'Audio output stayed silent');assert.equal(audible.stats.voices,0);
  await page.evaluate(()=>{localStorage.setItem('67park-feel-lab-muted','1');dispatchEvent(new Event('park:audio-mute-change'));});
  await page.waitForTimeout(180);await page.evaluate(()=>{__qaAudioMeter.peak=0;});
  await jump();await page.waitForFunction(()=>__skateState.air>.08);await jump();
  await page.waitForFunction(()=>__skateState.air===0);await page.waitForTimeout(250);
  const muted=await page.evaluate(()=>({stats:__party.sfx.stats(),peak:__qaAudioMeter.peak,frame:__islandWorld.renderer.info.render.frame}));
  assert.deepEqual(muted.stats.counts,audible.stats.counts);assert(muted.peak<.0001,'Muted output not silent');assert(muted.frame>audible.frame);
  await page.evaluate(()=>{__qaStopMeter();localStorage.setItem('67park-feel-lab-muted','0');dispatchEvent(new Event('park:audio-mute-change'));});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({mobile,input:mobile?'touch':'keyboard',cycles,counts:audible.stats.counts,outputPeak:audible.meter.peak,mutedPeak:muted.peak,voicesAfter:audible.stats.voices,renderAdvanced:true,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
