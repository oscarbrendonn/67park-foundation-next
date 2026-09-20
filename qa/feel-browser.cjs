const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const p=await ctx.newPage(),errors=[],failed=[];p.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});p.on('requestfailed',r=>{failed.push(r.url());console.log('FAILED',r.url())});
 p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,250))});
 await p.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
 await p.goto(base+'?claudeQA=passive',{waitUntil:'domcontentloaded',timeout:120000});
 try{await p.waitForFunction(()=>window.__eggyInput?.playerRef?.body&&document.querySelector('#claude-gorilla-qa')?.dataset.state,null,{timeout:180000});}catch(e){console.log('ENTRY',await p.evaluate(()=>({text:document.body.innerText,entry:globalThis[Symbol.for('67park.entry.v1')]?.value,ds:{...document.documentElement.dataset}})));throw e}
 const state=()=>p.evaluate(()=>JSON.parse(document.querySelector('#claude-gorilla-qa').dataset.state));
 const before=await state();await p.keyboard.down('KeyW');await p.waitForTimeout(700);await p.keyboard.up('KeyW');await p.waitForTimeout(180);const after=await state();assert(Math.hypot(after.feet[0]-before.feet[0],after.feet[2]-before.feet[2])>.5);
 await p.keyboard.press('Space');await p.waitForTimeout(160);const jump=await state();assert(!jump.grounded);await p.waitForTimeout(800);
 const orbit=await state();if(mobile){const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y:380,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:230,y:400,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await p.mouse.move(940,440);await p.mouse.down({button:'right'});await p.mouse.move(860,460,{steps:8});await p.mouse.up({button:'right'})}
 await p.waitForTimeout(250);const turned=await state();assert(Math.abs(turned.yaw-orbit.yaw)>.2);assert(turned.pitch>orbit.pitch);assert.equal(turned.camera.fov,55);
 await p.screenshot({path:'/tmp/67park-feel-lab-2UFlpf/'+(mobile?'mobile':'desktop')+'-verified.png'});
 console.log('PARK PASS',JSON.stringify({mobile,before:before.feet,after:after.feet,jump:jump.verticalVelocity,yawChange:turned.yaw-orbit.yaw,pitchChange:turned.pitch-orbit.pitch,errors,failed}));assert.deepEqual(errors,[]);
 await ctx.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
