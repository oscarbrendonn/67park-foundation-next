const assert=require('node:assert/strict');
const {prepareJumpInput}=require('./jump-input.cjs');
function plazaJumpAccepted({before,minVelocity,expectedJumpsLeft}){
 const b=__eggyInput.playerRef.body,p=b.translation(),v=b.linvel(),s=window.__qaPlazaGorillaState?.();
 return s?.frames>before.frames&&s.grounded===false&&s.jumpsLeft===expectedJumpsLeft&&p.y>before.y+.12&&v.y>minVelocity;
}
function stableWallContact(){
 const p=__eggyInput.playerRef.body.translation(),i=__eggyInput.input,frame=__islandWorld.renderer.info.render.frame,samples=window.__qaPlazaWallSamples,last=samples[samples.length-1];
 if(!last||last.frame!==frame)samples.push({frame,x:p.x,y:p.y,z:p.z,intent:Math.hypot(i.x,i.z)});
 if(samples.length>8)samples.shift();
 if(samples.length<8)return false;
 const spread=Math.max(...samples.map(s=>s.x))-Math.min(...samples.map(s=>s.x));
 return samples.every(s=>s.x>=16.85&&s.x<17.5&&s.y<11&&s.intent>.1)&&spread<.03;
}
// Software CI clamps the same game timestep but rasterizes fewer frames per
// wall-clock second. Only the action deadline differs, not the asserted route,
// frame-stall budget, geometry, controls, or mandatory soak duration.
const actionTimeout=process.env.PARK_SOFTWARE_RENDER==='1'?240000:45000;
module.exports=async function checkPlazaClimb(page,{mobile=false,check}){
 await check('plaza leaves, all awnings and roofs match visible geometry; walls stay closed',async()=>{
  const result=await page.evaluate(async()=>{
   const w=__islandWorld,T=await import('three'),p=w.roofSupports.plaza,g=w.scene.getObjectByName('LOWER_PLAZA_V83');
   if(!p)throw Error('Plaza support missing');let meta;g.traverse(o=>{if(o.userData.plaza83)meta=o.userData.plaza83;});
   const ray=new T.Raycaster(),errors=[];let tested=0;
   for(const s of meta.shops){
    for(const [u,v,ceiling]of [[0,s.depth/2+1.5,17],[0,0,40],[-s.width*.17,s.depth/2+.55,19]]){
     const c=Math.cos(s.yaw),n=Math.sin(s.yaw),x=meta.cx+s.x+c*u+n*v,z=meta.cz+s.z-n*u+c*v;
     ray.set(new T.Vector3(x,ceiling,z),new T.Vector3(0,-1,0));
     const hit=ray.intersectObject(g,true).find(h=>!/COLLIDER|glass|reflection|bulb|cord/.test(h.object.name));
     const found=p.sample(x,z,ceiling);if(!hit||!found||Math.abs(hit.point.y-found.point.y)>.025)errors.push({id:s.id,u,v,hit:hit?.point.y,found:found?.point.y});
     tested++;
    }
    const x=meta.cx+s.x,z=meta.cz+s.z;
    if(w.characterGround(x,z,meta.ground,.36)<meta.ground+9)errors.push({id:s.id,reason:'wall open'});
   }
   // One-way awnings leave the original street below open, not a tall wall.
   const under=w.characterGround(18,57.5,meta.ground,.36),on=w.characterGround(18,57.5,15.1,.012);
   const ciPose={x:17.12685775756836,z:57.5,feet:17.24};
   const support=w.characterGround(ciPose.x,ciPose.z,ciPose.feet,.36),obstacle=w.characterObstacle(ciPose.x,ciPose.z,ciPose.feet,.36);
   return {stats:p.stats,tested,errors,under,on,ciPose:{...ciPose,support,obstacle}};
  });
  assert.equal(result.tested,33);assert.deepEqual(result.errors,[]);assert.equal(result.stats.shops,11);
  assert(result.stats.windowCaps>=44);assert.equal(result.stats.addedDrawCalls,1);assert.equal(result.stats.newAssetDownloads,0);
  assert(result.stats.bytes<11*1024*1024);assert(Math.abs(result.under-9.66)<.02);assert(result.on>14.8&&result.on<15);
  assert(result.ciPose.support<result.ciPose.feet+.36,'CI cap must not become airborne vertical support');assert(result.ciPose.obstacle>18.5,'CI cap remains a horizontal obstacle');
  console.log('PASS plaza geometry',JSON.stringify({mobile,...result}));
 });
 await check(mobile?'touch jumps: paving → shrub → striped awning → window cap → roof':'keyboard jumps: paving → shrub → striped awning → window cap → roof',async()=>{
  const before=await page.evaluate(async()=>{
   // Import the exact runtime singleton already used by main.js. A cache-busted
   // copy would observe a different controller and make the jump proof bogus.
   const {claudeGorillaState}=await import('/67park-foundation-next/app/claude-gorilla-runtime.js?v=foundation-next-movement-1');
   window.__qaPlazaGorillaState=()=>{const s=claudeGorillaState();return {grounded:!!s.grounded,jumped:s.jumped,jumpsLeft:s.jumpsLeft,frames:s.frames};};
   window.__qaPlazaTrace=[];window.__qaPlazaJumpProof=[];window.__qaPlazaJumpLatches=[];window.__qaPlazaStopGorillaObserver=false;
   // `jumped` is intentionally reset by the controller on later frames. Sample
   // the live singleton on rAF and retain only the first expected transition
   // for each armed real tap; physical rise is verified separately below.
   const observe=()=>{
    if(window.__qaPlazaStopGorillaObserver)return;
    const o=window.__qaPlazaJumpObservation,s=window.__qaPlazaGorillaState?.(),b=__eggyInput.playerRef.body,p=b.translation(),v=b.linvel(),renderFrame=__islandWorld.renderer.info.render.frame;
    if(o&&o.frameTrace.length<100&&o.lastRenderFrame!==renderFrame){
     o.lastRenderFrame=renderFrame;
     const i=__eggyInput.input,foot=p.y-.555;
     o.frameTrace.push({renderFrame,t:Math.round(performance.now()),p:{...p},v:{...v},gorilla:s&&{...s},input:{x:i.x,z:i.z,run:i.run,jumpQueued:i.jumpQueued},ground:__islandWorld.characterGround(p.x,p.z,foot,.36),foot});
    }
    if(o&&!o.latch&&s?.frames>o.armedState.frames&&s?.jumped===o.expectedJumped&&s?.jumpsLeft===o.expectedJumpsLeft){
     const entry={stage:o.label+' controller latched',t:Math.round(performance.now()),frame:renderFrame,p:{...p},v:{...v},gorilla:{...s}};
     o.latch=entry;window.__qaPlazaJumpLatches.push(entry);window.__qaPlazaJumpProof.push(entry);
     if(window.__qaPlazaJumpLatches.length>12)window.__qaPlazaJumpLatches.shift();if(window.__qaPlazaJumpProof.length>24)window.__qaPlazaJumpProof.shift();
    }
    window.__qaPlazaGorillaObserver=requestAnimationFrame(observe);
   };
   window.__qaPlazaGorillaObserver=requestAnimationFrame(observe);
   return {position:{...__eggyInput.playerRef.body.translation()},board:__candy.state().board};
  });
  const jump=await prepareJumpInput(page,{mobile,timeout:actionTimeout});
  const trace=stage=>page.evaluate(stage=>{
   const b=__eggyInput.playerRef.body,p=b.translation(),s=window.__qaPlazaGorillaState?.(),entry={stage,t:Math.round(performance.now()),p:{...p},v:{...b.linvel()},gorilla:s&&{...s}};
   window.__qaPlazaTrace.push(entry);if(window.__qaPlazaTrace.length>96)window.__qaPlazaTrace.shift();
   if(/grounded first-jump ready|first jump confirmed|double jump confirmed/.test(stage)){window.__qaPlazaJumpProof.push(entry);if(window.__qaPlazaJumpProof.length>24)window.__qaPlazaJumpProof.shift();}
  },stage);
  async function queueJump(label,expectedJumped,expectedJumpsLeft){
   const before=await page.evaluate(({label,expectedJumped,expectedJumpsLeft})=>{
    const b=__eggyInput.playerRef.body,p=b.translation();
    window.__qaPlazaJumpObservation={label,expectedJumped,expectedJumpsLeft,armedFrame:__islandWorld.renderer.info.render.frame,armedState:window.__qaPlazaGorillaState?.(),lastRenderFrame:null,frameTrace:[]};
    return {x:p.x,y:p.y,z:p.z,vy:b.linvel().y,frames:window.__qaPlazaGorillaState?.().frames};
   },{label,expectedJumped,expectedJumpsLeft});
   await jump();
   return before;
  }
  async function confirmJump(label,before,minVelocity,expectedJumpsLeft){
   // `jumped` only lasts one controller step, so its rAF observation is
   // diagnostic evidence. Acceptance joins physical impulse to the persistent
   // live budget after the controller frame armed before the trusted tap.
   await page.waitForFunction(plazaJumpAccepted,{before,minVelocity,expectedJumpsLeft},{timeout:actionTimeout});
   await trace(label+' confirmed');
  }
  async function direction(x,target){await page.evaluate(({x,target,deadline})=>{
   const token=(window.__qaPlazaSteer||0)+1;window.__qaPlazaSteer=token;window.__qaPlazaAtTarget=false;
   const started=performance.now();
   const tick=()=>{
    if(window.__qaPlazaSteer!==token)return;
    const i=__eggyInput.input,b=__eggyInput.playerRef.body,p=b.translation(),remaining=(target-p.x)*x;
    const trace=window.__qaPlazaTrace||(window.__qaPlazaTrace=[]),s=window.__qaPlazaGorillaState?.();trace.push({stage:'steer',t:Math.round(performance.now()),p:{...p},v:{...b.linvel()},remaining,gorilla:s&&{...s}});if(trace.length>96)trace.shift();
    if(remaining<=.06||performance.now()-started>deadline){i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);window.__qaPlazaAtTarget=remaining<=.06;return;}
    const yaw=__islandWorld.camera.userData.feelLab.yaw;
    // Normal analog input, with a deliberately early walking approach. The
    // hosted runner can render fewer browser frames than local hardware; do
    // not carry sprint momentum across the narrow awning/cap while waiting for
    // the next rAF to release it.
    const strength=Math.min(1,Math.max(.18,remaining*.65));i.x=x*Math.cos(yaw)*strength;i.z=-x*Math.sin(yaw)*strength;i.run=remaining>3;
    requestAnimationFrame(tick);
   };tick();
  },{x,target,deadline:actionTimeout});}
  async function stop(){await page.evaluate(()=>{window.__qaPlazaSteer=(window.__qaPlazaSteer||0)+1;const i=__eggyInput.input,b=__eggyInput.playerRef.body;i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);});}
  let hopNumber=0;
  async function hop(target,{double=true}={}){
   const hop=++hopNumber;
   // Do not pre-arm movement on a narrow support: wait until the runtime has
   // advanced the landing into a fresh grounded jump budget while input is off.
   await page.waitForFunction(()=>{const s=window.__qaPlazaGorillaState?.(),i=__eggyInput.input;return s?.grounded===true&&s?.jumpsLeft===1&&Math.hypot(i.x,i.z)<.01&&!i.run;},null,{timeout:actionTimeout});
   await trace(`hop ${hop} grounded first-jump ready`);
   const firstLabel=`hop ${hop} first jump`,start=await queueJump(firstLabel,1,1),x=Math.sign(target-start.x);
   // Queue the real jump first, then hold analog before the next simulation
   // frame. This preserves the grounded jump budget while giving the long
   // awning transfer its first airborne movement sample.
   await direction(x,target);
   await confirmJump(firstLabel,start,3,1);
   if(double){
    await page.waitForFunction(y=>{const b=__eggyInput.playerRef.body;return b.translation().y>y+1&&b.linvel().y<2.8;},start.y,{timeout:actionTimeout});
    await trace(`hop ${hop} second jump window`);
    const secondLabel=`hop ${hop} double jump`,second=await queueJump(secondLabel,2,0);
    // Touch-end can clear live analog input. Reclaim it in the same turn as
    // the queued double jump, before waiting to prove the impulse.
    await direction(x,target);
    await confirmJump(secondLabel,second,4,0);
   }
   await page.waitForFunction(()=>window.__qaPlazaAtTarget,null,{timeout:actionTimeout});
   await trace('target reached');
   await stop();
   await page.waitForFunction(()=>{const w=__islandWorld,b=__eggyInput.playerRef.body,p=b.translation();return Math.abs(b.linvel().y)<.2&&Math.abs(p.y-.555-w.characterGround(p.x,p.z,p.y-.555))<.08;},null,{timeout:actionTimeout});
   await trace('landed');
   return page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
  }
  try{
   if(before.board)await page.keyboard.press('KeyV');
   await page.evaluate(async()=>{__tp(__islandWorld.spawn);for(let f=0;f<4;f++)await new Promise(requestAnimationFrame);__tp([26.1,10.215,57.5]);for(let f=0;f<10;f++)await new Promise(requestAnimationFrame);});
   const shrub=await hop(24.5);assert(shrub.y>12.3&&shrub.y<13.1,JSON.stringify({shrub}));
   const awning=await hop(18.2);assert(awning.y>15.1&&awning.y<15.6,JSON.stringify({awning}));
   await page.waitForTimeout(600);
   await page.screenshot({path:'.qa-results/plaza-awning-'+(mobile?'mobile':'desktop')+'.png',timeout:90000});
   const sill=await hop(17.12,{double:false});assert(sill.y>16.15&&sill.y<16.4,JSON.stringify({sill}));
   const cap=await hop(17.14);assert(cap.y>19&&cap.y<19.3,JSON.stringify({cap}));
   const roof=await hop(15.7);assert(roof.y>20.3,JSON.stringify({roof}));
   await page.waitForTimeout(600);
   await page.screenshot({path:'.qa-results/plaza-roof-'+(mobile?'mobile':'desktop')+'.png',timeout:90000});
   // Walk off the eaves into the court; no old collider-box invisible platform.
   await direction(1,20.5);await page.waitForFunction(()=>window.__qaPlazaAtTarget,null,{timeout:actionTimeout});await stop();
   await page.waitForFunction(()=>__eggyInput.playerRef.body.translation().y<10.3,null,{timeout:actionTimeout});
   // Same front approached on the ground stays closed.
   await direction(-1,16);await page.evaluate(()=>window.__qaPlazaWallSamples=[]);
   // Keep the forward input live and require a plateau across eight distinct
   // rendered frames, rather than depending on an arbitrary x<17.01
   // intermediate threshold narrower than the actual closed-wall range.
   await page.waitForFunction(stableWallContact,null,{timeout:actionTimeout});
   await stop();
   const wall=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
   assert(wall.x>=16.85&&wall.x<17.5&&wall.y<11,JSON.stringify({wall}));
   const jumpProof=await page.evaluate(()=>window.__qaPlazaJumpProof);
   console.log('PASS plaza route',JSON.stringify({mobile,shrub,awning,sill,cap,roof,wall,jumpProof}));
  }catch(error){
   console.log('PLAZA_ROUTE_FAILURE',JSON.stringify(await page.evaluate(()=>{const w=__islandWorld,b=__eggyInput.playerRef.body,p=b.translation(),o=window.__qaPlazaJumpObservation;return {p,v:b.linvel(),gorilla:window.__qaPlazaGorillaState?.(),input:__eggyInput.input,board:__candy.state().board,surface:w.characterGround(p.x,p.z,p.y-.555),ahead:w.characterGround(p.x-.45,p.z,p.y-.555),jumpObservation:o&&{label:o.label,armedFrame:o.armedFrame,armedState:o.armedState,frameTrace:o.frameTrace},jumpProof:window.__qaPlazaJumpProof,trace:window.__qaPlazaTrace,errors:__candyErrors};})));
   throw error;
  }finally{
   await stop();await page.evaluate(p=>{__tp([p.x,p.y,p.z]);window.__qaPlazaStopGorillaObserver=true;cancelAnimationFrame(window.__qaPlazaGorillaObserver);delete window.__qaPlazaJumpObservation;delete window.__qaPlazaJumpLatches;delete window.__qaPlazaGorillaState;delete window.__qaPlazaJumpProof;delete window.__qaPlazaTrace;},before.position);
   if(before.board)await page.keyboard.press('KeyV');
  }
 });
};
module.exports.stableWallContact=stableWallContact;
module.exports.plazaJumpAccepted=plazaJumpAccepted;
