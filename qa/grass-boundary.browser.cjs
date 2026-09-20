const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8499/67park-foundation-next/';
const output=process.env.QA_OUTPUT||fs.mkdtempSync('/tmp/67park-grass-');
const mobile=process.env.MOBILE==='1';
const baseline=process.env.BASELINE==='1';
const views=[
 ['reported-notch',[239,12.3,132],[235.3,9.4,129.2]],
 ['reported-notch-reverse',[232,10.15,127.4],[235.3,9.4,129.2]],
 ['reported-notch-low',[238,9.65,127.2],[235.3,9.4,129.2]],
 ['second-step',[219.2,11.6,128.1],[221.7,9.4,130.61]],
 ['east-hatch',[247,14,136],[246,9.4,130]],
 ['east-hatch-low',[250,10.3,134],[246,9.4,130]],
 ['park-edge',[206,12,78],[202,9.4,74]],
 ['island-top',[30,565,-19.99],[30,9,-20]],
];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const executablePath=process.env.CHROME_PATH||(process.platform==='darwin'&&fs.existsSync(mac)?mac:undefined);
 const browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true});
 const errors=[];
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  if(baseline)await page.route('**/app/grass-boundary.js?*',route=>route.fulfill({contentType:'text/javascript',body:'export function applyGrassBoundary(){return {version:0};}'}));
  await page.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
  });
  await page.goto(base+'?v=grass-boundary-qa',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body,null,{timeout:180000});
  const scene=await page.evaluate(()=>{
   const w=__islandWorld,rows=[];
   w.scene.updateMatrixWorld(true);
   w.scene.traverseVisible(m=>{
    if(!m.isMesh||m.material?.visible===false||m.material?.opacity===0||m.userData.parkPond65CollisionOnly||/DIK_YAN_GOLGE|COLLIDER/.test(m.name))return;
    const materials=Array.isArray(m.material)?m.material:[m.material];
    if(!materials.some(a=>/CIM|GRASS|TURF/i.test(a?.name||''))&&!/^(?:[3456789]_|67D_(?:PARK_WATER|REF_MINI_SKATE)|CENTER_WHITE)/.test(m.name))return;
    const g=m.geometry;
    rows.push({name:m.name,p:Array.from(g.attributes.position.array),n:Array.from(g.attributes.normal?.array||[]),ix:g.index?Array.from(g.index.array):null,matrix:m.matrixWorld.toArray(),material:materials.map(a=>[a?.name,a?.color?.getHexString()]),groups:g.groups});
   });
   return {meshes:rows,patch:w.terrain.userData.grassBoundary1,frame:w.renderer.info.render.frame,resources:{...w.renderer.info.memory}};
  });
  if(process.env.EXPORT_GEOMETRY!=='0')fs.writeFileSync(path.join(output,'geometry.json'),JSON.stringify(scene));
  await page.evaluate(()=>{
   const w=__islandWorld,before=w.scene.onBeforeRender;
   w.scene.onBeforeRender=function(...args){before?.apply(this,args);const v=window.__grassView;if(v){w.camera.position.fromArray(v.p);w.camera.lookAt(...v.t);w.camera.updateMatrixWorld(true);}};
  });
  for(const [name,p,t]of views){
   await page.evaluate(({p,t})=>{window.__grassView={p,t};},{p,t});
   await page.waitForTimeout(350);await page.screenshot({path:path.join(output,name+'.png')});
  }
  assert(await page.evaluate(f=>__islandWorld.renderer.info.render.frame>f,scene.frame),'Rendering stopped');
  if(!baseline){
   assert.equal(scene.patch?.version,1);assert.equal(scene.patch.repairedSteps,2);
   const probes=await page.evaluate(()=>{
    const w=__islandWorld;let count=0;const gaps=[];
    for(let x=220.98;x<239.28;x+=.04)for(let z=128.97;z<130.64;z+=.04){
     const y=w.ground(x,z);count++;if(y==null||y<9.375)gaps.push([x,z,y]);
    }
    return {count,gaps:gaps.slice(0,10)};
   });
   assert.deepEqual(probes.gaps,[],'Sand gap on the repaired walking boundary');
   await page.evaluate(()=>{window.__grassView=null;__tp([233,9.97,129.35]);});
   await page.waitForTimeout(300);const start=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
   if(mobile){
    const stick=page.locator('.park-stick:not(.park-steering)').first(),b=await stick.boundingBox();assert(b,'Mobile joystick missing');
    const touch=await page.context().newCDPSession(page),x=b.x+b.width/2,y=b.y+b.height/2;
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-40}]});
    await page.waitForTimeout(700);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
   }else{await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');}
   const end=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
   scene.movement=Math.hypot(end.x-start.x,end.z-start.z);assert(scene.movement>1,'Walking stopped after the map repair');
   scene.probes=probes.count;
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});
   await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
   await page.waitForFunction(()=>window.__islandWorld?.terrain?.userData.grassBoundary1?.version===1,null,{timeout:180000});
  }
  assert.deepEqual(errors,[]);
  const report={output,mobile,baseline,meshes:scene.meshes.length,patch:scene.patch,resources:scene.resources,probes:scene.probes,movement:scene.movement,reload:!baseline,errors};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
