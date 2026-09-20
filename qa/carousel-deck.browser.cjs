const assert=require('node:assert/strict');

module.exports=async function checkCarouselDeck(page,{mobile=false,check}){
 const original=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
 const jump=()=>mobile?page.getByRole('button',{name:'Jump',exact:true}).tap():page.keyboard.press('Space');
 try{
  for(const asset of ['carousel','carouselSmall']){
   await check(asset+': standing avatar follows the visible rotating deck',async()=>{
    const result=await page.evaluate(async asset=>{
     const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input;
     const ride=w.rides.find(r=>r.asset===asset),d=ride.deck();
     const frame=()=>new Promise(requestAnimationFrame);
     i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);
     __tp(w.spawn);for(let f=0;f<4;f++)await frame();
     const x=d.center.x+d.radius*.65,z=d.center.z;
     __tp([x,d.ground(x,z)+.555,z]);for(let f=0;f<15;f++)await frame();
     const start={...b.translation()},angle=d.angle,time=performance.now();let frames=0;
     while(Math.atan2(Math.sin(d.angle-angle),Math.cos(d.angle-angle))<.45){
      await frame();frames++;
      if(performance.now()-time>45000)throw Error('Carousel network clock did not advance');
     }
     const end={...b.translation()},delta=Math.atan2(Math.sin(d.angle-angle),Math.cos(d.angle-angle));
     const dx=start.x-d.center.x,dz=start.z-d.center.z;
     const expected={x:d.center.x+Math.cos(delta)*dx+Math.sin(delta)*dz,z:d.center.z-Math.sin(delta)*dx+Math.cos(delta)*dz};
     return {asset,start,end,delta,frames,expected,error:Math.hypot(end.x-expected.x,end.z-expected.z),distance:Math.hypot(end.x-start.x,end.z-start.z),floor:d.ground(end.x,end.z),visualAngle:ride.group.getObjectByName('LUNA84_CAROUSEL').rotation.y,angle:d.angle,mounted:__candy.state().mounted,muted:localStorage.getItem('67park-feel-lab-muted')};
    },asset);
    assert(!result.mounted,JSON.stringify(result));assert.equal(result.muted,'1');
    assert(result.frames>=3&&result.delta>=.45,JSON.stringify(result));
    assert(result.distance>.35&&result.error<.12,JSON.stringify(result));
    assert(Math.abs(result.end.y-result.floor-.555)<.1,JSON.stringify(result));
    assert(Math.abs(result.visualAngle-result.angle)<1e-6,JSON.stringify(result));
    console.log('PASS carousel deck orbit',JSON.stringify({mobile,...result}));
    await page.screenshot({path:'.qa-results/deck-'+asset+'-'+(mobile?'mobile':'desktop')+'.png'});
   });
   await check(asset+': an idle skateboard follows the same deck clock',async()=>{
    await page.keyboard.press('KeyV');
    try{
     const result=await page.evaluate(async asset=>{
      if(!__candy.state().board)throw Error('Skate mode did not activate');
      const d=__islandWorld.rides.find(r=>r.asset===asset).deck(),b=__eggyInput.playerRef.body;
      for(let f=0;f<4;f++)await new Promise(requestAnimationFrame);
      const p={...b.translation()},a=d.angle,started=performance.now();
      while(Math.atan2(Math.sin(d.angle-a),Math.cos(d.angle-a))<.2){await new Promise(requestAnimationFrame);if(performance.now()-started>30000)throw Error('Skate deck clock stopped');}
      const q={...b.translation()},delta=Math.atan2(Math.sin(d.angle-a),Math.cos(d.angle-a)),dx=p.x-d.center.x,dz=p.z-d.center.z;
      return {distance:Math.hypot(q.x-p.x,q.z-p.z),error:Math.hypot(q.x-d.center.x-Math.cos(delta)*dx-Math.sin(delta)*dz,q.z-d.center.z+Math.sin(delta)*dx-Math.cos(delta)*dz)};
     },asset);
     assert(result.distance>.2&&result.error<.12,JSON.stringify(result));
     console.log('PASS carousel skate',JSON.stringify({mobile,asset,...result}));
    }finally{if(await page.evaluate(()=>__candy.state().board))await page.keyboard.press('KeyV');}
   });
   await check(asset+': jump releases deck transport and landing resumes it',async()=>{
    await jump();
    const airborne=await page.evaluate(async asset=>{
     const b=__eggyInput.playerRef.body,d=__islandWorld.rides.find(r=>r.asset===asset).deck();
     const rows=[],started=performance.now();let wasAirborne=false;
     while(performance.now()-started<30000){
      await new Promise(requestAnimationFrame);
      const p={...b.translation()},floor=d.ground(p.x,p.z),gap=p.y-.555-floor;
      if(gap>.4){rows.push({p,angle:d.angle,gap});wasAirborne=true;}
      if(wasAirborne&&gap<.08&&Math.abs(b.linvel().y)<.2)break;
     }
     if(rows.length<3)throw Error('Actual jump did not produce enough airborne frames: '+JSON.stringify(rows));
     const a=rows[0],z=rows.at(-1);
     return {samples:rows.length,maxGap:Math.max(...rows.map(r=>r.gap)),airTravel:Math.hypot(z.p.x-a.p.x,z.p.z-a.p.z),angleChange:z.angle-a.angle,landed:{...b.translation()},floor:d.ground(b.translation().x,b.translation().z)};
    },asset);
    assert(airborne.maxGap>.8&&airborne.airTravel<.08,JSON.stringify(airborne));
    assert(Math.abs(airborne.landed.y-airborne.floor-.555)<.1,JSON.stringify(airborne));
    const resumed=await page.evaluate(async asset=>{
     const d=__islandWorld.rides.find(r=>r.asset===asset).deck(),b=__eggyInput.playerRef.body;
     const p={...b.translation()},a=d.angle,start=performance.now();
     while(Math.atan2(Math.sin(d.angle-a),Math.cos(d.angle-a))<.15){await new Promise(requestAnimationFrame);if(performance.now()-start>30000)throw Error('Landing clock stopped');}
     return {distance:Math.hypot(b.translation().x-p.x,b.translation().z-p.z)};
    },asset);
    assert(resumed.distance>.12,JSON.stringify(resumed));
    console.log('PASS carousel jump',JSON.stringify({mobile,asset,...airborne,resumed}));
   });
   await check(asset+': walking off releases the avatar without a blocked-path cue',async()=>{
    const result=await page.evaluate(async asset=>{
     const w=__islandWorld,d=w.rides.find(r=>r.asset===asset).deck(),b=__eggyInput.playerRef.body,i=__eggyInput.input;
     const started=performance.now();let radius=0;
     try{
      do{
       const p=b.translation(),dx=p.x-d.center.x,dz=p.z-d.center.z,yaw=w.camera.userData.feelLab.yaw;radius=Math.hypot(dx,dz);
       i.x=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/radius;i.z=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/radius;
       await new Promise(requestAnimationFrame);
       if(performance.now()-started>45000)throw Error('Could not walk off carousel: '+JSON.stringify({asset,p,radius,target:d.radius+.8}));
      }while(radius<d.radius+.8);
     }finally{i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);}
     for(let f=0;f<20;f++)await new Promise(requestAnimationFrame);
     const start={...b.translation()};for(let f=0;f<20;f++)await new Promise(requestAnimationFrame);
     const end={...b.translation()};
     return {radius,deckRadius:d.radius,drift:Math.hypot(end.x-start.x,end.z-start.z),cue:!!document.querySelector('#park-contact-cue:not([hidden])')};
    },asset);
    assert(result.radius>result.deckRadius+.7&&result.drift<.08&&!result.cue,JSON.stringify(result));
    console.log('PASS carousel exit',JSON.stringify({mobile,asset,...result}));
   });
  }
 }finally{
  await page.evaluate(p=>{const i=__eggyInput.input;i.x=i.z=0;i.run=false;__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true);__tp([p.x,p.y,p.z]);},original);
 }
};
