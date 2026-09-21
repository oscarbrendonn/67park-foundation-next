import fs from 'node:fs';
import assert from 'node:assert/strict';
const paths=['index.html','app/party/party-pack.js','island/runtime.bundle.js','island/pastel-car-v108.js'];
const replacements=[
 ['party-audio.js?v=skate-corner-recovery-1','party-audio.js?v=vehicle-feedback-1'],
 ['party-pack.js?v=skate-corner-recovery-1','party-pack.js?v=vehicle-feedback-1'],
 ['party-pack.css?v=party-1','party-pack.css?v=vehicle-feedback-1'],
 ['reference-car-body.js?v=release-40','reference-car-body.js?v=vehicle-feedback-1']
];
const changed=[];
for(const path of paths){
 const url=new URL('../'+path,import.meta.url),before=fs.readFileSync(url,'utf8');let after=before;
 for(const [old,next] of replacements)after=after.replaceAll(old,next);
 assert(after.includes('vehicle-feedback-1'),path+' must contain the release module');
 if(before!==after){changed.push(path);if(process.argv.includes('--write'))fs.writeFileSync(url,after);}
}
console.log(JSON.stringify({changed,write:process.argv.includes('--write')}));
