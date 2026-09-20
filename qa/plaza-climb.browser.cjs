const assert=require('node:assert/strict');
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
   return {stats:p.stats,tested,errors,under,on};
  });
  assert.equal(result.tested,33);assert.deepEqual(result.errors,[]);assert.equal(result.stats.shops,11);
  assert(result.stats.windowCaps>=44);assert.equal(result.stats.addedDrawCalls,1);assert.equal(result.stats.newAssetDownloads,0);
  assert(result.stats.bytes<11*1024*1024);assert(Math.abs(result.under-9.66)<.02);assert(result.on>14.8&&result.on<15);
  console.log('PASS plaza geometry',JSON.stringify({mobile,...result}));
 });
 await check(mobile?'touch jumps: paving → shrub → striped awning → window cap → roof':'keyboard jumps: paving → shrub → striped awning → window cap → roof',async()=>{
  const before=await page.evaluate(()=>{window.__qaPlazaTrace=[];return {position:{...__eggyInput.playerRef.body.translation()},board:__candy.state().board};});
  const jump=()=>mobile?page.getByRole('button',{name:'Jump',exact:true}).tap():page.keyboard.press('Space');
  const trace=stage=>page.evaluate(stage=>{const b=__eggyInput.playerRef.body,p=b.translation();window.__qaPlazaTrace.push({stage,t:Math.round(performance.now()),p:{...p},v:{...b.linvel()}});if(window.__qaPlazaTrace.length>96)window.__qaPlazaTrace.shift();},stage);
  async function jumpAndConfirm(label,minVelocity){
   const before=await page.evaluate(()=>{const b=__eggyInput.playerRef.body,p=b.translation();return {x:p.x,y:p.y,z:p.z,vy:b.linvel().y};});
   await jump();
   // Touch buttons queue their click for the next simulation step. Confirm the
   // *resulting physical impulse* before steering, so a browser frame that
   // lands between the tap and rAF cannot turn a missed jump into a route pass.
   await page.waitForFunction(({before,minVelocity})=>{
    const b=__eggyInput.playerRef.body,p=b.translation(),v=b.linvel();
    return p.y>before.y+.12&&v.y>minVelocity;
   },{before,minVelocity},{timeout:actionTimeout});
   await trace(label+' confirmed');
   return before;
  }
  async function direction(x,target){await page.evaluate(({x,target,deadline})=>{
   const token=(window.__qaPlazaSteer||0)+1;window.__qaPlazaSteer=token;window.__qaPlazaAtTarget=false;
   const started=performance.now();
   const tick=()=>{
    if(window.__qaPlazaSteer!==token)return;
    const i=__eggyInput.input,b=__eggyInput.playerRef.body,p=b.translation(),remaining=(target-p.x)*x;
    const trace=window.__qaPlazaTrace||(window.__qaPlazaTrace=[]);trace.push({stage:'steer',t:Math.round(performance.now()),p:{...p},v:{...b.linvel()},remaining});if(trace.length>96)trace.shift();
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
  async function hop(target,{double=true}={}){
   const launch=await page.evaluate(()=>({x:__eggyInput.playerRef.body.translation().x}));
   const x=Math.sign(target-launch.x),longTransfer=Math.abs(target-launch.x)>4;
   // Arm the real analog control one simulation sample before the only long
   // transfer. A sparse renderer otherwise spends the first airborne sample
   // discovering a zero horizontal velocity, making this test driver
   // undershoot the awning despite both accepted jump impulses.
   if(longTransfer){
    await direction(x,target);
    await page.waitForFunction(x=>__eggyInput.playerRef.body.linvel().x*x>.3,x,{timeout:actionTimeout});
    await trace('long transfer armed');
   }
   const start=await jumpAndConfirm('first jump',3);
   // Begin the actual analog leg during the first arc: the longest transfer
   // (shrub → awning) needs both jump arcs, not just the second one.
   await direction(x,target);
   if(double){
    await page.waitForFunction(y=>{const b=__eggyInput.playerRef.body;return b.translation().y>y+1&&b.linvel().y<2.8;},start.y,{timeout:actionTimeout});
    await trace('second jump window');
    await jumpAndConfirm('double jump',4);
    // The touch click is allowed to refresh the live input singleton. Reclaim
    // this same route vector only after the second physical impulse lands.
    await direction(x,target);
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
   console.log('PASS plaza route',JSON.stringify({mobile,shrub,awning,sill,cap,roof,wall}));
  }catch(error){
   console.log('PLAZA_ROUTE_FAILURE',JSON.stringify(await page.evaluate(()=>{const w=__islandWorld,b=__eggyInput.playerRef.body,p=b.translation();return {p,v:b.linvel(),input:__eggyInput.input,board:__candy.state().board,surface:w.characterGround(p.x,p.z,p.y-.555),ahead:w.characterGround(p.x-.45,p.z,p.y-.555),trace:window.__qaPlazaTrace,errors:__candyErrors};})));
   throw error;
  }finally{
   await stop();await page.evaluate(p=>__tp([p.x,p.y,p.z]),before.position);
   if(before.board)await page.keyboard.press('KeyV');
  }
 });
};
module.exports.stableWallContact=stableWallContact;
