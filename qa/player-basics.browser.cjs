const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('This fault-injection suite is loopback-only.');
const out=fs.mkdtempSync('/tmp/67park-player-basics-');
const key='67park.feel-lab.player-settings.v1',errors=[],results=[];
const ready=p=>p.waitForFunction(()=>window.__islandWorld?.ready&&!document.querySelector('.wardrobe')&&window.__eggyNet?.connected&&window.__candyOnline?.data?.connected,null,{timeout:180000});
const live=p=>p.evaluate(()=>({frame:__islandWorld.renderer.info.render.frame,connected:__eggyNet.connected,social:__candyOnline.data.connected,id:__eggyNet.id,errors:__candyErrors}));
const slider=(p,name,value)=>p.getByRole('slider',{name,exact:true}).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
const settings=p=>p.getByRole('button',{name:'Party settings',exact:true}).click();
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const pages=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   const p=await context.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>localStorage.setItem('67park-feel-lab-muted','1'));
   await p.goto(base+'?v=foundation-basics-1',{waitUntil:'domcontentloaded',timeout:120000});
   await p.getByRole('dialog',{name:'Character wardrobe',exact:true}).waitFor({timeout:60000});
   assert.equal(await p.locator('#party-settings-btn').isVisible(),false);
   await p.getByRole('button',{name:'Choose & dress up',exact:true}).click();
   await p.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
   await p.getByRole('button',{name:'Enter the park',exact:true}).click({timeout:180000});await ready(p);
   console.log('BASICS ENTERED',mobile?'mobile':'desktop');
   const before=await live(p),savedAvatar=await p.evaluate(()=>localStorage.getItem('67park-feel-lab.character.v3'));
   await settings(p);await p.waitForFunction(()=>document.querySelector('#settings-connection')?.dataset.state==='connected');
   await slider(p,mobile?'Touch sensitivity':'Mouse sensitivity',145);
   await p.getByRole('switch',{name:'Show player names',exact:true}).click();
   assert.match(await p.locator('#settings-save-status').innerText(),/Settings saved/);
   assert.equal(await p.evaluate(()=>document.documentElement.dataset.parkShowNames),'false');
   await p.getByRole('button',{name:'Restore defaults',exact:true}).click();
   await p.getByRole('button',{name:'Cancel',exact:true}).click();
   assert.equal(await p.getByRole('switch',{name:'Show player names',exact:true}).getAttribute('aria-checked'),'false');
   // Fault injection only affects settings writes, not profile or guest identity.
   await p.evaluate(key=>{window.__qaWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return window.__qaWrite.call(this,k,v)}},key);
   await slider(p,'Sound effects',35);
   assert.match(await p.locator('#settings-save-status').innerText(),/could not be saved/);
   await p.evaluate(()=>{Storage.prototype.setItem=window.__qaWrite;delete window.__qaWrite});
   await p.getByRole('button',{name:'Try saving again',exact:true}).click();
   assert.equal(await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).sfx,key),.35);
   await p.locator('.party-card').evaluate(el=>el.scrollTop=0);await p.screenshot({path:out+'/'+(mobile?'mobile':'desktop')+'-settings.png'});
   await p.getByText('Report a bug',{exact:true}).click();
   await p.getByLabel('What happened?',{exact:true}).fill('I opened the settings and tested saving.');
   await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('Denied by test'))}}));
   await p.getByRole('button',{name:'Copy details',exact:true}).click();
   assert.match(await p.locator('#settings-report-status').innerText(),/including your description/);
   const report=await p.locator('#settings-report').inputValue();assert(report.includes('I opened the settings'));assert(report.includes('foundation-basics-1'));assert(!report.includes('guest.'));
   const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Save bug report',exact:true}).click()]);
   await download.saveAs(out+'/'+(mobile?'mobile':'desktop')+'-report.txt');assert.equal(fs.readFileSync(await download.path(),'utf8'),await p.locator('#settings-report').inputValue());
   assert.equal(await p.evaluate(()=>visualViewport.scale),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await p.keyboard.press('Escape');assert.equal(await p.locator('#party-settings').isVisible(),false);
   // No render pause, held input, new identity or socket per panel open.
   await p.evaluate(()=>{window.__qaSockets=[__eggyNet.ws,__candyOnline.ws];for(let i=0;i<100;i++){document.querySelector('#party-settings-btn').click();document.querySelector('.party-close').click()}});
   await p.waitForTimeout(1000);const after=await live(p);assert(after.frame>before.frame+5);assert.equal(after.id,before.id);
   assert(await p.evaluate(()=>__qaSockets[0]===__eggyNet.ws&&__qaSockets[1]===__candyOnline.ws));
   // Reload retains preferences and enters directly; profile remains in the same page.
   await p.reload({waitUntil:'domcontentloaded'});await ready(p);await settings(p);
   assert.equal(await p.getByRole('slider',{name:'Sound effects',exact:true}).inputValue(),'35');
   assert.equal(await p.getByRole('slider',{name:mobile?'Touch sensitivity':'Mouse sensitivity',exact:true}).inputValue(),'145');
   await p.getByRole('button',{name:'Restore defaults',exact:true}).click();
   await p.getByRole('button',{name:'Reset settings',exact:true}).click();
   assert.equal(await p.getByRole('slider',{name:'Sound effects',exact:true}).inputValue(),'80');
   assert.equal(await p.evaluate(()=>localStorage.getItem('67park-feel-lab.character.v3')),savedAvatar);
   await p.keyboard.press('Escape');await p.getByRole('button',{name:'Profile studio',exact:true}).click();
   await p.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();assert.equal(await p.locator('#party-settings-btn').isVisible(),false);
   assert.equal(new URL(p.url()).pathname,new URL(base).pathname);
   await p.getByRole('button',{name:'Enter the park',exact:true}).click();await ready(p);
   results.push({mobile,before,after,reportIncludesDescription:true});
   console.log('BASICS FLOW PASS',mobile?'mobile':'desktop');
  }
  const [a,b]=pages;const peerBefore=await live(a),identity=(await live(b)).id;
  await settings(b);await b.context().setOffline(true);
  await b.evaluate(()=>{__eggyNet.ws?.close();__candyOnline.ws?.close()});
  await b.waitForFunction(()=>!__eggyNet.connected&&!__candyOnline.data.connected);
  await b.waitForFunction(()=>document.querySelector('#settings-connection').dataset.state==='offline');
  await b.waitForTimeout(2000);assert((await live(a)).frame>peerBefore.frame);assert((await live(a)).connected);
  await b.context().setOffline(false);await ready(b);
  await b.waitForFunction(()=>document.querySelector('#settings-connection').dataset.state==='connected');
  assert.equal((await live(b)).id,identity);await b.keyboard.press('Escape');
  await b.getByRole('button',{name:/^Play & friends/}).click();
  assert(await b.getByText(/Guest test: friends and online progress may be lost/).isVisible());
  for(const p of pages){assert.deepEqual((await live(p)).errors,[])}
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({results,shortOfflineRecovery:true,peerStayedConnected:true,errors},null,2));
  console.log('PLAYER BASICS PASS',out);
 }catch(e){for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:out+'/fail-'+i+'.png'}).catch(()=>{});console.error('Evidence',out);throw e}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
