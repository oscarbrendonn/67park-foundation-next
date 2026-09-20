const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const eq={base:'goril',body:'friendsie_2:2',head:'friendsie_26:90',sprout:'friendsie_8:90',back:'friendsie_2:4',kicks:'friendsie_3333:5',held:null,power:null,vibe:null};
const routes=['balloon/?practice=1&bots=1','race/?practice=1&bots=1','rockets/?practice=1&bots=1&forestQA=1','sports/?mode=basket&practice=1&bots=1','sports/?mode=penalty&practice=1&bots=1','lane-rush/','skybound-soft/?claudeQA=passive'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{for(const route of routes){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Test-only instrumentation records the meshes actually built by the shared
  // renderer, rather than treating a localStorage value as a rendered outfit.
  await page.route('**/app/gorilla-studio-items.js',async route=>{
   const response=await route.fetch(),source=await response.text();
   const marker='rig.userData.studioEquipment={...equipment};';
   assert(source.includes(marker));
   const observed=`${marker}globalThis.__studioRendered ||= [];{const items=[];rig.traverse(o=>{if(typeof o.userData.studioEquipment==='string'){items.push({id:o.userData.studioEquipment,vertices:o.geometry.attributes.position.count,handTrianglesRemoved:o.geometry.userData.removedHandTriangles||0});o.onBeforeRender=()=>{globalThis.__studioDraws=(globalThis.__studioDraws||0)+1}}});globalThis.__studioRendered.push({equipment:{...equipment},items,hands:['Goril_El_L','Goril_El_R'].map(n=>!!rig.getObjectByName(n)?.visible)});}`;
   await route.fulfill({response,body:source.replace(marker,observed)});
  });
  await page.addInitScript(eq=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify(eq));localStorage.setItem('67park-feel-lab-muted','1');},eq);
  await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});
  try{
   await page.waitForFunction(()=>globalThis.__studioRendered?.some(r=>r.items.length===5),null,{timeout:120000});
   const rendered=await page.evaluate(()=>__studioRendered.find(r=>r.items.length===5));
   assert.deepEqual(rendered.hands,[true,true]);for(const id of Object.values(eq).filter(v=>typeof v==='string'&&v.includes(':')))assert(rendered.items.some(i=>i.id===id),route+' missing '+id);
   assert.equal(rendered.items.find(i=>i.id==='friendsie_2:2').handTrianglesRemoved,1120);
   await page.waitForFunction(()=>globalThis.__studioDraws>5,null,{timeout:120000});
   const before=await page.evaluate(()=>__studioDraws);await page.waitForTimeout(1500);const after=await page.evaluate(()=>__studioDraws);assert(after>before,'Outfit draw loop stopped');
   await page.screenshot({path:'/tmp/67park-studio-mini-'+route.split('/')[0]+(route.includes('penalty')?'-penalty':'')+'.png'});
   assert.deepEqual(errors,[]);console.log('MINIGAME OUTFIT PASS',route,JSON.stringify({meshes:rendered.items.length,hands:rendered.hands,additionalDraws:after-before,errors}));
  }catch(e){console.log('MINIGAME FAILURE',route,JSON.stringify({text:(await page.locator('body').innerText()).slice(-1000),errors}));throw e}
  await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
