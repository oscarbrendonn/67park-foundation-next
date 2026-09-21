// Asserted, idempotent integration into both maintained runtimes. Never rebuild
// the generated bundle from an older source or change shared singleton keys.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='map-edge-finish-1';
const changed=[];
for(const file of ['island/runtime.js','island/runtime.bundle.js']){
 const url=new URL(file,root),old=fs.readFileSync(url,'utf8');let next=old;
 // Real divider geometry already supplies its edge. This old broad shader
 // highlight painted a pale white streak beside it on every grass parcel.
 const halo='diffuseColor.rgb*=1.0+k2A67*0.03;',noHalo='// No painted divider highlight: use the physical edge.';
 if(!next.includes(noHalo)){
  if(next.split(halo).length!==2)throw Error('Ambiguous divider halo: '+file);
  next=next.replace(halo,noHalo);
 }
 const line="import {applyMapEdgeFinish} from '../app/map-edge-finish.js?v="+revision+"';\n";
 if(!next.includes(line))next=line+next;
 const marker=/((renderer|r)\.domElement\.dataset\.grassBoundary1=JSON\.stringify\(applyGrassBoundary\((kok|h0),await (islandFetch|__boundaryFetch)\('\/67park-foundation-next\/repairs\/grass-boundary-1.json'\)\.then\(r=>\{if\(!r.ok\)throw Error\('Grass boundary repair missing'\);return r.json\(\)\}\)\)\);)/g;
 if([...next.matchAll(marker)].length!==1)throw Error('Ambiguous map-edge insertion: '+file);
 if(!next.includes('dataset.mapEdgeFinish1='))next=next.replace(marker,(all,statement,renderer,scene,fetcher)=>statement+renderer+".domElement.dataset.mapEdgeFinish1=JSON.stringify(applyMapEdgeFinish("+scene+",await "+fetcher+"('/67park-foundation-next/repairs/map-edge-finish-1.json').then(r=>{if(!r.ok)throw Error('Map edge repair missing');return r.json()})));" );
 // The existing shadow-only side copy must use the same repaired paving.
 const sourceList="['3_CIMEN','8_PARK_PATIKA_UST','6_BORDUR','5_YOL']";
 const bundleList='["3_CIMEN","8_PARK_PATIKA_UST","6_BORDUR","5_YOL"]';
 const oldList=file.endsWith('bundle.js')?bundleList:sourceList;
 const newList=oldList.slice(0,-1)+(file.endsWith('bundle.js')?',"7_KALDIRIM_TABANI"]':",'7_KALDIRIM_TABANI']");
 if(!next.includes(newList)){
  if(next.split(oldList).length!==2)throw Error('Ambiguous shadow refresh list');
  next=next.replace(oldList,newList);
 }
 if(next!==old){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}
}
// Refresh every entry importing this runtime, without rewriting test fixtures.
for(const file of ['app/main.js','explore/explore.js','index.html','explore/index.html','play/index.html']){
 const url=new URL(file,root),old=fs.readFileSync(url,'utf8');
 let next=old.replace(/runtime\.bundle\.js\?v=[a-zA-Z0-9_-]+/g,'runtime.bundle.js?v='+revision);
 if(file.endsWith('.html'))next=next.replace(/app\/main\.js\?v=[a-zA-Z0-9_-]+/g,'app/main.js?v='+revision).replace(/explore\.js\?v=[a-zA-Z0-9_-]+/g,'explore.js?v='+revision);
 if(next!==old){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}
}
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),files:changed}));
