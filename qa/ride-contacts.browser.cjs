const assert=require('node:assert/strict');
const {prepareJumpInput}=require('./jump-input.cjs');

// This is deliberately a player-loop check, rather than a sampler-only probe:
// the reported positions have passed through the same walk/skate contact sweep
// that players use in the shipped park.
module.exports=async function checkRideContacts(page,{mobile=false,check}){
 const contactRevision=await page.evaluate(()=>__islandWorld.rideContacts?.stats);
 assert.equal(contactRevision?.launchSyncVersion,1,'current grounded launch synchronization must be loaded');
 assert.equal(contactRevision?.addedDrawCalls,0);assert.equal(contactRevision?.newAssetDownloads,0);
 await check('coaster red rails have four rounded closed ends without extra draws',async()=>{
  const finish=await page.evaluate(()=>JSON.parse(__islandWorld.renderer.domElement.dataset.coasterRailFinish1));
  assert.deepEqual(finish,{version:1,rails:2,caps:4,addedTriangles:528,addedDraws:0,deckChanged:false});
 });
 const original=await page.evaluate(()=>{
  const b=__eggyInput.playerRef.body,i=__eggyInput.input;
  return {p:{...b.translation()},board:!!__candy.state().board,input:{x:i.x,z:i.z,run:i.run,jumpQueued:i.jumpQueued}};
 });
 const board=async on=>{
  if(await page.evaluate(()=>!!__candy.state().board)!==on){
   await page.keyboard.press('KeyV');
   await page.waitForFunction(value=>!!__candy.state().board===value,on,{timeout:45000});
  }
 };
 const freshFerrisPlacement=({descending=false}={})=>page.evaluate(async descending=>{
  const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,contacts=w.rideContacts,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555;
  const frame=()=>new Promise(requestAnimationFrame),stop=()=>{i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);};
  if(!contacts||!ride)throw Error('Ferris contact fixture missing');
  // Clear movement-sweep history before placing. The replacement itself occurs
  // in the next real prepareBody call, after that tick has applied the latest
  // network transform, so it never targets a previous-frame cabin matrix.
  stop();__tp(w.spawn);for(let f=0;f<4;f++)await frame();stop();
  const original=contacts.prepareBody;let placed=null;
  contacts.prepareBody=function(body,options){
   contacts.prepareBody=original;
   const cabins=Array.from({length:12},(_,n)=>({cabin:n,seat:ride.seat(n*4)}));
   const centerX=cabins.reduce((sum,next)=>sum+next.seat.position.x,0)/cabins.length,centerY=cabins.reduce((sum,next)=>sum+next.seat.position.y,0)/cabins.length;
   let selected=null;
   for(const next of cabins){
    // A jump needs a cabin descending for the next few slow rendered frames:
    // otherwise a legitimate upward jump can be immediately re-contacted by a
    // rising floor before the observer can measure release. An upper-left
    // diagonal has both a descending floor and enough horizontal travel for
    // the real moving-cabin assertion; the left-most extremum has none.
    if(Math.abs(next.seat.position.x-centerX)<=5)continue;
    if(descending){
     if(next.seat.position.x>=centerX||next.seat.position.y<=centerY)continue;
     const balance=Math.abs((centerX-next.seat.position.x)-(next.seat.position.y-centerY));
     if(!selected||balance<selected.balance)selected={...next,balance};
    }else if(!selected||next.seat.floor<selected.seat.floor)selected=next;
   }
   if(!selected)throw Error('No Ferris cabin clear of the A-frame');
   const {cabin,seat}=selected;
   const point={x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975,floor:seat.floor};
   __tp([point.x,point.y,point.z]);placed={cabin,point};
   return original.call(this,body,options);
  };
  const started=performance.now();
  try{
   while(!placed){await frame();if(performance.now()-started>45000)throw Error('Fresh Ferris placement did not reach prepareBody');}
   return placed;
  }finally{contacts.prepareBody=original;}
 },descending);
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
   const placed=await freshFerrisPlacement();
   const result=await page.evaluate(async placed=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris');
    const frame=()=>new Promise(requestAnimationFrame),foot=.555,stop=()=>{i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);};
    const point=cabin=>{const seat=ride.seat(cabin*4);return {x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975,floor:seat.floor};};
    try{
     stop();for(let f=0;f<12;f++)await frame();
     const settledPoint=point(placed.cabin),settled={p:{...b.translation()},support:w.rideContacts.support(b.translation().x,b.translation().z,b.translation().y-foot,.012)};
     if(settled.support?.cabin!==placed.cabin||Math.abs(settled.p.y-foot-settledPoint.floor)>.08)throw Error('Ferris carry fixture did not settle on the selected cabin: '+JSON.stringify({placed,settled,settledPoint}));
     const baseline={x:settled.p.x-settledPoint.x,z:settled.p.z-settledPoint.z},initial=settledPoint,rows=[],started=performance.now();let prior=settledPoint,frames=0;
     while(frames++<12000){
      await frame();const expected=point(placed.cabin),p={...b.translation()},relative={x:p.x-expected.x,z:p.z-expected.z};
      rows.push({expected,p,floorError:Math.abs(p.y-foot-expected.floor),relative,relativeDrift:Math.hypot(relative.x-baseline.x,relative.z-baseline.z)});
      if(rows.length>=3&&Math.hypot(expected.x-initial.x,expected.y-initial.y)> .12)break;
      prior=expected;
     if(performance.now()-started>45000)throw Error('Ferris cabin did not move far enough: '+JSON.stringify({rows,initial,prior}));
     }
     if(frames>=12000)throw Error('Ferris cabin sample limit reached');
     const final=rows.at(-1),travel=Math.hypot(final.expected.x-initial.x,final.expected.y-initial.y);
     return {cabin:placed.cabin,placed,settled,baseline,rows,travel,maxFloorError:Math.max(...rows.map(r=>r.floorError)),maxRelativeDrift:Math.max(...rows.map(r=>r.relativeDrift)),mounted:__candy.state().mounted,muted:localStorage.getItem('67park-feel-lab-muted')};
    }finally{stop();}
   },placed);
   assert.equal(result.mounted,null,JSON.stringify(result));assert.equal(result.muted,'1');
   assert(result.rows.length>=3&&result.travel>.12&&result.maxFloorError<.08&&result.maxRelativeDrift<.08,JSON.stringify(result));
   console.log('PASS Ferris cabin carry',JSON.stringify({mobile,...result}));
   await page.screenshot({path:'.qa-results/ride-contacts-ferris-'+(mobile?'mobile':'desktop')+'.png'});
  });

  await check('ride contacts: delayed Ferris frames retain grounded cabin carry',async()=>{
   await board(false);const placed=await freshFerrisPlacement();
   const result=await page.evaluate(async placed=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555;
    const frame=()=>new Promise(requestAnimationFrame),stop=()=>{i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);};
    const point=()=>{const s=ride.seat(placed.cabin*4);return{x:s.position.x+1.53,y:s.floor+foot,z:s.position.z+.975,floor:s.floor};};
    try{
     stop();for(let f=0;f<12;f++)await frame();
     const settledPoint=point(),settled={p:{...b.translation()},support:w.rideContacts.support(b.translation().x,b.translation().z,b.translation().y-foot,.012)};
     if(settled.support?.cabin!==placed.cabin||Math.abs(settled.p.y-foot-settledPoint.floor)>.08)throw Error('Delayed Ferris fixture did not settle on selected cabin: '+JSON.stringify({placed,settled,settledPoint}));
     const baseline={x:settled.p.x-settledPoint.x,z:settled.p.z-settledPoint.z},rows=[];let previous=settledPoint;
     for(let n=0;n<3;n++){
      const until=performance.now()+2200;while(performance.now()<until){}
      await frame();await frame();const expected=point(),p={...b.translation()},relative={x:p.x-expected.x,z:p.z-expected.z};
      rows.push({expected,p,floorError:Math.abs(p.y-foot-expected.floor),relative,relativeDrift:Math.hypot(relative.x-baseline.x,relative.z-baseline.z),travel:Math.hypot(expected.x-previous.x,expected.y-previous.y,expected.z-previous.z)});previous=expected;
     }
     return {placed,settled,baseline,rows,largestTravel:Math.max(...rows.map(r=>r.travel)),maxFloorError:Math.max(...rows.map(r=>r.floorError)),maxRelativeDrift:Math.max(...rows.map(r=>r.relativeDrift)),mounted:__candy.state().mounted,muted:localStorage.getItem('67park-feel-lab-muted')};
    }finally{stop();}
   },placed);
   assert.equal(result.mounted,null,JSON.stringify(result));assert.equal(result.muted,'1');
   assert(result.rows.length===3&&result.largestTravel>2&&result.maxFloorError<.08&&result.maxRelativeDrift<.08,JSON.stringify(result));
   console.log('PASS delayed Ferris carry',JSON.stringify({mobile,...result}));
  });

  await check('ride contacts: jumping and walking off release an unmounted Ferris rider',async()=>{
   await board(false);
   // Resolve and hit-test the fixed HUD before choosing the moving-cabin phase.
   // Locator.tap() would otherwise wait extra rendered frames after arming.
   const jump=await prepareJumpInput(page,{mobile});
   const placed=await freshFerrisPlacement({descending:true});
   const setup=await page.evaluate(async placed=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555,frame=()=>new Promise(requestAnimationFrame);
    i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);for(let f=0;f<12;f++)await frame();
    const seat=ride.seat(placed.cabin*4),point={x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975,floor:seat.floor},p={...b.translation()},support=w.rideContacts.support(p.x,p.z,p.y-foot,.012);
    if(support?.cabin!==placed.cabin||Math.abs(p.y-foot-point.floor)>.08)throw Error('Ferris jump fixture did not settle on the selected cabin: '+JSON.stringify({placed,point,p,support}));
    return {cabin:placed.cabin,before:point,settled:{p,support,offset:{x:p.x-point.x,z:p.z-point.z}}};
   },placed);
   await page.evaluate(async setup=>{
    // Import the exact singleton used by main.js; a cache-busted copy would
    // observe another controller and make this jump diagnosis meaningless.
    const {claudeGorillaState}=await import('/67park-foundation-next/app/claude-gorilla-runtime.js?v=skate-corner-recovery-1');
    window.__qaRideGorillaState=()=>{const s=claudeGorillaState();return {grounded:!!s.grounded,jumped:s.jumped,jumpsLeft:s.jumpsLeft,frames:s.frames};};
    window.__qaRideJumpTrace=[];window.__qaRideJumpEvents=[];window.__qaRideJumpStop=false;window.__qaRideJumpCabin=setup.cabin;
    window.__qaRideJumpPhysics=[];
    const contacts=__islandWorld.rideContacts,prepare=contacts.prepareBody;
    window.__qaRideJumpPrepare=prepare;
    contacts.prepareBody=function(body,options){
     const capture=window.__qaRideJumpEvents.length>0&&window.__qaRideJumpPhysics.length<12;
     let before;
     if(capture){const p={...body.translation()};before={p,v:{...body.linvel()},jumpQueued:!!options?.jumpQueued,cabin:window.__qaRideJumpKinematics?.(),probes:[[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]].map(([dx,dz])=>({dx,dz,sample:contacts.sample(p.x+dx,p.z+dz)}))};}
     const result=prepare.call(this,body,options);
     if(capture)window.__qaRideJumpPhysics.push({t:Math.round(performance.now()),frame:__islandWorld.renderer.info.render.frame,before,after:{p:{...body.translation()},v:{...body.linvel()}},carried:result});
     return result;
    };
    window.__qaRideJumpKinematics=()=>{
     const ride=__islandWorld.rides.find(r=>r.asset==='ferris'),cabins=Array.from({length:12},(_,n)=>ride.seat(n*4)),seat=cabins[window.__qaRideJumpCabin],centerX=cabins.reduce((sum,next)=>sum+next.position.x,0)/cabins.length,centerY=cabins.reduce((sum,next)=>sum+next.position.y,0)/cabins.length,rate=Math.PI*2/ride.stats.period;
     return {floor:seat.floor,angle:ride.angle,phase:Math.atan2(seat.position.y-centerY,seat.position.x-centerX),xOffset:seat.position.x-centerX,yOffset:seat.position.y-centerY,floorVelocity:(seat.position.x-centerX)*rate,horizontalVelocity:-(seat.position.y-centerY)*rate};
    };
    window.__qaRideJumpRecord=source=>{
     const b=__eggyInput.playerRef.body,p=b.translation(),i=__eggyInput.input,s=window.__qaRideGorillaState?.(),frame=__islandWorld.renderer.info.render.frame;
     const rows=window.__qaRideJumpTrace;if(rows.at(-1)?.frame===frame&&source==='raf')return;
     rows.push({source,frame,t:Math.round(performance.now()),p:{...p},v:{...b.linvel()},gorilla:s&&{...s},input:{x:i.x,z:i.z,run:i.run,jumpQueued:i.jumpQueued}});if(rows.length>160)rows.shift();
    };
    const active=()=>{const e=document.activeElement;return e?{tag:e.tagName,id:e.id,className:e.className,aria:e.getAttribute('aria-label'),text:e.textContent?.slice(0,80)}:null;};
    window.__qaRideJumpKeyHandler=e=>{if(e.code==='Space'||e.key===' '){window.__qaRideJumpEvents.push({type:'keydown',code:e.code,key:e.key,isTrusted:e.isTrusted,t:Math.round(performance.now()),active:active(),cabin:window.__qaRideJumpKinematics?.()});window.__qaRideJumpRecord('keydown');}};
    window.__qaRideJumpPointerHandler=e=>{if(e.target?.closest?.('button')){window.__qaRideJumpEvents.push({type:'pointerdown',isTrusted:e.isTrusted,target:e.target.closest('button').getAttribute('aria-label'),t:Math.round(performance.now()),active:active(),cabin:window.__qaRideJumpKinematics?.()});window.__qaRideJumpRecord('pointerdown');}};
    addEventListener('keydown',window.__qaRideJumpKeyHandler,true);addEventListener('pointerdown',window.__qaRideJumpPointerHandler,true);
    const observe=()=>{if(window.__qaRideJumpStop)return;window.__qaRideJumpRecord('raf');window.__qaRideJumpObserver=requestAnimationFrame(observe);};window.__qaRideJumpObserver=requestAnimationFrame(observe);
    // Install the observer before arming so no setup round trip delays input.
    const b=__eggyInput.playerRef.body,ride=__islandWorld.rides.find(r=>r.asset==='ferris'),foot=.555;
    const point=()=>{const s=ride.seat(setup.cabin*4);return{x:s.position.x+1.53,y:s.floor+foot,z:s.position.z+.975,floor:s.floor};};
    window.__qaRideAirRows=[];window.__qaRideAirStop=false;
    const observeAir=()=>{if(window.__qaRideAirStop)return;const expected=point(),p={...b.translation()},gap=p.y-foot-expected.floor;
     const dispatched=window.__qaRideJumpEvents.some(event=>event.isTrusted&&(event.type==='keydown'||event.target==='Jump'));
     if(window.__qaRideJumpArmed&&dispatched&&gap>.07){const rows=window.__qaRideAirRows;rows.push({expected,p,gap,frame:__islandWorld.renderer.info.render.frame});if(rows.length>120)rows.shift();}
     window.__qaRideAirObserver=requestAnimationFrame(observeAir);
    };window.__qaRideAirObserver=requestAnimationFrame(observeAir);
   },setup);
   let armed;
   try{
    const armedHandle=await page.waitForFunction(()=>{
     const w=__islandWorld,b=__eggyInput.playerRef.body,p=b.translation(),v=b.linvel(),s=window.__qaRideGorillaState?.(),i=__eggyInput.input;
     // After settling from the upper-left placement, arm on the outgoing
     // lower-left approach to the bottom. The real-asset fixture checks all
     // three clocks: up to 3.1s dispatch and two .65s post-input game frames.
     // Reserve the production-derived first displacement (.4m in the slow
     // trace), not merely .12m. The actual cabin roof stays solid;
     // the old hosted roof strike is retained as a separate regression.
     const floor=w.characterGround(p.x,p.z,p.y-.555,.012),cabin=window.__qaRideJumpKinematics?.();
     if(!(s?.grounded===true&&s?.jumpsLeft===1&&Math.abs(v.y)<.2&&Math.abs(p.y-.555-floor)<.08&&Math.hypot(i.x,i.z)<.01&&!i.run&&cabin?.floorVelocity>-.38&&cabin.floorVelocity<-.32&&cabin.horizontalVelocity>.9))return false;
     // Capture readiness atomically; a second evaluate can see another phase
     // on the slow CI renderer. The later real event is checked independently.
     const e=document.activeElement;
     const value={p:{...p},v:{...b.linvel()},gorilla:window.__qaRideGorillaState?.(),frame:__islandWorld.renderer.info.render.frame,t:Math.round(performance.now()),cabin,activeElement:e?{tag:e.tagName,id:e.id,className:e.className,aria:e.getAttribute('aria-label'),text:e.textContent?.slice(0,80)}:null};
     window.__qaRideAirRows.length=0;window.__qaRideJumpArmed=value;window.__qaRideJumpRecord('armed');return value;
    },null,{timeout:45000});
    try{armed=await armedHandle.jsonValue();}finally{await armedHandle.dispose();}
    assert(armed.cabin.floorVelocity>-.38&&armed.cabin.floorVelocity<-.32&&armed.cabin.horizontalVelocity>.9,JSON.stringify({setup,armed}));
    await jump();
   }catch(error){
    const diagnostic=await page.evaluate(()=>{const b=__eggyInput.playerRef.body,e=document.activeElement;return {armed:window.__qaRideJumpArmed,events:window.__qaRideJumpEvents,trace:window.__qaRideJumpTrace,p:{...b.translation()},v:{...b.linvel()},gorilla:window.__qaRideGorillaState?.(),input:{...__eggyInput.input},activeElement:e?{tag:e.tagName,id:e.id,className:e.className,aria:e.getAttribute('aria-label'),text:e.textContent?.slice(0,80)}:null};});
    await page.screenshot({path:'.qa-results/ride-contacts-jump-ready-failed-'+(mobile?'mobile':'desktop')+'.png'});
    throw new Error(error.message+' '+JSON.stringify(diagnostic));
   }
   let airborne;
   try{airborne=await page.evaluate(async setup=>{
    const frame=()=>new Promise(requestAnimationFrame),started=performance.now(),rows=window.__qaRideAirRows;
    while(rows.length<120){
     await frame();
     if(rows.length>=3&&Math.abs(rows.at(-1).expected.x-rows[0].expected.x)>.025)break;
     if(performance.now()-started>45000)throw Error('Ferris jump did not produce an airborne release: '+JSON.stringify({rows,setup}));
    }
    const first=rows[0],last=rows.at(-1);
    const armed=window.__qaRideJumpArmed,trace=window.__qaRideJumpTrace||[],events=window.__qaRideJumpEvents||[],inputEvent=events.find(event=>event.type==='keydown'||event.type==='pointerdown'),inputRow=trace.find(row=>row.source==='keydown'||row.source==='pointerdown');
    // Input arrives between physics frames. Measure the jump from its actual
    // synchronized launch, not the older cabin pose visible at event time.
    // Prove the synchronization below; a missing or arbitrary teleport cannot
    // manufacture this baseline. Free-flight rise/speed bounds are unchanged.
    const physics=window.__qaRideJumpPhysics,launch=physics.find(row=>row.before.jumpQueued);
    const launched=!!inputRow&&!!launch&&trace.some(row=>row.frame>launch.frame&&row.gorilla?.jumped===1&&row.gorilla?.grounded===false&&row.gorilla?.jumpsLeft===1&&row.v.y>3);
    const accepted=launched&&trace.some(row=>row.frame>launch.frame&&row.gorilla?.grounded===false&&row.gorilla?.jumpsLeft===1&&row.p.y>launch.after.p.y+.12&&row.v.y>3);
    return {rows,maxGap:Math.max(...rows.map(r=>r.gap)),cabinTravel:Math.abs(last.expected.x-first.expected.x),bodyTravel:Math.hypot(last.p.x-first.p.x,last.p.z-first.p.z),mounted:__candy.state().mounted,armed,inputRow,inputKinematics:inputEvent?.cabin,dispatchDelayMs:inputRow?.t-armed.t,accepted,launched,launch,events,trace,physics};
   },setup);
   }catch(error){
    const diagnostic=await page.evaluate(()=>{const b=__eggyInput.playerRef.body;return {armed:window.__qaRideJumpArmed,events:window.__qaRideJumpEvents,trace:window.__qaRideJumpTrace,p:{...b.translation()},v:{...b.linvel()},gorilla:window.__qaRideGorillaState?.(),input:{...__eggyInput.input}};});
    await page.screenshot({path:'.qa-results/ride-contacts-jump-failed-'+(mobile?'mobile':'desktop')+'.png'});
    throw new Error(error.message+' '+JSON.stringify(diagnostic));
   }
   assert.equal(airborne.mounted,null,JSON.stringify(airborne));
   assert.equal(airborne.events.length,1,'exactly one real jump input, without retries');
   assert.equal(airborne.events[0].isTrusted,true,'jump must come from real keyboard/touch input');
   assert.equal(airborne.events[0].type,mobile?'pointerdown':'keydown');
   if(mobile)assert.equal(airborne.events[0].target,'Jump','trusted touch must hit the visible Jump button');
   const launch=airborne.launch;
   assert(launch?.carried&&launch.before.jumpQueued,'first jump must synchronize verified cabin support');
   assert(Math.abs(launch.after.p.y-.555-launch.before.cabin.floor)<.08,'launch must align to the real current cabin floor');
   for(const axis of ['x','y','z'])assert(Math.abs(launch.after.p[axis]-launch.before.p[axis]-launch.carried[axis])<.0001,'launch translation must equal carrier delta: '+axis);
   assert(airborne.physics.filter(row=>row.t>launch.t).every(row=>row.carried===null),'after launch no airborne carrier transport is allowed');
   assert(airborne.accepted&&airborne.rows.length>=3&&airborne.maxGap>.07&&airborne.cabinTravel>.025&&airborne.bodyTravel<.1&&airborne.inputKinematics?.floorVelocity<-.05&&Math.abs(airborne.inputKinematics.horizontalVelocity)>.3,JSON.stringify(airborne));

   const walkPlacement=await freshFerrisPlacement();let walked;
   try{walked=await page.evaluate(async placed=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset==='ferris'),foot=.555;
    const frame=()=>new Promise(requestAnimationFrame),stop=()=>{i.x=i.z=0;i.run=false;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);};
    const cabin=placed.cabin;
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
     stop();for(let f=0;f<12;f++)await frame();
     start=point();
     const startBase=point(),startPosition={...b.translation()},startContact=contact(startPosition.x,startPosition.z,startBase.floor),startOffset={x:startPosition.x-startBase.x,z:startPosition.z-startBase.z};
     if(!startContact.floor||Math.abs(startPosition.y-foot-startBase.floor)>.08){diagnose('Ferris walk-off did not begin on the selected cabin',{placed,startBase,startPosition,startContact,startOffset});throw Error('Ferris walk-off did not begin on the selected cabin');}
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
     return {cabin,placed,settled:{point:startBase,position:startPosition,support:startContact,offset:startOffset},progress,exitDistance:exit.exitDistance,relative,exit:exit.direction,p,cabinFloor,support,belowCabin,mounted:__candy.state().mounted};
    }finally{stop();}
   },walkPlacement);}catch(error){
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
  await page.evaluate(()=>{window.__qaRideJumpStop=true;window.__qaRideAirStop=true;cancelAnimationFrame(window.__qaRideJumpObserver);cancelAnimationFrame(window.__qaRideAirObserver);removeEventListener('keydown',window.__qaRideJumpKeyHandler,true);removeEventListener('pointerdown',window.__qaRideJumpPointerHandler,true);if(window.__qaRideJumpPrepare)__islandWorld.rideContacts.prepareBody=window.__qaRideJumpPrepare;delete window.__qaRideJumpPrepare;delete window.__qaRideJumpRecord;delete window.__qaRideJumpKinematics;delete window.__qaRideJumpCabin;delete window.__qaRideGorillaState;delete window.__qaRideJumpArmed;});
  if(await page.evaluate(()=>!!__candy.state().board)!==original.board)await page.keyboard.press('KeyV');
  await page.evaluate(saved=>{const b=__eggyInput.playerRef.body,i=__eggyInput.input;Object.assign(i,saved.input);b.setLinvel({x:0,y:0,z:0},true);__tp([saved.p.x,saved.p.y,saved.p.z]);},original);
 }
};
