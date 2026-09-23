// Exact mechanical edits of shipped bundles; no rebuild from stale sources.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const revision='gorilla-only-1';
const stores=[
 ['app/chunk-G7D6MVRW.js','var pr=C4(),','var pr=__adoptPlayable(C4()),'],
 ['app/chunk-55YKN7VY.js','var pr=C4(),','var pr=__adoptPlayable(C4()),'],
 ['balloon/chunk-U4P5F7P3.js','var Qe=gs(),','var Qe=__adoptPlayable(gs()),'],
 ['race/race.js','var cn=Ui(),','var cn=__adoptPlayable(Ui()),'],
 ['rockets/rockets.js','var sn=Li(),','var sn=__adoptPlayable(Li()),'],
 ['sports/sports.js','var nr=Ga(),','var nr=__adoptPlayable(Ga()),'],
 ['skybound-soft/course-edf81ca8e2af595ed4d3.js','var FE=tO();','var FE=__adoptPlayable(tO());'],
];
function replace(source,before,after,file){if(source.includes(after))return source;assert.equal(source.split(before).length,2,file+': unique '+before);return source.replace(before,after);}
for(const [file,before,after] of stores){
 let source=fs.readFileSync(file,'utf8');
 source=replace(source,before,after,file);
 const header='import {adoptPlayableCharacter as __adoptPlayable} from "/67park-foundation-next/app/playable-character.js?v='+revision+'";\n';
 if(!source.includes(header))source=header+source;
 if(file.startsWith('app/chunk-')){
  source=replace(source,'if(e==="base")return Xr.map(a=>a.id);','if(e==="base")return ["goril"];',file);
  source=replace(source,'function OL(e){if(!Xr.some(n=>n.id===e))return;','function OL(e){if(e!=="goril")return;',file);
 }
 fs.writeFileSync(file,source);
}
const main='app/main.js';
fs.writeFileSync(main,replace(fs.readFileSync(main,'utf8'),'CHARACTERS:ko,getPlayerName:','CHARACTERS:ko.filter(c=>c.id==="goril"),getPlayerName:',main));
const changed=new Set(stores.map(([file])=>'/67park-foundation-next/'+file));
const entries=['index.html','play/index.html','explore/index.html','overview/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html'];
for(const file of entries){
 let html=fs.readFileSync(file,'utf8');const match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
 if(match){
  const map=JSON.parse(match[1]);
  for(const [key,value] of Object.entries(map.imports))if(changed.has(key.split('?')[0])){
   const target=key.split('?')[0]+'?v='+revision;map.imports[key]=target;map.imports[value]=target;
  }
  html=html.replace(match[1],JSON.stringify(map));
 }
 const scriptRevisions={
  'index.html':['app/main.js?v=park-animals-solid-1','app/main.js?v='+revision],
  'race/index.html':['./race.js?v=online-next-1','./race.js?v='+revision],
  'rockets/index.html':['./rockets.js?v=online-next-1','./rockets.js?v='+revision],
  'sports/index.html':['./sports.js?v=online-next-1','./sports.js?v='+revision],
  'skybound-soft/index.html':['./course-edf81ca8e2af595ed4d3.js?v=running-camera-1','./course-edf81ca8e2af595ed4d3.js?v='+revision],
 };
 if(scriptRevisions[file])html=replace(html,...scriptRevisions[file],file);
 fs.writeFileSync(file,html);
}
console.log('GORILLA_ONLY_BUNDLES_SYNCED',stores.length);
