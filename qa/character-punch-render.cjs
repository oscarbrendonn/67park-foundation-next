// Isolated exact-GLB render: shared body sizing, fitted outfit and attack poses.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const out=process.env.CHARACTER_PUNCH_RENDER||'.qa-results/character-punch-render';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());const report={errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1200,height:700}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/__qa/character-punch',r=>r.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/67park-foundation-next/vendor/three.module.js","three/addons/":"/67park-foundation-next/vendor/addons/"}}</script><body style="margin:0;background:#edeae4;display:flex"></body>'}));
 await page.goto('http://127.0.0.1:8496/__qa/character-punch');
 report.models=await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{DRACOLoader}=await import('three/addons/loaders/DRACOLoader.js'),{RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
  const {applyGorillaStudioItems}=await import('/67park-foundation-next/app/gorilla-studio-items.js'),{createClaudeGorillaAnimation}=await import('/67park-foundation-next/app/claude-gorilla-animation.js'),{createPunchBurst}=await import('/67park-foundation-next/app/punch-burst.js');
  const decoder=new DRACOLoader().setDecoderPath('/67park-foundation-next/vendor/addons/libs/draco/gltf/'),loader=new GLTFLoader().setDRACOLoader(decoder),donors={};
  for(const id of ['friendsie_2','friendsie_26','friendsie_8'])donors[id+'.glb']=(await loader.loadAsync('/67park-foundation-next/models/friends/'+id+'.glb')).scene;
  window.views=[];const rows=[];
  for(const [base,file,headName] of [['goril','goril-motion-v3.glb','GORIL_KAFA'],['cat67','park-originals/cat.glb','67Park_Cat_Head'],['ninja67','park-originals/ninja.glb','67Park_Ninja_Head']]){
   const g=await loader.loadAsync('/67park-foundation-next/models/'+file),root=g.scene;
   for(const n of ['TAC','CICEK']){const o=root.getObjectByName(n);if(o)o.visible=false;}
   root.updateMatrixWorld(true);const head=root.getObjectByName(headName),body=root.getObjectByName('FS_Body'),bounds=o=>{const b=new T.Box3().setFromObject(o,true);return {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()}};
   const row={base,head:bounds(head),body:bounds(body),bones:body.skeleton.bones.map(b=>({name:b.name,matrix:b.matrixWorld.toArray()}))};
   applyGorillaStudioItems(root,{base,head:'friendsie_26:90',body:'friendsie_2:2',sprout:'friendsie_8:90'},id=>donors[id]);
   row.outfit=!!root.getObjectByName('Studio_body');row.glasses=bounds(root.getObjectByName('Studio_head'));row.hat=!!root.getObjectByName('Studio_sprout');
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(400,700);renderer.toneMapping=T.ACESFilmicToneMapping;
   const panel=document.createElement('div');panel.innerHTML='<div style="position:absolute;padding:18px;font:20px system-ui">'+base+'</div>';panel.append(renderer.domElement);document.body.append(panel);
   const scene=new T.Scene();scene.background=new T.Color('#edeae4');scene.add(root);const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.025).texture;env.dispose();pmrem.dispose();
   scene.add(new T.HemisphereLight('#fff','#a7afa9',.65));const key=new T.DirectionalLight('#fff9f0',2);key.position.set(-3,4,5);scene.add(key);
   const camera=new T.PerspectiveCamera(32,400/700,.001,10),mixer=new T.AnimationMixer(root),actions={};
   const controller=createClaudeGorillaAnimation({model:root,mixer,actions,base});if(!await controller.ready)throw Error(controller.stats.error);
   const effect=createPunchBurst(scene);effect.mesh.scale.setScalar(.1);
   views.push({renderer,scene,camera,root,mixer,controller,head,base,effect});rows.push(row);
  }
  window.renderPose=(time,angle=.55,equipped=true)=>views.map(v=>{
   v.controller.reset();v.mixer.setTime(0);const state={enabled:true,grounded:true,speed:0,punchT:0};v.controller.update(state);v.mixer.update(.3);
   if(time>0){state.punchT=.46;v.controller.update(state);v.mixer.update(time);}
   for(const name of ['Studio_head','Studio_body','Studio_sprout'])v.root.getObjectByName(name).visible=equipped;
   v.root.getObjectByName('FS_Body').visible=!equipped;
   v.camera.position.set(Math.sin(angle)*.73,.2,Math.cos(angle)*.73);v.camera.lookAt(0,.16,0);v.camera.updateMatrixWorld(true);
   v.root.updateMatrixWorld(true);v.renderer.render(v.scene,v.camera);
   return {base:v.base,profile:v.controller.stats.punchProfile,action:v.controller.stats.action,head:v.head.matrixWorld.toArray(),hand:v.root.getObjectByName('HandR').getWorldPosition(new T.Vector3()).toArray()};
  });
  renderPose(0);decoder.dispose();return rows;
 });
 const baseline=report.models[0];for(const row of report.models){
  assert(row.outfit&&row.hat);for(let i=0;i<3;i++)assert(Math.abs(row.body.size[i]-baseline.body.size[i])<.00002,'shared body size');
  assert.equal(row.bones.length,20);for(let i=0;i<20;i++)for(let j=0;j<16;j++)assert(Math.abs(row.bones[i].matrix[j]-baseline.bones[i].matrix[j])<.00002,'shared rig mounting');
 }
 report.poses=[];
 for(const equipped of [false,true])for(const [label,t] of [['idle',0],['impact',.14],['follow',.27],['end',.46]]){
  report.poses.push(await page.evaluate(({t,equipped})=>renderPose(t,.55,equipped),{t,equipped}));
  await page.screenshot({path:out+'/'+(equipped?'outfit':'plain')+'-'+label+'.png'});
 }
 for(const angle of [0,Math.PI/2,-Math.PI/2,Math.PI]){await page.evaluate(a=>renderPose(.14,a,true),angle);await page.screenshot({path:out+'/outfit-angle-'+angle.toFixed(2)+'.png'});}
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('CHARACTER_PUNCH_RENDER_PASS',JSON.stringify(report.models.map(r=>({base:r.base,head:r.head.size,body:r.body.size}))));
}catch(e){report.failure=String(e);throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
