const {chromium}=require('playwright');
const WebSocket=require('ws');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const port=Number(process.env.PARK_QA_PORT||8499),origin='http://127.0.0.1:'+port,base=origin+'/67park-foundation-next/';
const soakMs=Number(process.env.PARK_SOAK_MS||120000);
const softwareRender=process.env.PARK_SOFTWARE_RENDER==='1';
// Software rendering on the CPU-only runner is a functional/resource test, not a GPU
// performance benchmark. Real hardware retains the strict 2.5s stall budget.
const stallMs=softwareRender?15000:2500;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let server,browser;
async function start(){
 server=spawn(process.execPath,['qa/regression-server.mjs'],{stdio:['ignore','pipe','inherit'],env:process.env});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('QA server start timed out')),60000);server.stdout.on('data',b=>{process.stdout.write(b);if(String(b).includes('REGRESSION_READY')){clearTimeout(timer);resolve();}});server.once('exit',c=>{clearTimeout(timer);reject(Error('QA server exited '+c));});});
 browser=await chromium.launch(browserLaunchOptions());
}
async function peer(){
 const guest=await(await fetch(origin+'/kimi/api/session',{headers:{Origin:origin}})).json(),messages=[],sockets=[];
 for(const channel of ['ws','online']){const ws=new WebSocket(origin.replace('http','ws')+'/kimi/'+channel,['67park-v1','guest.'+guest.token],{headers:{Origin:origin}});ws.on('message',b=>messages.push(JSON.parse(b)));sockets.push(ws);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});ws.send(JSON.stringify({t:'hello',name:'Safety QA friend'}));}
 return {...guest,messages,sockets,chat(text,nonce){sockets[0].send(JSON.stringify({t:'chat',text,nonce}));},close(){sockets.forEach(s=>s.terminate());}};
}
async function run(mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[];let friend;
 page.on('pageerror',e=>errors.push(String(e.stack)));
 page.on('response',r=>{if(r.url().includes('/kimi/')&&r.status()>=400)console.log('NETWORK_FAIL',r.status(),new URL(r.url()).pathname);});
 await page.addInitScript(()=>{
  localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');
  window.__gate={frames:0,last:0,maxGap:0,losses:0,expectPreviewLoss:false,expectedPreviewLosses:0};const tick=t=>{if(__gate.last)__gate.maxGap=Math.max(__gate.maxGap,t-__gate.last);__gate.last=t;__gate.frames++;requestAnimationFrame(tick)};requestAnimationFrame(tick);document.addEventListener('webglcontextlost',event=>{if(__gate.expectPreviewLoss&&event.target?.matches?.('canvas.wardrobe-avatar'))__gate.expectedPreviewLosses++;else __gate.losses++;},true);
 });
 if(softwareRender)await page.addInitScript(()=>{
  // The hosted runner has no GPU. Keep the real scene, materials, animation,
  // network and UI, but bound fragment/shadow raster cost in the TEST browser.
  // This is not a product quality setting or a physical-device FPS benchmark.
  const seen=new WeakSet();
  setInterval(()=>{
   const world=window.__islandWorld,r=world?.renderer;
   if(r&&!seen.has(r)){
    seen.add(r);const setRatio=r.setPixelRatio;
    // R3F/adaptive resolution can otherwise silently undo the CPU-test cap.
    // Manual quality changes still exercise their actual framebuffer sizes.
    r.setPixelRatio=function(value){
     let level='auto';try{level=JSON.parse(localStorage.getItem('67park.feel-lab.player-settings.v1')||'{}').graphics||'auto'}catch{}
     return setRatio.call(this,level==='auto'?.25:value);
    };
    r.setPixelRatio(.25);
   }
   // The product graphics module retains the original setter internally.
   // Switching High -> Automatic can therefore bypass the public wrapper.
   // Reassert only the TEST automatic cap; manual framebuffer tests stay real.
   if(r){
    let level='auto';try{level=JSON.parse(localStorage.getItem('67park.feel-lab.player-settings.v1')||'{}').graphics||'auto'}catch{}
    if(level==='auto'&&r.getPixelRatio()!==.25)r.setPixelRatio(.25);
   }
   const scene=world?.scene||window.__eggyScene;
   scene?.traverse(o=>{
    if(!o.shadow||seen.has(o))return;seen.add(o);
    const setSize=o.shadow.mapSize.set;
    // Graphics switching also restores authored shadow sizes. Keep only this
    // CPU-only harness capped; never relax geometry or draw-progress checks.
    o.shadow.mapSize.set=function(x,y){return setSize.call(this,Math.min(256,x),Math.min(256,y))};
    o.shadow.mapSize.set(256,256);o.shadow.map?.dispose();o.shadow.map=null;o.shadow.needsUpdate=true;
   });
  },250);
 });
 try{
  // A failed map download must leave a retry route, never an endless welcome.
  let failed=0;await page.route('**/island/ada_calisma.glb*',r=>{failed++;return r.fulfill({status:503,body:'Intentional isolated QA failure'});});
  await page.goto(base+'?claudeQA=passive',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('[data-return-entry=error]').waitFor({timeout:60000});assert(failed>0);assert.equal(await page.locator('#party-settings-btn').isVisible(),false);
  console.log('PASS failed asset offers retry',mobile);
  await page.unroute('**/island/ada_calisma.glb*');await page.getByRole('button',{name:'Retry loading',exact:true}).click();
  // The GPU-less CI runner needs longer for the cold shader compilation than
  // the local hardware browser. This is a bounded LOAD timeout; the gameplay
  // stall threshold below stays unchanged and is measured only after entry.
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyNet?.connected&&window.__candyOnline?.data.connected&&window.__parkHousing?.debug().model&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  console.log('PASS asset retry',mobile,'render profile',softwareRender?'software-quarter-resolution':'hardware-default');errors.length=0;
  await assertBrowserRenderer(page);
  const read=()=>page.evaluate(()=>({frame:__islandWorld.renderer.info.render.frame,gap:__gate.maxGap,losses:__gate.losses,party:__party.status(),home:__parkHousing.debug(),id:__candyOnline.data.me.id,connected:__eggyNet.connected&&__candyOnline.data.connected,programs:__islandWorld.renderer.info.programs?.length}));
  async function check(name,action){
   await page.evaluate(()=>{__gate.maxGap=0});const before=await read();
   await action();const actionEnd=await read();
   // Prove actual drawing continues AFTER the action. An RAF heartbeat alone
   // can continue with a stopped Three renderer. Two new rendered frames must
   // arrive within the render profile's bounded deadline; do not confuse software
   // GPU FPS with a stopped renderer by counting four frames in a fixed 600ms.
   await page.waitForFunction(frame=>__islandWorld.renderer.info.render.frame>=frame+2,actionEnd.frame,{timeout:stallMs});
   await page.waitForTimeout(600);const after=await read();
   assert(after.gap<stallMs,name+' frame stall '+after.gap);assert.equal(after.losses,0);
   assert.equal(after.party.disabled,false);assert.equal(after.home.failed,false);assert.deepEqual(errors,[]);
   console.log('PASS',mobile,name,JSON.stringify({frames:after.frame-before.frame,maxGap:Math.round(after.gap),programs:after.programs}));
  }
  await require('./skate-camera.browser.cjs')(page,{mobile,check});
  await require('./recovery-graphics.browser.cjs')(page,{mobile,check});
  await require('./water-immersion.browser.cjs')(page,{mobile,check});
  await require('./wardrobe-recovery.browser.cjs')(page,{mobile,check});
  if(softwareRender){
   await page.waitForFunction(()=>__islandWorld.renderer.getPixelRatio()===.25);
   console.log('CPU_RASTER_CAP',await page.evaluate(()=>{const r=__islandWorld.renderer;return {ratio:r.getPixelRatio(),width:r.domElement.width,height:r.domElement.height}}));
  }
  await require('./corner-contacts.browser.cjs')(page,{mobile,check});
  await require('./curb-traversal.browser.cjs')(page,{mobile,check});
  await require('./car-curb.browser.cjs')(page,{mobile,check});
  await require('./carousel-deck.browser.cjs')(page,{mobile,check});
  await require('./carousel-low-fps.browser.cjs')(page,{mobile,check});
  await require('./ride-contacts.browser.cjs')(page,{mobile,check});
  await require('./grass-boundary.live.cjs')(page,{mobile,check});
  await require('./map-edge-finish.live.cjs')(page,{mobile,check});
  await require('./park-entry-finish.browser.cjs')(page,{mobile,check});
  await require('./sidewalk-materials.live.cjs')(page,{mobile,check});
  await require('./southeast-divider.live.cjs')(page,{mobile,check});
  await require('./house-roofs.browser.cjs')(page,{mobile,check});
  await require('./plaza-climb.browser.cjs')(page,{mobile,check});
  friend=await peer();await page.waitForFunction(id=>__candyOnline.data.island.players.some(p=>p.id===id),friend.id);
  await check('chat composer 12 messages and 1000 repeated submit attempts',async()=>{
   for(let i=0;i<12;i++){await page.locator('.park-chat button').last().click();await page.getByPlaceholder('Message everyone…').fill('QA message '+i);await page.locator('.park-chat button').last().click();await page.waitForTimeout(850);}
   await page.evaluate(async()=>{const {submitParkChat}=await import('./app/chat-submit.js?v=foundation-safety-1');for(let i=0;i<1000;i++)submitParkChat(__eggyNet,'Repeated input',()=>{});});
  });
  await page.locator('#party-settings-btn').click();await page.getByText('Players · mute & block',{exact:true}).click();
  const stableBlock=await page.locator(`[data-safety=blocked][data-player="${friend.id}"]`).elementHandle();
  await page.locator(`[data-safety=muted][data-player="${friend.id}"]`).click();
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('67park.feel-lab.safety.v1')).muted.includes(id),friend.id);
  assert(await page.evaluate(button=>{for(let i=0;i<100;i++)dispatchEvent(new Event('park:safety-change'));return button.isConnected&&button===document.querySelector(`[data-safety=blocked][data-player="${button.dataset.player}"]`);},stableBlock),'safety sync must preserve button identity and focus target');
  friend.chat('Muted friend message','muted');await sleep(900);assert.equal(await page.evaluate(id=>__eggyNet.chat.some(m=>m.id===id&&m.text==='Muted friend message'),friend.id),false);
  await page.locator(`[data-safety=blocked][data-player="${friend.id}"]`).click();
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('67park.feel-lab.safety.v1')).blocked.includes(id),friend.id);
  await page.screenshot({path:'.qa-results/safety-'+(mobile?'mobile':'desktop')+'.png'});
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  const before=await read();await check('reconnect retains identity and safety while peer stays connected',async()=>{
   await page.evaluate(()=>{__eggyNet.ws.close();__candyOnline.ws.close();});
   await page.waitForFunction(()=>__eggyNet.connected&&__candyOnline.data.connected,null,{timeout:30000});await page.waitForTimeout(1000);assert.equal((await read()).id,before.id);assert(friend.sockets.every(s=>s.readyState===1));
  });
  const house=mobile?'H04':'H03';
  const send=action=>page.evaluate(({action,house})=>__candyOnline.send({t:'house.'+action,house}),{action,house});
  await send('claim');await page.waitForFunction(h=>__parkHousing.debug().model.houses.find(q=>q.id===h).owner===__candyOnline.data.me.id,house);
  await send('door');await page.waitForTimeout(900);
  await check('100 home transitions',async()=>{
   for(let i=0;i<50;i++){await send('enter');await page.waitForFunction(h=>__parkHousing.debug().visit===h,house);await page.waitForTimeout(430);await send('exit');await page.waitForFunction(()=>!__parkHousing.debug().visit);await page.waitForTimeout(430);}
  });
  await check('1000 punch and interact events',()=>page.evaluate(()=>{for(let i=0;i<1000;i++){document.querySelector('#preview-hit')?.click();dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',bubbles:true}));}}));
  await check('20 outfit changes and return from studio',async()=>{
   await page.getByRole('button',{name:'Profile studio',exact:true}).click();await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();
   await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   for(let i=0;i<20;i++)await page.getByRole('button',{name:'Next shoes',exact:true}).click();
   await page.getByRole('button',{name:'Enter the park',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('.wardrobe')&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:60000});
  });
  await check('one broken optional feature does not stop homes, controls or rendering',()=>page.evaluate(()=>{__parkPets.step=()=>{throw Error('QA injected optional feature')};}));
  assert((await read()).party.faults.some(f=>f.key==='pets-step'));
  if(mobile){const end=Date.now()+soakMs;let i=0;while(Date.now()<end){await check('mobile soak '+ ++i,async()=>{await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');await page.waitForTimeout(Math.min(10000,Math.max(0,end-Date.now())));});assert(friend.sockets.every(s=>s.readyState===1));}}
  await send('release');console.log('FOUNDATION_BROWSER_PASS',JSON.stringify({mobile,soakMs:mobile?soakMs:0,errors:errors.length,peerStillConnected:friend.sockets.every(s=>s.readyState===1)}));
 }catch(e){await page.screenshot({path:'.qa-results/failure-'+mobile+'.png'}).catch(()=>{});console.error('BROWSER_STATE',await page.evaluate(()=>JSON.stringify({text:document.body.innerText.slice(-2500),errors:window.__candyErrors,ready:window.__islandWorld?.ready,frames:window.__gate,render:window.__islandWorld?.renderer?.info.render,avatar:document.documentElement.dataset.gameplayAvatarState,park:window.__eggyNet?.connected,social:window.__candyOnline?.data.connected,home:window.__parkHousing?.debug(),party:window.__party?.status()})).catch(()=>''),errors);throw e;}finally{friend?.close();await context.close();}
}
(async()=>{fs.mkdirSync('.qa-results',{recursive:true});await start();if(process.env.PARK_VIEW!=='mobile')await run(false);if(process.env.PARK_VIEW!=='desktop')await run(true);})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill('SIGTERM');});
