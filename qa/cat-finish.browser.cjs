// Focused actual park + mobile wardrobe check, with optional staged asset routes.
const {chromium}=require('playwright');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const draft=process.env.PARK_CAT_DRAFT==='1';
const out=path.resolve('.qa-results/cat-finish-'+(draft?'draft-':'live-')+new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(out,{recursive:true});
const report={url:process.env.PARK_CAT_URL||'https://oscarbrendonn.github.io/67park-foundation-next/pet-play-preview/?pet=cat&v=cat-silver-1',draft,errors:[],requests:[],out};
(async()=>{const browser=await chromium.launch(browserLaunchOptions());
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try{
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/models/park-originals/cat.glb'))report.requests.push(r.url());});
  if(draft){
   assert(report.url.includes('/pet-play-preview/'),'Draft entry uses isolated committed preview, never the normal-game working draft');
   await page.route(report.url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('pet-play-preview/index.html')}));
   await page.route('**/app/native-character.js*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('app/native-character.js')}));
   await page.route('**/models/park-originals/cat.glb*',r=>r.fulfill({contentType:'model/gltf-binary',body:fs.readFileSync('models/park-originals/cat.glb')}));
  }
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));localStorage.setItem('67park-feel-lab-muted','1');});
  await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&document.documentElement.dataset.gameplayAvatarBase==='cat67'&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:60000});
  await page.screenshot({path:out+'/cat-park-mobile.png'});
  const result=await page.evaluate(async()=>{
   const T=await import('three'),w=__islandWorld;let root;w.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base==='cat67'&&!o.userData.claudeRemoteCharacter)root=o;});
   if(!root)throw Error('Cat avatar root missing');
   const meshes=[],materials=new Map();root.updateWorldMatrix(true,true);
   root.traverse(o=>{if(o.isMesh){meshes.push({name:o.name,visible:o.visible,bones:o.skeleton?.bones.length});for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.uuid,{name:m.name,color:m.color?.getHexString(),roughness:m.roughness,metalness:m.metalness,emissive:m.emissive?.getHexString()});}});
   const box=new T.Box3().setFromObject(root,true),center=box.getCenter(new T.Vector3()),height=box.getSize(new T.Vector3()).y,images=[];
   for(const side of [0,Math.PI/2,Math.PI]){
    const c=w.camera.clone(),offset=new T.Vector3(Math.sin(side)*height*2.8,.12*height,Math.cos(side)*height*2.8).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
    c.fov=32;c.position.copy(center).add(offset);c.lookAt(center);c.updateProjectionMatrix();c.updateMatrixWorld(true);w.renderer.render(w.scene,c);images.push(w.renderer.domElement.toDataURL('image/png'));
   }
   return {meshes,materials:[...materials.values()],images,render:{exposure:w.renderer.toneMappingExposure,environmentIntensity:w.scene.environmentIntensity},connected:!!window.__eggyNet?.connected};
  });
  result.images.forEach((data,i)=>fs.writeFileSync(out+'/cat-park-'+['front','side','back'][i]+'.png',Buffer.from(data.split(',')[1],'base64')));delete result.images;report.park=result;
  for(const m of result.materials)if(['cat_matching_body','cat_face','cat_ear_satin'].includes(m.name)){assert.equal(m.color,m.name==='cat_ear_satin'?'bcc4be':'d8dcd8');assert.equal(m.roughness,.38);assert.equal(m.emissive,'000000');}
  assert(result.meshes.filter(m=>m.bones).every(m=>m.bones===20));
  await page.getByRole('button',{name:'Profile studio',exact:true}).tap();
  await page.getByRole('button',{name:'Choose & dress up',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelector('.wardrobe-stage canvas')&&!document.querySelector('.wardrobe-model-status'));
  await page.screenshot({path:out+'/cat-studio-mobile.png'});
  assert(report.requests.some(url=>url.includes('cat.glb?v=cat-silver-1')));assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.failure=String(e);process.exitCode=1;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,pass:report.pass,errors:report.errors,failure:report.failure,requests:report.requests}));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
