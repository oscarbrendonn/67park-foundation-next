import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createCharacterAssetStore} from '../app/character-assets.js';
import {compileEntryGraphics} from '../app/entry-graphics.js';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
import './returning-entry.test.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('packed animation/bind data decodes byte-for-byte and original Draco streams are unchanged',async()=>{
 await MeshoptDecoder.ready;
 for(const report of JSON.parse(fs.readFileSync('models/park-originals/lossless-report.json'))){
  const bytes=fs.readFileSync(report.file),length=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
  assert.equal(hash(bytes),report.afterSha256);assert(report.after<report.before*.86);assert(report.gzipAfter<report.gzipBefore*.88);
  assert(j.extensionsRequired.includes('EXT_meshopt_compression'));
  for(const proof of report.views){
   const v=j.bufferViews[proof.index],e=v.extensions?.EXT_meshopt_compression;let decoded;
   if(e){assert.equal(e.filter,'NONE');decoded=new Uint8Array(v.byteLength);MeshoptDecoder.decodeGltfBuffer(decoded,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
   else decoded=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
   assert.equal(hash(decoded),proof.sha256);assert.equal(decoded.length,proof.decodedBytes);
   if(proof.dracoUnchanged)assert(!e,'Never re-encode Draco geometry');
  }
 }
});
test('wardrobe, local and remote consumers share one fetch/parse; arrays start together',async()=>{
 const calls=[],store=createCharacterAssetStore(async url=>{calls.push(url);return {url};});let pending;
 try{store.read(['cat','outfit']);}catch(e){pending=e;}
 assert(pending instanceof Promise);const duplicate=store.load('cat');await pending;
 assert.equal(await duplicate,store.read('cat'));assert.deepEqual(calls,['cat','outfit']);
 assert.deepEqual(store.read([]),[]);assert.equal(store.read(['cat','outfit'])[0],store.read('cat'));
 const paths=['cat','outfit'];assert.equal(store.read(paths),store.read(paths),'Stable array identity prevents React readiness update loops');
});
test('failed character preserves an error until explicit retry, without a retry loop',async()=>{
 let calls=0;const store=createCharacterAssetStore(async()=>{if(++calls===1)throw Error('offline');return 'ready';});
 await assert.rejects(store.load('cat'),/offline/);assert.throws(()=>store.read('cat'),/offline/);assert.equal(calls,1);
 store.clear('cat');await store.load('cat');assert.equal(store.read('cat'),'ready');assert.equal(calls,2);
 store.clear('cat');assert.equal(store.read('cat'),'ready','Do not discard shared successful templates');
});
test('entry shader completion is awaited; lost context and stalled compile expose errors',async()=>{
 const canvas=new EventTarget();let lost=false,done=false;
 const renderer={domElement:canvas,getContext:()=>({isContextLost:()=>lost}),compileAsync:async()=>{await new Promise(r=>setTimeout(r,5));done=true;}};
 await compileEntryGraphics(renderer,{},{});assert(done);
 lost=true;await assert.rejects(compileEntryGraphics(renderer,{},{}),/Graphics memory/);lost=false;
 renderer.compileAsync=()=>new Promise(()=>{});
 const pending=compileEntryGraphics(renderer,{},{},{timeoutMs:1000});canvas.dispatchEvent(new Event('webglcontextlost'));await assert.rejects(pending,/Graphics memory/);
 await assert.rejects(compileEntryGraphics(renderer,{},{},{timeoutMs:10}),/took too long/);
});
test('map manifest has exact current bytes and no forced Gorilla/preload duplicates',()=>{
 const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('app/main.js','utf8'),runtime=fs.readFileSync('island/runtime.bundle.js','utf8');
 const manifest=JSON.parse(html.match(/67park.entry.downloads.v1"\)\]=([^;]+);/)[1]);
 assert(manifest.length>20);for(const item of manifest){assert(!item.url.includes('/models/'));assert.equal(fs.statSync(item.url.split('?')[0].replace('/67park-foundation-next/','')).size,item.bytes,item.url);}
 assert(manifest.some(x=>x.url.endsWith('park-layout-v57.json?v=animals-1')));
 assert(!html.includes("67park.character.v"));assert(!main.includes('To.preload(`${vi}models/goril-motion-v3.glb`)'));
 assert(!runtime.includes("l.rel='preload'"));assert(main.includes('useGLTF:__readCharacterAsset'));
 assert(main.includes('const enter=()=>{if(view==="collection"&&avatarEntrySnapshot().status!=="error"&&loadingState.status!=="error")'),'Retry bypasses normal collection navigation');
 for(const file of ['index.html','play/index.html','style-studio/index.html','race/index.html','balloon/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html']){
  const s=fs.readFileSync(file,'utf8'),map=JSON.parse(s.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for(const name of ['app/main.js','app/native-character.js','app/returning-entry.js','app/character-assets.js','app/entry-graphics.js','island/runtime.bundle.js']){
   const path='/67park-foundation-next/'+name;assert.equal(map[path],path+'?v='+(name==='island/runtime.bundle.js'?'stand-finish-1':'entry-light-1'));
   for(const [key,value] of Object.entries(map))if(key.split('?')[0]===path)assert.equal(value,map[path]);
  }
 }
});
