// A lost WebGL context or a never-finishing shader compile must expose Retry,
// not leave mobile Safari indefinitely on the last preparation step.
export async function compileEntryGraphics(renderer,scene,camera,{timeoutMs=60000}={}){
 const canvas=renderer.domElement;let timer,onLost;
 try{
  await Promise.race([
   Promise.resolve().then(()=>{
    if(renderer.getContext().isContextLost())throw Error('Graphics memory was interrupted. Retry loading.');
    return renderer.compileAsync(scene,camera);
   }),
   new Promise((_,reject)=>{
    onLost=()=>reject(Error('Graphics memory was interrupted. Retry loading.'));
    canvas.addEventListener('webglcontextlost',onLost);
    timer=setTimeout(()=>reject(Error('Graphics preparation took too long. Retry loading.')),timeoutMs);
   }),
  ]);
 }finally{clearTimeout(timer);canvas.removeEventListener('webglcontextlost',onLost);}
}
