// Narrow actual-game replay: cream sailboat cockpit, mast, jump into sea and
// swim back into its side. No driving/network-authority claim or broad suite.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const {prepareJumpInput}=require('./jump-input.cjs');
const out=path.resolve('.qa-results/boat-contacts-20260926',new Date().toISOString().replaceAll(':','-'));
const url='https://oscarbrendonn.github.io/67park-foundation-next/?v=horn-hold-1&claudeQA=passive&qa=boat-contacts';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const {patchBoatContacts}=await import('./refresh-boat-contacts-integration.mjs');
 const {patchLighthouseStepsBundle}=await import('./refresh-lighthouse-steps-bundle.mjs');
 const original=execFileSync('git',['show','HEAD:island/runtime.bundle.js'],{encoding:'utf8',maxBuffer:8*1024*1024});
 const candidateCode=patchBoatContacts(patchLighthouseStepsBundle(original),{bundle:true});
 const browser=await chromium.launch(browserLaunchOptions()),report={url,kind:'Isolated Chromium touch viewport, not physical iPhone; candidate NOT published',rows:[],errors:[]};
 try{
  for(const candidate of [false,true]){
   const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();
   const row={candidate};report.rows.push(row);
   try{
    await context.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));});
    page.on('pageerror',e=>report.errors.push({candidate,error:String(e)}));
    await page.route('**/island/runtime.bundle.js*',r=>r.fulfill({contentType:'text/javascript',body:candidate?candidateCode:original}));
    if(candidate)for(const file of ['boat-contacts.js','lighthouse-support.js'])await page.route('**/island/'+file+'*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('island/'+file,'utf8')}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready'&&JSON.parse(document.querySelector('#claude-gorilla-qa')?.dataset.state||'{}').base==='cat67',null,{timeout:120000});
    row.renderer=await assertBrowserRenderer(page);
    row.geometry=await page.evaluate(()=>{
     const w=__islandWorld,p=JSON.parse(w.renderer.domElement.dataset.lunapark77).placements.find(p=>p.asset==='sailCream');
     window.__boatHome=p;
     return{home:p,stats:w.boatContacts?.stats,sea:w.sea(p.x,p.z),ground:w.ground(p.x,p.z),water:w.water(p.x,p.z)};
    });
    console.log('BOAT_LOADED',JSON.stringify({candidate,geometry:row.geometry}));
    await page.evaluate(async()=>{
     const {claudeGorillaState}=await import('/67park-foundation-next/app/claude-gorilla-runtime.js?v=skate-corner-recovery-1');
     window.__boatState=()=>{const s=claudeGorillaState(),b=__eggyInput.playerRef.body,p=b.translation(),h=__boatHome,dx=p.x-h.x,dz=p.z-h.z;
      return{p:{...p},v:{...b.linvel()},local:{x:dx*Math.cos(h.yaw)-dz*Math.sin(h.yaw),z:dx*Math.sin(h.yaw)+dz*Math.cos(h.yaw)},s:{grounded:s.grounded,jumpsLeft:s.jumpsLeft,frames:s.frames},water:__islandWorld.water(p.x,p.z),floor:__islandWorld.boatContacts?.floor(p.x,p.z)};};
     window.__boatTrace=[];const observe=()=>{window.__boatTrace.push(__boatState());requestAnimationFrame(observe);};requestAnimationFrame(observe);
    });
    if(await page.evaluate(()=>__candy.state().board))await page.keyboard.press('KeyV');
    await page.evaluate(async()=>{
     __tp(__islandWorld.spawn);for(let n=0;n<4;n++)await new Promise(requestAnimationFrame);
     const h=__boatHome,x=h.x-.65*Math.cos(h.yaw),z=h.z+.65*Math.sin(h.yaw);
     __tp([x,__islandWorld.sea(x,z)+3,z]);
    });
    const frames=n=>page.evaluate(async n=>{for(let f=0;f<n;f++)await new Promise(requestAnimationFrame);},n);
    const state=()=>page.evaluate(()=>__boatState());
    await frames(160);row.landed=await state();
    // Camera only: does not move character or fabricate contact.
    await page.evaluate(()=>{
     const w=__islandWorld,h=__boatHome,prior=w.scene.onBeforeRender;
     w.scene.onBeforeRender=function(...args){prior?.apply(this,args);w.camera.position.set(h.x-9,h.y+7,h.z+8);w.camera.lookAt(h.x,h.y+1.8,h.z);w.camera.fov=52;w.camera.updateProjectionMatrix();w.camera.updateMatrixWorld(true);};
    });await frames(3);
    await page.screenshot({path:path.join(out,candidate?'cat-supported-in-cockpit.png':'baseline-sunk-through-floor.png')});
    if(!candidate){
     assert(row.landed.water,'baseline still swimming inside hull');
     assert(row.landed.p.y<row.geometry.home.y+.522+.555-.10,'body is below real deck support');
     row.reproduced=true;
    }else{
     assert.equal(row.geometry.stats.revision,'boat-contacts-1');
     assert(!row.landed.water&&row.landed.s.grounded,'standing in cockpit, not swimming');
     assert(Math.abs(row.landed.p.y-.555-row.landed.floor)<.06,'feet on visible cockpit floor');
     async function steer(localX,localZ){await page.evaluate(({localX,localZ})=>{
      const h=__boatHome,tx=h.x+localX*Math.cos(h.yaw)+localZ*Math.sin(h.yaw),tz=h.z-localX*Math.sin(h.yaw)+localZ*Math.cos(h.yaw),started=performance.now();
      const token=window.__boatSteer=(window.__boatSteer||0)+1;
      function tick(){
       if(window.__boatSteer!==token)return;
       const b=__eggyInput.playerRef.body,p=b.translation(),dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz),i=__eggyInput.input;
       if(d<.07||performance.now()-started>6000){i.x=i.z=0;i.run=false;window.__boatDriveDone=true;return;}
       const yaw=__islandWorld.camera.userData.feelLab.yaw,k=Math.min(.8,Math.max(.17,d*.7))/d;
       // Exact inverse of characterDirection: its world-Z axis is negative.
       i.x=(dx*Math.cos(yaw)-dz*Math.sin(yaw))*k;i.z=(-dx*Math.sin(yaw)-dz*Math.cos(yaw))*k;i.run=false;requestAnimationFrame(tick);
      }window.__boatDriveDone=false;tick();
     },{localX,localZ});}
     async function stop(){await page.evaluate(()=>{window.__boatSteer=(window.__boatSteer||0)+1;const i=__eggyInput.input,b=__eggyInput.playerRef.body,v=b.linvel();i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:v.y,z:0},true);});}
     await steer(.65,0);await frames(120);await stop();row.mast=await state();
     assert(row.mast.local.x<-.1&&row.mast.local.x>-.7&&Math.abs(row.mast.local.z)<.3,'approach real mast without crossing it');
     assert(Math.abs(row.mast.p.y-row.landed.p.y)<.06,'mast cannot launch character to sail top');
     const jump=await prepareJumpInput(page,{mobile:true,timeout:15000});
     const before=await state();await jump();
     await page.waitForFunction(b=>{const s=__boatState();return s.p.y>b.p.y+.12&&s.v.y>3&&!s.s.grounded;},before,{timeout:10000});
     row.jump=await state();await steer(-3,0);
     await page.waitForFunction(()=>window.__boatDriveDone,null,{timeout:9000});await stop();await frames(100);row.sea=await state();
     assert(Math.abs(row.sea.local.x+3)<.15&&Math.abs(row.sea.local.z)<.15&&row.sea.water,'reach specified point outside rim');
     await steer(0,0);await frames(150);await stop();row.hull=await state();
     assert(row.hull.local.x<-1.5&&row.hull.local.x>-2.3&&Math.abs(row.hull.local.z)<.3,'swimmer reaches and stops at outer hull');
     await page.screenshot({path:path.join(out,'swimmer-stopped-by-hull.png')});
     await steer(-3,0);await page.waitForFunction(()=>window.__boatDriveDone,null,{timeout:9000});await stop();row.retreated=await state();
     assert(Math.abs(row.retreated.local.x+3)<.15&&Math.abs(row.retreated.local.z)<.15,'retreat to specified point from boat wall');
     row.pass=true;
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
   }catch(e){row.failure=String(e);await page.screenshot({path:path.join(out,(candidate?'candidate':'baseline')+'-failure.png')}).catch(()=>{});throw e;}
   finally{row.trace=await page.evaluate(()=>window.__boatTrace||[]).catch(()=>[]);await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.failure=String(e);throw e;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log('BOAT_EVIDENCE',out);}
})().catch(e=>{console.error(e);process.exitCode=1;});
