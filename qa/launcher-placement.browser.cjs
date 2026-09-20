const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local QA only');
const out=fs.mkdtempSync('/tmp/67park-hatch-ends-');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1')});
  await page.goto(base+'?v=hatch-ends-1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&!document.querySelector('.wardrobe')&&window.__party?.debug().pads?.length===4,null,{timeout:180000});
  const before=await page.evaluate(()=>({pads:__party.debug().pads,resources:__party.debug().resources,frame:__islandWorld.renderer.info.render.frame}));
  assert.deepEqual(before.pads.filter(p=>p.kind==='hatch').map(p=>[p.x,p.z]),[[245,130],[158,-234]]);
  const launches=[];
  for(const [i,pad]of before.pads.entries()){
   await page.evaluate(p=>{__tp([p.x,p.y+.56,p.z]);__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true)},pad);
   await page.waitForFunction(i=>__party.debug().pads[i].launches>0,i,{timeout:5000});
   await page.waitForTimeout(260);
   const q=await page.evaluate(i=>({pad:__party.debug().pads[i],p:__eggyInput.playerRef.body.translation()}),i);
   assert(q.p.y>pad.y+1.25,'Pad did not launch');launches.push(q);
   await page.waitForTimeout(700);
  }
  for(const [i,pad]of before.pads.filter(p=>p.kind==='hatch').entries()){
   await page.evaluate(p=>{__tp([p.x-1.5,p.y+.56,p.z-2.5]);__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true)},pad);
   await page.waitForTimeout(1200);await page.screenshot({path:out+'/'+(mobile?'mobile':'desktop')+'-hatch-'+i+'.png'});
  }
  const after=await page.evaluate(()=>({resources:__party.debug().resources,frame:__islandWorld.renderer.info.render.frame,errors:__candyErrors,disabled:__party.status().disabled}));
  assert.deepEqual(after.resources,before.resources);assert(after.frame>before.frame);assert.equal(after.disabled,false);assert.deepEqual(after.errors,[]);assert.deepEqual(errors,[]);
  results.push({mobile,placements:before.pads,launches,resources:after.resources,errors});console.log('HATCH PLACEMENT PASS',mobile);await page.close();
 }
 fs.writeFileSync(out+'/report.json',JSON.stringify(results,null,2));console.log('HATCH BROWSER PASS',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
