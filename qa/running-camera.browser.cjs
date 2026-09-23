// Only running-course camera/input checks. Existing preview; no server or CI.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const output=process.env.RUNNING_CAMERA_EVIDENCE||'.qa-results/running-camera-1';
const base=process.env.RUNNING_CAMERA_URL||'http://127.0.0.1:8496/67park-foundation-next/';
const read=page=>page.evaluate(()=>window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}'));
const camera=async page=>(await read(page)).cameraSettings;
// Skybound publishes diagnostics at 10 Hz. Wait for the final gesture value,
// not an intermediate sample that merely crossed the requested threshold.
async function settledCamera(page){
 const expected=await page.evaluate(async()=>(await import('/67park-foundation-next/app/camera-zoom.js?v=camera-settings-1')).readCameraZoom());
 await page.waitForFunction(value=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.cameraSettings?.requestedDistance===value;},expected);
 return camera(page);
}
async function pinch(cdp,spread){
 const send=(type,a,b)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:a,y:420},{id:2,x:b,y:420}]});
 await send('touchStart',210,290);for(let i=1;i<=10;i++){const d=(spread?1:-1)*i*3;await send('touchMove',210-d,290+d);}await send('touchEnd');
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={base,profiles:[],physicalPhone:false};
 try{for(const mobile of [false,true])for(const game of ['lane-rush','skybound-soft']){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
  const row={mobile,game,errors};report.profiles.push(row);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');if(!localStorage.getItem('67park-feel-lab.character.v3'))localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));});
  const click=locator=>mobile?locator.tap():locator.click();
  async function ready(){
   if(game==='lane-rush')await page.waitForFunction(()=>window.__rushReadState?.().phase==='ready',null,{timeout:90000});
   else {await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}').ready,null,{timeout:90000});await click(page.getByRole('button',{name:'Enter Skypark',exact:true}));await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas[data-character-control]').dataset.characterControl).enabled);}
  }
  try{
   await page.goto(base+game+'/',{waitUntil:'domcontentloaded',timeout:60000});await ready();
   const cdp=mobile?await context.newCDPSession(page):null;
   const open=()=>click(page.locator('#running-camera-settings')),close=()=>click(page.getByRole('button',{name:'Close settings',exact:true}));
   await open();const slider=page.getByRole('slider',{name:'Camera distance',exact:true});const rect=await slider.boundingBox();assert(rect.height>=44);
   if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:7,x:rect.x+rect.width*.78,y:rect.y+rect.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else await page.mouse.click(rect.x+rect.width*.78,rect.y+rect.height/2);
   row.slider=Number(await slider.inputValue())/100;assert(row.slider>8&&row.slider<11);await page.screenshot({path:`${output}/${game}-${mobile?'touch':'desktop'}-settings.png`});await close();
   await page.waitForFunction(expected=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.cameraSettings?.requestedDistance===expected;},row.slider);
   await open();await click(page.getByRole('button',{name:'First person',exact:true}));await close();
   await page.waitForFunction(()=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.cameraSettings?.firstPerson&&!s.cameraSettings?.localAvatarVisible;});
   row.firstPerson=await camera(page);assert.deepEqual(row.firstPerson.position,row.firstPerson.eye);if(game==='lane-rush')assert.deepEqual((await read(page)).otherAvatars,[true,true,true]);
   await page.screenshot({path:`${output}/${game}-${mobile?'touch':'desktop'}-first-person.png`});
   await open();await click(page.getByRole('button',{name:'Reset camera',exact:true}));await close();
   await page.waitForFunction(()=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.cameraSettings?.requestedDistance===6.8&&s.cameraSettings.localAvatarVisible;});
   const before=await camera(page);
   if(mobile)await pinch(cdp,true);else {await page.mouse.move(620,420);await page.mouse.wheel(0,-300);}
   await page.waitForFunction(previous=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.cameraSettings?.requestedDistance<previous-.4;},before.requestedDistance);
   const near=await settledCamera(page);
   if(mobile)await pinch(cdp,false);else await page.mouse.wheel(0,300);
   await page.waitForFunction(previous=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.cameraSettings?.requestedDistance>previous+.4;},near.requestedDistance);
   const far=await settledCamera(page);assert.equal(far.yaw,before.yaw);assert.equal(far.pitch,before.pitch);assert.equal(await page.evaluate(()=>visualViewport.scale),1);row.zoom={before,near,far};
   if(game==='lane-rush'){await click(page.getByRole('button',{name:'Start race',exact:true}));await page.waitForFunction(()=>__rushReadState().phase==='racing');}
   const movementBefore=await read(page);
   if(mobile){
    const stick=await page.locator(game==='lane-rush'?'#stick':'.park-stick').boundingBox();assert(stick);const x=stick.x+stick.width/2,y=stick.y+stick.height/2;
    const jb=await page.locator(game==='lane-rush'?'#jump':'button[aria-label="Jump"]').boundingBox();assert(jb);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,x,y:y-35}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x,y:y-35},{id:12,x:jb.x+jb.width/2,y:jb.y+jb.height/2}]});
   }else {await page.locator('canvas').focus();await page.keyboard.down('KeyW');await page.keyboard.down('Space');}
   try{await page.waitForFunction(()=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.player?s.player.y>.15:s.verticalVelocity>1;},null,{timeout:5000});row.movingJump=await read(page);}
   finally{if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else {await page.keyboard.up('KeyW');await page.keyboard.up('Space');}}
   assert.equal(row.movingJump.cameraSettings.requestedDistance,far.requestedDistance,'joystick and Jump cannot become pinch');
   row.movementBefore=movementBefore;
   await open();const blockedBefore=await read(page);await slider.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('KeyW');await page.keyboard.press('Space');await page.waitForTimeout(200);row.modal=await read(page);
   assert.equal(await page.locator('#running-camera-dialog').evaluate(d=>d.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#running-camera-dialog').evaluate(d=>d.open),false);
   await page.waitForTimeout(220);const expected=JSON.parse(await page.evaluate(()=>localStorage.getItem('67park.feel-lab.player-settings.v1'))).cameraDistance;
   await page.reload({waitUntil:'domcontentloaded'});await ready();row.reload=await camera(page);assert.equal(row.reload.requestedDistance,expected);
   assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');assert.deepEqual(errors,[]);row.pass=true;console.log('RUNNING_CAMERA_PASS',JSON.stringify({game,mobile,slider:row.slider,firstPerson:row.firstPerson.firstPerson,zoom:[before.requestedDistance,near.requestedDistance,far.requestedDistance],reload:row.reload.requestedDistance,errors}));
  }catch(e){row.failure=String(e);row.last=await read(page).catch(()=>null);await page.screenshot({path:`${output}/${game}-${mobile?'touch':'desktop'}-failure.png`}).catch(()=>{});throw e;}
  finally{await context.close();}
 }}finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error('RUNNING_CAMERA_FAIL',e);process.exitCode=1;});
