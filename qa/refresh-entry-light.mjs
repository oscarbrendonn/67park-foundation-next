// Asserted mechanical edits to shipped bundles and cache aliases.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const revision='entry-light-1';
const edit=(file,fn)=>{const old=fs.readFileSync(file,'utf8'),next=fn(old);if(old!==next)fs.writeFileSync(file,next);};
const once=(s,before,after)=>{if(s.includes(after))return s;assert.equal(s.split(before).length,2,before.slice(0,90));return s.replace(before,after);};
edit('app/main.js',s=>{
 const imports='import {loadCharacterAsset as __loadCharacterAsset,readCharacterAsset as __readCharacterAsset} from "./character-assets.js?v=entry-light-1";\nimport {compileEntryGraphics as __compileEntryGraphics} from "./entry-graphics.js?v=entry-light-1";\n';
 if(!s.includes(imports))s=imports+s;
 s=s.replace('To.preload(`${vi}models/goril-motion-v3.glb`);','');
 s=once(s,'React:ve,useGLTF:To,equip:So','React:ve,useGLTF:__readCharacterAsset,equip:So');
 s=once(s,'const enter=()=>{if(view==="collection"){clearPreview();','const enter=()=>{if(view==="collection"&&avatarEntrySnapshot().status!=="error"&&loadingState.status!=="error"){clearPreview();');
 s=once(s,'n=To(s),i=To(`${kc}models/goril-motion-v3.glb`)','n=__readCharacterAsset(s),i=__readCharacterAsset(__native(o.base)?__nativeURL(o.base):`${kc}models/goril-motion-v3.glb`)');
 const start=s.includes('var wl=new Map;function Iu(')?s.indexOf('var wl=new Map;function Iu('):s.indexOf('function Iu('),end=s.indexOf('function dh(e)',start);
 assert(start>=0&&end>start);
 s=s.slice(0,start)+'var wl=new Map;function Iu(e){const url=e==="cat67.glb"?__nativeURL("cat67"):e==="ninja67.glb"?__nativeURL("ninja67"):e==="goril-v1.glb"?"/67park-foundation-next/models/goril-motion-v3.glb":"/67park-foundation-next/models/friends/"+e;return __loadCharacterAsset(url).then(g=>g.scene)}'+s.slice(end);
 s=once(s,'await o.compileAsync(e,a)','await __compileEntryGraphics(o,e,a)');
 s=s.replace('await Nm(14,"Preparing your arrival"),S=Um','await Nm(14,"Preparing graphics"),S=Um');
 s=once(s,'const gpuWarmup=await Y0(o,e,a,{cancelled:gpuLease.cancelled});','await Nm(14,"Uploading scene details");const gpuWarmup=await Y0(o,e,a,{cancelled:gpuLease.cancelled});');
 return s;
});
edit('island/runtime.bundle.js',s=>s.replace(/^if\(typeof document!=='undefined'\)\{const q=\[.*?for\(let n=0;n<4;n\+\+\)next\(\);\}\n/m,'// Actual prerequisite requests own concurrency; speculative fetch preloads duplicated transfers in Safari.\n'));
const htmlFiles=['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','overview/index.html'];
const changed=['app/main.js','app/native-character.js','app/returning-entry.js','app/character-assets.js','app/entry-graphics.js','island/runtime.bundle.js'];
const sources=['app/main.js','explore/explore.js',...htmlFiles].map(f=>fs.readFileSync(f,'utf8')).join('\n');
for(const file of htmlFiles)edit(file,s=>{
 // Character readiness is tracked independently; this manifest is map data.
 s=s.replace(/<script>\(\(\)=>\{const files=\{[\s\S]*?\}\)\(\);<\/script>/,'');
 s=s.replace('"park-layout-v57.json?v=1"','"park-layout-v57.json?v=animals-1"');
 s=s.replace('island/park-layout-v57.json?v=1","bytes":15818','island/park-layout-v57.json?v=animals-1","bytes":15905');
 s=s.replace(/(67park.entry.downloads.v1"\)\]=)([^;]+);/,(_m,prefix,text)=>prefix+JSON.stringify(JSON.parse(text).map(a=>({...a,bytes:fs.statSync(a.url.split('?')[0].replace('/67park-foundation-next/','')).size})))+';');
 s=s.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/,(_m,start,text,end)=>{
  const map=JSON.parse(text);
  for(const name of changed){
   const path='/67park-foundation-next/'+name,target=path+'?v='+revision;
   for(const [k,v] of Object.entries(map.imports))if(k.split('?')[0]===path||v.split('?')[0]===path)map.imports[k]=target;
   map.imports[path]=target;map.imports[target]=target;
   const basename=name.split('/').at(-1).replaceAll('.','\\.');
   for(const match of sources.matchAll(new RegExp(basename+'\\?v=[a-zA-Z0-9_-]+','g')))map.imports[path+'?'+match[0].split('?')[1]]=target;
  }
  return start+JSON.stringify(map)+end;
 });
 return s.replace(/(src="\/67park-foundation-next\/app\/main\.js)\?v=[a-zA-Z0-9_-]+/g,'$1?v='+revision);
});
// Fresh-address expectations only; retain all behavioral assertions.
edit('qa/original-characters.test.mjs',s=>s.replace(/originals-1\$\//g,'lossless-2$/').replace("target=path+'?v=originals-1'","target=path+'?v='+(['native-character','main'].includes(name)?revision:'originals-1')").replace(/(?<!const revision='entry-light-1';\n)const read=f=>/,"const revision='entry-light-1';\nconst read=f=>"));
edit('qa/skate-recovery-release.test.mjs',s=>s.replace('src="/67park-foundation-next/app/main.js?v=originals-1"','src="/67park-foundation-next/app/main.js?v=entry-light-1"'));
edit('qa/original-characters.browser.cjs',s=>s.replace("name+'.glb?v=originals-1'","name+'.glb?v=lossless-2'"));
edit('package.json',s=>s.includes('qa/entry-light.test.mjs')?s:s.replace('qa/foundation-safety.test.mjs','qa/entry-light.test.mjs qa/foundation-safety.test.mjs'));
console.log('Entry-light bundle integration complete');
