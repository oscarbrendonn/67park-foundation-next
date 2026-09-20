const assert=require('node:assert/strict');

// Deliberately delay this isolated test browser, not the ride/network clock.
// This exercises the shipped player tick after real elapsed-time gaps, so a
// per-frame angle cap cannot silently discard legitimate platform movement.
module.exports=async function checkSlowCarousel(page,{mobile=false,check}){
 await page.waitForFunction(()=>window.__eggyInput?.playerRef?.body);
 const original=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
 const originalBoard=await page.evaluate(()=>!!__candy.state().board);
 try{
  for(const asset of ['carousel','carouselSmall'])for(const board of [false,true])await check(asset+': delayed '+(board?'skate':'walk')+' frames retain grounded deck alignment',async()=>{
   if(await page.evaluate(()=>!!__candy.state().board)!==board)await page.keyboard.press('KeyV');
   const result=await page.evaluate(async asset=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,ride=w.rides.find(r=>r.asset===asset),d=ride.deck();
    const frame=()=>new Promise(requestAnimationFrame);
    i.x=i.z=0;i.run=false;b.setLinvel({x:0,y:0,z:0},true);
    __tp(w.spawn);for(let f=0;f<4;f++)await frame();
    const x=d.center.x+d.radius*.65,z=d.center.z;
    __tp([x,d.ground(x,z)+.555,z]);for(let f=0;f<15;f++)await frame();
    const rows=[];let largestStep=0;
    for(let f=0;f<3;f++){
     const before={...b.translation()},angle=d.angle,renderFrame=w.renderer.info.render.frame;
     // Both carousels advance more than .25 radians over 1.6 seconds. One
     // delayed frame still fits the existing hardware 2.5-second stall budget.
     const until=performance.now()+1600;while(performance.now()<until){}
     await frame();await frame();
     const end={...b.translation()},delta=Math.atan2(Math.sin(d.angle-angle),Math.cos(d.angle-angle)),dx=before.x-d.center.x,dz=before.z-d.center.z;
     const expected={x:d.center.x+Math.cos(delta)*dx+Math.sin(delta)*dz,z:d.center.z-Math.sin(delta)*dx+Math.cos(delta)*dz};
     largestStep=Math.max(largestStep,delta);
     rows.push({delta,error:Math.hypot(end.x-expected.x,end.z-expected.z),heightError:Math.abs(end.y-d.ground(end.x,end.z)-.555),draws:w.renderer.info.render.frame-renderFrame});
    }
    return {asset,rows,largestStep,board:!!__candy.state().board,mounted:__candy.state().mounted,muted:localStorage.getItem('67park-feel-lab-muted')};
   },asset);
   assert.equal(result.mounted,null);assert.equal(result.muted,'1');
   assert.equal(result.board,board);
   assert.equal(result.rows.length,3);assert(result.largestStep>.25,JSON.stringify(result));
   for(const row of result.rows)assert(row.error<.12&&row.heightError<.1&&row.draws>=1,JSON.stringify(result));
   console.log('PASS delayed carousel frames',JSON.stringify({mobile,...result}));
  });
 }finally{
  if(await page.evaluate(()=>!!__candy.state().board)!==originalBoard)await page.keyboard.press('KeyV');
  await page.evaluate(p=>{const i=__eggyInput.input;i.x=i.z=0;i.run=false;__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true);__tp([p.x,p.y,p.z]);},original);
 }
};
