import test from 'node:test';
import assert from 'node:assert/strict';
import {FITTED_ITEMS,registerStudioParts,withoutFittedItems,studioSlots} from '../app/studio-catalog.js';
import {openPlayerStudio} from '../app/player-profile.js';

test('virtual accessory IDs are registered once and never replace a source part',()=>{
 const catalog={friendsie_8:[{ord:0,slot:'head'}],friendsie_26:[{ord:0,slot:'head'}]};
 registerStudioParts(catalog);registerStudioParts(catalog);
 assert.equal(catalog.friendsie_8.length,2);assert.equal(catalog.friendsie_26.length,2);
 assert.equal(catalog.friendsie_8[0].slot,'head');assert.equal(catalog.friendsie_8[1].slot,'sprout');
});
test('legacy renderer cannot double-attach fitted pieces or hide gorilla hands',()=>{
 const eq={base:'goril',body:'friendsie_2:2',head:'friendsie_26:90',sprout:'friendsie_8:90',held:'goril:CICEK',kicks:'friendsie_3333:5',back:'friendsie_2:4'};
 const plain=withoutFittedItems(eq);assert.equal(plain.base,'goril');assert.equal(plain.held,'goril:CICEK');
 for(const slot of ['body','head','sprout','kicks','back'])assert.equal(plain[slot],null);
 assert.equal(eq.body,'friendsie_2:2');
});
test('all studio rows preserve current equipment and wrap without duplicates',()=>{
 for(const base of ['goril','cat67','friendsie_1']){
  const eq={base,kicks:'friendsie_888:5',head:base==='goril'?null:'friendsie_1:0'};
  const rows=studioSlots(eq,()=>({head:eq.head}),id=>id);
  assert(rows.find(r=>r.slot==='kicks').items.some(i=>i.id===eq.kicks));
  assert.equal(rows.some(r=>r.title==='Eyewear'),base!=='friendsie_1');
  for(const r of rows)assert.equal(new Set(r.items.map(i=>i.id)).size,r.items.length);
 }
});
test('profile opens the in-game studio for both character families, without navigation',()=>{
 const saved=globalThis.window;const events=[];globalThis.window={dispatchEvent:e=>events.push(e.type)};
 try{for(const base of ['goril','friendsie_1']){let open=false;openPlayerStudio({base},value=>open=value);assert.equal(open,true)}assert.deepEqual(events,['park:release-controls','park:release-controls']);}finally{globalThis.window=saved}
});
test('only the validated sweater removes donor hands',()=>{
 assert.deepEqual(Object.entries(FITTED_ITEMS).filter(([,i])=>i.clothes).map(([id])=>id),['friendsie_2:2']);
});
