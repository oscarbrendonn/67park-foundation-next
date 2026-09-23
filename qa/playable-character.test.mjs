import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adoptPlayableCharacter,gorillaEquipment,EQUIPMENT_KEY,PREVIOUS_CHARACTER_KEY} from '../app/playable-character.js';
import {FITTED_ITEMS,studioSlots} from '../app/studio-catalog.js';
const profileKey='67park-feel-lab.player-profile.v1';
const old={base:'friendsie_1',head:'friendsie_1:0',body:'friendsie_2:2',back:'friendsie_2:4',kicks:'friendsie_3333:5',sprout:'friendsie_8:90',held:'goril:CICEK',power:'pwr-stars',vibe:'vibe-mint'};
test('old Friends selection becomes Gorilla without losing clothes or accessories',()=>{
 const next=gorillaEquipment(old);assert.equal(next.base,'goril');assert.equal(next.head,null);
 for(const key of Object.keys(old).filter(k=>!['base','head'].includes(k)))assert.equal(next[key],old[key]);
 assert.equal(old.base,'friendsie_1');assert.equal(gorillaEquipment({...old,head:'friendsie_26:90'}).head,'friendsie_26:90');
 const gorilla={...old,base:'goril'};assert.equal(gorillaEquipment(gorilla),gorilla);
});
test('migration preserves original selection backup, updates returning profile, is idempotent',()=>{
 const values=new Map([[profileKey,JSON.stringify({version:1,base:old.base})],['unrelated','keep']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const next=adoptPlayableCharacter(old,storage);assert.deepEqual(JSON.parse(values.get(PREVIOUS_CHARACTER_KEY)),old);
 assert.deepEqual(JSON.parse(values.get(EQUIPMENT_KEY)),next);assert.equal(JSON.parse(values.get(profileKey)).base,'goril');
 assert.equal(adoptPlayableCharacter(next,storage),next);assert.equal(values.get('unrelated'),'keep');
});
test('unavailable/corrupt storage cannot prevent Gorilla entry or falsely mark new visitor chosen',()=>{
 assert.equal(adoptPlayableCharacter(old,{getItem(){throw Error('denied')}}).base,'goril');
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 adoptPlayableCharacter(old,storage);assert.equal(map.has(profileKey),false);
});
test('Friends fitted clothes remain available for the Gorilla',()=>{
 const rows=studioSlots(gorillaEquipment(old),()=>({}),id=>id);
 for(const [id,item] of Object.entries(FITTED_ITEMS))assert(rows.find(r=>r.slot===item.slot).items.some(i=>i.id===id),id);
});
test('live entry has only Gorilla choices, donor catalogues and every current game initializer stay wired',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 assert(read('app/main.js').includes('CHARACTERS:ko.filter(c=>c.id==="goril"),getPlayerName:'));
 for(const file of ['app/chunk-G7D6MVRW.js','app/chunk-55YKN7VY.js']){
  const s=read(file);assert(s.includes('if(e==="base")return ["goril"];'));assert(s.includes('function OL(e){if(e!=="goril")return;'));
  assert(s.includes('friendsie_1'));assert(s.includes('for(let a of Xr)'),'donor item iteration retained');
 }
 for(const [file,anchor] of [['app/chunk-G7D6MVRW.js','pr=__adoptPlayable(C4())'],['app/chunk-55YKN7VY.js','pr=__adoptPlayable(C4())'],['balloon/chunk-U4P5F7P3.js','Qe=__adoptPlayable(gs())'],['race/race.js','cn=__adoptPlayable(Ui())'],['rockets/rockets.js','sn=__adoptPlayable(Li())'],['sports/sports.js','nr=__adoptPlayable(Ga())'],['skybound-soft/course-edf81ca8e2af595ed4d3.js','FE=__adoptPlayable(tO())']])assert(read(file).includes(anchor),file);
});
