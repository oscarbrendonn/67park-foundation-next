// Post-publication smoke only: fresh Cat card -> editor -> actual park -> editor.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_CAT_URL,out=process.env.PARK_CAT_EVIDENCE;
assert(url&&out,'Use an explicit versioned live URL and a separate evidence path');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('67park-feel-lab-muted','1'));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:/Cat 67/}).tap({timeout:90000});
  await page.getByRole('button',{name:'Enter the park',exact:true}).tap({timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarBase==='cat67'&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
  report.avatar=await page.evaluate(()=>{let rig;__islandWorld.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base==='cat67'&&!o.userData.claudeRemoteCharacter)rig=o});const meshes=[];rig.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,visible:o.visible})});return {base:document.documentElement.dataset.gameplayAvatarBase,meshes,bones:rig.getObjectByName('67Park_Cat_Head').skeleton.bones.length,equipment:JSON.parse(localStorage.getItem('67park-feel-lab.character.v3'))}});
  assert.equal(report.avatar.bones,20);assert.equal(report.avatar.meshes.length,4);assert(report.avatar.meshes.every(m=>m.visible));
  await page.getByRole('button',{name:'Profile studio',exact:true}).tap();
  await page.waitForFunction(()=>!document.querySelector('.wardrobe-model-status'));
  await page.screenshot({path:out+'/live-cat.png'});assert.deepEqual(report.errors,[]);report.pass=true;console.log('LIVE_CAT_PASS',JSON.stringify(report.avatar));
 }catch(error){report.failure=String(error);throw error;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
