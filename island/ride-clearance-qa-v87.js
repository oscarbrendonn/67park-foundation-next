import * as T from 'three';
import {installRideControls84} from './lunapark-rides-v84.js?v=foundation-next-movement-1.1';
import {disposeParkObject} from './park-assets-v28.js';

// Imported ONLY by ?qa=... links. No NPCs, extra avatars, controls, or asset
// downloads are added to normal play. These are labelled local test riders,
// not remote players and not evidence of a multiplayer connection.
export function createRideClearanceQA87({scene,loadCharacter,Controller,environment,rides,main,approach,isGame,data}){
 const extras=[];let label=null,loading=false;
 function clear(){for(const a of extras){a.controls.dispose();a.c.dispose();disposeParkObject(a.c.body);}extras.length=0;label?.remove();label=null;delete data.rideTest87;}
 function actors(){return [main(),...extras].filter(a=>a?.controls.active);}
 async function fill(asset='ferris',count=4){
  if(loading)throw Error('Rider test already loading');if(!Number.isInteger(count)||count<1||count>10)throw Error('Invalid test rider count');
  loading=true;clear();main().controls.exit();delete data.rideTestError87;
  try{
   const ride=rides().find(r=>r.asset===asset);if(!ride||count>(ride.stats.seatsPerCabin>1?ride.stats.seatsPerCabin:ride.stats.seats))throw Error('Test exceeds seat capacity');
   const roster=['friendsie_1','friendsie_100','friendsie_1000'];
   for(let i=1;i<count;i++){
    const {body,clips}=await loadCharacter(roster[(i-1)%roster.length]),env={...environment(),scene:undefined,data:{}},camera=new T.PerspectiveCamera(58,1,.1,500);
    scene.add(body);const c=new Controller(body,clips,camera,env);c.reset(ride.entry.x,ride.entry.z,0);c.boardOn=false;
    const controls=installRideControls84({rides:()=>[ride],controller:()=>c,isGame,data:env.data,headless:true});extras.push({c,controls,data:env.data});
   }
   approach(asset);
   if(!main().controls.enter())throw Error('Main test rider could not board');
   for(const a of extras)if(!a.controls.enter())throw Error('Additional rider could not reserve a free seat');
   label=document.createElement('div');label.textContent=count+' karakterli yerel oturma testi';
   label.style.cssText='position:fixed;left:18px;bottom:24px;padding:9px 13px;border-radius:14px;background:#fff7ed;color:#66575b;font:600 12px system-ui;pointer-events:none;z-index:44';document.body.append(label);
   data.rideTest87=JSON.stringify({localTestOnly:true,asset,count});return state();
  }catch(e){clear();main().controls.exit();throw e;}finally{loading=false;}
 }
 function update(dt){for(const a of extras){a.controls.update(dt);if(a.controls.active)a.controls.passenger(dt,{yaw:0,pitch:-.3});}}
 function state(){return {localTestOnly:true,riders:actors().map(a=>({character:a.c.body.userData.characterId,...JSON.parse(a.data.ride84),position:a.c.body.position.toArray()}))};}
 function measure(){
  const p=new T.Vector3(),rows=[];
  for(const a of actors()){
   const ride=a.controls.ride,index=JSON.parse(a.data.ride84).seat,s=ride.seat(index),body=a.c.body,box=new T.Box3(),upper=new T.Box3();body.updateMatrixWorld(true);
   body.traverse(o=>{if(!o.isMesh)return;for(let n=o;n;n=n.parent)if(!n.visible)return;if(o.isSkinnedMesh)o.skeleton.update();
    for(let i=0;i<o.geometry.attributes.position.count;i++){
     if(o.isSkinnedMesh)o.getVertexPosition(i,p);else p.fromBufferAttribute(o.geometry.attributes.position,i);p.applyMatrix4(o.matrixWorld);box.expandByPoint(p);
     if(p.y>s.position.y+.32)upper.expandByPoint(p);
    }
   });
   let poleGap=null;for(const pole of ride.poles()){
    if(upper.isEmpty()||upper.max.y<pole.minY||upper.min.y>pole.maxY)continue;
    const dx=Math.max(upper.min.x-pole.x,0,pole.x-upper.max.x),dz=Math.max(upper.min.z-pole.z,0,pole.z-upper.max.z),gap=Math.hypot(dx,dz)-pole.radius;
    poleGap=poleGap==null?gap:Math.min(poleGap,gap);
   }
   rows.push({character:body.userData.characterId,asset:ride.asset,seat:index,cabin:s.cabin,bounds:[box.min.toArray(),box.max.toArray()],poleGap,roofGap:s.kind==='ferris'?s.ceiling-box.max.y:null});
  }
  const row=rows.filter(r=>r.asset==='ferris').sort((a,b)=>a.bounds[0][0]-b.bounds[0][0]),sideGaps=row.slice(1).map((r,i)=>r.bounds[0][0]-row[i].bounds[1][0]);
  const report={localTestOnly:true,rows,sideGaps};data.rideClearance87=JSON.stringify(report);return report;
 }
 return {fill,clear,update,state,measure};
}
