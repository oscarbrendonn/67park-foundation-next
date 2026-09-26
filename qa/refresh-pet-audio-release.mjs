import fs from 'node:fs';
import assert from 'node:assert/strict';
const path='/67park-foundation-next/app/party/party-audio.js',target=path+'?v=pet-play-2';
for(const file of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
 const source=fs.readFileSync(file,'utf8'),rx=/<script type="importmap">([\s\S]*?)<\/script>/,match=source.match(rx);assert(match,file);
 const map=JSON.parse(match[1]);
 for(const key of Object.keys(map.imports))if(key.split('?')[0]===path)map.imports[key]=target;
 map.imports[path]=target;map.imports[path+'?v=horn-hold-1']=target;map.imports[target]=target;
 const next=source.replace(rx,'<script type="importmap">'+JSON.stringify(map)+'</script>');if(next!==source)fs.writeFileSync(file,next);
}
