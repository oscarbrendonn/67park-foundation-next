// Mechanical cache-only refresh. Preserve all world, wardrobe and camera keys.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),revision='mac-recovery-1',changed=[];
for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','overview/index.html','style-studio/index.html']){
 const url=new URL(file,root),before=fs.readFileSync(url,'utf8');
 const after=before.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_match,start,json,end)=>{
  const map=JSON.parse(json);
  for(const name of ['preview-network','preview-network-config']){
   const path='/67park-foundation-next/app/'+name+'.js',target=path+'?v='+revision;
   for(const key of Object.keys(map.imports))if(map.imports[key].split('?')[0]===path)map.imports[key]=target;
   for(const suffix of ['','?v=online-next-1','?v='+revision])map.imports[path+suffix]=target;
  }
  return start+JSON.stringify(map)+end;
 });
 if(before===after)continue;
 changed.push(file);if(process.argv.includes('--write'))fs.writeFileSync(url,after);
}
console.log(JSON.stringify({revision,write:process.argv.includes('--write'),changed}));
