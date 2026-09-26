const {chromium}=require('playwright');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve('.qa-results/pet-contact-'+new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const page=await browser.newPage({viewport:{width:1000,height:900}});
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});
  const species=process.env.PET_KIND||'dog',action=process.env.PET_ACTION||'pet';
  await page.goto('http://127.0.0.1:8496/67park-foundation-next/?pet='+species+'&v=pet-play-1');
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__parkPets?.debug().active,null,{timeout:90000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:60000});
  await page.evaluate(()=>__tp([200,10.3,88]));await page.waitForTimeout(800);
  await page.evaluate(id=>__parkPets.command(id),action);
  await page.waitForFunction(id=>__parkPets.debug().local?.behavior.ownerAction===id,action);
  await page.waitForTimeout(Number(process.env.PET_DELAY||400));
  const record=await page.evaluate(async species=>{
   const T=await import('three'),w=__islandWorld,pet=__parkPets.debug(),rows=[];
   w.scene.traverse(o=>{if(o.userData.petCare?.active){const bones=[];o.traverse(b=>{if(b.isBone&&/Spine|Biscep|ArmR|HandR/.test(b.name))bones.push({name:b.name,p:b.getWorldPosition(new T.Vector3()).toArray(),q:b.quaternion.toArray(),scale:b.getWorldScale(new T.Vector3()).toArray()})});rows.push({name:o.name,rotation:o.rotation.toArray(),position:o.getWorldPosition(new T.Vector3()).toArray(),care:o.userData.petCare,bones});}});
   const body=__eggyInput.playerRef.body.translation(),petRoot=w.scene.getObjectByName('67PARK_PET_'+species.toUpperCase()),box=new T.Box3().setFromObject(petRoot);
   const images=[];for(const x of [-2,2]){const c=w.camera.clone();c.position.set(body.x+x,body.y+.6,body.z+2);c.lookAt(body.x,body.y-.1,body.z+.3);c.updateMatrixWorld(true);w.renderer.render(w.scene,c);images.push(w.renderer.domElement.toDataURL());}
   return {pet,rows,box:{min:box.min.toArray(),max:box.max.toArray()},images};
  },species);
  record.images.forEach((data,i)=>fs.writeFileSync(OUT+'/'+i+'.png',Buffer.from(data.split(',')[1],'base64')));delete record.images;
  record.maxSpineLean=0;
  for(let i=0;i<40;i++){
   const pose=await page.evaluate(()=>{let lean=0,active=false;__islandWorld.scene.traverse(o=>{if(o.userData.petCare){active=active||o.userData.petCare.active;o.traverse(b=>{if(b.isBone&&/^Spine[12]$/.test(b.name))lean=Math.max(lean,Math.abs(b.rotation.x));});}});return {lean,active,phase:__parkPets.debug().local?.behavior.phase};});
   record.maxSpineLean=Math.max(record.maxSpineLean,pose.lean);assert(pose.lean<.55,'Care must not accumulate excessive spine lean');
   if(pose.phase==='follow'&&!pose.active){record.released=true;break;}await page.waitForTimeout(250);
  }
  assert(record.released,'Owner returns to the ordinary pose when play ends');record.pass=true;
  fs.writeFileSync(OUT+'/report.json',JSON.stringify(record,null,2));console.log(JSON.stringify({output:OUT,...record}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
