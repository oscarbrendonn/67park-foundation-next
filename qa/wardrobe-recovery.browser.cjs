const assert=require('node:assert/strict');

module.exports=async function wardrobeRecovery(page,{mobile=false,check=async(_name,action)=>action()}={}){
 await check('wardrobe visible-resume redraw, Retry and disposal',async()=>{
  await page.getByRole('button',{name:'Profile studio',exact:true}).click();
  await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('canvas.wardrobe-avatar');
   return canvas?.dataset.characterBase&&!document.querySelector('.wardrobe-model-status');
  },null,{timeout:30000});
  const resumed=await page.evaluate(async()=>{
   const canvas=document.querySelector('canvas.wardrobe-avatar'),gl=canvas.getContext('webgl2');
   const native=canvas.toDataURL.bind(canvas),snapshots=[];
   canvas.toDataURL=(...args)=>{const snapshot=native(...args);snapshots.push(snapshot);return snapshot;};
   try{
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const snapshot=snapshots.at(-1);if(!snapshot)return {captures:snapshots.length,lost:gl.isContextLost(),opaque:0};
    const image=await createImageBitmap(await (await fetch(snapshot)).blob()),copy=document.createElement('canvas');
    copy.width=image.width;copy.height=image.height;const context=copy.getContext('2d');context.drawImage(image,0,0);image.close();
    let opaque=0;for(let i=3,data=context.getImageData(0,0,copy.width,copy.height).data;i<data.length;i+=4)if(data[i]>16)opaque++;
    return {captures:snapshots.length,lost:gl.isContextLost(),opaque};
   }finally{canvas.toDataURL=native;}
  });
  assert.equal(resumed.lost,false,JSON.stringify(resumed));
  assert(resumed.captures>=2,JSON.stringify(resumed));
  assert(resumed.opaque>100,JSON.stringify(resumed));

  const previewLosses=await page.evaluate(()=>{
   const canvas=document.querySelector('canvas.wardrobe-avatar'),gate=window.__gate;
   if(!gate)throw Error('Foundation WebGL loss gate is missing');
   gate.expectPreviewLoss=true;
   canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
   return gate.expectedPreviewLosses;
  });
  try{await page.getByRole('button',{name:'Retry character',exact:true}).waitFor();}
  finally{await page.evaluate(()=>{if(window.__gate)window.__gate.expectPreviewLoss=false;});}
  const gate=await page.evaluate(()=>({losses:window.__gate?.losses,expectedPreviewLosses:window.__gate?.expectedPreviewLosses}));
  assert.equal(gate.losses,0,'expected preview loss must not forgive a world or other canvas loss');
  assert.equal(gate.expectedPreviewLosses,previewLosses+1,'expected loss must originate at the wardrobe canvas');
  await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'));});
  await page.getByRole('button',{name:'Retry character',exact:true}).waitFor();
  await page.getByRole('button',{name:'Retry character',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('canvas.wardrobe-avatar')?.dataset.characterBase&&!document.querySelector('.wardrobe-model-status'),null,{timeout:30000});
  await page.getByRole('button',{name:'Enter the park',exact:true}).click();
  await page.locator('.wardrobe').waitFor({state:'hidden',timeout:30000});
  const disposed=await page.evaluate(()=>{
   window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
   document.dispatchEvent(new Event('visibilitychange'));
   return globalThis[Symbol.for('67park.wardrobe-gpu.v1')].stats.clients;
  });
  assert.equal(disposed,0,'closed wardrobe must not retain a resume redraw client');
  console.log('WARDROBE_RECOVERY_BROWSER_PASS',JSON.stringify({mobile,resumed,disposed,gate}));
 });
};
