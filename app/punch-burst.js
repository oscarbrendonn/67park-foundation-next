import * as THREE from 'three';
import {playerSettings} from './player-settings.js';

export const PUNCH_BURST_SECONDS=.19;
// Authored star and tapered speed strokes: one tiny mesh, no image/model fetch.
export function punchBurstGeometry(){
 const positions=[],colors=[];
 const triangle=(a,b,c,color)=>{for(const p of [a,b,c]){positions.push(p[0],p[1],0);colors.push(...color);}};
 const point=(angle,r)=>[Math.cos(angle)*r,Math.sin(angle)*r];
 for(let i=0;i<16;i++)triangle([0,0],point(i*Math.PI/8,i%2?.15:.34),point((i+1)*Math.PI/8,(i+1)%2?.15:.34),[1,.81,.38]);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4+.13,inner=point(a,.43),outer=point(a,i%2?.68:.84),side=[-Math.sin(a)*.038,Math.cos(a)*.038];
  triangle([inner[0]+side[0],inner[1]+side[1]],[inner[0]-side[0],inner[1]-side[1]],outer,[1,.96,.8]);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();return geometry;
}
export function createPunchBurst(scene,{reducedMotion=()=>false,enabled=()=>playerSettings.juice!==false}={}){
 const geometry=punchBurstGeometry(),material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='punch-impact-burst';mesh.visible=false;mesh.renderOrder=3;scene.add(mesh);
 let age=PUNCH_BURST_SECONDS,disposed=false;
 const stats={triggers:0,active:false,triangles:geometry.attributes.position.count/3};
 mesh.userData.punchBurst=stats;
 return {mesh,stats,
  trigger(position,heading){
   if(disposed||!enabled()||!position||![position.x,position.y,position.z,heading].every(Number.isFinite))return false;
   // Runtime position is the physics centre, .555 m above the feet.
   mesh.position.set(position.x+Math.sin(heading)*1.05,position.y+.5,position.z+Math.cos(heading)*1.05);
   age=0;stats.triggers++;return true;
  },
  update(dt,camera){
   if(disposed)return;
   age+=Number.isFinite(dt)?Math.max(0,dt):0;
   const active=enabled()&&age<PUNCH_BURST_SECONDS&&!!camera;mesh.visible=stats.active=active;
   if(!active)return;
   const progress=age/PUNCH_BURST_SECONDS;
   mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(reducedMotion()?.9:.9+.22*(1-Math.pow(1-progress,3)));
   material.opacity=.9*(1-progress*progress);
  },
  reset(){age=PUNCH_BURST_SECONDS;mesh.visible=stats.active=false;},
  dispose(){disposed=true;mesh.removeFromParent();geometry.dispose();material.dispose();stats.active=false;}
 };
}
let currentScene=null,effect=null;
export function updatePunchBurst(context,state,dt){
 let scene=context.visual;while(scene&&!scene.isScene)scene=scene.parent;
 if(currentScene!==scene){effect?.dispose();effect=null;currentScene=scene;}
 if(!scene)return;
 // Lazily allocate only after the first real impact frame.
 if(state.punchImpact&&!effect)effect=createPunchBurst(scene,{reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
 if(context.blocked||!context.control||document.hidden){effect?.reset();return;}
 if(state.punchImpact)effect?.trigger(context.position,state.heading);
 effect?.update(dt,context.camera);
}
