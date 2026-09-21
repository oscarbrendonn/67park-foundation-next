const assert=require('node:assert/strict');

// This is deliberately a player-loop check, rather than a sampler-only probe:
// the reported positions have passed through the same walk/skate contact sweep
// that players use in the shipped park.
module.exports=async function checkRideContacts(page,{mobile=false,check}){
 const original=await page.evaluate(()=>{
  const b=__eggyInput.playerRef.body,i=__eggyInput.input;
  return {p:{...b.translation()},board:!!__candy.state().board,input:{x:i.x,z:i.z,run:i.run,jumpQueued:i.jumpQueued}};
 });
 const jump=()=>mobile?page.getByRole('button',{name:'Jump',exact:true}).tap():page.keyboard.press('Space');
 const board=async on=>{
  if(await page.evaluate(()=>!!__candy.state().board)!==on){
   await page.keyboard.press('KeyV');
   await page.waitForFunction(value=>!!__candy.state().board===value,on,{timeout:45000});
  }
 };
 try{
  await check('ride contacts: controller walk and skate cross the open coaster bay',async()=>{
   const rows=[];
   for(const skating of [false,true]){
    await board(skating);
    const row=await page.evaluate(async skating=>{
     const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input;
     const frame=()=>new Promise(requestAnimationFrame),base=9.46255,foot=.555;
     const stop=()=>{i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);};
     const start=(x,z)=>{
      const floor=w.characterGround(x,z,base,.36);
      if(!Number.isFinite(floor)||Math.abs(floor-base)>.08)throw Error('Coaster start lost its low foot floor: '+JSON.stringify({x,z,base,floor}));
      stop();__tp([x,floor+foot,z]);return floor;
     };
     const drive=async target=>{
      const begun=performance.now(),from={...b.translation()},route=Math.hypot(target.x-from.x,target.z-from.z);
      let last=-Infinity,stalled=0,frames=0;
      while(frames++<12000){
       const p=b.translation(),dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz);
       const progress=((p.x-from.x)*(target.x-from.x)+(p.z-from.z)*(target.z-from.z))/route;
       if(distance<.18||progress>route-.12){stop();return {arrived:true,frames,progress,distance};}
       const yaw=w.camera.userData.feelLab.yaw;
       i.x=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/distance;
       i.z=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;
       await frame();
       const after=b.translation(),next=((after.x-from.x)*(target.x-from.x)+(after.z-from.z)*(target.z-from.z))/route;
       stalled=next>last+.002?0:stalled+1;last=Math.max(last,next);
       if(stalled>18){stop();return {arrived:false,frames,progress:next,distance:Math.hypot(target.x-after.x,target.z-after.z)};}
       if(performance.now()-begun>45000)throw Error('Coaster route exceeded 45 seconds: '+JSON.stringify({skating,target,p,progress:next}));
      }
      throw Error('Coaster route reached frame limit');
     };
     try{
      const floor=start(187.5,-112);for(let f=0;f<3;f++)await frame();
      const result=await drive({x:187.5,z:-104});for(let f=0;f<3;f++)await frame();
      const p={...b.translation()},ground=w.characterGround(p.x,p.z,p.y-foot,.36);
      return {skating,floor,result,start:{x:187.5,z:-112},end:p,ground,mounted:__candy.state().mounted,board:!!__candy.state().board,muted:localStorage.getItem('67park-feel-lab-muted'),cue:!!document.querySelector('#park-contact-cue:not([hidden])')};
     }finally{stop();}
    },skating);
    assert.equal(row.mounted,null,JSON.stringify(row));assert.equal(row.board,skating,JSON.stringify(row));assert.equal(row.muted,'1');
    assert(row.result.arrived&&row.end.z>-104.3,JSON.stringify(row));
    assert(Math.abs(row.end.y-row.ground-.555)<.12,JSON.stringify(row));assert(!row.cue,JSON.stringify(row));
    rows.push(row);
   }
   console.log('PASS coaster open bay',JSON.stringify({mobile,rows}));
  });

  await check('ride contacts: a real coaster column blocks walk and skate',async()=>{
   const rows=[];
   for(const skating of [false,true]){
    await board(skating);
    const row=await page.evaluate(async skating=>{
     const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input;
     const frame=()=>new Promise(requestAnimationFrame),base=9.46255,foot=.555,x=185.947069;
     const stop=()=>{i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);};
     try{
      const floor=w.characterGround(x,-109.5,base,.36);
      if(Math.abs(floor-base)>.08)throw Error('Column start floor changed: '+JSON.stringify({floor,base}));
      stop();__tp([x,floor+foot,-109.5]);for(let f=0;f<3;f++)await frame();
      const from={...b.translation()},target={x,z:-104},length=Math.hypot(target.x-from.x,target.z-from.z),started=performance.now();
      let last=-Infinity,stalled=0,frames=0;
      while(frames++<12000){
       const p=b.translation(),dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz),yaw=w.camera.userData.feelLab.yaw;
       i.x=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/distance;i.z=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;
       await frame();const q=b.translation(),progress=((q.x-from.x)*(target.x-from.x)+(q.z-from.z)*(target.z-from.z))/length;
       stalled=progress>last+.002?0:stalled+1;last=Math.max(last,progress);
       if(stalled>18)break;
       if(progress>length-.12)throw Error('Walked through real coaster column: '+JSON.stringify({skating,q,progress}));
       if(performance.now()-started>45000)throw Error('Column contact exceeded 45 seconds');
      }
      stop();for(let f=0;f<3;f++)await frame();
      const p={...b.translation()};return {skating,p,frames,stalled,entered:p.z>-109.3,contact:w.rideContacts.sample(x,-106.092569),mounted:__candy.state().mounted,board:!!__candy.state().board};
     }finally{stop();}
    },skating);
    assert.equal(row.mounted,null,JSON.stringify(row));assert.equal(row.board,skating,JSON.stringify(row));
    assert(row.entered&&row.stalled>18&&row.p.z<-106.7,JSON.stringify(row));
    assert(row.contact.intervals.some(span=>span.min<9.5&&span.max>11.5),JSON.stringify(row));rows.push(row);
   }
   console.log('PASS coaster column',JSON.stringify({mobile,rows}));
  });

  await check('ride contacts: an unmounted avatar stands on and follows a moving Ferris cabin',async()=>{
   await board(false);
   const result=await page.evaluate(async()=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris');
    const frame=()=>new Promise(requestAnimationFrame),foot=.555,stop=()=>{i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);};
    const lowest=()=>{
     let best=null,seat=null;for(let cabin=0;cabin<12;cabin++){const next=ride.seat(cabin*4);if(Math.abs(next.position.x-173)<=5)continue;if(!seat||next.floor<seat.floor){best=cabin;seat=next;}}
     if(best===null)throw Error('No low Ferris cabin clear of the A-frame');return {cabin:best,seat};
    };
    const point=cabin=>{const seat=ride.seat(cabin*4);return {x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975,floor:seat.floor};};
    try{
     stop();const picked=lowest(),initial=point(picked.cabin);__tp([initial.x,initial.y,initial.z]);for(let f=0;f<12;f++)await frame();
     const rows=[],started=performance.now();let prior=point(picked.cabin),frames=0;
     while(frames++<12000){
      await frame();const expected=point(picked.cabin),p={...b.translation()};
      rows.push({expected,p,gap:p.y-expected.floor-foot,relativeX:p.x-expected.x,relativeZ:p.z-expected.z});
      if(rows.length>=3&&Math.hypot(expected.x-initial.x,expected.y-initial.y)> .12)break;
      prior=expected;
     if(performance.now()-started>45000)throw Error('Ferris cabin did not move far enough: '+JSON.stringify({rows,initial,prior}));
     }
     if(frames>=12000)throw Error('Ferris cabin sample limit reached');
     const final=rows.at(-1),travel=Math.hypot(final.expected.x-initial.x,final.expected.y-initial.y);
     return {cabin:picked.cabin,rows,travel,maxGap:Math.max(...rows.map(r=>Math.abs(r.gap))),maxRelative:Math.max(...rows.map(r=>Math.hypot(r.relativeX,r.relativeZ))),mounted:__candy.state().mounted,muted:localStorage.getItem('67park-feel-lab-muted')};
    }finally{stop();}
   });
   assert.equal(result.mounted,null,JSON.stringify(result));assert.equal(result.muted,'1');
   assert(result.rows.length>=3&&result.travel>.12&&result.maxGap<.08&&result.maxRelative<.08,JSON.stringify(result));
   console.log('PASS Ferris cabin carry',JSON.stringify({mobile,...result}));
   await page.screenshot({path:'.qa-results/ride-contacts-ferris-'+(mobile?'mobile':'desktop')+'.png'});
  });

  await check('ride contacts: jumping and walking off release an unmounted Ferris rider',async()=>{
   await board(false);
   const setup=await page.evaluate(async()=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555;
    const frame=()=>new Promise(requestAnimationFrame);i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);
    let cabin=null,seat=null;for(let n=0;n<12;n++){const next=ride.seat(n*4);if(Math.abs(next.position.x-173)<=5)continue;if(!seat||next.floor<seat.floor){cabin=n;seat=next;}}
    if(cabin===null)throw Error('No low Ferris cabin clear of the A-frame');
    const point=()=>{const s=ride.seat(cabin*4);return{x:s.position.x+1.53,y:s.floor+foot,z:s.position.z+.975,floor:s.floor};};
    const p=point();__tp([p.x,p.y,p.z]);for(let f=0;f<12;f++)await frame();return {cabin,before:point()};
   });
   await jump();
   const airborne=await page.evaluate(async setup=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555,frame=()=>new Promise(requestAnimationFrame);
    const point=()=>{const s=ride.seat(setup.cabin*4);return{x:s.position.x+1.53,y:s.floor+foot,z:s.position.z+.975,floor:s.floor};};
    const rows=[],started=performance.now();
    while(rows.length<120){
     await frame();const expected=point(),p={...b.translation()},gap=p.y-foot-expected.floor;
     if(gap>.07)rows.push({expected,p,gap});
     if(rows.length>=3&&Math.abs(rows.at(-1).expected.x-rows[0].expected.x)>.025)break;
     if(performance.now()-started>45000)throw Error('Ferris jump did not produce an airborne release: '+JSON.stringify({rows,setup}));
    }
    const first=rows[0],last=rows.at(-1);
    return {rows,maxGap:Math.max(...rows.map(r=>r.gap)),cabinTravel:Math.abs(last.expected.x-first.expected.x),bodyTravel:Math.hypot(last.p.x-first.p.x,last.p.z-first.p.z),mounted:__candy.state().mounted};
   },setup);
   assert.equal(airborne.mounted,null,JSON.stringify(airborne));
   assert(airborne.rows.length>=3&&airborne.maxGap>.07&&airborne.cabinTravel>.025&&airborne.bodyTravel<.1,JSON.stringify(airborne));

   let walked;
   try{walked=await page.evaluate(async()=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555;
    const frame=()=>new Promise(requestAnimationFrame),stop=()=>{i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);};
    let cabin=null,seat=null;for(let n=0;n<12;n++){const next=ride.seat(n*4);if(Math.abs(next.position.x-173)<=5)continue;if(!seat||next.floor<seat.floor){cabin=n;seat=next;}}
    if(cabin===null)throw Error('No low Ferris cabin clear of the A-frame');
    const point=()=>{const s=ride.seat(cabin*4);return{x:s.position.x+1.53,y:s.floor+foot,z:s.position.z+.975,floor:s.floor};};
    const contact=(x,z,floor)=>{
     const sample=w.rideContacts.sample(x,z),solid=sample.intervals.filter(s=>s.cabin===cabin&&s.min<floor+1.43&&s.max>floor+.02);
     return {sample,solid,floor:sample.surfaces.some(s=>s.cabin===cabin&&Math.abs(s.y-floor)<.08)};
    };
    const chooseExit=()=>{
     const origin=point(),candidates=[];
     for(const direction of [{x:0,z:1,label:'+z'},{x:0,z:-1,label:'-z'},{x:1,z:0,label:'+x'},{x:-1,z:0,label:'-x'}]){
      let sawFloor=false,open=false,blocked=false,exitDistance=null;const probes=[];
      for(let distance=.15;distance<=2.35;distance+=.15){
       const hit=contact(origin.x+direction.x*distance,origin.z+direction.z*distance,origin.floor);
       probes.push({distance,floor:hit.floor,solid:hit.solid});if(hit.solid.length){blocked=true;break;}
       sawFloor||=hit.floor;if(sawFloor&&!hit.floor&&distance>.55){open=true;exitDistance=distance;break;}
      }
      candidates.push({direction,sawFloor,open,blocked,exitDistance,probes});if(sawFloor&&open&&!blocked)return {direction,exitDistance,candidates};
     }
     window.__rideContactsWalkOffFailure={reason:'Ferris cabin has no sampled open walk-off corridor',cabin,position:{...b.translation()},input:{x:i.x,z:i.z,run:i.run,jumpQueued:i.jumpQueued},cabinPoint:origin,candidates};
     throw Error('Ferris cabin has no sampled open walk-off corridor: '+JSON.stringify({origin,candidates}));
    };
    let start;
    const diagnose=(reason,extra={})=>{
     const p={...b.translation()},base=point(),relative={x:p.x-base.x,z:p.z-base.z};
     window.__rideContactsWalkOffFailure={reason,cabin,start,position:p,input:{x:i.x,z:i.z,run:i.run,jumpQueued:i.jumpQueued},cabinPoint:base,relative,support:w.rideContacts.support(p.x,p.z,p.y-foot,.012),contact:contact(p.x,p.z,p.y-foot),...extra};
    };
    try{
     stop();start=point();__tp([start.x,start.y,start.z]);for(let f=0;f<12;f++)await frame();
     const startBase=point(),startPosition={...b.translation()},startContact=contact(startPosition.x,startPosition.z,startBase.floor);
     if(!startContact.floor||Math.abs(startPosition.y-foot-startBase.floor)>.08){diagnose('Ferris walk-off did not begin on the selected cabin',{startBase,startPosition,startContact});throw Error('Ferris walk-off did not begin on the selected cabin');}
     const exit=chooseExit(),begun=performance.now();let progress=0,frames=0,last=null;
     while(frames++<12000){
      const p=b.translation(),base=point(),relative={x:p.x-base.x,z:p.z-base.z},target={x:base.x+exit.direction.x*(exit.exitDistance+.08),z:base.z+exit.direction.z*(exit.exitDistance+.08)};
      const dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz),yaw=w.camera.userData.feelLab.yaw;
      progress=relative.x*exit.direction.x+relative.z*exit.direction.z;last={p:{...p},base,relative,target,progress,distance};if(progress>=exit.exitDistance)break;
      i.x=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/distance;i.z=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;
      await frame();if(performance.now()-begun>45000){diagnose('Could not walk out of Ferris cabin',{exit,last,frames,progress});throw Error('Could not walk out of Ferris cabin');}
     }
     if(progress<exit.exitDistance){diagnose('Ferris walk-off reached its frame limit',{exit,last,frames,progress});throw Error('Ferris walk-off reached its frame limit');}
     stop();const releasedAt=performance.now();
     while(b.translation().y-foot>=point().floor-.08){
      await frame();if(performance.now()-releasedAt>45000){diagnose('Ferris walk-off did not descend below its cabin',{exit,last,frames,progress});throw Error('Ferris walk-off did not descend below its cabin');}
     }
     const p={...b.translation()},sample=w.rideContacts.sample(p.x,p.z);
     const cabinFloor=sample.surfaces.find(s=>s.cabin===cabin&&Math.abs(s.y-(p.y-foot))<.12);
     const base=point(),relative={x:p.x-base.x,z:p.z-base.z},support=w.rideContacts.support(p.x,p.z,p.y-foot,.012);progress=relative.x*exit.direction.x+relative.z*exit.direction.z;
     const belowCabin=p.y-foot<base.floor-.08;
     if(progress<exit.exitDistance||cabinFloor||support?.cabin===cabin||!belowCabin){diagnose('Ferris walk-off did not release cabin support',{exit,last,frames,progress,cabinFloor,sample,support,belowCabin});throw Error('Ferris walk-off did not release cabin support');}
     return {cabin,progress,exitDistance:exit.exitDistance,relative,exit:exit.direction,p,cabinFloor,support,belowCabin,mounted:__candy.state().mounted};
    }finally{stop();}
   });}catch(error){
    const diagnostic=await page.evaluate(()=>window.__rideContactsWalkOffFailure??null);
    await page.screenshot({path:'.qa-results/ride-contacts-walkoff-failed-'+(mobile?'mobile':'desktop')+'.png'});
    throw new Error(error.message+' '+JSON.stringify(diagnostic));
   }
   assert.equal(walked.mounted,null,JSON.stringify(walked));assert(walked.progress>=walked.exitDistance&&!walked.cabinFloor&&walked.support?.cabin!==walked.cabin&&walked.belowCabin,JSON.stringify(walked));
   console.log('PASS Ferris release',JSON.stringify({mobile,airborne,walked}));
  });

  if(mobile)await check('ride contacts: trusted touch joystick crosses the open coaster bay',async()=>{
   const setup=await page.evaluate(async()=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,base=9.46255,foot=.555,frame=()=>new Promise(requestAnimationFrame);
    i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);const floor=w.characterGround(187.5,-112,base,.36);
    __tp([187.5,floor+foot,-112]);for(let f=0;f<3;f++)await frame();
    const yaw=w.camera.userData.feelLab.yaw,dx=0,dz=8;
    return {x:(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/8,z:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/8};
   });
   const stick=page.locator('.park-stick:not(.park-steering)').first(),box=await stick.boundingBox();assert(box,'Movement joystick missing');
   const touch=await page.context().newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
   try{
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+setup.x*box.width*.36,y:y-setup.z*box.height*.36}]});
    await page.waitForFunction(()=>__eggyInput.playerRef.body.translation().z>-104.3,null,{timeout:45000});
    const result=await page.evaluate(()=>{const w=__islandWorld,p={...__eggyInput.playerRef.body.translation()};return {p,ground:w.characterGround(p.x,p.z,p.y-.555,.36),mounted:__candy.state().mounted};});
    assert.equal(result.mounted,null,JSON.stringify(result));assert(Math.abs(result.p.y-result.ground-.555)<.12,JSON.stringify(result));
    console.log('PASS mobile coaster touch route',JSON.stringify(result));
   }finally{await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
  });
 }finally{
  if(await page.evaluate(()=>!!__candy.state().board)!==original.board)await page.keyboard.press('KeyV');
  await page.evaluate(saved=>{const b=__eggyInput.playerRef.body,i=__eggyInput.input;Object.assign(i,saved.input);b.setLinvel({x:0,y:0,z:0},true);__tp([saved.p.x,saved.p.y,saved.p.z]);},original);
 }
};
