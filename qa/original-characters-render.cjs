// Isolated render of the exact shipping GLBs, including animation and glasses.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const out=process.env.PARK_ORIGINAL_EVIDENCE||'.qa-results/original-characters-render';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());
try{
 const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/__qa/original-characters',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/67park-foundation-next/vendor/three.module.js","three/addons/":"/67park-foundation-next/vendor/addons/"}}</script><body style="margin:0;background:#edeae4"></body>'}));
 await page.goto('http://127.0.0.1:8496/__qa/original-characters');
 const report=await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{DRACOLoader}=await import('three/addons/loaders/DRACOLoader.js'),{RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
  const {applyGorillaStudioItems}=await import('/67park-foundation-next/app/gorilla-studio-items.js');
  const decoder=new DRACOLoader().setDecoderPath('/67park-foundation-next/vendor/addons/libs/draco/gltf/'),loader=new GLTFLoader().setDRACOLoader(decoder),donor=(await loader.loadAsync('/67park-foundation-next/models/friends/friendsie_26.glb')).scene;
  window.originalViews=[];const rows=[];
  for(const [name,base,headName] of [['cat','cat67','67Park_Cat_Head'],['ninja','ninja67','67Park_Ninja_Head']]){
   const g=await loader.loadAsync('/67park-foundation-next/models/park-originals/'+name+'.glb'),root=g.scene;
   root.updateMatrixWorld(true);const head=root.getObjectByName(headName),body=root.getObjectByName('FS_Body');
   const row={base,headParent:head.parent.name,headBounds:new T.Box3().setFromObject(head,true),bodyBounds:new T.Box3().setFromObject(body,true),clips:g.animations.map(a=>a.name),bones:body.skeleton.bones.length,nativeHeight:root.userData.parkNativeHeight};
   applyGorillaStudioItems(root,{base,head:'friendsie_26:90'},()=>donor);
   row.glasses=!!root.getObjectByName('Studio_head');root.getObjectByName('Studio_head').visible=false;
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(550,850);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.domElement.style.display='inline-block';document.body.append(renderer.domElement);
   const scene=new T.Scene();scene.background=new T.Color('#edeae4');scene.add(root);const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.025).texture;env.dispose();pmrem.dispose();
   scene.add(new T.HemisphereLight('#ffffff','#a7afa9',.65));const key=new T.DirectionalLight('#fff9f0',2);key.position.set(-3,4,5);scene.add(key);
   const camera=new T.PerspectiveCamera(32,550/850,.001,10),mixer=new T.AnimationMixer(root);
   originalViews.push({renderer,scene,camera,root,head,mixer,clips:g.animations});rows.push(row);
  }
  window.originalView=(view,close=false,glasses=false)=>originalViews.forEach(v=>{
   const a={front:0,quarter:.55,side:Math.PI/2,left:-Math.PI/2,back:Math.PI,under:.22,top:.22}[view],d=close?.43:.82,target=close?.21:.16;
   v.root.getObjectByName('Studio_head').visible=glasses;v.camera.position.set(Math.sin(a)*d,target+(view==='under'?-d*.7:view==='top'?d*.9:d*.03),Math.cos(a)*d);v.camera.lookAt(0,target,0);v.renderer.render(v.scene,v.camera);
  });
  originalView('front');decoder.dispose();return rows;
 });
 for(const view of ['front','quarter','side','left','back','under','top']){
  await page.evaluate(v=>originalView(v,true),view);await page.screenshot({path:out+'/'+view+'.png'});
 }
 await page.evaluate(()=>originalView('quarter',false));await page.screenshot({path:out+'/full.png'});
 await page.evaluate(()=>originalView('front',true,true));await page.screenshot({path:out+'/glasses.png'});
 report.poses=[];
 for(const clip of ['idle','walk','run','jump','fall','land','celebrate']){
  const poses=await page.evaluate(name=>originalViews.map(v=>{
   v.mixer.stopAllAction();const c=v.clips.find(c=>c.name===name);v.mixer.clipAction(c).reset().play();v.mixer.setTime(c.duration*.4);v.root.updateMatrixWorld(true);
   const matrix=v.head.matrixWorld.elements;return {clip:name,head:matrix.slice(12,15),finite:matrix.every(Number.isFinite)};
  }),clip);assert(poses.every(p=>p.finite));report.poses.push(poses);
  await page.evaluate(()=>originalView('quarter',false));await page.screenshot({path:out+'/pose-'+clip+'.png'});
 }
 for(const r of report){assert.equal(r.headParent,'Head');assert.equal(r.bones,20);assert(r.glasses);assert.equal(r.clips.length,7);assert.equal(r.nativeHeight,.3345185926093267);}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({models:report,poses:report.poses,errors},null,2));console.log('ORIGINAL_RENDER_PASS',out);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
