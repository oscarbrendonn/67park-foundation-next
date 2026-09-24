import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {parseClaudeGorillaMotion} from '../app/claude-gorilla-animation.js';
import {withCharacterPunch,punchProfile,PUNCH_SECONDS,PUNCH_IMPACT_SECONDS,PUNCH_COOLDOWN_SECONDS} from '../app/character-punch.js';
import {createPunchBurst,updatePunchBurst} from '../app/punch-burst.js';
import {updatePreviewHit} from '../app/preview-hit-motion.js';

test('three distinct upper-body attacks preserve shared clips, rig and single contact cadence',()=>{
 const clips=parseClaudeGorillaMotion(JSON.parse(fs.readFileSync('assets/motion/claude-gorilla.json'))),before=JSON.stringify(clips),signatures=[];
 assert.equal(PUNCH_SECONDS,.46);assert.equal(PUNCH_IMPACT_SECONDS,.14);assert.equal(PUNCH_COOLDOWN_SECONDS,.65);
 for(const base of ['goril','cat67','ninja67']){
  const edited=withCharacterPunch(clips,base),clip=edited.find(c=>c.name==='previewPunch');
  for(const original of clips)assert.strictEqual(edited.find(c=>c.name===original.name),original);
  assert.equal(clip.duration,.46);assert(clip.tracks.length>0);signatures.push(JSON.stringify(clip.tracks));
  for(const track of clip.tracks){
   assert.match(track.name,/^(Spine[123]|Head|Biscep[LR]|Arm[LR]|Hand[LR])\.quaternion$/);
   assert(track.values.every(Number.isFinite));assert.deepEqual([...track.values.slice(0,4)],[...track.values.slice(-4)]);
  }
  const additive=clip.clone();T.AnimationUtils.makeClipAdditive(additive,0,clips.find(c=>c.name==='idle'));
  for(const track of additive.tracks)for(const q of [track.values.slice(0,4),track.values.slice(-4)])assert(new T.Quaternion(...q).angleTo(new T.Quaternion())<.001);
 }
 assert.equal(new Set(signatures).size,3);assert.equal(JSON.stringify(clips),before);assert.strictEqual(withCharacterPunch(clips,'unsupported'),clips);
});
test('character effects are bounded reusable geometry and fully disposed',()=>{
 const scene=new T.Scene(),effect=createPunchBurst(scene),camera=new T.PerspectiveCamera(),geometries=new Set();let disposed=0;
 for(let i=0;i<90;i++){
  const base=['goril','cat67','ninja67'][i%3];effect.trigger({x:0,y:1,z:0},0,base);effect.update(.01,camera);
  assert.equal(effect.stats.profile,punchProfile(base).id);assert(effect.stats.triangles<=120);assert.equal(scene.children.length,1);
  geometries.add(effect.mesh.geometry);assert(effect.mesh.geometry.attributes.position.array.every(Number.isFinite));
 }
 assert.equal(geometries.size,3);for(const g of geometries)g.addEventListener('dispose',()=>disposed++);
 effect.dispose();effect.dispose();assert.equal(disposed,3);assert.equal(scene.children.length,0);
});
test('cat second paw is visual only and blocked/airborne states clear effects',()=>{
 const saved=globalThis.document;globalThis.document={hidden:false};
 try{
  const scene=new T.Scene(),visual=new T.Group();scene.add(visual);
  const context={visual,charBase:'cat67',position:{x:0,y:1,z:0},camera:new T.PerspectiveCamera(),control:true};
  const state={punchT:.33,punchImpact:true,heading:0,grounded:true};
  updatePunchBurst(context,state,.01);const mesh=scene.getObjectByName('punch-impact-burst');assert.equal(mesh.userData.punchBurst.triggers,1);
  state.punchImpact=false;state.punchT=.18;updatePunchBurst(context,state,.01);
  assert.equal(state.punchImpact,false);assert.equal(mesh.userData.punchBurst.triggers,2);assert.equal(mesh.userData.punchBurst.phase,1);
  state.punchT=.16;updatePunchBurst(context,state,.01);assert.equal(mesh.userData.punchBurst.triggers,2);
  state.grounded=false;updatePunchBurst(context,state,.01);assert.equal(mesh.visible,false);
  context.charBase='ninja67';state.grounded=true;state.punchT=.33;state.punchImpact=true;updatePunchBurst(context,state,.01);
  assert.equal(mesh.userData.punchBurst.profile,'ninja-strike');context.blocked=true;updatePunchBurst(context,state,.01);assert.equal(mesh.visible,false);
  updatePunchBurst({visual:null},state,.01);assert.equal(scene.children.length,1);
 }finally{globalThis.document=saved;}
});
test('real hit clock emits one gameplay impact per tap and ignores repeated input',()=>{
 const saved={document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver};
 const events={},buttons={},button={style:{},dataset:{},setAttribute(){},addEventListener:(name,fn)=>buttons[name]=fn};
 globalThis.document={hidden:false,createElement:()=>button,querySelectorAll:()=>[],getElementById:()=>({}),body:{append(){}},addEventListener(){}};
 globalThis.window={addEventListener:(name,fn)=>events[name]=fn};globalThis.MutationObserver=class{observe(){}};
 const tap=()=>buttons.pointerdown({type:'pointerdown',button:0,preventDefault(){},stopPropagation(){}});
 try{
  const state={enabled:true,grounded:true};updatePreviewHit(state,.01,true);tap();let impacts=0;
  for(let i=0;i<60;i++){if(i===2)tap();updatePreviewHit(state,.01,true);impacts+=Number(state.punchImpact);}
  assert.equal(impacts,1);assert.equal(state.punchT,0);
  for(let i=0;i<10;i++)updatePreviewHit(state,.01,true);tap();updatePreviewHit(state,.01,true);assert(state.punchT>0);
  state.jumped=true;updatePreviewHit(state,.01,true);assert.equal(state.punchT,0);assert.equal(state.punchImpact,false);
  events.blur();assert.equal(button.hidden,true);
 }finally{Object.assign(globalThis,saved);}
});
test('all ten game entries share fresh attack modules without stale duplicate input handlers',()=>{
 for(const entry of ['index.html','play/index.html','explore/index.html','style-studio/index.html','balloon/index.html','race/index.html','rockets/index.html','sports/index.html','lane-rush/index.html','skybound-soft/index.html']){
  const html=fs.readFileSync(entry,'utf8'),map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for(const [name,old] of [['claude-gorilla-animation','bot-hit-13'],['preview-hit-motion','bot-hit-13'],['punch-burst','punch-burst-1'],['character-punch','character-punch-1']]){
   const path='/67park-foundation-next/app/'+name+'.js';assert.equal(map[path],path+'?v=character-punch-1');assert.equal(map[path+'?v='+old],map[path]);
   for(const [key,target] of Object.entries(map))if(key.split('?')[0]===path)assert.equal(target,map[path]);
  }
 }
});
