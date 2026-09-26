// Narrow, asserted patch: the shipped bundle has integrations not represented
// by a clean rebuild. Preserve all of them, including any pending local work.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export function patchLighthouseStepsBundle(source){
 const imp="import {addLighthouseSupport as __lighthouseSteps} from './lighthouse-support.js?v=lighthouse-steps-1';";
 // Other bounded patches may insert imports between this one and the anchor.
 if(!source.includes(imp)){
  if(source.split('import {applyMapJointFinish}').length!==2)throw Error('Ambiguous lighthouse import anchor');
  source=source.replace('import {applyMapJointFinish}',imp+'\nimport {applyMapJointFinish}');
 }
 const edits=[
  ['if(!y.water&&y.asset!=="coaster"){let L=H.clone();','if(!y.water&&y.asset!=="coaster"&&y.asset!=="lighthouse"){let L=H.clone();'],
  ['{group:u,cameraBlockers:p,obstacle:A,update:R,rides:b}}var v6', '__lighthouseSteps({group:u,cameraBlockers:p,obstacle:A,update:R,rides:b})}var v6']
 ];
 for(const [before,after]of edits){
  if(source.includes(after))continue;
  if(source.split(before).length!==2)throw Error('Ambiguous lighthouse bundle integration: '+before);
  source=source.replace(before,after);
 }
 return source;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=new URL('../island/runtime.bundle.js',import.meta.url),old=fs.readFileSync(file,'utf8'),next=patchLighthouseStepsBundle(old);
 if(process.argv.includes('--write')&&old!==next)fs.writeFileSync(file,next);
 console.log(JSON.stringify({changed:old!==next,write:process.argv.includes('--write')}));
}
