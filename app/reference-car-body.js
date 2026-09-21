import * as T from 'three';
import {mergeGeometries,mergeVertices} from '../vendor/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import {addParkPlates} from './vehicle-branding.js?v=fleet-38';

// The reference is a moulded, body-colour retro compact. Geometry is native 3D:
// an open passenger compartment, independent wheels, and no painted-on windows.
// This layer owns only its exterior; the factory's seats, rig and controller stay.
const STYLE='pastel-retro-reference-car';
const W=1.405,L=2.43,WHEEL_R=.46,WHEEL_X=1.285,WHEEL_Z=1.55;
const TAU=Math.PI*2,clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
let cached=null,leases=0;

function surface(nu,nv,point,{flip=false,closed=false}={}){
 const p=[],ix=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...point(i/nu,j/nv));
 const tri=(a,b,c)=>{
  const ax=p[b*3]-p[a*3],ay=p[b*3+1]-p[a*3+1],az=p[b*3+2]-p[a*3+2];
  const bx=p[c*3]-p[a*3],by=p[c*3+1]-p[a*3+1],bz=p[c*3+2]-p[a*3+2];
  if(Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)<1e-10)return;
  if(flip)ix.push(a,c,b);else ix.push(a,b,c);
 };
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
  const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;tri(a,b,d);tri(a,d,c);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();
 if(closed){const n=g.attributes.normal;for(let j=0;j<=nv;j++){
  const a=j*(nu+1),b=a+nu,v=new T.Vector3().fromBufferAttribute(n,a).add(new T.Vector3().fromBufferAttribute(n,b)).normalize();
  n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);
 }}
 // At the pole of a capped surface only one of the coincident vertices is used.
 // Giving unused vertices a finite normal also keeps offline QA deterministic.
 const normals=g.attributes.normal;
 for(let i=0;i<normals.count;i++)if(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))<.1)normals.setXYZ(i,0,1,0);
 return g;
}
function roundedRect(x,y,w,h,r){
 const s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
 s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);
 s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function extrude(shape,depth=.025,bevel=.014){
 const raw=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:5});
 raw.deleteAttribute('normal');raw.deleteAttribute('uv');const g=mergeVertices(raw,1e-5);raw.dispose();g.computeVertexNormals();return g;
}
function flipWinding(g){
 if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];}
 else for(const a of Object.values(g.attributes))for(let i=0;i<a.count;i+=3)for(let j=0;j<a.itemSize;j++){
  const b=(i+1)*a.itemSize+j,c=(i+2)*a.itemSize+j;[a.array[b],a.array[c]]=[a.array[c],a.array[b]];
 }
}
function cabinWidth(y){return lerp(1.305,1.13,clamp((y-1.32)/1.0,0,1));}
function attachedPillarX(z,y,d=0){
 // The curved rear shoulder needs a longer, smooth transition into its
 // C-pillar. A 12cm transition made its lower outside edge flare abruptly.
 const rear=clamp((-z-.85)/.55,0,1),t=clamp((y-lerp(1.425,1.40,rear))/lerp(.12,.30,rear),0,1),blend=t*t*(3-2*t);
 const attached=skinX(z,Math.min(y,waist(z)))-.05+d*.2;
 return lerp(attached,cabinWidth(y)+d,blend);
}
function sideGeometry(g,side,offset=0){
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const z=p.getX(i),originalY=p.getY(i),d=p.getZ(i);
  // Let the rear pillar continue *inside* the curved shoulder, rather than
  // ending as a flat triangular tab laid on top of the deck. Its glass uses
  // the same deformation, so the window opening remains exactly matched.
  const rear=clamp((-z-.8)/.6,0,1),t=clamp((1.58-originalY)/.18,0,1);
  const y=originalY-.08*rear*t*t*(3-2*t);
  // Bury the bottom of the cabin frame in the actual curved skin, then ease
  // out into the pillar. A planar frame foot used to stick out like a flap.
  p.setXYZ(i,side*attachedPillarX(z,y,d+offset),y,z);
 }
 if(side>0)flipWinding(g);g.computeVertexNormals();return g;
}
function waist(z){return 1.355+.075*Math.exp(-Math.pow((Math.abs(z)-1.40)/.69,2));}
function beltPoint(u,v){
 const a=u*TAU,s=Math.sin(a),c=Math.cos(a),sp=Math.abs(s)<1e-12?0:s,cp=Math.abs(c)<1e-12?0:c,e=2/4.2;
 const z=L*Math.sign(cp)*Math.pow(Math.abs(cp),e)*(1-.018*(1-v)**2);
 const swell=.035*Math.exp(-Math.pow((Math.abs(z)-WHEEL_Z)/.60,2))*Math.sin(v*Math.PI);
 const x=W*Math.sign(sp)*Math.pow(Math.abs(sp),e)*(1-.038*(2*v-1)**2+swell);
 const dz=Math.min(Math.abs(z-WHEEL_Z),Math.abs(z+WHEEL_Z));
 const lower=.45+(Math.abs(x)>1.15&&dz<.535?Math.sqrt(.535**2-dz**2):0);
 return [x,lerp(lower,waist(z),v),z];
}
function skinX(z,y){
 let lo=0,hi=1,result=0;
 for(let i=0;i<22;i++){
  const v=(lo+hi)*.5,topZ=z/(1-.018*(1-v)**2),c=Math.sign(topZ)*Math.pow(Math.min(1,Math.abs(topZ)/L),4.2/2);
  const p=beltPoint(Math.acos(c)/TAU,v);result=p[0];if(p[1]<y)lo=v;else hi=v;
 }
 return result;
}
function screenPoint(rear,u,v){
 const r=.12,edge=Math.min(v,1-v),round=edge<r?r-Math.sqrt(Math.max(0,r*r-(edge-r)**2)):0;
 // The rear window sits inside a substantial C-pillar/hatch surround. The
 // former full-width pane met a paper-thin diagonal edge and made both lower
 // corners look like detached, outward-pointing fins from behind.
 const x=u*((rear?lerp(1.19,1.035,v):lerp(1.265,1.09,v))-round),y=rear?lerp(1.515,2.26,v):lerp(1.47,2.295,v);
 const z=(rear?lerp(-1.925,-1.535,v):lerp(.895,.275,v))+(rear?-1:1)*.062*(1-u*u)*Math.sin(v*Math.PI);
 return [x,y,z];
}
function geometryLibrary(){
 if(cached)return cached;
 const buckets=new Map();
 const add=(key,g,position=null,scale=null,rotation=null)=>{
  if(scale)g.scale(...scale);if(rotation){g.rotateX(rotation[0]||0);g.rotateY(rotation[1]||0);g.rotateZ(rotation[2]||0);}if(position)g.translate(...position);
  const plain=g.index?g.toNonIndexed():g.clone();g.dispose();plain.deleteAttribute('uv');plain.deleteAttribute('uv1');
  const list=buckets.get(key)||[];list.push(plain);buckets.set(key,list);
 };
 const box=(key,w,h,d,r,x,y,z)=>add(key,new RoundedBoxGeometry(w,h,d,1,Math.min(r,w*.45,h*.45,d*.45)),[x,y,z]);
 const oval=(key,x,y,z,sx,sy,sz,n=12,m=8)=>add(key,new T.SphereGeometry(1,n,m),[x,y,z],[sx,sy,sz]);
 const line=(key,points,r=.012,n=32,radial=5,closed=false)=>{
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');
  add(key,new T.TubeGeometry(curve,n,r,radial,closed));
 };
 // Continuous rounded-superellipse belt. The lower edge follows actual wheel
 // openings, rather than placing a tyre in front of an uncut opaque body box.
 const belt=surface(96,7,beltPoint,{closed:true});
 const lowerBoundary=Array.from({length:97},(_,i)=>[belt.attributes.position.getX(i),belt.attributes.position.getY(i),belt.attributes.position.getZ(i)]);
 // One closed underbody shares the real fender edge, including its wheel
 // notches. Each recess turns inward, down its inner wall, then into the floor.
 // Independent semicircles left bright slivers between the sampled surfaces.
 add('seal',surface(96,3,(u,v)=>{
  const p=lowerBoundary[Math.round(u*96)],innerX=clamp(p[0],-.82,.82);
  if(v===0)return p;
  if(v<.5)return [innerX,p[1],p[2]];
  if(v<1)return [innerX,.40,p[2]];
  return [0,.40,-.48];
 },{flip:true,closed:true}));
 // The retained rear cushions extend into the upper wheelwell. A small dark
 // bulkhead sits outside them, above the hub and inside the unsteered tyre;
 // keep the front wells deep so the steering sweep remains free.
 for(const side of [-1,1]){
  const arc=lowerBoundary.filter(p=>p[0]*side>1.15&&p[2]<-.95&&p[2]>-2.10&&p[1]>.79).sort((a,b)=>a[2]-b[2]);
  const cap=new T.Shape();cap.moveTo(arc[0][2],.80);
  for(const p of arc)cap.lineTo(p[2],p[1]+.012);
  cap.lineTo(arc.at(-1)[2],.80);cap.closePath();
  const g=new T.ShapeGeometry(cap),p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,side*1.10,p.getY(i),p.getX(i));
  if(side>0)flipWinding(g);g.computeVertexNormals();add('seal',g);
 }
 // One continuous annular top, not independently sampled hood/deck rectangles.
 // The outer row is copied byte-for-byte from the belt's actual top vertices;
 // thus even the sparse superellipse poles share identical polygon edges.
 const topBoundary=Array.from({length:97},(_,i)=>[belt.attributes.position.getX(7*97+i),belt.attributes.position.getY(7*97+i),belt.attributes.position.getZ(7*97+i)]);
 const top=surface(96,6,(u,v)=>{
  const outer=topBoundary[Math.round(u*96)],cz=-.515,dx=outer[0],dz=outer[2]-cz;
  // Round the cabin opening inward wherever its rectangular corner would
  // otherwise leave the curved exterior and fold a top-strip triangle.
  const ratio=Math.min(.94,1.245/Math.max(1e-8,Math.abs(dx)),1.375/Math.max(1e-8,Math.abs(dz)));
  const inner=[dx*ratio,waist(cz+dz*ratio)+.015,cz+dz*ratio];
  if(v===1)return outer;
  return [lerp(inner[0],outer[0],v),lerp(inner[1],outer[1],v)+.11*Math.sin(Math.PI*v),lerp(inner[2],outer[2],v)];
 },{flip:true,closed:true});
 const flatBelt=belt.toNonIndexed(),flatTop=top.toNonIndexed();
 const rawBody=mergeGeometries([flatBelt,flatTop],false);flatBelt.dispose();flatTop.dispose();belt.dispose();top.dispose();
 rawBody.deleteAttribute('normal');const body=mergeVertices(rawBody,1e-5);rawBody.dispose();body.computeVertexNormals();add('paint',body);
 // Keep the hole bottoms inside every extrusion layer: the caps have a
 // 20mm sill, and the .014 bevel expands it to 48mm. The sill stays buried
 // under the curved body through attachedPillarX, without a planar foot flap.
 const frame=new T.Shape();frame.moveTo(-1.955,1.365);frame.lineTo(-1.965,1.46);
 frame.lineTo(-1.555,2.285);frame.quadraticCurveTo(-1.51,2.335,-1.405,2.335);frame.lineTo(.185,2.335);
 frame.quadraticCurveTo(.25,2.335,.290,2.265);frame.lineTo(.925,1.46);frame.lineTo(.905,1.365);frame.closePath();
 const front=new T.Shape();front.moveTo(-.385,1.435);front.lineTo(.635,1.435);front.quadraticCurveTo(.78,1.435,.682,1.61);
 front.lineTo(.37,2.11);front.quadraticCurveTo(.31,2.205,.13,2.205);front.lineTo(-.385,2.205);
 front.quadraticCurveTo(-.47,2.205,-.47,2.12);front.lineTo(-.47,1.52);front.quadraticCurveTo(-.47,1.435,-.385,1.435);
 const rear=new T.Shape();rear.moveTo(-1.66,1.435);rear.lineTo(-.645,1.435);rear.quadraticCurveTo(-.56,1.435,-.56,1.52);
 rear.lineTo(-.56,2.115);rear.quadraticCurveTo(-.56,2.205,-.66,2.205);rear.lineTo(-1.215,2.205);
 rear.quadraticCurveTo(-1.405,2.205,-1.505,1.945);rear.lineTo(-1.735,1.57);rear.quadraticCurveTo(-1.81,1.435,-1.66,1.435);
 const windows=[front,rear].map(h=>new T.Shape(h.getPoints(5)));
 for(const h of windows)frame.holes.push(new T.Path(h.getPoints()));
 for(const side of [-1,1]){
  add('paint',sideGeometry(extrude(frame),side));
  for(const h of windows){
   add('glass',sideGeometry(new T.ShapeGeometry(h),side,-.012));
   // The glass and the opening share one polygon. A separate interpolated
   // black outline would cut across rounded corners and create triangular nicks.
  }
 }
 // A gently crowned, close-fitting roof instead of a thick rectangular slab.
 // The underside remains at 2.245: existing seated heads retain all clearance.
 // Keep the original smooth subdivisions; only reshape the body silhouette.
 const roofRaw=new RoundedBoxGeometry(2.36,.20,1.99,3,.095),rp=roofRaw.attributes.position;
 for(let i=0;i<rp.count;i++){
  const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),upper=clamp((y+.065)/.15,0,1);
  rp.setY(i,y+.11*upper*Math.max(0,1-(x/1.18)**2)*Math.max(0,1-(z/.995)**2));
 }
 roofRaw.deleteAttribute('normal');roofRaw.deleteAttribute('uv');const roof=mergeVertices(roofRaw,1e-5);roofRaw.dispose();roof.computeVertexNormals();
 add('paint',roof,[0,2.345,-.605]);
 for(const rearScreen of [false,true]){
  add('glass',surface(16,8,(u,v)=>screenPoint(rearScreen,u*2-1,v),{flip:rearScreen}));
  const params=[];
  for(let i=0;i<=16;i++)params.push([lerp(-1,1,i/16),0]);
  for(let i=1;i<=8;i++)params.push([1,i/8]);
  for(let i=1;i<=16;i++)params.push([lerp(1,-1,i/16),1]);
  for(let i=1;i<8;i++)params.push([-1,1-i/8]);
  const pts=params.map(([u,v])=>screenPoint(rearScreen,u,v));
  line('metal',pts,.014,40,4,true);
  // A real paint annulus surrounds the screen; unlike an isolated chrome tube
  // it joins the side A-pillars, full scuttle and the underside of the roof.
  add('paint',surface(params.length,2,(u,t)=>{
   const [s,v]=params[Math.round(u*params.length)%params.length],inner=screenPoint(rearScreen,s,v);
   const y=lerp(rearScreen?1.39:1.43,2.335,v),z=rearScreen?lerp(-1.955,-1.535,v):lerp(.925,.275,v),outer=[s*attachedPillarX(z,y,rearScreen?.008:.022),y,z];
   return inner.map((x,i)=>lerp(x,outer[i],t));
  },{closed:true,flip:!rearScreen}));
 }
 // Keep the moulded door clean; only compact hardware follows the outer skin.
 for(const side of [-1,1]){
  box('metal',.035,.071,.20,.024,side*(skinX(-.355,1.225)+.018),1.225,-.355);
  // Round mirrors: stalks, painted spherical backs and small inset glass faces.
  line('seal',[[side*1.315,1.51,.63],[side*1.445,1.56,.66],[side*1.466,1.60,.66]],.025,8,5);
  oval('paint',side*1.455,1.675,.675,.117,.12,.106);
  oval('glass',side*1.455,1.675,.578,.087,.088,.010,10,6);
  const frontZ=2.312;
  oval('metal',side*.947,1.16,frontZ,.255,.265,.063,16,8);
  oval('light',side*.947,1.167,frontZ+.041,.218,.228,.043,16,8);
  oval('metal',side*1.02,1.13,-2.356,.148,.186,.044,12,8);
  oval('red',side*1.02,1.13,-2.389,.111,.144,.031,12,8);
 }
 // The continuous closed body is the front/rear finish; no separate thick
 // bumper bars project beyond it. Physics and seat anchors are factory-owned.
 // Continuous lower sill hides seat undersides, flush with the body rather
 // than leaving a detached black bar below a bright horizontal slit.
 box('paint',2.67,.18,1.94,.045,0,.37,0);
 for(const side of [-1,1]){
  box('metal',.88,.30,.045,.045,0,.965,side*2.458);
  box('ivory',.795,.227,.016,.032,0,.965,side*2.486);
 }
 // Native 67PARK lettering on both plates, sharing the existing seal material.
 // No font download, canvas texture, transparent decal or extra draw call.
 const six=new T.Shape();six.moveTo(.72,1.08);
 six.bezierCurveTo(.54,1.28,.12,1.22,.04,.76);six.bezierCurveTo(-.02,.44,.01,.01,.35,0);
 six.bezierCurveTo(.74,-.04,.85,.23,.76,.49);six.bezierCurveTo(.69,.70,.41,.79,.22,.64);
 six.bezierCurveTo(.24,.97,.48,1.08,.65,.92);six.lineTo(.72,1.08);six.closePath();
 const hole=new T.Path();hole.absellipse(.40,.34,.185,.185,0,TAU,true);six.holes.push(hole);
 const seven=new T.Shape();seven.moveTo(.02,1.2);seven.lineTo(.78,1.2);seven.lineTo(.78,1.02);
 seven.quadraticCurveTo(.46,.63,.37,0);seven.lineTo(.12,0);seven.quadraticCurveTo(.21,.62,.51,.99);
 seven.lineTo(.02,.99);seven.closePath();
 const pGlyph=new T.Shape();pGlyph.moveTo(0,0);pGlyph.lineTo(.21,0);pGlyph.lineTo(.21,.43);pGlyph.lineTo(.40,.43);
 pGlyph.bezierCurveTo(.84,.43,.83,1.2,.40,1.2);pGlyph.lineTo(0,1.2);pGlyph.closePath();
 pGlyph.holes.push(new T.Path(roundedRect(.21,.65,.27,.33,.07).getPoints(4)));
 const aGlyph=new T.Shape();aGlyph.moveTo(0,0);aGlyph.lineTo(.25,1.2);aGlyph.lineTo(.49,1.2);aGlyph.lineTo(.78,0);
 aGlyph.lineTo(.56,0);aGlyph.lineTo(.50,.28);aGlyph.lineTo(.24,.28);aGlyph.lineTo(.19,0);aGlyph.closePath();
 const aHole=new T.Path();aHole.moveTo(.28,.48);aHole.lineTo(.45,.48);aHole.lineTo(.36,.92);aHole.closePath();aGlyph.holes.push(aHole);
 const rGlyph=new T.Shape();rGlyph.moveTo(0,0);rGlyph.lineTo(.21,0);rGlyph.lineTo(.21,.43);rGlyph.lineTo(.35,.43);
 rGlyph.lineTo(.59,0);rGlyph.lineTo(.82,0);rGlyph.lineTo(.55,.49);rGlyph.bezierCurveTo(.83,.62,.78,1.2,.40,1.2);
 rGlyph.lineTo(0,1.2);rGlyph.closePath();rGlyph.holes.push(new T.Path(roundedRect(.21,.65,.27,.33,.07).getPoints(4)));
 const kGlyph=new T.Shape();kGlyph.moveTo(0,0);
 for(const p of [[.21,0],[.21,.48],[.58,0],[.83,0],[.37,.64],[.80,1.2],[.55,1.2],[.21,.74],[.21,1.2],[0,1.2]])kGlyph.lineTo(...p);
 kGlyph.closePath();
 // The authentic multicolour logo is shared by every vehicle, not black text.
 oval('metal',0,1.382,2.400,.036,.069,.018,10,6);
 // Retained seats/steering sit in a real hollow space above this low floor.
 box('seat',2.22,.13,.30,.055,0,1.125,.705);
 box('seal',.31,.12,.038,.018,-.61,1.215,.545);
 // Wheels use the factory's exact rolling radius and steering/axle axes.
 const profile=[[.29,-.162],[.38,-.174],[.435,-.127],[.46,-.060],[.46,.060],[.435,.127],[.38,.174],[.29,.162],[.29,-.162]].map(p=>new T.Vector2(...p));
 add('wheelRubber',new T.LatheGeometry(profile,32),null,null,[0,0,Math.PI/2]);
 // Two shallow domed faces overlap the closed inner barrel; the old centred
 // sphere tapered away before reaching it and left an open white crescent.
 const hubProfile=[[0,-.012],[.285,-.012],[.308,.006],[.235,.044],[0,.052]];
 for(const side of [-1,1])add('wheelMetal',surface(32,4,(u,v)=>{
  const [r,y]=hubProfile[Math.round(v*4)],s=Math.sin(u*TAU),c=Math.cos(u*TAU);
  return [r*(Math.abs(s)<1e-12?0:s),y,r*(Math.abs(c)<1e-12?0:c)];
 },{closed:true}),[side*.158,0,0],null,[0,0,-side*Math.PI/2]);
 // Three inset-looking radial vents make the existing distance-driven roll
 // visible. They follow the domed hub, share its roll transform, and merge
 // into the existing tyre batch: no decal, texture or additional draw call.
 for(const side of [-1,1])for(let spoke=0;spoke<3;spoke++){
  const g=new T.ShapeGeometry(roundedRect(-.022,.12,.044,.09,.022),4),p=g.attributes.position;
  const a=spoke*TAU/3,c=Math.cos(a),s=Math.sin(a);
  for(let i=0;i<p.count;i++){
   const u=p.getX(i),v=p.getY(i),r=Math.hypot(u,v);
   const depth=r<=.235?.052-r*.008/.235:.044-(r-.235)*.038/.073;
   p.setXYZ(i,side*(.158+depth+.002),u*c-v*s,u*s+v*c);
  }
  if(side<0)flipWinding(g);g.computeVertexNormals();add('wheelRubber',g);
 }
 const geometries=new Map();let triangles=0;
 for(const [key,list] of buckets){
  const g=mergeGeometries(list,false);list.forEach(p=>p.dispose());if(!g)throw Error('Reference car geometry merge: '+key);
  if(key==='paint')g.userData.referenceCarBody={beltColumns:96,beltRows:7,beltTriangles:1344,topRows:6,sharedBeltTop:true,doorSeams:false,frontMark:'67',frontBrand:'67PARK',rearBrand:'67PARK',flushPillars:true,closedUnderbody:true,crownedRoof:true,insetRearWindow:true,externalBumperBars:false};
  g.computeBoundingBox();g.computeBoundingSphere();geometries.set(key,g);triangles+=g.attributes.position.count/3*(key.startsWith('wheel')?4:1);
 }
 cached={geometries,triangles};return cached;
}

