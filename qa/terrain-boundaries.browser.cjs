const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const output=process.env.QA_OUTPUT||fs.mkdtempSync('/tmp/67park-boundaries-');
const mobile=process.env.MOBILE==='1';
const views=[
 ['fountain',[38,13,-20],[49.372,9.5,-32.327]],
 ['fountain-close',[43.9,10.2,-26.8],[45.15,9.35,-28.1]],
 ['central-slot',[54,10.4,-22],[56.78,9.25,-24.92]],
 ['central-straight',[55,10.2,-44],[52.45,9.24,-45]],
 ['park-east-notch',[206,13,75],[202.45,9.45,74.1]],
 ['park-east-inner',[195,12,77],[198.65,9.44,78.6]],
 ['park-west-entry',[126,13,66],[124,9.46,63.4]],
 ['curb-corner',[36.2,9.9,127.6],[35.66616,9.23,127.02506]],
 ['parcel-edge',[-14,10.4,-19],[-16.257845,9.227,-20.66879]],
 ['east-grass',[237.8,10.2,130.8],[236.19684,9.398,129.1797]],
 ['bridge-grass',[181.2,11,64.3],[183.43052,9.398,62.49336]],
 ['park-top',[159,104,76.01],[159,9.3,76]],
 ['plaza-top',[49,151,70.01],[49,9.4,70]],
 ['central-top',[49,81,-32.32],[49,9.2,-32.327]],
 ['map',[30,560,-19.99],[30,9,-20]],
];
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[];
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
  await page.goto(base+'?v=terrain-boundaries-qa',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body,null,{timeout:180000});
  const result=await page.evaluate(async()=>{
   const T=await import('three'),w=__islandWorld,rows=[];
   w.scene.updateMatrixWorld(true);
   w.scene.traverseVisible(m=>{
    if(!m.isMesh||m.material?.visible===false||m.material?.opacity===0||m.userData.parkPond65CollisionOnly||/DIK_YAN_GOLGE|COLLIDER/.test(m.name))return;
    if(!/^(?:[3456789]_|67D_(?:CENTER|REF_MINI_SKATE)|CENTER_WHITE|PLAZA83_WALKABLE)/.test(m.name))return;
    const g=m.geometry,b=new T.Box3().setFromObject(m);
    rows.push({name:m.name,p:Array.from(g.attributes.position.array),n:Array.from(g.attributes.normal?.array||[]),ix:g.index?Array.from(g.index.array):null,matrix:m.matrixWorld.toArray(),bounds:[b.min.toArray(),b.max.toArray()],material:[m.material?.name,m.material?.color?.getHexString()],groups:g.groups});
   });
   return {meshes:rows,seams:w.terrain.userData.terrainSeams1,patch:w.terrain.userData.terrainBoundaries2,frame:w.renderer.info.render.frame};
  });
  if(process.env.EXPORT_GEOMETRY!=='0')fs.writeFileSync(path.join(output,'geometry.json'),JSON.stringify(result));
  const survey=JSON.parse(fs.readFileSync(path.join(__dirname,'terrain-gap-survey-2.json'),'utf8')).gaps;
  const gaps=await page.evaluate(async survey=>{
   const T=await import('three'),w=__islandWorld,targets=[];
   w.scene.traverseVisible(m=>{if(m.isMesh&&m.material?.visible!==false&&m.material?.opacity!==0&&!m.userData.parkPond65CollisionOnly&&!/DIK_YAN_GOLGE|COLLIDER/.test(m.name)&&/^(?:[3456789]_|CENTER_WHITE)/.test(m.name))targets.push(m)});
   return survey.map(row=>{const [x,z]=row.at,hit=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)).intersectObjects(targets,false)[0];return {at:row.at,name:hit?.object.name,y:hit?.point.y}}).filter(hit=>!hit.name||hit.name.startsWith('4_')||hit.y<9.2);
  },survey);
  assert.deepEqual(gaps,[],'Verified sand gaps remain in rendered scene');
  await page.evaluate(()=>{const w=__islandWorld;w.scene.fog.near=1000;w.scene.fog.far=2000;const before=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){before?.apply(this,args);const v=window.__boundaryView;if(v){w.camera.position.fromArray(v.p);w.camera.lookAt(...v.t);w.camera.updateMatrixWorld(true);}};});
  for(const [name,p,t]of views){
   await page.evaluate(({p,t})=>{__tp([t[0]+8,__islandWorld.ground(t[0]+8,t[2])+1,t[2]]);window.__boundaryView={p,t};},{p,t});
   await page.waitForTimeout(300);
   await page.screenshot({path:path.join(output,name+'.png')});
  }
  assert(await page.evaluate(f=>__islandWorld.renderer.info.render.frame>f,result.frame));
  // Exercise actual movement, then reload the returning profile. Geometry
  // snapshots alone do not establish that the input/render loop still works.
  await page.evaluate(()=>{window.__boundaryView=null;__tp([200,10.3,88])});
  await page.waitForTimeout(300);const start=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
  if(mobile){
   const stick=page.locator('.park-stick:not(.park-steering)').first(),b=await stick.boundingBox();assert(b,'Mobile joystick missing');
   const touch=await page.context().newCDPSession(page),x=b.x+b.width/2,y=b.y+b.height/2;
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-40}]});
   await page.waitForTimeout(900);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  }else{await page.keyboard.down('KeyW');await page.waitForTimeout(900);await page.keyboard.up('KeyW');}
  const end=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
  assert(Math.hypot(end.x-start.x,end.z-start.z)>1,'Movement stopped after inspection');
  await page.reload({waitUntil:'domcontentloaded',timeout:120000});await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  await page.waitForFunction(()=>window.__islandWorld?.ready,null,{timeout:180000});
  assert.equal(await page.evaluate(()=>__islandWorld.terrain.userData.terrainBoundaries2?.version),2);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({output,mobile,meshes:result.meshes.length,triangleDelta:result.patch?.triangleDelta,surveyProbes:survey.length,remainingSand:gaps.length,input:mobile?'touch':'keyboard',movement:Math.hypot(end.x-start.x,end.z-start.z),reload:true,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
