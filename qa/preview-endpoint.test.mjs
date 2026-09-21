import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewEndpointResolver,previewEndpointManifestURL,previewEndpointRecoveryManifestURL} from '../app/preview-endpoint.js';

const encoder=new TextEncoder();
const fallback='https://old-preview.trycloudflare.com';
const next='https://new-preview.trycloudflare.com';

function response(body,{status=200,redirected=false,contentLength}={}){
 const bytes=encoder.encode(body);
 let offset=0,cancelled=false;
 return {
  status,redirected,
  headers:{get:name=>name.toLowerCase()==='content-length'?(contentLength??null):null},
  body:{getReader:()=>({async read(){if(offset>=bytes.length)return{done:true};const value=bytes.slice(offset,Math.min(offset+23,bytes.length));offset+=value.length;return{done:false,value};},async cancel(){cancelled=true;},releaseLock(){}})},
  get cancelled(){return cancelled;}
 };
}

function manifest(backend=next,updatedAt='2026-09-21T00:00:00Z'){return JSON.stringify({version:1,backend,updatedAt});}
function resolver(options={}){let tick=Date.parse('2026-09-21T00:00:00Z');return {clock:{now:()=>tick,set:value=>{tick=value;},advance:value=>{tick+=value;}},resolver:createPreviewEndpointResolver({fallback,enabled:true,now:()=>tick,...options})};}

test('discovers a rotated endpoint, requests the immutable public manifest safely, and caches it',async()=>{
 const requests=[];
 const {resolver:target,clock}=resolver({fetchImpl:async(url,options)=>{requests.push({url,options});return response(manifest());}});
 assert.equal(await target.resolve(),next);
 assert.equal(target.current(),next);
 assert.equal(requests.length,1);
 assert.equal(new URL(requests[0].url).searchParams.get('nonce'),`${Date.parse('2026-09-21T00:00:00Z')}-1`);
 assert.deepEqual({...requests[0].options,signal:undefined},{redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:undefined});
 await target.resolve();
 assert.equal(requests.length,1);
 clock.advance(5001);
 await target.resolve();
 assert.equal(requests.length,2);
});

test('coalesces concurrent discovery by promise identity',async()=>{
 let release,calls=0;
 const hold=new Promise(resolve=>{release=resolve;});
 const {resolver:target}=resolver({fetchImpl:async()=>{calls++;await hold;return response(manifest());}});
 const first=target.resolve(),second=target.resolve();
 assert.strictEqual(first,second);
 await Promise.resolve();
 assert.equal(calls,1);
 release();
 assert.equal(await first,next);
});

test('uses clock time plus a counter so fresh resolvers do not share a stale nonce',async()=>{
 const urls=[];
 const first=createPreviewEndpointResolver({fallback,enabled:true,now:()=>100,fetchImpl:async url=>{urls.push(url);return response(manifest());}});
 const second=createPreviewEndpointResolver({fallback,enabled:true,now:()=>200,fetchImpl:async url=>{urls.push(url);return response(manifest());}});
 await first.resolve();
 await second.resolve();
 assert.deepEqual(urls.map(url=>new URL(url).searchParams.get('nonce')),['100-1','200-1']);
});

test('recovers a rotated endpoint from the GitHub API when Raw is stale, and never reverts to the older timestamp',async()=>{
 const old=manifest(fallback,'2026-09-21T00:00:00Z');
 const fresh=manifest(next,'2026-09-21T00:01:00Z');
 let rawCalls=0,apiCalls=0;
 const {resolver:target,clock}=resolver({fetchImpl:async(url,options)=>{
  if(url.startsWith('https://api.github.com/')){apiCalls++;assert.equal(options.headers.Accept,'application/vnd.github.raw+json');return response(fresh);}
  rawCalls++;return response(old);
 }});
 assert.equal(await target.resolve(),fallback);
 clock.advance(5001);
 assert.equal(target.reportFailure(),true);
 assert.equal(target.reportFailure(),false,'one report consumes the pending recovery slot');
 assert.equal(await target.resolve(),next);
 assert.equal(apiCalls,1);
 clock.advance(5001);
 assert.equal(await target.resolve(),next,'stale Raw content cannot move the endpoint backwards');
 assert.equal(rawCalls,2);
});

