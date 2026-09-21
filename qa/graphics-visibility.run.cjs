const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const {graphicsPixels}=require('./graphics-pixels.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.PARK_GRAPHICS_URL||'http://127.0.0.1:8496/67park-foundation-next/';
const output=process.env.PARK_GRAPHICS_EVIDENCE||'.qa-results/graphics-visibility';
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions()),report=[];
 fs.mkdirSync(output,{recursive:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
   await context.addInitScript(()=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    localStorage.setItem('67park-feel-lab-muted','1');
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   // Optional negative control substitutes the old module in this browser only.
   if(process.env.PARK_GRAPHICS_OLD_MODULE)await page.route('**/app/graphics-quality.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.PARK_GRAPHICS_OLD_MODULE,'utf8')}));
   const ready=()=>page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});await ready();await assertBrowserRenderer(page);
   for(const [index,level] of ['high','low','medium','low','high','low'].entries()){
    await page.locator('#party-settings-btn').click();
    await page.getByRole('combobox',{name:'Graphics quality',exact:true}).selectOption(level);
    await page.getByRole('button',{name:'Close settings',exact:true}).click();
    await page.waitForTimeout(500);
    const pixels=await graphicsPixels(page,`${mobile?'touch':'desktop'}-${index}-${level}`);
    assert.equal(pixels.profile.level,level);assert.equal(pixels.profile.shadows,level!=='low');
    assert.equal(pixels.profile.dpr,Math.min(mobile?3:1,{low:.8,medium:1.25,high:2}[level]));
    report.push({mobile,level,...pixels});
    await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${index}-${level}.png`,timeout:90000});
   }
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});await ready();
   const cold=await graphicsPixels(page,'cold-low');assert.equal(cold.profile.level,'low');assert.equal(cold.profile.shadows,false);assert.equal(cold.profile.dpr,.8);report.push({mobile,cold:true,...cold});
   await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-cold-low.png`,timeout:90000});
   await require('./recovery-graphics.browser.cjs')(page,{mobile,check:async(_name,fn)=>{await fn();await page.waitForTimeout(400);}});
   assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('GRAPHICS_VISIBILITY_PASS',JSON.stringify(report));
 }finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error('GRAPHICS_VISIBILITY_FAIL',e);process.exitCode=1;});
