const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const BASE=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[],pages=[];
 async function make(mobile,base){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:800},isMobile:mobile,hasTouch:mobile});
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(base=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));localStorage.setItem('67park-feel-lab-muted','1');},base);
  await p.goto(BASE+'?v=home-scene-1',{waitUntil:'domcontentloaded',timeout:120000});
  await p.waitForFunction(()=>window.__parkHousing?.debug().model&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  assert.equal(await p.evaluate(()=>__parkHousing.debug().loading.phase),'idle','Interior must not load on lobby entry');pages.push(p);return p;
 }
 const read=p=>p.evaluate(async()=>{const w=__islandWorld,{k:controls,g:input}=await import('./app/chunk-G7D6MVRW.js?v=recovery-graphics-1');let nodes=0;w.scene.traverse(()=>nodes++);return {p:__eggyInput.playerRef.body.translation(),blocked:controls.blocked,input:{x:input.x,z:input.z},id:__candyOnline.data.me.id,island:__candyOnline.data.island.code,house:__parkHousing.debug(),frame:w.renderer.info.render.frame,nodes,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},programs:w.renderer.info.programs.length,errors:__candyErrors};});
 const send=(p,action)=>p.evaluate(action=>__candyOnline.send({t:'house.'+action,house:'H01'}),action);
 async function door(p){await send(p,'door');await p.waitForFunction(()=>__eggyInput.playerRef.body.translation().x<0);await p.waitForTimeout(500);}
 async function enter(p){await p.locator('#park-home-hint').click();await p.waitForFunction(()=>__parkHousing.debug().visit==='H01');await p.waitForTimeout(650);}
 async function move(p,key='KeyA'){const before=await read(p);await p.keyboard.down(key);await p.waitForTimeout(550);const during=await read(p);await p.keyboard.up(key);const after=await read(p);assert(Math.hypot(after.p.x-before.p.x,after.p.z-before.p.z)>.25,JSON.stringify({key,before,after,during:{p:during.p,input:during.input,blocked:during.blocked},focus:await p.evaluate(()=>({tag:document.activeElement?.tagName,html:document.activeElement?.outerHTML.slice(0,200)}))}));assert(after.frame-before.frame>4);return after;}
 async function chat(p,text,others){await p.locator('.park-chat button').last().click();await p.getByPlaceholder('Message everyone…').fill(text);await p.locator('.park-chat button').last().click();for(const other of others)await other.waitForFunction(text=>__eggyNet.chat.some(m=>m.text===text),text);}
 async function remoteVisible(p,id){await p.waitForFunction(id=>{let visible=false;__eggyScene.traverse(o=>{if(o.userData.claudeRemoteCharacter?.id!==id)return;for(let n=o;n;n=n.parent)if(!n.visible)return;visible=true;});return visible;},id,{timeout:20000});}
 try{
  const a=await make(false,'goril'),b=await make(true,'friendsie_1'),c=await make(false,'friendsie_100');console.log('READY');
  await send(a,'claim');await a.waitForFunction(()=>__parkHousing.debug().model.houses[0].owner===__candyOnline.data.me.id);
  await door(a);const outside=await read(a);await enter(a);const inside=await read(a);
  assert(inside.house.scene.active&&inside.house.scene.roots>20);assert(inside.nodes<outside.nodes/2);assert.equal(inside.island,outside.island);assert.equal(inside.id,outside.id);
  const exteriorPlayer=await move(b,'KeyW');assert.equal(exteriorPlayer.house.visit,null);assert.equal(exteriorPlayer.house.scene.active,false);
  await chat(a,'Inside to outside '+Date.now(),[b,c]);await chat(b,'Outside to inside '+Date.now(),[a,c]);
  await door(b);
  // A failed interior download must leave the mobile player outside, rendering.
  await b.route('**/housing-interior.js*',route=>route.abort());await b.locator('#park-home-hint').tap();
  // At H01 the saved camera makes W point away from the building; S hits its wall.
  await b.waitForFunction(()=>__parkHousing.debug().loading.phase==='error');assert.equal((await read(b)).house.visit,null);await move(b,'KeyW');
  await b.unroute('**/housing-interior.js*');await door(b);await enter(b);console.log('FAILED LOAD RECOVERY PASS');
  const aid=(await read(a)).id,bid=(await read(b)).id;
  await remoteVisible(a,bid);await remoteVisible(b,aid);
  await b.getByRole('button',{name:'Bird’s-eye view',exact:true}).tap();
  await b.waitForFunction(()=>!__parkHousing.debug().scene.active&&!!document.querySelector('#hawk-map-navigation'));
  assert((await read(b)).nodes>inside.nodes*2);assert.equal((await read(b)).house.visit,'H01');
  await b.getByRole('button',{name:'Return to player',exact:true}).tap();
  await b.waitForFunction(()=>__parkHousing.debug().scene.active);console.log('INDOOR MAP OVERVIEW PASS');
  assert.equal((await read(c)).house.visit,null);assert.equal((await read(c)).house.scene.active,false);
  const beforePeer=await a.evaluate(id=>__eggyNet.remotes.get(id).targetP,bid);await move(b,'KeyA');
  await a.waitForFunction(({id,before})=>{const p=__eggyNet.remotes.get(id)?.targetP;return p&&Math.hypot(p[0]-before[0],p[2]-before[2])>.25;},{id:bid,before:beforePeer});
  await b.screenshot({path:'/tmp/67park-feel-lab-2UFlpf/isolated-home-mobile.png'});
  // An outside client still drives the shared car while two clients are inside.
  await c.evaluate(()=>__candy.approach('car',0));await c.waitForTimeout(800);await c.keyboard.press('KeyE');
  await c.waitForFunction(()=>__candy.state().mounted==='car');const carBefore=await c.evaluate(()=>__candy.state().cars[0]);
  await c.keyboard.down('KeyW');await c.waitForTimeout(1400);await c.keyboard.up('KeyW');
  const carAfter=await c.evaluate(()=>__candy.state().cars[0]);assert(Math.hypot(carAfter.x-carBefore.x,carAfter.z-carBefore.z)>.5,'Outside car continues moving');
  await c.keyboard.press('KeyE');await c.waitForFunction(()=>!__candy.state().mounted);
  console.log('SPLIT ONLINE PASS',JSON.stringify({outside,inside,carBefore,carAfter}));
  await b.evaluate(()=>__candyOnline.ws.close());await b.waitForTimeout(3500);
  await b.waitForFunction(()=>__candyOnline.data.connected&&__parkHousing.debug().visit==='H01');assert.equal((await read(b)).id,bid);
  await chat(b,'Reconnected inside '+Date.now(),[a,c]);await move(b,'KeyD');
  const resident=await read(b);
  for(let i=0;i<10;i++){await send(b,'exit');await b.waitForFunction(()=>!__parkHousing.debug().visit);await b.waitForTimeout(500);await enter(b);}
  const repeated=await read(b);assert.equal(repeated.house.loading.attempts,2);assert(repeated.memory.geometries<=resident.memory.geometries+2);assert(repeated.memory.textures<=resident.memory.textures+2);
  // Map travel first exits the server-side house, then applies the destination.
  await b.getByRole('button',{name:'Bird’s-eye view',exact:true}).tap();await b.locator('#hawk-map-navigation').waitFor();await b.waitForTimeout(200);
  const mapPoint=await b.evaluate(async()=>{const {Vector3}=await import('three'),p=new Vector3(163,10,121).project(__islandWorld.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}});
  await b.touchscreen.tap(mapPoint.x,mapPoint.y);
  await b.waitForFunction(()=>!__parkHousing.debug().visit&&!__parkHousing.debug().scene.active&&__parkHousing.debug().model.visiting===null&&Math.hypot(__eggyInput.playerRef.body.translation().x-163,__eggyInput.playerRef.body.translation().z-121)<3);
  console.log('HOME MAP TRAVEL PASS');
  await send(a,'release');await Promise.all([a,b].map(p=>p.waitForFunction(()=>!__parkHousing.debug().visit&&!__parkHousing.debug().scene.active)));
  const returned=await move(b,'KeyW');assert(returned.nodes>repeated.nodes*2);assert.equal(returned.house.scene.roots,0);
  assert.deepEqual(errors,[]);for(const p of pages)assert.deepEqual((await read(p)).errors,[]);
  console.log('HOME SCENE PASS',JSON.stringify({resident,repeated,returned,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
