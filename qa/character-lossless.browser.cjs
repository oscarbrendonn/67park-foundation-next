// Render original release and packed GLBs in the same renderer, pose and light.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const root='http://127.0.0.1:8496/67park-foundation-next/',out='.qa-results/character-lossless';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:700,height:700}});const report={comparisons:[],errors:[]};
try{
 page.on('pageerror',e=>report.errors.push(String(e)));
 const map=fs.readFileSync('index.html','utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
 await page.route('**/qa/lossless-harness',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head>'+map+'</head><body style="margin:0"></body></html>'}));
 for(const name of ['cat','ninja'])await page.route('**/qa/baseline-'+name+'.glb',r=>r.fulfill({contentType:'model/gltf-binary',body:execFileSync('git',['show','eb636e2ff5bd1d485716eb69d619d6c266b92869:models/park-originals/'+name+'.glb'])}));
 await page.goto(root+'qa/lossless-harness');
 for(const name of ['cat','ninja']){
  const row=await page.evaluate(async({root,name})=>{
   const T=await import('three'),{loadCharacterAsset}=await import('/67park-foundation-next/app/character-assets.js?v=entry-light-1');
   const old=await loadCharacterAsset(root+'qa/baseline-'+name+'.glb'),next=await loadCharacterAsset(root+'models/park-originals/'+name+'.glb?v=lossless-2');
   const scene=new T.Scene();scene.background=new T.Color('#f6ece5');scene.add(new T.HemisphereLight('#ffffff','#a09080',3));const light=new T.DirectionalLight('#fff5df',3);light.position.set(2,3,5);scene.add(light);
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(700,700);renderer.setPixelRatio(1);renderer.setClearColor('#f6ece5');renderer.toneMapping=T.ACESFilmicToneMapping;document.body.replaceChildren(renderer.domElement);
   const camera=new T.PerspectiveCamera(35,1,.001,10),bounds=new T.Box3().setFromObject(next.scene),center=bounds.getCenter(new T.Vector3()),height=bounds.getSize(new T.Vector3()).y;
   const draw=(g,angle,clip)=>{
    scene.add(g.scene);const mixer=new T.AnimationMixer(g.scene);if(clip){mixer.clipAction(g.animations.find(a=>a.name===clip)).play();mixer.update(.27);}
    camera.position.copy(center).add(new T.Vector3(Math.sin(angle)*height*2.25,height*.2,Math.cos(angle)*height*2.25));camera.lookAt(center);renderer.render(scene,camera);
    const gl=renderer.getContext(),pixels=new Uint8Array(700*700*4);gl.readPixels(0,0,700,700,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    mixer.stopAllAction();mixer.uncacheRoot(g.scene);scene.remove(g.scene);return pixels;
   };
   const checks=[];for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2])for(const clip of [null,'idle','walk','run','jump','fall','land','celebrate']){
    const a=draw(old,angle,clip),b=draw(next,angle,clip);let differences=0,max=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){differences++;max=Math.max(max,Math.abs(a[i]-b[i]));}
    checks.push({angle,clip,differences,max});
   }
   draw(next,0,null);window.disposeTestRenderer=()=>{renderer.dispose();renderer.forceContextLoss();};return {name,checks,clips:next.animations.map(a=>a.name)};
  },{root,name});
  report.comparisons.push(row);await page.screenshot({path:out+'/'+name+'.png'});assert(row.checks.every(c=>c.differences===0),name+' rendering differs');await page.evaluate(()=>disposeTestRenderer());
  console.log('LOSSLESS_RENDER_PASS',name,row.checks.length,'views/poses pixel-identical');
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e);throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
