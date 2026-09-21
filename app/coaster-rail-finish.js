import * as T from 'three';

// The coaster's two authored TubeGeometry rails have open u=0/u=1 rings.
// Close those four rings in-place before material batching and contact indexing.
// No new meshes, materials, textures or per-frame work; the deck is untouched.
export function closeCoasterRailTube(source) {
 const p=source?.attributes.position,n=source?.attributes.normal,uv=source?.attributes.uv,ix=source?.index;
 if(!p||!n||!uv||!ix||source.groups.length)throw Error('Unexpected coaster rail attributes');
 const ends=[];
 for(const end of [0,1]){
  const ids=[];
  for(let i=0;i<p.count;i++)if(Math.abs(uv.getX(i)-end)<1e-7&&uv.getY(i)<.999999)ids.push(i);
  ids.sort((a,b)=>uv.getY(a)-uv.getY(b));
  if(ids.length!==12)throw Error('Coaster rail must have twelve-sided open ends');
  const points=ids.map(i=>new T.Vector3().fromBufferAttribute(p,i));
  const center=points.reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(points.length);
  const radial=points.map(v=>v.clone().sub(center)),radius=radial[0].length();
  if(radius<.095||radius>.105||radial.some(v=>Math.abs(v.length()-radius)>.00003))throw Error('Unexpected coaster end radius');
  const outward=radial[0].clone().cross(radial[3]).normalize();
  let adjacentU=end?0:1;
  for(let i=0;i<uv.count;i++){const u=uv.getX(i);if(end?u<.999999&&u>adjacentU:u>1e-7&&u<adjacentU)adjacentU=u;}
  const adjacent=new T.Vector3();let count=0;
  for(let i=0;i<p.count;i++)if(Math.abs(uv.getX(i)-adjacentU)<1e-7&&uv.getY(i)<.999999){adjacent.add(new T.Vector3().fromBufferAttribute(p,i));count++;}
  if(count!==12)throw Error('Coaster rail adjacent ring missing');
  adjacent.divideScalar(count);
  if(outward.dot(center.clone().sub(adjacent))<0)outward.negate();
  if(radial.some(v=>Math.abs(v.dot(outward))>.00003))throw Error('Coaster rail end is not planar');
  ends.push({end,ids,center,radial,radius,outward});
 }
 const attributes=Object.fromEntries(Object.entries(source.attributes).map(([key,a])=>[key,Array.from(a.array)]));
 const indices=Array.from(ix.array),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),cross=new T.Vector3();
 const vertex=(pos,normal,template)=>{
  const id=attributes.position.length/3;
  for(const [key,attr]of Object.entries(source.attributes)){
   if(key==='position')attributes[key].push(pos.x,pos.y,pos.z);
   else if(key==='normal')attributes[key].push(normal.x,normal.y,normal.z);
   else for(let j=0;j<attr.itemSize;j++)attributes[key].push(attr.array[template*attr.itemSize+j]);
  }
  return id;
 };
 const triangle=(i,j,k)=>{
  a.fromArray(attributes.position,i*3);b.fromArray(attributes.position,j*3);c.fromArray(attributes.position,k*3);
  cross.crossVectors(b.sub(a),c.sub(a));a.fromArray(attributes.normal,i*3);
  if(cross.dot(a)>0)indices.push(i,j,k);else indices.push(i,k,j);
 };
 for(const {ids,center,radial,radius,outward}of ends){
  let previous=ids;
  for(let ring=1;ring<6;ring++){
   const phi=ring*Math.PI/12,cos=Math.cos(phi),sin=Math.sin(phi);
   const next=radial.map((r,j)=>vertex(center.clone().addScaledVector(r,cos).addScaledVector(outward,radius*sin),r.clone().normalize().multiplyScalar(cos).addScaledVector(outward,sin),ids[j]));
   for(let j=0;j<12;j++){const k=(j+1)%12;triangle(previous[j],previous[k],next[j]);triangle(previous[k],next[k],next[j]);}
   previous=next;
  }
  const tip=vertex(center.clone().addScaledVector(outward,radius),outward,ids[0]);
  for(let j=0;j<12;j++)triangle(previous[j],previous[(j+1)%12],tip);
 }
 const geometry=new T.BufferGeometry();
 for(const [key,attr]of Object.entries(source.attributes))geometry.setAttribute(key,new T.BufferAttribute(new attr.array.constructor(attributes[key]),attr.itemSize,attr.normalized));
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.coasterRailFinish1=true;
 return {geometry,caps:2,addedTriangles:(indices.length-ix.count)/3};
}

export function finishCoasterRails(source){
 if(source.userData.coasterRailFinish1)return source.userData.coasterRailFinish1;
 const rails=[];
 source.traverse(o=>{if(o.isMesh&&/^soft_skating_edge(?:_\d+)?$/.test(o.name)&&o.material?.name==='rose')rails.push(o);});
 if(rails.length!==2)throw Error('Expected exactly two red coaster rails');
 // Validate both before changing either; source hierarchy is an asset clone.
 const repairs=rails.map(mesh=>({mesh,...closeCoasterRailTube(mesh.geometry)}));
 for(const repair of repairs)repair.mesh.geometry=repair.geometry;
 return source.userData.coasterRailFinish1={version:1,rails:2,caps:4,addedTriangles:repairs.reduce((sum,r)=>sum+r.addedTriangles,0),addedDraws:0,deckChanged:false};
}
