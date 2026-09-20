const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BASE=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const OUT=fs.mkdtempSync('/tmp/67park-pets-');
const wait=(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:180000});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),errors=[];
 let a,b;
 async function page(mobile=false){const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});p.on('pageerror',e=>errors.push(e.message));return p;}
 const read=p=>p.evaluate(()=>({pets:__parkPets.debug(),frame:__islandWorld.renderer.info.render.frame,p:__eggyInput.playerRef.body.translation(),memory:{...__islandWorld.renderer.info.memory},errors:__candyErrors,connected:__eggyNet.connected,id:__eggyNet.id}));
 async function game(p,kind){await p.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});await p.goto(BASE+'?v=pets-soft-2&pet='+kind,{waitUntil:'domcontentloaded',timeout:120000});await p.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});await wait(p,()=>window.__islandWorld?.ready&&window.__parkPets?.debug().active&&window.__eggyNet?.connected);await p.evaluate(()=>__tp([200,10.3,88]));await p.waitForTimeout(1500);}
 try {
  a=await page();await a.goto(BASE+'pets/?v=pets-soft-2');await wait(a,()=>window.__petStudio?.stats().frames>30);
  await a.screenshot({path:OUT+'/pets-studio-desktop.png'});
  for(const kind of ['cat','dog']){const url=await a.evaluate(kind=>__petStudio.thumbnail(kind),kind);if(!process.env.FEEL_URL)fs.writeFileSync(path.resolve(__dirname,'../pets/'+kind+'.png'),Buffer.from(url.split(',')[1],'base64'));}
  await a.getByRole('button',{name:'Sit & relax'}).click();await a.waitForTimeout(900);assert.equal(await a.evaluate(()=>__petStudio.cat.stats.pose),'sit');
  await a.getByRole('button',{name:'Say hello',exact:true}).click();await a.waitForTimeout(120);assert.equal(await a.evaluate(()=>__petStudio.cat.stats.pose),'play');
  await a.setViewportSize({width:390,height:844});await a.waitForTimeout(200);await a.screenshot({path:OUT+'/pets-studio-mobile.png'});assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await a.setViewportSize({width:1280,height:900});
  if(process.env.STUDIO_ONLY){console.log('PET STUDIO PASS',OUT);return;}
  await game(a,'cat');console.log('PET GAME READY',JSON.stringify(await read(a)));
  const start=await read(a);await a.keyboard.down('KeyW');await a.waitForTimeout(1600);await a.keyboard.up('KeyW');await a.waitForTimeout(500);const walked=await read(a);
  console.log('WALKED',JSON.stringify(walked));assert(Math.hypot(walked.p.x-start.p.x,walked.p.z-start.p.z)>2);assert(walked.pets.local.distance>start.pets.local.distance+.2);assert.equal(walked.pets.failed,0);
  assert(Math.hypot(walked.p.x-walked.pets.local.position[0],walked.p.z-walked.pets.local.position[2])<4,'Pet fell behind the camera');
  await a.screenshot({path:OUT+'/pet-follow-desktop.png'});
  await a.getByRole('button',{name:'Bag',exact:true}).click();await a.getByRole('button',{name:'Choose Dog',exact:true}).click();await wait(a,()=>__parkPets.debug().local?.kind==='dog');
  assert(await a.getByRole('button',{name:'Choose Dog'}).getAttribute('aria-pressed')==='true');await a.screenshot({path:OUT+'/pet-bag-desktop.png'});
  await a.keyboard.press('KeyI');await a.goto(BASE+'?v=pets-soft-2');await wait(a,()=>__parkPets?.debug().local?.kind==='dog'&&!document.querySelector('.wardrobe'));console.log('SAVED PET PASS');
  await a.evaluate(()=>__tp([200,10.3,88]));await a.waitForTimeout(1200);
  b=await page(true);await game(b,'cat');
  await wait(a,()=>__parkPets.debug().remotes.some(p=>p.kind==='cat'&&p.visible));await wait(b,()=>__parkPets.debug().remotes.some(p=>p.kind==='dog'&&p.visible));console.log('ONLINE PEERS PASS');
  const mobileStart=await read(b),stick=await b.getByLabel('Movement joystick',{exact:true}).boundingBox(),cdp=await b.context().newCDPSession(b);
  const touch={x:stick.x+stick.width/2,y:stick.y+stick.height/2,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,y:touch.y-35}]});await b.waitForTimeout(1100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await b.waitForTimeout(500);
  const mobileWalk=await read(b);assert(Math.hypot(mobileWalk.p.x-mobileStart.p.x,mobileWalk.p.z-mobileStart.p.z)>1);assert(mobileWalk.pets.local.distance>mobileStart.pets.local.distance+.2);await b.screenshot({path:OUT+'/pet-follow-mobile.png'});console.log('TOUCH FOLLOW PASS');
  await b.getByRole('button',{name:'Bag',exact:true}).tap();await b.getByRole('button',{name:'Choose Dog',exact:true}).tap();await wait(a,()=>__parkPets.debug().remotes.some(p=>p.kind==='dog'&&p.visible));
  await b.screenshot({path:OUT+'/pet-bag-mobile.png'});assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await b.getByRole('button',{name:'No pet',exact:true}).tap();await wait(b,()=>__parkPets.debug().local===null);await wait(a,()=>__parkPets.debug().remotes.length===0);
  await b.getByRole('button',{name:'Choose Cat',exact:true}).tap();await b.keyboard.press('KeyI');
  const before=await read(b);await b.evaluate(()=>{for(let i=0;i<100;i++)__parkPets.select(i%2?'cat':'dog')});await b.waitForTimeout(1500);const after=await read(b);assert(after.frame>before.frame+5);assert.equal(after.pets.failed,0);assert(after.memory.geometries<=before.memory.geometries+3);assert(after.connected);
  // Chat, a previous regression hotspot, must remain live with companions.
  await b.locator('.park-chat button').last().tap();await b.getByPlaceholder('Message everyone…').fill('Pet companion QA');await b.locator('.park-chat button').last().tap();await wait(a,()=>__eggyNet.chat.some(m=>m.text==='Pet companion QA'));
  await b.keyboard.press('Escape');assert.equal(await b.evaluate(()=>visualViewport.scale),1);
  await a.evaluate(()=>__eggyNet.ws.close());await wait(a,()=>!__eggyNet.connected);await wait(a,()=>__eggyNet.connected);await wait(b,()=>__parkPets.debug().remotes.some(p=>p.kind==='dog'&&p.visible));
  // Enter/leave an isolated home without dropping the outside observer.
  await a.evaluate(()=>__candyOnline.send({t:'house.claim',house:'H01'}));await wait(a,()=>__parkHousing.debug().model.houses[0].owner===__candyOnline.data.me.id);
  await a.evaluate(()=>__candyOnline.send({t:'house.door',house:'H01'}));await wait(a,()=>__eggyInput.playerRef.body.translation().x<0);await a.waitForTimeout(500);
  await a.locator('#park-home-hint').click();await wait(a,()=>__parkHousing.debug().visit==='H01');await wait(a,()=>__parkPets.debug().local?.follow.visible&&__parkPets.debug().local.position[0]>450);
  assert((await read(b)).connected);await a.screenshot({path:OUT+'/pet-home.png'});
  await a.evaluate(()=>__candyOnline.send({t:'house.exit',house:'H01'}));await wait(a,()=>!__parkHousing.debug().visit);await wait(a,()=>__parkPets.debug().local?.follow.visible&&__parkPets.debug().local.position[0]<450);
  await a.evaluate(()=>__candyOnline.send({t:'house.release',house:'H01'}));console.log('PET HOME TRANSITION PASS');
  for(const p of [a,b]){const r=await read(p);assert.equal(r.pets.failed,0);assert.deepEqual(r.errors,[]);assert(r.connected);}
  assert.deepEqual(errors,[]);console.log('PETS BROWSER PASS',JSON.stringify({output:OUT,desktop:await read(a),mobile:await read(b),errors}));
 }catch(error){for(const [label,p]of [['a',a],['b',b]])if(p){console.log('FAIL',label,await p.evaluate(()=>({pets:window.__parkPets?.debug(),errors:window.__candyErrors,body:document.body.innerText.slice(-500)})));await p.screenshot({path:OUT+'/fail-'+label+'.png'});}throw error;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
