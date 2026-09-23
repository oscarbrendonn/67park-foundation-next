const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const output=process.env.PUNCH_EVIDENCE||'.qa-results/punch-burst-1',url=process.env.PUNCH_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=punch-burst-1';
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,profiles:[],physicalPhone:false};
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[],row={mobile,errors};report.profiles.push(row);
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
   row.renderer=await assertBrowserRenderer(page);
   await page.evaluate(()=>{const w=__islandWorld;__tp([163,w.ground(163,121)+.555,121]);});
   await page.locator('#preview-hit').waitFor({state:'visible'});
   await page.evaluate(()=>{
    window.__burstWitness={samples:[],draws:0,stop:false};const log=__burstWitness;
    function tick(){if(log.stop)return;const m=__islandWorld.scene.getObjectByName('punch-impact-burst');if(m){m.onBeforeRender=()=>{log.draws++;};log.samples.push({t:performance.now(),visible:m.visible,scale:m.scale.x,opacity:m.material.opacity,triggers:m.userData.punchBurst.triggers,triangles:m.userData.punchBurst.triangles});if(log.samples.length>180)log.samples.shift();}requestAnimationFrame(tick);}tick();
   });
   const punch=()=>mobile?page.locator('#preview-hit').tap():page.keyboard.press('KeyF');
   await punch();await page.waitForFunction(()=>__burstWitness.samples.some(s=>s.visible),null,{timeout:5000});
   await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-punch.png`});
   await page.waitForFunction(()=>__burstWitness.samples.some(s=>s.visible)&&__burstWitness.samples.at(-1)?.visible===false);
   row.normal=await page.evaluate(()=>({...__burstWitness}));assert(row.normal.draws>0,'must draw real effect frames');assert.equal(row.normal.samples.at(-1).triggers,1);assert(row.normal.samples.filter(s=>s.visible).every(s=>s.triangles===24));
   await page.waitForTimeout(500);await page.emulateMedia({reducedMotion:'reduce'});await punch();
   await page.waitForFunction(()=>__burstWitness.samples.some(s=>s.triggers===2&&s.visible));
   await page.waitForFunction(()=>__burstWitness.samples.at(-1)?.triggers===2&&!__burstWitness.samples.at(-1)?.visible);
   row.reduced=await page.evaluate(()=>__burstWitness.samples.filter(s=>s.triggers===2&&s.visible));assert(row.reduced.length);assert(row.reduced.every(s=>s.scale===.9));
   await page.waitForTimeout(550);await page.evaluate(async()=>{const {setPlayerSetting}=await import('/67park-foundation-next/app/player-settings.js');setPlayerSetting('juice',false);});await punch();await page.waitForTimeout(400);
   row.disabled=await page.evaluate(()=>{const m=__islandWorld.scene.getObjectByName('punch-impact-burst');return {visible:m.visible,...m.userData.punchBurst,meshes:__islandWorld.scene.children.filter(n=>n.name==='punch-impact-burst').length};});assert.equal(row.disabled.triggers,2);assert.equal(row.disabled.visible,false);assert.equal(row.disabled.meshes,1);
   assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');assert.deepEqual(errors,[]);row.pass=true;
   console.log('PUNCH_BURST_PASS',JSON.stringify({mobile,realDraws:row.normal.draws,triangles:24,reducedFixedScale:true,disabled:true,errors}));
  }catch(e){row.failure=String(e);row.witness=await page.evaluate(()=>window.__burstWitness).catch(()=>null);await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-failure.png`}).catch(()=>{});throw e;}
  finally{await page.evaluate(()=>{if(window.__burstWitness)__burstWitness.stop=true;}).catch(()=>{});await context.close();}
 }}finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error('PUNCH_BURST_FAIL',e);process.exitCode=1;});
