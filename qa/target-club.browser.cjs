const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const out='.qa-results/target-club-20260926/'+new Date().toISOString().replaceAll(':','-');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions()),report={out,errors:[],rows:[]};
 try{
  for(const mobile of process.argv.includes('--mobile-only')?[true]:[false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:mobile?'reduce':'no-preference'}),page=await context.newPage(),row={mobile};report.rows.push(row);
   page.on('pageerror',e=>report.errors.push(String(e)));
   await context.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));});
   let pack=execFileSync('git',['show','HEAD:app/party/party-pack.js'],{encoding:'utf8'});
   pack="import {createTargetClub} from './target-club.js?v=target-club-1';\n"+pack;
   const anchor="const state = () => { try { return stateApi ? stateApi() : null; } catch { return null; } };";
   assert.equal(pack.split(anchor).length,2);pack=pack.replace(anchor,anchor+"\nconst targetClub=createTargetClub({world,state,reducedMotion,sound:name=>sfx.play(name)});window.__parkTargetClub=targetClub;");
   pack=pack.replace('player.body = body || null; player.map = map;','player.body = body || null; player.map = map;targetClub.step(body,dt,map);');
   pack=pack.replace('window.__parkToyInteract=()=>','window.__parkToyInteract=()=>targetClub.interact()||');
   await page.route('**/app/party/party-pack.js*',r=>r.fulfill({contentType:'text/javascript',body:pack}));
   await page.route('**/app/party/target-club*',r=>{const file=new URL(r.request().url()).pathname.split('/').at(-1);return r.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync('app/party/'+file)});});
   await page.goto('https://oscarbrendonn.github.io/67park-foundation-next/?v=horn-hold-1&claudeQA=passive&qa=target-club',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&window.__parkTargetClub?.snapshot.site,null,{timeout:120000});
   row.site=await page.evaluate(()=>__parkTargetClub.snapshot.site);
   assert.equal(await page.evaluate(()=>__parkTargetClub.interact()),false,'cannot open from afar');
   await page.evaluate(()=>{const s=__parkTargetClub.snapshot.site;__tp([s.x+4,s.y+.6,s.z]);});
   await page.waitForFunction(()=>!document.querySelector('#target-club-hint')?.hidden,null,{timeout:15000});
   await page.evaluate(()=>{const w=__islandWorld,s=__parkTargetClub.snapshot.site,old=w.scene.onBeforeRender;w.scene.onBeforeRender=function(...a){old?.apply(this,a);w.camera.position.set(s.x+11,s.y+5,s.z+2);w.camera.lookAt(s.x,s.y+2,s.z);w.camera.updateMatrixWorld(true);};});
   await page.evaluate(async()=>{for(let i=0;i<90;i++)await new Promise(requestAnimationFrame);});
   await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-booth.png`});
   if(mobile){const box=await page.getByRole('button',{name:'Interact',exact:true}).boundingBox();assert(box);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else await page.keyboard.press('KeyE');
   await page.locator('#target-club').waitFor({state:'visible'});
   await page.waitForFunction(()=>__parkTargetClub.snapshot.gallery?.triangles>0);
   row.gallery=await page.evaluate(()=>__parkTargetClub.snapshot.gallery);
   await page.locator('.tc-stage').screenshot({path:`${out}/${mobile?'mobile':'desktop'}-gallery.png`});
   await page.getByRole('button',{name:'Play practice',exact:true}).click();
   row.before=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
   const point=await page.evaluate(async()=>{const m=await import('/67park-foundation-next/app/party/target-club-rules.js?v=target-club-1'),s=__parkTargetClub.snapshot,t=m.targetPositions(s,matchMedia('(prefers-reduced-motion: reduce)').matches)[0],r=document.querySelector('#target-club canvas').getBoundingClientRect();return{x:r.x+t.x*r.width/900,y:r.y+t.y*r.height/600};});
   if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
   await page.waitForFunction(()=>__parkTargetClub.snapshot.hits===1,null,{timeout:5000});row.hit=await page.evaluate(()=>__parkTargetClub.snapshot);
   assert.equal(row.hit.score,100);assert.equal(row.hit.shots,1);
   await page.keyboard.press('KeyW');await page.keyboard.press('Space');
   await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-playing.png`});
   row.during=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));assert(Math.hypot(row.during.x-row.before.x,row.during.z-row.before.z)<.03,'no park movement during aiming');
   // Background/blur pause must preserve round time without automatic scoring.
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   const paused=await page.evaluate(()=>__parkTargetClub.snapshot.time);
   await page.evaluate(async()=>{for(let i=0;i<15;i++)await new Promise(requestAnimationFrame);});
   assert.equal(await page.evaluate(()=>__parkTargetClub.snapshot.time),paused);
   await page.getByRole('button',{name:'Resume',exact:true}).click();
   if(!mobile){
    await page.waitForFunction(()=>__parkTargetClub.snapshot.phase==='finished',null,{timeout:40000});
    row.result=await page.evaluate(()=>__parkTargetClub.snapshot);assert(row.result.best>=100);
    await page.screenshot({path:`${out}/desktop-result.png`});
    await page.getByRole('button',{name:'Play again',exact:true}).click();assert.equal(await page.evaluate(()=>__parkTargetClub.snapshot.score),0);
   }
   if(mobile)await page.getByRole('button',{name:'Leave Target Club'}).tap();else await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!__parkTargetClub.active);row.closed=await page.evaluate(async()=>({blocked:(await import('/67park-foundation-next/app/chunk-G7D6MVRW.js?v=online-next-1')).k.blocked,p:{...__eggyInput.playerRef.body.translation()}}));assert.equal(row.closed.blocked,false);
   assert.equal(await page.evaluate(()=>__parkTargetClub.snapshot.gallery),null,'gallery resources released on close');assert.equal(await page.locator('.tc-gallery-hud').count(),0);
   // Re-open proves cleanup/focus/control gates don't leave the stall locked.
   await page.getByRole('button',{name:'Target Club · E / Interact'}).click();await page.getByRole('button',{name:'Leave Target Club'}).click();
   await page.keyboard.down('KeyW');await page.evaluate(async()=>{for(let i=0;i<25;i++)await new Promise(requestAnimationFrame);});await page.keyboard.up('KeyW');
   row.after=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));assert(Math.hypot(row.after.x-row.closed.p.x,row.after.z-row.closed.p.z)>.1,'park movement resumes after leaving');
   row.pass=true;await context.close();
  }
  assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.failure=String(e);throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(out);}
})().catch(e=>{console.error(e);process.exitCode=1;});
