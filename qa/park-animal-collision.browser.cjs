// Focused four-animal collision proof on existing local preview. No broad QA,
// publication, server start or fixture movement while a route is running.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const url=process.env.PARK_ANIMALS_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=park-animals-solid-1';
const output=process.env.PARK_ANIMALS_COLLISION_EVIDENCE||'.qa-results/park-animals-collision-1';
const baseline=process.env.PARK_ANIMALS_BASELINE==='1';
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,baseline,profiles:[]};
 try{for(const mobile of baseline?[false]:[false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];let touch;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));window.__animalCollisionEvents={trusted:0,jump:0};for(const type of ['keydown','touchstart'])addEventListener(type,e=>{if(e.isTrusted)__animalCollisionEvents.trusted++;if(e.code==='Space'||e.target.closest?.('button[aria-label="Jump"]'))__animalCollisionEvents.jump++;},true);});
  const profile={mobile,errors,routes:[]};report.profiles.push(profile);
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
   profile.renderer=await assertBrowserRenderer(page);if(mobile)touch=await context.newCDPSession(page);
   // Aim desktop keyboard approaches squarely at a side. An oblique W route
   // intentionally slides along a wall and is not a standing-contact proof.
   if(!mobile){
    const aim=await page.evaluate(async()=>{const {playerSettings}=await import('/67park-foundation-next/app/player-settings.js');const yaw=__islandWorld.camera.userData.feelLab.yaw,target=Math.round(yaw/Math.PI)*Math.PI;return {target,dx:(yaw-target)/(.0052*playerSettings.mouseSensitivity)};});
    await page.mouse.move(640,500);await page.mouse.down();await page.mouse.move(640+aim.dx,500,{steps:10});await page.mouse.up();
    await page.waitForFunction(t=>Math.abs(__islandWorld.camera.userData.feelLab.yaw-t)<.006,aim.target);
   }
   profile.geometry=await page.evaluate(async()=>{
    const w=__islandWorld,T=await import('three'),g=w.scene.getObjectByName('REFERENCE_PARK_V63'),rows=new Map();g.updateMatrixWorld(true);
    for(const m of g.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('P57_toy-')))for(let i=0;i<m.count;i++){
     const matrix=new T.Matrix4();m.getMatrixAt(i,matrix);matrix.premultiply(m.matrixWorld);
     const key=matrix.elements.join(',');if(!rows.has(key))rows.set(key,{name:m.name,box:new T.Box3()});
     if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();rows.get(key).box.union(m.geometry.boundingBox.clone().applyMatrix4(matrix));
    }
    return [...rows.values()].map(({name,box:b})=>{
     const x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2,feet=b.min.y;
     return {name,min:b.min.toArray(),max:b.max.toArray(),center:{x,z},inside:w.characterObstacle(x,z,feet),sides:[[b.min.x+.02,z],[b.max.x-.02,z],[x,b.min.z+.02],[x,b.max.z-.02]].map(([x,z])=>w.characterObstacle(x,z,feet)),outside:[[b.min.x-.08,z],[b.max.x+.08,z],[x,b.min.z-.08],[x,b.max.z+.08]].map(([x,z])=>w.characterObstacle(x,z,feet))};
    });
   });
   console.log('ANIMAL_COLLISION_GEOMETRY',JSON.stringify(profile.geometry));
   assert.equal(profile.geometry.length,4);
   for(const row of profile.geometry){assert(Math.abs(row.inside-row.max[1])<.002,`${row.name}: visible animal must block at its actual bounds`);assert(row.sides.every(h=>Math.abs(h-row.max[1])<.002));assert(row.outside.every(h=>Math.abs(h-9.718031)<.003),'no oversized wall outside model bounds');}
   for(const board of [false,true]){
    if((await page.evaluate(()=>__candy.state().board))!==board){if(mobile)await page.getByRole('button',{name:board?'Skate':'Walk',exact:true}).tap();else await page.keyboard.press('KeyV');await page.waitForFunction(b=>__candy.state().board===b,board);}
    for(const row of profile.geometry){
     const route=await page.evaluate(async({row,mobile})=>{
      const w=__islandWorld,yaw=w.camera.userData.feelLab.yaw,dx=mobile?0:-Math.sin(yaw),dz=mobile?-1:-Math.cos(yaw),c=row.center;
      const rx=(row.max[0]-row.min[0])/2,rz=(row.max[2]-row.min[2])/2,r=Math.min(rx/Math.max(1e-9,Math.abs(dx)),rz/Math.max(1e-9,Math.abs(dz)));
      const start={x:c.x-dx*(r+2.8),z:c.z-dz*(r+2.8)};
      // Separate teleports reset the prior collision sweep anchor; a short
      // teleport straight through the previous animal is correctly rejected.
      __tp(w.spawn);for(let i=0;i<6;i++)await new Promise(requestAnimationFrame);
      __tp([start.x,9.718031+.555,start.z]);__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true);
      return {start,dx,dz,r,center:c,ix:Math.cos(yaw)*dx-Math.sin(yaw)*dz,iz:-Math.sin(yaw)*dx-Math.cos(yaw)*dz};
     },{row,mobile});
     profile.activeRoute={name:row.name,board,route};
     await page.waitForTimeout(250);
     const placed=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
     assert(Math.hypot(placed.x-route.start.x,placed.z-route.start.z)<.1,'fixture must reach the new approach before starting input');
     await page.evaluate(()=>{window.__animalContact={on:true,samples:[]};const s=__animalContact;function tick(){if(!s.on)return;const p=__eggyInput.playerRef.body.translation(),i=__eggyInput.input;s.samples.push({x:p.x,y:p.y,z:p.z,intent:Math.hypot(i.x,i.z),t:performance.now()});if(s.samples.length>90)s.samples.shift();s.raf=requestAnimationFrame(tick);}tick();});
     try{
      if(mobile){const b=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(b);const x=b.x+b.width/2,y=b.y+b.height/2;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+route.ix*b.width*.36,y:y-route.iz*b.height*.36,id:1}]});}else await page.keyboard.down('KeyW');
      await page.waitForFunction(r=>{const s=__animalContact.samples.slice(-12);if(s.length<12||s[11].t-s[0].t<180)return false;const a=s[0],b=s[11];return s.every(p=>p.intent>.2&&Math.hypot(p.x-a.x,p.z-a.z)<.035)&&(b.x-r.start.x)*r.dx+(b.z-r.start.z)*r.dz>1;},route,{timeout:10000});
     }finally{if(mobile)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');await page.evaluate(()=>{__animalContact.on=false;cancelAnimationFrame(__animalContact.raf);});}
     const state=await page.evaluate(()=>({p:{...__eggyInput.playerRef.body.translation()},samples:__animalContact.samples}));
     const progress=(state.p.x-route.start.x)*route.dx+(state.p.z-route.start.z)*route.dz;
     assert(progress>1&&progress<2.85,'must advance then stop at the animal, not cross it');assert(Math.abs(state.p.y-.555-9.718031)<.07,'must not snap onto top');
     assert(state.samples.every(p=>p.x<=row.min[0]||p.x>=row.max[0]||p.z<=row.min[2]||p.z>=row.max[2]),'player must never enter the animal footprint');
     profile.routes.push({name:row.name,board,route,progress,...state});
     delete profile.activeRoute;
    }
   }
   profile.events=await page.evaluate(()=>__animalCollisionEvents);assert.equal(profile.events.jump,0);assert(profile.events.trusted>=8);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1');
   await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-blocked.png`});
   console.log('PARK_ANIMAL_COLLISION_PASS',JSON.stringify({mobile,models:4,solidSideProbes:16,outsideProbes:16,realInputRoutes:profile.routes.length,errors}));
  }catch(e){profile.failure=String(e);profile.trace=await page.evaluate(()=>window.__animalContact?.samples).catch(()=>null);await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-failure.png`}).catch(()=>{});throw e;}
  finally{if(touch)await touch.detach();await context.close();}
 }}finally{fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error('PARK_ANIMAL_COLLISION_FAIL',e);process.exitCode=1;});
