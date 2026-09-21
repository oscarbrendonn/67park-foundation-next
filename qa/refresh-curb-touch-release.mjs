// Mechanical, asserted cache bump for the geometry-only follow-up. Preserve
// shared camera, wardrobe, audio and recovery module identities from recovery1.
import fs from 'node:fs';
const revision='curb-touch-finish-1',root=new URL('../',import.meta.url),changed=[];
const edits=[
 ['island/runtime.js','repairs/map-edge-finish-1.json'],
 ['island/runtime.bundle.js','repairs/map-edge-finish-1.json'],
 ['app/main.js','runtime.bundle.js'],
 ['explore/explore.js','runtime.bundle.js'],
 ['index.html','app/main.js'],
 ['explore/index.html','explore.js'],
 ['qa/map-edge-finish.live.cjs','repairs/map-edge-finish-1.json'],
];
for(const [file,target]of edits){
 const url=new URL(file,root),before=fs.readFileSync(url,'utf8');
 const needle=new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=[a-zA-Z0-9_-]+','g');
 const matches=[...before.matchAll(needle)];
 if(matches.length!==1)throw Error(`Expected one ${target} reference in ${file}; found ${matches.length}`);
 const after=before.replace(needle,target+'?v='+revision);
 if(after!==before){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,after);}
}
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),changed}));
