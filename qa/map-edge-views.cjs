// Local visual-survey evidence only. It never starts a server or uses a public URL.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');

const base='http://127.0.0.1:8499/67park-foundation-next/';
const output=process.env.QA_OUTPUT||'.qa-results/map-edge-multiview';
const logFile=process.env.MAP_EDGE_LOG||'.qa-results/map-edge-all.log';
const baseline=process.env.BASELINE==='1';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function dividerComponents(){
 const rows=fs.readFileSync(logFile,'utf8').split(/\r?\n/).flatMap(line=>{
  if(!line.startsWith('COMPONENT '))return [];
  try{return [JSON.parse(line.slice('COMPONENT '.length))];}catch{return [];}
 }).filter(row=>row.mesh==='8_REF_AYIRICI'&&Array.isArray(row.bounds)&&row.bounds.length===4&&row.bounds.every(Number.isFinite));
 assert.equal(rows.length,10,'map-edge log must provide ten divider component bounds');
 return rows;
}

function dividerView(row,index){
 const [minX,minZ,maxX,maxZ]=row.bounds,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 const width=maxX-minX,depth=maxZ-minZ;
 const prefix=`divider-${String(index+1).padStart(2,'0')}`;
 // Look along each open divider corridor from both sides of its entrance.
 // Perpendicular offsets of 11 m put the camera inside neighboring houses.
 if(width>=depth&&depth<2)return [-1,1].map(side=>({name:prefix+(side<0?'-left':'-right'),p:[minX-4,11.6,cz+side*2.2],t:[minX+7,9.4,cz],bounds:row.bounds}));
 if(depth>=width&&width<2)return [-1,1].map(side=>({name:prefix+(side<0?'-left':'-right'),p:[cx+side*2.2,11.6,minZ-4],t:[cx,9.4,minZ+7],bounds:row.bounds}));
 return [-1,1].map(side=>({name:prefix+(side<0?'-left':'-right'),p:[minX-3,11.6,maxZ+side*2],t:[cx,9.4,cz],bounds:row.bounds}));
}

