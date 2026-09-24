import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {OrthographicCamera,Vector3} from 'three';
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
 assert(html.includes('/app/main.js?v=cat-fit-glow-1'));
 assert(main.includes('runtime.bundle.js?v=rail-corner-1'));
});
test('preview camera gives the horizontal Glow ring a visible projected height',()=>{
 const factory=main.slice(main.indexOf('function __gpuPreviewFactory'));
 const pose=factory.match(/camera.position.set\(0,([.\d]+),6\),camera.lookAt\(0,.62,0\)/);assert(pose);
 const camera=new OrthographicCamera(-1,1,1.75,-1.75,.1,30);camera.position.set(0,Number(pose[1]),6);camera.lookAt(0,.62,0);camera.updateMatrixWorld(true);
 const front=new Vector3(0,.09,.62).project(camera),back=new Vector3(0,.09,-.62).project(camera);
 assert(Math.abs(front.y-back.y)*290/2>20,'ring must not be edge-on at touch preview size');
});
