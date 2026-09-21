import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {prepareSeasideAsset89} from '../island/seaside-scale-v89.js';
import {createRideAsset84} from '../island/lunapark-rides-v84.js';
import {createRideContacts,installRideContacts} from '../island/ride-contacts.js';
import {resolveCharacterContact,sweepRideContact} from '../app/character-contact.js';

const base=9.212547645568847,foot=.555;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
async function load(asset){const b=await fs.readFile(new URL('../island/lunapark-v1/'+asset+'.glb',import.meta.url));return prepareSeasideAsset89((await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,asset);}
const group=new T.Group();group.name='SEASIDE_LUNAPARK_V77';
const coaster=await load('coaster'),transform=new T.Matrix4().makeTranslation(181,base,-103.5);
coaster.traverse(o=>{if(!o.isMesh)return;const m=new T.Mesh(o.geometry,o.material);m.name='LUNA77_coaster';m.userData.sourceName=o.name;new T.Matrix4().multiplyMatrices(transform,o.matrixWorld).decompose(m.position,m.quaternion,m.scale);group.add(m);});
const ferris=createRideAsset84(await load('ferris'),{asset:'ferris',transform:new T.Matrix4().makeTranslation(173,base,-173.7),material:m=>m});group.add(ferris.group);group.updateMatrixWorld(true);
const lunapark={group,rides:[ferris]},contacts=createRideContacts(lunapark);
const movement=await fs.readFile(new URL('../app/chunk-OZ77422N.js',import.meta.url),'utf8');
const start=movement.indexOf('var ke=Object.freeze'),end=movement.indexOf('f();function nt(',start);
const walk=Function(movement.slice(start,end)+';return tt;')();
const close=(a,b,t=.002)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);

test('real coaster preserves the visible open bay, columns and layered upper deck',()=>{
 const floor=base+.25,x=187.5,z=-107;
 const s=contacts.sample(x,z);assert(s.surfaces.some(h=>h.y>floor+2.5),JSON.stringify(s));
 close(contacts.ground(x,z,floor,.36,base),floor);
 close(contacts.obstacle(x,z,floor,.36,base),floor);
 const top=s.surfaces.filter(h=>h.y>floor+2).at(-1).y;
 close(contacts.ground(x,z,top+.1,.012,base),top);
 const column=contacts.sample(185.947069,-106.092569);
 assert(column.intervals.some(s=>s.min<floor+.01&&s.max>floor+2),JSON.stringify(column));
 assert(contacts.obstacle(185.947069,-106.092569,floor,.36,base)>floor+2);
});

test('production walk and skate sweeps cross the under-track route but stop at the real column',()=>{
 const floor=base+.25;
 for(const [name,sweep]of [['walk',walk],['skate',sweepRideContact]]){
  let p={x:187.5,y:floor+foot,z:-112};
  for(let i=0;i<80;i++){
   const feet=p.y-foot;
   const result=resolveCharacterContact(sweep,{from:p,to:{...p,z:p.z+.1},velocity:{x:0,y:0,z:6},wasGrounded:true,
    ground:(x,z)=>contacts.obstacle(x,z,feet,.36,base),supportGround:(x,z)=>contacts.ground(x,z,feet,.36,base)});
   assert(!result.blocked,name+' blocked '+JSON.stringify(result));p=result.position;
  }
  assert(p.z>-104.1);
  p={x:185.947069,y:floor+foot,z:-109.5};let stopped=false;
  for(let i=0;i<40;i++){
   const result=resolveCharacterContact(sweep,{from:p,to:{...p,z:p.z+.1},velocity:{x:0,y:0,z:6},wasGrounded:true,
    ground:(x,z)=>contacts.obstacle(x,z,floor,.36,base),supportGround:(x,z)=>contacts.ground(x,z,floor,.36,base)});
   p=result.position;if(result.blocked){stopped=true;break;}
  }
  assert(stopped,name+' entered the column');assert(p.z<-106.7,JSON.stringify(p));
 }
});

test('all fourteen authored coaster columns keep solid centers',()=>{
 const columns=group.children.filter(m=>m.userData.sourceName?.startsWith('rounded_elevated_support'));
 assert.equal(columns.length,14);
 for(const mesh of columns){
  const box=new T.Box3().setFromObject(mesh),p=box.getCenter(new T.Vector3());
  const sampled=contacts.sample(p.x,p.z);
  assert(sampled.intervals.some(s=>s.min<=box.min.y+.002&&s.max>=box.max.y-.002),mesh.userData.sourceName+' lost its solid shell');
  assert(contacts.obstacle(p.x,p.z,base+.25,.36,base)>=box.max.y-.002,mesh.userData.sourceName+' allowed body entry');
 }
});

test('every authored upper skating route segment retains its rendered deck support',()=>{
 let route;coaster.traverse(o=>{if(o.userData.skateRoute)route=o.userData.skateRoute.map(p=>new T.Vector3(...p).applyMatrix4(o.matrixWorld).applyMatrix4(transform));});
 assert(route?.length>60);
 const meshes=group.children.filter(m=>m.userData.sourceName==='continuous_track_deck'),ray=new T.Raycaster();
 for(let n=0;n<route.length-1;n++){
  // Segment centers are inside the ribbon, not exactly on its float-quantized end edge.
  const p=route[n].clone().lerp(route[n+1],.5);
  ray.set(new T.Vector3(p.x,80,p.z),new T.Vector3(0,-1,0));const rendered=ray.intersectObjects(meshes,false)[0];assert(rendered);
  const hit=contacts.support(p.x,p.z,rendered.point.y+.03,.012);
  assert(hit&&Math.abs(hit.y-rendered.point.y)<.0001,JSON.stringify({route:p.toArray(),rendered:rendered.point.y,hit}));
 }
});

