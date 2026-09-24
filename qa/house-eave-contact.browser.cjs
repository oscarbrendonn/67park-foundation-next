// Narrow replay of the reported stationary fall/snap loop; no broad game suite.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {browserLaunchOptions}=require('./browser-launch.cjs');
const baseline=process.argv.includes('--baseline');
const output=process.env.PARK_EAVE_OUTPUT||'.qa-results/house-eave-'+(baseline?'baseline':'fixed');
const url=process.env.PARK_EAVE_URL||'http://127.0.0.1:8496/67park-foundation-next/?claudeQA=passive&qa=eave-contact';
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(browserLaunchOptions());
 const report={url,baseline,kind:'Mobile Chromium with trusted joystick, not physical iPhone',rows:[],errors:[]};
 try{
  for(const base of ['goril','cat67']){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   try{
    await context.addInitScript(base=>{
     localStorage.setItem('67park-feel-lab-muted','1');
     localStorage.setItem('67park-feel-lab.character.v3',JSON.stringify({base}));
     localStorage.setItem('67park-feel-lab.player-profile.v1',JSON.stringify({version:1,base}));
    },base);
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
    if(baseline){
     const old=execFileSync('git',['show','3a95a88d7a555d920892973002d860b4bc111df6:app/house-roof-support.js'],{encoding:'utf8'});
     await page.route('**/app/house-roof-support.js?*',r=>r.fulfill({contentType:'text/javascript',body:old}));
    }
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(base=>window.__islandWorld?.ready&&window.__eggyInput?.playerRef?.body&&document.documentElement.dataset.gameplayAvatarState==='ready'&&JSON.parse(document.querySelector('#claude-gorilla-qa')?.dataset.state||'{}').base===base,base,{timeout:90000});
    const cdp=await context.newCDPSession(page);
    const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    async function drive(worldZ,ms){
     const box=await page.locator('.park-stick').boundingBox(),yaw=await page.evaluate(()=>__islandWorld.camera.userData.feelLab.yaw);
     const x=box.x+box.width/2,y=box.y+box.height/2;
     await touch('touchStart',[{x,y,id:9}]);
     try{await touch('touchMove',[{x:x-35*Math.sin(yaw)*worldZ,y:y+35*Math.cos(yaw)*worldZ,id:9}]);await page.waitForTimeout(ms);}
     finally{await touch('touchEnd');}
    }
    const fixtures=await page.evaluate(()=>{
     const w=__islandWorld,sites=JSON.parse(w.renderer.domElement.dataset.northHomes).placements.filter(p=>['NE01','NE04'].includes(p.id)),fixtures=[];
     for(const s of sites)for(const sign of [-1,1]){
      const x=s.x+sign*1.7*s.scale[0];let previous=null,found=null;
      for(let z=s.bounds[1][2]-1;z<s.bounds[1][2];z+=.05){
       const roof=w.roofSupports.sample(x,z),raw=w.ground(x,z),terrain=w.terrainGround(x,z);
       if(previous?.roof&&!roof&&raw>terrain+3){found={site:s.id,sign,x,z,solidZ:previous.z,terrain,peak:s.bounds[1][1]};break;}
       previous={z,roof};
      }
      if(!found)throw Error('Missing exact eave fixture '+s.id+'/'+sign);fixtures.push(found);
     }return fixtures;
    });assert.equal(fixtures.length,4);
    for(const board of [false,true]){
     if(await page.evaluate(()=>__candy.state().board)!==board)await page.keyboard.press('KeyV');
     await page.waitForFunction(board=>__candy.state().board===board,board);
     for(const fixture of fixtures){
      const row=await page.evaluate(async fixture=>{
       const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input;i.x=i.z=0;i.jumpQueued=false;
       __tp(w.spawn);for(let n=0;n<3;n++)await new Promise(requestAnimationFrame);
       __tp([fixture.x,fixture.peak+.7,fixture.z]);
       const trace=[];
       for(let n=0;n<110;n++){await new Promise(requestAnimationFrame);const p={...b.translation()};trace.push({ms:performance.now(),p,v:{...b.linvel()},support:w.characterGround(p.x,p.z,p.y-.555)});}
       return{fixture,trace,upwardSnaps:trace.filter((v,n)=>n&&v.p.y-trace[n-1].p.y>1).length,after:{...b.translation()}};
      },fixture);Object.assign(row,{base,board});report.rows.push(row);
      if(baseline)assert(row.upwardSnaps>=2,JSON.stringify({...row,trace:undefined}));
      else{
       assert.equal(row.upwardSnaps,0,'No upward correction during stationary descent');
       assert(Math.abs(row.after.y-fixture.terrain-.555)<.1,'Must land on terrain, not hang above it');
       if(fixture.site==='NE01'&&fixture.sign===-1&&!board)await page.screenshot({path:output+'/'+base+'-landed.png'});
       await drive(1,450);row.escaped=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
       assert(row.escaped.z>row.after.z+.8,'Can leave the formerly sticky eave band');
       await drive(-1,850);row.wall=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
       assert(row.wall.z>=fixture.solidZ-.05,'Cannot enter the real front wall');
       assert(Math.abs(row.wall.y-fixture.terrain-.555)<.15,'Wall contact cannot lift onto the roof');
       await drive(1,300);row.retreated=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
       assert(row.retreated.z>row.wall.z+.7,'Can retreat from the solid wall');
      }
      console.log('EAVE_CASE',JSON.stringify({...row,trace:undefined}));
     }
    }
    const state=await page.evaluate(()=>({revision:__islandWorld.roofSupports.stats.revision,muted:localStorage.getItem('67park-feel-lab-muted'),contextLost:__islandWorld.renderer.getContext().isContextLost()}));
    assert.equal(state.muted,'1');assert(!state.contextLost);if(!baseline)assert.equal(state.revision,'house-eave-contact-1');
    report[base]=state;
   }finally{await context.close();}
  }
  assert.equal(report.rows.length,16);assert.deepEqual(report.errors,[]);report.pass=true;
  console.log('EAVE_CONTACT_PASS',JSON.stringify({baseline,cases:report.rows.length}));
 }catch(e){report.failure=String(e);throw e;}
 finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
