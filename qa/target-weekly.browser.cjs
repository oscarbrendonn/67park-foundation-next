const {chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{browserLaunchOptions}=require('./browser-launch.cjs');
const out='.qa-results/target-weekly-20260926/'+new Date().toISOString().replaceAll(':','-');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const {installTargetClubWeekly,targetWeek}=await import('../server/target-club-weekly.mjs');
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'67park-weekly-ui-')),'scores.json');
 fs.writeFileSync(file,JSON.stringify({version:1,weeks:{[targetWeek(Date.now()).key]:[{id:'other-test-player',name:'Luna',score:25,at:Date.now()-50000,hits:1,shots:1}]}}));
 const player={id:'ui-test',name:'Test Cat',online:{id:'ui-test'},lobbyId:'A',lastPosition:{p:[172,9.7825,-143]}},responses=[],all=[];
 const hub={players:new Map([[player.id,player]]),lobbies:new Map([['A',{members:new Set([player.id])}]]),message(){},update(){},send(ws,m){responses.push(m);all.push(m);},islandWorld:()=>({mounts:new Map()})};
 const server=installTargetClubWeekly({hubs:new Map([['kimi',hub]])},{file});
 const browser=await chromium.launch(browserLaunchOptions()),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'}),page=await ctx.newPage();
 const report={errors:[],transport:'Production handler + client, isolated in-process transport; not production WebSocket/backend',file};
 try{
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.exposeFunction('weeklyTestRequest',m=>{hub.message(player,m);return responses.splice(0);});
  await ctx.addInitScript(()=>{
   localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'cat67'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'cat67'}));
   const ws=new EventTarget();window.weeklyTestOnline={data:{connected:true},ws,send(m){window.weeklyTestRequest(m).then(rows=>{for(const r of rows)ws.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(r)}));});return true;}};
  });
  let pack=execFileSync('git',['show','HEAD:app/party/party-pack.js'],{encoding:'utf8'});
  pack="import {createTargetClub} from './target-club.js?v=target-club-1';\n"+pack;
  const anchor="const state = () => { try { return stateApi ? stateApi() : null; } catch { return null; } };";
  assert.equal(pack.split(anchor).length,2);pack=pack.replace(anchor,anchor+"\nconst targetClub=createTargetClub({world,state,reducedMotion,sound:name=>sfx.play(name),online:()=>window.weeklyTestOnline});window.__parkTargetClub=targetClub;");
  pack=pack.replace('player.body = body || null; player.map = map;','player.body = body || null; player.map = map;targetClub.step(body,dt,map);').replace('window.__parkToyInteract=()=>','window.__parkToyInteract=()=>targetClub.interact()||');
  await page.route('**/app/party/party-pack.js*',r=>r.fulfill({contentType:'text/javascript',body:pack}));
  await page.route('**/app/party/target-club*',r=>{const f=new URL(r.request().url()).pathname.split('/').at(-1);return r.fulfill({contentType:f.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync('app/party/'+f)});});
  await page.goto('https://oscarbrendonn.github.io/67park-foundation-next/?v=horn-hold-1&claudeQA=passive&qa=weekly',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__parkTargetClub?.snapshot.site&&window.__eggyInput?.playerRef?.body,null,{timeout:120000});
  await page.evaluate(()=>__tp([172,9.82,-143]));await page.locator('#target-club-hint').waitFor({state:'visible'});await page.locator('#target-club-hint').click();
  await page.waitForFunction(()=>__parkTargetClub.snapshot.ranking?.available);
  assert.equal(await page.locator('#target-club [aria-label="Weekly leaderboard"]').count(),0,'ranking is no longer embedded in the shooting screen');
  for(const width of [320,390,1100]){
   await page.setViewportSize({width,height:844});
   const layout=await page.evaluate(()=>{const p=document.querySelector('#target-club'),c=p.querySelector('canvas').getBoundingClientRect(),card=p.querySelector('.tc-cover').getBoundingClientRect();return {overflow:p.scrollWidth>p.clientWidth,overlap:card.top<c.bottom,visibleTargets:c.width>250};});
   assert.deepEqual(layout,{overflow:false,overlap:false,visibleTargets:true});
   await page.screenshot({path:out+`/entry-${width}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Play weekly round'}).click();await page.waitForFunction(()=>__parkTargetClub.snapshot.ranked);
  const point=await page.evaluate(async()=>{const rules=await import('/67park-foundation-next/app/party/target-club-rules.js?v=target-club-1'),t=rules.targetPositions(__parkTargetClub.snapshot,false)[0],r=document.querySelector('#target-club canvas').getBoundingClientRect();return {x:r.x+t.x*r.width/900,y:r.y+t.y*r.height/600};});
  await page.touchscreen.tap(point.x,point.y);await page.waitForFunction(()=>__parkTargetClub.snapshot.hits===1);
  await page.getByText('Weekly score saved',{exact:true}).waitFor({timeout:40000});
  report.saved=await page.evaluate(()=>__parkTargetClub.snapshot);assert.equal(report.saved.ranking.you.score,100);assert.equal(report.saved.ranking.you.rank,1);assert.equal(report.saved.ranking.rows.length,2);
  await page.screenshot({path:out+'/mobile-score-saved.png'});
  assert.equal(JSON.parse(fs.readFileSync(file)).weeks[targetWeek(Date.now()).key].find(r=>r.id===player.id).score,100);
  await page.getByRole('button',{name:'Leave Target Club'}).click();
  await page.locator('.online-toggle').click();
  await page.locator('.online-dialog[open] .tc-lobby [data-board-own]').filter({hasText:'Your best: 100 points · #1'}).waitFor();
  assert.equal(await page.locator('.tc-lobby').count(),1);assert.equal(await page.locator('.tc-lobby li').count(),2);
  await page.locator('.tc-lobby').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-lobby-leaderboard.png'});
  const boardRequests=all.filter(m=>m.board).length;
  await page.evaluate(async()=>{for(let i=0;i<40;i++)await new Promise(requestAnimationFrame);});
  assert.equal(all.filter(m=>m.board).length,boardRequests,'no polling on every frame');
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.locator('#target-club-hint').click();
  await page.getByRole('button',{name:'Play weekly round'}).click();await page.waitForFunction(()=>__parkTargetClub.snapshot.ranked);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.getByText('Weekly round cancelled',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Leave Target Club'}).click();assert.equal(server.activeRounds,0);assert.equal(JSON.parse(fs.readFileSync(file)).weeks[targetWeek(Date.now()).key].length,2);
  report.replies=all;assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.failure=String(e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));server.dispose();await browser.close();console.log(out);}
})().catch(e=>{console.error(e);process.exitCode=1;});
