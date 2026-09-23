// Only the reported umbrella jump and orbit zoom. Uses the existing preview.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const baseline=process.env.PARK_CAMERA_BASELINE==='1';
const url=process.env.PARK_CAMERA_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=camera-touch-1';
const output=process.env.PARK_CAMERA_EVIDENCE||`.qa-results/umbrella-camera-${baseline?'before':'after'}`;
const state=page=>page.evaluate(()=>({...__islandWorld.camera.userData.feelLab,board:__candy.state().board,scale:visualViewport.scale,nearPlane:__islandWorld.camera.near,body:__eggyInput.playerRef.body.translation()}));
async function board(page,on){if((await state(page)).board!==on)await page.keyboard.press('KeyV');await page.waitForFunction(on=>__candy.state().board===on,on);}
async function pinch(cdp,spread){
 const send=(type,a,b)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:a,y:430},{id:2,x:b,y:430}]});
 await send('touchStart',210,290);
 for(let i=1;i<=10;i++){const d=(spread?1:-1)*i*3;await send('touchMove',210-d,290+d);}
 await send('touchEnd');
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),reports=[];
 try{for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
  try{
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    localStorage.setItem('67park-feel-lab-muted','1');
   });
   if(baseline){const source=execFileSync('git',['show','HEAD:app/claude-gorilla-runtime.js'],{encoding:'utf8'});await page.route('**/app/claude-gorilla-runtime.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));}
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
   const renderer=await assertBrowserRenderer(page),report={mobile,renderer,jumps:[],zoom:[],errors};
   await board(page,true);
   for(const [name,x,z] of [['promenade',209,-156],['south-beach',225,-33]]){
    await page.evaluate(({x,z})=>{const w=__islandWorld;__tp([163,w.ground(163,121)+.555,121]);__tp([x,w.ground(x,z)+.555,z]);__eggyInput.input.x=__eggyInput.input.z=0;},{x,z});
    await page.waitForTimeout(350);
    await page.evaluate(()=>{
     const w=__islandWorld,original=w.scene.onAfterRender;window.__cameraEvidence={frames:[],shots:{}};
     window.__cameraStop=()=>{w.scene.onAfterRender=original;};
     w.scene.onAfterRender=function(...args){original?.apply(this,args);const b=__eggyInput.playerRef.body.translation(),c=w.camera.userData.feelLab,e=__cameraEvidence;
      e.frames.push({t:performance.now(),body:{x:b.x,y:b.y,z:b.z},air:__skateState.air,camera:{...c}});
      if(c.distance<.5&&!e.shots.near)e.shots.near=w.renderer.domElement.toDataURL();
      if(__skateState.air>.6&&!e.shots.apex)e.shots.apex=w.renderer.domElement.toDataURL();
     };
    });
    await page.keyboard.press('Space');await page.waitForTimeout(3000);
    const e=await page.evaluate(()=>{__cameraStop();return __cameraEvidence;});
    const frames=e.frames,steps=frames.slice(1).map((f,i)=>({dt:(f.t-frames[i].t)/1000,delta:f.camera.distance-frames[i].camera.distance}));
    const close=frames.filter(f=>f.camera.distance<1.4);
    const jump={name,frames:frames.length,minDistance:Math.min(...frames.map(f=>f.camera.distance)),maxDistanceStep:Math.max(...steps.map(s=>Math.abs(s.delta))),maxOutStep:Math.max(...steps.map(s=>s.delta)),peakAir:Math.max(...frames.map(f=>f.air)),landed:frames.at(-1).air===0,closeFrames:close.length,closeAvatarHidden:close.every(f=>f.camera.avatarHidden&&f.camera.localAvatarVisible===false),avatarRestored:frames.at(-1).camera.localAvatarVisible===true};
    fs.writeFileSync(`${output}/${mobile?'touch':'desktop'}-${name}-frames.json`,JSON.stringify(frames));
    for(const [key,data]of Object.entries(e.shots))fs.writeFileSync(`${output}/${mobile?'touch':'desktop'}-${name}-${key}.png`,Buffer.from(data.split(',')[1],'base64'));
    await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-${name}-landed.png`});
    report.jumps.push(jump);console.log('UMBRELLA_TRACE',JSON.stringify({mobile,...jump}));
   }
   await page.evaluate(()=>{const w=__islandWorld;__tp([163,w.ground(163,121)+.555,121]);});
   await page.waitForTimeout(600);const cdp=await context.newCDPSession(page);
   for(const riding of [true,false]){
    await board(page,riding);await page.waitForTimeout(200);const before=await state(page);
    if(mobile)await pinch(cdp,true);else{await page.mouse.move(600,450);await page.mouse.wheel(0,-450);}
    await page.waitForTimeout(600);const near=await state(page);
    if(mobile)await pinch(cdp,false);else await page.mouse.wheel(0,450);
    await page.waitForTimeout(700);const far=await state(page);
    report.zoom.push({riding,before,near,far});console.log('ZOOM_TRACE',JSON.stringify({mobile,riding,before:before.distance,near:near.distance,far:far.distance,yawChange:far.yaw-before.yaw,pitchChange:far.pitch-before.pitch,viewportScale:far.scale}));
   }
   if(!baseline){
    await board(page,true);
    if(mobile){for(let i=0;i<7;i++)await pinch(cdp,true);}else await page.mouse.wheel(0,-4000);
    await page.waitForTimeout(400);report.firstPerson=await state(page);
    await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-first-person.png`});
    if(mobile)await pinch(cdp,false);else await page.mouse.wheel(0,600);
    await page.waitForTimeout(900);report.thirdPerson=await state(page);
    await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-zoom-restored.png`});
    console.log('FIRST_PERSON_TRACE',JSON.stringify({mobile,near:report.firstPerson,restored:report.thirdPerson}));
   }
   reports.push(report);fs.writeFileSync(`${output}/report.json`,JSON.stringify({baseline,url,reports},null,2));
  }finally{await context.close();}
 }}finally{await browser.close();}
 if(!baseline)for(const r of reports){
  assert.deepEqual(r.errors,[]);
  for(const j of r.jumps){assert(j.frames>30&&j.peakAir>1&&j.landed);assert(j.maxOutStep<1.2,`instant release remains: ${JSON.stringify(j)}`);assert(j.closeFrames>0&&j.closeAvatarHidden&&j.avatarRestored,'camera clips into avatar or does not restore it');}
  for(const z of r.zoom){assert(z.near.distance<z.before.distance-.5,'zoom in did not move camera');assert(z.far.distance>z.near.distance+.5,'zoom out did not move camera');assert.equal(z.far.yaw,z.before.yaw);assert.equal(z.far.pitch,z.before.pitch);assert.equal(z.far.scale,1);}
  const f=r.firstPerson,t=r.thirdPerson;
  assert(f.firstPerson&&f.avatarHidden&&f.localAvatarVisible===false);assert.equal(f.nearPlane,.06);
  assert(Math.abs(f.y-(f.body.y-.555+1.45))<.001);assert.equal(f.x,f.body.x);assert.equal(f.z,f.body.z);
  assert(!t.firstPerson&&!t.avatarHidden&&t.localAvatarVisible);assert.equal(t.nearPlane,.5);assert.equal(f.yaw,t.yaw);assert.equal(f.pitch,t.pitch);
 }
 console.log(baseline?'UMBRELLA_CAMERA_BASELINE_CAPTURED':'UMBRELLA_CAMERA_FOCUSED_PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
