import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const main=fs.readFileSync(new URL('../app/main.js',import.meta.url),'utf8');
test('manually opening profile always shows character choices and clears stale entry state',()=>{
 assert(main.includes('charUi.open&&(cancelIslandGpuEntry(),clearPreview(),setEntering(false),setView("collection"),setPage(0))'));
 assert(!main.includes('charUi.open&&(cancelIslandGpuEntry(),__hasProfile(equip.base)&&setView("character"))'));
 assert(main.includes('title:"Choose your character","aria-label":"Profile studio"'));
 assert(main.includes('children:[(0,m.jsx)(Oa,{name:"person"}),(0,m.jsx)("span",{style:{display:"inline"},children:"Characters"})]'));
});
test('returning auto-entry, saved clothes and original Gorilla/Cat choices remain intact',()=>{
 assert(main.includes('autoEntry=useRef(__hasProfile(equip.base))'));
 assert(main.includes('if(!autoEntry.current)return;autoEntry.current=false;enter()'));
 assert(main.includes('CHARACTERS:ko.filter(c=>__native(c.id)),getPlayerName:'));
 assert(main.includes('chooseBase=id2=>{clearPreview();if(id2!==equip.base)setBase(id2);setView("character")'));
});
test('public main entry has a new cache address without changing map runtime',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert(html.includes('/app/main.js?v=character-menu-1'));
 assert(main.includes('runtime.bundle.js?v=north-housing-8'));
});
