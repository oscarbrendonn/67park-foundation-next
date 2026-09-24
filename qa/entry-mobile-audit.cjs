// Read-only cold/warm entry audit in isolated browsers, never the user's tabs.
const {webkit,chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const engine=process.env.ENTRY_ENGINE||'webkit',base=process.env.ENTRY_BASE||'ninja67',out=process.env.ENTRY_EVIDENCE||'.qa-results/entry-before-webkit',url=process.env.ENTRY_URL||'https://oscarbrendonn.github.io/67park-foundation-next/?v=eb636e2ff5bd1d485716eb69d619d6c266b92869';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:browserLaunchOptions());const report={engine,base,url,physicalPhone:false,errors:[],failed:[],samples:[]};let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});page=await context.newPage();
 page.on('pageerror',e=>{if(process.env.ENTRY_FAIL_CHARACTER==='1'&&/Load failed|Failed to fetch/.test(String(e)))(report.injectedErrors??=[]).push(String(e));else report.errors.push(String(e));console.log('ENTRY_PAGE_ERROR',String(e));});page.on('requestfailed',r=>report.failed.push({url:r.url(),error:r.failure()}));
 await page.addInitScript(base=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base,head:'friendsie_26:90',body:'friendsie_2:2'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));},base);
 let injected=false;if(process.env.ENTRY_FAIL_CHARACTER==='1')await page.route('**/models/park-originals/*.glb?*',route=>{if(!injected){injected=true;return route.abort('failed');}return route.continue();});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 if(process.env.ENTRY_FAIL_CHARACTER==='1'){
  await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState==='error',null,{timeout:30000});
  await page.screenshot({path:out+'/recovery.png'});await page.getByRole('button',{name:'Retry character',exact:true}).last().click();
  await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState!=='error',null,{timeout:15000});report.retryExercised=true;
 }
 const start=Date.now();
 while(Date.now()-start<90000){
  const row=await page.evaluate(()=>{const shared=globalThis[Symbol.for('67park.entry.v1')],gpu=globalThis[Symbol.for('67park.wardrobe-gpu.v1')];return {time:performance.now(),entry:shared?.value,missing:shared?.manifest?[...shared.manifest].filter(([k])=>!shared.observed.get(k)?.complete):[],gpu:gpu?.stats,avatar:{...document.documentElement.dataset},world:!!window.__islandWorld?.ready,canvas:[...document.querySelectorAll('canvas')].map(c=>({...c.dataset})),text:document.querySelector('.return-entry')?.innerText};});
  report.samples.push(row);console.log('ENTRY_SAMPLE',JSON.stringify({seconds:Math.round((Date.now()-start)/1000),stage:row.entry?.step,status:row.entry?.status,avatar:row.avatar.gameplayAvatarState,gpu:row.gpu,world:row.world}));
  if(row.entry?.status==='ready'&&row.avatar.gameplayAvatarState==='ready'){report.pass=true;break;}if(row.entry?.status==='error'||row.avatar.gameplayAvatarState==='error')break;
  await page.waitForTimeout(2000);
 }
 assert(report.pass,'Entry and saved character must both become ready');
 if(process.env.ENTRY_EXPECT_LIGHT==='1'){
  assert.deepEqual(report.samples.at(-1).missing,[],'No fictitious pending map files');
  assert.deepEqual(report.errors,[]);
 }
 if(process.env.ENTRY_WARM==='1'){
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>globalThis[Symbol.for('67park.entry.v1')]?.value.status==='ready'&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});report.warmReady=true;
 }
 report.resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,ms:r.duration,decoded:r.decodedBodySize,encoded:r.encodedBodySize,transfer:r.transferSize,type:r.initiatorType})));
 await page.screenshot({path:out+'/entry.png'});console.log('ENTRY_RESULT',JSON.stringify({pass:!!report.pass,errors:report.errors,last:report.samples.at(-1)?.text,resources:report.resources.length}));
}catch(e){report.failure=String(e);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
