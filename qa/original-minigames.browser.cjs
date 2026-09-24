// Narrow Ninja selection/animation entry check, not a full game regression.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const base=process.env.PARK_ORIGINAL_URL||'http://127.0.0.1:8496/67park-foundation-next/';
const out=process.env.PARK_ORIGINAL_EVIDENCE||'.qa-results/original-minigames-local';
const read=p=>p.evaluate(()=>window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(browserLaunchOptions()),report={base,games:[]};
 try{for(const game of ['lane-rush','skybound-soft']){
  const context=await browser.newContext({viewport:{width:1100,height:800}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/models/park-originals/'))requests.push(r.url())});
  await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab-muted','1');localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'ninja67',body:'friendsie_2:2',head:'friendsie_26:90',sprout:'friendsie_8:90',back:'friendsie_2:4',kicks:'friendsie_3333:5',held:null,power:null,vibe:null}));});
  try{
   await page.goto(new URL(game+'/',base).href,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__rushReadState?.().phase==='ready'||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}').ready,null,{timeout:90000});
   if(game==='skybound-soft')await page.getByRole('button',{name:'Enter Skypark',exact:true}).click();
   const initial=await read(page);assert.equal(game==='lane-rush'?initial.racers[0].base:initial.base,'ninja67');assert(requests.length>0);
   await page.screenshot({path:out+'/'+game+'-entry.png'});
   if(game==='lane-rush'){await page.getByRole('button',{name:'Start race',exact:true}).click();await page.waitForFunction(()=>__rushReadState().phase==='racing');}
   await page.locator('canvas').focus();await page.keyboard.down('KeyW');await page.keyboard.down('Space');
   let moving;
   try{await page.waitForFunction(()=>{const s=window.__rushReadState?.()||JSON.parse(document.querySelector('canvas[data-character-control]')?.dataset.characterControl||'{}');return s.player?s.player.y>.15:s.verticalVelocity>1},null,{timeout:5000});moving=await read(page);}
   finally{await page.keyboard.up('KeyW');await page.keyboard.up('Space');}
   assert.equal(game==='lane-rush'?moving.racers[0].base:moving.base,'ninja67');assert.deepEqual(errors,[]);
   report.games.push({game,initial,moving,requests,errors});console.log('NINJA_MINIGAME_PASS',game);
  }catch(error){report.failure={game,message:String(error),state:await read(page),errors};await page.screenshot({path:out+'/'+game+'-failure.png'});throw error;}
  finally{await context.close();}
 }}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
