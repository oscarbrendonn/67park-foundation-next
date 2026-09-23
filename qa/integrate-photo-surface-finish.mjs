// Asserted mechanical insertion in the maintained source and generated runtime.
// Do not rebuild the bundle from an older source or dispatch a deployment.
import fs from 'node:fs';
for(const file of ['island/runtime.js','island/runtime.bundle.js']){
 const old=fs.readFileSync(file,'utf8');let next=old;
 if(next.includes('dataset.photoSurfaceFinish1='))continue;
 next="import {applyPhotoSurfaceFinish} from '../app/photo-surface-finish.js?v=photo-surfaces-1';\n"+next;
 // Locate the exact shadow-refresh list and its loop, not a guessed bundle
 // variable. The earlier repairs already expose renderer and root names.
 const list=file.endsWith('bundle.js')?'["3_CIMEN","8_PARK_PATIKA_UST","6_BORDUR","5_YOL","7_KALDIRIM_TABANI"]':"['3_CIMEN','8_PARK_PATIKA_UST','6_BORDUR','5_YOL','7_KALDIRIM_TABANI']";
 if(next.split(list).length!==2)throw Error('Ambiguous photo surface insertion: '+file);
 const at=next.indexOf(list),prefix=next.slice(Math.max(0,at-50),at),loop=prefix.match(/for\s*\(\s*(?:const|let)\s+\w+\s+of\s*$/);
 if(!loop)throw Error('Shadow loop not found: '+file);
 const start=at-loop[0].length;
 const names=file.endsWith('bundle.js')?{r:'r',root:'h0',fetch:'__boundaryFetch'}:{r:'renderer',root:'kok',fetch:'islandFetch'};
 const statement=`${names.r}.domElement.dataset.photoSurfaceFinish1=JSON.stringify(applyPhotoSurfaceFinish(${names.root},await ${names.fetch}('/67park-foundation-next/repairs/photo-surface-finish-1.json?v=photo-surfaces-1').then(r=>{if(!r.ok)throw Error('Photo surface repair missing');return r.json()})));`;
 next=next.slice(0,start)+statement+next.slice(start);
 next=next.replace(list,list.slice(0,-1)+(file.endsWith('bundle.js')?',"67D_SKATEPARK_BASE"]':",'67D_SKATEPARK_BASE']"));
 fs.writeFileSync(file,next);
 console.log('Integrated',file);
}
// Only entry/runtime cache keys change. Camera, movement, graphics, recovery
// and network import-map aliases retain their existing singleton identities.
for(const file of ['app/main.js','explore/explore.js','index.html','explore/index.html']){
 const old=fs.readFileSync(file,'utf8');
 const next=old.replace(/(runtime\.bundle\.js|app\/main\.js|explore\.js)\?v=english-ui-1-launch-sync-1/g,'$1?v=photo-surfaces-1');
 if(next!==old){fs.writeFileSync(file,next);console.log('Entry cache',file);}
}
