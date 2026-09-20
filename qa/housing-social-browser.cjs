const {chromium}=require(process.env.PARK_PLAYWRIGHT||'/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const BASE=process.env.HOUSE_QA_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const OUT=process.env.HOUSE_QA_OUT||'/tmp/67park-feel-lab-2UFlpf';
const LIVE=process.env.SOCIAL_LIVE==='1';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[];let a,b;
 async function player(mobile,base){
  const c=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1280,height:900}});
  await c.addInitScript(({base,mobile})=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));localStorage.setItem('67park-feel-lab-muted',mobile?'1':'0');},{base,mobile});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:120000});
  await p.waitForFunction(()=>__parkHousing?.debug().model?.features?.includes('rest')&&__islandWorld?.ready&&!document.querySelector('.wardrobe'),null,{timeout:180000});return p;
 }
 const wait=async(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:20000});
 async function near(p,spot){
  const target=await p.evaluate(async spot=>{const {HOUSES}=await import('./app/housing-layout.js'),{HOME_SPOTS,spotPosition}=await import('./app/housing-actions.js');return spotPosition(HOUSES[0],HOME_SPOTS.find(s=>s.id===spot),true);},spot);
  // Position the test player along the open aisle, not through furniture: the
  // production sweep correctly rejects a direct diagonal through the table.
  for(const v of [[480,20.555,502],[target[0],20.555,502],target]){await p.evaluate(v=>__tp(v),v);await p.waitForTimeout(250);}
  await p.waitForTimeout(450);console.log('NEAR',spot,await p.evaluate(()=>({p:__eggyInput.playerRef.body.translation(),hint:document.querySelector('#park-home-hint').textContent})));
 }
 async function poses(p){return p.evaluate(async()=>{const {Vector3}=await import('three'),rows=[];__islandWorld.scene.traverse(o=>{if(o.userData.homePose?.active){const legs=[];o.traverse(b=>{if(b.isBone&&/^Thigh[LR](?:_\d+)?$/.test(b.name)){const knee=b.children.find(n=>n.isBone&&/^Shin/.test(n.name)),foot=knee?.children.find(n=>n.isBone&&/^Toe/.test(n.name));if(knee&&foot){const a=b.getWorldPosition(new Vector3()),k=knee.getWorldPosition(new Vector3()),f=foot.getWorldPosition(new Vector3());legs.push({forward:k.z-a.z,down:k.y-f.y,side:Math.abs(k.x-a.x)});}}});rows.push({pose:o.userData.homePose,p:o.position.toArray(),name:o.name,legs});}});return rows;});}
 async function detail(p,kind){
  await p.evaluate(kind=>{const w=__islandWorld,s=w.scene,old=s.onBeforeRender;window.__restoreHomeView=()=>s.onBeforeRender=old;s.onBeforeRender=function(...args){old.apply(this,args);const c=args[2];c.position.set(...(kind==='sofa'?[477,22.8,502]:[480.5,26.5,502.5]));c.lookAt(...(kind==='sofa'?[475.5,21.3,497.9]:[484.55,20.8,496.6]));c.updateMatrixWorld();};},kind);
  await p.waitForTimeout(150);await p.screenshot({path:OUT+'/home-social-'+kind+'-detail-'+(p.viewportSize().width<600?'mobile':'desktop')+'.png'});await p.evaluate(()=>__restoreHomeView());
 }
 try{
  a=await player(false,'goril');b=await player(true,'friendsie_1');console.log('READY');
  await a.locator('#park-home-button').click();if(LIVE&&await a.evaluate(()=>!!__parkHousing.debug().model.houses[0].owner)){console.log('LIVE HOME OCCUPIED: left untouched; interaction test not run');return;}assert.equal(await a.evaluate(()=>__parkHousing.debug().model.houses[0].owner),null,'QA never takes an occupied home');
  await a.locator('[data-house=H01] [data-home-action=claim]').click();await wait(a,()=>__parkHousing.debug().model.houses[0].owner===__candyOnline.data.me.id);
  await a.locator('[data-house=H01] [data-home-action=lock]').click();await wait(a,()=>__parkHousing.debug().model.houses[0].locked);
  await a.locator('[data-house=H01] [data-home-action=door]').click();await a.waitForTimeout(500);await a.keyboard.press('KeyE');await wait(a,()=>__parkHousing.debug().visit==='H01');
  await b.locator('#park-home-button').tap();await b.locator('[data-house=H01] [data-home-action=door]').tap();await b.waitForTimeout(600);
  await b.locator('#park-home-hint').tap();await wait(a,()=>document.querySelector('#park-home-button').textContent.includes('Doorbell'));
  assert((await a.evaluate(()=>__party.sfx.stats().counts.bell||0))>0,'doorbell uses the active bounded audio graph');
  assert.equal(await b.evaluate(()=>__parkHousing.debug().visit),null);
  await a.locator('#park-home-button').click();const bid=await b.evaluate(()=>__candyOnline.data.me.id);
  await a.locator('#home-guest-select').selectOption(bid);await a.locator('#home-host [data-home-action=invite]').click();
  await wait(b,()=>__parkHousing.debug().model.invitations.length===1);assert.equal(await b.evaluate(()=>__parkHousing.debug().visit),null);
  await b.locator('#park-home-button').tap();await b.screenshot({path:OUT+'/home-social-invite-mobile.png'});
  await b.locator('#home-invitations [data-home-action=accept]').tap();await wait(b,()=>__parkHousing.debug().visit==='H01');await a.locator('.home-close').click();console.log('BELL INVITE ACCEPT PASS');
  await near(a,'sofa-left');await a.keyboard.press('KeyE');await wait(a,()=>__parkHousing.debug().rest==='sofa-left');await a.waitForTimeout(500);
  await near(b,'sofa-right');await b.locator('#park-home-hint').tap();await wait(b,()=>__parkHousing.debug().rest==='sofa-right');await b.waitForTimeout(900);
  assert.equal((await poses(a)).filter(r=>r.pose.pose==='sit').length,2);assert.equal((await poses(b)).filter(r=>r.pose.pose==='sit').length,2);
  for(const p of [a,b])for(const r of await poses(p))for(const leg of r.legs){assert(leg.forward>.03&&leg.forward>leg.side*3,'every avatar and costume knee bends forward');assert(leg.down>.03,'feet hang below knees');}
  await a.screenshot({path:OUT+'/home-social-sofa-desktop.png'});console.log('SOFA BOTH CLIENTS',JSON.stringify(await poses(a)));
  await detail(a,'sofa');
  await b.getByRole('button',{name:'Jump',exact:true}).tap();await wait(b,()=>!__parkHousing.debug().rest);await b.waitForTimeout(130);
  const jump=await b.evaluate(()=>__eggyInput.playerRef.body.translation().y);assert(jump>20.7,'touch jump immediately gets up and jumps');await b.waitForTimeout(900);
  await near(b,'bed');await b.locator('#park-home-hint').tap();await wait(b,()=>__parkHousing.debug().rest==='bed');await b.waitForTimeout(800);
  assert((await poses(a)).some(r=>r.pose.pose==='lie'),'remote sees lying pose');await b.screenshot({path:OUT+'/home-social-bed-mobile.png'});
  await a.keyboard.down('KeyW');await a.waitForTimeout(450);await a.keyboard.up('KeyW');assert.equal(await a.evaluate(()=>__parkHousing.debug().rest),null);
  await near(a,'bed-right');await a.keyboard.press('KeyE');await wait(a,()=>__parkHousing.debug().rest==='bed-right');await a.waitForTimeout(900);
  for(const p of [a,b]){
   const lying=(await poses(p)).filter(r=>r.pose.pose==='lie');assert.equal(lying.length,2,'both sides visible to both players');
   assert.deepEqual(new Set(lying.map(r=>r.pose.spot)),new Set(['bed','bed-right']));
  }
  console.log('TWO BED PLACES BOTH CLIENTS',JSON.stringify(await poses(b)));
  await detail(a,'bed');await a.screenshot({path:OUT+'/home-social-bed-desktop.png'});await detail(b,'bed');
  await a.keyboard.press('Space');await wait(a,()=>!__parkHousing.debug().rest);
  assert.equal(await b.evaluate(()=>__parkHousing.debug().rest),'bed','one player standing does not evict the other');
  if(!LIVE){
   await b.evaluate(()=>__candyOnline.ws.close());await b.waitForTimeout(3500);await wait(b,()=>__candyOnline.data.connected&&__parkHousing.debug().rest==='bed');
   await b.context().setOffline(true);await b.evaluate(()=>__candyOnline.ws.close());await wait(b,()=>!__candyOnline.data.connected);
   await b.locator('#park-home-hint').tap();await wait(b,()=>!__parkHousing.debug().rest&&__parkHousing.debug().standQueued);
   await b.context().setOffline(false);await wait(b,()=>__candyOnline.data.connected&&__parkHousing.debug().model?.rest===null&&!__parkHousing.debug().standQueued);
   const p=await b.evaluate(()=>__eggyInput.playerRef.body.translation());assert(p.z>498.4,'offline stand is not undone by a reconnect teleport into the bed');
  }else{await b.locator('#park-home-hint').tap();await wait(b,()=>!__parkHousing.debug().rest);}
  // Spam real UI controls, not crafted socket traffic (which the existing
  // anti-abuse server deliberately disconnects). Unit tests cover that layer.
  const frame=await b.evaluate(()=>__islandWorld.renderer.info.render.frame);
  if(!LIVE)await b.evaluate(()=>{const button=document.querySelector('#park-home-hint');for(let i=0;i<1000;i++)button.click();});await b.waitForTimeout(1600);
  assert((await b.evaluate(()=>__islandWorld.renderer.info.render.frame))>frame+10);
  await wait(b,()=>__candyOnline.data.connected&&__eggyNet.connected);
  if(!LIVE){await b.locator('.park-chat button').last().tap();await b.getByPlaceholder('Message everyone…').fill('Home social QA');await b.locator('.park-chat button').last().tap();await wait(a,()=>__eggyNet.chat.some(m=>m.text==='Home social QA'));await b.keyboard.press('Escape');}assert.equal(await b.evaluate(()=>visualViewport.scale),1);
  for(const [width,height]of [[390,844],[320,568],[844,390]]){await b.setViewportSize({width,height});await b.locator('#park-home-button').tap();const r=await b.locator('#park-homes').boundingBox();assert(r.width<=width&&r.height<=height&&r.x>=0&&r.y>=0);assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await b.locator('.home-close').tap();}
  for(const p of [a,b])assert.deepEqual(await p.evaluate(()=>({errors:__candyErrors,failed:__parkHousing.debug().failed,disabled:__party.status().disabled})),{errors:[],failed:false,disabled:false});
  assert.deepEqual(errors,[]);console.log(LIVE?'LIVE HOME SOCIAL PASS':'HOME SOCIAL BROWSER PASS',JSON.stringify({jump,errors}));
 }catch(e){for(const [label,p]of [['a',a],['b',b]])if(p){console.log('FAIL STATE',label,await p.evaluate(()=>({house:__parkHousing?.debug(),p:__eggyInput?.playerRef.body.translation(),errors:window.__candyErrors,ui:document.querySelector('#home-message')?.textContent})));await p.screenshot({path:OUT+'/home-social-fail-'+label+'.png'});}throw e;}
 finally{if(a)await a.evaluate(()=>{if(__parkHousing.debug().model?.houses[0]?.owner===__candyOnline.data.me.id)__candyOnline.send({t:'house.release',house:'H01'});}).catch(()=>{});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
