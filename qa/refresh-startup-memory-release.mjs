// Narrow mechanical update: do not rebuild the hand-maintained runtime bundle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const revision='city-startup-memory-1',runtime='/67park-foundation-next/island/runtime.bundle.js',changes=[];
function change(file,transform){const before=fs.readFileSync(file,'utf8');changes.push({file,before,after:transform(before)});}
change('island/runtime.bundle.js',s=>{
 const old='for(let H of k.geometry)H.dispose()}l.updateMatrixWorld(!0);let x=n3(',next='for(let H of k.geometry)H.dispose()}u.clear();l.updateMatrixWorld(!0);let x=n3(';
 assert.equal(s.split(old).length+s.split(next).length,3,'Exactly one City60 scratch release anchor');
 return s.replace(old,next);
});
change('island/runtime.js',s=>{
 const old="from './city-props-v60.js?v=photo67'",next="from './city-props-v60.js?v="+revision+"'";
 assert.equal(s.split(old).length+s.split(next).length,3);return s.replace(old,next);
});
for(const file of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html'])change(file,s=>{
 const pattern=/<script type="importmap">([\s\S]*?)<\/script>/,match=s.match(pattern);assert(match,file);
 const map=JSON.parse(match[1]),target=runtime+'?v='+revision;let aliases=0;
 for(const key of Object.keys(map.imports))if(key.split('?')[0]===runtime){map.imports[key]=target;aliases++;}
 assert(aliases>=3,file);map.imports[target]=target;
 return s.replace(pattern,'<script type="importmap">'+JSON.stringify(map)+'</script>');
});
for(const {file,before}of changes)assert.equal(fs.readFileSync(file,'utf8'),before,'File changed during preparation: '+file);
for(const {file,before,after}of changes)if(before!==after)fs.writeFileSync(file,after);
console.log('STARTUP_MEMORY_REVISION',revision,changes.filter(c=>c.before!==c.after).map(c=>c.file));
