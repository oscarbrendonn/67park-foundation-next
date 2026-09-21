// Bounded, asserted integration. Never regenerate the integrated runtime from
// older source, or alter movement/camera/network singleton module identities.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='park-entry-finish-1',changed=[];
function edit(file,fn){const url=new URL(file,root),old=fs.readFileSync(url,'utf8'),next=fn(old);if(next!==old){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,next);}}
for(const file of ['island/runtime.js','island/runtime.bundle.js'])edit(file,s=>{
 const imp="import {applyParkEntryFinish} from '../app/park-entry-finish.js?v="+revision+"';\n";
 if(!s.includes(imp))s=imp+s;
 if(!s.includes('dataset.parkEntryFinish1=')){
  const marker=/((renderer|r)\.domElement\.dataset\.sidewalkMaterials1=JSON\.stringify\(applySidewalkMaterials\((sahne|e),(kok|h0)\)\);)/g;
  if([...s.matchAll(marker)].length!==1)throw Error('Ambiguous park-entry integration: '+file);
  s=s.replace(marker,(_all,statement,renderer,scene,root)=>statement+renderer+".domElement.dataset.parkEntryFinish1=JSON.stringify(applyParkEntryFinish("+root+",await "+(file.endsWith('bundle.js')?'__boundaryFetch':'islandFetch')+"('/67park-foundation-next/repairs/park-entry-finish-1.json?v="+revision+"').then(r=>{if(!r.ok)throw Error('Park entry finish missing');return r.json()})));" );
 }
 return s;
});
for(const file of ['app/main.js','explore/explore.js'])edit(file,s=>s.replace(/runtime\.bundle\.js\?v=[a-zA-Z0-9_-]+/g,'runtime.bundle.js?v='+revision));
const htmls=['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','overview/index.html','style-studio/index.html'];
for(const file of htmls)edit(file,s=>s.replace(/app\/main\.js\?v=[a-zA-Z0-9_-]+/g,'app/main.js?v='+revision).replace(/explore\.js\?v=[a-zA-Z0-9_-]+/g,'explore.js?v='+revision));
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),changed}));
