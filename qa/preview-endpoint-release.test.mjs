import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('all game entries resolve old and current transport imports to one refreshed instance',()=>{
 for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','style-studio/index.html']){
  const map=JSON.parse(read(file).match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for(const name of ['preview-network','preview-network-config']){
   const path='/67park-foundation-next/app/'+name+'.js';
   for(const suffix of ['','?v=online-next-1','?v=mac-recovery-1'])assert.equal(map[path+suffix],path+'?v=mac-recovery-1',file+': '+name+suffix);
  }
 }
});
test('discovery is public-route only, happens before authentication, and sockets use the discovered origin',()=>{
 const source=read('app/preview-network.js');
 assert(source.includes("location.origin==='https://oscarbrendonn.github.io'"));
 assert(source.includes("location.pathname.startsWith('/67park-foundation-next/')"));
 assert(source.includes("const endpoint=path=>state.backend+'/'+PREVIEW_VARIANT+path"));
 assert(source.indexOf('state.backend=await resolver.resolve()')<source.indexOf('await fetch(endpoint('));
 assert(source.includes("new URL(endpoint('/'+channel))"));
 assert(source.includes("Symbol.for('67park.feel-lab.transport.v1.'+PREVIEW_VARIANT)"));
 assert(!read('app/preview-network-config.js').includes('fall-indexed-shipped-muscle'));
});
