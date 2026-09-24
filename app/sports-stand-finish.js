import * as T from 'three';
import {mergeGeometries,mergeVertices} from '../island/utils/BufferGeometryUtils.js';
import {roundedRailGeometry} from './island-stair-geometry.js';

const assert=(ok,message)=>{if(!ok)throw Error('Sports stand finish: '+message);};
const materials=['shell','edge','cream'];
const point=(s,origin,x,y,z)=>new T.Vector3(s.x-origin[0]+Math.cos(s.yaw)*x+Math.sin(s.yaw)*z,y,s.z-origin[1]-Math.sin(s.yaw)*x+Math.cos(s.yaw)*z);
const local=(s,origin,p)=>{const x=p.x+origin[0]-s.x,z=p.z+origin[1]-s.z;return new T.Vector3(Math.cos(s.yaw)*x-Math.sin(s.yaw)*z,p.y,Math.sin(s.yaw)*x+Math.cos(s.yaw)*z);};
function geometryFromTriangles(source,indices,transform){
 const result=new T.BufferGeometry();
 for(const name of ['position','normal']){
  const a=source.attributes[name],values=new Float32Array(indices.length*3);
  for(let i=0;i<indices.length;i++)new T.Vector3().fromBufferAttribute(a,indices[i]).toArray(values,i*3);
  result.setAttribute(name,new T.BufferAttribute(values,3));
 }
 if(transform)result.applyMatrix4(transform);
 return result;
}
function cylinder(a,b,r){
 const delta=b.clone().sub(a),g=new T.CylinderGeometry(r,r,delta.length(),16);
 g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
 g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());g.deleteAttribute('uv');return g;
}

/** Repair the two authored SPORTS97 stands before collision samplers are built.
 * Reuse the west rear shell/cap and existing material batches. No new GLB,
 * textures, draw calls, floor changes or changes to the separate skate stairs. */
