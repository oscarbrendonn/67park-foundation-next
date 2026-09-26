// Asserted mechanical integration only; never rebuild the shipped bundle or
// replace pending lighthouse/memory/other changes in this shared checkout.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export function patchBoatContacts(source,{bundle=false}={}){
 const anchor=bundle?'__parkInstallCourts(installRideContacts(installHouseRoofSupports(await ll(options))))':'installLobbyCourts(installRideContacts(installHouseRoofSupports(installIslandSwimBoundary(world))))';
 const next=bundle?'__parkInstallCourts(installBoatContacts(installRideContacts(installHouseRoofSupports(await ll(options)))))':'installLobbyCourts(installBoatContacts(installRideContacts(installHouseRoofSupports(installIslandSwimBoundary(world)))))';
 if(!source.includes(next)){
  if(source.split(anchor).length!==2)throw Error('Ambiguous boat world integration');
  source=source.replace(anchor,next);
 }
 const imp="import {installBoatContacts} from './boat-contacts.js?v=boat-contacts-1';\n";
 if(!source.includes(imp))source=imp+source;
 return source;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 for(const name of ['runtime.js','runtime.bundle.js']){
  const file=new URL('../island/'+name,import.meta.url),old=fs.readFileSync(file,'utf8'),next=patchBoatContacts(old,{bundle:name.includes('bundle')});
  if(process.argv.includes('--write')&&old!==next)fs.writeFileSync(file,next);
  console.log(JSON.stringify({file:name,changed:old!==next,write:process.argv.includes('--write')}));
 }
}
