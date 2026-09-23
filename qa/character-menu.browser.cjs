// Focused returning-player check. Own isolated browser; no full-world regression.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_CHARACTER_URL;
const out=process.env.PARK_CHARACTER_EVIDENCE;
assert(url&&out,'Set explicit URL and a new evidence directory');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());
 const report={url,errors:[]};let page;
 try{
  page=await browser.newPage({viewport:process.env.PARK_CHARACTER_PORTRAIT==='1'?{width:390,height:844}:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab-muted','1');
   if(!sessionStorage.getItem('menu-fixture')){
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril',body:null,head:null,sprout:null,back:null,kicks:null,held:null,power:null,vibe:null}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    sessionStorage.setItem('menu-fixture','1');
   }
  });
  const ready=()=>page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await ready();
  await page.screenshot({path:out+'/park.png'});
  const profile=page.getByRole('button',{name:'Profile studio',exact:true});
  if(process.env.PARK_CHARACTER_BASELINE!=='1')await profile.getByText('Characters',{exact:true}).waitFor({state:'visible'});
  report.profile=await profile.evaluate(el=>{const r=el.getBoundingClientRect();return {rect:r.toJSON(),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML,inert:!!el.closest('[inert]')}});
  await profile.tap({timeout:10000});
  report.dialogs=await page.getByRole('dialog').allTextContents();
  await page.waitForFunction(()=>!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
  await page.screenshot({path:out+'/after-profile.png'});
  if(process.env.PARK_CHARACTER_BASELINE==='1'){
   await page.getByRole('button',{name:'‹ Characters',exact:true}).tap({timeout:10000});
  }
  await page.getByRole('button',{name:/Cat 67/}).waitFor({timeout:10000});
  report.roster=await page.locator('.wardrobe-options').innerText();
  assert.match(report.roster,/Gorilla 67/);assert.match(report.roster,/Cat 67/);
  await page.screenshot({path:out+'/roster.png'});
  await page.getByRole('button',{name:/Cat 67/}).tap();
  await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
  await page.getByRole('button',{name:'Enter the park',exact:true}).tap();await ready();
  await page.waitForFunction(()=>!document.querySelector('.wardrobe'));
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.gameplayAvatarBase),'cat67');
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await ready();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.gameplayAvatarBase),'cat67');
  await profile.tap();
  if(process.env.PARK_CHARACTER_BASELINE==='1')await page.getByRole('button',{name:'‹ Characters',exact:true}).tap();
  await page.getByRole('button',{name:/Gorilla 67/}).tap();
  await page.getByRole('button',{name:'Enter the park',exact:true}).tap();await ready();
  await page.waitForFunction(()=>!document.querySelector('.wardrobe'));
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.gameplayAvatarBase),'goril');
  assert.deepEqual(report.errors,[]);report.pass=true;
  console.log('CHARACTER_MENU_PASS',JSON.stringify({url,profile:report.profile}));
 }catch(error){report.failure=String(error);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
