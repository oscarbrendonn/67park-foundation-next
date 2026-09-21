// Full historical client versus the candidate, on the same loopback QA backend.
// The reference is an immutable git archive, not the user's original checkout.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const reference=process.env.PARK_REFERENCE_ROOT;
if(!reference||!fs.existsSync(path.join(reference,'index.html')))throw Error('PARK_REFERENCE_ROOT must name a b3ea3c2 git archive');
const origin=process.env.PARK_QA_ORIGIN||'http://127.0.0.1:8499';
const networkDiagnostic=process.env.PARK_REFERENCE_NETWORK_DIAG==='1';
// A route-fulfilled archive is classified as a public initiator by Chromium,
// even though its URL is loopback. Keep this test-only workaround opt-in and
// apply it to both reference and candidate runs when an online comparison is
// required.
const bypassLocalNetworkAccess=process.env.PARK_REFERENCE_BYPASS_LNA==='1';
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
async function run(historical,mobile){
 const launch=browserLaunchOptions();if(bypassLocalNetworkAccess)launch.args=[...(launch.args||[]),'--disable-features=LocalNetworkAccessChecks'];
 const browser=await chromium.launch(launch),context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[],network=[],sockets=[],socketPaths=new Map();
 const cdp=await context.newCDPSession(page),socketPath=url=>{try{return new URL(url).pathname.includes('/kimi/')?new URL(url).pathname:null;}catch{return null;}};
 await cdp.send('Network.enable');
 cdp.on('Network.webSocketCreated',event=>{const path=socketPath(event.url);if(path){socketPaths.set(event.requestId,path);sockets.push({event:'created',path});}});
 cdp.on('Network.webSocketHandshakeResponseReceived',event=>{const path=socketPaths.get(event.requestId);if(path)sockets.push({event:'handshake',path,status:event.response.status});});
 cdp.on('Network.webSocketClosed',event=>{const path=socketPaths.get(event.requestId);if(path)sockets.push({event:'closed',path});});
 cdp.on('Network.webSocketFrameError',event=>{const path=socketPaths.get(event.requestId);if(path)sockets.push({event:'frame-error',path,error:String(event.errorMessage||'').slice(0,160)});});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.url().includes('/kimi/'))network.push({path:new URL(r.url()).pathname,status:r.status()});});
 page.on('requestfailed',r=>{if(r.url().includes('/kimi/'))network.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText});});
 try{
  if(historical)await page.route('**/67park-feel-lab/**',async route=>{
   let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/67park-feel-lab\//,'');
   if(!relative||relative.endsWith('/'))relative+='index.html';
   if(relative==='app/preview-network-config.js')return route.fulfill({status:200,contentType:'application/javascript',body:`export const PREVIEW_BACKEND=${JSON.stringify(origin)};export const PREVIEW_VARIANT="kimi";`});
   const file=path.resolve(reference,relative);
   if(!file.startsWith(path.resolve(reference)+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Historical file absent'});
   return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',path:file});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
   localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
   localStorage.setItem('67park-feel-lab-muted','1');
  });
  await page.goto(origin+(historical?'/67park-feel-lab/':'/67park-foundation-next/')+'?claudeQA=passive&healthyReference=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:180000});
  await assertBrowserRenderer(page);
  if(networkDiagnostic){
   const appOnline=await page.evaluate(async()=>{
    const read=()=>({eggyConnected:!!window.__eggyNet?.connected,eggySocketState:window.__eggyNet?.ws?.readyState??null,candyConnected:!!window.__candyOnline?.data?.connected});
    const before=read(),started=performance.now();
    while(performance.now()-started<4000&&!read().eggyConnected)await new Promise(resolve=>setTimeout(resolve,100));
    return {before,after:read(),waitedMs:Math.round(performance.now()-started)};
   });
   // This is a fresh, token-free QA guest. It uses the archived client's exact
   // session and subprotocol wire format without replacing its app socket.
   const wireProbe=await page.evaluate(async backend=>{
    const response=await fetch(backend+'/kimi/api/session',{mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(!response.ok)return {sessionStatus:response.status};
    const session=await response.json();
    if(typeof session?.token!=='string')return {sessionStatus:response.status,sessionShape:'invalid'};
    const address=new URL(backend+'/kimi/ws');address.protocol=address.protocol==='https:'?'wss:':'ws:';
    return await new Promise(resolve=>{
     const ws=new WebSocket(address,['67park-v1','guest.'+session.token]);let settled=false;
     const finish=value=>{if(!settled){settled=true;clearTimeout(timer);resolve({sessionStatus:response.status,...value});}};
     const timer=setTimeout(()=>{try{ws.close(1000,'qa probe timeout');}catch{}finish({timeout:true});},5000);
     ws.onopen=()=>{try{ws.close(1000,'qa probe complete');}catch{};};
     ws.onmessage=event=>{let type='message';try{type=JSON.parse(event.data).type||type;}catch{}finish({opened:true,firstMessage:type});try{ws.close(1000,'qa probe complete');}catch{};};
     ws.onerror=()=>finish({socketError:true});
     ws.onclose=event=>finish({closed:true,closeCode:event.code,closeReason:String(event.reason||'').slice(0,120),clean:event.wasClean});
    });
   },origin);
   return {revision:'b3ea3c2893aedbb7c590de4e454577850b64662c',mobileViewport:false,errors,network,sockets,appOnline,wireProbe};
  }
  if(!await page.evaluate(()=>__candy.state().board)){await page.keyboard.press('KeyV');await page.waitForFunction(()=>__candy.state().board);}
  await page.evaluate(async()=>{const w=__islandWorld;__tp([-15,w.ground(-15,100)+.555,100]);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  let cycles=0;
  for(let i=0;i<2;i++){
   await page.keyboard.press('Space');await page.waitForFunction(()=>__skateState.air>.08);
   await page.keyboard.press('Space');await page.waitForFunction(()=>__skateState.flip>0);
   await page.waitForFunction(()=>__skateState.air===0);cycles++;
  }
  const before=await page.evaluate(()=>{
   const w=__islandWorld,probe=window.__healthyReferenceProbe={active:true,last:0,gaps:[]};
   probe.tick=t=>{if(!probe.active)return;if(probe.last)probe.gaps.push(t-probe.last);probe.last=t;probe.id=requestAnimationFrame(probe.tick);};probe.id=requestAnimationFrame(probe.tick);
   return {p:__eggyInput.playerRef.body.translation(),frame:w.renderer.info.render.frame,start:performance.now(),ratio:w.renderer.getPixelRatio(),buffer:[w.renderer.domElement.width,w.renderer.domElement.height]};
  });
  await page.keyboard.down('KeyD');await page.waitForTimeout(1050);await page.keyboard.up('KeyD');await page.waitForTimeout(120);
  const motion=await page.evaluate(before=>{
   const p=__healthyReferenceProbe,w=__islandWorld;p.active=false;cancelAnimationFrame(p.id);
   const after=__eggyInput.playerRef.body.translation(),gaps=[...p.gaps].sort((a,b)=>a-b);
   return {rendered:w.renderer.info.render.frame-before.frame,elapsedMs:performance.now()-before.start,travel:Math.hypot(after.x-before.p.x,after.z-before.p.z),gaps:{count:gaps.length,max:Math.max(0,...gaps),p95:gaps[Math.max(0,Math.ceil(gaps.length*.95)-1)]||0},position:after,skate:{...__skateState},camera:w.camera.position.toArray(),ratio:before.ratio,buffer:before.buffer,muted:localStorage.getItem('67park-feel-lab-muted'),online:!!window.__eggyNet?.connected};
  },before);
  assert.equal(motion.muted,'1');assert.equal(cycles,2);assert(motion.travel>3);assert(motion.rendered>3);assert.deepEqual(errors,[]);
  return {revision:historical?'b3ea3c2893aedbb7c590de4e454577850b64662c':'candidate working tree',mobileViewport:mobile,cycles,...motion,errors,network};
 }finally{try{await cdp.detach();}catch{}await context.close();await browser.close();}
}
(async()=>{
 const report={note:networkDiagnostic?'Single historical bootstrap and exact-wire-format socket probe; no motion benchmark.':'Full historical client, identical loopback QA backend and hardware Chromium. Mobile viewport is NOT a physical phone.',runs:[]};
 for(const mobile of (networkDiagnostic||process.env.PARK_REFERENCE_DIAG? [false]:[false,true]))for(const historical of (networkDiagnostic||process.env.PARK_REFERENCE_DIAG?[true]:[true,false])){const row=await run(historical,mobile);report.runs.push(row);console.log('HEALTHY_REFERENCE_PHASE',JSON.stringify(row));}
 fs.mkdirSync('.qa-results',{recursive:true});fs.writeFileSync(networkDiagnostic?`.qa-results/healthy-reference-network-diagnostic${bypassLocalNetworkAccess?'-lna-bypass':''}.json`:bypassLocalNetworkAccess?'.qa-results/healthy-reference-compare-equal-network.json':'.qa-results/healthy-reference-compare.json',JSON.stringify(report,null,2));console.log(networkDiagnostic?'HEALTHY_REFERENCE_NETWORK_DIAGNOSTIC_PASS':'HEALTHY_REFERENCE_COMPARE_PASS');
})().catch(e=>{console.error('HEALTHY_REFERENCE_COMPARE_FAIL',e);process.exitCode=1;});
