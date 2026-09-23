// Focused mobile entry, native settings slider, pinch and first-person checks.
// Uses the existing preview; no servers, publication, soak or general suite.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const url=process.env.PARK_CAMERA_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=camera-settings-1';
const output=process.env.PARK_CAMERA_EVIDENCE||'.qa-results/camera-settings-mobile';
const state=page=>page.evaluate(()=>({...__islandWorld.camera.userData.feelLab,board:__candy.state().board,scale:visualViewport.scale}));
async function pinch(cdp,spread){
 const send=(type,a,b)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:a,y:420},{id:2,x:b,y:420}]});
 await send('touchStart',210,290);
 for(let i=1;i<=10;i++){const d=(spread?1:-1)*i*3;await send('touchMove',210-d,290+d);}
 await send('touchEnd');
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch(browserLaunchOptions());
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],report={url,profile:'390x844 touch DPR3; not physical iPhone',errors};
 page.on('pageerror',e=>errors.push(e.message));
 // Fresh profile: exercise the editor and Enter button, not saved-player bypass.
 await page.addInitScript(()=>localStorage.setItem('67park-feel-lab-muted','1'));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:'Choose & dress up',exact:true}).tap({timeout:60000});
  await page.getByRole('button',{name:'Enter the park',exact:true}).tap({timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:120000});
  report.renderer=await assertBrowserRenderer(page);
  report.entry=await page.evaluate(()=>globalThis[Symbol.for('67park.entry.v1')].value);
  console.log('FRESH_MOBILE_EDITOR_ENTRY_PASS',JSON.stringify({stage:report.entry.step,elapsed:report.entry.elapsedMs}));
  await page.evaluate(()=>{const w=__islandWorld;__tp([163,w.ground(163,121)+.555,121]);});
  const cdp=await context.newCDPSession(page);
  const open=()=>page.getByRole('button',{name:'Party settings',exact:true}).tap();
  const close=()=>page.getByRole('button',{name:'Close settings',exact:true}).tap();
  await open();
  const slider=page.getByRole('slider',{name:'Camera distance',exact:true});
  await slider.scrollIntoViewIfNeeded();
  const rect=await slider.boundingBox();assert(rect&&rect.height>=44);
  const x=rect.x+rect.width*.78,y=rect.y+rect.height/2;
  // Actual touch on the native range; no JS value or synthetic input shortcut.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:rect.x+rect.width*.55,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:7,x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const farValue=Number(await slider.inputValue())/100;assert(farValue>8&&farValue<11);
  await page.screenshot({path:output+'/mobile-settings.png'});
  await close();
  await page.waitForFunction(value=>Math.abs(__islandWorld.camera.userData.feelLab.requestedDistance-value)<.001,farValue);
  report.slider={rect,value:farValue,camera:await state(page)};
  await open();await page.getByRole('button',{name:'First person',exact:true}).tap();
  assert.equal(await slider.getAttribute('aria-valuetext'),'First person');await close();
  await page.waitForFunction(()=>__islandWorld.camera.userData.feelLab.firstPerson&&__islandWorld.camera.userData.feelLab.localAvatarVisible===false);
  report.firstPerson=await state(page);await page.screenshot({path:output+'/mobile-first-person.png'});
  await open();await page.getByRole('button',{name:'Reset camera',exact:true}).tap();await close();
  await page.waitForFunction(()=>__islandWorld.camera.userData.feelLab.requestedDistance===6.8&&!__islandWorld.camera.userData.feelLab.firstPerson&&__islandWorld.camera.userData.feelLab.localAvatarVisible);
  report.reset=await state(page);report.pinch=[];
  for(const riding of [false,true]){
   if((await state(page)).board!==riding)await page.getByRole('button',{name:riding?'Skate':'Walk',exact:true}).tap();
   await page.waitForFunction(value=>__candy.state().board===value,riding);
   const before=await state(page);await pinch(cdp,true);
   await page.waitForFunction(value=>__islandWorld.camera.userData.feelLab.requestedDistance<value-.5,before.requestedDistance);
   const near=await state(page);await pinch(cdp,false);
   await page.waitForFunction(value=>__islandWorld.camera.userData.feelLab.requestedDistance>value+.5,near.requestedDistance);
   const far=await state(page);
   assert.equal(far.yaw,before.yaw);assert.equal(far.pitch,before.pitch);assert.equal(far.scale,1);
   report.pinch.push({riding,before,near,far});
  }
  await open();const expected=(await state(page)).requestedDistance;
  assert(Math.abs(Number(await slider.inputValue())/100-expected)<=.05,'settings reflect the pinch value');
  report.pinchSettingsValue=Number(await slider.inputValue())/100;
  await close();
  await page.waitForFunction(value=>JSON.parse(localStorage.getItem('67park.feel-lab.player-settings.v1')).cameraDistance===value,expected);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:120000});
  await page.waitForFunction(value=>Math.abs(__islandWorld.camera.userData.feelLab.requestedDistance-value)<.001,expected);
  report.reload=await state(page);assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
  assert.deepEqual(errors,[]);report.pass=true;
  console.log('MOBILE_CAMERA_SETTINGS_PASS',JSON.stringify({slider:farValue,pinch:report.pinch.map(p=>({riding:p.riding,before:p.before.requestedDistance,near:p.near.requestedDistance,far:p.far.requestedDistance})),firstPerson:report.firstPerson.firstPerson,reload:report.reload.requestedDistance,errors}));
 }catch(e){
  report.failure=String(e);report.entry=await page.evaluate(()=>globalThis[Symbol.for('67park.entry.v1')]?.value).catch(()=>null);
  await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw e;
 }finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
