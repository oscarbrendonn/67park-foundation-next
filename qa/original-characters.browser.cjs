// Narrow mobile roster -> outfit -> actual park -> persistence check.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_CHARACTER_URL,out=process.env.PARK_CHARACTER_EVIDENCE;
assert(url&&out,'Explicit target and new evidence directory required');
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());let page;const report={url,errors:[],models:[],requests:[]};
try{
 page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(r.url().includes('/models/park-originals/'))report.requests.push(r.url())});
 await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));});
 const ready=()=>page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 for(const [base,label,headName] of [['cat67','Cat 67','67Park_Cat_Head'],['ninja67','Ninja 67','67Park_Ninja_Head'],['goril','Gorilla 67','GORIL_KAFA']]){
  if(report.models.length)await page.getByRole('button',{name:'Profile studio',exact:true}).tap();
  await page.getByRole('button',{name:new RegExp(label)}).waitFor({timeout:90000});
  const roster=await page.locator('.wardrobe-options').innerText();for(const name of ['Cat 67','Ninja 67','Gorilla 67'])assert(roster.includes(name));assert(!roster.includes('Monkey'));
  await page.getByRole('button',{name:new RegExp(label)}).tap();await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
  if(base!=='goril'){
   await page.getByRole('button',{name:'Next eyewear',exact:true}).tap();
   await page.waitForFunction(()=>!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
  }
  await page.screenshot({path:out+'/'+base+'-studio.png'});
  await page.getByRole('button',{name:'Enter the park',exact:true}).tap();await ready();
  await page.waitForFunction(b=>!document.querySelector('.wardrobe')&&document.documentElement.dataset.gameplayAvatarBase===b,base,{timeout:30000});
  const row=await page.evaluate(({base,headName})=>{
   let rig;__islandWorld.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base===base&&!o.userData.claudeRemoteCharacter)rig=o});
   const head=rig?.getObjectByName(headName),body=rig?.getObjectByName('FS_Body');let visibleMeshes=0;head?.traverse(o=>{if(o.isMesh&&o.visible)visibleMeshes++});
   return {base,head:!!head,visible:head?.visible,visibleMeshes,bones:body?.skeleton?.bones?.length,equipment:JSON.parse(localStorage.getItem('67park-feel-lab.character.v3')),graphics:[...document.querySelectorAll('canvas[data-park-graphics]')].map(c=>JSON.parse(c.dataset.parkGraphics))};
  },{base,headName});
  assert(row.head&&row.visible&&row.visibleMeshes>0);assert.equal(row.bones,20);assert.equal(row.equipment.base,base);assert(row.graphics.some(g=>g.level==='low'));report.models.push(row);
  // Use real mobile movement input, not a pose teleport.
  if(base!=='goril'){
   const before=await page.evaluate(()=>__eggyInput.playerRef.body.translation()),cdp=await page.context().newCDPSession(page),stick=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(stick);
   const x=stick.x+stick.width/2,y=stick.y+stick.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-35}]});
   try{await page.waitForFunction(s=>{const p=__eggyInput.playerRef.body.translation();return Math.hypot(p.x-s.x,p.z-s.z)>1},before,{timeout:15000});row.moved=true;}
   finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
   // Read-only view override for screenshot; production movement/camera untouched.
   await page.evaluate(async base=>{const T=await import('three'),w=__islandWorld;window.__characterPreviousRender=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){__characterPreviousRender?.apply(this,args);const p=__eggyInput.playerRef.body.translation();let rig;w.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base===base&&!o.userData.claudeRemoteCharacter)rig=o});if(!rig)return;const d=new T.Vector3(0,0,1).applyQuaternion(rig.getWorldQuaternion(new T.Quaternion()));w.camera.position.set(p.x+d.x*3,p.y+.6,p.z+d.z*3);w.camera.lookAt(p.x,p.y+.05,p.z);w.camera.updateMatrixWorld(true)}},base);
  }
  await page.screenshot({path:out+'/'+base+'-park-low.png'});
  if(base!=='goril')await page.evaluate(()=>{__islandWorld.scene.onBeforeRender=window.__characterPreviousRender;});
  if(base==='ninja67'){await page.reload({waitUntil:'domcontentloaded',timeout:60000});await ready();assert.equal(await page.evaluate(()=>document.documentElement.dataset.gameplayAvatarBase),base);report.ninjaPersisted=true;}
 }
 for(const name of ['cat','ninja'])assert(report.requests.some(r=>r.includes('/'+name+'.glb?v=lossless-2')));
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('ORIGINAL_CHARACTERS_PASS',JSON.stringify(report));
}catch(e){report.failure=String(e);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
