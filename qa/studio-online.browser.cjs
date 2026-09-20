const {chromium}=require('/tmp/rush-test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.FEEL_URL||'http://127.0.0.1:8497/67park-foundation-next/';
const eq={base:'goril',body:'friendsie_2:2',head:'friendsie_26:90',sprout:'friendsie_8:90',back:'friendsie_2:4',kicks:'friendsie_3333:5',held:null,power:null,vibe:null};
const sceneItems=page=>page.evaluate(()=>{const items=[];window.__eggyScene?.traverse(o=>{if(o.userData.studioEquipment&&typeof o.userData.studioEquipment==='string')items.push(o.userData.studioEquipment)});return items});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[];
 try{
  const contexts=await Promise.all([0,1].map(()=>browser.newContext({viewport:{width:1100,height:800}})));
  const pages=[];
  for(let i=0;i<2;i++){
   const page=await contexts[i].newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
   const outfit=i===0?eq:{base:'friendsie_1'};
   await page.addInitScript(outfit=>{
    if(!localStorage.getItem('67park-feel-lab.character.v3'))localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify(outfit));
    localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:outfit.base}));localStorage.setItem('67park-feel-lab-muted','1');
   },outfit);
   await page.goto(base+'?v=studio-flow-1',{waitUntil:'domcontentloaded',timeout:120000});
   await page.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
   await page.waitForFunction(()=>window.__candyOnline?.data?.me?.id&&window.__eggyInput?.playerRef?.body,null,{timeout:30000});
  }
  const [actor,observer]=pages;
  const actorId=await actor.evaluate(()=>__candyOnline.data.me.id);
  await observer.waitForFunction(id=>window.__candyOnline?.data?.island?.players?.some(p=>p.id===id),actorId,{timeout:30000});
  await observer.waitForFunction(()=>{let n=0;window.__eggyScene?.traverse(o=>{if(typeof o.userData.studioEquipment==='string')n++});return n>=5},null,{timeout:30000});
  for(const page of pages){const items=await sceneItems(page);for(const id of Object.values(eq).filter(x=>typeof x==='string'&&x.includes(':')))assert(items.includes(id),'Rendered equipment missing: '+id)}
  await actor.getByRole('button',{name:'Profile studio',exact:true}).click();
  await actor.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await actor.waitForTimeout(23000);
  assert(await observer.evaluate(id=>__candyOnline.data.island.players.some(p=>p.id===id&&p.connected),actorId),'Studio must retain social presence past disconnect grace');
  await actor.getByRole('button',{name:'Next shoes',exact:true}).click();
  await actor.getByRole('button',{name:'Enter the park',exact:true}).click();await actor.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  await observer.waitForFunction(()=>{let found=false;window.__eggyScene?.traverse(o=>{if(o.userData.studioEquipment==='friendsie_1:3')found=true});return found},null,{timeout:30000});
  await actor.keyboard.down('KeyW');await actor.waitForTimeout(1000);await actor.keyboard.up('KeyW');await actor.waitForTimeout(200);
  await actor.screenshot({path:'/tmp/67park-studio-equipped-park.png'});
  await observer.getByRole('button',{name:'Profile studio',exact:true}).click();await observer.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  assert.equal(await observer.locator('.wardrobe-studio').getAttribute('data-selected-base'),'friendsie_1');
  await observer.getByRole('button',{name:'Next back',exact:true}).click();await observer.getByRole('button',{name:'Enter the park',exact:true}).click();await observer.locator('.wardrobe').waitFor({state:'hidden',timeout:180000});
  const sameId=await actor.evaluate(()=>__candyOnline.data.me.id);assert.equal(sameId,actorId);
  console.log('STUDIO ONLINE + FRIENDS PASS',JSON.stringify({local:await sceneItems(actor),remote:await sceneItems(observer),errors}));
  for(const ctx of contexts)await ctx.close();assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
