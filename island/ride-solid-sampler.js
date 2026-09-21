import * as THREE from 'three';

const EPSILON=1e-7;
const HEIGHT_EPSILON=1e-5;
const EDGE_PRECISION=1e5;

const finite=value=>Number.isFinite(value);
const empty=()=>({surfaces:[],intervals:[]});
const quantize=value=>Math.round(value*EDGE_PRECISION);
const pointKey=(x,y,z)=>`${quantize(x)},${quantize(y)},${quantize(z)}`;
const edgeKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;

class UnionFind {
 constructor(length){this.parent=Array.from({length},(_,index)=>index);}
 find(index){let parent=this.parent[index];while(parent!==this.parent[parent])parent=this.parent[parent];while(index!==parent){const next=this.parent[index];this.parent[index]=parent;index=next;}return parent;}
 join(a,b){a=this.find(a);b=this.find(b);if(a!==b)this.parent[b]=a;}
}

/**
 * Index transformed triangle meshes once for vertical support/solid queries.
 * Closed, consistently outward-wound shells alternate downward (entry) then
 * upward (exit) faces along a vertical line. We pair only those events from
 * one geometrically edge-connected shell; unrelated overlapping planes remain
 * open surfaces rather than becoming an invented volume.
 */
export function createRideSolidSampler(meshes,{cellSize=1,maxCellSpan=256,maxReferences=200000}={}){
 const size=finite(cellSize)&&cellSize>EPSILON?cellSize:1;
 const spanLimit=Number.isInteger(maxCellSpan)&&maxCellSpan>0?maxCellSpan:256;
 const referenceLimit=Number.isInteger(maxReferences)&&maxReferences>0?maxReferences:200000;
 let triangles=[],edgeOwners=new Map();const cells=new Map();
 const stats={cellSize:size,maxCellSpan:spanLimit,maxReferences:referenceLimit,meshes:0,skippedInstanced:0,skippedOversized:0,triangles:0,indexedTriangles:0,components:0,closedComponents:0,cells:0,references:0,bytes:0,maxBucket:0,queries:0,lastCandidates:0,maxQueryCandidates:0,disposed:false};
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(const mesh of meshes??[]){
  if(!mesh?.isMesh||!mesh.geometry?.attributes?.position)continue;
  if(mesh.isInstancedMesh){stats.skippedInstanced++;continue;}
  mesh.updateWorldMatrix?.(true,false);stats.meshes++;
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
  const count=index?index.count:position.count;
  for(let offset=0;offset+2<count;offset+=3){
   const ia=index?index.getX(offset):offset,ib=index?index.getX(offset+1):offset+1,ic=index?index.getX(offset+2):offset+2;
   a.fromBufferAttribute(position,ia).applyMatrix4(mesh.matrixWorld);
   b.fromBufferAttribute(position,ib).applyMatrix4(mesh.matrixWorld);
   c.fromBufferAttribute(position,ic).applyMatrix4(mesh.matrixWorld);
   if(![a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z].every(finite))continue;
   const id=triangles.length,ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
   const normalY=uz*vx-ux*vz,area=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
   const triangle={id,ax:a.x,ay:a.y,az:a.z,bx:b.x,by:b.y,bz:b.z,cx:c.x,cy:c.y,cz:c.z,area,normalY,component:id};
   triangles.push(triangle);stats.triangles++;
   const keys=[pointKey(a.x,a.y,a.z),pointKey(b.x,b.y,b.z),pointKey(c.x,c.y,c.z)];
   for(const key of [edgeKey(keys[0],keys[1]),edgeKey(keys[1],keys[2]),edgeKey(keys[2],keys[0])]){
    const owner=edgeOwners.get(key);if(owner===undefined)edgeOwners.set(key,id);else if(Array.isArray(owner))owner.push(id);else edgeOwners.set(key,[owner,id]);
   }
  }
 }
 const union=new UnionFind(triangles.length);
 for(const owner of edgeOwners.values())if(Array.isArray(owner))for(let i=1;i<owner.length;i++)union.join(owner[0],owner[i]);
 const roots=new Map();
 for(const triangle of triangles){const root=union.find(triangle.id);if(!roots.has(root))roots.set(root,roots.size);triangle.component=roots.get(root);}
 stats.components=roots.size;
 const closed=Array.from({length:roots.size},()=>true);
 for(const owners of edgeOwners.values()){
  const ids=Array.isArray(owners)?owners:[owners];
  if(ids.length!==2)closed[triangles[ids[0]].component]=false;
 }
 for(const triangle of triangles)triangle.closed=closed[triangle.component];
 stats.closedComponents=closed.filter(Boolean).length;
 let references=0;
 for(const triangle of triangles){
  if(Math.abs(triangle.area)<=EPSILON)continue;
  const minX=Math.min(triangle.ax,triangle.bx,triangle.cx),maxX=Math.max(triangle.ax,triangle.bx,triangle.cx),minZ=Math.min(triangle.az,triangle.bz,triangle.cz),maxZ=Math.max(triangle.az,triangle.bz,triangle.cz);
  const minGX=Math.floor(minX/size),maxGX=Math.floor(maxX/size),minGZ=Math.floor(minZ/size),maxGZ=Math.floor(maxZ/size),spanX=maxGX-minGX+1,spanZ=maxGZ-minGZ+1,needed=spanX*spanZ;
  if(spanX>spanLimit||spanZ>spanLimit||needed>referenceLimit-references){stats.skippedOversized++;continue;}
  for(let gz=minGZ;gz<=maxGZ;gz++)for(let gx=minGX;gx<=maxGX;gx++){
   const key=`${gx},${gz}`,bucket=cells.get(key)??[];if(!cells.has(key))cells.set(key,bucket);bucket.push(triangle);
   references++;
  }
  stats.indexedTriangles++;
 }
 for(const bucket of cells.values())stats.maxBucket=Math.max(stats.maxBucket,bucket.length);stats.references=references;stats.cells=cells.size;
 // Numeric payload estimate only: JS object/Map allocator overhead varies by
 // engine and is deliberately not represented as retained heap bytes.
 stats.bytes=stats.triangles*96+stats.references*4+stats.cells*16;
 // The cells retain their triangles. Drop all build-only welding/index arrays.
 triangles=[];edgeOwners.clear();edgeOwners=null;

 function sample(x,z){
  if(stats.disposed||!finite(x)||!finite(z))return empty();
  const bucket=cells.get(`${Math.floor(x/size)},${Math.floor(z/size)}`)??[];
  stats.queries++;stats.lastCandidates=bucket.length;stats.maxQueryCandidates=Math.max(stats.maxQueryCandidates,bucket.length);
  const surfaces=[],events=new Map(),openFaces=[];
  for(const triangle of bucket){
   const {ax,ay,az,bx,by,bz,cx,cy,cz,area,normalY,component,closed}=triangle;
   const wa=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/area;
   const wb=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/area;
   const wc=1-wa-wb;
   if(wa<-EPSILON||wb<-EPSILON||wc<-EPSILON)continue;
   const y=wa*ay+wb*by+wc*cy;
   if(!finite(y))continue;
   if(normalY>EPSILON)surfaces.push(y);
   if(!closed&&Math.abs(normalY)>EPSILON)openFaces.push([y,y]);
   if(closed&&Math.abs(normalY)>EPSILON){const list=events.get(component)??[];if(!events.has(component))events.set(component,list);list.push({y,down:normalY<0});}
  }
  surfaces.sort((a,b)=>a-b);
  const uniqueSurfaces=[];for(const y of surfaces)if(!uniqueSurfaces.length||Math.abs(y-uniqueSurfaces.at(-1))>HEIGHT_EPSILON)uniqueSurfaces.push(y);
  // An authored open sheet is still a solid surface, but has no invented
  // depth. In particular the coaster's open end must not turn its underside
  // into an invisible volume all the way down to the plaza.
  const intervals=openFaces;
  for(const list of events.values()){
   list.sort((a,b)=>a.y-b.y||Number(a.down)-Number(b.down));
   const unique=[];for(const event of list){const previous=unique.at(-1);if(!previous||Math.abs(event.y-previous.y)>HEIGHT_EPSILON||event.down!==previous.down)unique.push(event);}
   let bottom=null;
   for(const event of unique){
    if(event.down){bottom=bottom===null?event.y:Math.min(bottom,event.y);}
    else if(bottom!==null&&event.y>bottom+HEIGHT_EPSILON){intervals.push([bottom,event.y]);bottom=null;}
   }
  }
  intervals.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const merged=[];for(const interval of intervals){const previous=merged.at(-1);if(previous&&interval[0]<=previous[1]+HEIGHT_EPSILON)previous[1]=Math.max(previous[1],interval[1]);else merged.push([...interval]);}
  return {surfaces:uniqueSurfaces,intervals:merged};
 }
 function dispose(){cells.clear();stats.disposed=true;stats.lastCandidates=0;}
 return {sample,stats,dispose};
}
