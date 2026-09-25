// Refresh only the Cat module alias, preserving unrelated working-tree changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const files=['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','pet-play-preview/index.html'];
export function refreshCatAlias(html){
 const key='/67park-foundation-next/app/native-character.js',target=key+'?v=cat-silver-1';
 return html.replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,body)=>{
  const map=JSON.parse(body);assert(map.imports[key]);
  for(const alias of Object.keys(map.imports))if(alias.split('?')[0]===key)map.imports[alias]=target;
  map.imports[target]=target;return '<script type="importmap">'+JSON.stringify(map)+'</script>';
 });
}
for(const file of files)fs.writeFileSync(file,refreshCatAlias(fs.readFileSync(file,'utf8')));
// Build the staged root entry from HEAD, never from the unrelated pet draft.
const before=execFileSync('git',['show','HEAD:index.html'],{encoding:'utf8'}),after=refreshCatAlias(before);
fs.mkdirSync('.qa-results/cat-finish-stage',{recursive:true});
fs.writeFileSync('.qa-results/cat-finish-stage/index-before.html',before);
fs.writeFileSync('.qa-results/cat-finish-stage/index-after.html',after);
let diff;try{diff=execFileSync('git',['diff','--no-index','--','.qa-results/cat-finish-stage/index-before.html','.qa-results/cat-finish-stage/index-after.html'],{encoding:'utf8'});}catch(e){assert.equal(e.status,1);diff=e.stdout;}
diff=diff.replaceAll('a/.qa-results/cat-finish-stage/index-before.html','a/index.html').replaceAll('b/.qa-results/cat-finish-stage/index-after.html','b/index.html');
fs.writeFileSync('.qa-results/cat-finish-stage/index-only.patch',diff);
console.log('CAT_ALIASES_REFRESHED',files.length);
