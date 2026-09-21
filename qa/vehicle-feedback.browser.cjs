const assert=require('node:assert/strict');
const fs=require('node:fs');

// Called inside the existing real drive/curb scenario; never move the car in QA.
module.exports=async function vehicleFeedback(page,{mobile}){
 const horn=page.getByRole('button',{name:'Sound vehicle horn',exact:true});
 await horn.waitFor({state:'visible'});
 const before=await page.evaluate(()=>({horn:__party.horn.stats(),audio:__party.sfx.stats(),wheels:__islandWorld.traffic.cars[0].wheels.map(w=>w.roll.rotation.x)}));
 assert.equal(await page.evaluate(()=>localStorage.getItem('67park-feel-lab-muted')),'1','device QA must stay muted');
 const box=await horn.boundingBox();assert(box&&box.width>=44&&box.height>=44);
 const overlaps=await page.evaluate(()=>{
  const h=document.querySelector('#vehicle-horn-button'),a=h.getBoundingClientRect();
  return [...document.querySelectorAll('button,[role="button"]')].filter(b=>b!==h&&b.getBoundingClientRect().width&&getComputedStyle(b).visibility!=='hidden').filter(b=>{
   const r=b.getBoundingClientRect();return a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top;
  }).map(b=>b.getAttribute('aria-label')||b.textContent);
 });assert.deepEqual(overlaps,[],'horn must not cover another control');
 if(mobile){
  for(const name of ['Reverse','Brake','Exit']){
   const r=await page.getByRole('button',{name,exact:true}).boundingBox();
   assert(r&&!(box.x<r.x+r.width&&box.x+box.width>r.x&&box.y<r.y+r.height&&box.y+box.height>r.y),'horn must not cover '+name);
  }
  await horn.tap();
 }else await page.keyboard.press('KeyH');
 assert.equal(await page.evaluate(()=>__party.horn.stats().emitted),before.horn.emitted+1,'trusted horn input');
 await page.evaluate(()=>{for(let i=0;i<1000;i++)__party.horn.press();});
 assert.equal(await page.evaluate(()=>__party.horn.stats().emitted),before.horn.emitted+1,'horn spam stays bounded');
 await page.evaluate(()=>{const input=document.createElement('input');input.id='qa-horn-chat';document.body.append(input);input.focus();});
 try{await page.keyboard.press('KeyH');assert.equal(await page.evaluate(()=>__party.horn.stats().emitted),before.horn.emitted+1,'typing H is not a horn');}
 finally{await page.evaluate(()=>document.querySelector('#qa-horn-chat')?.remove());}
 assert.deepEqual(await page.evaluate(()=>__party.sfx.stats()),before.audio,'muted horn must not allocate an audio context or voices');
 return async()=>{
  const after=await page.evaluate(()=>{
   const c=__islandWorld.traffic.cars.find(c=>c.id==='main-mint');
   return {wheels:c.wheels.map(w=>({roll:w.roll.rotation.x,steer:w.pivot.rotation.y,front:w.front})),body:c.referenceBody,horn:__party.horn.stats(),audio:__party.sfx.stats()};
  });
  assert(after.wheels.every((w,i)=>Math.abs(w.roll-before.wheels[i])>.05),'all four wheels must rotate during the real reverse drive');
  assert.equal(after.body.revision,6);assert.equal(after.body.wheelVents,3);assert.equal(after.body.wheelFeedbackDraws,0);
  await page.waitForTimeout(300);
  const idle=await page.evaluate(()=>__islandWorld.traffic.cars[0].wheels.map(w=>w.roll.rotation.x));
  assert(idle.every((x,i)=>Math.abs(x-after.wheels[i].roll)<.001),'wheels stop with the stopped car');
  assert.equal(after.audio.state,before.audio.state);
  fs.mkdirSync('.qa-results',{recursive:true});
  await page.screenshot({path:'.qa-results/vehicle-feedback-'+(mobile?'mobile':'desktop')+'.png'});
  await page.evaluate(()=>{
   const w=__islandWorld,c=w.traffic.cars[0],old=w.scene.onBeforeRender;
   const target=c.group.position.clone();target.y+=.8;
   const offset=c.group.position.clone().set(5.5,2.2,3.2).applyQuaternion(c.group.quaternion).add(c.group.position);
   const label=document.createElement('div');label.id='qa-wheel-view';label.textContent='Wheel detail · independent inspection camera';label.style.cssText='position:fixed;left:10px;top:110px;background:#fff;padding:6px;z-index:1000';document.body.append(label);
   window.__wheelViewRestore=()=>{w.scene.onBeforeRender=old;label.remove();};
   w.scene.onBeforeRender=function(...a){old?.apply(this,a);w.camera.position.copy(offset);w.camera.lookAt(target);w.camera.updateMatrixWorld(true);};
  });
  try{await page.waitForTimeout(150);await page.screenshot({path:'.qa-results/vehicle-wheel-detail-'+(mobile?'mobile':'desktop')+'.png'});}
  finally{await page.evaluate(()=>{window.__wheelViewRestore?.();delete window.__wheelViewRestore;});}
  console.log('VEHICLE_FEEDBACK_PASS',JSON.stringify({mobile,...after}));
 };
};
