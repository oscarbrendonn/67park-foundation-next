const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const wanted={body:'friendsie_2:2',back:'friendsie_2:4',kicks:'friendsie_3333:5',sprout:'friendsie_8:90',head:'friendsie_26:90'};
const readEquip=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('67park-feel-lab.character.v3')));
const waitPlaying=async page=>{await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});await page.getByRole('button',{name:'Profile studio',exact:true}).waitFor({state:'visible',timeout:180000})};
const errors=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'?v=studio-flow-1',{waitUntil:'domcontentloaded',timeout:120000});
   await page.getByRole('dialog',{name:'Character wardrobe',exact:true}).waitFor({timeout:60000});
   await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();
   await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   assert.equal(await page.locator('#party-settings-btn').isVisible(),false);
   for(const name of ['shoes','back','outfit','headwear','eyewear'])await page.getByRole('button',{name:'Next '+name,exact:true}).click();
   const eq=await readEquip(page);for(const [slot,id]of Object.entries(wanted))assert.equal(eq[slot],id);
   await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState==='ready',{},{timeout:180000});
   await page.screenshot({path:'/tmp/67park-studio-flow-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
   const fit=await page.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,dialog:document.querySelector('.wardrobe-studio').getBoundingClientRect().toJSON(),visibleModel:document.querySelector('.wardrobe-avatar')?.getBoundingClientRect().toJSON()}));
   assert(fit.body<=fit.width+1,'Studio overflows horizontally');
   await page.getByRole('button',{name:'Enter the park',exact:true}).click();await waitPlaying(page);
   const model=await page.evaluate(()=>{const root=window.__eggyInput?.playerRef?.model;return {root:!!root,state:document.documentElement.dataset.gameplayAvatarState}});
   assert.equal(model.state,'ready');
   await page.reload({waitUntil:'domcontentloaded'});await waitPlaying(page);
   assert.deepEqual(await readEquip(page),eq,'Reload must preserve selected equipment');
   const identity=await page.evaluate(()=>window.__candyOnline?.data?.me?.id);
   await page.getByRole('button',{name:'Profile studio',exact:true}).click();await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   assert.equal(new URL(page.url()).pathname,new URL(base).pathname,'Studio must not navigate away from the lobby');
   assert.equal(await page.evaluate(()=>window.__candyOnline?.data?.me?.id),identity);
   await page.getByRole('button',{name:'Next shoes',exact:true}).click();
   await page.getByRole('button',{name:'Enter the park',exact:true}).click();await waitPlaying(page);
   console.log('STUDIO FLOW PASS',JSON.stringify({mobile,equipment:eq,fit,errors:[...errors]}));
   await context.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
