const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'lane-rush/?v=feel-1',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__rushReadState?.().phase==='ready',null,{timeout:120000});
 await page.getByRole('button',{name:'Start race',exact:true}).click();
 await page.waitForFunction(()=>__rushReadState().phase==='racing');
 await page.keyboard.down('ShiftLeft');
 for(let i=0;i<100;i++){
  const s=await page.evaluate(()=>__rushReadState());if(s.player.carry)break;
  const t=s.racers.filter(r=>r.name!=='You').sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z))[0];
  const dx=t.x-s.player.x,dz=t.z-s.player.z;
  for(const [k,on] of [['KeyW',dz<-.3],['KeyS',dz>.3],['KeyA',dx<-.3],['KeyD',dx>.3]])await page.keyboard[on?'down':'up'](k);
  if(Math.hypot(dx,dz)<1.8){if(mobile)await page.locator('#grab').tap();else await page.keyboard.press('KeyE');}
  await page.waitForTimeout(60);
 }
 for(const k of ['KeyW','KeyS','KeyA','KeyD','ShiftLeft'])await page.keyboard.up(k);
 await page.waitForFunction(()=>__rushReadState().player.carry,null,{timeout:10000});await page.waitForTimeout(500);
 const held=await page.evaluate(()=>__rushReadState()),hands=held.racers.find(r=>r.name==='You').hands;
 assert(hands.active&&hands.maxGap<=.16);
 await page.screenshot({path:'/tmp/67park-feel-lab-2UFlpf/carry-'+mobile+'.png'});
 if(mobile)await page.locator('#grab').tap();else await page.keyboard.press('KeyE');await page.waitForTimeout(350);
 const released=await page.evaluate(()=>__rushReadState());assert(!released.player.carry);assert.equal(released.racers.find(r=>r.name==='You').hands.weight,0);
 await page.evaluate(()=>{for(let i=0;i<1000;i++)document.querySelector('#grab').click()});await page.waitForTimeout(450);
 const after=await page.evaluate(()=>__rushReadState());assert(after.frames-released.frames>=4);assert.deepEqual(errors,[]);
 console.log('CARRY PASS',JSON.stringify({mobile,hands,framesAfter1000:after.frames-released.frames,errors}));await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
