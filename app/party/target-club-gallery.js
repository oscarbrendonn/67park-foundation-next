import * as T from 'three';
import {targetPositions} from './target-club-rules.js?v=target-club-1';

// Authored, lightweight geometry. Screen-space projection matches the shared
// scoring rules exactly; the depth is real, not a downloaded background image.
export function createTargetGallery(canvas){
 const scene=new T.Scene();scene.background=new T.Color('#172f36');
 const camera=new T.OrthographicCamera(-450,450,300,-300,1,2200);camera.position.set(450,300,1200);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 // Small mobile canvases do not need another shadow-map pass. Authored contact
 // shadows keep edges clean, instead of low-resolution jagged cabinet shadows.
 renderer.shadowMap.enabled=false;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const material=(color,roughness=.4,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;};
 const teal=material('#407e79'),dark=material('#153f46',.65),cream=material('#f9e8c6'),gold=material('#d5a54c',.3,.65),wood=material('#995730',.35),rose=material('#bc6372'),steel=material('#56747b',.24,.75),black=material('#233c41',.4,.5);
 const light=new T.DirectionalLight('#fff0d0',3.4);light.position.set(180,860,650);
 light.shadow.mapSize.set(512,512);Object.assign(light.shadow.camera,{left:-650,right:650,top:650,bottom:-650,near:1,far:2000});light.target.position.set(450,300,0);light.shadow.bias=-.001;scene.add(light,light.target,new T.HemisphereLight('#deefff','#82614d',2.3));
 function mesh(g,m,x,y,z,parent=scene){geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function shape(points,depth,bevel=3){const s=new T.Shape();points(s);return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:12}).translate(0,0,-depth/2);}
 function box(w,h,d,m,x,y,z,parent=scene,r=4){
  r=Math.min(r,w/3,h/3);return mesh(shape(s=>{s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);},d,Math.min(2,d/4)),m,x,y,z,parent);
 }
 function sphere(r,m,x,y,z,parent=scene){return mesh(new T.SphereGeometry(r,16,10),m,x,y,z,parent);}
 function cylinder(r,len,m,x,y,z,parent=scene){return mesh(new T.CylinderGeometry(r,r,len,24),m,x,y,z,parent);}
 function disc(r,m,x,y,z,parent){const o=cylinder(r,4,m,x,y,z,parent);o.rotation.x=Math.PI/2;return o;}
 function textLabel(text,w,h,x,y,z,size=44){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f6e1b1';ctx.font=`800 ${size}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,64);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);const mat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.add(mat);const label=mesh(new T.PlaneGeometry(w,h),mat,x,y,z);label.castShadow=false;}
 // Recessed cabinet, stepped mouldings and lacquered counter.
 box(900,600,30,dark,450,300,-95);
 for(let i=0;i<13;i++)box(59,400,8,i%2?teal:dark,90+i*60,295,-71,scene,1);
 box(850,460,14,wood,450,290,-84);
 box(804,418,8,dark,450,289,-68);
 for(let x=55;x<860;x+=790){box(45,530,80,teal,x,300,-13);box(9,510,12,gold,x-16,300,32);box(52,25,88,gold,x,44,0);box(52,25,88,gold,x,550,0);}
 box(900,70,85,teal,450,566,12);box(832,47,10,dark,450,566,60);box(870,8,96,gold,450,530,20);
 textLabel('THE FAIRGROUND',630,65,450,566,68,55);
 for(let i=0;i<12;i++)box(65,30,35,i%2?cream:rose,93+i*65,510,18,scene,10);
 const bulbMat=material('#ffe7ad',.25);bulbMat.emissive=new T.Color('#ffcb65');bulbMat.emissiveIntensity=.7;
 const bulbGeo=new T.SphereGeometry(5,12,8);geometries.add(bulbGeo);
 const bulbs=new T.InstancedMesh(bulbGeo,bulbMat,32),matrix=new T.Matrix4();let bi=0;
 for(let x=95;x<=810;x+=55)bulbs.setMatrixAt(bi++,matrix.makeTranslation(x,488,45));
 for(let i=0;i<9;i++){bulbs.setMatrixAt(bi++,matrix.makeTranslation(55,92+i*43,45));bulbs.setMatrixAt(bi++,matrix.makeTranslation(845,92+i*43,45));}scene.add(bulbs);
 for(const y of [314,156]){box(790,22,105,wood,450,y,-5);box(790,9,112,gold,450,y+10,3);box(770,7,5,black,450,y-3,53);}
 box(940,74,180,wood,450,32,110,scene,10);box(940,15,200,gold,450,72,120,scene,6);box(880,39,10,teal,450,27,209);
 textLabel('67 PARK  •  SHOOTING GALLERY',440,41,292,28,219,34);
 // Six enamel duck targets, with a precisely matching 50px scoring disk.
 const ducks=[];
 const shadow=new T.MeshBasicMaterial({color:'#092d35',transparent:true,opacity:.3,depthWrite:false});materials.add(shadow);
 for(let i=0;i<6;i++){
  const pivot=new T.Group(),duck=new T.Group();scene.add(pivot);pivot.add(duck);duck.position.y=60;
  const enamel=material(i%2?'#d27d86':'#e4b753',.3,.1);
  mesh(new T.CircleGeometry(55,40),shadow,6,-7,-13,duck);
  mesh(shape(s=>{s.moveTo(-49,-37);s.bezierCurveTo(-67,-17,-62,9,-65,18);s.quadraticCurveTo(-46,7,-38,15);s.bezierCurveTo(-22,27,-11,34,-10,51);s.bezierCurveTo(-12,87,40,85,42,54);s.lineTo(62,45);s.lineTo(41,36);s.bezierCurveTo(42,18,64,-5,48,-30);s.bezierCurveTo(35,-55,-28,-57,-49,-37);},12,3),enamel,0,0,0,duck);
  mesh(shape(s=>{s.moveTo(41,52);s.lineTo(64,45);s.lineTo(41,40);s.closePath();},13,1),gold,0,0,2,duck);
  sphere(4,black,24,57,10,duck);sphere(1.1,cream,23,58,14,duck);
  disc(50,gold,0,0,11,duck);disc(46,cream,0,0,14,duck);disc(34,enamel,0,0,17,duck);disc(23,cream,0,0,20,duck);disc(18,rose,0,0,23,duck);disc(7,gold,0,0,26,duck);
  cylinder(4,28,steel,0,-53,-2,duck);const axle=cylinder(6,42,gold,0,0,0,pivot);axle.rotation.z=Math.PI/2;
  ducks.push({pivot,duck});
 }
 // Recognisable fairground air-rifle silhouette: sculpted walnut stock,
 // polished receiver, two barrel bands, sight, trigger guard and safety muzzle.
 const gun=new T.Group();scene.add(gun);gun.position.set(760,68,290);gun.scale.setScalar(.9);gun.rotation.set(.18,-.48,.8);
 mesh(shape(s=>{s.moveTo(-28,-90);s.quadraticCurveTo(-39,-87,-36,-69);s.lineTo(-21,15);s.quadraticCurveTo(-17,37,-4,43);s.lineTo(4,96);s.quadraticCurveTo(8,106,19,98);s.lineTo(21,12);s.lineTo(7,-10);s.lineTo(25,-75);s.quadraticCurveTo(29,-88,14,-91);s.closePath();},24,5),wood,0,0,0,gun);
 box(49,11,32,black,-4,-84,0,gun);box(20,71,28,teal,8,77,3,gun,9);
 const barrel=cylinder(6,132,steel,10,165,9,gun);barrel.castShadow=false;
 cylinder(8,10,gold,10,116,9,gun);cylinder(8,10,gold,10,208,9,gun);cylinder(8,14,rose,10,235,9,gun);
 box(3,10,4,gold,10,230,17,gun,1);box(8,12,5,black,10,105,18,gun,1);
 const guard=mesh(new T.TorusGeometry(15,3,8,24,Math.PI*1.65),gold,14,15,17,gun);guard.scale.set(.7,1,1);guard.rotation.z=.35;
 box(4,16,4,steel,9,22,18,gun,2);sphere(4,gold,-7,57,18,gun);
 // Canvas overlay is strictly non-interactive: pointer coordinates use WebGL canvas.
 const hud=document.createElement('canvas');hud.width=900;hud.height=600;hud.className='tc-gallery-hud';hud.setAttribute('aria-hidden','true');canvas.after(hud);const ctx=hud.getContext('2d');
 let width=0,height=0;
 return {render(round,aim,flash,paused,reduced,ranked){
  const bounds=canvas.getBoundingClientRect(),w=Math.round(bounds.width),h=Math.round(bounds.height);
  if(w!==width||h!==height){width=w;height=h;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(w,h,false);}
  for(const t of targetPositions(round,ranked?false:reduced)){
   const {pivot,duck}=ducks[t.id];pivot.position.set(t.x,600-t.y-60,12);
   const age=round.time-(round.down[t.id]-.9);duck.visible=t.up||(!reduced&&age<.18);
   pivot.rotation.x=t.up?0:-(Math.PI/2)*Math.min(1,age/.18);
  }
  const age=flash?round.time-flash.at:99,recoil=reduced?0:Math.max(0,1-age/.16);
  gun.position.x=760+(aim.x-450)*.025;gun.position.y=68-recoil*9;gun.rotation.z=.8+(aim.x-450)*.0001;
  renderer.render(scene,camera);ctx.clearRect(0,0,900,600);
  if(flash&&age<.24){ctx.globalAlpha=1-age/.24;ctx.fillStyle=flash.points?'#fff3b5':'#eee0c8';ctx.font='800 29px system-ui';ctx.textAlign='center';if(flash.points)ctx.fillText('+'+flash.points,flash.x,flash.y-60);ctx.globalAlpha=1;}
  if(round.phase==='playing'&&!paused){ctx.strokeStyle='#fffbe8';ctx.lineWidth=2;ctx.shadowColor='#19333c';ctx.shadowBlur=3;ctx.beginPath();ctx.arc(aim.x,aim.y,11,0,Math.PI*2);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){ctx.moveTo(aim.x+dx*16,aim.y+dy*16);ctx.lineTo(aim.x+dx*23,aim.y+dy*23);}ctx.stroke();ctx.shadowBlur=0;}
 },get info(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};},dispose(){hud.remove();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();light.shadow.dispose();renderer.dispose();scene.clear();}};
}
