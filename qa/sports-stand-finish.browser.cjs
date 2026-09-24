const {chromium}=require('playwright'),fs=require('node:fs');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const out=process.env.STANDS_EVIDENCE||'.qa-results/stands-final';
const assert=require('node:assert/strict');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());
 const report={errors:[],shots:[]};
 try{
  const context=await browser.newContext({viewport:{width:900,height:700},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'ninja67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'ninja67'}));});
  await page.goto(process.env.STANDS_URL||'http://127.0.0.1:8496/67park-foundation-next/?qa=stands-inspect',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&!document.querySelector('.wardrobe'),null,{timeout:90000});
  report.model=await page.evaluate(()=>{
   const w=__islandWorld,g=w.scene.getObjectByName('NORTHWEST_SPORTS_V97');let meta;g.traverse(o=>{if(o.userData.sports97)meta=o.userData.sports97;});
   const before=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){before?.apply(this,args);if(window.__standView){w.camera.position.fromArray(__standView.p);w.camera.lookAt(...__standView.t);w.camera.updateMatrixWorld(true);}};
   return {metadata:meta,ground:g.position.y,finish:g.userData.standFinish?.stats};
  });
  assert.equal(report.model.finish?.rails,4);assert.equal(report.model.finish?.supports,14);
  assert.equal(report.model.finish?.extraDrawCalls,0);
  await page.addStyleTag({content:'body * {visibility:hidden!important} canvas {visibility:visible!important}'});
  for(const s of report.model.metadata.stands){
   const g=report.model.ground;
   const world=(x,y,z)=>[s.x+Math.cos(s.yaw)*x+Math.sin(s.yaw)*z,g+y,s.z-Math.sin(s.yaw)*x+Math.cos(s.yaw)*z];
   for(const [name,loc,target]of [['front-corner',[s.w/2+5,4.5,8],[s.w/2-3,1.7,0]],['back-corner',[s.w/2+5,5.5,-9],[s.w/2-3,1.7,0]],['rear',[-2,4.8,-15],[0,1.8,0]]]){
    const view={p:world(...loc),t:world(...target)};await page.evaluate(v=>window.__standView=v,view);await page.waitForTimeout(500);
    const file=`${out}/${s.id}-${name}.png`;await page.screenshot({path:file});report.shots.push({file,view});console.log('SHOT',file);
   }
  }
  assert.deepEqual(report.errors,[]);
  console.log('STANDS_PASS',JSON.stringify({rails:4,supports:14,shots:report.shots.length,physicalPhone:false}));
 }finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
