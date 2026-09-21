const EXPECTED_MANIFEST_URL='https://raw.githubusercontent.com/oscarbrendonn/67park-foundation-next/ops-endpoint/backend.json';
const RECOVERY_MANIFEST_URL='https://api.github.com/repos/oscarbrendonn/67park-foundation-next/contents/backend.json?ref=ops-endpoint';
const TUNNEL_HOST=/^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/;
const MAX_MANIFEST_BYTES=2048;
const MAX_FUTURE_MS=5*60*1000;
const API_RECOVERY_INTERVAL_MS=60*1000;

function tunnelOrigin(value){
 if(typeof value!=='string')throw new TypeError('Preview endpoint must be an HTTPS tunnel origin');
 let url;
 try{url=new URL(value);}catch{throw new TypeError('Preview endpoint must be an HTTPS tunnel origin');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!TUNNEL_HOST.test(url.hostname))throw new TypeError('Preview endpoint must be an HTTPS tunnel origin');
 return url.origin;
}

function validManifestURL(value){return value===EXPECTED_MANIFEST_URL;}

function validUpdatedAt(value,now){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return false;
 const timestamp=Date.parse(value);
 return Number.isFinite(timestamp)&&timestamp<=now+MAX_FUTURE_MS;
}

function parseManifest(value,now){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||typeof value.backend!=='string'||!validUpdatedAt(value.updatedAt,now))throw new TypeError('Invalid preview endpoint manifest');
 return {backend:tunnelOrigin(value.backend),updatedAt:Date.parse(value.updatedAt)};
}

async function readBoundedJSON(response){
 const length=response.headers?.get?.('content-length');
 if(length!==null&&length!==undefined&&/^\d+$/.test(length)&&Number(length)>MAX_MANIFEST_BYTES)throw new RangeError('Preview endpoint manifest is too large');
 const reader=response.body?.getReader?.();
 if(!reader)throw new TypeError('Preview endpoint manifest has no readable body');
 const chunks=[];
 let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   const chunk=value instanceof Uint8Array?value:new Uint8Array(value);
   size+=chunk.byteLength;
   if(size>MAX_MANIFEST_BYTES){await reader.cancel?.();throw new RangeError('Preview endpoint manifest is too large');}
   chunks.push(chunk);
  }
 }finally{reader.releaseLock?.();}
 const bytes=new Uint8Array(size);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Resolves the public preview backend from the fixed, public manifest.
 * `enabled` is deliberately opt-in: callers must set it only for the published
 * 67Park GitHub Pages route. Local previews keep their supplied fallback and do
 * not make a network request.
 */
export function createPreviewEndpointResolver({fallback,manifestURL=EXPECTED_MANIFEST_URL,fetchImpl=fetch,now=Date.now,timeoutMs=4000,cooldownMs=5000,enabled=false}={}){
 if(!enabled){
  return Object.freeze({resolve:()=>Promise.resolve(fallback),current:()=>fallback,reportFailure:()=>false});
 }
 if(!validManifestURL(manifestURL))throw new TypeError('Preview endpoint manifest URL is not allowed');
 if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl must be a function');
 if(typeof now!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isFinite(cooldownMs)||cooldownMs<0)throw new TypeError('Invalid preview endpoint resolver options');

 let lastValid=tunnelOrigin(fallback);
 let positiveUntil=0;
 let negativeUntil=0;
 let inFlight=null;
 let nonce=0;
 let recoveryPending=false;
 let lastApiAttemptAt=-Infinity;
 let newestManifestAt=-Infinity;

 async function requestManifest(baseURL,headers,timeout,controller){
  const manifest=new URL(baseURL);
  manifest.searchParams.set('nonce',`${now()}-${++nonce}`);
  const response=await Promise.race([Promise.resolve().then(()=>fetchImpl(manifest.href,{redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',...(headers?{headers}:{}),signal:controller?.signal})),timeout]);
  if(!response||response.redirected||response.status!==200)throw new TypeError('Preview endpoint manifest request failed');
  const parsed=await Promise.race([readBoundedJSON(response),timeout]);
  const endpoint=parseManifest(parsed,now());
  if(endpoint.updatedAt<newestManifestAt)throw new TypeError('Preview endpoint manifest is older than the current endpoint');
  return endpoint;
 }

 function acceptManifest(manifest){
  lastValid=manifest.backend;
  newestManifestAt=Math.max(newestManifestAt,manifest.updatedAt);
  positiveUntil=now()+cooldownMs;
  negativeUntil=0;
  recoveryPending=false;
  return lastValid;
 }

 async function discover(){
  const controller=typeof AbortController==='function'?new AbortController():null;
  let timer;
  const timeout=new Promise((_,reject)=>{
   timer=setTimeout(()=>{
    controller?.abort();
    reject(new Error('Preview endpoint discovery timed out'));
   },timeoutMs);
  });
  try{
   if(recoveryPending&&now()-lastApiAttemptAt>=API_RECOVERY_INTERVAL_MS){
    lastApiAttemptAt=now();
    try{return acceptManifest(await requestManifest(RECOVERY_MANIFEST_URL,{Accept:'application/vnd.github.raw+json'},timeout,controller));}catch{}
   }
   return acceptManifest(await requestManifest(manifestURL,null,timeout,controller));
  }catch{
   recoveryPending=false;
   negativeUntil=now()+cooldownMs;
   return lastValid;
  }finally{clearTimeout(timer);}
 }

 function resolve(){
  const timestamp=now();
  if(!recoveryPending&&(timestamp<positiveUntil||timestamp<negativeUntil))return Promise.resolve(lastValid);
  if(inFlight)return inFlight;
  const flight=discover();
  inFlight=flight;
  flight.then(()=>{if(inFlight===flight)inFlight=null;},()=>{if(inFlight===flight)inFlight=null;});
  return flight;
 }

 function reportFailure(){
  if(recoveryPending)return false;
  recoveryPending=true;
  positiveUntil=0;
  negativeUntil=0;
  return true;
 }

 return Object.freeze({resolve,current:()=>lastValid,reportFailure});
}

export const previewEndpointManifestURL=EXPECTED_MANIFEST_URL;
export const previewEndpointRecoveryManifestURL=RECOVERY_MANIFEST_URL;
