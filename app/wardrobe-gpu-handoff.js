// The interactive wardrobe or the world's first scene upload owns the GPU.
// Authored geometry, textures, animation, camera and controls stay unchanged.
export function createWardrobeGpuHandoff({yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0)),waitForRequest=()=>new Promise(resolve=>setTimeout(resolve,50)),documentRef=globalThis.document,eventTarget=globalThis}={}){
 const clients=new Set(),listeners=new Set();
 let state=Object.freeze({paused:false,preview:'',revision:0}),requested=false,generation=0,active=null,cleanupError=null,listening=false;
 const publish=(paused,preview=state.preview)=>{state=Object.freeze({paused,preview,revision:state.revision+1});for(const fn of [...listeners])fn();};
 function pause(){
  if(state.paused)return;
  let preview=state.preview;
  for(const client of [...clients])if(client.capture)try{preview=client.capture()||preview;}catch{}
  publish(true,preview);
  // A React passive unmount alone is too late: a world frame can precede it.
  for(const client of [...clients])try{client.dispose();clients.delete(client);}catch(error){cleanupError??=error instanceof Error?error:Error(String(error));}
  stopListeningForVisibleResume();
 }
 const resume=()=>{if(!active&&!requested&&!cleanupError&&state.paused)publish(false);};
 // The live preview intentionally does not preserve its drawing buffer. Safari
 // may discard that buffer while a tab is backgrounded without losing context.
 // Existing preview clients already expose capture() as their synchronous draw.
 const redrawVisibleClients=()=>{
  if(documentRef?.hidden||state.paused)return;
  for(const client of [...clients])try{client.capture?.();}catch{}
 };
 const listenForVisibleResume=()=>{
  if(listening)return;listening=true;
  documentRef?.addEventListener?.('visibilitychange',redrawVisibleClients);
  eventTarget?.addEventListener?.('pageshow',redrawVisibleClients);
 };
 const stopListeningForVisibleResume=()=>{
  if(!listening)return;listening=false;
  documentRef?.removeEventListener?.('visibilitychange',redrawVisibleClients);
  eventTarget?.removeEventListener?.('pageshow',redrawVisibleClients);
 };
 const request=()=>{if(!requested){requested=true;generation++;}pause();};
 const cancel=()=>{requested=false;generation++;resume();};
 function register(client){
  if(!client||typeof client.dispose!=='function')throw TypeError('GPU client needs a disposer');
  if(state.paused){client.dispose();return()=>{};}
  clients.add(client);listenForVisibleResume();return()=>{clients.delete(client);if(!clients.size)stopListeningForVisibleResume();};
 }
 async function acquire({cancelled=()=>false,bypass=()=>false}={}){
  while(!requested){if(cancelled())return null;if(bypass()){request();break;}await waitForRequest();}
  if(cancelled())return null;
  if(active)throw Error('Island GPU warmup already has an owner');
  pause();if(cleanupError)throw cleanupError;
  if(clients.size)throw Error('Wardrobe GPU resources were not released');
  const lease={generation};active=lease;
  // A timer yields even in a hidden tab; no requestAnimationFrame deadlock.
  await yieldUI();
  return {cancelled:()=>cancelled()||!requested||lease.generation!==generation,
   release(){if(active!==lease)return;active=null;resume();}};
 }
 const dispose=()=>{stopListeningForVisibleResume();for(const client of [...clients])try{client.dispose();}catch{}clients.clear();listeners.clear();};
 return {snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),register,request,cancel,acquire,dispose,
  get stats(){return {clients:clients.size,requested,warming:!!active,generation,paused:state.paused};}};
}
const key=Symbol.for('67park.wardrobe-gpu.v1');
const handoff=globalThis[key]??=createWardrobeGpuHandoff();
export const wardrobeGpuSnapshot=handoff.snapshot;
export const subscribeWardrobeGpu=handoff.subscribe;
export const registerWardrobeGpu=handoff.register;
export const requestIslandGpuEntry=handoff.request;
export const cancelIslandGpuEntry=handoff.cancel;
export const waitForIslandGpuEntry=handoff.acquire;
