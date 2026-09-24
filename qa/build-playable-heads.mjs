// Original, reference-landmark heads. No imported/donor head geometry.
// Colour regions and eyes are partitions of ONE surface, not floating decals.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import * as T from '../vendor/three.module.js';
import {refineHeadSurface} from './refine-head-surface.mjs';
const req=createRequire('/opt/homebrew/lib/node_modules/@gltf-transform/cli/package.json');
const {NodeIO,Document}=req('@gltf-transform/core'),{ALL_EXTENSIONS}=req('@gltf-transform/extensions');
const {draco}=req('@gltf-transform/functions'),draco3d=req('draco3dgltf');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'models/park-originals');
fs.mkdirSync(out,{recursive:true});
const configs={
 ninja:{ref:'/Users/oscarbrendon/Documents/67VERSE_KAFALAR/ninja.png',cx:512,cy:440,rx:395,ry:315,fur:'#232422',face:'#DEDDD5',depth:.079,
  shell:[[512,124],[683,151],[820,231],[888,358],[908,512],[880,650],[798,716],[653,750],[512,757],[365,749],[218,716],[144,650],[116,512],[136,358],[202,233],[341,153]],
  mask:[[512,477],[668,467],[749,462],[788,484],[806,538],[796,592],[766,625],[680,644],[512,650],[346,644],[260,625],[230,592],[218,538],[236,483],[275,462],[357,467]],
  eyes:[[365,568,52,55],[663,568,52,55]]},
 cat:{ref:'/Users/oscarbrendon/Documents/67VERSE_KAFALAR/cat.png',cx:512,cy:440,rx:278,ry:231,fur:'#888D8B',face:'#888D8B',depth:.073,
  shell:[[512,255],[626,268],[713,309],[769,381],[789,473],[775,570],[724,630],[623,665],[512,674],[401,665],[300,630],[249,570],[235,473],[256,381],[311,309],[399,268]],
  catEars:true,
  eyes:[[408,542,36,37],[616,542,36,37]],mouth:[[490,575],[512,585],[534,575]],nose:[512,550,12,6],whiskers:true}
};
function curve(points,n=6){const result=[];for(let i=0;i<points.length;i++){
 const p0=points[(i-1+points.length)%points.length],p1=points[i],p2=points[(i+1)%points.length],p3=points[(i+2)%points.length];
 for(let j=0;j<n;j++){const t=j/n;result.push(new T.Vector2(...[0,1].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t))));}
 }return result;}
