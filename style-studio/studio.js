import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {configureStudioLighting} from '../app/studio-lighting.js?v=1';

const ASSETS='https://oscarbrendonn.github.io/67park-foundation-next/models/';
const STORAGE='67park.style-studio.v1';
const icons={shoes:'M3 16v-6l5 1 3 4 8 2c2 0 3 2 2 4H3v-5Zm0 2h17M9 13l-2 2m5 0-2 2',back:'M12 20c-1-5-9-5-9-12 5 0 8 2 9 7 1-5 4-7 9-7 0 7-8 7-9 12Zm0-5v6M5 11l4 3m10-3-4 3',top:'m8 4-5 3 3 5 2-1v10h8V11l2 1 3-5-5-3c0 5-8 5-8 0Z',hat:'M4 14c0-5 2-9 7-9s7 4 7 9M3 14h17l2 3H3Zm8-9v8',glasses:'M2 10h2m16 0h2M10 10h4M4 7h6v7H4Zm10 0h6v7h-6Z'};
const categories=[
 {id:'shoes',label:'Shoes',color:'#c9e4fb',items:[{id:'bare',name:'Original feet'},{id:'duo',name:'Mix & Match',donor:3333,vertices:910},{id:'cloud',name:'Cloud Boots',donor:1,vertices:659},{id:'pastel',name:'Candy Steps',donor:2,vertices:4176}]},
 {id:'back',label:'Back',color:'#e1d5fa',items:[{id:'none',name:'No back item'},{id:'wings',name:'Rainbow Wings',donor:2,vertices:4152},{id:'pack',name:'Little Backpack',donor:3333,vertices:1258}]},
 {id:'top',label:'Outfit',color:'#ffe4a6',items:[{id:'original',name:'Original gorilla'},{id:'rainbow',name:'Rainbow Sweater',donor:2,vertices:2800,clothes:true}]},
 {id:'hat',label:'Headwear',color:'#ffd7e3',items:[{id:'none',name:'No headwear'},{id:'cap',name:'Playtime Cap',donor:8,vertices:20897,range:[[11422,17538]],rigid:'hat'},{id:'crown',name:'Little Crown',donor:2,vertices:3043,rigid:'hat'}]},
 {id:'glasses',label:'Eyewear',color:'#d5ecc4',items:[{id:'none',name:'No eyewear'},{id:'green',name:'Green Round Frames',donor:26,vertices:4994,range:[[0,2264],[2796,4180]],rigid:'glasses'}]}
];
const starter={shoes:'duo',back:'wings',top:'rainbow',hat:'none',glasses:'none'};
let selection={...starter};try{const saved=JSON.parse(localStorage.getItem(STORAGE));for(const c of categories)if(c.items.some(i=>i.id===saved?.[c.id]))selection[c.id]=saved[c.id]}catch{}
let rig,renderer,mixer,scene,camera,angle=.12,walking=false,ready=false,frames=0;
const equipment=new Map(),donors=new Map(),prepared=new Map();
const canon=n=>n.replace(/_\d+$/,'');
const boneMap=root=>{const map=new Map();root.traverse(o=>{if(o.isBone&&!map.has(canon(o.name)))map.set(canon(o.name),o)});return map};
const meshWith=(root,count)=>{let found;root.traverse(o=>{if(o.isSkinnedMesh&&o.geometry.attributes.position.count===count&&!found)found=o});if(!found)throw Error('Item geometry unavailable: '+count);return found};
const status=document.querySelector('#loading'),viewport=document.querySelector('#viewport');
let timer;function announce(text){clearTimeout(timer);document.querySelector('#announcement').textContent=text;timer=setTimeout(()=>document.querySelector('#announcement').textContent='',3200)}
for(const c of categories){const el=document.createElement('div');el.className='slot';el.innerHTML=`<span class="slot-icon" style="background:${c.color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[c.id]}"></path></svg></span><div class="slot-info"><div class="slot-label">${c.label}</div><div class="item-name" id="name-${c.id}"></div><div class="count" id="count-${c.id}"></div></div><div class="arrows"><button disabled aria-label="Previous ${c.label.toLowerCase()}" data-step="-1">‹</button><button disabled aria-label="Next ${c.label.toLowerCase()}" data-step="1">›</button></div>`;el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const current=c.items.findIndex(i=>i.id===selection[c.id]);choose(c.id,c.items[(current+Number(b.dataset.step)+c.items.length)%c.items.length].id)}));document.querySelector('#slots').append(el)}
function updateLabels(){for(const c of categories){const i=c.items.findIndex(i=>i.id===selection[c.id]);document.querySelector('#name-'+c.id).textContent=c.items[i].name;document.querySelector('#count-'+c.id).textContent=(i+1)+' / '+c.items.length}}
updateLabels();
function filteredGeometry(src,item){const geometry=src.geometry.clone(),idx=geometry.index,a=geometry.attributes,keep=[];const allowed=i=>!item.range||item.range.some(([start,end])=>i>=start&&i<end);const hand=i=>{for(let n=0;n<4;n++)if(/^Hand[LR]$/.test(canon(src.skeleton.bones[a.skinIndex.getComponent(i,n)].name))&&a.skinWeight.getComponent(i,n)>.95)return true;return false};let removed=0;for(let i=0;i<idx.count;i+=3){const tri=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];if(!tri.every(allowed))continue;if(item.clothes){const hands=tri.filter(hand).length;if(hands&&hands!==3)throw Error('Clothing wrist is not detached');if(hands===3){removed++;continue}}keep.push(...tri)}if(item.clothes&&removed!==1120)throw Error('Clothing hand validation failed');geometry.setIndex(keep);geometry.userData.removedHandTriangles=removed;return geometry}
function buildItem(item){const donor=donors.get(item.donor),src=meshWith(donor.scene,item.vertices),geometry=filteredGeometry(src,item);let mesh;
 if(item.rigid){
  // Bake ONLY the original accessory triangles. Neither donor head nor hands
  // are copied. Fit the rigid accessory to the gorilla's own head bone.
  const a=geometry.attributes.position,used=new Set(Array.from(geometry.index.array));src.skeleton.update();
  const box=new T.Box3(),v=new T.Vector3();for(const i of used){src.getVertexPosition(i,v).applyMatrix4(src.matrixWorld);a.setXYZ(i,v.x,v.y,v.z);box.expandByPoint(v)}
  const head=rig.getObjectByName('GORIL_KAFA'),headBox=new T.Box3().setFromObject(head,true),headSize=headBox.getSize(new T.Vector3()),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const factor=item.rigid==='hat'?headSize.x*(item.id==='cap'?.57:.4)/size.x:headSize.x*.86/size.x;
  // Small, seated cap like the donor: sink the open rim into the curved crown,
  // not the propeller's bounding-box centre. Keep the original head untouched.
  const target=new T.Vector3((headBox.min.x+headBox.max.x)/2,item.rigid==='hat'?headBox.max.y-size.y*factor*(item.id==='cap'?.39:.22):headBox.min.y+headSize.y*.46,item.rigid==='hat'?(headBox.min.z+headBox.max.z)/2:headBox.max.z+.009);
  const bone=boneMap(rig).get('Head');const inverse=new T.Matrix4().copy(bone.matrixWorld).invert();
  for(const i of used){v.fromBufferAttribute(a,i);v.x=(v.x-center.x)*factor+target.x;v.y=(v.y-(item.rigid==='hat'?box.min.y:center.y))*factor+target.y;v.z=(v.z-(item.rigid==='hat'?center.z:box.max.z))*factor+target.z;v.applyMatrix4(inverse);a.setXYZ(i,v.x,v.y,v.z)}
  // Unused source vertices do not contribute to bounds, lighting or exports.
  for(let i=0;i<a.count;i++)if(!used.has(i))a.setXYZ(i,0,0,0);
  geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();geometry.computeBoundingSphere();mesh=new T.Mesh(geometry,src.material);bone.add(mesh);
 }else{
  const map=boneMap(rig),mapped=src.skeleton.bones.map(b=>{const match=map.get(canon(b.name));if(!match)throw Error('Missing attachment bone');return match});mesh=new T.SkinnedMesh(geometry,src.material);new T.Matrix4().copy(donor.scene.matrixWorld).invert().multiply(src.matrixWorld).decompose(mesh.position,mesh.quaternion,mesh.scale);rig.add(mesh);rig.updateMatrixWorld(true);mesh.bind(new T.Skeleton(mapped,src.skeleton.boneInverses.map(m=>m.clone())),mesh.matrixWorld.clone());
 }
 mesh.name='Studio_'+item.id;mesh.visible=false;mesh.frustumCulled=false;mesh.castShadow=true;mesh.userData.studioItem=true;return mesh;
}
function choose(category,id){if(!ready)return;const c=categories.find(c=>c.id===category),item=c.items.find(i=>i.id===id);if(!item)return;equipment.get(category)&&(equipment.get(category).visible=false);const mesh=prepared.get(category+':'+id);if(mesh)mesh.visible=true;equipment.set(category,mesh);selection[category]=id;if(category==='top')rig.getObjectByName('FS_Body').visible=id==='original';updateLabels();}
async function init(){
 // Match the approved empty fit-lab: warm blank backdrop, plain floor and
 // direct soft studio lighting. No podium, reflective room or colour wash.
 scene=new T.Scene();camera=new T.PerspectiveCamera(35,1,.01,100);renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));configureStudioLighting(renderer,scene,T);viewport.append(renderer.domElement);
 // A continuous CSS studio sweep replaces the finite lit plane. This removes
 // the hard horizon and colour seam without changing any character lighting.
 const loader=new GLTFLoader();const load=async name=>{const g=await loader.loadAsync(ASSETS+name);g.scene.updateMatrixWorld(true);return g};const ids=[2,3333,1,8,26];const loaded=await Promise.all([load('goril-motion-v3.glb'),...ids.map(id=>load('friends/friendsie_'+id+'.glb'))]);const original=loaded[0];ids.forEach((id,i)=>donors.set(id,loaded[i+1]));rig=clone(original.scene);scene.add(rig);rig.traverse(o=>{if(/^(TAC|CICEK)$/.test(o.name))o.visible=false;if(o.isMesh){o.castShadow=true;o.frustumCulled=false}});rig.updateMatrixWorld(true);
 for(const c of categories)for(const item of c.items)if(item.donor)prepared.set(c.id+':'+item.id,buildItem(item));
 const bounds=new T.Box3().setFromObject(rig.getObjectByName('GORIL_KAFA'),true),bodyBox=new T.Box3().setFromObject(rig.getObjectByName('FS_Body'),true);bounds.union(bodyBox);const scale=1.5/(bounds.max.y-bounds.min.y);rig.scale.setScalar(scale);rig.position.y=-bounds.min.y*scale;rig.rotation.y=angle;rig.updateMatrixWorld(true);
 mixer=new T.AnimationMixer(rig);const idle=original.animations.find(c=>c.name==='idle'),walk=original.animations.find(c=>c.name==='walk');function play(){mixer.stopAllAction();const clip=walking?walk:idle;if(clip)mixer.clipAction(clip).reset().play()}play();
 const resize=()=>{const {width,height}=viewport.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.position.set(0,1.5,Math.max(6.7,2.75/camera.aspect));camera.lookAt(0,.75,0);camera.updateProjectionMatrix()};new ResizeObserver(resize).observe(viewport);resize();
 let pointer=null,lastX;renderer.domElement.addEventListener('pointerdown',e=>{if(pointer!==null||e.button!==0)return;pointer=e.pointerId;lastX=e.clientX;renderer.domElement.setPointerCapture(pointer)});renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;angle+=(e.clientX-lastX)*.009;lastX=e.clientX});const stop=()=>pointer=null;renderer.domElement.addEventListener('pointerup',stop);renderer.domElement.addEventListener('pointercancel',stop);renderer.domElement.addEventListener('lostpointercapture',stop);
 document.querySelector('#front').onclick=()=>angle=0;document.querySelector('#back').onclick=()=>angle=Math.PI;document.querySelector('#pose').onclick=()=>{walking=!walking;document.querySelector('#pose').setAttribute('aria-pressed',String(walking));play()};
 document.querySelector('#save').onclick=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(selection));announce('Look saved on this browser.')}catch{announce('Storage unavailable. Your preview is still here.')}};document.querySelector('#reset').onclick=()=>{for(const [k,v]of Object.entries(starter))choose(k,v);announce('Starter look restored. Save to keep it.')};
 ready=true;for(const [k,v]of Object.entries(selection))choose(k,v);document.querySelectorAll('#slots button,#save,#reset').forEach(b=>b.disabled=false);status.hidden=true;const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(document.hidden)return;mixer.update(dt);rig.rotation.y=angle;renderer.render(scene,camera);frames++});
 window.studio={get ready(){return ready},get frames(){return frames},get selection(){return {...selection}},rig,scene,renderer,camera,categories,prepared,choose,get walking(){return walking}};
}
init().catch(error=>{console.error(error);status.hidden=false;status.textContent='The studio could not load. Please refresh to try again.'});
