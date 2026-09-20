import {PREVIEW_BACKEND,PREVIEW_VARIANT} from './preview-network-config.js?v=online-next-1';
import {protectParkSocket} from './social-safety.js';
import {CLIENT_PROTOCOL,CLIENT_BUILD,compatibleProtocol} from './protocol-version.js';
import {assertConnectionAllowed,connectionProblem,watchParkSocket,currentParkSocket} from './connection-recovery.js';

// GitHub Pages repositories share one origin. Do not replace the protected
// Kimi desktop/mobile previews' guest identity when visiting Feel Lab.
const key='67park.feel-lab.guest.v1.'+PREVIEW_VARIANT;
const sharedKey=Symbol.for('67park.feel-lab.transport.v1.'+PREVIEW_VARIANT);
const state=globalThis[sharedKey]??=( {pending:null,session:null} );
const endpoint=path=>PREVIEW_BACKEND+'/'+PREVIEW_VARIANT+path;
export async function ensurePreviewGuest(){
 assertConnectionAllowed();
 if(state.pending)return state.pending;
 state.pending=(async()=>{
  let token=state.session?.token;try{token||=localStorage.getItem(key);}catch{}
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
  try{
   const response=await fetch(endpoint('/api/session')+'?protocol='+CLIENT_PROTOCOL+'&build='+CLIENT_BUILD,{mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:token?{Authorization:'Bearer '+token}:{},signal:abort.signal});
   const session=await response.json();
   if(response.status===426){const message='The game version changed. Reload to update; your saved character stays safe.';connectionProblem(message,{blocked:true});throw Error(message);}
   if(response.status===429){const message='Too many reconnect attempts. Please wait a moment; your character is safe.';connectionProblem(message,{retryAt:Date.now()+60000});throw Error(message);}
   if(!response.ok)throw Error('The park server is unavailable. Retrying shortly ('+response.status+').');
   if(!compatibleProtocol(session.protocol)){const message='The server and game versions do not match. Reload the latest game, or try again after the server update.';connectionProblem(message,{blocked:true});throw Error(message);}
   if(!/^[A-Za-z0-9_-]{43}$/.test(session.token)||typeof session.id!=='string')throw Error('Invalid preview session.');
   state.session=session;try{localStorage.setItem(key,session.token);}catch{}
   return session;
  }finally{clearTimeout(timer);}
 })();
 try{return await state.pending;}finally{state.pending=null;}
}
export async function fetchParkSession(){
 const session=await ensurePreviewGuest();
 return new Response(JSON.stringify({...session,token:undefined}),{status:200,headers:{'Content-Type':'application/json'}});
}
export function parkSocket(channel){
 assertConnectionAllowed();
 if(!['ws','online'].includes(channel)||!state.session)throw Error('Preview session not ready.');
 const existing=currentParkSocket(channel);if(existing)return existing;
 const url=new URL(endpoint('/'+channel));url.protocol=url.protocol==='https:'?'wss:':'ws:';
 url.searchParams.set('protocol',CLIENT_PROTOCOL);
 return protectParkSocket(watchParkSocket(new WebSocket(url,['67park-v1','guest.'+state.session.token]),channel),channel);
}