test('rate-limits anonymous API recovery once per minute and falls through to Raw',async()=>{
 let rawCalls=0,apiCalls=0;
 const {resolver:target,clock}=resolver({fetchImpl:async url=>{
  if(url.startsWith('https://api.github.com/')){apiCalls++;return response('{}',{status:429});}
  rawCalls++;return response(manifest());
 }});
 assert.equal(await target.resolve(),next);
 clock.advance(5001);
 target.reportFailure();
 assert.equal(await target.resolve(),next);
 clock.advance(5001);
 target.reportFailure();
 assert.equal(await target.resolve(),next);
 assert.equal(apiCalls,1);
 assert.equal(rawCalls,3);
});

test('coalesces parallel recovery discovery and makes one API request',async()=>{
 let release,apiCalls=0;
 const hold=new Promise(resolve=>{release=resolve;});
 const {resolver:target,clock}=resolver({fetchImpl:async url=>{
  if(url.startsWith('https://api.github.com/')){apiCalls++;await hold;return response(manifest());}
  return response(manifest());
 }});
 await target.resolve();
 clock.advance(5001);
 target.reportFailure();
 const first=target.resolve(),second=target.resolve();
 assert.strictEqual(first,second);
 await Promise.resolve();
 assert.equal(apiCalls,1);
 release();
 assert.equal(await first,next);
});

test('negatively caches malformed, oversize, hostile, and failed manifest reads',async()=>{
 const bad=[
  response('{'),
  response(manifest('https://not-a-tunnel.example')),
  response(manifest('https://evil.trycloudflare.com/path')),
  response('x'.repeat(2049)),
  response(manifest(),{redirected:true}),
  response(manifest(),{status:503})
 ];
 let calls=0;
 const {resolver:target,clock}=resolver({fetchImpl:async()=>bad[calls++]});
 for(let index=0;index<bad.length;index++){
  assert.equal(await target.resolve(),fallback);
  assert.equal(calls,index+1);
  await target.resolve();
  assert.equal(calls,index+1,'failed discovery is cached');
  clock.advance(5001);
 }
});

test('keeps the last valid rotated endpoint when a later manifest is unavailable',async()=>{
 let calls=0;
 const {resolver:target,clock}=resolver({fetchImpl:async()=>calls++?response('{'):response(manifest())});
 assert.equal(await target.resolve(),next);
 clock.advance(5001);
 assert.equal(await target.resolve(),next);
 assert.equal(target.current(),next);
});

test('validates manifest timestamp and enabled fallback/manifest restrictions',async()=>{
 const future='2026-09-21T00:05:00.001Z';
 const {resolver:target}=resolver({fetchImpl:async()=>response(manifest(next,future))});
 assert.equal(await target.resolve(),fallback);
 assert.throws(()=>createPreviewEndpointResolver({fallback:'http://127.0.0.1:9000',enabled:true}),TypeError);
 assert.throws(()=>createPreviewEndpointResolver({fallback,enabled:true,manifestURL:'https://example.com/backend.json'}),TypeError);
});

test('disabled resolver preserves local fallback and never fetches',async()=>{
 let calls=0;
 const local='http://127.0.0.1:9000/path?fixture=1';
 const target=createPreviewEndpointResolver({fallback:local,fetchImpl:async()=>{calls++;throw new Error('must not fetch');}});
 assert.equal(target.current(),local);
 assert.equal(await target.resolve(),local);
 assert.equal(target.reportFailure(),false);
 assert.equal(calls,0);
});

test('timeout is bounded even if fetch ignores abort and leaves the fallback current',async()=>{
 let aborted=false;
 const {resolver:target}=resolver({timeoutMs:15,fetchImpl:(_url,{signal})=>{signal.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});}});
 const started=Date.now();
 assert.equal(await target.resolve(),fallback);
 assert.ok(Date.now()-started<250);
 assert.equal(aborted,true);
});

test('uses the fixed public manifest location',()=>{
 assert.equal(previewEndpointManifestURL,'https://raw.githubusercontent.com/oscarbrendonn/67park-foundation-next/ops-endpoint/backend.json');
 assert.equal(previewEndpointRecoveryManifestURL,'https://api.github.com/repos/oscarbrendonn/67park-foundation-next/contents/backend.json?ref=ops-endpoint');
});
