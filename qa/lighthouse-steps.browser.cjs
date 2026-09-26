// Reported lighthouse only. Live assets + HEAD bundle, with only the candidate
// lighthouse patch intercepted. No local server, broad suite, or publication.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const {prepareJumpInput}=require('./jump-input.cjs');
const out=path.resolve('.qa-results/lighthouse-steps-20260926',new Date().toISOString().replaceAll(':','-'));
const root='https://oscarbrendonn.github.io/67park-foundation-next/';
const url=root+'?v=horn-hold-1&claudeQA=passive&qa=lighthouse-steps';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const {patchLighthouseStepsBundle}=await import('./refresh-lighthouse-steps-bundle.mjs');
 const original=execFileSync('git',['show','HEAD:island/runtime.bundle.js'],{encoding:'utf8',maxBuffer:8*1024*1024});
 const browser=await chromium.launch(browserLaunchOptions());
 const report={url,kind:'Isolated touch Chromium; candidate is NOT published; not physical iPhone',rows:[],errors:[]};
 try{
  for(const candidate of [false,true]){
   const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   try{
    await context.addInitScript(()=>{
     localStorage.setItem('67park-feel-lab-muted','1');
     localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));
     localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));
    });
    const page=await context.newPage(),row={candidate,actions:[]};report.rows.push(row);
    page.on('pageerror',e=>report.errors.push({candidate,error:String(e)}));
    await page.route('**/island/runtime.bundle.js*',r=>r.fulfill({contentType:'text/javascript',body:candidate?patchLighthouseStepsBundle(original):original}));
    if(candidate)await page.route('**/island/lighthouse-support.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('island/lighthouse-support.js','utf8')}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready'&&JSON.parse(document.querySelector('#claude-gorilla-qa')?.dataset.state||'{}').base==='cat67',null,{timeout:120000});
    row.renderer=await assertBrowserRenderer(page);
    row.geometry=await page.evaluate(()=>{
     const w=__islandWorld,p=JSON.parse(w.renderer.domElement.dataset.lunapark77).placements.find(p=>p.asset==='lighthouse');
     return{placement:p,stats:w.lunapark.lighthouseSupport?.stats,heights:[5.3,4.02,3.6,2.7].map(r=>({r,top:w.lunapark.obstacle(p.x-r,p.z),terrain:w.terrainGround(p.x-r,p.z)}))};
    });
    if(candidate)assert.equal(row.geometry.stats.revision,'lighthouse-steps-1');
    else assert.equal(row.geometry.stats,undefined);
    console.log('LIGHTHOUSE_LOADED',JSON.stringify({candidate,geometry:row.geometry}));
    await page.evaluate(async()=>{
     const {claudeGorillaState}=await import('/67park-foundation-next/app/claude-gorilla-runtime.js?v=skate-corner-recovery-1');
     window.__lightState=()=>{const s=claudeGorillaState();return{grounded:s.grounded,jumpsLeft:s.jumpsLeft,jumped:s.jumped,frames:s.frames};};
     window.__lightTrace=[];window.__lightFrame=0;
     function observe(){const b=__eggyInput.playerRef.body;window.__lightTrace.push({frame:++window.__lightFrame,p:{...b.translation()},v:{...b.linvel()},s:__lightState()});requestAnimationFrame(observe);}requestAnimationFrame(observe);
    });
    if(await page.evaluate(()=>__candy.state().board))await page.keyboard.press('KeyV');
    const placement=row.geometry.placement,cx=placement.x,cz=placement.z;
    // A single initial placement outside the obstacle; every later route is
    // ordinary analog input + trusted taps, not teleporting onto the steps.
    await page.evaluate(async({x,z})=>{
     __tp(__islandWorld.spawn);for(let n=0;n<4;n++)await new Promise(requestAnimationFrame);
     __tp([x,__islandWorld.terrainGround(x,z)+.555,z]);
    },{x:cx-5.3,z:cz});
    await page.waitForFunction(()=>__lightState().grounded&&__lightState().jumpsLeft===1,null,{timeout:15000});
    const jump=await prepareJumpInput(page,{mobile:true,timeout:15000});
    const state=()=>page.evaluate(()=>({p:{...__eggyInput.playerRef.body.translation()},v:{...__eggyInput.playerRef.body.linvel()},s:__lightState(),frame:__lightFrame}));
    const frames=n=>page.evaluate(async n=>{for(let f=0;f<n;f++)await new Promise(requestAnimationFrame);},n);
    async function steer(target){await page.evaluate(target=>{
     window.__lightTarget=target;window.__lightAtTarget=false;
     const token=window.__lightSteer=(window.__lightSteer||0)+1,start=performance.now();
     function tick(){
      if(window.__lightSteer!==token)return;
      const b=__eggyInput.playerRef.body,i=__eggyInput.input,p=b.translation(),remaining=target-p.x;
      if(Math.abs(remaining)<.035||performance.now()-start>8000){i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);window.__lightAtTarget=Math.abs(remaining)<.035;window.__lightDriveDone=true;return;}
      const yaw=__islandWorld.camera.userData.feelLab.yaw,strength=Math.sign(remaining)*Math.min(.65,Math.max(.13,Math.abs(remaining)*.65));
      i.x=Math.cos(yaw)*strength;i.z=-Math.sin(yaw)*strength;i.run=false;requestAnimationFrame(tick);
     }window.__lightDriveDone=false;tick();
    },target);}
    async function stop(){await page.evaluate(()=>{window.__lightSteer=(window.__lightSteer||0)+1;const i=__eggyInput.input,b=__eggyInput.playerRef.body,v=b.linvel();i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:v.y,z:0},true);});}
    async function hop(target,label){
     await page.waitForFunction(()=>__lightState().grounded&&__lightState().jumpsLeft===1,null,{timeout:15000});
     const before=await state();await jump();
     await page.waitForFunction(before=>{const b=__eggyInput.playerRef.body,s=__lightState();return s.frames>before.s.frames&&!s.grounded&&b.translation().y>before.p.y+.12&&b.linvel().y>3;},before,{timeout:10000});
     const impulse=await state();await steer(target);
     await page.waitForFunction(()=>window.__lightDriveDone,null,{timeout:12000});await stop();
     await page.waitForFunction(()=>__lightState().grounded&&Math.abs(__eggyInput.playerRef.body.linvel().y)<.2,null,{timeout:10000});
     const after=await state(),action={label,before,impulse,after,target};row.actions.push(action);
     if(candidate)assert(Math.abs(after.p.x-target)<.08,JSON.stringify(action));
     console.log('LIGHTHOUSE_HOP',JSON.stringify({candidate,...action}));return after;
    }
    const lower=await hop(cx-4.02,'lower plinth');
    if(!candidate){
     assert(lower.p.x<cx-4.2,'baseline remains outside the old giant box');
     row.reproduced=true;await page.screenshot({path:path.join(out,'baseline-blocked.png')});
    }else{
     assert(Math.abs(lower.p.y-.555-placement.y-.5984)<.06,'feet land on real lower tread');
     const upper=await hop(cx-3.6,'upper plinth');
     assert(Math.abs(upper.p.y-.555-placement.y-1.0846)<.06,'feet land on real upper tread');
     await frames(90);const stable=await state();
     assert(Math.abs(stable.p.y-upper.p.y)<.03,'stable standing, no sinking or upward snap');
     row.stable=stable;
     await page.screenshot({path:path.join(out,'cat-on-lighthouse-step.png')});
     await steer(cx);await frames(100);await stop();const wall=await state();row.wall=wall;
     assert(wall.p.x<cx-2.9,'actual tower still cannot be entered');
     assert(Math.abs(wall.p.y-upper.p.y)<.08,'contact does not launch onto tower');
     await steer(cx-5.3);await page.waitForFunction(()=>__lightDriveDone,null,{timeout:12000});await stop();
     await page.waitForFunction(()=>__lightState().grounded,null,{timeout:10000});
     const down=await state();row.down=down;
     assert(down.p.x<cx-5.2,'can walk back off the steps');
     const terrain=await page.evaluate(p=>__islandWorld.terrainGround(p.x,p.z),down.p);
     assert(Math.abs(down.p.y-.555-terrain)<.06,'lands on actual road');
     await page.screenshot({path:path.join(out,'cat-returned-to-road.png')});
     row.pass=true;
    }
    row.trace=await page.evaluate(()=>window.__lightTrace);
    assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
   }finally{await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.failure=String(e);throw e;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log('LIGHTHOUSE_EVIDENCE',out);}
})().catch(e=>{console.error(e);process.exitCode=1;});
