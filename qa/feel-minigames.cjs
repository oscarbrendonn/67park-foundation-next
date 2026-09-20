const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{for(const route of ['lane-rush/?v=feel-1','skybound-soft/?claudeQA=passive','rockets/?practice=1&forestQA=1','balloon/?practice=1']){
 if(process.env.ROUTE&&!route.startsWith(process.env.ROUTE))continue;
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',route,e.message)});
 await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
 await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForTimeout(12000);
 if(route.startsWith('lane')){
  await page.waitForFunction(()=>window.__rushReadState?.().phase==='ready',null,{timeout:120000});await page.getByRole('button',{name:'Start race',exact:true}).tap();await page.waitForFunction(()=>__rushReadState().phase==='racing');
  await page.keyboard.press('Space');await page.waitForTimeout(150);assert((await page.evaluate(()=>__rushReadState())).player.y>.1);
 }else if(route.startsWith('skybound')){
  await page.getByRole('button',{name:'Enter Skypark',exact:true}).click();
  await page.keyboard.down('KeyW');await page.waitForTimeout(600);await page.keyboard.up('KeyW');
  await page.keyboard.press('Space');await page.waitForTimeout(150);
  console.log('SKY PLAY',(await page.locator('body').innerText()).slice(-600));
 }else if(route.startsWith('rockets')){
  await page.locator('#start').click();await page.waitForTimeout(3400);
  const before=await page.evaluate(()=>__forestQA());
  await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
  const moved=await page.evaluate(()=>__forestQA());
  assert(Math.hypot(moved.player.x-before.player.x,moved.player.z-before.player.z)>.3);
  await page.keyboard.press('Space');await page.waitForTimeout(150);
  const jumped=await page.evaluate(()=>__forestQA());
  assert(!jumped.player.grounded&&jumped.player.y>moved.player.y+.1);
  const client=await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:290,y:370,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210,y:390,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
  const turned=await page.evaluate(()=>__forestQA());assert(Math.abs(turned.camera[0]-jumped.camera[0])>.3);
  console.log('ROCKET PLAY',JSON.stringify({before:before.player,moved:moved.player,jumped:jumped.player,camera:jumped.camera}));
 }else console.log('BALLOON PLAY',(await page.locator('body').innerText()).slice(-400));
 await page.screenshot({path:'/tmp/67park-feel-lab-2UFlpf/'+route.split('/')[0]+'.png'});
 assert.deepEqual(errors,[]);console.log('MINI SMOKE PASS',route);await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
