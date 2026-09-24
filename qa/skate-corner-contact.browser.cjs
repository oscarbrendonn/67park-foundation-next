// Targeted replay of the reported rail-end landing. Isolated Chromium, not an iPhone.
const {chromium}=require('playwright');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
module.exports=async function checkRailCorners(page,{baseline=false,output='.qa-results/rail-corners-fixed'}={}){
 fs.mkdirSync(output,{recursive:true});
 const cdp=await page.context().newCDPSession(page),rows=[],errors=[];
 const onError=e=>errors.push(String(e));page.on('pageerror',onError);
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 async function drive(x,z){
  const box=await page.locator('.park-stick').boundingBox();assert(box);
  const yaw=await page.evaluate(()=>__islandWorld.camera.userData.feelLab.yaw);
  const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await touch('touchStart',[{x:cx,y:cy,id:9}]);
  await touch('touchMove',[{x:cx+35*(Math.cos(yaw)*x-Math.sin(yaw)*z),y:cy+35*(Math.sin(yaw)*x+Math.cos(yaw)*z),id:9}]);
 }
 async function place(x,z,air){
  await page.evaluate(async({x,z,air})=>{
   __tp(__islandWorld.spawn);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   __tp([x,__islandWorld.ground(x,z)+.555+air,z]);
  },{x,z,air});
  await page.waitForFunction(({x,z})=>{
   const b=__eggyInput.playerRef.body,p=b.translation();
   return Math.abs(p.x-x)<.02&&Math.abs(p.z-z)<.02&&Math.abs(p.y-__islandWorld.ground(x,z)-.555)<.025&&Math.abs(b.linvel().y)<.1;
  },{x,z},{timeout:5000});
 }
 try{
  const posts=await page.evaluate(()=>{
   let segments;__islandWorld.scene.traverse(m=>{if(m.userData.stairGeometry?.railSegments)segments=m.userData.stairGeometry.railSegments;});
   return segments.filter(s=>Math.hypot(s.b[0]-s.a[0],s.b[2]-s.a[2])<.001).map(s=>({x:s.a[0],z:s.a[2]}));
  });assert.equal(posts.length,6);
  await page.evaluate(()=>{window.__railTest={last:0,gaps:[],touches:[]};window.__railTouch=e=>__railTest.touches.push(e.isTrusted);addEventListener('touchstart',__railTouch,true);});
  for(const board of [true,false]){
   if(await page.evaluate(()=>__candy.state().board)!==board){await page.keyboard.press('KeyV');await page.waitForFunction(board=>__candy.state().board===board,board);}
   for(const [index,post]of posts.entries())for(const sign of [-1,1]){
    await place(post.x+sign*.18,post.z,3.2);
    const before=await page.evaluate(()=>{const p=__eggyInput.playerRef.body.translation();return{...p,blocked:__islandWorld.treeBlocked(p.x,p.y,p.z)};});
    assert(before.blocked,'fixture must land overlapping the original rail capsule');
    if(board&&index===5&&sign===-1)await page.screenshot({path:output+'/landing.png'});
    await drive(sign,0);await page.waitForTimeout(600);await touch('touchEnd');
    const after=await page.evaluate(()=>{const p=__eggyInput.playerRef.body.translation();return{...p,blocked:__islandWorld.treeBlocked(p.x,p.y,p.z)};});
    const travel=(after.x-before.x)*sign;rows.push({board,index,sign,before,after,travel});
    if(baseline){assert(travel<.05,'baseline should reproduce the stuck rail landing');}
    else{assert(travel>.7,JSON.stringify(rows.at(-1)));assert(!after.blocked);}
    if(board&&index===5&&sign===-1)await page.screenshot({path:output+'/escaped.png'});
   }
  }
  if(!baseline){
   // All three skate flights must remain usable as stairs, in both directions.
   if(!await page.evaluate(()=>__candy.state().board))await page.keyboard.press('KeyV');
   const routes=await page.evaluate(()=>__islandWorld.stairs.routes.filter(r=>r.name.startsWith('Skate')));
   assert.equal(routes.length,3);
   for(const route of routes)for(const reverse of [false,true]){
    const from=reverse?route.to:route.from,to=reverse?route.from:route.to;
    const length=Math.hypot(to[0]-from[0],to[1]-from[1]),dx=(to[0]-from[0])/length,dz=(to[1]-from[1])/length;
    await place(from[0],from[1],0);await drive(dx,dz);
    try{await page.waitForFunction(({from,dx,dz,length})=>{const p=__eggyInput.playerRef.body.translation();return(p.x-from[0])*dx+(p.z-from[1])*dz>=length;},{from,dx,dz,length},{timeout:5000});}
    finally{await touch('touchEnd');}
    const at=await page.evaluate(()=>__eggyInput.playerRef.body.translation());
    assert(Object.values(at).every(Number.isFinite));rows.push({stairs:route.name,reverse,length,at});
   }
   // Head-on contact must still stop before the rail, then allow retreat.
   for(const board of [false,true]){
    if(await page.evaluate(()=>__candy.state().board)!==board)await page.keyboard.press('KeyV');
    const post=posts[5];await place(post.x-.9,post.z,0);
    await drive(1,0);await page.waitForTimeout(600);await touch('touchEnd');
    const at=await page.evaluate(()=>__eggyInput.playerRef.body.translation());
    assert(at.x<=post.x-.52,JSON.stringify({board,at,post}));
    await drive(-1,0);await page.waitForTimeout(500);await touch('touchEnd');
    const end=await page.evaluate(()=>__eggyInput.playerRef.body.translation());assert(end.x<at.x-.7);
    rows.push({headOn:true,board,at,end});
   }
  }
  const state=await page.evaluate(()=>({trusted:__railTest.touches.every(Boolean),touches:__railTest.touches.length,lost:__islandWorld.renderer.getContext().isContextLost(),muted:localStorage.getItem('67park-feel-lab-muted')}));
  assert(state.trusted&&state.touches>=24);assert(!state.lost);assert.equal(state.muted,'1');assert.deepEqual(errors,[]);
  const report={baseline,kind:'Chromium 390x844 trusted joystick + physics landing fixture, not physical iPhone',rows,state,errors};
  fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log('RAIL_CORNERS_PASS',JSON.stringify({baseline,cases:rows.length,minRetreat:Math.min(...rows.filter(r=>r.travel!==undefined).map(r=>r.travel))}));return report;
 }catch(e){fs.writeFileSync(output+'/failed.json',JSON.stringify({rows,errors,error:String(e)},null,2));await page.screenshot({path:output+'/failed.png'});throw e;}
 finally{await touch('touchCancel').catch(()=>{});await cdp.detach();page.off('pageerror',onError);await page.evaluate(()=>{removeEventListener('touchstart',window.__railTouch,true);}).catch(()=>{});}
};
if(require.main===module)(async()=>{
 const browser=await chromium.launch(browserLaunchOptions());
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));});
  const page=await context.newPage(),baseline=process.argv.includes('--baseline');
  if(baseline){const old=execFileSync('git',['show','5a22c817f56b0662eb11d306cfa26a2acd4a1c33:app/character-contact.js'],{encoding:'utf8'});await page.route('**/app/character-contact.js?*',r=>r.fulfill({contentType:'text/javascript',body:old}));}
  await page.goto(process.env.PARK_CORNER_URL||'http://127.0.0.1:8496/67park-foundation-next/?qa=rail-corners',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  await module.exports(page,{baseline,output:process.env.PARK_CORNER_OUTPUT||'.qa-results/rail-corners-'+(baseline?'baseline':'fixed')});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
