const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const assert=require('node:assert/strict');
const base=process.env.PARK_WATER_URL||'http://127.0.0.1:8496/67park-foundation-next/';
const output=process.env.PARK_WATER_EVIDENCE||'.qa-results/water-immersion';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});
   await context.addInitScript(base=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));localStorage.setItem('67park-feel-lab-muted','1');
    localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
   },mobile?'friendsie_1':'goril');
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.__islandWorld?.parkWaterSurface&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
    await assertBrowserRenderer(page);
    for(const level of ['cold-low','high','medium','low']){
     if(level!=='cold-low'){
      await page.locator('#party-settings-btn').click();await page.getByRole('combobox',{name:'Graphics quality',exact:true}).selectOption(level);await page.getByRole('button',{name:'Close settings',exact:true}).click();
     }
     const state=await page.evaluate(()=>JSON.parse(__islandWorld.renderer.domElement.dataset.parkGraphics));assert.equal(state.level,level==='cold-low'?'low':level);
     await require('./water-immersion.browser.cjs')(page,{mobile,label:level,output,check:async(_name,fn)=>fn()});
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');assert.deepEqual(errors,[]);
   }finally{await context.close();}
  }
  console.log('WATER_IMMERSION_BROWSER_PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('WATER_IMMERSION_BROWSER_FAIL',e);process.exitCode=1;});
