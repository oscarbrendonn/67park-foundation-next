// Focused wardrobe only. Reuse the existing local preview, no full suite/soak.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_GORILLA_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=gorilla-only-1';
const output=process.env.PARK_GORILLA_EVIDENCE||'.qa-results/gorilla-only-browser';
const key='67park-feel-lab.character.v3';
const old={base:'friendsie_1',head:'friendsie_1:0',body:'friendsie_2:2',back:'friendsie_2:4',kicks:'friendsie_3333:5',sprout:'friendsie_8:90',held:null,power:null,vibe:null};
const saved=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const waitPark=page=>page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState==='ready'&&document.documentElement.dataset.gameplayAvatarBase==='goril'&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:90000});
(async()=>{
 fs.mkdirSync(output,{recursive:true});const report={url,profiles:[]},browser=await chromium.launch(browserLaunchOptions());
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mobile,old,key})=>{
   localStorage.setItem('67park-feel-lab-muted','1');
   if(mobile&&!sessionStorage.getItem('gorilla-fixture')){localStorage.setItem(key,JSON.stringify(old));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:old.base}));sessionStorage.setItem('gorilla-fixture','1');}
  },{mobile,old,key});
  const click=locator=>mobile?locator.tap():locator.click();
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
   if(mobile){
    await waitPark(page);const eq=await saved(page);assert.equal(eq.base,'goril');assert.equal(eq.head,null);
    for(const k of ['body','back','kicks','sprout'])assert.equal(eq[k],old[k]);
    await click(page.getByRole('button',{name:'Profile studio',exact:true}));
   await click(page.getByRole('button',{name:'Choose & dress up',exact:true}));
   }else{
    await page.getByRole('dialog',{name:'Character wardrobe',exact:true}).waitFor({timeout:60000});
    const names=await page.locator('.wardrobe-options').innerText();assert(names.includes('Gorilla 67'));assert(!names.includes('Buddy #'));
    await page.screenshot({path:output+'/desktop-roster.png'});
    await click(page.getByRole('button',{name:'Choose & dress up',exact:true}));
   }
   await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   if(mobile){await click(page.getByRole('button',{name:'‹ Characters',exact:true}));const names=await page.locator('.wardrobe-options').innerText();assert(names.includes('Gorilla 67'));assert(!names.includes('Buddy #'));await page.screenshot({path:output+'/touch-roster.png'});await click(page.getByRole('button',{name:'Choose & dress up',exact:true}));}
   for(const name of ['shoes','back','outfit','headwear','eyewear'])await click(page.getByRole('button',{name:'Next '+name,exact:true}));
   const selected=await saved(page);assert.equal(selected.base,'goril');assert(Object.values(selected).some(v=>typeof v==='string'&&v.startsWith('friendsie_')));
   await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState==='ready'&&!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
   await page.screenshot({path:output+'/'+(mobile?'touch':'desktop')+'-clothes.png'});
   await click(page.getByRole('button',{name:'Enter the park',exact:true}));await waitPark(page);
   const actual=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.gameplayAvatarKey));assert.deepEqual(actual,['base','body','head','sprout','back','kicks','held','power','vibe'].map(k=>selected[k]??null));
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});await waitPark(page);assert.deepEqual(await saved(page),selected);
   assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');assert.deepEqual(errors,[]);
   report.profiles.push({mobile,migration:mobile,selected,actual,errors});console.log('GORILLA_ONLY_BROWSER_PASS',JSON.stringify(report.profiles.at(-1)));
  }catch(e){report.failure=String(e);await page.screenshot({path:output+'/'+(mobile?'touch':'desktop')+'-failure.png'}).catch(()=>{});throw e;}
  finally{await context.close();}
 }}finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
