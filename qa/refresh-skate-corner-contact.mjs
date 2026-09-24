// Asserted bundle integration and cache-key propagation, never a full rebuild.
// The shipped bundle includes independent features absent from runtime.js.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const revision='rail-corner-1',write=process.argv.includes('--write');
const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n')
  .filter(f=>/\.(js|html)$/.test(f)&&!f.startsWith('qa/')&&!f.startsWith('server/')&&!f.startsWith('vendor/'));
const original=new Map(files.map(f=>[f,fs.readFileSync(f,'utf8')])),updated=new Map(original);
const bundle='island/runtime.bundle.js',old='Ze=(U,m0,k0)=>Je(U,m0,k0)||g4(h8.railSegments,U,m0,k0)',next='Ze=__railCornerBlocker(h8.railSegments,Je)';
let s=updated.get(bundle);
if(!s.includes(next)){
  if(s.split(old).length!==2)throw Error('Stair blocker bundle anchor changed');
  s="import {createStairRailBlocker as __railCornerBlocker} from '../app/stair-rail-contact.js?v="+revision+"';\n"+s.replace(old,next);
  updated.set(bundle,s);
}
const changed=new Set(['character-contact.js','runtime.bundle.js']);
let again=true;
while(again){again=false;
  const replace=s=>{for(const name of changed)s=s.replaceAll(new RegExp(name.replaceAll('.','\\.')+'\\?v=[a-zA-Z0-9_-]+','g'),name+'?v='+revision);return s;};
  for(const [f,source]of updated){
    const maps=[];
    let text=source.replace(/<script type="importmap">([\s\S]*?)<\/script>/g,(_,json)=>{
      const map=JSON.parse(json);for(const k of Object.keys(map.imports))map.imports[k]=replace(map.imports[k]);
      maps.push('<script type="importmap">'+JSON.stringify(map)+'</script>');return 'IMPORT_MAP_'+(maps.length-1);
    });
    text=replace(text).replace(/IMPORT_MAP_(\d+)/g,(_,i)=>maps[i]);
    if(text!==source){updated.set(f,text);if(!changed.has(path.basename(f))){changed.add(path.basename(f));again=true;}}
  }
}
const touched=[];
for(const [f,s]of updated)if(s!==original.get(f)){touched.push(f);if(write)fs.writeFileSync(f,s);}
const pkg=fs.readFileSync('package.json','utf8');
if(!pkg.includes('qa/stair-rail-contact.test.mjs')){
  if(pkg.split('qa/character-contact.test.mjs').length!==2)throw Error('Unit test script anchor changed');
  touched.push('package.json');
  if(write)fs.writeFileSync('package.json',pkg.replace('qa/character-contact.test.mjs','qa/character-contact.test.mjs qa/stair-rail-contact.test.mjs'));
}
console.log(JSON.stringify({revision,write,touched},null,2));
