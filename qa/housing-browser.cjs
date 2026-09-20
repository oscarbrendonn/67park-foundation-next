const {chromium}=require(process.env.PARK_PLAYWRIGHT||'/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const BASE=process.env.HOUSE_QA_URL||'http://127.0.0.1:8495/67park-foundation-next/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[];
 async function page(mobile=false){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:120000});
  await p.waitForFunction(()=>window.__parkHousing?.debug().model&&window.__islandWorld?.ready&&!document.querySelector('.wardrobe')&&globalThis[Symbol.for('67park.entry.v1')]?.value?.status==='ready',null,{timeout:180000});
  return p;
 }
 try{
  const a=await page(),b=await page(true);
  await a.locator('#park-home-button').click();await a.locator('[data-house=H01] [data-home-action=claim]').click();
  await a.waitForFunction(()=>__parkHousing.debug().model.houses[0].owner===__candyOnline.data.me.id);
  await a.locator('[data-house=H01] [data-home-action=door]').click();
  await a.waitForFunction(()=>!document.querySelector('#park-homes').open&&__eggyInput.playerRef.body.translation().x<0);
  await a.keyboard.press('KeyE');await a.waitForFunction(()=>__parkHousing.debug().visit==='H01');
  await a.waitForTimeout(1500);
  console.log('INSIDE',await a.evaluate(()=>({p:__eggyInput.playerRef.body.translation(),house:__parkHousing.debug(),errors:__candyErrors})));
  await a.screenshot({path:'/tmp/67park-home-desktop.png'});
  // Owner locks; a second real client cannot enter by bypassing the UI.
  await a.locator('#park-home-button').click();await a.locator('[data-house=H01] [data-home-action=lock]').click();
  await a.waitForFunction(()=>__parkHousing.debug().model.houses[0].locked);
  await b.locator('#park-home-button').tap();await b.locator('[data-house=H01] [data-home-action=door]').tap();
  await b.waitForFunction(()=>__eggyInput.playerRef.body.translation().x<0);
  await b.evaluate(()=>__candyOnline.send({t:'house.enter',house:'H01',request:'locked-test'}));await b.waitForTimeout(500);
  assert.equal(await b.evaluate(()=>__parkHousing.debug().visit),null);
  await a.locator('[data-house=H01] [data-home-action=lock]').click();await a.waitForFunction(()=>!__parkHousing.debug().model.houses[0].locked);
  await a.locator('.home-close').click();
  await b.locator('#park-home-hint').tap();await b.waitForFunction(()=>__parkHousing.debug().visit==='H01');
  await b.waitForTimeout(1200);
  assert.equal(await b.evaluate(()=>__parkHousing.debug().model.houses[0].guests),2);
  const before=await b.evaluate(()=>({p:__eggyInput.playerRef.body.translation(),f:__islandWorld.renderer.info.render.frame}));
  await b.keyboard.down('KeyW');await b.waitForTimeout(800);await b.keyboard.up('KeyW');
  const after=await b.evaluate(()=>({p:__eggyInput.playerRef.body.translation(),f:__islandWorld.renderer.info.render.frame}));
  assert(Math.hypot(before.p.x-after.p.x,before.p.z-after.p.z)>.3,'Indoor movement');assert(after.f>before.f+5);
  await b.keyboard.press('Space');await b.waitForTimeout(180);
  assert((await b.evaluate(()=>__eggyInput.playerRef.body.translation().y))>after.p.y+.3,'Indoor jump');
  await b.waitForTimeout(900);await b.screenshot({path:'/tmp/67park-home-mobile.png'});
  // Actual chat form, not just socket injection. Both players must see it.
  const chatPrefix='Home '+Date.now().toString(36);
  for(let i=0;i<6;i++){
   await b.locator('.park-chat button').last().tap();
   await b.waitForTimeout(100);
   console.log('CHAT OPEN',i,await b.evaluate(()=>({input:!!document.querySelector('.park-chat input'),active:document.activeElement?.tagName,house:__parkHousing.debug().visit,connected:__eggyNet.connected})));
   await b.getByPlaceholder('Message everyone…').fill(chatPrefix+' '+i);
   await b.locator('.park-chat button').last().tap();
   await b.waitForTimeout(100);console.log('CHAT SEND',i,await b.evaluate(()=>({text:document.querySelector('.park-chat')?.innerText,value:document.querySelector('.park-chat input')?.value,own:__eggyNet.chat.at(-1)})));
   try{await a.waitForFunction(text=>__eggyNet.chat.some(m=>m.text===text),chatPrefix+' '+i,{timeout:5000});}
   catch(e){console.log('CHAT DEBUG',i,await b.evaluate(()=>({chat:__eggyNet.chat,connected:__eggyNet.connected,id:__eggyNet.id,online:__candyOnline.data.me.id,field:document.querySelector('.park-chat input')?.value,errors:__candyErrors,frame:__islandWorld.renderer.info.render.frame})),await a.evaluate(()=>({chat:__eggyNet.chat,connected:__eggyNet.connected})));throw e;}
   await b.waitForTimeout(750);
  }
  assert.equal(await b.evaluate(()=>visualViewport.scale),1);
  const stick=await b.locator('.park-stick').boundingBox(),touch=await b.context().newCDPSession(b);
  const touchBefore=await b.evaluate(()=>__eggyInput.playerRef.body.translation());
  const tx=stick.x+stick.width/2,ty=stick.y+stick.height/2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty+35}]});await b.waitForTimeout(650);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const touchAfter=await b.evaluate(()=>__eggyInput.playerRef.body.translation());
  assert(Math.hypot(touchAfter.x-touchBefore.x,touchAfter.z-touchBefore.z)>.3,'Touch joystick after six chats');
  await b.locator('#park-home-button').tap();await b.screenshot({path:'/tmp/67park-homes-mobile-panel.png'});
  assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await b.locator('.home-close').tap();
  // Socket reconnect restores the existing owner and the current visitor.
  const id=await b.evaluate(()=>__candyOnline.data.me.id);
  await b.evaluate(()=>__candyOnline.ws.close());await b.waitForTimeout(3500);
  await b.waitForFunction(()=>__candyOnline.data.connected&&__parkHousing.debug().visit==='H01');
  assert.equal(await b.evaluate(()=>__candyOnline.data.me.id),id);
  await b.locator('#park-home-button').tap();await b.locator('#home-inside [data-home-action=exit]').tap();
  await b.waitForFunction(()=>!__parkHousing.debug().visit&&__eggyInput.playerRef.body.translation().x<0);
  await b.evaluate(()=>__candyOnline.send({t:'house.enter',house:'H01'}));await b.waitForFunction(()=>__parkHousing.debug().visit==='H01');
  await b.context().setOffline(true);await b.evaluate(()=>__candyOnline.ws.close());
  await b.waitForFunction(()=>!__candyOnline.data.connected);await b.locator('#park-home-button').tap();await b.locator('#home-inside [data-home-action=exit]').tap();
  await b.waitForFunction(()=>!__parkHousing.debug().visit&&__eggyInput.playerRef.body.translation().x<0);
  await b.context().setOffline(false);await b.waitForFunction(()=>__candyOnline.data.connected&&__parkHousing.debug().model?.visiting===null,null,{timeout:20000});
  await a.locator('#park-home-button').click();await a.locator('[data-house=H01] [data-home-action=release]').click();await a.locator('[data-house=H01] [data-home-action=release]').click();
  await a.waitForFunction(()=>!__parkHousing.debug().visit&&!__parkHousing.debug().model.houses[0].owner);
  // Every cottage's actual arrival ground and enter/exit path, not one sample.
  for(const id of ['H01','H02','H03','H04','H05','H06','H07','H08']){
   const taken=await a.evaluate(id=>__parkHousing.debug().model.houses.find(h=>h.id===id).owner,id);if(taken)throw Error('QA house already occupied: '+id);
   await a.evaluate(id=>__candyOnline.send({t:'house.claim',house:id}),id);
   await a.waitForFunction(id=>__parkHousing.debug().model.houses.find(h=>h.id===id).owner===__candyOnline.data.me.id,id);
   await a.evaluate(id=>__candyOnline.send({t:'house.door',house:id}),id);await a.waitForTimeout(450);
   const arrival=await a.evaluate(()=>{const p=__eggyInput.playerRef.body.translation(),w=__islandWorld;return {y:p.y,g:w.ground(p.x,p.z),wet:w.water(p.x,p.z),blocked:w.treeBlocked(p.x,p.y,p.z)};});
   assert(!arrival.wet&&!arrival.blocked);assert(Math.abs(arrival.y-arrival.g-.555)<.08);
   await a.evaluate(id=>__candyOnline.send({t:'house.enter',house:id}),id);await a.waitForFunction(id=>__parkHousing.debug().visit===id,id);
   await a.waitForTimeout(450);
   await a.evaluate(id=>__candyOnline.send({t:'house.release',house:id}),id);await a.waitForFunction(()=>!__parkHousing.debug().visit);
   await a.waitForTimeout(450);
  }
  const result=await b.evaluate(()=>({errors:__candyErrors,house:__parkHousing.debug(),frame:__islandWorld.renderer.info.render.frame}));
  for(const [width,height]of [[320,568],[844,390]]){
   await b.setViewportSize({width,height});await b.locator('#park-home-button').tap();
   const r=await b.locator('#park-homes').boundingBox();assert(r.width<=width&&r.height<=height&&r.x>=0&&r.y>=0);
   await b.locator('.home-close').tap();
  }
  assert.equal(errors.length,0);assert.equal(result.errors.length,0);assert.equal(result.house.failed,false);
  console.log('HOUSING BROWSER PASS',JSON.stringify({before,after,result}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