function ellipse(x,y,rx,ry,n=64){return Array.from({length:n},(_,i)=>new T.Vector2(x+rx*Math.cos(i*2*Math.PI/n),y+ry*Math.sin(i*2*Math.PI/n)));}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule()});
const reports=[];
for(const [name,c] of Object.entries(configs)){
 const positions=[],indices=[],materialFaces=[],vertices=new Map(),colors=[],surfaceTriangles=[];
 const materials=[];
 function mat(label,color,roughness=.28){materials.push(new T.MeshStandardMaterial({name:label,color,roughness,metalness:0,vertexColors:true}));return materials.length-1;}
 const fur=mat(name+'_glossy_fur',c.fur),face=mat(name+'_face',c.face,.29),eye=mat(name+'_flush_eyes',c.eyeColor||'#090B0A',.13),mouth=mat(name+'_smile','#101310',.2);
 const outline=curve(c.shell,12),mask=c.mask&&curve(c.mask,8),eyeLoops=c.eyes.map(p=>ellipse(...p));
 const patches=(c.patches||[]).map(([p,col])=>({loop:curve(p),mat:mat(name+'_ear_inner',col,.31)}));
 // Radial distance to the actual traced outline, not an assumed round head.
 function fraction(x,y){const dx=x-c.cx,dy=y-c.cy;if(Math.abs(dx)+Math.abs(dy)<1e-7)return 0;let best=Infinity;
  for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;
   const ax=a.x-c.cx,ay=a.y-c.cy,t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;
   if(t>0&&u>=-1e-6&&u<=1.000001)best=Math.min(best,t);
  }assert(Number.isFinite(best));return 1/best;
 }
 const scale=.167140916/(2*c.rx),bottom=Math.max(...outline.map(p=>p.y));
 function surf(x,y,back=false){const r=fraction(x,y),depth=r>1-1e-10?0:c.depth*Math.sqrt(Math.max(0,1-r*r));return new T.Vector3((x-c.cx)*scale,.134011021+(bottom-y)*scale,depth*(back?-1:1));}
 function vertex(p,tint=[1,1,1]){const key=p.toArray().map(v=>Math.round(v*1e9)).join(',');if(vertices.has(key))return vertices.get(key);const i=positions.length/3;vertices.set(key,i);positions.push(...p.toArray());colors.push(...tint);return i;}
 function triangle(a,b,d,m){const ids=[vertex(a),vertex(b),vertex(d)];if(new Set(ids).size<3)return;indices.push(...ids);materialFaces.push(m);}
 function tintAt(p){if(!['monkey','cat'].includes(name))return [1,1,1];const px=p.x/scale+c.cx,py=bottom-(p.y-.134011021)/scale,base=new T.Color(c.face),rose=new T.Color(name==='cat'?'#BE999C':'#C08A70');
  const q=((Math.abs(px-c.cx)-(name==='cat'?120:118))/34)**2+((py-(name==='cat'?590:505))/20)**2,f=Math.max(0,1-q)**2*.4;
  return [0,1,2].map(i=>1+f*(rose.toArray()[i]/base.toArray()[i]-1));
 }
 function inside(p,loop){let hit=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
 const pupils=name==='gorilla'?c.eyes.map(([x,y,rx,ry])=>ellipse(x,y,rx*.68,ry*.7)):[];
 const loops=[outline,...(mask?[mask]:[]),...eyeLoops,...pupils,...patches.map(p=>p.loop)],data=JSON.parse(execFileSync('python3',[path.join(root,'qa/reference-head-triangulate.py')],{input:JSON.stringify({loops:loops.map(l=>l.map(p=>p.toArray())),maxArea:c.rx*c.ry/850}),maxBuffer:30e6}));
 const refined=refineHeadSurface(data.vertices.map(p=>new T.Vector2(...p)),data.triangles,p=>surf(p.x,p.y));
 const surfacePoints=refined.points;
 for(const ids of refined.triangles){const points=ids.map(i=>surfacePoints[i]),center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);if(!inside(center,outline))continue;
  const material=pupils.some(e=>inside(center,e))?mouth:eyeLoops.some(e=>inside(center,e))?eye:patches.find(p=>inside(center,p.loop))?.mat??(mask&&inside(center,mask)?face:fur);
  for(const back of [false,true]){const pts=points.map(p=>surf(p.x,p.y,back)),cross=pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0]));if((cross.z>0)===back)[pts[1],pts[2]]=[pts[2],pts[1]];triangle(...pts,back?fur:material);}
 }
 const shellVertexCount=positions.length/3;
 const shellEdges=new Map();for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],key=a<b?a+':'+b:b+':'+a;shellEdges.set(key,(shellEdges.get(key)||0)+1);}
 const openShellEdges=[...shellEdges.values()].filter(n=>n!==2).length;
 assert.equal(openShellEdges,0,name+' shell must be closed across every face and eye boundary');
 // Features below share a single smooth material; none supplies eye geometry.
 function ellipsoid(label,center,size,m){const cap=label==='rounded end',g=new T.SphereGeometry(1,cap?16:28,cap?10:18);g.scale(...size);g.translate(...center);const p=g.attributes.position;
  for(let i=0;i<g.index.count;i+=3)triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,g.index.getX(i+k))),m);g.dispose();
 }
 const at=(x,y,relief=0)=>{const p=surf(x,y);p.z+=relief;return p;};
 for(const [x,y,rx,ry] of c.ears||[]){const p=new T.Vector3((x-c.cx)*scale,.134011021+(bottom-y)*scale,0);ellipsoid('ear',p.toArray(),[rx*scale,ry*scale,.017],fur);
  // Recessed-looking colour inlay sits inside the rounded ear volume.
  ellipsoid('ear inset',[p.x,p.y,.011],[rx*scale*.71,ry*scale*.72,.0065],face);
 }
 if(c.tuft)for(const [x,y,rx,ry] of [[508,177,13,34],[541,183,11,23]]){ellipsoid('hair',[(x-c.cx)*scale,.134011021+(bottom-y)*scale,-.002],[rx*scale,ry*scale,.009],fur);}
 if(c.nose){const [x,y,rx,ry]=c.nose,p=at(x,y,.00025);ellipsoid('nose',p.toArray(),[rx*scale,ry*scale,.0013],face);}
 if(c.gorillaNose){const p=at(512,419,.002);ellipsoid('muzzle nose',p.toArray(),[.020,.012,.007],face);for(const x of [484,541]){const dx=(x-c.cx)*scale;ellipsoid('recessed nostril',[dx,p.y-.001,p.z+.007*Math.sqrt(1-(dx/.020)**2)-.00015],[.0032,.0027,.0005],mouth);}}
 if(c.catEars){for(const s of [-1,1]){
  const points=curve([[s*.035,.244],[s*.041,.266],[s*.061,.284],[s*.068,.282],[s*.075,.247]],8),shape=new T.Shape(points),g=new T.ExtrudeGeometry(shape,{depth:.010,bevelEnabled:true,bevelThickness:.004,bevelSize:.003,bevelSegments:5,steps:1,curveSegments:12});g.translate(0,-.014,.008);const p=g.attributes.position;
  // Smoothly coloured inside the solid ear; no overlaid paint plane.
  const earMat=mat('cat_ear_satin','#777E7A',.29);for(let i=0;i<p.count;i+=3)triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,i+k)),earMat);g.dispose();
 }}
 function stroke(points,m,r=.00065){const pts=points.map(([x,y])=>at(x,y,r*.15));const curve=new T.CatmullRomCurve3(pts),g=new T.TubeGeometry(curve,32,r,8,false),p=g.attributes.position;
  for(let i=0;i<g.index.count;i+=3)triangle(...[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,g.index.getX(i+k))),m);
  // Tube ends are submerged rounded caps, not high-poly separate beads.
  for(const point of [pts[0],pts.at(-1)])ellipsoid('rounded end',point.toArray(),[r,r,r],m);g.dispose();
 }
 if(c.mouth)stroke(c.mouth,mouth,.0007);
 if(c.whiskers)for(const s of [-1,1])for(const [dy,tilt] of [[-18,-10],[0,0],[18,10]])stroke([[512+s*177,580+dy],[512+s*209,580+dy+tilt]],face,.00036);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 // Average the outline derivative over a small reference-space neighbourhood.
 // This follows the smooth traced contour rather than each straight polygon
 // edge, without moving any vertices or altering the approved silhouette.
 for(let i=0;i<shellVertexCount;i++){
  const p=new T.Vector3().fromArray(positions,i*3),x=p.x/scale+c.cx,y=bottom-(p.y-.134011021)/scale,r=fraction(x,y),e=12;
  const rx=(fraction(x+e,y)-fraction(x-e,y))/(2*e),ry=(fraction(x,y+e)-fraction(x,y-e))/(2*e);
  const n=new T.Vector3(c.depth*r*rx/scale,-c.depth*r*ry/scale,Math.sqrt(Math.max(0,1-r*r))*(p.z<0?-1:1)).normalize();
  geometry.attributes.normal.setXYZ(i,n.x,n.y,n.z);
 }
 // Keep blush on the surface: no coplanar transparent cheek discs.
 for(let i=0;i<positions.length/3;i++){const p=new T.Vector3().fromArray(positions,i*3),t=p.z>0?tintAt(p):[1,1,1];colors.splice(i*3,3,...t);}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const sorted=[];for(let m=0;m<materials.length;m++){const start=sorted.length;for(let i=0;i<materialFaces.length;i++)if(materialFaces[i]===m)sorted.push(...indices.slice(i*3,i*3+3));if(sorted.length>start)geometry.addGroup(start,sorted.length-start,m);}
 geometry.setIndex(sorted);const head=new T.Mesh(geometry,materials);head.name='67Park_'+name+'_Authored_Head';
 head.userData={authoredFrom2DReference:true,donorHeadUsed:false,flushEyes:true,eyeRelief:0,previewOnly:false};
 const doc=new Document(),buffer=doc.createBuffer(),mesh=doc.createMesh(head.name);
 const attrs={};for(const [source,target] of [['position','POSITION'],['normal','NORMAL'],['color','COLOR_0']])attrs[target]=doc.createAccessor(target).setType('VEC3').setArray(geometry.attributes[source].array).setBuffer(buffer);
 for(const g of geometry.groups){const m=materials[g.materialIndex],material=doc.createMaterial(m.name).setBaseColorFactor([...m.color.toArray(),1]).setRoughnessFactor(m.roughness).setMetallicFactor(0);
  const prim=doc.createPrimitive().setMaterial(material).setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(sorted.slice(g.start,g.start+g.count))).setBuffer(buffer));
  for(const [name,a] of Object.entries(attrs))prim.setAttribute(name,a);mesh.addPrimitive(prim);
 }
 doc.createScene().addChild(doc.createNode(head.name).setMesh(mesh).setExtras(head.userData));
 // All colour primitives use one quantization grid so compression cannot
 // separate a shared face/eye/hood boundary into hairline cracks.
 await doc.transform(draco({method:'edgebreaker',quantizePosition:16,quantizeNormal:12,quantizeColor:12,quantizationVolume:'scene'}));
 const bytes=await io.writeBinary(doc);fs.writeFileSync(path.join(out,name+'-head.glb'),bytes);
 const reference=fs.readFileSync(c.ref);const report={name,reference:c.ref,referenceSha256:crypto.createHash('sha256').update(reference).digest('hex'),bytes:bytes.length,triangles:sorted.length/3,materials:materials.length,textures:0,donorHeadUsed:false,eyeRelief:0,bodyColor:c.fur,roughness:.28,previewOnly:false,referenceLandmarks:{headTop:Math.min(...c.shell.map(p=>p[1])),faceTop:c.mask?Math.min(...c.mask.map(p=>p[1])):null,eyes:c.eyes},bounds:new T.Box3().setFromObject(head).getSize(new T.Vector3()).toArray()};
 report.refinement=refined.stats;report.openShellEdges=openShellEdges;report.sharedCompressionGrid=true;
 assert(bytes.length<180000,name+' head exceeds the compact download budget');
 const decoded=await io.readBinary(bytes);for(const mesh of decoded.getRoot().listMeshes())for(const p of mesh.listPrimitives())for(const semantic of ['POSITION','NORMAL'])assert([...p.getAttribute(semantic).getArray()].every(Number.isFinite));
 reports.push(report);console.log('AUTHORED_HEAD',JSON.stringify(report));
}
fs.writeFileSync(path.join(out,'build-report.json'),JSON.stringify(reports,null,2)+'\n');
