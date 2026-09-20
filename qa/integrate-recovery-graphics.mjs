// Asserted small source changes in the published, hand-integrated bundles.
// Use apply_patch for edits; never rebuild an older upstream source tree.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
const changes=new Map();
function source(file){if(!changes.has(file)){const original=fs.readFileSync(root+file,'utf8');changes.set(file,{original,next:original});}return changes.get(file);}
function replace(file,from,to){const item=source(file);if(item.next.includes(to))return;if(item.next.split(from).length!==2)throw Error('Integration anchor changed: '+file+' '+from.slice(0,90));item.next=item.next.replace(from,to);}
function prepend(file,text){const item=source(file);if(!item.next.includes(text))item.next=text+'\n'+item.next;}
prepend('app/main.js','import {installGraphicsQuality as __installGraphicsQuality} from "./graphics-quality.js";\nimport {playerSettings as __graphicsPrefs} from "./player-settings.js";');
replace('app/main.js','onCreated:r=>{window.__eggyScene=r.scene','onCreated:r=>{__installGraphicsQuality(r.gl);window.__eggyScene=r.scene');
replace('app/main.js','sibling!==node&&sibling instanceof HTMLElement&&','sibling!==node&&sibling.id!=="park-connection-recovery"&&sibling instanceof HTMLElement&&');
replace('app/main.js','return O((r,t)=>{a.current??=Vm({nativeDpr:','return O((r,t)=>{if(__graphicsPrefs.graphics!=="auto"){a.current=null;return;}a.current??=Vm({nativeDpr:');
// The world connect method is async: motion/carry listeners must attach after
// it creates the new socket, not just before the authentication request ends.
replace('app/claude-remote-state.js','s=null,u=null,n=()=>{if(!e.ws||s===e.ws)return;','s=null,u=null,dead=false,n=()=>{if(dead||!e.ws||s===e.ws)return;');
replace('app/claude-remote-state.js','let o=s,f=l=>{let c;try{','let o=s,f=l=>{if(dead||e.ws!==o)return;let c;try{');
replace('app/claude-remote-state.js','g=function(...o){let f=d.apply(this,o);return n(),f}','g=function(...o){let f=d.apply(this,o);n();if(f&&typeof f.then==="function")f.then(n,()=>{});return f}');
replace('app/claude-remote-state.js','p=()=>{u?.(),e.connect===g','p=()=>{dead=true;u?.(),e.connect===g');
replace('app/claude-gorilla-runtime.js','pose=feelCameraPose({x:n.x,y:n.y-.555,z:n.z},ne,Q,ke,e.aspect)','pose=feelBoom.pose({x:n.x,y:n.y-.555,z:n.z},ne,Q,ke,e.aspect,p)');
replace('rockets/rockets.js','pose=feelCameraPose({x:n,y:a,z:o},feelRocketYaw,feelRocketPitch,FEEL_CAMERA.distance,_e.aspect)','pose=feelRocketBoom.pose({x:n,y:a,z:o},feelRocketYaw,feelRocketPitch,FEEL_CAMERA.distance,_e.aspect,e)');
prepend('skybound-soft/course-edf81ca8e2af595ed4d3.js','import {installGraphicsQuality as __installGraphicsQuality} from "../app/graphics-quality.js";');
replace('skybound-soft/course-edf81ca8e2af595ed4d3.js','let z=new Zg({antialias:!0,powerPreference:"high-performance"});','let z=__installGraphicsQuality(new Zg({antialias:!0,powerPreference:"high-performance"}));');
for(const file of ['app/chunk-G7D6MVRW.js','app/chunk-55YKN7VY.js']){
 replace(file,'this.ws.onmessage=n=>{let o;try{o=JSON.parse(String(n.data))}','const socket=this.ws;this.ws.onmessage=n=>{if(this.ws!==socket)return;let o;try{o=JSON.parse(String(n.data))}');
 replace(file,'this.ws.onclose=event=>{this.connected=false','this.ws.onclose=event=>{if(this.ws!==socket)return;this.connected=false');
}
for(const dir of ['balloon','race','rockets','sports','lane-rush','skybound-soft']){
 for(const name of fs.readdirSync(root+dir)){
  if(!name.endsWith('.js')||name.startsWith('chunk-'))continue;
  if(dir==='skybound-soft'&&name!=='course-edf81ca8e2af595ed4d3.js')continue;
  const file=dir+'/'+name,item=source(file);
  const constructors=[...item.next.matchAll(/(?<!__installGraphicsQuality\()new \w+\.WebGLRenderer\(\{[^{}]*\}\)/g)].map(m=>m[0]);
  if(!constructors.length)continue;
  prepend(file,'import {installGraphicsQuality as __installGraphicsQuality} from "../app/graphics-quality.js";');
  for(const constructor of new Set(constructors))replace(file,constructor,'__installGraphicsQuality('+constructor+')');
 }
}
// The page-level escape route must load even if the game's own module fails.
for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
 replace(file,'</body>','<script type="module" src="/67park-foundation-next/app/connection-recovery.js?v=recovery-graphics-1"></script></body>');
}
replace('server/runtime/server/online-hub.js',"lobbyMessage(p,m){const l=this.lobbies.get(p.lobbyId);if(m.t==='hello')","lobbyMessage(p,m){if(m.t==='ping'){this.send(p.lobbySocket,{t:'pong',at:m.at,now:this.now()});return;}const l=this.lobbies.get(p.lobbyId);if(m.t==='hello')");
// Map every bare/shared import onto one release URL. Different query strings
// must not create duplicate settings, camera or recovery state.
for(const file of ['index.html','play/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','explore/index.html','overview/index.html','style-studio/index.html']){
 const item=source(file),match=item.next.match(/<script type="importmap">(.*?)<\/script>/s);
 if(!match)continue;
 const map=JSON.parse(match[1]);
 for(const name of ['player-settings.js','feel-camera.js','graphics-quality.js','connection-recovery.js','protocol-version.js']){
  const path='/67park-foundation-next/app/'+name;
  map.imports[path]=path+'?v=recovery-graphics-1';
  if(name==='player-settings.js')map.imports[path+'?v=foundation-basics-1']=path+'?v=recovery-graphics-1';
 }
 item.next=item.next.replace(match[0],'<script type="importmap">'+JSON.stringify(map)+'</script>');
}
for(const [file,{original,next}] of changes){
 if(next===original)continue;
 const before=original.split('\n'),after=next.split('\n');let start=0,end=0;
 while(start<before.length&&start<after.length&&before[start]===after[start])start++;
 while(end<before.length-start&&end<after.length-start&&before[before.length-1-end]===after[after.length-1-end])end++;
 const lines=['*** Begin Patch','*** Update File: '+root+file,'@@',...before.slice(start,before.length-end).map(s=>'-'+s),...after.slice(start,after.length-end).map(s=>'+'+s),'*** End Patch',''];
 execFileSync('apply_patch',[],{input:lines.join('\n'),maxBuffer:2*1024*1024});
 console.log('Integrated '+file);
}
