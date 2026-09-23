// Focused touch portrait preview + park handoff, not the long world regression.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.PARK_FIT_URL,out=process.env.PARK_FIT_EVIDENCE;
assert(url&&out,'Explicit URL and distinct evidence directory required');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());let page;const report={url,errors:[]};
 try{
  page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('67park-feel-lab-muted','1'));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:/Cat 67/}).tap({timeout:90000});
  const ready=()=>page.waitForFunction(()=>!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
  await ready();await page.getByRole('button',{name:'Next eyewear',exact:true}).tap();await ready();
  const canvas=page.locator('.wardrobe-studio canvas');
  const none=await canvas.screenshot({path:out+'/glow-none.png'});
  await page.getByRole('button',{name:'Next glow',exact:true}).tap();await ready();
  const pink=await canvas.screenshot({path:out+'/glow-pink.png'});
  await page.screenshot({path:out+'/touch-cat-pink.png'});
  await page.getByRole('button',{name:'Next glow',exact:true}).tap();await ready();
  const mint=await canvas.screenshot({path:out+'/glow-mint.png'});
  report.difference=await page.evaluate(async({a,b,c})=>{
   async function pixels(data){const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const ctx=cv.getContext('2d');ctx.drawImage(im,0,0);return {w:cv.width,h:cv.height,d:ctx.getImageData(0,0,cv.width,cv.height).data}}
   const [x,y,z]=await Promise.all([a,b,c].map(pixels));
   function diff(p,q){let n=0,sum=0,top=q.h,bottom=0;for(let j=Math.floor(q.h*.55);j<q.h;j++)for(let i=0;i<q.w;i++){const k=(j*q.w+i)*4,d=Math.abs(p.d[k]-q.d[k])+Math.abs(p.d[k+1]-q.d[k+1])+Math.abs(p.d[k+2]-q.d[k+2]);if(d>24){n++;sum+=d;top=Math.min(top,j);bottom=Math.max(bottom,j)}}return {pixels:n,sum,top,bottom}}
   return {nonePink:diff(x,y),pinkMint:diff(y,z),width:x.w,height:x.h};
  },{a:none.toString('base64'),b:pink.toString('base64'),c:mint.toString('base64')});
  assert(report.difference.nonePink.pixels>200,'Glow visible vs none');assert(report.difference.pinkMint.pixels>200,'Glow colour visibly changes');
  await page.getByRole('button',{name:'Enter the park',exact:true}).tap();
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarBase==='cat67'&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
  report.park=await page.evaluate(()=>{let rig;__islandWorld.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base==='cat67'&&!o.userData.claudeRemoteCharacter)rig=o});return {scale:rig.scale.toArray(),height:rig.userData.parkNativeHeight,glasses:!!rig.getObjectByName('Studio_head'),head:!!rig.getObjectByName('67Park_Cat_Head'),equipment:JSON.parse(localStorage.getItem('67park-feel-lab.character.v3'))}});
  assert(report.park.head&&report.park.glasses);assert.equal(report.park.equipment.vibe,'vibe-mint');assert.equal(report.park.equipment.head,'friendsie_26:90');
  assert(Math.abs(report.park.scale[0]-1.28/.3345185926093267)<1e-6,'Actual park native scale');
  // Leave shared spawn using the actual touch joystick before viewing the Cat.
  const before=await page.evaluate(()=>__eggyInput.playerRef.body.translation());
  const cdp=await page.context().newCDPSession(page),stick=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(stick);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:stick.x+stick.width/2,y:stick.y+stick.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:stick.x+stick.width/2,y:stick.y+stick.height/2-35}]});
  try{await page.waitForFunction(start=>{const p=__eggyInput.playerRef.body.translation();return Math.hypot(p.x-start.x,p.z-start.z)>4},before,{timeout:15000})}
  finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
  // Only change the QA view, never the avatar pose or production camera code.
  await page.evaluate(async()=>{const T=await import('three'),w=__islandWorld,previous=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){previous?.apply(this,args);const p=__eggyInput.playerRef.body.translation();let rig;w.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base==='cat67'&&!o.userData.claudeRemoteCharacter)rig=o});if(!rig)return;const d=new T.Vector3(0,0,1).applyQuaternion(rig.getWorldQuaternion(new T.Quaternion()));w.camera.position.set(p.x+d.x*3.2,p.y+.9,p.z+d.z*3.2);w.camera.lookAt(p.x,p.y+.05,p.z);w.camera.updateMatrixWorld(true)}});
  await page.screenshot({path:out+'/park-cat.png'});
  assert.deepEqual(report.errors,[]);report.pass=true;console.log('CAT_FIT_GLOW_PASS',JSON.stringify(report));
 }catch(error){report.failure=String(error);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
