const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8497/67park-foundation-next/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
  let failures=0;
  await page.route('**/island/ada_calisma.glb*',route=>{failures++;return route.fulfill({status:503,body:'Intentional local asset failure'})});
  await page.goto(base+'?v=hatch-ends-1',{waitUntil:'domcontentloaded'});
  await page.locator('[data-return-entry=error]').waitFor({timeout:120000});
  assert(failures>0);assert.equal(await page.locator('#party-settings-btn').isVisible(),false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('67park-feel-lab.player-profile.v1')).base),'goril');
  await page.unroute('**/island/ada_calisma.glb*');
  await page.getByRole('button',{name:'Retry loading',exact:true}).click();
  await page.waitForFunction(()=>window.__islandWorld?.ready&&!document.querySelector('.wardrobe')&&window.__eggyNet?.connected,null,{timeout:180000});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.gameplayAvatarState),'ready');
  assert.deepEqual(await page.evaluate(()=>__candyErrors),[]);
  console.log('MAP ASSET FAILURE / RETRY PASS',JSON.stringify({mobile,failures}));await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