export function useReferenceCarBody(car){
 if(car?.kind!=='car'||car.style===STYLE)return car;
 if(!car.model?.isGroup||!car.group?.isGroup||!car.spec||!car.steering||!Array.isArray(car.wheels)||!Array.isArray(car.seats))return car;
 const library=geometryLibrary(),exterior=new T.Group();exterior.name='REFERENCE_RETRO_COMPACT_EXTERIOR';
 const physical=(name,color,extra={})=>new T.MeshPhysicalMaterial({name:'reference-car-'+name,color,roughness:.30,metalness:0,clearcoat:.52,clearcoatRoughness:.22,envMapIntensity:.55,...extra});
 const authored=car.mats.paint.color.clone(),hex=authored.getHexString();
 const paintColor=hex==='8ebfb5'?new T.Color('#58b8bb'):authored;
 const materials={
  paint:physical('satin-paint',paintColor),
  seal:physical('rubber-and-seals','#364446',{roughness:.8,clearcoat:0}),
  metal:physical('warm-brushed-trim','#c4c1ad',{metalness:.38,roughness:.32,clearcoat:.14}),
  ivory:physical('number-plate','#e7d9c0',{roughness:.54,clearcoat:.10}),
  light:physical('warm-headlight','#f1c46f',{roughness:.24,emissive:'#e5b55f',emissiveIntensity:.10,clearcoat:.65}),
  red:physical('tail-light','#bd7971',{roughness:.33,clearcoat:.45}),
  glass:physical('thin-smoke-glass','#758c88',{roughness:.16,transparent:true,opacity:.40,depthWrite:false,side:T.DoubleSide,clearcoat:.50,envMapIntensity:.70}),
  wheelRubber:physical('charcoal-tyres','#353a3a',{roughness:.84,clearcoat:0}),
  wheelMetal:physical('simple-hubcaps','#babdb5',{metalness:.44,roughness:.34,clearcoat:.16}),
  seat:car.mats.seat
 };
 const create=(key,parent)=>{const m=new T.Mesh(library.geometries.get(key),materials[key]);m.name=materials[key].name;
  m.castShadow=!materials[key].transparent;m.receiveShadow=!materials[key].transparent;m.userData.safeShadowCaster=m.castShadow;parent.add(m);return m;};
 for(const key of library.geometries.keys())if(!key.startsWith('wheel'))create(key,exterior);
 const wheels=[];
 for(const side of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z]){
  const pivot=new T.Group(),roll=new T.Group();pivot.name='reference-wheel-steer';roll.name='reference-wheel-roll';
  pivot.position.set(side*WHEEL_X,.47,z);pivot.add(roll);exterior.add(pivot);create('wheelRubber',roll);create('wheelMetal',roll);
  wheels.push({pivot,roll,front:z>0});
 }
 // Only the original factory's fixed exterior and wheel meshes are retired.
 // Their materials still belong to the untouched seats/steering and are kept.
 const retired=new Set(),retire=object=>{if(!object)return;object.removeFromParent();object.traverse(o=>{if(o.isMesh&&!retired.has(o.geometry)){retired.add(o.geometry);o.geometry.dispose();}});};
 retire(car.model.children[0]);for(const wheel of car.wheels)retire(wheel.pivot);
 car.model.add(exterior);leases++;
 const oldDispose=car.dispose;let angle=0,disposed=false;
 car.animate=(distance,turn)=>{
  if(Number.isFinite(distance))angle=(angle+distance/(WHEEL_R*car.spec.scale))%TAU;
  turn=Number.isFinite(turn)?turn:0;
  for(const wheel of wheels){wheel.pivot.rotation.y=wheel.front?turn:0;wheel.roll.rotation.x=angle;}
  car.steering.rotation.z=-turn*2.2;
 };
 car.style=STYLE;car.referenceExterior=exterior;car.wheels=wheels;car.roofUnderside=2.245*car.spec.scale;
 car.referenceBody={revision:6,shape:'rounded-retro-compact',geometryTriangles:library.triangles,wheelRadius:WHEEL_R*car.spec.scale,wheelVents:3,wheelFeedbackDraws:0,roofUnderside:car.roofUnderside,sharedGeometry:true,doorSeams:false,frontMark:'67',frontBrand:'67PARK',rearBrand:'67PARK',flushPillars:true,closedUnderbody:true,crownedRoof:true,insetRearWindow:true,externalBumperBars:false};
 car.stats={draws:0,triangles:0};car.group.traverseVisible(o=>{if(o.isMesh){car.stats.draws++;car.stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 car.dispose=()=>{
  if(disposed)return;disposed=true;exterior.removeFromParent();oldDispose.call(car);
  for(const [key,m] of Object.entries(materials))if(key!=='seat')m.dispose();
  if(--leases===0&&cached===library){for(const g of library.geometries.values())g.dispose();cached=null;}
 };
 return addParkPlates(car);
}