test('all twelve real cabin floors match the moving render matrices at several wheel angles',()=>{
 for(const angle of [0,.23,1.4,3.7]){
  ferris.setNetworkAngle(angle);
  for(let i=0;i<12;i++){
   const seat=ferris.seat(i*4),x=seat.position.x+1.53,z=seat.position.z+.975;
   const hit=contacts.support(x,z,seat.floor+.05,.012);
   assert(hit&&hit.cabin===i,JSON.stringify({angle,i,seat,hit}));close(hit.y,seat.floor);
   const from={x,y:seat.floor+.15+foot,z},result=resolveCharacterContact(walk,{from,to:{...from,y:seat.floor-.08+foot},velocity:{x:0,y:-2,z:0},wasGrounded:false,
    ground:(x,z)=>contacts.obstacle(x,z,seat.floor+.15,.012,base),supportGround:(x,z)=>contacts.ground(x,z,seat.floor+.15,.012,base)});
   assert(result.grounded);close(result.position.y,seat.floor+foot);
  }
 }
});

test('moving floor is not a ghost wall below a high cabin and does not permit entry through its solid floor',()=>{
 ferris.setNetworkAngle(0);const seat=ferris.seat(0),x=seat.position.x+1.53,z=seat.position.z+.975;
 close(contacts.obstacle(x,z,base,.36,base),base);
 assert(contacts.obstacle(x,z,seat.floor-.9,.012,base)>=seat.floor-.002,'body cannot penetrate the floor from its side: '+JSON.stringify({seat,hit:contacts.sample(x,z)}));
 const old=contacts.support(x,z,seat.floor+.05,.012);assert.equal(old.cabin,0);
 ferris.setNetworkAngle(.4);const next=contacts.support(x,z,seat.floor+.05,.012);
 assert(!next||Math.abs(next.y-seat.floor)>.1,'old-angle cabin floor cannot linger');
});

test('unmounted standing avatar follows the cabin; jumping and stale transforms release it',()=>{
 ferris.setNetworkAngle(0);const seat=ferris.seat(0);
 let p={x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975},v={x:0,y:0,z:0};
 const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
 contacts.prepareBody(body);const before={...p};ferris.setNetworkAngle(.01);contacts.prepareBody(body);
 const moved=ferris.seat(0);close(p.y,moved.floor+foot);close(p.x,moved.position.x+1.53);
 assert(Math.abs(p.y-before.y)>.1);
 v.y=4;const jumping={...p};ferris.setNetworkAngle(.02);contacts.prepareBody(body,{jumpQueued:true});
 close(p.x,jumping.x);close(p.y,jumping.y);
 contacts.prepareBody(body,{skip:true});v.y=0;
 ferris.setNetworkAngle(0);p={x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975};contacts.prepareBody(body);
 const stale={...p};ferris.setNetworkAngle(Math.PI/2);contacts.prepareBody(body);
 assert.deepEqual(p,stale,'a discontinuous wheel-clock jump must not transport the avatar');
});

test('outside ride bounds and replacement home floors retain their original queries',()=>{
 const scene=new T.Scene();scene.add(group);const original=()=>42;
 const world={scene,lunapark,ground:original,rideGround:()=>base,renderer:{domElement:{dataset:{}}}};
 world.characterGround=()=>world.ground();world.characterObstacle=()=>world.ground()+1;
 installRideContacts(world);assert.equal(world.characterGround(0,0,0),42);assert.equal(world.characterObstacle(0,0,0),43);
 // The captured callbacks in the real roof installer read world.ground.
 world.ground=()=>70;assert.equal(world.characterGround(500,500,70),70);assert.equal(world.characterObstacle(500,500,70),71);
 assert.equal(world.rideContacts.stats.addedDrawCalls,0);assert.equal(world.rideContacts.stats.newAssetDownloads,0);
 assert(world.rideContacts.stats.estimatedNumericBytes<6000000,JSON.stringify(world.rideContacts.stats));
 world.dispose();assert(world.rideContacts.stats.disposed);
});

test('jumping underneath the real track stops at the underside without becoming its upper floor',()=>{
 const floor=base+.25;
 let p={x:187.5,y:floor+foot,z:-107},v={x:0,y:0,z:0};
 const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
 contacts.prepareBody(body);
 const slab=contacts.sample(p.x,p.z).intervals.find(s=>s.min>floor+1.45);assert(slab);
 p.y=slab.min+.2;v.y=6;contacts.prepareBody(body);
 const underside=Math.min(...[[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]].flatMap(([dx,dz])=>contacts.sample(p.x+dx,p.z+dz).intervals.filter(s=>s.min>floor+1.45).map(s=>s.min)));
 close(p.y-foot+1.45,underside-.012);assert.equal(v.y,0);
 assert(contacts.ground(p.x,p.z,p.y-foot,.012,base)<slab.min);
});

test('ground decorators forward ride filtering and entry maps preserve one movement module',async()=>{
 const source=await fs.readFile(new URL('../app/party/park-social-toys.js',import.meta.url),'utf8');
 assert(source.includes('originalGround(x,z,ignoreCar,ignoreRideContacts)'));
 assert(source.includes('floor(x,z,ignoreCar,ignoreRideContacts)'));
 for(const file of ['island/runtime.js','island/runtime.bundle.js']){
  const code=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
  assert(code.includes("./ride-contacts.js?v=ride-contacts-1"));assert(code.includes('rideGround:'));
 }
 for(const file of ['index.html','play/index.html','explore/index.html']){
  const html=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
  const map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for(const path of ['/67park-foundation-next/app/chunk-OZ77422N.js','/67park-foundation-next/app/party/park-social-toys.js'])assert.equal(map[path],path+'?v=ride-contacts-1');
 }
});
