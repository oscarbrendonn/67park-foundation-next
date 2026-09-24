import fs from 'node:fs';
import assert from 'node:assert/strict';
// Deliberately patch both maintained runtime variants; never rebuild the
// complete bundle from the older source runtime.
for(const [file,root,renderer,fetcher,anchor] of [
 ['island/runtime.js','kok','renderer','islandFetch',"for(const name of ['3_CIMEN','8_PARK_PATIKA_UST','6_BORDUR','5_YOL','7_KALDIRIM_TABANI','67D_SKATEPARK_BASE'])"],
 ['island/runtime.bundle.js','h0','r','__boundaryFetch','for(let _ of["3_CIMEN","8_PARK_PATIKA_UST","6_BORDUR","5_YOL","7_KALDIRIM_TABANI","67D_SKATEPARK_BASE"])']
]){
 let s=fs.readFileSync(file,'utf8');if(s.includes('dataset.mapJointFinish1='))continue;
 assert.equal(s.split(anchor).length,2);assert(s.indexOf(anchor)>s.indexOf('dataset.northHousingSurface1='));
 const call=`${renderer}.domElement.dataset.mapJointFinish1=JSON.stringify(applyMapJointFinish(${root},await ${fetcher}('/67park-foundation-next/repairs/map-joint-finish-1.json?v=map-joint-finish-1').then(r=>{if(!r.ok)throw Error('Map joint repair missing');return r.json()})));`;
 s="import {applyMapJointFinish} from '../app/map-joint-finish.js?v=map-joint-finish-1';\n"+s.replace(anchor,call+anchor);fs.writeFileSync(file,s);
}
// Preserve every old alias key and unrelated singleton mapping. Only route
// the existing island-runtime aliases to the new geometry revision.
for(const file of ['index.html','explore/index.html','play/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
 let s=fs.readFileSync(file,'utf8');const pattern=/<script type="importmap">([\s\S]*?)<\/script>/;
 const match=s.match(pattern);assert(match,'Missing import map: '+file);
 const map=JSON.parse(match[1]),target='/67park-foundation-next/island/runtime.bundle.js?v=map-joint-finish-1';
 let count=0;for(const [key,value]of Object.entries(map.imports))if(value.split('?')[0]==='/67park-foundation-next/island/runtime.bundle.js'){map.imports[key]=target;count++;}
 assert(count>=3);map.imports[target]=target;
 s=s.replace(/(67park.entry.downloads.v1"\)\]=)([^;]+);/,(_m,prefix,text)=>{
  const manifest=JSON.parse(text),url='/67park-foundation-next/repairs/map-joint-finish-1.json?v=map-joint-finish-1';
  if(!manifest.some(r=>r.url===url))manifest.push({url,bytes:fs.statSync('repairs/map-joint-finish-1.json').size});
  for(const item of manifest)item.bytes=fs.statSync(item.url.split('?')[0].replace('/67park-foundation-next/','')).size;
  return prefix+JSON.stringify(manifest)+';';
 });
 fs.writeFileSync(file,s.replace(pattern,'<script type="importmap">'+JSON.stringify(map)+'</script>'));
}
