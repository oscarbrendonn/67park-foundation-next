import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export function patchParkingGroundBundle(source){
 const edits=[
  ['import {applyMapJointFinish}',"import {finishParkingGround as __parkingGroundFinish} from '../app/parking-ground-finish.js?v=parking-ground-1';\nimport {applyMapJointFinish}"],
  ['__finishSportsStands(l,a);let u=s.getObjectByName','__finishSportsStands(l,a);__parkingGroundFinish(l,a,s);let u=s.getObjectByName']
 ];
 for(const[before,after]of edits){if(source.includes(after))continue;if(source.split(before).length!==2)throw Error('Ambiguous parking bundle anchor '+before);source=source.replace(before,after);}
 const rx=/(parked-fleet\.js\?v=)(release-40|parked-trim-1|parking-ground-1)/g;
 if([...source.matchAll(rx)].length!==1)throw Error('Ambiguous fleet import');
 return source.replace(rx,'$1parking-ground-1');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=new URL('../island/runtime.bundle.js',import.meta.url),old=fs.readFileSync(file,'utf8'),next=patchParkingGroundBundle(old);
 if(process.argv.includes('--write')&&old!==next)fs.writeFileSync(file,next);
 console.log(JSON.stringify({changed:old!==next,write:process.argv.includes('--write')}));
}
