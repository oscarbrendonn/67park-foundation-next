// Refresh only recovery UI. Old entry/chunk URLs must resolve to this same
// instance; keep geometry, camera, audio and wardrobe module identities intact.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='recovery-visibility-2',changed=[];
const path='/67park-foundation-next/app/connection-recovery.js',target=path+'?v='+revision;
for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','overview/index.html','style-studio/index.html']){
 const url=new URL(file,root),before=fs.readFileSync(url,'utf8');
 const after=before.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_match,start,json,end)=>{
  const map=JSON.parse(json);
  if(!map.imports[path])throw Error('Missing recovery import in '+file);
  for(const key of Object.keys(map.imports))if(map.imports[key].split('?')[0]===path)map.imports[key]=target;
  for(const suffix of ['','?v=recovery-graphics-1','?v=skate-corner-recovery-1'])map.imports[path+suffix]=target;
  return start+JSON.stringify(map)+end;
 }).replace(/(<script type="module" src="\/67park-foundation-next\/app\/connection-recovery\.js)\?v=[a-zA-Z0-9_-]+/g,'$1?v='+revision);
 if(before!==after){changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,after);}
}
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),changed}));
