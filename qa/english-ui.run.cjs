const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.PARK_ENGLISH_URL||'http://127.0.0.1:8496/67park-foundation-next/';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions()),errors=[],report={base,courts:[]};
 fs.mkdirSync('.qa-results/english-ui',{recursive:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  await assertBrowserRenderer(page);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  const court=page.getByRole('region',{name:'Court free play'});
  for(const [label,x,z,width] of [['Basketball',-54,-30.5,1280],['Football',161.39962779156327,-37,390]]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(({x,z})=>{const w=__islandWorld;__tp([x,w.ground(x,z)+.555,z]);},{x,z});
   await page.waitForFunction(label=>document.querySelector('.lobby-court-panel:not([hidden]) strong')?.textContent===label,label,{timeout:6000});
   const text=await court.innerText();assert(text.includes(label));assert(text.includes('Lobby · Free play'));assert(text.includes('Play a match ↗'));
   assert(text.includes('Walk into the ball to move it. It stays inside the court.')||text.includes('Waiting for the lobby connection…'));
   const size=await court.boundingBox();assert(size.x>=0&&size.x+size.width<=width,'court UI fits viewport');
   assert(!/[çğıİşŞ]/.test(text));report.courts.push({label,width,text});
   await page.screenshot({path:'.qa-results/english-ui/court-'+label.toLowerCase()+'.png'});
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
  assert.deepEqual(errors,[]);await context.close();

  // Test the real explore page and its recovery copy with a bounded deliberate
  // local browser request failure; do not alter any server or public asset.
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const explore=await mobile.newPage();
  await explore.route('**/island/runtime.bundle.js?*',route=>route.abort('failed'));
  const url=new URL('explore/',base);url.search=new URL(base).search;
  await explore.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
  const retry=explore.getByRole('button',{name:'Retry loading',exact:true});await retry.waitFor({state:'visible',timeout:15000});
  const text=await explore.locator('body').innerText();assert(text.includes('The map could not load. Check your connection and try again.'));
  for(const name of ['Island overview','Street level','Show controls'])assert.equal(await explore.getByRole('button',{name,exact:true}).count(),1);
  assert.equal(await explore.locator('html').getAttribute('lang'),'en');assert(!/[çğıİşŞ]/.test(text));
  report.exploreRecovery={width:390,text,intentionalRequestFailure:true};
  await explore.screenshot({path:'.qa-results/english-ui/explore-retry-mobile.png'});
  await mobile.close();console.log('ENGLISH_UI_BROWSER_PASS',JSON.stringify(report));
 }finally{fs.writeFileSync('.qa-results/english-ui/report.json',JSON.stringify({...report,errors},null,2));await browser.close();}
})().catch(e=>{console.error('ENGLISH_UI_BROWSER_FAIL',e);process.exitCode=1});
