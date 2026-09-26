import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export function targetClubRelease(source){
 const path='/67park-foundation-next/app/party/party-pack.js',target=path+'?v=target-club-1';
 const pattern=/<script type="importmap">([\s\S]*?)<\/script>/,match=source.match(pattern);assert(match);
 const map=JSON.parse(match[1]);let count=0;
 for(const key of Object.keys(map.imports))if(key.split('?')[0]===path){map.imports[key]=target;count++;}
 assert(count>=3,'party aliases missing');map.imports[target]=target;
 const script=/<script type="module" src="\/67park-foundation-next\/app\/party\/party-pack\.js\?v=[^"]+"><\/script>/g;
 assert.equal([...source.matchAll(script)].length,1,'party entry must be unique');
 return source.replace(pattern,'<script type="importmap">'+JSON.stringify(map)+'</script>').replace(script,`<script type="module" src="${target}"></script>`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=new URL('../index.html',import.meta.url),before=fs.readFileSync(file,'utf8'),after=targetClubRelease(before);
 if(process.argv.includes('--write')&&before!==after)fs.writeFileSync(file,after);
 console.log(JSON.stringify({changed:before!==after,write:process.argv.includes('--write')}));
}
