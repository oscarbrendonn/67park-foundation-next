import * as THREE from 'three';
import {playerSettings} from './player-settings.js';
import {punchProfile,PUNCH_SECONDS,CAT_FOLLOW_THROUGH_SECONDS} from './character-punch.js?v=character-punch-1';

export const PUNCH_BURST_SECONDS=.19;
// Authored star and tapered speed strokes: one tiny mesh, no image/model fetch.
export function punchBurstGeometry(base='goril'){
 const positions=[],colors=[];
 const triangle=(a,b,c,color)=>{for(const p of [a,b,c]){positions.push(p[0],p[1],0);colors.push(...color);}};
 const point=(angle,r)=>[Math.cos(angle)*r,Math.sin(angle)*r];
 const profile=punchProfile(base),palette=profile.colors.map(c=>new THREE.Color(c).toArray());
 const oval=(x,y,rx,ry,color)=>{for(let i=0;i<12;i++){
  const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
  triangle([x,y],[x+Math.cos(a)*rx,y+Math.sin(a)*ry],[x+Math.cos(b)*rx,y+Math.sin(b)*ry],color);
 }};
 if(profile.effect==='paw'){
  // Two compact paw silhouettes, each pad and four toes are authored geometry.
  for(const [x,y,s,color] of [[-.22,-.08,1,palette[0]],[.25,.16,.82,palette[1]]]){
   oval(x,y,.15*s,.12*s,color);
   for(const [dx,dy] of [[-.15,.16],[-.055,.24],[.055,.24],[.15,.16]])oval(x+dx*s,y+dy*s,.055*s,.078*s,color);
  }
 }else if(profile.effect==='slash'){
  // Three tapered diagonal strokes, not a flashing full-screen overlay.
  for(let j=0;j<3;j++){
   const x=(j-1)*.19,y=(j-1)*.11;
   triangle([x-.21,y-.3],[x-.12,y+.02],[x+.31,y+.39],palette[j%2]);
   triangle([x-.21,y-.3],[x+.31,y+.39],[x+.03,y+.01],palette[j%2]);
  }
 }else{
 for(let i=0;i<16;i++)triangle([0,0],point(i*Math.PI/8,i%2?.15:.34),point((i+1)*Math.PI/8,(i+1)%2?.15:.34),[1,.81,.38]);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4+.13,inner=point(a,.43),outer=point(a,i%2?.68:.84),side=[-Math.sin(a)*.038,Math.cos(a)*.038];
  triangle([inner[0]+side[0],inner[1]+side[1]],[inner[0]-side[0],inner[1]-side[1]],outer,[1,.96,.8]);
 }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();return geometry;
}
export function createPunchBurst(scene,{reducedMotion=()=>false,enabled=()=>playerSettings.juice!==false}={}){
 const geometry=punchBurstGeometry(),geometries=new Map([['gorilla-punch',geometry]]),material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='punch-impact-burst';mesh.visible=false;mesh.renderOrder=3;scene.add(mesh);
 let age=PUNCH_BURST_SECONDS,disposed=false;
 const stats={triggers:0,active:false,profile:'gorilla-punch',phase:0,triangles:geometry.attributes.position.count/3};
 mesh.userData.punchBurst=stats;
 return {mesh,stats,
  trigger(position,heading,base='goril',phase=0){
   if(disposed||!enabled()||!position||![position.x,position.y,position.z,heading].every(Number.isFinite))return false;
   const profile=punchProfile(base);
   if(!geometries.has(profile.id))geometries.set(profile.id,punchBurstGeometry(base));
   mesh.geometry=geometries.get(profile.id);stats.profile=profile.id;stats.phase=phase;stats.triangles=mesh.geometry.attributes.position.count/3;
   // Runtime position is the physics centre, .555 m above the feet.
   const side=profile.effect==='paw'?(phase?-.18:.18):0;
   mesh.position.set(position.x+Math.sin(heading)*1.05+Math.cos(heading)*side,position.y+.5,position.z+Math.cos(heading)*1.05-Math.sin(heading)*side);
   age=0;stats.triggers++;return true;
  },
  update(dt,camera){
   if(disposed)return;
   age+=Number.isFinite(dt)?Math.max(0,dt):0;
   const active=enabled()&&age<PUNCH_BURST_SECONDS&&!!camera;mesh.visible=stats.active=active;
   if(!active)return;
   const progress=age/PUNCH_BURST_SECONDS;
   mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(reducedMotion()?.9:.9+.22*(1-Math.pow(1-progress,3)));
   material.opacity=(reducedMotion()?.45:.9)*(1-progress*progress);
  },
  reset(){age=PUNCH_BURST_SECONDS;mesh.visible=stats.active=false;},
  dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();for(const g of geometries.values())g.dispose();geometries.clear();material.dispose();stats.active=false;}
 };
}
let currentScene=null,effect=null,previousPunchT=0,previousBase=null;
export function updatePunchBurst(context,state,dt){
 let scene=context.visual;while(scene&&!scene.isScene)scene=scene.parent;
 if(currentScene!==scene){effect?.dispose();effect=null;currentScene=scene;previousPunchT=0;previousBase=null;}
 if(!scene)return;
 const base=context.charBase;
 if(previousBase!==base){effect?.reset();previousPunchT=0;previousBase=base;}
 if(context.blocked||!context.control||document.hidden||state.grounded===false){effect?.reset();previousPunchT=0;return;}
 // Lazily allocate only after the first real impact frame.
 if(state.punchImpact&&!effect)effect=createPunchBurst(scene,{reducedMotion:()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
 if(state.punchImpact)effect?.trigger(context.position,state.heading,base);
 const followRemaining=PUNCH_SECONDS-CAT_FOLLOW_THROUGH_SECONDS;
 // Cosmetic follow-through only: never creates a second gameplay impact.
 if(base==='cat67'&&previousPunchT>followRemaining&&state.punchT<=followRemaining&&state.punchT>0)effect?.trigger(context.position,state.heading,base,1);
 if(previousPunchT>0&&!(state.punchT>0))effect?.reset();
 previousPunchT=state.punchT||0;
 effect?.update(dt,context.camera);
}
