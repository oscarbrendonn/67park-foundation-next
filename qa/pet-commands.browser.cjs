const {chromium}=require('playwright');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BASE=process.env.PARK_PET_URL||'http://127.0.0.1:8496/67park-foundation-next/';
const OUT=path.resolve('.qa-results/pet-play-'+new Date().toISOString().replaceAll(':','-'));
const report={url:BASE,output:OUT,errors:[],checks:[]};fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const browser=await chromium.launch(browserLaunchOptions());let page,mobile=false;
  const wait=(fn,arg,timeout=20000)=>page.waitForFunction(fn,arg,{timeout});
  const state=()=>page.evaluate(()=>__parkPets.debug());
  const command=async id=>{
    await page.locator('#park-pet-button')[mobile?'tap':'click']();
    await page.locator('[data-pet-command="'+id+'"]')[mobile?'tap':'click']();
    await page.locator('#park-pet-dialog').waitFor({state:'hidden'});
  };
  const closeup=async name=>{
    const data=await page.evaluate(()=>{
      const w=__islandWorld,p=__eggyInput.playerRef.body.translation(),c=w.camera.clone();
      c.position.set(p.x+2.0,p.y+1.35,p.z+2.8);c.lookAt(p.x+.15,p.y-.05,p.z+.30);c.updateMatrixWorld(true);
      w.renderer.render(w.scene,c);return w.renderer.domElement.toDataURL('image/png');
    });fs.writeFileSync(OUT+'/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
  };
  try{
    page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
    await page.addInitScript(()=>{
      localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));
      localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));
      localStorage.setItem('67park-feel-lab-muted','1');
    });
    await page.goto(BASE+'?v=pet-play-1&pet=dog',{waitUntil:'domcontentloaded',timeout:60000});
    await wait(()=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&window.__parkPets?.debug().active,null,90000);
    await page.locator('.wardrobe').waitFor({state:'hidden',timeout:60000});
    await page.evaluate(()=>__tp([200,10.3,88]));
    await wait(()=>__parkPets.debug().local?.follow.visible);
    await page.waitForTimeout(700);report.initial=await state();console.log('PET_READY',JSON.stringify(report.initial));
    await page.locator('#park-pet-button').click();await page.screenshot({path:OUT+'/commands-desktop.png'});
    assert.equal(await page.getByRole('button',{name:'Feather toy',exact:true}).isVisible(),false);
    await page.getByRole('button',{name:'Close pet commands'}).click();
    for(const [id,pose]of [['sit','sit'],['lie','lie'],['paw','paw']]){
      await command(id);await wait(p=>__parkPets.debug().local?.pose===p,pose);await page.waitForTimeout(450);
      await page.screenshot({path:OUT+'/dog-'+id+'.png'});report.checks.push('dog '+id);
    }
    await command('stay');const held=(await state()).local.position;
    await page.keyboard.down('KeyW');await page.waitForTimeout(750);await page.keyboard.up('KeyW');
    const still=(await state()).local.position;assert(Math.hypot(still[0]-held[0],still[2]-held[2])<.08);report.checks.push('stay while player walks');
    await command('come');await wait(()=>__parkPets.debug().local?.behavior.command==='follow');report.checks.push('come resumes following');
    for(const toy of ['ball','frisbee']){
      await page.waitForTimeout(350);await command(toy);
      await wait(()=>__parkPets.debug().local?.behavior.phase==='return');await page.screenshot({path:OUT+'/dog-return-'+toy+'.png'});
      const previous=(await state()).local.behavior.fetches;await wait(n=>__parkPets.debug().local?.behavior.fetches>n,previous);await wait(()=>__parkPets.debug().local?.behavior.phase==='follow');
      report.checks.push('dog '+toy+' fetched and dropped');
    }
    for(const id of ['pet','treat']){
      await command(id);await wait(id=>__parkPets.debug().local?.behavior.ownerAction===id,id);await page.waitForTimeout(300);
      report[id]=await page.evaluate(()=>{const states=[];__islandWorld.scene.traverse(o=>{if(o.userData.petCare?.active)states.push(o.userData.petCare)});return states});
      assert(report[id].length>0,'Owner care overlay visible');
      assert(report[id].every(s=>s.hand&&s.reachGap<.08),'Care hand reaches the animated head/muzzle');
      await page.screenshot({path:OUT+'/dog-'+id+'.png'});await closeup('dog-'+id+'-close');
      await wait(()=>__parkPets.debug().local?.behavior.phase==='follow');report.checks.push('dog '+id+' and owner pose');
    }
    await page.close();mobile=true;
    page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
    await page.addInitScript(()=>{localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base:'goril'}));localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base:'goril'}));localStorage.setItem('67park-feel-lab-muted','1');});
    await page.goto(BASE+'?v=pet-play-1&pet=cat',{waitUntil:'domcontentloaded'});
    await wait(()=>window.__islandWorld?.ready&&window.__parkPets?.debug().local?.follow.visible,null,90000);
    await page.locator('.wardrobe').waitFor({state:'hidden',timeout:60000});await page.evaluate(()=>__tp([200,10.3,88]));await page.waitForTimeout(700);
    await page.locator('#park-pet-button').tap();await page.screenshot({path:OUT+'/commands-mobile.png'});
    assert(await page.getByRole('button',{name:'Feather toy',exact:true}).isVisible());assert(!await page.getByRole('button',{name:'Throw frisbee',exact:true}).isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');
    for(const id of ['ball','feather','pet','treat']){
      await command(id);
      await wait(()=>['stalk','pounce','swat','rub','eat'].includes(__parkPets.debug().local?.pose));
      if(id==='feather')await page.waitForTimeout(1300);
      await page.screenshot({path:OUT+'/cat-'+id+'.png'});await closeup('cat-'+id+'-close');await wait(()=>__parkPets.debug().local?.behavior.phase==='follow');report.checks.push('cat '+id+' via touch');
    }
    await page.waitForTimeout(1400);
    const tap=await page.evaluate(async()=>{
      const T=await import('three'),w=__islandWorld,pet=w.scene.getObjectByName('67PARK_PET_CAT'),head=pet.getObjectByName('head'),p=head.localToWorld(new T.Vector3(0,.09,-.06));
      p.project(w.camera);const r=w.renderer.domElement.getBoundingClientRect(),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;
      return {x,y,canvas:document.elementFromPoint(x,y)?.tagName==='CANVAS'};
    });
    assert(tap.canvas,'Pet has an unobstructed touch target');await page.touchscreen.tap(tap.x,tap.y);
    await page.locator('#park-pet-dialog').waitFor({state:'visible'});assert.equal((await state()).local.behavior.command,'pet');
    await page.keyboard.press('Escape');await wait(()=>__parkPets.debug().local?.behavior.phase==='follow');report.checks.push('tap the actual pet responds and opens controls');
    report.final=await state();assert.equal(report.final.failed,0);assert.deepEqual(report.errors,[]);
    report.audio=await page.evaluate(()=>__party.sfx.stats());assert.equal(report.audio.state,'none');report.pass=true;
    console.log('PET_COMMANDS_PASS',JSON.stringify({output:OUT,checks:report.checks,errors:report.errors}));
  }catch(error){report.failure=String(error);if(page){report.last=await page.evaluate(()=>({pets:window.__parkPets?.debug(),body:document.body.innerText.slice(-1500),errors:window.__candyErrors}));await page.screenshot({path:OUT+'/failure.png'}).catch(()=>{});}console.error(JSON.stringify(report));throw error;}
  finally{fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
