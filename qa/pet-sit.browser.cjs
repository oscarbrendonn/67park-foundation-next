const {chromium}=require('playwright');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('.qa-results/pet-sit-'+new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(out,{recursive:true});
const report={url:'https://oscarbrendonn.github.io/67park-foundation-next/pet-play-preview/?pet=dog&v=pet-preview-sit-2',draft:process.env.PARK_PET_SIT_DRAFT==='1',errors:[],states:[],out};
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try{
  page.on('pageerror',e=>report.errors.push(e.message));
  if(report.draft)for(const file of ['pet-model.js','park-pets.js','pet-commands.js'])await page.route('**/pet-play-preview/app/pets/'+file+'*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('pet-play-preview/app/pets/'+file,'utf8')}));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});
  await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__parkPets?.debug().local?.follow.visible&&window.__eggyNet?.connected,null,{timeout:120000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:60000});
  const capture=async(kind,label)=>{
   const sample=await page.evaluate(async({kind,label})=>{
    const T=await import('three'),w=__islandWorld,root=w.scene.getObjectByName('67PARK_PET_'+kind.toUpperCase()),p=root.position;
    const state=__parkPets.debug().local,bones={};root.traverse(b=>{if(b.isBone)bones[b.name]={p:b.position.toArray(),r:b.rotation.toArray().slice(0,3)};});
    const images=[];
    for(const side of [0,Math.PI/2]){const angle=root.rotation.y+side,c=w.camera.clone();c.fov=34;c.position.set(p.x+Math.sin(angle)*2.4,p.y+.54,p.z+Math.cos(angle)*2.4);c.lookAt(p.x,p.y+.34,p.z);c.updateProjectionMatrix();c.updateMatrixWorld(true);w.renderer.render(w.scene,c);images.push(w.renderer.domElement.toDataURL('image/png'));}
    return {kind,label,state,bones,images};
   },{kind,label});
   sample.images.forEach((data,i)=>fs.writeFileSync(out+'/'+kind+'-'+label+'-'+i+'.png',Buffer.from(data.split(',')[1],'base64')));delete sample.images;report.states.push(sample);console.log('CAPTURE',kind,label,JSON.stringify({pose:sample.state.pose,command:sample.state.behavior.command,body:sample.bones.body}));
  };
  for(const kind of ['dog','cat']){
   if(kind==='cat'){await page.evaluate(()=>__parkPets.select('cat'));await page.waitForFunction(()=>__parkPets.debug().local?.kind==='cat'&&__parkPets.debug().local?.follow.visible);}
   await page.waitForTimeout(5500);await capture(kind,'before');
   await page.locator('#park-pet-button').tap();await page.locator('[data-pet-command="sit"]').tap();
   await page.waitForTimeout(750);await capture(kind,'sit');
   await page.screenshot({path:out+'/'+kind+'-sit-mobile.png'});
   await page.waitForTimeout(1500);
   report.states.push({kind,label:'held',state:await page.evaluate(()=>__parkPets.debug().local)});
   await page.locator('#park-pet-button').tap();await page.locator('[data-pet-command="follow"]').tap();
   await page.waitForTimeout(750);await capture(kind,'released');
  }
  report.pass=report.errors.length===0&&report.states.filter(s=>s.label==='held').every(s=>s.state.behavior.command==='sit'&&s.state.behavior.phase==='hold');
  report.visibleSit=report.states.filter(s=>s.label==='sit').every(s=>{const before=report.states.find(b=>b.kind===s.kind&&b.label==='before');return before.state.pose!=='sit'&&before.bones.body.r[0]-s.bones.body.r[0]>.4;});
  report.pass=report.pass&&report.visibleSit&&report.states.filter(s=>s.label==='released').every(s=>s.state.pose==='idle'&&Math.abs(s.bones.body.r[0])<.02);
  if(!report.pass)process.exitCode=1;
 }catch(e){report.failure=String(e);process.exitCode=1;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,pass:report.pass,errors:report.errors,failure:report.failure}));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
