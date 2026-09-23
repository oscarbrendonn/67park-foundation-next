import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adoptPlayableCharacter,gorillaEquipment,EQUIPMENT_KEY,PREVIOUS_CHARACTER_KEY} from '../app/playable-character.js';
import {FITTED_ITEMS,studioSlots} from '../app/studio-catalog.js';
import {NATIVE_BASES,isNativeCharacter,nativeCharacterURL,registerNativeCharacters} from '../app/native-character.js';
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
test('Cat stays selected, shares fitted clothes and excludes unavailable built-in Gorilla props',()=>{
 const cat={...old,base:'cat67',held:null,sprout:null};assert.equal(gorillaEquipment(cat),cat);
 assert.deepEqual(NATIVE_BASES,['goril','cat67']);assert(!isNativeCharacter(old.base));
 const catalog=[{id:'goril'},{id:'friendsie_1'}];registerNativeCharacters(catalog);registerNativeCharacters(catalog);
 assert.equal(catalog.filter(c=>c.id==='cat67').length,1);assert.equal(catalog[1].file,null);
 const rows=studioSlots(cat,()=>({}),id=>id);
 for(const [id,item] of Object.entries(FITTED_ITEMS))assert(rows.find(r=>r.slot===item.slot).items.some(i=>i.id===id),id);
 assert(!rows.some(r=>r.items.some(i=>['goril:TAC','goril:CICEK'].includes(i.id))));
 assert(nativeCharacterURL('cat67').includes('/cat-character/cat-gorilla-body.glb'));
});
test('compact cat keeps the original rig, animations and four visible model parts',()=>{
 const b=fs.readFileSync(new URL('../cat-character/cat-gorilla-body.glb',import.meta.url));
 assert.equal(b.length,1723216);const model=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 assert.equal(model.skins[0].joints.length,20);assert.equal(model.meshes.length,4);
 assert.equal(model.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+model.accessors[p.indices].count/3,0),0),20912);
 assert.deepEqual(model.animations.map(a=>a.name).sort(),['celebrate','fall','idle','jump','land','run','walk']);
 assert(model.nodes.some(n=>n.name==='67Park_Cat_Head'));assert(!model.nodes.some(n=>n.name==='GORIL_KAFA'));
});
test('live entry has only original Cat and Gorilla choices; donor catalogues and game initializers stay wired',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 assert(read('app/main.js').includes('CHARACTERS:ko.filter(c=>__native(c.id)),getPlayerName:'));
 for(const file of ['app/chunk-G7D6MVRW.js','app/chunk-55YKN7VY.js']){
  const s=read(file);assert(s.includes('if(e==="base")return ["goril","cat67"];'));assert(s.includes('function OL(e){if(!__native(e))return;'));
  assert(s.includes('friendsie_1'));assert(s.includes('for(let a of Xr)'),'donor item iteration retained');
 }
 for(const [file,anchor] of [['app/chunk-G7D6MVRW.js','pr=__adoptPlayable(C4())'],['app/chunk-55YKN7VY.js','pr=__adoptPlayable(C4())'],['balloon/chunk-U4P5F7P3.js','Qe=__adoptPlayable(gs())'],['race/race.js','cn=__adoptPlayable(Ui())'],['rockets/rockets.js','sn=__adoptPlayable(Li())'],['sports/sports.js','nr=__adoptPlayable(Ga())'],['skybound-soft/course-edf81ca8e2af595ed4d3.js','FE=__adoptPlayable(tO())']])assert(read(file).includes(anchor),file);
});
