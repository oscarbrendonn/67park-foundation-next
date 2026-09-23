// Narrow mechanical cache/asset edits; never regenerate the integrated bundle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
function edit(file,fn){const url=new URL(file,root),old=fs.readFileSync(url,'utf8'),next=fn(old);if(next!==old){fs.writeFileSync(url,next);console.log('Synced',file);}}
edit('island/runtime.bundle.js',s=>{
 for(const [from,to] of [['park-toys-v57.glb?v=1','park-animals-1.glb?v=animals-1'],['park-layout-v57.json?v=1','park-layout-v57.json?v=animals-1']]){
  if(s.includes(to)){assert(!s.includes(from));continue;}
  // Layout occurs in both the existing startup manifest and the actual fetch.
  assert.equal(s.split(from).length,from.startsWith('park-layout')?3:2,from);s=s.replaceAll(from,to);
 }
 const before='v.filter(C=>!["plinth","bridge","sculpture"].includes(C.zone)&&C.asset!=="shrub")';
 const after='v.filter(C=>!["plinth","bridge"].includes(C.zone)&&C.asset!=="shrub")';
 if(!s.includes(after)){assert.equal(s.split(before).length,2,'exact prop collider filter');s=s.replace(before,after);}
 return s;
});
for(const file of ['app/main.js','explore/explore.js'])edit(file,s=>s.replace(/runtime\.bundle\.js\?v=(?:photo-surfaces-1|park-animals-1)/g,'runtime.bundle.js?v=park-animals-solid-1'));
for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','overview/index.html','style-studio/index.html'])edit(file,s=>s.replace(/(app\/main\.js|explore\.js)\?v=[a-zA-Z0-9_-]+/g,'$1?v=park-animals-solid-1'));
