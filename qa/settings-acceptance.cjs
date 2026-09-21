const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');

// Bounded browser acceptance: the normal park entry, one reload and one
// standalone mini-game. It deliberately keeps the existing master mute on.
const base=process.env.FEEL_URL||'http://127.0.0.1:8496/67park-foundation-next/';
const settingsKey='67park.feel-lab.player-settings.v1';
const stage=process.env.SETTINGS_STAGE||'preserve';

async function enterPark(page){
 await page.goto(base+'?v=settings-acceptance-1',{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('#party-settings-btn').waitFor({state:'attached',timeout:30000});
 if(await page.locator('.wardrobe').count()){
  await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();
  await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await page.getByRole('button',{name:'Enter the park',exact:true}).click({timeout:180000});
 }
 await page.locator('#party-settings-btn').waitFor({state:'visible',timeout:180000});
}
async function setRange(page,key,value){
 await page.locator('#setting-'+key).evaluate((el,next)=>{
  el.value=String(next);el.dispatchEvent(new Event('input',{bubbles:true}));
 },value);
}
async function readStored(page){
 return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),settingsKey);
}
async function renderer(page){
 return page.evaluate(()=>{const r=__islandWorld.renderer;return {ratio:r.getPixelRatio(),width:r.domElement.width,height:r.domElement.height,shadows:r.shadowMap.enabled,profile:JSON.parse(r.domElement.dataset.parkGraphics)};});
}
async function selectGraphics(page,level){
 await page.getByRole('combobox',{name:'Graphics quality',exact:true}).selectOption(level);
 await page.waitForFunction(expected=>JSON.parse(__islandWorld.renderer.domElement.dataset.parkGraphics).level===expected,level);
 return renderer(page);
}
async function trustedYawDrag(page,mobile){
 const before=await page.evaluate(()=>__islandWorld.camera.userData.feelLab.yaw);
 if(mobile){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y:380,id:17}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210,y:380,id:17}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
  await page.mouse.move(940,440);await page.mouse.down({button:'right'});await page.mouse.move(840,440);await page.mouse.up({button:'right'});
 }
 await page.waitForTimeout(160);
 return Math.abs((await page.evaluate(()=>__islandWorld.camera.userData.feelLab.yaw))-before);
}
async function run(mobile){
 const browser=await chromium.launch(browserLaunchOptions());
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:3,isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 // Never enable the existing speaker control while doing browser acceptance.
 await page.addInitScript(()=>localStorage.setItem('67park-feel-lab-muted','1'));
 try{
  await enterPark(page);
  await assertBrowserRenderer(page);
  await page.getByRole('button',{name:'Party settings',exact:true}).click();
  const sizeKey=mobile?'mobileButtonSize':'desktopButtonSize';
  await setRange(page,'mouseSensitivity',100);
  await setRange(page,'touchSensitivity',100);
  const originalDelta=await page.evaluate(async()=>{const {cameraLookDelta}=await import('/67park-foundation-next/app/control-tuning.js?v=camera-36');return {mouse:cameraLookDelta({x:100,y:0},true).x,touch:cameraLookDelta({x:100,y:0},false).x};});
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  const originalYaw=await trustedYawDrag(page,mobile);
  await page.getByRole('button',{name:'Party settings',exact:true}).click();
  await setRange(page,'mouseSensitivity',150);
  await setRange(page,'touchSensitivity',55);
  const changedDelta=await page.evaluate(async()=>{const {cameraLookDelta}=await import('/67park-foundation-next/app/control-tuning.js?v=camera-36');return {mouse:cameraLookDelta({x:100,y:0},true).x,touch:cameraLookDelta({x:100,y:0},false).x};});
  assert(Math.abs(changedDelta.mouse/originalDelta.mouse-1.5)<1e-10,'mouse configured delta must scale 1.5x');
  assert(Math.abs(changedDelta.touch/originalDelta.touch-.55)<1e-10,'touch configured delta must scale .55x');
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  const changedYaw=await trustedYawDrag(page,mobile);
  assert(Math.abs(changedYaw/originalYaw-(mobile ? .55 : 1.5))<.03,'trusted '+(mobile?'touch':'mouse')+' drag must change real camera yaw');
  await page.getByRole('button',{name:'Party settings',exact:true}).click();
  await setRange(page,sizeKey,80);
  const smallButtons=await page.evaluate(()=>{const el=document.querySelector('.park-actions')||document.querySelector('.park-desktop-actions')||document.querySelector('.party-eggy');const r=el?.getBoundingClientRect();return {width:r?.width,height:r?.height,scale:document.documentElement.style.getPropertyValue('--park-button-scale')};});
  await setRange(page,sizeKey,115);
  const midButtons=await page.evaluate(()=>{const el=document.querySelector('.park-actions')||document.querySelector('.park-desktop-actions')||document.querySelector('.party-eggy');const r=el?.getBoundingClientRect();return {width:r?.width,height:r?.height,scale:document.documentElement.style.getPropertyValue('--park-button-scale')};});
  await setRange(page,sizeKey,120);
  const largeButtons=await page.evaluate(()=>{const el=document.querySelector('.park-actions')||document.querySelector('.park-desktop-actions')||document.querySelector('.party-eggy');const r=el?.getBoundingClientRect();return {width:r?.width,height:r?.height,scale:document.documentElement.style.getPropertyValue('--park-button-scale')};});
  assert(smallButtons.width>0&&smallButtons.height>0,'a visible action layout must receive button scaling');
  assert(largeButtons.width>smallButtons.width&&largeButtons.height>smallButtons.height,'button size must change visible DOM bounds');
  await setRange(page,sizeKey,115);
  await setRange(page,'sfx',35);
  await setRange(page,'ambience',25);
  const high=await selectGraphics(page,'high'),medium=await selectGraphics(page,'medium'),low=await selectGraphics(page,'low');
  assert(high.shadows&&medium.shadows&&!low.shadows,'High/Medium/Low must change live renderer shadow state');
  assert(high.width>medium.width&&medium.width>low.width&&high.height>medium.height&&medium.height>low.height,'High/Medium/Low must change live framebuffer resolution');
  for(const name of ['Show chat messages','Show player names','Bouncy moves','Jump pads']){
   await page.getByRole('switch',{name,exact:true}).click();
  }
  const stored=await readStored(page);
  assert.deepEqual(Object.fromEntries(['mouseSensitivity','touchSensitivity',sizeKey,'sfx','ambience','graphics','showChat','showNames','juice','pads'].map(key=>[key,stored[key]])),{
   mouseSensitivity:1.5,touchSensitivity:.55,[sizeKey]:1.15,sfx:.35,ambience:.25,graphics:'low',showChat:false,showNames:false,juice:false,pads:false,
  });
  const live=await page.evaluate(()=>({
   chat:document.documentElement.dataset.parkShowChat,
   names:document.documentElement.dataset.parkShowNames,
   scale:document.documentElement.style.getPropertyValue('--park-button-scale'),
   graphics:JSON.parse(__islandWorld.renderer.domElement.dataset.parkGraphics),
   muted:localStorage.getItem('67park-feel-lab-muted'),
   hapticsUi:!!document.querySelector('[role=switch][aria-label="Vibration"]'),
  }));
  const {hapticsUi,...liveSettings}=live;
  assert.deepEqual(liveSettings,{chat:'false',names:'false',scale:'1.15',graphics:{level:'low',dpr:.8,shadows:false,shadowLimit:512},muted:'1'});
  assert.equal(await page.locator('#settings-muted').isVisible(),true,'master mute must remain visible and distinct from both sliders');
  if(stage==='panel'){
   await page.getByText('Show controls',{exact:true}).click();
   assert.match(await page.locator('#party-settings').innerText(),/WASD \/ arrows: move/);
   await page.getByText('Report a bug',{exact:true}).click();
   await page.locator('#settings-report-description').fill('Settings acceptance QA description');
   const download=page.waitForEvent('download');
   await page.getByRole('button',{name:'Save bug report',exact:true}).click();
   assert.match(await (await download).createReadStream().then(async stream=>{
    const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks).toString('utf8');
   }),/Settings acceptance QA description/);
   await page.getByRole('button',{name:'Restore defaults',exact:true}).click();
   await page.getByRole('button',{name:'Reset settings',exact:true}).click();
   const reset=await readStored(page);
   assert.deepEqual(reset,{mouseSensitivity:1,touchSensitivity:1,desktopButtonSize:1,mobileButtonSize:1,sfx:.8,ambience:1,showChat:true,showNames:true,juice:true,pads:true,haptics:true,graphics:'auto'});
   assert.deepEqual(errors,[]);
   console.log('SETTINGS PANEL ACCEPTANCE PASS',JSON.stringify({mobile,live,turn:{originalDelta,changedDelta,originalYaw,changedYaw},buttons:{smallButtons,midButtons,largeButtons},graphics:{high,medium,low}}));
   return;
  }
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await page.locator('#park-home-button').click();
  const home=await page.evaluate(()=>__parkHousing.debug().model.houses.find(h=>!h.owner)?.id);
  assert(home,'an unoccupied isolated local QA home is required');
  const card=page.locator(`[data-house="${home}"]`);
  await card.locator('[data-home-action=claim]').click();
  await page.waitForFunction(id=>__parkHousing.debug().model.houses.find(h=>h.id===id)?.owner===__candyOnline.data.me.id,home);
  await card.locator('[data-home-action=door]').click();
  await page.waitForFunction(()=>!document.querySelector('#park-homes').open);
  await page.locator('#park-home-button').click();
  await card.locator('[data-home-action=enter]').waitFor({state:'visible',timeout:30000});
  await card.locator('[data-home-action=enter]').click();
  await page.waitForFunction(id=>__parkHousing.debug().visit===id,home);
  await page.locator('#park-home-button').click();
  await page.locator('#home-inside').waitFor({state:'visible'});
  await page.locator('#home-inside [data-home-action=exit]').click();
  await page.waitForFunction(()=>!__parkHousing.debug().visit);
  await page.locator('#park-home-button').click();
  await card.locator('[data-home-action=release]').click();
  await card.locator('[data-home-action=release]').click();
  await page.waitForFunction(id=>!__parkHousing.debug().model.houses.find(h=>h.id===id)?.owner,home);
  await page.locator('.home-close').click();
  assert.deepEqual(await readStored(page),stored,'settings must survive one actual local home enter and exit');
  await page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('#party-settings-btn').waitFor({state:'visible',timeout:180000});
  assert.deepEqual(await readStored(page),stored,'settings must survive a normal park reload');
  await page.goto(base+'rockets/?settings-acceptance=1',{waitUntil:'domcontentloaded',timeout:120000});
  const miniCanvas=page.locator('canvas').first();await miniCanvas.waitFor({state:'attached',timeout:60000});
  await page.waitForFunction(canvas=>canvas.dataset.parkGraphics,await miniCanvas.elementHandle());
  const mini=await page.evaluate(key=>({stored:JSON.parse(localStorage.getItem(key)),graphics:JSON.parse(document.querySelector('canvas').dataset.parkGraphics),muted:localStorage.getItem('67park-feel-lab-muted')}),settingsKey);
  assert.equal(mini.stored.graphics,'low');assert.equal(mini.graphics.level,'low');assert.equal(mini.graphics.shadows,false);assert.equal(mini.muted,'1');
  assert.deepEqual(errors,[]);
  console.log('SETTINGS ACCEPTANCE PASS',JSON.stringify({mobile,live,mini:{graphics:mini.graphics,muted:mini.muted}}));
 }finally{await browser.close();}
}

(async()=>{
 const mode=process.env.SETTINGS_MODE;
 if(mode!=='mobile')await run(false);
 if(mode!=='desktop')await run(true);
})().catch(error=>{console.error(error);process.exitCode=1;});
