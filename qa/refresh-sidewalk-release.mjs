// Asserted mechanical edits in both maintained runtimes; no old-source rebuild.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='sidewalk-materials-1',changes=[];
for(const file of ['island/runtime.js','island/runtime.bundle.js']){
 const url=new URL(file,root),old=fs.readFileSync(url,'utf8');let next=old;
 const line="import {applySidewalkMaterials} from '../app/sidewalk-materials.js?v="+revision+"';\n";
 if(!next.includes(line))next=line+next;
 const marker=/(renderer|r)\.domElement\.dataset\.mapEdgeFinish1=JSON\.stringify\(applyMapEdgeFinish\((kok|h0),await (islandFetch|__boundaryFetch)\('\/67park-foundation-next\/repairs\/map-edge-finish-1.json(?:\?v=[a-zA-Z0-9_-]+)?'\)\.then\(r=>\{if\(!r.ok\)throw Error\('Map edge repair missing'\);return r.json\(\)\}\)\)\);/g;
 if([...next.matchAll(marker)].length!==1)throw Error('Ambiguous sidewalk integration: '+file);
 if(!next.includes('dataset.sidewalkMaterials1='))next=next.replace(marker,(all,renderer,terrain)=>all+renderer+'.domElement.dataset.sidewalkMaterials1=JSON.stringify(applySidewalkMaterials('+(terrain==='kok'?'sahne':'e')+','+terrain+'));');
 if(next!==old){changes.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}
}
for(const file of ['app/main.js','explore/explore.js','index.html','explore/index.html','play/index.html']){
 const url=new URL(file,root),old=fs.readFileSync(url,'utf8');
 // This historical migration must never downgrade a later release key.
 let next=old.replace(/runtime\.bundle\.js\?v=map-edge-finish-1/g,'runtime.bundle.js?v='+revision);
 if(file.endsWith('.html'))next=next.replace(/app\/main\.js\?v=map-edge-finish-1/g,'app/main.js?v='+revision).replace(/explore\.js\?v=map-edge-finish-1/g,'explore.js?v='+revision);
 if(next!==old){changes.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}
}
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),files:changes}));
