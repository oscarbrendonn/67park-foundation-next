const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const live=process.argv.includes('--live'),version=process.env.PARK_RELEASE_VERSION||'fairground-20260926-1';
const out='.qa-results/ready-release-'+new Date().toISOString().replaceAll(':','-');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch(browserLaunchOptions()),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),report={live,version,errors:[]};
 try{
  page.on('pageerror',e=>report.errors.push(String(e)));
  await ctx.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));});
  if(!live){
   const files=new Set(execFileSync('git',['diff','--cached','--name-only','--diff-filter=AM'],{encoding:'utf8'}).trim().split('\n'));
   await page.route('https://oscarbrendonn.github.io/67park-foundation-next/**',r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname).replace('/67park-foundation-next/','')||'index.html';if(!files.has(f))return r.continue();const ext=f.split('.').at(-1);return r.fulfill({contentType:({js:'text/javascript',html:'text/html',json:'application/json',css:'text/css'})[ext]||'application/octet-stream',body:fs.readFileSync(f)});});
  }
  await page.goto('https://oscarbrendonn.github.io/67park-foundation-next/?v='+version+'&claudeQA=passive',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__parkTargetClub?.snapshot.site&&window.__eggyInput?.playerRef?.body,null,{timeout:120000});
  report.world=await page.evaluate(()=>{const w=__islandWorld,g=w.scene.getObjectByName('NORTHWEST_SPORTS_V97');return {boat:w.boatContacts?.stats,parking:g.userData.parkingGroundFinish?.stats,fleet:g.userData.parkedFleet38?.stats,pets:!!window.__parkPets,errors:Object.entries(w.renderer.domElement.dataset).filter(([,v])=>v.startsWith('error:'))};});
  assert.equal(report.world.boat?.boats,5);assert.equal(report.world.parking?.drop,.13);assert.equal(report.world.fleet?.removedAttributeBytes,432576);assert(report.world.pets);assert.deepEqual(report.world.errors,[]);
  await page.evaluate(()=>__tp([172,9.82,-143]));await page.locator('#target-club-hint').click();await page.waitForFunction(()=>__parkTargetClub.snapshot.gallery?.triangles>0);
  await page.screenshot({path:out+'/mobile-gallery.png'});await page.getByRole('button',{name:'Play practice',exact:true}).click();
  await page.getByRole('button',{name:'Leave Target Club'}).click();assert.equal(await page.evaluate(()=>__parkTargetClub.snapshot.gallery),null);
  await page.locator('.online-toggle').click();await page.locator('.tc-lobby').waitFor({state:'visible'});await page.screenshot({path:out+'/mobile-lobby.png'});
  report.weekly=await page.evaluate(()=>__parkTargetClub.snapshot.ranking);await page.getByRole('button',{name:'Close panel',exact:true}).click();
  assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.failure=String(e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(out);}
})().catch(e=>{console.error(e);process.exitCode=1;});
