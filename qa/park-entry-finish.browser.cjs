const assert=require('node:assert/strict');

module.exports=async function checkParkEntryFinish(page,{mobile=false,check}){
 await check('south park entrance has continuous paving beside both path edges',async()=>{
  const result=await page.evaluate(async()=>{
   const T=await import('three'),w=__islandWorld,d=w.renderer.domElement.dataset;
   const patch=JSON.parse(d.parkEntryFinish1||'null'),ray=new T.Raycaster(),rows=[];
   for(const [side,x0,x1]of [['WEST',167.18,168.53],['EAST',175.66,177.00]]){
    const mesh=w.scene.getObjectByName('7_KALDIRIM_TABANI_PARK_ENTRY57_'+side+'_SLOT');
    for(let i=0;i<8;i++)for(let j=0;j<12;j++){
     const x=x0+(x1-x0)*i/7,z=113.62+(116.30-113.62)*j/11;
     ray.set(new T.Vector3(x,11,z),new T.Vector3(0,-1,0));
     const hit=ray.intersectObject(mesh,false)[0],sample=w.sample(x,z);
     rows.push({side,x,z,visual:hit?.point.y,normal:hit?.face.normal.y,ground:sample?.point.y,source:sample?.object.name});
    }
    await new Promise(requestAnimationFrame);
   }
   return {patch,rows,muted:localStorage.getItem('67park-feel-lab-muted'),tips:['WEST','EAST'].map(side=>w.scene.getObjectByName('6_BORDUR_PARK_ENTRY57_'+side+'_TIP').geometry.index.count)};
  });
  assert.equal(result.patch?.version,1);assert.equal(result.patch.shoulders,2);assert.equal(result.patch.meshes.length,6);
  assert.equal(result.patch.addedDrawCalls,0);assert.equal(result.patch.perFrameWork,0);assert.equal(result.muted,'1');
  assert.deepEqual(result.tips,[0,0]);assert.equal(result.rows.length,192);
  for(const row of result.rows){assert(Math.abs(row.visual-9.38008564)<.00002,JSON.stringify(row));assert(row.normal>.9999,JSON.stringify(row));assert(Math.abs(row.ground-row.visual)<.00002,JSON.stringify(row));}
  console.log('PASS park entry shoulders',JSON.stringify({mobile,samples:result.rows.length,patch:result.patch}));
 });

 await check('both repaired park shoulders remain traversable walking and skating',async()=>{
  const rows=await page.evaluate(async()=>{
   const w=__islandWorld,body=__eggyInput.playerRef.body,input=__eggyInput.input,board=(await import('./app/chunk-G7D6MVRW.js?v=online-next-1')).i;
   const original={...body.translation()},oldBoard=board.on,rows=[];
   const frame=()=>new Promise(requestAnimationFrame),stop=()=>{input.x=input.z=0;input.run=false;body.setLinvel({x:0,y:0,z:0},true)};
   async function ride(on){if(board.on!==on){dispatchEvent(new KeyboardEvent('keydown',{key:'v',code:'KeyV',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{key:'v',code:'KeyV',bubbles:true}));await frame()}if(board.on!==on)throw Error('Skate toggle failed')}
   const routes=[{name:'west-road-lawn',a:[167.75,118],b:[167.75,113.25]},{name:'east-road-lawn',a:[176.25,118],b:[176.25,113.25]},
    {name:'west-shoulder-path',a:[167.3,114.5],b:[169.3,114.5]},{name:'east-shoulder-path',a:[177,114.5],b:[174.8,114.5]}];
   try{
    for(const skating of [false,true]){
     await ride(skating);
     for(const route of routes)for(const reverse of [false,true]){
      stop();__tp([original.x,original.y,original.z]);for(let n=0;n<4;n++)await frame();
      const a=reverse?route.b:route.a,b=reverse?route.a:route.b;
      __tp([a[0],w.ground(...a)+.555,a[1]]);for(let n=0;n<4;n++)await frame();
      const start={...body.translation()},dx=b[0]-start.x,dz=b[1]-start.z,length=Math.hypot(dx,dz),yaw=w.camera.userData.feelLab.yaw;
      input.x=(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/length;input.z=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/length;
      let cue=false;const since=performance.now();
      while((body.translation().x-start.x)*dx/length+(body.translation().z-start.z)*dz/length<length-.12){
       await frame();cue||=!!document.querySelector('#park-contact-cue:not([hidden])');
       if(performance.now()-since>45000)throw Error('Park shoulder movement blocked '+JSON.stringify({route,skating,reverse,p:body.translation()}));
      }
      stop();for(let n=0;n<4;n++)await frame();
      const p={...body.translation()};rows.push({route:route.name,skating,reverse,cue,p,floor:w.ground(p.x,p.z)});
     }
    }
   }finally{stop();await ride(oldBoard);__tp([original.x,original.y,original.z]);for(let n=0;n<4;n++)await frame()}
   return rows;
  });
  assert.equal(rows.length,16);for(const row of rows){assert(!row.cue,JSON.stringify(row));assert(Math.abs(row.p.y-row.floor-.555)<.12,JSON.stringify(row));}
  console.log('PASS park shoulder traversal',JSON.stringify({mobile,routes:rows.length}));
 });
};
