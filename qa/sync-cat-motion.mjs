// Add the cat to the existing motion-family allowlist; no physics edits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const edits=new Map();
for(const file of ['app/claude-gorilla-runtime.js','skybound-soft/course-edf81ca8e2af595ed4d3.js']){
 const source=fs.readFileSync(file,'utf8'),anchor='Object.freeze(["goril",...';
 assert.equal(source.split(anchor).length,2,file);
 edits.set(file,source.replace(anchor,'Object.freeze(["goril","cat67",...'));
}
for(const file of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
 let source=fs.readFileSync(file,'utf8');const match=source.match(/<script type="importmap">([\s\S]*?)<\/script>/);assert(match);
 const map=JSON.parse(match[1]);
 for(const path of ['app/claude-gorilla-runtime.js','app/minigame-character-motion.js']){
  const base='/67park-foundation-next/'+path,target=base+'?v=cat-character-1';
  for(const [key,value]of Object.entries(map.imports))if(key.split('?')[0]===base){map.imports[key]=target;map.imports[value]=target;}
  map.imports[base]=target;
 }
 edits.set(file,source.replace(match[1],JSON.stringify(map)));
}
for(const [file,source]of edits){fs.writeFileSync(file,source);console.log('CAT_MOTION_SYNC',file)}
