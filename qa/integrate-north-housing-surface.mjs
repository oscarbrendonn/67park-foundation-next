// Asserted mechanical insertion in the maintained source and generated runtime.
import fs from 'node:fs';
for(const file of ['island/runtime.js','island/runtime.bundle.js']){
 let text=fs.readFileSync(file,'utf8');
 if(text.includes('dataset.northHousingSurface1='))continue;
 const bundle=file.endsWith('bundle.js');
 const list=bundle?'["3_CIMEN","8_PARK_PATIKA_UST","6_BORDUR","5_YOL","7_KALDIRIM_TABANI","67D_SKATEPARK_BASE"]':"['3_CIMEN','8_PARK_PATIKA_UST','6_BORDUR','5_YOL','7_KALDIRIM_TABANI','67D_SKATEPARK_BASE']";
 if(text.split(list).length!==2)throw Error('Ambiguous north housing insertion: '+file);
 const at=text.indexOf(list),loop=text.slice(at-60,at).match(/for\s*\(\s*(?:const|let)\s+\w+\s+of\s*$/);
 if(!loop)throw Error('Shadow refresh not found: '+file);
 const start=at-loop[0].length,r=bundle?'r':'renderer',root=bundle?'h0':'kok',fetch=bundle?'__boundaryFetch':'islandFetch';
 const statement=`${r}.domElement.dataset.northHousingSurface1=JSON.stringify(applyNorthHousingSurface(${root},await ${fetch}('/67park-foundation-next/repairs/north-housing-surface-1.json?v=north-housing-3').then(r=>{if(!r.ok)throw Error('Northern housing repair missing');return r.json()})));`;
 text="import {applyNorthHousingSurface} from '../app/north-housing-surface.js?v=north-housing-3';\n"+text.slice(0,start)+statement+text.slice(start);
 fs.writeFileSync(file,text);console.log('Integrated',file);
}
for(const file of ['app/main.js','explore/explore.js','index.html','explore/index.html']){
 const old=fs.readFileSync(file,'utf8');
 const next=old.replace(/(runtime\.bundle\.js|app\/main\.js|explore\.js)\?v=(?:gorilla-only-1|park-animals-solid-1)/g,'$1?v=north-housing-3');
 if(next===old)throw Error('Missing entry cache anchor: '+file);
 fs.writeFileSync(file,next);console.log('Entry cache',file);
}
