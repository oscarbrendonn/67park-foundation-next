// Candidate UI + real public Mac mini backend. The browser origin is the real
// Pages origin, but game files are overlaid from this checkout. NOT live-release
// evidence. Restart is opt-in and refused if non-test players are connected.
const {chromium}=require('playwright');
const {browserLaunchOptions,assertBrowserRenderer}=require('./browser-launch.cjs');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const path=require('node:path');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const exec=promisify(execFile),root=path.resolve(__dirname,'..');
const origin='https://oscarbrendonn.github.io',prefix='/67park-foundation-next/';
const manifest='https://raw.githubusercontent.com/oscarbrendonn/67park-foundation-next/ops-endpoint/backend.json';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
let stage='start',browser,rotationStartedAt=0;
(async()=>{
 const errors=[];
 try{
  browser=await chromium.launch(browserLaunchOptions());
  const pages=[];
  for(let i=0;i<2;i++){
   const context=await browser.newContext({viewport:{width:1170,height:850}});
   await context.addInitScript(()=>{
    localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
    localStorage.setItem('67park-feel-lab-muted','1');
    localStorage.setItem('67park.feel-lab.player-settings.v1',JSON.stringify({graphics:'low'}));
   });
   await context.route(origin+prefix+'**',async route=>{
    let name=decodeURIComponent(new URL(route.request().url()).pathname.slice(prefix.length));
    if(!name||name.endsWith('/'))name+='index.html';
    const file=path.resolve(root,name);assert(file.startsWith(root+path.sep));
    try{await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Missing candidate asset'});}
   });
   const page=await context.newPage();pages.push(page);
   page.on('pageerror',error=>errors.push(error.message));
  }
  stage='candidate real online entry';
  await Promise.all(pages.map(page=>page.goto(origin+prefix+'?candidate=mac-recovery-1',{waitUntil:'domcontentloaded'})));
  await Promise.all(pages.map(page=>page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyNet?.connected&&window.__candyOnline?.data?.connected&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:150000})));
  await Promise.all(pages.map(page=>assertBrowserRenderer(page)));
  const [first,second]=pages;
  const read=page=>page.evaluate(async()=>{
   window.__qaCurrentEndpoint=(await import('/67park-foundation-next/app/preview-network.js?v=mac-recovery-1')).currentPreviewBackend;
   return {id:__candyOnline.data.me.id,endpoint:__qaCurrentEndpoint(),muted:localStorage.getItem('67park-feel-lab-muted'),frame:__islandWorld.renderer.info.render.frame};
  });
  const before=await Promise.all(pages.map(read));
  assert(before.every(state=>state.muted==='1'));
  const island=await first.evaluate(()=>__candyOnline.data.island.code);
  await first.evaluate(()=>__candyOnline.send({t:'hello',name:'Recovery check A',combo:JSON.stringify({base:'goril'})}));
  await second.evaluate(island=>__candyOnline.send({t:'hello',name:'Recovery check B',combo:JSON.stringify({base:'goril'}),island}),island);
  await second.waitForFunction(id=>__eggyNet.remotes.has(id),before[0].id,{timeout:30000});
  stage='real UI chat and movement';
  await first.locator('.park-chat button').last().click();
  await first.getByPlaceholder('Message everyone…').fill('Mac recovery check');
  await first.locator('.park-chat button').last().click();
  await second.waitForFunction(()=>__eggyNet.chat.some(message=>message.text==='Mac recovery check'),null,{timeout:30000});
  const position=await second.evaluate(id=>__eggyNet.remotes.get(id).targetP,before[0].id);
  await first.keyboard.down('KeyW');await delay(500);await first.keyboard.up('KeyW');
  await second.waitForFunction(({id,position})=>{const p=__eggyNet.remotes.get(id)?.targetP;return p&&Math.hypot(p[0]-position[0],p[2]-position[2])>.25;},{id:before[0].id,position},{timeout:15000});
  let rotated=false,serverRestarted=false;
  if(process.env.ALLOW_PREVIEW_TUNNEL_RESTART_TEST==='1'){
   stage='managed tunnel crash and new hostname recovery';
   const health=await (await fetch('http://127.0.0.1:8498/health')).json();
   assert.equal(health.variants.kimi.online,2,'Do not restart while other players are connected');
   const service='gui/'+process.getuid()+'/com.67park.foundation-next.tunnel';
   const status=(await exec('/bin/launchctl',['print',service])).stdout;
   const pid=Number(status.match(/\n\s*pid = (\d+)/)?.[1]);assert(pid>1);
   const children=(await exec('/bin/ps',['-axo','pid=,ppid=,comm='])).stdout.split('\n').map(line=>line.trim().split(/\s+/));
   const child=children.find(parts=>Number(parts[1])===pid&&parts.slice(2).join(' ').endsWith('/cloudflared'));
   assert(child,'Expected only the managed Cloudflare child');
   rotationStartedAt=Date.now();
   process.kill(Number(child[0]),'SIGKILL');
   await Promise.all(pages.map(page=>page.waitForFunction(previous=>{
    return __qaCurrentEndpoint()!==previous&&__eggyNet?.connected&&__candyOnline?.data?.connected;
   },before[0].endpoint,{timeout:150000})));
   rotated=true;
  }
  if(process.env.ALLOW_PREVIEW_BACKEND_RESTART_TEST==='1'){
   stage='managed authority crash and same-identity browser recovery';
   const health=await (await fetch('http://127.0.0.1:8498/health')).json();
   assert.equal(health.variants.kimi.online,2,'Do not restart while other players are connected');
   await Promise.all(pages.map(page=>page.evaluate(()=>{window.__qaOldSockets=[__eggyNet.ws,__candyOnline.ws];})));
   // Let the test's guest/profile saves finish before the forced crash.
   await delay(1500);
   await exec('/bin/launchctl',['kill','SIGKILL','gui/'+process.getuid()+'/com.67park.foundation-next.backend']);
   await Promise.all(pages.map(page=>page.waitForFunction(()=>__eggyNet.ws!==__qaOldSockets[0]&&__candyOnline.ws!==__qaOldSockets[1]&&__eggyNet?.connected&&__candyOnline?.data?.connected,null,{timeout:90000})));
   serverRestarted=true;
  }
  const after=await Promise.all(pages.map(read));
  assert(after.every((state,index)=>state.id===before[index].id&&state.muted==='1'&&state.frame>before[index].frame));
  assert.equal(after[0].endpoint,after[1].endpoint);
  if(rotated)assert.notEqual(after[0].endpoint,before[0].endpoint);
  const advertised=await (await fetch('https://api.github.com/repos/oscarbrendonn/67park-foundation-next/contents/backend.json?ref=ops-endpoint&verification='+Date.now(),{headers:{Accept:'application/vnd.github.raw+json'}})).json();
  assert.equal(advertised.backend,after[0].endpoint);
  assert.equal(errors.length,0,errors.join('; '));
  await first.screenshot({path:path.join(root,'.qa-results/public-tunnel-recovery.png')});
  const report={pass:true,kind:'candidate UI, real public network',players:2,uiChat:true,movement:true,rotated,serverRestarted,recoveryMs:rotationStartedAt?Date.now()-rotationStartedAt:null,sameIdentities:true,muted:true,oldEndpoint:before[0].endpoint,newEndpoint:after[0].endpoint,pageErrors:errors.length};
  await fs.writeFile(path.join(root,'.qa-results/'+(serverRestarted?'public-backend-browser-recovery':'public-tunnel-recovery')+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PUBLIC_TUNNEL_RECOVERY_PASS',JSON.stringify(report));
 }catch(error){console.error('PUBLIC_TUNNEL_RECOVERY_FAIL',stage,error);process.exitCode=1;}
 finally{await browser?.close();}
})();
