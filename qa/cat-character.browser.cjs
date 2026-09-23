// Focused original-character entry, movement, persistence and wardrobe check.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const url=process.env.PARK_CAT_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=cat-character-1';
const out=process.env.PARK_CAT_EVIDENCE||'.qa-results/cat-character-integration-2';
const key='67park-feel-lab.character.v3';
const equip={base:'cat67',body:null,head:null,sprout:null,back:null,kicks:null,held:null,power:null,vibe:null};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,profiles:[]};
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,equip})=>{if(!sessionStorage.getItem('cat-fixture')){localStorage.setItem(key,JSON.stringify(equip));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:equip.base}));sessionStorage.setItem('cat-fixture','1')}localStorage.setItem('67park-feel-lab-muted','1')},{key,equip});
  const ready=()=>page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready'&&document.documentElement.dataset.gameplayAvatarBase==='cat67',null,{timeout:90000});
  const click=l=>mobile?l.tap():l.click();
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await ready();
   const renderer=await assertBrowserRenderer(page);
   const inspect=()=>page.evaluate(()=>{
    const heads=[];__islandWorld.scene.traverse(o=>{if(o.name==='67Park_Cat_Head')heads.push(o)});
    const head=heads.find(o=>{for(let p=o;p;p=p.parent)if(p.userData.claudeGorillaAnimation?.base==='cat67')return true});
    if(!head)throw Error('Actual local cat head is missing');
    let rig=head;while(rig&&!rig.userData.claudeGorillaAnimation)rig=rig.parent;
    const meshes=[];rig.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,visible:o.visible,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3})});
    return {meshes,headBones:head.skeleton.bones.length,animation:{...rig.userData.claudeGorillaAnimation},equipment:JSON.parse(localStorage.getItem('67park-feel-lab.character.v3')),position:__eggyInput.playerRef.body.translation()};
   });
   await page.waitForFunction(()=>{let ready=false;__islandWorld.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base==='cat67'&&o.userData.claudeGorillaAnimation.ready)ready=true});return ready},null,{timeout:30000});
   const original=await inspect();assert.equal(original.headBones,20);assert.equal(original.meshes.length,4);assert(original.meshes.every(m=>m.visible));assert.equal(original.meshes.reduce((n,m)=>n+m.triangles,0),20912);
   // Leave the shared spawn so another connected guest cannot obscure our cat.
   if(await page.evaluate(()=>__candy.state().board)){
    if(mobile)await click(page.getByRole('button',{name:'Walk',exact:true}));else await page.keyboard.press('KeyV');
    await page.waitForFunction(()=>!__candy.state().board);
   }
   const before=(await inspect()).position;
   let cdp;
   if(mobile){
    cdp=await context.newCDPSession(page);const b=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(b);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2-35}]});
   }else await page.keyboard.down('KeyW');
   try{await page.waitForFunction(start=>{const p=__eggyInput.playerRef.body.translation();return Math.hypot(p.x-start.x,p.z-start.z)>4},before,{timeout:15000});}
   finally{if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');}
   const moving=await inspect();assert(moving.animation.active,'Cat must use the shared native movement runtime');
   await page.evaluate(()=>{window.__catJumpClips=[];window.__catSample=true;const tick=()=>{if(!window.__catSample)return;__islandWorld.scene.traverse(o=>{const s=o.userData.claudeGorillaAnimation;if(s?.base==='cat67'&&!o.userData.claudeRemoteCharacter)__catJumpClips.push(s.clip)});requestAnimationFrame(tick)};tick()});
   if(mobile)await click(page.getByRole('button',{name:'Jump',exact:true}));else await page.keyboard.press('Space');
   await page.waitForFunction(()=>__catJumpClips.includes('jump'),null,{timeout:5000});
   await page.waitForFunction(()=>{let landed=false;__islandWorld.scene.traverse(o=>{const s=o.userData.claudeGorillaAnimation;if(s?.base==='cat67'&&s.clip==='idle')landed=true});return landed&&Math.abs(__eggyInput.playerRef.body.linvel().y)<.2},null,{timeout:8000});
   const jumpClips=await page.evaluate(()=>{window.__catSample=false;return [...new Set(__catJumpClips)]});
   // Close, front-facing QA view of the actual animated park avatar, not a mockup.
   await page.evaluate(async()=>{const T=await import('three'),w=__islandWorld,previous=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...args){previous?.apply(this,args);if(!window.__catFront)return;const p=__eggyInput.playerRef.body.translation();let rig;w.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base==='cat67'&&!o.userData.claudeRemoteCharacter)rig=o});if(!rig)return;const d=new T.Vector3(0,0,1).applyQuaternion(rig.getWorldQuaternion(new T.Quaternion()));w.camera.position.set(p.x+d.x*3.2,p.y+1.05,p.z+d.z*3.2);w.camera.lookAt(p.x,p.y+.3,p.z);w.camera.updateMatrixWorld(true)};window.__catFront=true});
   await page.screenshot({path:out+'/'+(mobile?'touch':'desktop')+'-park.png'});
   await click(page.getByRole('button',{name:'Profile studio',exact:true}));
   await click(page.getByRole('button',{name:'Choose & dress up',exact:true}));
   await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   await click(page.getByRole('button',{name:'‹ Characters',exact:true}));
   const names=await page.locator('.wardrobe-options').innerText();assert(names.includes('Cat 67'));assert(names.includes('Gorilla 67'));assert(!names.includes('Buddy #'));
   await page.screenshot({path:out+'/'+(mobile?'touch':'desktop')+'-roster.png'});
   await click(page.getByRole('button',{name:/Gorilla 67/}));
   await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarBase==='goril'&&document.documentElement.dataset.gameplayAvatarState==='ready');
   // Choosing a card directly opens its editor.
   await click(page.getByRole('button',{name:'‹ Characters',exact:true}));
   await click(page.getByRole('button',{name:/Cat 67/}));await ready();
   for(const name of ['outfit','shoes','back','headwear','eyewear'])await click(page.getByRole('button',{name:'Next '+name,exact:true}));
   await page.waitForFunction(()=>document.documentElement.dataset.gameplayAvatarState==='ready'&&!document.querySelector('.wardrobe-model-status'),null,{timeout:60000});
   await page.screenshot({path:out+'/'+(mobile?'touch':'desktop')+'-clothes.png'});
   await click(page.getByRole('button',{name:'Enter the park',exact:true}));await ready();
   const dressed=await inspect();assert.equal(dressed.equipment.base,'cat67');assert.equal(dressed.meshes.filter(m=>m.name.startsWith('Studio_')).length,5);
   for(const name of ['Goril_El_L','Goril_El_R'])assert(dressed.meshes.find(m=>m.name===name)?.visible);
   await click(page.getByRole('button',{name:'Party settings',exact:true}));
   await page.getByRole('combobox',{name:'Graphics quality',exact:true}).selectOption('low');
   await click(page.getByRole('button',{name:'Close settings',exact:true}));
   await page.waitForFunction(()=>JSON.parse(__islandWorld.renderer.domElement.dataset.parkGraphics).level==='low');
   assert((await inspect()).meshes.filter(m=>m.visible).length===8);
   await page.screenshot({path:out+'/'+(mobile?'touch':'desktop')+'-low-park.png'});
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});await ready();
   assert.deepEqual((await inspect()).equipment,dressed.equipment);
   assert.deepEqual(errors,[]);report.profiles.push({mobile,renderer,original,moving,jumpClips,dressed,errors});console.log('CAT_CHARACTER_PASS',JSON.stringify({mobile,meshes:original.meshes.length,clothes:5,jumpClips,errors:0}));
  }catch(error){report.failure={mobile,message:String(error),errors};await page.screenshot({path:out+'/'+(mobile?'touch':'desktop')+'-failure.png'}).catch(()=>{});throw error;}
  finally{await context.close();}
 }}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
