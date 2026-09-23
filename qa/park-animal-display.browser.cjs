// Only the four-animal display: two views and one short walk/skate route per
// profile. No server, publication, multiplayer messaging, general suite or soak.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const url=process.env.PARK_ANIMALS_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=park-animals-1';
const output=process.env.PARK_ANIMALS_EVIDENCE||'.qa-results/park-animals-1';
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,profiles:[]};
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[],requests=[];let touch;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/park-(animals|toys|layout)/.test(r.url()))requests.push(r.url());});
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));window.__animalInputEvents={trusted:0,jump:0};for(const type of ['keydown','touchstart'])addEventListener(type,e=>{if(e.isTrusted)__animalInputEvents.trusted++;if(e.code==='Space'||e.target.closest?.('button[aria-label="Jump"]'))__animalInputEvents.jump++;},true);});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
   const renderer=await assertBrowserRenderer(page);if(mobile)touch=await context.newCDPSession(page);
   const state=await page.evaluate(async()=>{
    const w=__islandWorld,T=await import('three'),g=w.scene.getObjectByName('REFERENCE_PARK_V63'),animals=[],plinth=[];
    g.traverse(m=>{if(!m.isInstancedMesh)return;if(/P57_toy-/.test(m.name))animals.push({name:m.name,count:m.count});if(/P57_sculpture-plinth/.test(m.name))plinth.push({name:m.name,count:m.count});});
    const supports=[];for(const x of [138.7,140.705,143.6])for(const z of [40,43.202,47.002,50.802,54])supports.push({x,z,y:w.ground(x,z)});
    __tp([140.705,w.ground(140.705,47.002)+.555,47.002]);
    return {animals,plinth,supports,dpr:devicePixelRatio,touch:navigator.maxTouchPoints,frame:w.renderer.info.render.frame,muted:localStorage.getItem('67park-feel-lab-muted')};
   });
   assert.equal(state.animals.length,9);assert(state.animals.filter(m=>m.name.startsWith('P57_toy-bull-orange')).every(m=>m.count===2));
   for(const color of ['yellow','pink'])assert.equal(state.animals.filter(m=>m.name.startsWith('P57_toy-elephant-'+color)&&m.count===1).length,3);
   assert(!state.animals.some(m=>/toy-figure-pink|toy-ball-pink/.test(m.name)));assert.equal(state.plinth.length,2);assert(state.plinth.every(m=>m.count===1));
   assert(state.supports.every(p=>Math.abs(p.y-9.718031)<.003));assert.equal(state.muted,'1');
   const routes=[];
   for(const board of [false,true]){
    if((await page.evaluate(()=>__candy.state().board))!==board){if(mobile)await page.getByRole('button',{name:board?'Skate':'Walk',exact:true}).tap();else await page.keyboard.press('KeyV');await page.waitForFunction(b=>__candy.state().board===b,board);}
    const route=await page.evaluate(mobile=>{
     const w=__islandWorld,yaw=w.camera.userData.feelLab.yaw,dx=mobile?0:-Math.sin(yaw),dz=mobile?-1:-Math.cos(yaw),length=mobile?8:5,start={x:140.705-dx*length/2,z:47.002-dz*length/2};
     __tp([start.x,w.ground(start.x,start.z)+.555,start.z]);__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true);
     return {start,dx,dz,length,ix:Math.cos(yaw)*dx-Math.sin(yaw)*dz,iz:-Math.sin(yaw)*dx-Math.cos(yaw)*dz};
    },mobile);
    await page.waitForTimeout(250);
    try{
     if(mobile){const b=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(b);const x=b.x+b.width/2,y=b.y+b.height/2;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+route.ix*b.width*.36,y:y-route.iz*b.height*.36,id:1}]});}
     else await page.keyboard.down('KeyW');
     await page.waitForFunction(r=>{const p=__eggyInput.playerRef.body.translation();return (p.x-r.start.x)*r.dx+(p.z-r.start.z)*r.dz>=r.length-.2;},route,{timeout:15000});
    }finally{if(mobile)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');}
    const end=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));assert(Math.abs(end.y-.555-9.718031)<.06);routes.push({board,route,end});
   }
   await page.evaluate(()=>{const w=__islandWorld,b=w.scene.onBeforeRender;__tp([140.705,w.ground(140.705,60)+.555,60]);w.scene.onBeforeRender=function(...args){b?.apply(this,args);if(window.__animalView){w.camera.position.fromArray(__animalView.p);w.camera.lookAt(...__animalView.t);w.camera.updateMatrixWorld(true);}};});
   const views=mobile?[{name:'overview',p:[158,28,75],t:[140.7,10.8,47]},{name:'front',p:[144,20,79],t:[140.7,11.4,47]}]:[{name:'overview',p:[157,27,72],t:[140.7,10.7,47]},{name:'front',p:[141,18,71],t:[140.7,11.2,47]}];
   for(const view of views){await page.evaluate(v=>window.__animalView=v,view);await page.waitForTimeout(400);await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-${view.name}.png`});}
   const final=await page.evaluate(()=>({events:__animalInputEvents,errors:__candyErrors,frame:__islandWorld.renderer.info.render.frame}));assert(final.frame>state.frame);assert.equal(final.events.jump,0);assert(final.events.trusted>0);assert.deepEqual(errors,[]);assert.deepEqual(final.errors,[]);assert(requests.some(u=>u.includes('park-animals-1.glb')));assert(!requests.some(u=>u.includes('park-toys-v57.glb')));
   if(mobile){assert.equal(state.dpr,3);assert(state.touch>0);}
   report.profiles.push({mobile,renderer,state,routes,requests,final,errors});console.log('PARK_ANIMAL_DISPLAY_PASS',JSON.stringify({mobile,animals:4,extraPlatforms:0,routes:routes.length,errors}));
  }catch(e){await page.screenshot({path:`${output}/${mobile?'touch':'desktop'}-failure.png`}).catch(()=>{});throw e;}
  finally{if(touch)await touch.detach();await context.close();}
 }}finally{fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error('PARK_ANIMAL_DISPLAY_FAIL',e);process.exitCode=1;});