function views(){
 const regional=[];
 // Overlapping footprints: do not leave unseen strips between aerial tiles.
 for(const x of [-140,40,220])for(const z of [-205,-100,-40,60,140])regional.push({name:`aerial-x${x}-z${z}`,p:[x,145,z],t:[x,9.4,z]});
 const closeRegions=[
  ['north-coast',-48,-239,0,-1],['north-pool',-81,-183,0,1],
  ['northwest-track',-145,-172,0,1],['north-housing',62,-231,0,-1],
  ['west-sports',-111,-75,-1,0],['fairground',236,-119,1,0],
  ['marina',242,-151,1,0],['stadium',213,-22,1,0],
  ['park-entry',125,46,-1,0],['park-bowl',150,80,0,1],
  ['park-pond',169,92,0,1],['park-bridge',192,71,1,0],
  ['west-island',-162,19,-1,0],['south-coast',105,161,0,1]
 ].flatMap(([name,x,z,dx,dz])=>[-1,1].map(side=>({
  name:'close-'+name+(side<0?'-left':'-right'),
  p:[x+dx*8-dz*side*3,12.5,z+dz*8+dx*side*3],t:[x,9.38,z]
 })));
 return [
  {name:'whole-map',p:[35,600,-38],t:[35,9.4,-38]},
  ...regional,
  ...closeRegions,
  ...dividerComponents().flatMap(dividerView),
  {name:'west-coast',p:[-167,22,25],t:[-145,9.4,25]},
  {name:'south-coast',p:[30,24,168],t:[30,9.4,140]},
  {name:'center-white-sw',p:[8,18,-88],t:[21,9.4,-56]},
  {name:'center-white-nw',p:[8,18,20],t:[21,9.4,-8]},
  {name:'center-white-se',p:[116,18,-88],t:[77,9.4,-56]},
  {name:'center-white-ne',p:[116,18,20],t:[77,9.4,-8]},
  {name:'sw-short-road-coast-join',p:[-25,17,160],t:[-11,9.4,145]},
  {name:'reported-west-gap',p:[-171,11.3,63],t:[-164,9.4,63]},
  {name:'reported-divider',p:[-159,12.5,61],t:[-144.5,9.5,58]},
  {name:'reported-plaza-tooth',p:[36.5,12,-31],t:[39.35,9.32,-35.48]},
  {name:'plaza-tooth-opposite',p:[62,12,-31],t:[59.4,9.32,-35.48]},
  {name:'west-grass-road-join',p:[-132,12.7,85],t:[-139,9.38,84]},
  {name:'reported-curb-fillet',p:[-18,11.3,146],t:[-14,9.38,141.85]},
  {name:'reported-curb-fillet-reverse',p:[-10,11.5,138.5],t:[-14,9.38,141.85]}
 ];
}

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch(browserLaunchOptions());
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  if(baseline)await page.route('**/app/map-edge-finish.js?*',r=>r.fulfill({contentType:'text/javascript',body:'export function applyMapEdgeFinish(){return {version:0};}'}));
  page.on('pageerror',()=>errors.push('pageerror'));
  page.on('console',message=>{if(message.type()==='error')errors.push('console-error');});
  await page.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
  });
  await page.goto(base+'?v=map-edge-views',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:180000});
  await assertBrowserRenderer(page);
  const start=await page.evaluate(()=>{
   const world=__islandWorld,before=world.scene.onBeforeRender;
   window.__mapEdgeContextLosses=0;world.renderer.domElement.addEventListener('webglcontextlost',()=>window.__mapEdgeContextLosses++);
   world.scene.onBeforeRender=function(...args){
    before?.apply(this,args);const view=window.__mapEdgeView;
    if(view){world.camera.position.fromArray(view.p);world.camera.lookAt(...view.t);world.camera.updateMatrixWorld(true);}
   };
   return {frame:world.renderer.info.render.frame,resources:{...world.renderer.info.memory}};
  });
  const captured=[];
  for(const view of views().filter(view=>!process.env.QA_VIEW_FILTER||new RegExp(process.env.QA_VIEW_FILTER).test(view.name))){
   await page.evaluate(view=>{window.__mapEdgeView=view;},view);
   await pause(350);
   await page.screenshot({path:path.join(output,view.name+'.png')});
   captured.push({name:view.name,p:view.p,t:view.t,bounds:view.bounds});
  }
  const finish=await page.evaluate(()=>({
   frame:__islandWorld.renderer.info.render.frame,
   resources:{...__islandWorld.renderer.info.memory},
   candyErrors:[...(window.__candyErrors||[])],
   muted:localStorage.getItem('67park-feel-lab-muted'),
   profile:JSON.parse(localStorage.getItem('67park-feel-lab.player-profile.v1')||'null')
   ,patch:JSON.parse(__islandWorld.renderer.domElement.dataset.mapEdgeFinish1||'null'),contextLosses:window.__mapEdgeContextLosses
  }));
  assert(finish.frame>start.frame,'rendering stopped during map survey');
  assert.equal(finish.muted,'1');assert.equal(finish.profile?.base,'goril');
  assert.equal(finish.contextLosses,0);assert.equal(finish.patch?.version,baseline?0:1);
  assert.deepEqual(errors,[]);assert.deepEqual(finish.candyErrors,[]);
  const report={base,output,baseline,patch:finish.patch,contextLosses:finish.contextLosses,views:captured,frames:{start:start.frame,finish:finish.frame},resources:{start:start.resources,finish:finish.resources},errors};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log('MAP_EDGE_VIEWS_PASS',JSON.stringify({output,shots:captured.length,frames:finish.frame-start.frame}));
 }finally{await browser.close();}
})().catch(e=>{console.error('MAP_EDGE_VIEWS_FAIL',e);process.exitCode=1;});
