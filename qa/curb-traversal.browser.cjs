const assert=require('node:assert/strict');

module.exports=async function checkCurbTraversal(page,{mobile=false,check}){
 await check('park path entrances: walk and skate up/down, not invisible walls',async()=>{
  const rows=await page.evaluate(async()=>{
   const w=__islandWorld,body=__eggyInput.playerRef.body,input=__eggyInput.input;
   const board=(await import('./app/chunk-G7D6MVRW.js?v=online-next-1')).i;
   const original={...body.translation()},ridingBefore=board.on,rows=[];
   const frame=()=>new Promise(requestAnimationFrame);
   const stop=()=>{input.x=input.z=0;input.run=false;body.setLinvel({x:0,y:0,z:0},true);};
   const ride=async on=>{if(board.on!==on){dispatchEvent(new KeyboardEvent('keydown',{key:'v',code:'KeyV',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{key:'v',code:'KeyV',bubbles:true}));await frame();}if(board.on!==on)throw Error('Skate control did not switch');};
   async function place(p){
    stop();
    // Reverse from the actual arrival, rather than teleporting off-map and
    // back for every leg. New sites still reset through the distant spawn.
    const current=body.translation();
    if(Math.hypot(current.x-p[0],current.z-p[1])>.2){
     __tp([original.x,original.y,original.z]);await frame();await frame();
     __tp([p[0],w.ground(...p)+.555,p[1]]);await frame();await frame();
    }
    const q=body.translation();if(Math.hypot(q.x-p[0],q.z-p[1])>.2||Math.abs(q.y-w.ground(q.x,q.z)-.555)>.12)throw Error('Curb start not grounded at the requested site');
   }
   const sites=[
    {name:'pictured-south',low:[170,118],high:[170,114.5]},
    {name:'south-other-side',low:[174,118],high:[174,114.5]},
    {name:'west',low:[112,58],high:[115.5,58]},
    {name:'west-other-side',low:[112,62],high:[115.5,62]},
   ];
   try{
    for(const riding of [false,true]){
     await ride(riding);
     for(const site of sites)for(const ascending of [true,false]){
      const from=ascending?site.low:site.high,to=ascending?site.high:site.low;
      const a=w.ground(...from),b=w.ground(...to),rise=Math.abs(b-a);
      if(rise<.24||rise>.27||w.water(...from)||w.water(...to))throw Error('Real 25 cm entrance fixture changed: '+site.name);
      await place(from);const before={...body.translation()};
      const dx=to[0]-before.x,dz=to[1]-before.z,length=Math.hypot(dx,dz),yaw=w.camera.userData.feelLab.yaw;
      input.x=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/length;
      input.z=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/length;
      const started=performance.now();let cue=false;
      while((body.translation().x-before.x)*dx/length+(body.translation().z-before.z)*dz/length<length-.12){
       await frame();cue||=!!document.querySelector('#park-contact-cue:not([hidden])');
       if(performance.now()-started>45000)throw Error('Path still blocked: '+JSON.stringify({site,riding,ascending,position:body.translation()}));
      }
      stop();await frame();await frame();
      rows.push({site:site.name,riding,ascending,rise,cue,before,after:{...body.translation()},ground:w.ground(body.translation().x,body.translation().z)});
     }
    }
   }finally{stop();await ride(ridingBefore);__tp([original.x,original.y,original.z]);for(let i=0;i<3;i++)await frame();}
   return rows;
  });
  for(const row of rows){assert(!row.cue,JSON.stringify(row));assert(Math.abs(row.after.y-row.ground-.555)<.12,JSON.stringify(row));}
  assert.equal(rows.length,16);
  console.log('PASS real path traversal',JSON.stringify({mobile,routes:rows.length,maxRise:Math.max(...rows.map(r=>r.rise))}));
 });

 await check(mobile?'touch joystick climbs the pictured park entrance':'keyboard climbs the pictured park entrance',async()=>{
  const setup=await page.evaluate(async()=>{
   const w=__islandWorld,body=__eggyInput.playerRef.body;
   window.__curbUIStart={...body.translation()};
   __tp([172,w.ground(172,118)+.555,118]);for(let i=0;i<2;i++)await new Promise(requestAnimationFrame);
   const yaw=w.camera.userData.feelLab.yaw;
   return {x:Math.sin(yaw),z:Math.cos(yaw),before:{...body.translation()}};
  });
  const keys=[];let touch;
  try{
   if(mobile){
    const box=await page.locator('.park-stick:not(.park-steering)').first().boundingBox();assert(box,'Movement joystick missing');
    touch=await page.context().newCDPSession(page);const x=box.x+box.width/2,y=box.y+box.height/2;
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+setup.x*box.width*.36,y:y-setup.z*box.height*.36}]});
   }else{
    if(Math.abs(setup.x)>.25)keys.push(setup.x>0?'KeyD':'KeyA');
    if(Math.abs(setup.z)>.25)keys.push(setup.z>0?'KeyW':'KeyS');
    for(const key of keys)await page.keyboard.down(key);
   }
   await page.waitForFunction(()=>__eggyInput.playerRef.body.translation().z<114.8,null,{timeout:45000});
   const result=await page.evaluate(()=>{const p=__eggyInput.playerRef.body.translation(),hit=__islandWorld.sample(p.x,p.z);return{...p,surface:hit?.object.name,floor:hit?.point.y,cue:!!document.querySelector('#park-contact-cue:not([hidden])')};});
   assert.equal(result.surface,'8_PARK_PATIKA_UST',JSON.stringify(result));assert(!result.cue,JSON.stringify(result));
   assert(result.y>setup.before.y+.2,JSON.stringify({setup,result}));
   await page.screenshot({path:'.qa-results/curb-'+(mobile?'mobile':'desktop')+'.png'});
  }finally{
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
   for(const key of keys)await page.keyboard.up(key);
   await page.evaluate(()=>{__eggyInput.input.x=__eggyInput.input.z=0;__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true);const p=window.__curbUIStart;__tp([p.x,p.y,p.z]);delete window.__curbUIStart;});
  }
 });
};
