import fs from 'node:fs';
import assert from 'node:assert/strict';
const revision='stand-finish-1';
const edit=(file,change)=>{const old=fs.readFileSync(file,'utf8'),next=change(old);if(old!==next)fs.writeFileSync(file,next);};
const once=(s,from,to)=>{if(s.includes(to))return s;assert.equal(s.split(from).length,2,from);return s.replace(from,to);};
edit('package.json',s=>once(s,'--test qa/entry-light.test.mjs','--test qa/sports-stand-finish.test.mjs qa/entry-light.test.mjs'));
edit('island/runtime.bundle.js',s=>{
 const imp='import {finishSportsStands as __finishSportsStands} from "../app/sports-stand-finish.js?v=stand-finish-1";\n';
 if(!s.includes(imp))s=imp+s;
 return once(s,'l.name="NORTHWEST_SPORTS_V97",l.position.set(a.origin[0],c,a.origin[1]);','l.name="NORTHWEST_SPORTS_V97",l.position.set(a.origin[0],c,a.origin[1]);__finishSportsStands(l,a);');
});
for(const f of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','overview/index.html'])edit(f,s=>s.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_m,start,json,end)=>{
 const map=JSON.parse(json);
 for(const name of ['island/runtime.bundle.js','island/northwest-sports-v97.js','app/sports-stand-finish.js']){
  const path='/67park-foundation-next/'+name,target=path+'?v='+revision;
  for(const[k,v]of Object.entries(map.imports))if(k.split('?')[0]===path||v.split('?')[0]===path)map.imports[k]=target;
  map.imports[path]=target;map.imports[target]=target;
  if(name==='island/northwest-sports-v97.js')map.imports[path+'?v=release-40']=target;
 }
 return start+JSON.stringify(map)+end;
}));
