import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Vector2,Vector3} from '../vendor/three.module.js';
import {NATIVE_BASES,nativeCharacterFile,nativeCharacterURL,registerNativeCharacters} from '../app/native-character.js';
import {gorillaEquipment} from '../app/playable-character.js';
import {studioSlots,FITTED_ITEMS} from '../app/studio-catalog.js';
import {refineHeadSurface} from './refine-head-surface.mjs';
const revision='entry-light-1';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url));
test('only approved Cat/Ninja join the existing Gorilla; equipment is retained',()=>{
 assert.deepEqual(NATIVE_BASES,['goril','cat67','ninja67']);
 for(const file of ['app/claude-gorilla-runtime.js','skybound-soft/course-edf81ca8e2af595ed4d3.js'])assert(read(file).toString().includes('Object.freeze(["goril","cat67","ninja67",'));
 const catalog=[{id:'goril'},{id:'friendsie_1'}];registerNativeCharacters(catalog);registerNativeCharacters(catalog);
 assert.deepEqual(catalog.slice(0,3).map(c=>c.id),NATIVE_BASES);
 for(const base of ['cat67','ninja67']){
  const equipment={base,body:'friendsie_2:2',head:'friendsie_26:90',vibe:'vibe-mint'};
  assert.equal(gorillaEquipment(equipment),equipment);assert.equal(nativeCharacterFile(base),base+'.glb');
  assert.match(nativeCharacterURL(base),/models\/park-originals\/(cat|ninja)\.glb\?v=lossless-2$/);
  const rows=studioSlots(equipment,()=>({}),id=>id);
  for(const [id,item] of Object.entries(FITTED_ITEMS))assert(rows.find(r=>r.slot===item.slot).items.some(i=>i.id===id));
  assert(!rows.some(r=>r.items.some(i=>['goril:TAC','goril:CICEK'].includes(i.id))));
 }
});
test('shipping GLBs have authored flush heads, shared body rig, all clips and small downloads',()=>{
 let total=0;
 for(const [name,base,headName] of [['cat','cat67','67Park_Cat_Head'],['ninja','ninja67','67Park_Ninja_Head']]){
  const bytes=read('models/park-originals/'+name+'.glb');total+=bytes.length;assert(bytes.length<512*1024);
  const model=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));const head=model.nodes.find(n=>n.name===headName),id=model.nodes.indexOf(head);
  assert(head.extras.authoredFrom2DReference&&head.extras.flushEyes);assert.equal(model.nodes.find(n=>n.children?.includes(id)).name,'Head');
  assert(model.skins.every(s=>s.joints.length===20));assert.equal(model.images?.length||0,0);
  assert.deepEqual(model.animations.map(a=>a.name).sort(),['celebrate','fall','idle','jump','land','run','walk']);
  assert(!model.nodes.some(n=>['GORIL_KAFA','TAC','CICEK'].includes(n.name)));
  assert.equal(model.scenes[0].extras.originalCharacter,base);assert.equal(model.scenes[0].extras.parkNativeHeight,.3345185926093267);
 }
 assert(total<1024*1024);
 assert.equal(createHash('sha256').update(read('models/goril-motion-v3.glb')).digest('hex'),'cd14c7a06dda3c6c7a25e7106e90bfb34c8276bd1cc09b810d9b5c2f174e9c01');
 for(const report of JSON.parse(read('models/park-originals/build-report.json'))){assert.equal(report.openShellEdges,0);assert.equal(report.eyeRelief,0);assert.equal(report.donorHeadUsed,false);assert(report.refinement.maxChordError<=report.refinement.tolerance);}
});
test('reference surface refinement is conforming, bounded and does not mutate input',()=>{
 const input=[new Vector2(0,0),new Vector2(1,0),new Vector2(1,1),new Vector2(0,1)],tris=[[0,1,2],[0,2,3]];
 const result=refineHeadSurface(input,tris,p=>new Vector3(p.x,p.y,.3*Math.sin(Math.PI*p.x)*Math.sin(Math.PI*p.y)),{tolerance:.01});
 assert(result.stats.maxChordError<=.01);assert(result.points.length>4);assert.equal(input.length,4);assert.deepEqual(tris,[[0,1,2],[0,2,3]]);
 const edges=new Map();for(const t of result.triangles)for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1);}
 for(const [key,count] of edges){assert(count===1||count===2);if(count===1){const [a,b]=key.split(':').map(i=>result.points[+i]);assert((a.x===b.x&&(a.x===0||a.x===1))||(a.y===b.y&&(a.y===0||a.y===1)),'No T junctions on shared interior edges');}}
});
test('every entry keeps updated character aliases on one module instance',()=>{
 for(const file of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
  const html=read(file).toString(),map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for(const name of ['native-character','gorilla-studio-items','studio-catalog','main','chunk-G7D6MVRW','chunk-55YKN7VY','claude-gorilla-runtime']){
   const path='/67park-foundation-next/app/'+name+'.js',target=path+'?v='+(['native-character','main'].includes(name)?revision:'originals-1');assert.equal(map[path],target);
   for(const [key,value] of Object.entries(map))if(key.split('?')[0]===path)assert.equal(value,target,file+' '+key);
  }
 }
});
