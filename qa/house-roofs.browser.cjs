const assert=require('node:assert/strict');
const {prepareJumpInput}=require('./jump-input.cjs');
const defaultActionTimeout=process.env.PARK_SOFTWARE_RENDER==='1'?240000:45000;
const requestedDiagnosticDeadline=Number(process.env.PARK_DIAGNOSTIC_ROUTE_DEADLINE);
const actionTimeout=Number.isFinite(requestedDiagnosticDeadline)&&requestedDiagnosticDeadline>0?Math.min(defaultActionTimeout,requestedDiagnosticDeadline):defaultActionTimeout;

module.exports=async function checkHouseRoofs(page,{mobile=false,check}){
 await check('all house roofs match their rendered surfaces, with bounded shared indices',async()=>{
  const result=await page.evaluate(async()=>{
   const w=__islandWorld,T=await import('three'),ray=new T.Raycaster(),errors=[];
   const roofs=w.roofSupports;if(!roofs)throw Error('Roof support did not load');
   let tested=0,maxError=0;
   for(const site of roofs.sites){
    for(const dx of [0,.7]){
     const x=site.x+dx,z=site.z,s=roofs.sample(x,z);if(!s)throw Error('Missing roof: '+JSON.stringify(site));
     const group=w.scene.getObjectByName(site.group);
     const parts=group.children.filter(m=>m.isMesh&&!/COLLIDER/.test(m.name)&&(site.group!=='SMALL_ISLAND_PROPS_V62'||m.userData.houseAsset62));
     ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));
     const hit=ray.intersectObjects(parts,false)[0],error=hit?Math.abs(hit.point.y-s.y):Infinity;
     maxError=Math.max(maxError,error);if(error>.025)errors.push({site,dx,s,hit:hit?.point.toArray(),error});
     const ground=w.ground(x,z),feet=s.y+.3;
     if(Math.abs(w.characterGround(x,z,feet)-s.y)>.025)errors.push({site,dx,reason:'actor roof mismatch'});
     if(w.ground(x,z)!==ground)errors.push({site,reason:'vehicle/world ground changed'});
     tested++;
    }
    await new Promise(requestAnimationFrame);
   }
   return {stats:roofs.stats,tested,maxError,errors};
  });
  assert.equal(result.stats.houses,69);assert.equal(result.stats.assets,7);
  assert.equal(result.tested,138);assert.deepEqual(result.errors,[]);
  assert(result.stats.bytes<16*1024*1024);assert.equal(result.stats.addedDrawCalls,0);
  assert.equal(result.stats.newAssetDownloads,0);console.log('PASS rendered roof survey',JSON.stringify({mobile,...result}));
 });
 await check(mobile?'touch double-jump reaches a roof, walks its slope and gets down':'keyboard double-jump reaches a roof, walks its slope and gets down',async()=>{
  const before=await page.evaluate(async()=>{
   const board=(await import('./app/chunk-G7D6MVRW.js?v=online-next-1')).i;
   return {position:{...__eggyInput.playerRef.body.translation()},board:board.on};
  });
  let jump;
  async function place(){
   await page.evaluate(async()=>{
    const w=__islandWorld,input=__eggyInput.input;input.x=input.z=0;input.run=false;
    __tp(w.spawn);for(let n=0;n<3;n++)await new Promise(requestAnimationFrame);
    __tp([161.8,w.terrainGround(161.8,-207.2)+.555,-207.2]);
    for(let n=0;n<8;n++)await new Promise(requestAnimationFrame);
   });
  }
  async function moveTo(target){
   const result=await page.evaluate(async ({target,deadline})=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,input=__eggyInput.input,yaw=w.camera.userData.feelLab.yaw;
    const started=performance.now(),trace=[];
    // Use the existing analog control for the final approach. Full-strength
    // steering can overshoot the landing sample by >1m in one software-GPU
    // frame and invalidate the subsequent slope-height comparison.
    // Stay above the shipped controller's 0.08 analog dead zone.
    try{while(b.translation().x<target-.04){const remaining=target-b.translation().x,strength=Math.max(.1,Math.min(1,remaining*3));input.x=Math.cos(yaw)*strength;input.z=-Math.sin(yaw)*strength;await new Promise(requestAnimationFrame);trace.push({ms:Math.round(performance.now()-started),p:{...b.translation()},v:{...b.linvel()},strength});if(trace.length>20)trace.shift();if(performance.now()-started>deadline)throw Error('Roof movement blocked: '+JSON.stringify(b.translation()));}}
    finally{input.x=input.z=0;const v=b.linvel();b.setLinvel({x:0,y:v.y,z:0},true);}
    return {target,p:{...b.translation()},trace};
   },{target,deadline:actionTimeout});
   console.log('ROOF_STEERING',JSON.stringify(process.env.PARK_ROUTE_TRACE==='1'?result:{target:result.target,p:result.p,maxFrameGap:Math.max(...result.trace.map((r,n)=>r.ms-(result.trace[n-1]?.ms??r.ms)))}));return result.p;
  }
  try{
   if(before.board)await page.keyboard.press('KeyV');
   jump=await prepareJumpInput(page,{mobile,timeout:actionTimeout});await place();await jump();
   await page.waitForFunction(()=>{const b=__eggyInput.playerRef.body,p=b.translation();return p.y>11.15&&b.linvel().y<2.8;},null,{timeout:actionTimeout});
   await jump();await moveTo(163.35);
   await page.waitForFunction(()=>{const w=__islandWorld,b=__eggyInput.playerRef.body,p=b.translation(),roof=w.roofSupports.sample(p.x,p.z);return roof&&roof.y>w.terrainGround(p.x,p.z)+2.7&&Math.abs(p.y-roof.y-.555)<.08&&Math.abs(b.linvel().y)<.5;},null,{timeout:actionTimeout});
   const landed=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
   await moveTo(166.9);
   await page.waitForFunction(()=>{const p=__eggyInput.playerRef.body.translation();return Math.abs(p.y-__islandWorld.roofSupports.sample(p.x,p.z).y-.555)<.08;});
   const summit=await page.evaluate(()=>({...__eggyInput.playerRef.body.translation()}));
   assert(summit.y>landed.y+1.2,JSON.stringify({landed,summit}));
   await page.screenshot({path:'.qa-results/roof-'+(mobile?'mobile':'desktop')+'.png',timeout:90000});
   if(mobile)await page.getByRole('button',{name:'Skate',exact:true}).tap();else await page.keyboard.press('KeyV');
   await moveTo(167.9);
   await page.waitForFunction(()=>{const p=__eggyInput.playerRef.body.translation();return Math.abs(p.y-__islandWorld.roofSupports.sample(p.x,p.z).y-.555)<.12;},null,{timeout:actionTimeout});
   const skated=await page.evaluate(async()=>({p:{...__eggyInput.playerRef.body.translation()},board:(await import('./app/chunk-G7D6MVRW.js?v=online-next-1')).i.on}));
   assert(skated.board&&skated.p.x>summit.x+.7,JSON.stringify(skated));
   await page.keyboard.press('KeyV');
   await moveTo(171.5);
   await page.waitForFunction(()=>{const p=__eggyInput.playerRef.body.translation();return Math.abs(p.y-__islandWorld.terrainGround(p.x,p.z)-.555)<.08;},null,{timeout:actionTimeout});
   // Trying the same approach without jumping must still meet a solid wall.
   await place();
   const wall=await page.evaluate(async()=>{
    const w=__islandWorld,b=__eggyInput.playerRef.body,i=__eggyInput.input,yaw=w.camera.userData.feelLab.yaw;i.x=Math.cos(yaw);i.z=-Math.sin(yaw);
    try{for(let f=0;f<45;f++)await new Promise(requestAnimationFrame);}finally{i.x=i.z=0;}
    const p=b.translation();return {p,terrain:w.terrainGround(p.x,p.z),under:w.ground(p.x,p.z),ahead:w.ground(p.x+.5,p.z)};
   });
   // The wall is inset from the roof eave. Verify its actual collision surface,
   // not a guessed x coordinate on the decorative overhang.
   assert(wall.p.x<163.35&&wall.under<wall.terrain+.32&&wall.ahead>wall.terrain+3,JSON.stringify(wall));
   assert(Math.abs(wall.p.y-wall.terrain-.555)<.1,JSON.stringify(wall));
   console.log('PASS roof play',JSON.stringify({mobile,landed,summit,skated,wall}));
  }finally{
   await page.evaluate(async before=>{
    __eggyInput.input.x=__eggyInput.input.z=0;__eggyInput.playerRef.body.setLinvel({x:0,y:0,z:0},true);
    __tp([before.position.x,before.position.y,before.position.z]);for(let f=0;f<3;f++)await new Promise(requestAnimationFrame);
   },before);
   if(before.board)await page.keyboard.press('KeyV');
  }
 });
};
