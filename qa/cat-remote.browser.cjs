// Two isolated test guests; no chat, friend requests, room changes or server edits.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_CAT_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=cat-character-1';
const out=process.env.PARK_CAT_EVIDENCE||'.qa-results/cat-remote-1';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,errors:[]},contexts=[];
 try{
  const pages=[];
  for(const base of ['cat67','goril']){
   const context=await browser.newContext({viewport:{width:1000,height:760}});contexts.push(context);const page=await context.newPage();pages.push(page);
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.addInitScript(base=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));},base);
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&window.__party?.debug().id&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
   if(base==='cat67'){
    report.catId=await page.evaluate(()=>__party.debug().id);
    if(await page.evaluate(()=>__candy.state().board))await page.keyboard.press('KeyV');
    await page.waitForFunction(()=>!__candy.state().board&&window.__eggyInput?.playerRef?.body);
    const start=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
    await page.keyboard.down('KeyW');
    try{await page.waitForFunction(start=>{const p=__eggyInput.playerRef.body.translation();return Math.hypot(p.x-start.x,p.z-start.z)>6},start,{timeout:15000});}
    finally{await page.keyboard.up('KeyW');}
   }
  }
  const observer=pages[1];
  await observer.waitForFunction(id=>{let found=false;__islandWorld.scene.traverse(o=>{if(o.userData.claudeRemoteCharacter?.id===id&&o.userData.claudeRemoteCharacter.base==='cat67'&&o.getObjectByName('67Park_Cat_Head'))found=true});return found},report.catId,{timeout:30000});
  report.remote=await observer.evaluate(id=>{let model;__islandWorld.scene.traverse(o=>{if(o.userData.claudeRemoteCharacter?.id===id)model=o});const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o.name)});return {state:model.userData.claudeRemoteCharacter,meshes,bones:model.getObjectByName('67Park_Cat_Head').skeleton.bones.length}},report.catId);
  assert.equal(report.remote.bones,20);assert.equal(report.remote.meshes.length,4);assert(!report.remote.meshes.includes('GORIL_KAFA'));assert.deepEqual(report.errors,[]);
  await observer.screenshot({path:out+'/observer.png'});report.pass=true;console.log('CAT_REMOTE_PASS',JSON.stringify({base:report.remote.state.base,bones:20,meshes:4,errors:0}));
 }catch(error){report.failure=String(error);throw error;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));for(const c of contexts)await c.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
