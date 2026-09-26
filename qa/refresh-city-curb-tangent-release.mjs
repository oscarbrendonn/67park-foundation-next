// Narrow mechanical cache revision; preserves unrelated in-progress HTML edits.
// Never rebuild runtime.bundle.js from the older source runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const revision='city-curb-tangent-2',patch='/67park-foundation-next/repairs/map-joint-finish-1.json';
const runtime='/67park-foundation-next/island/runtime.bundle.js',changes=[];
for(const file of ['island/runtime.js','island/runtime.bundle.js']){
 const before=fs.readFileSync(file,'utf8'),old=patch+'?v=map-joint-finish-1',next=patch+'?v='+revision;
 assert.equal(before.split(old).length+before.split(next).length,3,'Exactly one current repair URL: '+file);
 changes.push({file,before,after:before.replaceAll(old,next)});
}
for(const file of ['index.html','explore/index.html','play/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
 const before=fs.readFileSync(file,'utf8'),pattern=/<script type="importmap">([\s\S]*?)<\/script>/,match=before.match(pattern);assert(match,file);
 const map=JSON.parse(match[1]),target=runtime+'?v='+revision;let aliases=0;
 for(const key of Object.keys(map.imports))if(key.split('?')[0]===runtime){map.imports[key]=target;aliases++;}
 assert(aliases>=3,file);map.imports[target]=target;
 let after=before.replace(pattern,'<script type="importmap">'+JSON.stringify(map)+'</script>');
 after=after.replace(/(67park.entry.downloads.v1"\)\]=)([^;]+);/,(_m,prefix,text)=>{
  const rows=JSON.parse(text),targets=rows.filter(r=>r.url.split('?')[0]===patch);assert.equal(targets.length,1,file);
  targets[0].url=patch+'?v='+revision;targets[0].bytes=fs.statSync('repairs/map-joint-finish-1.json').size;
  return prefix+JSON.stringify(rows)+';';
 });
 changes.push({file,before,after});
}
for(const {file,before}of changes)assert.equal(fs.readFileSync(file,'utf8'),before,'File changed during preparation: '+file);
for(const {file,before,after}of changes)if(before!==after)fs.writeFileSync(file,after);
console.log('CITY_CURB_CACHE_REVISION',revision,changes.filter(c=>c.before!==c.after).map(c=>c.file));
