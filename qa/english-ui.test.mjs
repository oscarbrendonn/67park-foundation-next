import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LOBBY_COURTS} from '../app/lobby-court-rules.js';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const entries=['index.html','play/index.html','explore/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html','style-studio/index.html'];
const decode=s=>s.replace(/\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,(_,u,x)=>String.fromCharCode(parseInt(u||x,16)));

test('every public entry declares English and resolves the English court UI',()=>{
 for(const file of entries){
  const html=read(file);assert.match(html,/<html\b[^>]*lang="en"/);
  const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const path='/67park-foundation-next/app/lobby-courts.js';assert.equal(imports[path],path+'?v=english-ui-1',file);
 }
 assert.match(read('overview/index.html'),/<html\b[^>]*lang="en"/);
 assert(read('app/lobby-courts.js').includes("'./lobby-court-rules.js?v=english-ui-1'"));
});

test('explore labels, accessibility copy, loading stages and recovery are English',()=>{
 const html=read('explore/index.html'),js=decode(read('explore/explore.js'));
 for(const text of ['Explore the island','Back to the game','Camera view','Island overview','Street level','Show controls','Retry loading','Camera movement joystick','Zoom in','Zoom out','Move faster'])assert(html.includes(text),text);
 const stages=JSON.parse(js.match(/var stageLabels = (\[[^\n]*\]);/)[1]);assert.equal(stages.length,15);
 assert.equal(stages[0],'Opening the map…');assert.equal(stages.at(-1),'Preparing the scene…');
 for(const text of ['Pan · Pinch to zoom','Drag to look around','Finishing up…','The map could not load. Check your connection and try again.'])assert(js.includes(text),text);
 assert(!/[çğıİşŞ]/.test(html+js),'no untranslated Turkish display copy in the explore entry');
});

test('court labels and statuses are English without changing court identities',()=>{
 assert.deepEqual(LOBBY_COURTS.map(c=>[c.id,c.sport,c.label]),[['basket','basketball','Basketball'],['penalty','football','Football']]);
 const text=read('app/lobby-courts.js');
 for(const copy of ['Court free play','Lobby · Free play','Walk into the ball to move it. It stays inside the court.','Play a match ↗','Waiting for the lobby connection…'])assert(text.includes(copy),copy);
 assert(!/[çğıİşŞ]/.test(text));
});

test('reachable island loader and validation error messages are English',()=>{
 const files=['island/runtime.js','island/runtime.bundle.js','island/small-island-props-v62.js','island/northwest-v93/placement.js','island/road-join-v34.js'];
 for(const file of files){
  const text=decode(read(file));
  assert(!/V62 ev|Küçük ada (?:modelleri|duvarları|yerleşim)|Yüzey (?:verisi|normalleri) yüklenemedi|Kaldırım (?:verisi|geometrisi) yüklenemedi|Model kuru zemine|Arazi yüksekliği değişti|NW93 model çim dışında|Yol birlesimi|Eksik yol ucgeni|Yol yuzeyi/.test(text),file);
 }
 const bundle=decode(read('island/runtime.bundle.js'));
 for(const copy of ['Could not load surface data','Could not load sidewalk data','Could not load small-island walls','Small-island models: ','Road-join data version mismatch'])assert(bundle.includes(copy),copy);
});

test('English revision invalidates the changed entry and loader without replacing game singleton revisions',()=>{
 assert(read('index.html').includes('app/main.js?v=north-housing-3"'));
 assert(read('explore/index.html').includes('explore.js?v=north-housing-3"'));
 for(const file of ['app/main.js','explore/explore.js'])assert.match(read(file),/runtime\.bundle\.js\?v=north-housing-3["']/);
 const bundle=read('island/runtime.bundle.js');assert(bundle.includes('coaster-rail-finish.js?v=coaster-rail-finish-1'));assert(bundle.includes('ride-contacts.js?v=ride-launch-sync-1'));
 for(const file of entries){
  const imports=JSON.parse(read(file).match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const movement='/67park-foundation-next/app/chunk-OZ77422N.js';
  for(const suffix of ['','?v=online-next-1'])assert.equal(imports[movement+suffix],movement+'?v=ride-jump-contact-1',file);
 }
});
