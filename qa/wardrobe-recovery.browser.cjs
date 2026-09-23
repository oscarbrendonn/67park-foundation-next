const assert=require('node:assert/strict');

module.exports=async function wardrobeRecovery(page,{mobile=false,check=async(_name,action)=>action()}={}){
 await check('wardrobe visible-resume redraw, Retry and disposal',async()=>{
  await page.getByRole('button',{name:'Profile studio',exact:true}).click();await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();
  await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('canvas.wardrobe-avatar');
   return canvas?.dataset.characterBase&&!document.querySelector('.wardrobe-model-status');
  },null,{timeout:30000});
  // The wardrobe is local. A network interruption must not put a fixed retry
  // panel over its Enter button. Exercise the actual mobile hit target, and
  // require the panel to return once the wardrobe closes while still offline.
  // Chromium's HTTP offline emulation alone need not interrupt reconnecting
  // WebSockets. Refuse only new game sockets during this bounded fault; after
  // it ends, connectToServer preserves real server messages and authentication.
  let interruptSockets=true;
  await page.routeWebSocket(url=>/^\/kimi\/(?:ws|online)$/.test(url.pathname),async socket=>{
   if(interruptSockets)await socket.close({code:1012,reason:'QA connection interruption'});
   else socket.connectToServer();
  });
  try{
   // Let established sockets finish their real close handshake before HTTP
   // offline emulation blocks the transport. New sockets are already refused
   // above, so reconnection cannot race this transition. Reversing this order
   // can leave Chromium in CLOSING with no close event for the whole test.
   await page.evaluate(()=>{__eggyNet.ws?.close();__candyOnline.ws?.close();});
   await page.waitForFunction(()=>!__eggyNet.connected&&!__candyOnline.data.connected);
   await page.context().setOffline(true);
   await page.waitForFunction(()=>!navigator.onLine&&!__eggyNet.connected&&!__candyOnline.data.connected);
   await page.waitForTimeout(9200);
   assert.equal(await page.locator('#park-connection-recovery').isVisible(),false,'network panel must not cover local wardrobe controls');
   await page.getByRole('button',{name:'Enter the park',exact:true}).click();
   await page.locator('.wardrobe').waitFor({state:'hidden',timeout:30000});
   await page.locator('#park-connection-recovery').waitFor({state:'visible',timeout:5000});
  }catch(error){
   console.error('WARDROBE_OFFLINE_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({
    online:navigator.onLine,lobbyConnected:__eggyNet.connected,roomConnected:__candyOnline.data.connected,
    lobbySocket:__eggyNet.ws?.readyState,roomSocket:__candyOnline.ws?.readyState,
    panel:document.getElementById('park-connection-recovery')?.textContent
   }))));
   throw error;
  }finally{interruptSockets=false;await page.context().setOffline(false);}
  await page.waitForFunction(()=>__eggyNet.connected&&__candyOnline.data.connected,null,{timeout:30000});
  await page.locator('#park-connection-recovery').waitFor({state:'hidden',timeout:5000});
  console.log('WARDROBE_OFFLINE_CONTROLS_PASS',JSON.stringify({mobile}));
  await page.getByRole('button',{name:'Profile studio',exact:true}).click();await page.getByRole('button',{name:'Choose & dress up',exact:true}).click();
  await page.getByRole('dialog',{name:'Style Studio',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('canvas.wardrobe-avatar')?.dataset.characterBase&&!document.querySelector('.wardrobe-model-status'),null,{timeout:30000});
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
