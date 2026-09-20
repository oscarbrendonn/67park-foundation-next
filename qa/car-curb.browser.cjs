const assert=require('node:assert/strict');

// Drive the parked main-island car with normal keyboard input across the
// entrance curb.  The only setup helper moves the avatar beside the already
// parked vehicle; the vehicle itself is never moved or controlled out of
// band, so server authority, its full footprint and the real input loop are
// all exercised.
module.exports=async function checkCarCurb(page,{mobile=false,check}){
 await check('mounted car climbs the real pink park-path curb',async()=>{
  await page.waitForFunction(()=>
   window.__eggyInput?.playerRef?.body&&
   document.documentElement.dataset.gameplayAvatarState==='ready'&&
   !document.querySelector('.wardrobe'),null,{timeout:30000});

  // A previous browser scenario can have used this same isolated authority.
  // Let the normal empty-car return finish; never teleport the vehicle as QA.
  await page.waitForFunction(()=>{const p=__islandWorld.traffic.cars.find(c=>c.id==='main-mint')?.physics;return p&&Math.hypot(p.x-183,p.z-122)<.5;},null,{timeout:75000});
  const fixture=await page.evaluate(()=>{
   const w=__islandWorld,car=w.traffic.cars.find(c=>c.id==='main-mint');
   const low=w.sample(172,117),high=w.sample(172,115);
   return {
    car:car&&{x:car.physics.x,y:car.physics.y,z:car.physics.z,yaw:car.physics.yaw},
    low:low&&{name:low.object?.name,y:low.point.y},
    high:high&&{name:high.object?.name,y:high.point.y},
    lowDrive:w.traffic.area.check(172,117,0,car?.spec),
    highDrive:w.traffic.area.check(172,115,0,car?.spec),
    player:{...__eggyInput.playerRef.body.translation()}
   };
  });
  assert(fixture.car,'main-island car must be present');
  assert(Math.hypot(fixture.car.x-183,fixture.car.z-122)<.5,'car curb QA requires the isolated parked-car fixture');
  assert.equal(fixture.low?.name,'5_YOL','lower curb side must be the public road');
  assert.equal(fixture.high?.name,'8_PARK_PATIKA_UST','upper curb side must be the pink park path');
  const rise=fixture.high.y-fixture.low.y;
  assert(rise>.2&&rise<=.55,`expected a normal 20–55 cm curb, got ${rise}`);
  assert(fixture.lowDrive.ok&&fixture.highDrive.ok,'car footprint must admit both sides of the normal curb');

  let mounted=false;
  let touch=null,steeringPoint=null,reversePoint=null;
  const carState=()=>page.evaluate(()=>{
   const c=__islandWorld?.traffic?.cars?.find(car=>car.id==='main-mint')?.physics;
   const id=__candyOnline?.data?.me?.id;
   return {
    car:c&&{x:c.x,y:c.y,z:c.z,yaw:c.yaw,speed:c.speed,steer:c.steer,reason:c.reason},
    mounted:__candy?.state?.().mounted,
    onlineMount:id?__candyOnline?.data?.island?.mounts?.[id]:null,
    input:__eggyInput?.input&&{...__eggyInput.input},
    controls:[...document.querySelectorAll('.park-action')].map(button=>({label:button.getAttribute('aria-label'),pressed:button.getAttribute('aria-pressed')}))
   };
  });
  const touchEvent=(type,touchPoints)=>touch.send('Input.dispatchTouchEvent',{type,touchPoints});
  try{
   assert.equal(await page.evaluate(()=>__candy.approach('car',0)),true,'avatar must be placed at the parked car exit');
   await page.waitForTimeout(800);
   await page.keyboard.press('KeyE');
   await page.waitForFunction(()=>__candy.state().mounted==='car',null,{timeout:12000});
   mounted=true;

   // Reverse-left arcs from the public-road stop toward the park entrance.
   // Desktop uses the physical keys. On mobile, wait for the post-mount HUD
   // and exercise the shipped steering wheel and Reverse/Brake touch controls.
   if(mobile){
    const steering=page.getByLabel('Steering wheel — drag left or right',{exact:true});
    const reverse=page.getByRole('button',{name:'Reverse',exact:true});
    const [wheel,reverseBox]=await Promise.all([steering.boundingBox(),reverse.boundingBox()]);
    assert(wheel&&reverseBox,'mobile car steering wheel and reverse control must be visible');
    touch=await page.context().newCDPSession(page);
    steeringPoint={id:1,x:wheel.x+wheel.width/2,y:wheel.y+wheel.height/2};
    reversePoint={id:2,x:reverseBox.x+reverseBox.width/2,y:reverseBox.y+reverseBox.height/2};
    await touchEvent('touchStart',[steeringPoint,reversePoint]);
    await touchEvent('touchMove',[{...steeringPoint,x:steeringPoint.x-wheel.width*.28},reversePoint]);
   }else{
    await page.keyboard.down('KeyS');
    await page.keyboard.down('KeyA');
   }
   await page.waitForFunction(start=>{
    const c=__islandWorld.traffic.cars.find(car=>car.id==='main-mint')?.physics;
    // Heading is server physics, rather than a wall-clock turn duration.
    return c&&c.speed<-2.5&&c.yaw<start.yaw-.5;
   },fixture.car,{timeout:5000});
   if(mobile)await touchEvent('touchMove',[steeringPoint,reversePoint]);
   else await page.keyboard.up('KeyA');
   try{
    await page.waitForFunction(start=>{
     const c=__islandWorld.traffic.cars.find(car=>car.id==='main-mint')?.physics;
     return c&&c.y>=start.y+.2&&c.x<174&&c.z<116.2;
    },fixture.car,{timeout:8000});
   }catch(error){
    console.error('CAR_CURB_ROUTE_FAILURE',JSON.stringify({mobile,error:error.message,state:await carState()}));
    throw error;
   }
   if(mobile){
    await touchEvent('touchEnd',[]);
    const brake=page.getByRole('button',{name:'Brake',exact:true}),brakeBox=await brake.boundingBox();
    assert(brakeBox,'mobile car brake control must remain visible');
    await touchEvent('touchStart',[{id:3,x:brakeBox.x+brakeBox.width/2,y:brakeBox.y+brakeBox.height/2}]);
    await page.waitForTimeout(450);
    await touchEvent('touchEnd',[]);
   }else{
    await page.keyboard.up('KeyS');
    await page.keyboard.down('Space');
    await page.waitForTimeout(450);
    await page.keyboard.up('Space');
   }
   await page.waitForFunction(()=>Math.abs(__islandWorld.traffic.cars.find(c=>c.id==='main-mint').physics.speed)<.08,null,{timeout:5000});

   const crossed=await page.evaluate(()=>{
    const c=__islandWorld.traffic.cars.find(car=>car.id==='main-mint').physics;
    return {x:c.x,y:c.y,z:c.z,speed:c.speed,surface:__islandWorld.sample(c.x,c.z)?.object?.name};
   });
   assert(crossed.y>=fixture.car.y+.2,'authoritative car should finish above the curb');
   assert(crossed.x<174&&crossed.z<116.2,'authoritative car should reach the park-path side');
   assert.equal(crossed.surface,'8_PARK_PATIKA_UST','car must finish on the actual pink path');
   console.log('PASS authoritative car curb',JSON.stringify({mobile,rise,before:fixture.car,after:crossed}));
  }finally{
   if(touch){await touchEvent('touchEnd',[]).catch(()=>{});await touch.detach().catch(()=>{});touch=null;}
   await Promise.all(['KeyA','KeyS','Space'].map(key=>page.keyboard.up(key).catch(()=>{})));
   if(mounted&&await page.evaluate(()=>__candy.state().mounted==='car').catch(()=>false)){
    // An exit request while still moving is intentionally refused. Let the
    // authoritative idle brake finish before issuing the real Exit control.
    const stopped=await page.waitForFunction(()=>Math.abs(__islandWorld.traffic.cars.find(c=>c.id==='main-mint').physics.speed)<.08,null,{timeout:5000}).then(()=>true).catch(async()=>{console.error('CAR_CURB_CLEANUP_STOP_TIMEOUT',JSON.stringify(await carState()));return false;});
    if(stopped){
     if(mobile){
      const exit=page.getByRole('button',{name:'Exit',exact:true});
      if(await exit.isVisible().catch(()=>false))await exit.tap().catch(()=>{});
      else await page.keyboard.press('KeyE').catch(()=>{});
     }else await page.keyboard.press('KeyE').catch(()=>{});
     await page.waitForFunction(()=>__candy.state().mounted!=='car',null,{timeout:5000}).catch(async()=>console.error('CAR_CURB_CLEANUP_EXIT_TIMEOUT',JSON.stringify(await carState())));
    }
   }
   // The isolated test server owns the exercised car.  Restore the avatar so
   // later browser checks begin at their original world position.
   await page.evaluate(start=>{
    const body=__eggyInput?.playerRef?.body;
    if(!body||!start||__candy?.state?.().mounted==='car')return;
    body.setLinvel({x:0,y:0,z:0},true);
    __tp([start.x,start.y,start.z]);
   },fixture.player).catch(()=>{});
  }
 });
};
