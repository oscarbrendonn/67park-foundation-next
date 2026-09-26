// Mechanical root-entry cache refresh. Preserve pending pet/memory edits and
// every old alias; change only the three horn dependency targets.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='index.html',before=fs.readFileSync(file,'utf8'),revision='horn-hold-1';
const re=/<script type="importmap">([\s\S]*?)<\/script>/,match=before.match(re);assert(match);
const map=JSON.parse(match[1]);
// The previous entry script may not already be an import-map key. Retain it
// as an alias too, so old entry URLs resolve to this same module instance.
for(const [,src] of before.matchAll(/src="(\/67park-foundation-next\/app\/party\/party-pack\.js\?v=[^"]+)"/g))map.imports[src]=src;
for(const name of ['party-pack','party-audio','vehicle-horn']){
 const path='/67park-foundation-next/app/party/'+name+'.js',target=path+'?v='+revision;
 for(const key of Object.keys(map.imports))if(key.split('?')[0]===path)map.imports[key]=target;
 map.imports[path]=target;map.imports[target]=target;
}
let after=before.replace(re,'<script type="importmap">'+JSON.stringify(map)+'</script>');
after=after.replace(/(src="\/67park-foundation-next\/app\/party\/party-pack\.js\?v=)[^"]+"/g,'$1'+revision+'"');
assert.equal(fs.readFileSync(file,'utf8'),before);if(after!==before)fs.writeFileSync(file,after);
console.log('HORN_ENTRY_REVISION',revision);
