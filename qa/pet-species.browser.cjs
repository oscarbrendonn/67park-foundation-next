const {chromium}=require('playwright');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const staged=process.env.PARK_PET_SPECIES_DRAFT==='1';
const url='https://oscarbrendonn.github.io/67park-foundation-next/pet-play-preview/?pet=dog&v=pet-species-1';
const output=path.resolve('.qa-results/pet-species-'+(staged?'draft-':'live-')+new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(output,{recursive:true});const report={url,staged,output,errors:[],checks:[],actions:[]};
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>report.errors.push(e.message));
 try{
  if(staged)await page.route('**/pet-play-preview/**',async route=>{
   const relative=new URL(route.request().url()).pathname.split('/pet-play-preview/')[1]||'index.html';
   const root=path.resolve('pet-play-preview'),file=path.resolve(root,relative);
   if(!file.startsWith(root+'/')||!fs.existsSync(file))return route.continue();
   await route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(file)});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
  });
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__parkPets?.debug().local?.follow.visible,null,{timeout:90000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:60000});
  console.log('READY',staged?'staged':'live');
  for(const [kind,command]of [['dog','ball'],['dog','frisbee'],['cat','ball'],['cat','feather']]){
   if(await page.evaluate(()=>__parkPets.debug().local.kind)!==kind){
    await page.evaluate(kind=>__parkPets.select(kind),kind);
    await page.waitForFunction(kind=>__parkPets.debug().local?.kind===kind&&__parkPets.debug().local?.follow.visible,kind);
   }
   await page.locator('#park-pet-button').tap();
   assert.equal(await page.locator('[data-pet-command="ball"]').innerText(),kind==='cat'?'Roll & chase ball':'Fetch ball');
   assert.equal(await page.locator('[data-pet-command="frisbee"]').isVisible(),kind==='dog');
   assert.equal(await page.locator('[data-pet-command="feather"]').isVisible(),kind==='cat');
   await page.screenshot({path:output+'/'+kind+'-'+command+'-menu.png'});
   await page.evaluate(({kind,command})=>{
    const q=window.__petSpeciesQA={samples:[],images:{},done:false,started:false,kind,command};let last=-1;
    function frame(){
     const current=__parkPets.debug().local,s=current?.behavior;
     if(s?.command===command)q.started=true;
     if(q.started&&s){
      const w=__islandWorld,root=w.scene.getObjectByName('67PARK_PET_'+kind.toUpperCase()),bones={};
      root.traverse(b=>{if(b.isBone&&['body','frontL','frontR','backL','backR'].includes(b.name))bones[b.name]={y:b.position.y,x:b.rotation.x};});
      let mouthGap=null;
      if(s.toy?.phase==='carried'){
       const head=root.getObjectByName('head'),point=head.position.clone().set(0,-.10,.39);head.localToWorld(point);
       mouthGap=Math.hypot(point.x-s.toy.position.x,point.y-s.toy.position.y,point.z-s.toy.position.z);
      }
      if(performance.now()-last>60){q.samples.push({phase:s.phase,pose:s.pose,time:s.actionTime,side:s.playSide,fetches:s.fetches,toy:s.toy,nav:current.follow,bones,mouthGap});last=performance.now();}
      const key=s.phase+(s.pose==='swat'?'-'+s.playSide:'');
      if(['stalk','pounce','bat','roll','pickup','return','drop','feather'].includes(s.phase)&&s.actionTime>.14&&!q.images[key]&&Object.keys(q.images).length<8){
       const c=w.camera.clone(),p=root.position,toy=s.toy?.position||p,dx=toy.x-p.x,dz=toy.z-p.z,d=Math.hypot(dx,dz),angle=root.rotation.y+.95;
       const x=p.x+dx*.35,z=p.z+dz*.35,range=2.5+d;
       c.fov=36;c.position.set(x+Math.sin(angle)*range,p.y+.85,z+Math.cos(angle)*range);c.lookAt(x,p.y+.28,z);c.updateProjectionMatrix();c.updateMatrixWorld(true);
       w.renderer.render(w.scene,c);q.images[key]=w.renderer.domElement.toDataURL('image/png');
      }
      if(s.command==='follow'){q.done=true;return;}
     }
     if(!q.stop)requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
   },{kind,command});
   await page.locator('[data-pet-command="'+command+'"]').tap();
   await page.locator('#park-pet-dialog').waitFor({state:'hidden'});
   await page.waitForFunction(()=>__petSpeciesQA.done,null,{timeout:45000});
   const action=await page.evaluate(()=>{__petSpeciesQA.stop=true;return __petSpeciesQA;});
   for(const [phase,data]of Object.entries(action.images))fs.writeFileSync(output+'/'+kind+'-'+command+'-'+phase+'.png',Buffer.from(data.split(',')[1],'base64'));
   action.images=Object.keys(action.images);report.actions.push(action);
   const phases=new Set(action.samples.map(s=>s.phase)),poses=new Set(action.samples.map(s=>s.pose));
   if(kind==='dog'){
    for(const phase of ['throw','chase','pickup','return','drop'])assert(phases.has(phase),command+' '+phase);
    assert(action.samples.some(s=>s.toy?.phase==='carried'));assert(action.samples.at(-1).fetches>0);
    assert(action.samples.filter(s=>s.mouthGap!==null).every(s=>s.mouthGap<.015),'Carried toy stays at the rendered mouth');
   }else{
    for(const pose of ['stalk','pounce','swat'])assert(poses.has(pose),command+' '+pose);
    assert(action.samples.every(s=>s.fetches===0&&s.toy?.phase!=='carried'&&!['pickup','return','drop','throw'].includes(s.phase)));
    assert(action.samples.some(s=>s.pose==='pounce'&&s.bones.body.y>.48),'Visible cat hop');
    if(command==='ball')assert(phases.has('roll-out')&&phases.has('roll'));
   }
   report.checks.push(kind+' '+command+' completed');console.log('PASS',kind,command,[...phases].join(','));
  }
  await page.locator('#park-pet-button').tap();await page.locator('[data-pet-command="sit"]').tap();
  await page.waitForFunction(()=>__parkPets.debug().local?.pose==='sit');
  await page.screenshot({path:output+'/cat-sit-mobile.png'});report.checks.push('cat Sit still responds');
  report.final=await page.evaluate(()=>({pets:__parkPets.debug(),connected:!!window.__eggyNet?.connected,normalPet:localStorage.getItem('67park.feel-lab.pet.v1'),resources:performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('/pet-play-preview/'))}));
  assert.equal(report.final.normalPet,null);assert.equal(report.final.pets.failed,0);assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(error){report.failure=String(error);report.last=await page.evaluate(()=>({pets:window.__parkPets?.debug(),samples:window.__petSpeciesQA?.samples?.slice(-5),text:document.body.innerText})).catch(()=>null);await page.screenshot({path:output+'/failure.png'}).catch(()=>{});process.exitCode=1;}
 finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({output,pass:report.pass,checks:report.checks,errors:report.errors,failure:report.failure}));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
