const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?v=studio-flow-1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('button',{name:'Choose & dress up',exact:true}).click({timeout:60000});
  await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  for(let i=0;i<40;i++)await page.getByRole('button',{name:'Next shoes',exact:true}).click();
  await page.evaluate(async()=>{for(let i=0;i<1000;i++){document.querySelector('[aria-label="Next shoes"]').click();if(i%10===9)await new Promise(r=>setTimeout(r,0));}});
  await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:180000});
  await page.getByRole('button',{name:'Enter the park',exact:true}).click();
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  const before=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
  await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
  const after=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
  assert(Math.hypot(after.x-before.x,after.z-before.z)>.3,'Movement must still work after outfit spam');
  for(let i=0;i<5;i++){
   await page.getByRole('button',{name:'Profile studio',exact:true}).click();await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   await page.getByRole('button',{name:'Next back',exact:true}).click();await page.getByRole('button',{name:'Enter the park',exact:true}).click();await page.locator('.wardrobe').waitFor({state:'hidden',timeout:120000});
  }
  const stats=await page.evaluate(()=>({canvases:document.querySelectorAll('canvas').length,blocked:document.documentElement.hasAttribute('data-park-settings-open'),renderer:__islandWorld?.renderer?.info?.memory}));
  assert(stats.canvases<=2,'Studio canvases must be disposed');assert.deepEqual(errors,[]);
  console.log('STUDIO STRESS PASS',JSON.stringify({pacedClicks:40,burstClicks:1000,studioCycles:5,moved:Math.hypot(after.x-before.x,after.z-before.z),stats,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
