const assert=require('node:assert/strict');
const fs=require('node:fs');

module.exports=async function checkWaterImmersion(page,{mobile=false,check,output='.qa-results/water-immersion',label='automatic'}){
 await check('swimmer sits in every island water surface: '+label,async()=>{
  await page.waitForFunction(()=>window.__islandWorld?.parkWaterSurface&&window.__eggyInput?.playerRef?.body&&!document.querySelector('.wardrobe'),null,{timeout:180000});
  const setup=await page.evaluate(()=>{
   const w=__islandWorld,b=__eggyInput.playerRef.body;
   const probe=window.__waterImmersionProbe={old:window.__partyVisual,root:null,samples:[],active:false};
   probe.wrapper=window.__partyVisual=function(root,...args){
    const p={...b.translation()},before=root.position.y,result=probe.old.call(this,root,...args);probe.root=root;
    if(probe.active){probe.latest={x:p.x,z:p.z,body:p.y,level:w.sea(p.x,p.z),before,after:root.position.y,rotation:root.rotation.x,wet:w.water(p.x,p.z),input:{x:__eggyInput.input.x,z:__eggyInput.input.z}};if(probe.samples.length<240)probe.samples.push(probe.latest);}
    return result;
   };
   return {start:{...b.translation()},pool:w.pool.world(0,0),report:w.parkWaterSurface};
  });
  const rows=[];let touch,shore;
  fs.mkdirSync(output,{recursive:true});
  try{
   if(mobile)touch=await page.context().newCDPSession(page);
   for(const [name,x,z] of [['pond',175,90],['east',310,-38],['north',40,-320],['west',-240,-38],['south',40,240],['northwest',-140,-265],['outer-edge',350,-38],['pool',...setup.pool]]){
    const fixture=await page.evaluate(({x,z})=>{
     const w=__islandWorld,b=__eggyInput.playerRef.body,p=__waterImmersionProbe;
     p.active=false;b.setLinvel({x:0,y:0,z:0},true);__tp([x,w.sea(x,z)+.58,z]);
     return {wet:w.water(x,z),level:w.sea(x,z),contains:w.swimBoundary.contains(x,z)};
    },{x,z});
    assert(fixture.wet&&fixture.contains,name+' is swimmable');
    await page.waitForFunction(()=>{const p=__waterImmersionProbe.root,b=__eggyInput.playerRef.body.translation(),w=__islandWorld;return p?.rotation.x>1&&Math.abs(p.position.x-b.x)<.1&&Math.abs(p.position.z-b.z)<.1&&Math.abs(b.y-w.sea(b.x,b.z)-.58)<.05;},null,{timeout:15000});
    const before=await page.evaluate(()=>{const p=__waterImmersionProbe;p.samples=[];p.active=true;return {...__eggyInput.playerRef.body.translation()};});
    try{
     if(mobile){
      const box=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(box,'Movement joystick visible');
      const x=box.x+box.width/2,y=box.y+box.height/2;
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-box.height*.36}]});
     }else await page.keyboard.down('KeyW');
     await page.waitForFunction(start=>{const p=__eggyInput.playerRef.body.translation();return Math.hypot(p.x-start.x,p.z-start.z)>.35;},before,{timeout:30000});
     await page.waitForFunction(()=>__waterImmersionProbe.samples.length>=8,null,{timeout:15000});
    }finally{if(mobile)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');}
    const state=await page.evaluate(()=>{
     const w=__islandWorld,p=__waterImmersionProbe;p.active=false;
     const ocean=w.scene.getObjectByName('KIMI_WATERBODY_GORUNUR');
     return {samples:p.samples,body:{...__eggyInput.playerRef.body.translation()},wet:ocean.material.uniforms.uWet.value,wake:ocean.material.uniforms.uSpeed.value,
      clock:ocean.material.uniforms.uTime.value,profile:JSON.parse(w.renderer.domElement.dataset.parkGraphics),hiddenCap:w.terrain.getObjectByName('9_GOLET_MINI').visible};
    });
    assert(state.samples.every(s=>s.wet&&Math.abs(s.body-s.level-.58)<.11),name+' flotation unchanged');
    assert(state.samples.every(s=>Math.abs(s.before-s.after-.47)<1e-6),name+' receives pond immersion on each rendered pose');
    assert(state.samples.every(s=>Math.abs(s.after-s.level)<.15),name+' visual at waterline');
    assert(state.wet>.5&&state.wake>.01,name+' active swimmer wake');assert.equal(state.hiddenCap,false);
    await page.screenshot({path:output+'/'+(mobile?'mobile':'desktop')+'-'+label+'-'+name+'.png',timeout:90000});
    rows.push({name,fixture,...state});
   }
   // Cross the same authored beach in both directions with real input. Only
   // the initial dry fixture is teleported; entry and exit use the controller.
   if(label==='cold-low'||label==='automatic'){
    const direction=await page.evaluate(()=>{
     const w=__islandWorld,p=__waterImmersionProbe;p.active=false;
     __tp([232,w.ground(232,150)+.555,150]);
     const yaw=w.camera.userData.feelLab.yaw;
     return {x:Math.cos(yaw),z:-Math.sin(yaw)};
    });
    await page.waitForFunction(()=>{const p=__waterImmersionProbe.root,b=__eggyInput.playerRef.body.translation();return !__islandWorld.water(b.x,b.z)&&p?.rotation.x<.1;},null,{timeout:15000});
    shore={};
    for(const entering of [true,false]){
     const sign=entering?1:-1,dx=direction.x*sign,dz=direction.z*sign;
     const key=Math.abs(dx)>Math.abs(dz)?(dx>0?'KeyD':'KeyA'):(dz>0?'KeyW':'KeyS');
     await page.evaluate(()=>{const p=__waterImmersionProbe;p.samples=[];p.active=true;p.legStart={...__eggyInput.playerRef.body.translation()};});
     try{
      if(mobile){
       const b=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(b);
       const x=b.x+b.width/2,y=b.y+b.height/2;
       await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
       // Screen Y grows down, whereas the controller's forward Z grows up.
       await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*b.width*.36,y:y-dz*b.height*.36}]});
       const actual=await page.evaluate(()=>({x:__eggyInput.input.x,z:__eggyInput.input.z}));
       assert(Math.abs(actual.x-dx)<.05&&Math.abs(actual.z-dz)<.05,'joystick maps to the intended world direction');
      }else await page.keyboard.down(key);
      await page.waitForFunction(entering=>{
       const w=__islandWorld,p=__waterImmersionProbe,b=__eggyInput.playerRef.body.translation(),s=p.latest;
       const moved=Math.hypot(b.x-p.legStart.x,b.z-p.legStart.z)>.5;
       // Assert the actual shore transition, not an arbitrary point farther
       // offshore: entering swim releases the existing held touch control.
       return moved&&(entering?w.water(b.x,b.z)&&p.root.rotation.x>1&&s&&Math.abs(s.after-w.sea(b.x,b.z))<.15:
        !w.water(b.x,b.z)&&p.root.rotation.x<.1&&s&&s.before===s.after);
      },entering,{timeout:30000});
     }finally{
      if(mobile)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up(key);
      shore[entering?'entry':'exit']=await page.evaluate(()=>{const p=__waterImmersionProbe;p.active=false;return {body:{...__eggyInput.playerRef.body.translation()},samples:p.samples,latest:p.latest};});
     }
    }
    assert(shore.entry.samples.some(s=>!s.wet),'entry starts dry');
    assert(shore.entry.samples.some(s=>s.wet&&Math.abs(s.before-s.after-.47)<1e-6),'entry becomes immersed');
    assert(shore.exit.samples.some(s=>!s.wet&&s.before===s.after),'exit restores dry pose');
   }
   // Return the real player to dry land and observe rebuilt poses, catching a
   // persistent/cumulative visual offset after leaving any water region.
   await page.evaluate(start=>{const p=__waterImmersionProbe;p.samples=[];p.active=false;__tp([start.x,start.y,start.z]);},setup.start);
   await page.waitForFunction(()=>__waterImmersionProbe.root?.rotation.x<.1,null,{timeout:15000});
   await page.evaluate(()=>{__waterImmersionProbe.samples=[];__waterImmersionProbe.active=true;});
   await page.waitForFunction(()=>__waterImmersionProbe.samples.length>=8,null,{timeout:15000});
   const dry=await page.evaluate(()=>__waterImmersionProbe.samples);assert(dry.every(s=>!s.wet&&s.before===s.after),'dry pose restored');
   console.log('WATER_IMMERSION_PASS',JSON.stringify({mobile,label,sites:rows.length,profile:rows[0].profile,maxVisualOffset:Math.max(...rows.flatMap(r=>r.samples.map(s=>Math.abs(s.after-s.level)))),drySamples:dry.length,shoreline:shore?'real-input-entry-and-exit':'separate-cold-low-check'}));
  }finally{
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await touch.detach();}
   await page.keyboard.up('KeyW').catch(()=>{});
   await page.evaluate(start=>{const p=window.__waterImmersionProbe;if(p&&window.__partyVisual===p.wrapper)window.__partyVisual=p.old;delete window.__waterImmersionProbe;__eggyInput.input.x=__eggyInput.input.z=0;__tp([start.x,start.y,start.z]);},setup.start).catch(()=>{});
   fs.writeFileSync(output+'/'+(mobile?'mobile':'desktop')+'-'+label+'.json',JSON.stringify({mobile,label,setup,rows,shore},null,2));
  }
 });
};
