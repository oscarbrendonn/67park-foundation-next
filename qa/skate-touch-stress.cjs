// Reproduce the reported city-board/camera interaction at the default graphics
// setting and a high-DPR mobile viewport. This is NOT a physical iPhone test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const {browserLaunchOptions} = require('./browser-launch.cjs');
const base = process.env.FEEL_URL || 'http://127.0.0.1:8496/67park-foundation-next/';
const output = process.env.PARK_TOUCH_REPORT || '.qa-results/skate-touch-default.json';
const cpuRate = Number(process.env.PARK_CPU_RATE || 1);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
 let browser, context, cdp;
 const errors = [];
 try {
  browser = await chromium.launch(browserLaunchOptions());
  context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
   localStorage.setItem('67park-feel-lab-muted','1');
   localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'auto'}));
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
  });
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(() => window.__islandWorld?.ready && window.__eggyInput?.playerRef?.body && !document.querySelector('.wardrobe'),null,{timeout:180000});
  cdp = await context.newCDPSession(page);
  if (cpuRate !== 1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuRate});
  await page.evaluate(() => {
   const w = __islandWorld;
   __tp([-15,w.ground(-15,100)+.555,100]);
   const probe = window.__touchStress = {active:true,phase:'settle',last:0,rows:[],touches:[],jumps:0,peakAir:0};
   probe.touch = e => probe.touches.push({type:e.type,trusted:e.isTrusted});
   for (const type of ['touchstart','touchend','touchcancel']) addEventListener(type,probe.touch,true);
   const tick = at => {
    if (!probe.active) return;
    const body = __eggyInput.playerRef.body.translation(), camera = w.camera.userData.feelLab;
    if (probe.last) probe.rows.push({phase:probe.phase,gap:at-probe.last,frame:w.renderer.info.render.frame,x:body.x,y:body.y,z:body.z,yaw:camera.yaw,pitch:camera.pitch,air:__skateState.air});
    probe.last=at;probe.peakAir=Math.max(probe.peakAir,__skateState.air||0);probe.raf=requestAnimationFrame(tick);
   };
   probe.raf=requestAnimationFrame(tick);
  });
  await page.keyboard.press('KeyV');
  await page.waitForFunction(() => __candy.state().board);
  await page.waitForTimeout(300);
  const point = async selector => {
   const r = await page.locator(selector).boundingBox();assert(r,`missing touch target ${selector}`);
   return {x:r.x+r.width/2,y:r.y+r.height/2};
  };
  const touch = (type,points) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const summaries=[];
  for (let cycle=0;cycle<4;cycle++) {
   const begin = await page.evaluate(cycle => {__touchStress.phase='cycle-'+cycle;return __touchStress.rows.length;},cycle);
   const jump=await point('button[aria-label="Jump"]');
   await touch('touchStart',[{...jump,id:2}]);await delay(65);await touch('touchEnd',[]);
   await page.waitForFunction(() => __skateState.air>.08);
   await touch('touchStart',[{...jump,id:3}]);await delay(65);await touch('touchEnd',[]);
   await page.waitForFunction(() => __skateState.flip>0);
   // Camera fingers move in both directions and vertically, just as in the
   // recording. No direct camera, velocity or animation-state writes.
   for (const direction of [-1,1]) {
    const x=285,y=440;
    assert(await page.evaluate(({x,y})=>!document.elementFromPoint(x,y)?.closest('button,input,select,.park-stick'),{x,y}),'camera drag overlaps UI');
    await touch('touchStart',[{x,y,id:7}]);
    for(let n=1;n<=8;n++){await touch('touchMove',[{x:x+direction*95*n/8,y:y+direction*25*n/8,id:7}]);await delay(35);}
    await touch('touchEnd',[]);
   }
   await page.waitForFunction(() => __skateState.air===0);
   const stick=await point('.park-stick'),direction=cycle%2?-1:1;
   await touch('touchStart',[{...stick,id:9}]);
   await touch('touchMove',[{x:stick.x+direction*32,y:stick.y,id:9}]);await delay(650);await touch('touchEnd',[]);await delay(200);
   summaries.push(await page.evaluate(begin => {
    const rows=__touchStress.rows.slice(begin),gaps=rows.map(row=>row.gap).sort((a,b)=>a-b),first=rows[0],last=rows.at(-1);
    return {draws:last.frame-first.frame,maxGap:Math.max(...gaps),p95:gaps[Math.ceil(gaps.length*.95)-1],travel:Math.hypot(last.x-first.x,last.z-first.z),yawRange:Math.max(...rows.map(r=>r.yaw))-Math.min(...rows.map(r=>r.yaw)),peakAir:Math.max(...rows.map(r=>r.air))};
   },begin));
  }
  const state = await page.evaluate(() => {
   const probe=__touchStress,w=__islandWorld;probe.active=false;cancelAnimationFrame(probe.raf);
   for(const type of ['touchstart','touchend','touchcancel'])removeEventListener(type,probe.touch,true);
   return {muted:localStorage.getItem('67park-feel-lab-muted'),graphics:JSON.parse(w.renderer.domElement.dataset.parkGraphics),buffer:[w.renderer.domElement.width,w.renderer.domElement.height],lost:w.renderer.getContext().isContextLost(),connected:__eggyNet.connected&&__candyOnline.data.connected,input:{x:__eggyInput.input.x,z:__eggyInput.input.z},trustedTouches:probe.touches.filter(e=>e.trusted).length,allTouchesTrusted:probe.touches.every(e=>e.trusted)};
  });
  const report={kind:'desktop Chromium mobile viewport; not physical device',cpuRate,summaries,state,errors};
  await page.screenshot({path:output.replace(/\.json$/,'.png')});
  fs.mkdirSync('.qa-results',{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
  assert.deepEqual(errors,[]);assert.equal(state.muted,'1');assert.equal(state.graphics.level,'auto');assert.equal(state.lost,false);assert.equal(state.connected,true);
  assert(state.allTouchesTrusted&&state.trustedTouches>=24);assert.deepEqual(state.input,{x:0,z:0});
  for(const row of summaries){assert(row.draws>20&&row.peakAir>.08&&row.travel>.5&&row.yawRange>.2,JSON.stringify(row));assert(row.maxGap<250&&row.p95<50,JSON.stringify(row));}
  console.log('SKATE_TOUCH_DEFAULT_PASS',JSON.stringify(report));
 } finally {
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});await cdp.detach().catch(()=>{});}
  await context?.close();await browser?.close();
 }
})().catch(error=>{console.error('SKATE_TOUCH_DEFAULT_FAIL',error);process.exitCode=1;});
