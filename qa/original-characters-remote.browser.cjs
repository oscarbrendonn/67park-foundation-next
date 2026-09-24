// Two isolated guests on the existing endpoint; no messages or server changes.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_CHARACTER_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=originals-1';
const out=process.env.PARK_CHARACTER_EVIDENCE||'.qa-results/original-characters-remote';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,errors:[],peers:[],remote:[]},contexts=[];
try{
 const pages=[];
 for(const base of ['cat67','ninja67']){
  const context=await browser.newContext({viewport:{width:1000,height:760}});contexts.push(context);const page=await context.newPage();pages.push(page);page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(base=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));},base);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&window.__party?.debug().id&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
  report.peers.push({base,id:await page.evaluate(()=>__party.debug().id)});
 }
 for(let i=0;i<2;i++){
  const peer=report.peers[1-i],observer=pages[i],head=peer.base==='cat67'?'67Park_Cat_Head':'67Park_Ninja_Head';
  await observer.waitForFunction(({id,base,head})=>{let found=false;__islandWorld.scene.traverse(o=>{if(o.userData.claudeRemoteCharacter?.id===id&&o.userData.claudeRemoteCharacter.base===base&&o.getObjectByName(head))found=true});return found},{...peer,head},{timeout:30000});
  const model=await observer.evaluate(({id,head})=>{let rig;__islandWorld.scene.traverse(o=>{if(o.userData.claudeRemoteCharacter?.id===id)rig=o});return {base:rig.userData.claudeRemoteCharacter.base,head:!!rig.getObjectByName(head),bones:rig.getObjectByName('FS_Body').skeleton.bones.length,oldHead:!!rig.getObjectByName('GORIL_KAFA')}},{id:peer.id,head});
  assert.equal(model.bones,20);assert(model.head&&!model.oldHead);report.remote.push(model);await observer.screenshot({path:out+'/observer-'+i+'.png'});
 }
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('ORIGINAL_REMOTE_PASS',JSON.stringify(report.remote));
}catch(e){report.failure=String(e);throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));for(const c of contexts)await c.close();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