export function finishSportsStands(group,metadata){
 if(group.userData.standFinish)return group.userData.standFinish;
 assert(metadata?.version===97&&metadata.revision===5,'source revision changed');
 const west=metadata.stands.find(s=>s.id==='west'),east=metadata.stands.find(s=>s.id==='east'),origin=metadata.origin;
 assert(west?.w===28&&west.rows===4&&east?.w===26&&east.rows===3,'stand layout changed');
 const changes=[],rails=[],copied={},removed={};
 // The east rear follows the same rounded closed pavilion as the west one,
 // fitted to its narrower platform. Only that rear shell is replaced.
 const westFrame=new T.Matrix4().makeRotationY(west.yaw).setPosition(west.x-origin[0],0,west.z-origin[1]);
 const eastFrame=new T.Matrix4().makeRotationY(east.yaw).setPosition(east.x-origin[0],0,east.z-origin[1]);
 // Inset the solid rear body onto the existing east plinth; only the upper
 // cap overhangs. No unsupported lower lip or extra platform is introduced.
 const rearTransform=eastFrame.clone().multiply(new T.Matrix4().makeTranslation(0,0,(west.d-east.d)/2+.25)).multiply(new T.Matrix4().makeScale(east.w/west.w,1,1)).multiply(westFrame.clone().invert());
 for(const material of materials){
  const mesh=group.getObjectByName('SPORTS97_SOLID_SPORTS97_'+material);
  assert(mesh?.isMesh,'missing '+material+' batch');
  const g=mesh.geometry,p=g.attributes.position,ix=g.index,keep=[],rear=[];
  let railTriangles=0,wallTriangles=0;
  const threshold=material==='shell'?-1.65:material==='edge'?-1.35:-3.70;
  for(let i=0;i<(ix?.count??p.count);i+=3){
   const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j);
   const points=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j));
   const w=points.map(v=>local(west,origin,v));
   if(material!=='cream'&&w.every(v=>Math.abs(v.x)<=14.6&&v.z>=-4.45&&v.z<=threshold&&v.y>=(material==='edge'?3.75:.24)&&v.y<=4.23))rear.push(...ids);
   const e=points.map(v=>local(east,origin,v));
   const oldWall=material==='shell'&&e.every(v=>Math.abs(v.x)<=13.001&&v.y>=.249&&v.y<=2.071&&v.z>=-2.551&&v.z<=-2.029);
   const oldRail=material==='cream'&&[west,east].some(s=>points.every(v=>{const q=local(s,origin,v);return Math.abs(Math.abs(q.x)-(s.w/2-.25))<.073&&q.y>.87&&q.y<2.48&&Math.abs(q.z-.1)<s.d/2-.16;}));
   if(oldWall)wallTriangles++;else if(oldRail)railTriangles++;else keep.push(...ids);
  }
  if(material!=='cream')assert(rear.length>0,'missing west rear '+material);
  if(material==='shell')assert(wallTriangles===300,'east low rear wall changed: '+wallTriangles);
  if(material==='cream')assert(railTriangles===160,'four source rails changed: '+railTriangles);
  const additions=rear.length?[geometryFromTriangles(g,rear,rearTransform)]:[];
  if(material==='cream')for(const s of [west,east])for(const side of [-1,1]){
   const x=side*(s.w/2-.25),front=s.d/2-.47,back=front-(s.rows-1)*1.08-.5;
   const low=.55,high=.55+(s.rows-1)*.4,railHeight=1.03;
   const a=point(s,origin,x,low+railHeight,front),b=point(s,origin,x,high+railHeight,back);
   const footA=point(s,origin,x,low-.035,front),footB=point(s,origin,x,high-.035,back);
   // The swept frame is defined in stand-local Y/Z, then rotated with the
   // stand; passing world corners would flatten its cross-section at 90 deg.
   const sweep=roundedRailGeometry([
    new T.Vector3(x,low-.035,front),new T.Vector3(x,low+railHeight,front),
    new T.Vector3(x,high+railHeight,back),new T.Vector3(x,high-.035,back)
   ],.075);
   sweep.geometry.applyMatrix4(new T.Matrix4().makeRotationY(s.yaw).setPosition(s.x-origin[0],0,s.z-origin[1]));
   additions.push(sweep.geometry);
   const feet=[{position:footA.toArray(),tread:low},{position:footB.toArray(),tread:high}];
   for(let row=1;row<s.rows-1;row++){
    const z=s.d/2-.72-row*1.08,t=(front-z)/(front-back),floor=.55+row*.4;
    const bottom=point(s,origin,x,floor-.035,z),top=a.clone().lerp(b,t);
    additions.push(cylinder(bottom,top,.065));feet.push({position:bottom.toArray(),tread:floor});
   }
   // Small closed foot collars meet the tread, without widening the aisle.
   for(const f of feet){const a=new T.Vector3(...f.position),b=a.clone();a.y=f.tread-.012;b.y=f.tread+.035;additions.push(cylinder(a,b,.105));}
   rails.push({stand:s.id,side,a:a.toArray(),b:b.toArray(),feet,radius:.075});
  }
  // Keep every untouched vertex/normal byte and the original indexing. Only
  // the small added parts are deduplicated, not the whole sports district.
  const retained=g.clone();retained.setIndex(keep);
  const pieces=[retained,...additions.map(piece=>{const indexed=mergeVertices(piece,1e-7);piece.dispose();return indexed;})];
  const merged=mergeGeometries(pieces);assert(merged,'batch merge '+material);
  for(const piece of pieces)piece.dispose();
  merged.computeBoundingBox();merged.computeBoundingSphere();
  changes.push({mesh,old:g,geometry:merged});copied[material]=rear.length/3;removed[material]=wallTriangles+railTriangles;
 }
 // Commit only after every exact source guard has passed.
 for(const c of changes){c.mesh.geometry=c.geometry;c.old.dispose();}
 const stats={revision:1,stands:2,rails:rails.length,supports:rails.reduce((n,r)=>n+r.feet.length,0),copiedRearTriangles:copied,removedTriangles:removed,extraDrawCalls:0,extraTextures:0,sourceAssetChanged:false,rearTop:4.22};
 const result={stats,rails};group.userData.standFinish=result;return result;
}
