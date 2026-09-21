const assert=require('node:assert/strict');
const softwareRender=process.env.PARK_SOFTWARE_RENDER==='1';
const softwareRouteDistance=8;
const softwareRouteDeadline=15000;
module.exports=async(page,{mobile,check})=>{
 await check('city camera collision index is ready before play',async()=>{
  const result=await page.evaluate(async()=>{const {cameraMeshCastStats}=await import('/67park-foundation-next/app/feel-camera-meshes.js?v=skate-corner-recovery-1'),dom=__islandWorld.renderer.domElement;return {ready:dom.dataset.cameraMeshesReady,preparation:JSON.parse(dom.dataset.cameraMeshPreparation||'null'),stats:cameraMeshCastStats(__islandWorld)};});
  assert.equal(result.ready,'skate-corner-recovery-1');assert(result.stats.triangles>0,JSON.stringify(result));assert(result.stats.minimumRetainedBytes>0,JSON.stringify(result));assert(result.preparation?.maxChunkMs<50,JSON.stringify(result));
  assert.equal(result.stats.trees,result.preparation.geometries,'later party finishing must not replace prepared geometry');
  console.log('PASS camera mesh preload',JSON.stringify({mobile,trees:result.stats.trees,triangles:result.stats.triangles,buildMs:result.stats.buildMs,minimumRetainedBytes:result.stats.minimumRetainedBytes,maxChunkMs:result.preparation.maxChunkMs}));
 });
 await check('real board jump route keeps city camera collision bounded',async()=>{
  await page.waitForFunction(()=>window.__eggyInput?.playerRef?.body&&window.__skateState,null,{timeout:60000});
  const saved=await page.evaluate(()=>({board:__candy.state().board,p:__eggyInput.playerRef.body.translation()}));let result;
  try{
   if(saved.board){await page.keyboard.press('KeyV');await page.waitForFunction(()=>!__candy.state().board);}
   await page.evaluate(async()=>{const w=__islandWorld;__tp([-15,w.ground(-15,100)+.555,100]);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
   await page.keyboard.press('KeyV');await page.waitForFunction(()=>__candy.state().board);
   for(let i=0;i<2;i++){await page.keyboard.press('Space');await page.waitForFunction(()=>__skateState.air>.08);await page.keyboard.press('Space');await page.waitForFunction(()=>__skateState.flip>0);await page.waitForFunction(()=>__skateState.air===0);}
   await page.evaluate(async()=>{const {cameraMeshCastStats}=await import('/67park-foundation-next/app/feel-camera-meshes.js?v=skate-corner-recovery-1'),probe=window.__qaSkateCamera={active:true,last:0,gaps:[]};const tick=now=>{if(!probe.active)return;if(probe.last&&probe.gaps.length<120)probe.gaps.push(now-probe.last);probe.last=now;probe.id=requestAnimationFrame(tick)};probe.id=requestAnimationFrame(tick);probe.before={p:__eggyInput.playerRef.body.translation(),frame:__islandWorld.renderer.info.render.frame,stats:cameraMeshCastStats(__islandWorld)};});
   await page.keyboard.down('KeyD');
   try{
    if(softwareRender)await page.waitForFunction(({before,distance})=>{const b=__eggyInput.playerRef.body,p=b.translation(),draws=__islandWorld.renderer.info.render.frame-before.frame;return draws>=4&&Math.hypot(p.x-before.p.x,p.z-before.p.z)>=distance;},{before:await page.evaluate(()=>window.__qaSkateCamera.before),distance:softwareRouteDistance},{timeout:softwareRouteDeadline});
    else await page.waitForTimeout(800);
   }finally{await page.keyboard.up('KeyD');}
   await page.waitForTimeout(80);
   result=await page.evaluate(async()=>{const {cameraMeshCastStats}=await import('/67park-foundation-next/app/feel-camera-meshes.js?v=skate-corner-recovery-1'),after={p:__eggyInput.playerRef.body.translation(),frame:__islandWorld.renderer.info.render.frame},before=__qaSkateCamera.before,gaps=[...__qaSkateCamera.gaps].sort((a,b)=>a-b);return {rendered:after.frame-before.frame,travel:Math.hypot(after.p.x-before.p.x,after.p.z-before.p.z),gaps:{max:Math.max(0,...gaps),p95:gaps[Math.max(0,Math.ceil(gaps.length*.95)-1)]||0},beforeStats:before.stats,stats:cameraMeshCastStats(__islandWorld),skate:{...__skateState}};});
  }finally{
   await page.evaluate(async saved=>{const probe=window.__qaSkateCamera;if(probe){probe.active=false;cancelAnimationFrame(probe.id||0);}__tp([saved.p.x,saved.p.y,saved.p.z]);await new Promise(requestAnimationFrame);},saved);
   if(await page.evaluate(()=>__candy.state().board)!==saved.board){await page.keyboard.press('KeyV');await page.waitForFunction(board=>__candy.state().board===board,saved.board);}
  }
  assert(result.rendered>=4,JSON.stringify(result));assert(result.travel>3,JSON.stringify(result));assert.equal(result.stats.trees,result.beforeStats.trees,JSON.stringify(result));assert(result.stats.triangleTests<512,JSON.stringify(result));assert.equal(result.skate.air,0,JSON.stringify(result));
  if(softwareRender)assert(result.travel>=softwareRouteDistance,JSON.stringify(result));
  else{assert(result.rendered>=20,JSON.stringify(result));assert(result.gaps.p95<50,JSON.stringify(result));assert(result.gaps.max<250,JSON.stringify(result));}
  console.log('PASS skateboard camera route',JSON.stringify({mobile,rendered:result.rendered,travel:result.travel,gaps:result.gaps,triangleTests:result.stats.triangleTests}));
 });
};
