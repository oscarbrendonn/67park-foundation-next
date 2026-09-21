const assert=require('node:assert/strict');
// Read the real default framebuffer immediately after a world render. DOM/HUD
// pixels cannot satisfy this check, and draw calls alone are not evidence.
async function graphicsPixels(page,label){
 const result=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const r=__islandWorld.renderer,render=r.render;
  const timer=setTimeout(()=>{r.render=render;reject(new Error('No world frame for pixel witness'));},30000);
  r.render=function(scene,...args){
   const out=render.call(this,scene,...args);
   if(scene!==(__islandWorld.scene||window.__eggyScene)||r.getRenderTarget())return out;
   r.render=render;clearTimeout(timer);
   try{
    const gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const bins=new Map();let samples=0;
    for(let y=0;y<h;y+=Math.max(1,Math.floor(h/96)))for(let x=0;x<w;x+=Math.max(1,Math.floor(w/96))){
     const i=(y*w+x)*4,key=(pixels[i]>>4)*256+(pixels[i+1]>>4)*16+(pixels[i+2]>>4);
     bins.set(key,(bins.get(key)||0)+1);samples++;
    }
    resolve({width:w,height:h,bins:bins.size,nonDominant:1-Math.max(...bins.values())/samples,profile:JSON.parse(r.domElement.dataset.parkGraphics),frame:r.info.render.frame});
   }catch(e){reject(e);}
   return out;
  };
 }));
 assert(result.bins>16,`${label}: world framebuffer must contain model/ground colour detail: ${JSON.stringify(result)}`);
 assert(result.nonDominant>.08,`${label}: world cannot be an almost uniform empty background: ${JSON.stringify(result)}`);
 console.log('GRAPHICS_PIXEL_WITNESS',label,JSON.stringify(result));return result;
}
module.exports={graphicsPixels};
