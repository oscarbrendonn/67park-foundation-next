const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const before='.qa-results/crack-audit-682fa42-20260924';
const out=process.env.PARK_JOINT_OUT||'.qa-results/map-joint-finish-1/after';
const views=JSON.parse(fs.readFileSync(before+'/focus/report.json')).views.slice(0,8).concat([
 {name:'stadium-wide',p:[239,44,29],t:[239,9.3,29]},
 {name:'fairground-top',p:[181,115,-134],t:[181,9.3,-134]},
 {name:'fairground-northeast',p:[205,13,-182],t:[201,9.3,-177]},
 {name:'fairground-southwest',p:[157,13,-86],t:[162,9.3,-91]},
 {name:'city-south-top',p:[-51,23,115],t:[-51,9.3,115]},
 {name:'bridge-wide',p:[-111,32,62],t:[-111,9.3,62]}
]);
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());
 const report={url:process.env.PARK_JOINT_URL||'http://127.0.0.1:8496/67park-foundation-next/',views:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});
  await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:120000});
  report.renderer=await assertBrowserRenderer(page);
  const holes=JSON.parse(fs.readFileSync(before+'/geometry-complete/holes.json')).holes;
  report.state=await page.evaluate(async holes=>{
   const T=await import('three'),w=__islandWorld,root=w.terrain,ray=new T.Raycaster();root.updateMatrixWorld(true);
   const visible=m=>{for(let p=m;p;p=p.parent)if(!p.visible)return false;return true;};
   const probes=holes.map((h,i)=>({i,...h})).filter(h=>h.area<.05&&h.point[0]>-125&&h.point[0]<-15&&h.point[1]>23&&h.point[1]<117||[36,37,38].includes(h.i)).map(h=>{
    ray.set(new T.Vector3(h.point[0],40,h.point[1]),new T.Vector3(0,-1,0));
    return {...h,hit:ray.intersectObjects(root.children,true).filter(h=>visible(h.object)).slice(0,1).map(h=>({name:h.object.name,p:h.point.toArray()}))[0]};
   });
   const meshes=[];root.traverse(m=>{if(m.isMesh&&/^(?:[345678]_|CENTER_WHITE)/.test(m.name))meshes.push({name:m.name,p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal?.array||[]),ix:m.geometry.index?Array.from(m.geometry.index.array):null,matrix:m.matrixWorld.toArray(),material:m.material.name,visible:m.visible})});
   const before=w.scene.onBeforeRender;w.renderer.domElement.dataset.jointAudit='1';
   const style=document.createElement('style');style.textContent='body *{visibility:hidden!important}canvas[data-joint-audit]{visibility:visible!important}.joint-label{visibility:visible!important}';document.head.append(style);
   const label=document.createElement('div');label.className='joint-label';label.style.cssText='position:fixed;left:12px;bottom:12px;z-index:999999;background:#fff9e9dd;color:#40372e;padding:6px 10px;border-radius:6px;font:16px system-ui';document.body.append(label);
   w.scene.onBeforeRender=function(...args){before?.apply(this,args);if(window.__jointView){const v=__jointView;w.camera.position.fromArray(v.p);w.camera.fov=50;w.camera.lookAt(...v.t);w.camera.updateProjectionMatrix();w.camera.updateMatrixWorld(true);label.textContent='Yerel düzeltme · '+v.name;}};
   return {probes,meshes,patch:root.userData.mapJointFinish1,dataset:{...w.renderer.domElement.dataset}};
  },holes);
  fs.writeFileSync(out+'/terrain.json',JSON.stringify({meshes:report.state.meshes}));delete report.state.meshes;
  assert.equal(report.state.patch?.version,1);assert.equal(report.state.patch.addedDrawCalls,0);
  for(const v of views){await page.evaluate(v=>window.__jointView=v,v);await page.waitForTimeout(220);await page.screenshot({path:out+'/'+v.name+'.png'});report.views.push(v);}
  assert.deepEqual(report.errors,[]);
  const missing=report.state.probes.filter(p=>!p.hit||p.hit.p[1]<9.22);report.missing=missing;
  assert.deepEqual(missing,[],'The measured upper-surface gaps must have road/curb coverage');
  report.complete=true;console.log('MAP_JOINT_CAPTURE_PASS',JSON.stringify({views:views.length,probes:report.state.probes.length,patch:report.state.patch}));
 }catch(e){report.failure=String(e);throw e;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
