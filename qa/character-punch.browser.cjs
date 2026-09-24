const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const url=process.env.CHARACTER_PUNCH_URL||'http://127.0.0.1:8496/67park-foundation-next/?v=character-punch-1',out=process.env.CHARACTER_PUNCH_EVIDENCE||'.qa-results/character-punch-local';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={url,isolatedFromOtherPlayers:true,physicalPhone:false,profiles:[]};
try{for(const [base,profile,triggers] of [['goril','gorilla-punch',1],['cat67','cat-scratch',2],['ninja67','ninja-strike',1]]){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),row={base,errors:[]};report.profiles.push(row);
 await page.routeWebSocket('**',socket=>socket.close()); // Never punch a real connected player during QA.
 page.on('pageerror',e=>row.errors.push(e.message));
 await page.addInitScript(base=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base,body:'friendsie_2:2',head:'friendsie_26:90'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));},base);
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready',null,{timeout:90000});
  await page.evaluate(()=>{const w=__islandWorld;__tp([163,w.ground(163,121)+.555,121]);});await page.locator('#preview-hit').waitFor({state:'visible'});
  await page.evaluate(base=>{
   let rig;__islandWorld.scene.traverse(o=>{if(o.userData.claudeGorillaAnimation?.base===base&&!o.userData.claudeRemoteCharacter)rig=o;});if(!rig)throw Error('No native rig');
   window.attackWitness={draws:0,samples:[],rig,outfit:!!rig.getObjectByName('Studio_body'),glasses:!!rig.getObjectByName('Studio_head'),stop:false};
   const w=attackWitness;function tick(){if(w.stop)return;const mesh=__islandWorld.scene.getObjectByName('punch-impact-burst');if(mesh)mesh.onBeforeRender=()=>w.draws++;
    w.samples.push({time:performance.now(),action:rig.userData.claudeGorillaAnimation?.action,profile:rig.userData.claudeGorillaAnimation?.punchProfile,hand:rig.getObjectByName('BiscepR').quaternion.toArray(),visible:!!mesh?.visible,scale:mesh?.scale.x,...mesh?.userData.punchBurst});if(w.samples.length>300)w.samples.shift();requestAnimationFrame(tick);}tick();
  },base);
  await page.waitForTimeout(300);await page.locator('#preview-hit').tap();
  await page.waitForFunction(()=>attackWitness.samples.some(s=>s.action==='punch')&&attackWitness.samples.some(s=>s.visible),null,{timeout:5000});
  await page.screenshot({path:out+'/'+base+'-touch.png'});
  await page.waitForFunction(n=>attackWitness.samples.at(-1)?.triggers===n&&!attackWitness.samples.at(-1)?.visible&&attackWitness.samples.at(-1)?.action===null,triggers,{timeout:5000});
  row.normal=await page.evaluate(()=>({draws:attackWitness.draws,outfit:attackWitness.outfit,glasses:attackWitness.glasses,samples:attackWitness.samples}));
  assert(row.normal.draws>0);assert(row.normal.outfit&&row.normal.glasses);assert(row.normal.samples.filter(s=>s.action==='punch').every(s=>s.profile===profile));
  assert(row.normal.samples.some(s=>s.visible&&s.profile===profile));assert.equal(row.normal.samples.at(-1).triggers,triggers);
  await page.waitForTimeout(700);await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('KeyF');
  await page.waitForFunction(n=>attackWitness.samples.at(-1)?.triggers===n&&!attackWitness.samples.at(-1)?.visible&&attackWitness.samples.at(-1)?.action===null,triggers*2,{timeout:5000});
  row.reduced=await page.evaluate(n=>attackWitness.samples.filter(s=>s.visible&&s.triggers>n),triggers);assert(row.reduced.length);assert(row.reduced.every(s=>s.scale===.9));
  await page.waitForTimeout(700);await page.evaluate(async()=>{const {setPlayerSetting}=await import('/67park-foundation-next/app/player-settings.js');setPlayerSetting('juice',false);});await page.locator('#preview-hit').tap();await page.waitForTimeout(600);
  row.disabled=await page.evaluate(()=>{const m=__islandWorld.scene.getObjectByName('punch-impact-burst');return {...m.userData.punchBurst,visible:m.visible,meshes:__islandWorld.scene.children.filter(o=>o.name==='punch-impact-burst').length,action:attackWitness.rig.userData.claudeGorillaAnimation.action}});
  assert.equal(row.disabled.triggers,triggers*2);assert.equal(row.disabled.visible,false);assert.equal(row.disabled.meshes,1);assert.equal(row.disabled.action,null);assert.deepEqual(row.errors,[]);row.pass=true;
  console.log('CHARACTER_PUNCH_PASS',base,'touch+F',profile,'outfit+glasses','realDraws='+row.normal.draws);
 }catch(e){row.failure=String(e);row.samples=await page.evaluate(()=>attackWitness?.samples).catch(()=>null);await page.screenshot({path:out+'/'+base+'-failure.png'}).catch(()=>{});throw e;}
 finally{await page.evaluate(()=>{if(window.attackWitness)attackWitness.stop=true;}).catch(()=>{});await context.close();}
}}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
