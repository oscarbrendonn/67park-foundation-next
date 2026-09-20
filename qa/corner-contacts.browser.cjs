const assert=require('node:assert/strict');

module.exports=async function checkCornerContacts(page,{mobile=false,check}){
 const report=await page.evaluate(()=>{
  const w=__islandWorld,placements=JSON.parse(w.renderer.domElement.dataset.centralLayout68),stats=JSON.parse(w.renderer.domElement.dataset.buildingContacts);
  let corners=0,blockedCentres=0;
  for(const p of placements){
   if(w.ground(p.x,p.z)>=p.y+p.height-.01)blockedCentres++;
   for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=p.x+sx*(p.radius-.05),z=p.z+sz*(p.radius-.05);
    if(w.ground(x,z)<p.y+2)corners++;
   }
  }
  return{stats,corners,blockedCentres};
 });
 assert.equal(report.stats.modelMatched,16);assert.equal(report.stats.addedDrawCalls,0);
 assert.equal(report.blockedCentres,16);assert(report.corners>=48,'Rounded corners must not remain square invisible walls');
 await check('model-matched corners: walk and skate slide, retreat, closed walls',async()=>{
  const result=await page.evaluate(async()=>{
   const w=__islandWorld,{body}=__eggyInput.playerRef,input=__eggyInput.input;
   const module=await import('./app/chunk-G7D6MVRW.js?v=online-next-1');
   const original={...body.translation()},boardBefore=module.i.on,rows=[];
   let phase='setup';
   const pause=ms=>new Promise(r=>setTimeout(r,ms));
   const frames=async count=>{for(let i=0;i<count;i++)await new Promise(requestAnimationFrame);};
   // Observe the required physical outcome, not an arbitrary RAF count: high
   // refresh screens accelerate over many frames; CPU-only CI renders far fewer.
   // Both must move the same distance without entering the wall.
   const observe=async(ms,sample,reached)=>{
    const start=performance.now();
    do{
     await frames(1);sample?.();
     if(performance.now()-start>60000)throw Error('Corner movement did not complete within its deadline: '+JSON.stringify({phase,position:body.translation(),velocity:body.linvel(),input:{x:input.x,z:input.z},cue:document.querySelector('#park-contact-cue')?.outerHTML,trace:window.__qaContactFrames}));
    }while(performance.now()-start<ms||!reached());
   };
   const stop=()=>{input.x=input.z=0;input.run=false;body.setLinvel({x:0,y:0,z:0},true);};
   function direction(x,z){const yaw=w.camera.userData.feelLab.yaw;input.x=Math.cos(yaw)*x-Math.sin(yaw)*z;input.z=-Math.sin(yaw)*x-Math.cos(yaw)*z;}
   async function board(value){if(module.i.on!==value){dispatchEvent(new KeyboardEvent('keydown',{key:'v',code:'KeyV',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{key:'v',code:'KeyV',bubbles:true}));await frames(2);}if(module.i.on!==value)throw Error('Board control did not switch');}
   async function place(x,z){
    stop();
    // Debug teleports shorter than the sweep-reset distance are interpreted as
    // movement. Reset via the distant spawn so setup itself is not a wall sweep.
    __tp([original.x,original.y,original.z]);await frames(3);
    __tp([x,w.ground(x,z)+.555,z]);await pause(350);await frames(2);
    const q=body.translation();if(Math.hypot(q.x-x,q.z-z)>.15)throw Error('Corner fixture did not reach its start');
   }
   try{
    for(const riding of [false,true]){
     await board(riding);
     const p=JSON.parse(w.renderer.domElement.dataset.centralLayout68).find(p=>p.id==='N1');
     const wall=p.x+p.footprint.maxX*1.15,x=wall+.405,z=p.z-1;
     await place(x,z);
     const before={...body.translation()};let intrusion=false;
     phase=(riding?'skate':'walk')+' slide';
     direction(-.7,.7);
     await observe(800,()=>{const q=body.translation();if(w.ground(q.x,q.z)>q.y+1)intrusion=true;},()=>body.translation().z-before.z>1);
     const slide={...body.translation()};stop();
     // Push directly into the visibly closed facade. This is a physical
     // contact test: the player must stay outside, then be able to retreat.
     // It deliberately has no dependency on optional UI feedback.
     await place(x,z);
     phase=(riding?'skate':'walk')+' closed wall';
     const plateau=[];
     direction(-1,0);await observe(700,()=>{
      const q=body.translation();
      // The movement controller writes its intended velocity before contact
      // resolution every frame, so velocity is not evidence of penetration or
      // progress. Require eight consecutive rendered positions to remain on
      // the exterior side of the facade instead.
      if(q.x<wall+.35){plateau.length=0;return;}
      plateau.push({x:q.x,z:q.z});if(plateau.length>8)plateau.shift();
     },()=>{
      if(plateau.length<8)return false;
      return plateau.every((q,index)=>!index||Math.hypot(q.x-plateau[index-1].x,q.z-plateau[index-1].z)<.01);
     });
     const wallStop={...body.translation()};
     phase=(riding?'skate':'walk')+' retreat';
     direction(1,0);await observe(600,null,()=>body.translation().x-wallStop.x>1);
     const retreat={...body.translation()};stop();await frames(3);
     const plateauMaxStep=Math.max(0,...plateau.slice(1).map((q,index)=>Math.hypot(q.x-plateau[index].x,q.z-plateau[index].z)));
     rows.push({riding,before,slide,wall,wallStop,retreat,intrusion,plateauSamples:plateau.length,plateauMaxStep});
    }
   }finally{stop();await board(boardBefore);__tp([original.x,original.y,original.z]);await frames(3);}
   return rows;
  });
  for(const r of result){
   assert(r.slide.z-r.before.z>1,JSON.stringify(r));assert(!r.intrusion,JSON.stringify(r));
   assert(r.wallStop.x>=r.wall+.35,JSON.stringify(r));assert(r.plateauSamples>=8&&r.plateauMaxStep<.01,JSON.stringify(r));assert(r.retreat.x-r.wallStop.x>1,JSON.stringify(r));
  }
  console.log('PASS model contact survey',JSON.stringify({mobile,...report,movement:result.map(r=>({board:r.riding,slide:r.slide.z-r.before.z,retreat:r.retreat.x-r.wallStop.x}))}));
 });
};
