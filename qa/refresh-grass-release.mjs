// Explicit, idempotent injection into the existing generated runtime. Preserve
// unrelated hand-integrated vehicle/camera fixes; do not rebuild an older source.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='grass-boundary-1';
const files=['island/runtime.js','island/runtime.bundle.js'];
const importLine="import {applyGrassBoundary} from '../app/grass-boundary.js?v="+revision+"';\n";
const result=[];
for(const file of files){
 const url=new URL(file,root),old=fs.readFileSync(url,'utf8');let next=old;
 if(!next.includes(importLine))next=importLine+next;
 const call=/applyTerrainBoundaries\((kok|h0),await (islandFetch|__boundaryFetch)\('\/67park-foundation-next\/repairs\/terrain-boundaries-2.json\?v=ground-2'\)\.then\(r=>\{if\(!r.ok\)throw Error\('Terrain boundaries missing'\);return r.json\(\)\}\)\);/g;
 const matches=[...next.matchAll(call)];if(matches.length!==1)throw Error('Ambiguous terrain insertion in '+file);
 if(!next.includes('dataset.grassBoundary1='))next=next.replace(call,(original,name,fetcher)=>original+
  (file.endsWith('bundle.js')?'r':'renderer')+".domElement.dataset.grassBoundary1=JSON.stringify(applyGrassBoundary("+name+",await "+fetcher+"('/67park-foundation-next/repairs/grass-boundary-1.json').then(r=>{if(!r.ok)throw Error('Grass boundary repair missing');return r.json()})));" );
 if(next!==old){result.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}
}
// Only the actual importing module and entry URL change; the shared movement
// singleton URLs must stay identical across their entire existing module graph.
for(const file of ['app/main.js','index.html']){
 const url=new URL(file,root),old=fs.readFileSync(url,'utf8');
 const pattern=file==='app/main.js'?/runtime\.bundle\.js\?v=[a-zA-Z0-9_-]+/g:/app\/main\.js\?v=[a-zA-Z0-9_-]+/g;
 const next=old.replace(pattern,file==='app/main.js'?'runtime.bundle.js?v='+revision:'app/main.js?v='+revision);
 if(next!==old){result.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}
}
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),files:result}));
