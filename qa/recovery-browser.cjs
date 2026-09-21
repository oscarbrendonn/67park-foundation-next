const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const port=Number(process.env.PARK_RECOVERY_PORT||8512),origin='http://127.0.0.1:'+port,base=origin+'/67park-foundation-next/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let server,browser;
async function main(){
 fs.mkdirSync('.qa-results',{recursive:true});
 server=spawn(process.execPath,['qa/regression-server.mjs'],{env:{...process.env,PARK_QA_PORT:String(port)},stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Recovery QA server timed out')),60000);server.stdout.on('data',b=>{if(String(b).includes('REGRESSION_READY')){clearTimeout(timer);resolve()}});server.once('exit',()=>reject(Error('Recovery QA server stopped')))});
 browser=await chromium.launch(browserLaunchOptions());
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await context.addInitScript(()=>{
  localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');
  localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
 });
 const page=await context.newPage(),errors=[];let friend,releaseLateRecovery;
 page.on('pageerror',e=>errors.push(String(e)));
 const roomEvents=[];
 page.on('framenavigated',frame=>{if(frame===page.mainFrame()){roomEvents.push({at:Date.now(),direction:'navigation',path:new URL(frame.url()).pathname});if(roomEvents.length>50)roomEvents.shift();}});
 page.on('websocket',socket=>{
  socket.on('framesent',({payload})=>{try{const m=JSON.parse(String(payload));if(/^room\.|match.ready/.test(m.t)){roomEvents.push({at:Date.now(),direction:'sent',t:m.t});if(roomEvents.length>50)roomEvents.shift();}}catch{}});
  socket.on('framereceived',({payload})=>{try{const m=JSON.parse(String(payload));if(m.t==='state'){const next={direction:'received',t:m.t,status:m.room?.status??null};if(roomEvents.at(-1)?.status!==next.status){roomEvents.push({...next,at:Date.now()});if(roomEvents.length>50)roomEvents.shift();}}}catch{}});
 });
 try{
  const ready=()=>page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyNet?.connected&&window.__candyOnline?.data.connected&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  // Real HTTP contract mismatch, not an artificial DOM message.
  await page.route('**/kimi/api/session*',route=>route.fulfill({status:426,contentType:'application/json',body:JSON.stringify({code:'CLIENT_UPDATE_REQUIRED',protocol:{min:2,max:2}})}));
  await page.goto(base+'?claudeQA=passive',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('#park-connection-recovery[data-state=incompatible]').waitFor({timeout:30000});
  // Let the asynchronous wardrobe modal/inert effect settle. Clicking before
  // it mounts used to hide an inaccessible-recovery-button race.
  await page.waitForTimeout(5000);
  assert.equal(await page.locator('#park-connection-recovery').evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('67park-feel-lab.player-profile.v1')).base),'goril');
  await page.screenshot({path:'.qa-results/version-mismatch-mobile.png'});
  await page.unroute('**/kimi/api/session*');await page.getByRole('button',{name:'Reload latest version',exact:true}).click();await ready();
  console.log('RECOVERY_BROWSER_PASS incompatible version and explicit reload');
  await assertBrowserRenderer(page);
  const check=async(name,fn)=>{const before=await page.evaluate(()=>__islandWorld.renderer.info.render.frame);await fn();await page.waitForFunction(n=>__islandWorld.renderer.info.render.frame>n+2,before,{timeout:15000});console.log('PASS',name)};
  await require('./recovery-graphics.browser.cjs')(page,{mobile:true,check});
  if(process.env.PARK_SOFTWARE_RENDER==='1'){
   // The framebuffer checks above finish on Automatic (native DPR 2). Put
   // this CPU-only functional recovery fixture back on its initial REAL Low
   // setting before navigation, rather than queueing full-resolution shadow
   // work during a deliberate download failure. No timing limit is relaxed.
   await page.locator('#party-settings-btn').click();
   await page.getByRole('combobox',{name:'Graphics quality',exact:true}).selectOption('low');
   await page.getByRole('button',{name:'Close settings',exact:true}).click();
   await page.waitForFunction(()=>__islandWorld.renderer.getPixelRatio()===.8&&!__islandWorld.renderer.shadowMap.enabled);
   console.log('RECOVERY_CPU_PROFILE',await page.evaluate(()=>{const r=__islandWorld.renderer;return {dpr:r.getPixelRatio(),width:r.domElement.width,height:r.domElement.height,shadows:r.shadowMap.enabled}}));
  }
  const {onlinePeer,waitUntil}=await import('./online-fixture.mjs');
  friend=await onlinePeer(origin,{name:'Recovery QA'});
  await page.waitForFunction(id=>__eggyNet.remotes.has(id),friend.id);
  const p=await page.evaluate(()=>{const p=__eggyInput.playerRef.body.translation();return[p.x+2,p.y,p.z]});
  const motion=()=>friend.send({t:'s',p,ry:0,cm:[1,3,2,0,0,0,0,0,0]},'ws');
  const motionTimer=setInterval(motion,120);
  try{
   await page.waitForFunction(id=>__eggyNet.remotes.get(id)?.claudeMotion?.[2]===2,friend.id);
   await page.waitForFunction(id=>document.querySelector('[data-remote-name="'+id+'"]')?.closest('.park-nameplate-layer'),friend.id);
   const label=await page.locator('[data-remote-name="'+friend.id+'"]').evaluate(el=>({name:el.textContent,blur:getComputedStyle(el).backdropFilter,layer:getComputedStyle(el.closest('.park-nameplate-layer')).willChange}));
   assert.equal(label.name,'Recovery QA');assert.equal(label.blur,'none');assert.equal(label.layer,'transform');
   console.log('RECOVERY_BROWSER_PASS player name stays visible in a composited badge');
   await page.evaluate(()=>__eggyNet.ws.close());
   await page.waitForFunction(()=>!__eggyNet.connected,null,{timeout:5000});
   await page.waitForFunction(id=>__eggyNet.connected&&performance.now()-(__eggyNet.remotes.get(id)?.claudeMotionAt??-Infinity)<500,friend.id,{timeout:30000});
   assert(friend.sockets.every(ws=>ws.readyState===1));
  }finally{clearInterval(motionTimer)}
  console.log('RECOVERY_BROWSER_PASS remote motion resumes on replacement world socket');
  await page.evaluate(()=>__candyOnline.send({t:'room.create',capacity:2,mode:'balloon'}));
  await page.waitForFunction(()=>__candyOnline.data.room?.code);const code=await page.evaluate(()=>__candyOnline.data.room.code);
  friend.send({t:'room.join',code});await page.waitForFunction(()=>__candyOnline.data.room?.members.length===2);
  // The entry import may reject before the independent recovery module is
  // evaluated. Hold that module until the page's inline error ledger has the
  // failure, then prove late installation exposes Retry immediately.
  let heldRecovery=false,entryFailureAt=0;
  const lateRecovery=new Promise(resolve=>{releaseLateRecovery=resolve});
  await page.route('**/app/connection-recovery.js*',async route=>{if(!heldRecovery){heldRecovery=true;await lateRecovery;}return route.continue();});
  await page.route('**/online-match-3GT2AEG7.js*',route=>route.fulfill({status:503,body:'Isolated minigame download failure'}));
  const entryFailure=page.waitForEvent('pageerror',{predicate:error=>/Failed to fetch dynamically imported module/.test(String(error))}).then(()=>{entryFailureAt=Date.now();releaseLateRecovery();});
  // Navigation is distinct from loading: this scenario deliberately breaks
  // the entry download. Arm the commit listener BEFORE starting the room so
  // a fast navigation cannot race the acknowledgement of page.evaluate().
  await Promise.all([
   page.waitForURL('**/balloon/**',{waitUntil:'commit',timeout:20000}),
   page.evaluate(()=>__candyOnline.send({t:'room.start'})),
  ]);
  await entryFailure;
  await page.locator('#park-connection-recovery[data-state=loading-error]').waitFor({timeout:60000});
  assert(heldRecovery,'fixture must delay the real independent recovery module');
  assert(entryFailureAt>0);assert(Date.now()-entryFailureAt<15000,'late recovery must use the pre-recorded entry failure, not wait for the slow-load fallback');
  assert(friend.sockets.every(ws=>ws.readyState===1));
  await page.screenshot({path:'.qa-results/minigame-download-retry-mobile.png'});
  console.log('RECOVERY_ENTRY_RETRY',JSON.stringify({room:friend.data.room?.status,events:roomEvents}));
  await page.unroute('**/online-match-3GT2AEG7.js*');
  await page.unroute('**/app/connection-recovery.js*');
  await page.getByRole('button',{name:'Retry loading',exact:true}).click();
  await page.waitForFunction(()=>window.__onlineMatch?.loaded&&window.__candyOnline?.data.connected,null,{timeout:90000});
  friend.send({t:'match.ready',code});await waitUntil(()=>friend.latest('match.snapshot')?.status==='playing','recovered game begins');
  assert(await page.evaluate(()=>window.__onlineMatch.renderer.info.render.frame>0));
  console.log('RECOVERY_BROWSER_PASS failed minigame download reloads into real match');
  const id=await page.evaluate(()=>__candyOnline.data.me.id),before=friend.latest('match.snapshot').now;
  await context.setOffline(true);await page.evaluate(()=>__candyOnline.ws.close());await delay(1800);await context.setOffline(false);
  await page.waitForFunction(()=>window.__candyOnline?.data.connected,null,{timeout:30000});
  assert.equal(await page.evaluate(()=>__candyOnline.data.me.id),id);await waitUntil(()=>friend.latest('match.snapshot').now>before,'peer match still advances');
  console.log('RECOVERY_BROWSER_PASS minigame reconnect retains guest while peer continues');
  // Force a subsequent entry download failure and exercise the independent
  // Return button. The server room must be left, not redirect the page back.
  await page.route('**/online-match-3GT2AEG7.js*',route=>route.fulfill({status:503,body:'Second isolated failure'}));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#park-connection-recovery[data-state=loading-error]').waitFor({timeout:60000});
  await page.getByRole('button',{name:'Return to park',exact:true}).click();
  await ready();await page.waitForFunction(()=>__candyOnline.data.room===null,null,{timeout:15000});
  assert(new URL(page.url()).pathname.endsWith('/67park-foundation-next/'));
  assert(friend.sockets.every(ws=>ws.readyState===1));
  console.log('RECOVERY_BROWSER_PASS failed game returns to park without redirect loop');
  // The original navigation link and the new recovery button both need the
  // explicit leave intent; test the original link on a separate failed entry.
  friend.send({t:'room.leave'});await waitUntil(()=>friend.data.room===null,'friend leaves previous round');
  await page.evaluate(()=>__candyOnline.send({t:'room.create',capacity:2,mode:'balloon'}));
  await page.waitForFunction(()=>__candyOnline.data.room?.code);const again=await page.evaluate(()=>__candyOnline.data.room.code);
  friend.send({t:'room.join',code:again});await page.waitForFunction(()=>__candyOnline.data.room?.members.length===2);
  await Promise.all([
   page.waitForURL('**/balloon/**',{waitUntil:'commit',timeout:20000}),
   page.evaluate(()=>__candyOnline.send({t:'room.start'})),
  ]);
  await page.locator('#park-connection-recovery[data-state=loading-error]').waitFor({timeout:60000});
  await page.getByRole('link',{name:/Return to/}).click();
  await ready();await page.waitForFunction(()=>__candyOnline.data.room===null,null,{timeout:15000});
  console.log('RECOVERY_BROWSER_PASS original return link also leaves failed match');
  assert.deepEqual(errors.filter(error=>!(/Failed to fetch dynamically imported module/.test(error)&&error.includes('online-match-3GT2AEG7.js'))),[],'Unexpected runtime error during recovery');
  assert.equal((await(await fetch(origin+'/health')).json()).faults,0);
 }catch(error){await page.screenshot({path:'.qa-results/recovery-failure.png'}).catch(()=>{});console.error('RECOVERY_STATE',await page.evaluate(()=>({path:location.pathname,text:document.body.innerText.slice(-1800),ready:window.__islandWorld?.ready,online:window.__candyOnline?.data,match:!!window.__onlineMatch})).catch(()=>({})),errors,roomEvents);throw error}
 finally{releaseLateRecovery?.();friend?.close();await context.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.kill('SIGTERM')});
