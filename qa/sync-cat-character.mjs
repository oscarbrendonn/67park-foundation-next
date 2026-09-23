// Exact edits of current shipped bundles. Never rebuild from obsolete sources.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const files=new Map(),revision='cat-character-1';
const read=f=>files.get(f)??fs.readFileSync(f,'utf8');
function edit(f,before,after,count=1){const s=read(f);assert.equal(s.split(before).length-1,count,f+': '+before);files.set(f,s.replaceAll(before,after));}
const header='import {isNativeCharacter as __native,registerNativeCharacters as __registerNative,nativeCharacterFile as __nativeFile,nativeCharacterURL as __nativeURL,loadNativeCharacter as __loadNative} from "/67park-foundation-next/app/native-character.js?v='+revision+'";\n';
const stores=[
 ['app/chunk-G7D6MVRW.js','Xr','var pr=__adoptPlayable(C4()),'],
 ['app/chunk-55YKN7VY.js','Xr','var pr=__adoptPlayable(C4()),'],
 ['balloon/chunk-U4P5F7P3.js','Q','var Qe=__adoptPlayable(gs()),'],
 ['race/race.js','qe','var cn=__adoptPlayable(Ui()),'],
 ['rockets/rockets.js','Oe','var sn=__adoptPlayable(Li()),'],
 ['sports/sports.js','Ce','var nr=__adoptPlayable(Ga()),'],
 ['skybound-soft/course-edf81ca8e2af595ed4d3.js','qi','var FE=__adoptPlayable(tO());'],
];
for(const [file,catalog,anchor] of stores){
 edit(file,anchor,'__registerNative('+catalog+');'+anchor);
 edit(file,'playable-character.js?v=gorilla-only-1','playable-character.js?v='+revision);
 if(file.startsWith('app/chunk-')){
  edit(file,'if(e==="base")return ["goril"];','if(e==="base")return ["goril","cat67"];');
  edit(file,'function OL(e){if(e!=="goril")return;','function OL(e){if(!__native(e))return;');
  edit(file,'pr.base!=="goril"','!__native(pr.base)');
  edit(file,'"https://www.gstatic.com/draco/versioned/decoders/1.5.5/"','"/67park-foundation-next/vendor/addons/libs/draco/gltf/"');
  // Cat has no built-in crown/flower meshes. Fitted clothes stay available.
  const options=file.includes('G7D6MVRW')?'_R':'CR';
  edit(file,'let a='+options+'(o);n[o]=a[Math.floor(Math.random()*a.length)]??null',
   'let a='+options+'(o).filter(id=>t!=="cat67"||id!=="goril:TAC"&&id!=="goril:CICEK");n[o]=a[Math.floor(Math.random()*a.length)]??null');
 }
 files.set(file,header+read(file));
}
const main='app/main.js';
edit(main,'__parkAvatarEntry.useAvatarGLTF(`${vi}models/goril-motion-v3.glb`)','__parkAvatarEntry.useAvatarGLTF(__nativeURL(e.base))');
for(const x of ['e.base','o.base','eq.base','So.base','Y']){
 const s=read(main),pattern=new RegExp('\\b'+x.replaceAll('.','\\.')+'==="goril"','g');
 assert.equal([...s.matchAll(pattern)].length,1,main+': native check '+x);
 files.set(main,s.replace(pattern,'__native('+x+')'));
}
edit(main,'CHARACTERS:ko.filter(c=>c.id==="goril")','CHARACTERS:ko.filter(c=>__native(c.id))');
edit(main,'createClaudeGorillaAnimation({model:l,mixer:p,actions:u})','createClaudeGorillaAnimation({model:l,mixer:p,actions:u,base:e.base})');
edit(main,'a?.file?o.add(a.file):o.add("goril-v1.glb")','a?.file?o.add(a.file):o.add(__nativeFile(e.base))');
edit(main,'function ah(e){return e==="goril-v1.glb"?','function ah(e){if(e==="cat67.glb")return __nativeURL("cat67");return e==="goril-v1.glb"?');
edit(main,'let M=v.get("goril-v1.glb");','let M=v.get(__nativeFile(o.base));');
edit(main,'function Iu(e){let o=wl.get(e);','function Iu(e){if(e==="cat67.glb")return __loadNative("cat67").then(g=>g.scene);let o=wl.get(e);');
edit(main,'a=new Set([o.file||"goril-v1.glb"])','a=new Set([o.file||__nativeFile(e.base)])');
edit(main,'let t=hu(r.get("goril-v1.glb"));','let t=hu(r.get(__nativeFile(e.base)));');
edit(main,'if(o&&ko.some(c=>c.id===e))','if(o&&e!=="cat67"&&ko.some(c=>c.id===e))');
files.set(main,header+read(main));
for(const [file,base,load,call] of [
 ['balloon/chunk-U4P5F7P3.js','e','Vt','u'],
 ['race/race.js','e','Pa','l'],
 ['rockets/rockets.js','e','ra','l'],
 ['sports/sports.js','e','ms','u'],
 ['skybound-soft/course-edf81ca8e2af595ed4d3.js','t','I2','c'],
]){
 edit(file,call+'==="goril-v1.glb"?'+load+'()',call+'==="goril-v1.glb"?__loadNative('+base+'.base,'+load+')');
 edit(file,'if('+base+'.base==="goril"){','if(__native('+base+'.base)){');
}
edit('sports/sports.js','i=n==="goril",c=i?','i=__native(n),c=i?');
edit('skybound-soft/course-edf81ca8e2af595ed4d3.js','s=o==="goril",r=s?','s=__native(o),r=s?');
for(const [file,before,after] of [
 ['app/avatar-entry-runtime.js','expectedKind=eq.base==="goril"?','expectedKind=__native(eq.base)?'],
 ['app/claude-remote-character.js','n=i==="goril",a=n?','n=__native(i),a=n?'],
]){edit(file,before,after);files.set(file,header+read(file));}
const changed=new Set([...files.keys(),'app/playable-character.js','app/native-character.js','app/studio-catalog.js','app/gorilla-studio-items.js'].map(f=>'/67park-foundation-next/'+f));
const entries=['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html'];
for(const file of entries){
 let html=read(file),match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);assert(match,file+' import map');
 const map=JSON.parse(match[1]);
 for(const [key,value] of Object.entries(map.imports))if(changed.has(key.split('?')[0])){
  const target=key.split('?')[0]+'?v='+revision;map.imports[key]=target;map.imports[value]=target;
 }
 for(const path of changed)map.imports[path]=path+'?v='+revision;
 html=html.replace(match[1],JSON.stringify(map));
 const own={'index.html':'/67park-foundation-next/app/main.js','race/index.html':'./race.js','rockets/index.html':'./rockets.js','sports/index.html':'./sports.js','skybound-soft/index.html':'./course-edf81ca8e2af595ed4d3.js'}[file];
 if(own){const tag=html.match(new RegExp('src="'+own.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=[^"]+"'));assert(tag,file+' entry');html=html.replace(tag[0],'src="'+own+'?v='+revision+'"');}
 files.set(file,html);
}
for(const [file,source]of files){fs.writeFileSync(file,source);console.log('CAT_CHARACTER_SYNC',file)}
