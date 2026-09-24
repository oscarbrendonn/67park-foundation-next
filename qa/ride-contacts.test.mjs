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
import {CHARACTER_CONTROL} from '../app/character-control-profile.js';
import {boundedSimulationStep} from '../app/simulation-step.js';
import {installFerrisJumpPhase} from './ferris-jump-phase.cjs';
import './ferris-phase-fixture.test.cjs';

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

test('exact hosted frames skip the old phase, while aligned setup preserves real clock deltas',t=>{
 // Recorded body centers, frames 1312 and 1313, run 35815685714. The unchanged
 // fixture body offset cancels the authored seat offset: circle center x=173.
 const recorded=[{t:814016,x:168.4872283935547},{t:815099,x:169.5078125}];
 const rate=2*Math.PI/ferris.stats.period,velocities=recorded.map(p=>(p.x-173)*rate);
 assert(velocities[0]<-.38&&velocities[1]>-.32,'the entire original band was skipped');
 const seats=Array.from({length:12},(_,n)=>ferris.seat(n*4));
 const cx=seats.reduce((n,s)=>n+s.position.x,0)/12,cy=seats.reduce((n,s)=>n+s.position.y,0)/12;
 const radius=Math.hypot(seats[0].position.x-cx,seats[0].position.y-cy);
 const bandMs=(Math.acos(-.38/(radius*rate))-Math.acos(-.32/(radius*rate)))/rate*1000;
 assert(bandMs<recorded[1].t-recorded[0].t);
 const sourceSetter=ferris.setNetworkAngle;
 let schedules=0;
 try{
  for(const initial of [0,1.2,3.8,6.26])for(const frameMs of [16,650,1027,1083,1247]){
   ferris.setNetworkAngle(initial);const fixture=installFerrisJumpPhase(ferris);
   let source=initial;
   for(let n=0;n<16;n++){source=(source+rate*frameMs/1000)%(2*Math.PI);ferris.setNetworkAngle(source);}
   const seat=ferris.seat(0),all=Array.from({length:12},(_,n)=>ferris.seat(n*4));
   const centerX=all.reduce((n,s)=>n+s.position.x,0)/12,centerY=all.reduce((n,s)=>n+s.position.y,0)/12;
   const fv=(seat.position.x-centerX)*rate,hv=-(seat.position.y-centerY)*rate;
   assert(fv>-.38&&fv<-.32&&hv>.9,'same strict arming predicate after all settling frames');
   fixture.release();assert.throws(()=>fixture.release(),/only release once/);
   for(const gap of [6,frameMs,1153,1068,2600]){
    const before=ferris.angle,step=rate*gap/1000;source=(source+step)%(2*Math.PI);
    ferris.setNetworkAngle(source);
    close(Math.atan2(Math.sin(ferris.angle-before),Math.cos(ferris.angle-before)),step,1e-10);
   }
   const stats=fixture.stats();assert.equal(stats.held,false);assert.equal(stats.movingWrites,5);
   assert(stats.maxDeltaError<1e-10&&stats.travel>0);
   fixture.restore();fixture.restore();assert.equal(ferris.setNetworkAngle,sourceSetter);close(ferris.angle,source,1e-10);
   schedules++;
  }
 }finally{ferris.setNetworkAngle=sourceSetter;ferris.setNetworkAngle(0);}
 t.diagnostic(JSON.stringify({recordedVelocities:velocities,recordedGapMs:1083,bandMs,schedules}));
});

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

test('real Ferris carry admits rate-proven long frames and rejects clock discontinuities',()=>{
 const rate=Math.PI*2/ferris.stats.period;
 assert(Number.isFinite(rate)&&rate>0,'Ferris must expose its network period');
 const make=()=>{
  let now=0,p={x:0,y:0,z:0},v={x:0,y:0,z:0};
  const timed=createRideContacts(lunapark,{now:()=>now});
  const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
  const place=angle=>{ferris.setNetworkAngle(angle);const seat=ferris.seat(0);p={x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975};v={x:0,y:0,z:0};timed.prepareBody(body);return seat;};
  const move=(seconds,angle)=>{now+=seconds*1e3;ferris.setNetworkAngle(angle);timed.prepareBody(body);return {p:{...p},seat:ferris.seat(0)};};
  return {place,move,dispose:()=>timed.dispose()};
 };
 const follows=seconds=>{
  const run=make();try{
   const start=run.place(0),after=run.move(seconds,rate*seconds);
   assert(Math.hypot(after.seat.position.x-start.position.x,after.seat.position.y-start.position.y)>2,'fixture must exceed the legacy 2m cutoff');
   close(after.p.x,after.seat.position.x+1.53);close(after.p.y,after.seat.floor+foot);
  }finally{run.dispose();}
 };
 follows(2.6);follows(4.5);

 {const run=make();try{
   const start=run.place(0),after=run.move(5.01,rate*5.01);
   close(after.p.x,start.position.x+1.53);close(after.p.y,start.floor+foot);
  }finally{run.dispose();}}

 for(const delta of [.1,-.1]){const run=make();try{
   const start=run.place(0),after=run.move(.016,delta);
   assert(Math.hypot(after.seat.position.x-start.position.x,after.seat.position.y-start.position.y)<2,'small clock discontinuity must fit below the legacy distance cutoff');
   close(after.p.x,start.position.x+1.53);close(after.p.y,start.floor+foot);
  }finally{run.dispose();}}

 {const run=make();try{
   run.place(0);
   // Local ride extrapolation is capped at 180ms, then a delayed packet
   // catches the trusted wheel up on the next 16ms frame. The elapsed-time
   // credit earned before that packet must admit its continuous catch-up.
   run.move(1.6,rate*.18);const after=run.move(.016,rate*1.616);
   close(after.p.x,after.seat.position.x+1.53);close(after.p.y,after.seat.floor+foot);
  }finally{run.dispose();}}
 ferris.setNetworkAngle(0);
});

test('only continuous verified Ferris support can synchronize a queued first jump',()=>{
 const rate=Math.PI*2/ferris.stats.period,delay=.8;
 let cabin=0,start;
 ferris.setNetworkAngle(0);
 for(let i=0;i<12;i++){
  const candidate=ferris.seat(i*4);ferris.setNetworkAngle(rate*delay);
  const after=ferris.seat(i*4);ferris.setNetworkAngle(0);
  if(after.floor<candidate.floor-.12){cabin=i;start={x:candidate.position.x+1.53,y:candidate.floor+foot,z:candidate.position.z+.975,floor:candidate.floor};break;}
 }
 assert(start,'fixture needs a continuously descending Ferris cabin');
 let nearGapDelay=0;
 for(let seconds=.01;seconds<=delay;seconds+=.01){
  ferris.setNetworkAngle(rate*seconds);const gap=start.floor-ferris.seat(cabin*4).floor;ferris.setNetworkAngle(0);
  if(gap>.08&&gap<.12){nearGapDelay=seconds;break;}
 }
 assert(nearGapDelay,'fixture needs a descending floor gap inside the current near probe');
 const make=()=>{
  let now=0,p={x:start.x,y:start.y,z:start.z},v={x:0,y:0,z:0};
  const timed=createRideContacts(lunapark,{now:()=>now});
  const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
  const begin=()=>{ferris.setNetworkAngle(0);timed.prepareBody(body);};
  const release=(seconds=delay,angle=rate*seconds)=>{now+=seconds*1e3;ferris.setNetworkAngle(angle);return timed.prepareBody(body,{jumpQueued:true});};
  return {timed,body,begin,release,get p(){return p;},set p(next){p=next;},set v(next){v=next;},dispose:()=>timed.dispose()};
 };
 try{
  {const run=make();try{
   run.begin();const carry=run.release();assert(carry&&Math.hypot(carry.x,carry.y,carry.z)>.12,'verified queued support synchronizes before launch');assert(ferris.seat(cabin*4).floor<start.floor-.12);
   close(run.p.y,ferris.seat(cabin*4).floor+foot,.00001);
   assert.equal(run.timed.consumeJumpGrounded(run.body,0),true);
   assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'token is single-use');
  }finally{run.dispose();}}
  {const run=make();try{
   run.begin();const carry=run.release(nearGapDelay);assert(carry,'near-gap queued launch still synchronizes verified support');const gap=start.floor-ferris.seat(cabin*4).floor;
   assert(gap>.08&&gap<.12,`expected current floor gap in near probe, got ${gap}`);
   assert.equal(run.timed.consumeJumpGrounded(run.body,0),true,'queued first jump retains prior contact while current floor remains near');
  }finally{run.dispose();}}
  {const run=make();try{run.begin();run.p={...run.p,x:run.p.x+.13};assert.equal(run.release(),null,'walk-off cannot receive queued transport');assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'walk-off cannot inherit support');}finally{run.dispose();}}
  {const run=make();try{run.begin();run.p={...run.p,x:run.p.x+9};assert.equal(run.release(),null,'teleport cannot receive queued transport');assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'teleport clears support');}finally{run.dispose();}}
  {const run=make();try{run.begin();assert.equal(run.release(5.01),null,'stale clock cannot receive queued transport');assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'stale clock cannot grant support');}finally{run.dispose();}}
  {const run=make();try{run.begin();assert.equal(run.release(.016,Math.PI/2),null,'discontinuous wheel angle cannot receive queued transport');assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'discontinuous wheel angle cannot grant support');}finally{run.dispose();}}
  {const run=make();try{run.begin();run.v={x:0,y:.3,z:0};assert.equal(run.release(),null,'upward body cannot receive queued transport');assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'upward body cannot grant support');}finally{run.dispose();}}
  {const run=make();try{
   run.p={x:start.x,y:start.y+2,z:start.z};run.v={x:0,y:0,z:0};ferris.setNetworkAngle(0);run.timed.prepareBody(run.body);
   run.release();assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'noncontact cannot grant support');
  }finally{run.dispose();}}
  {const run=make();
   run.begin();run.release();run.timed.dispose();
   assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'disposed contacts cannot grant a queued jump');
  }
  {const run=make();try{
   run.begin();const before={...run.p};ferris.setNetworkAngle(rate*delay);
   assert.equal(run.timed.prepareBody(run.body,{skip:true,jumpQueued:true}),undefined,'skipped body clears queued carry state');
   assert.deepEqual(run.p,before,'skipped body is never transported');assert.equal(run.timed.consumeJumpGrounded(run.body,0),false,'skipped body cannot grant support');
  }finally{run.dispose();}}
 }finally{ferris.setNetworkAngle(0);}
});

test('cabin transport advances the player sweep anchor instead of colliding with its moved floor',()=>{
 let now=0,p,v={x:0,y:0,z:0};
 const timed=createRideContacts(lunapark,{now:()=>now});
 const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
 try{
  ferris.setNetworkAngle(0);const seat=ferris.seat(8*4);
  p={x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975};
  timed.prepareBody(body);const previous={...p};
  now=2600;ferris.setNetworkAngle(Math.PI*2/ferris.stats.period*2.6);
  const carry=timed.prepareBody(body);
  assert(carry&&Math.hypot(carry.x,carry.y,carry.z)>2);
  const from={x:previous.x+carry.x,y:previous.y+carry.y,z:previous.z+carry.z},feet=p.y-foot;
  const result=resolveCharacterContact(walk,{from,to:p,velocity:v,wasGrounded:true,
   ground:(x,z)=>timed.obstacle(x,z,feet,.36,base),supportGround:(x,z)=>timed.ground(x,z,feet,.36,base)});
  assert(!result.blocked,JSON.stringify(result));assert(result.grounded);
  close(result.position.x,p.x);close(result.position.y,p.y);
  assert(movement.includes('if(rideCarry&&p)p={x:p.x+rideCarry.x,y:p.y+rideCarry.y,z:p.z+rideCarry.z}'),'shipped controller must translate its sweep anchor with the carrier');
  assert(movement.includes('consumeJumpGrounded?.(Ve,a)'),'shipped controller must consume the narrow Ferris jump token');
 }finally{timed.dispose();ferris.setNetworkAngle(0);}
});

test('outside ride bounds and replacement home floors retain their original queries',()=>{
 const scene=new T.Scene();scene.add(group);const original=()=>42;
 const world={scene,lunapark,ground:original,rideGround:()=>base,renderer:{domElement:{dataset:{}}}};
 world.characterGround=()=>world.ground();world.characterObstacle=()=>world.ground()+1;
 installRideContacts(world);assert.equal(world.characterGround(0,0,0),42);assert.equal(world.characterObstacle(0,0,0),43);
 // The captured callbacks in the real roof installer read world.ground.
 world.ground=()=>70;assert.equal(world.characterGround(500,500,70),70);assert.equal(world.characterObstacle(500,500,70),71);
 assert.equal(world.rideContacts.stats.addedDrawCalls,0);assert.equal(world.rideContacts.stats.newAssetDownloads,0);assert.equal(world.rideContacts.stats.groundedJumpVersion,1);assert.equal(world.rideContacts.stats.launchSyncVersion,1);
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
  assert(code.includes("./ride-contacts.js?v=ride-launch-sync-1"));assert(code.includes('rideGround:'));
 }
 for(const file of ['balloon/index.html','explore/index.html','index.html','lane-rush/index.html','play/index.html','race/index.html','rockets/index.html','skybound-soft/index.html','sports/index.html','style-studio/index.html']){
  const html=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
  const map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const movement='/67park-foundation-next/app/chunk-OZ77422N.js',social='/67park-foundation-next/app/party/park-social-toys.js';
  assert.equal(map[movement],movement+'?v=rail-corner-1');assert.equal(map[movement+'?v=online-next-1'],movement+'?v=rail-corner-1');
  assert.equal(map[social],social+'?v=ride-contacts-1');assert.equal(map[social+'?v=balloon-lift-2'],social+'?v=ride-contacts-1');
 }
});

test('CI 35653182246 launches from the current cabin floor then releases its carrier',()=>{
 let now=765888,p={x:168.67926025390625,y:11.956159591674805,z:-173.10000610351562},v={x:0,y:0,z:0};
 const timed=createRideContacts(lunapark,{now:()=>now});
 const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
 try{
  ferris.setNetworkAngle(4.328975050305563);timed.prepareBody(body);
  now=767041;ferris.setNetworkAngle(4.43139969745885);
  const carry=timed.prepareBody(body,{jumpQueued:true});
  assert(carry&&Math.hypot(carry.x,carry.y,carry.z)>1,'queued jump must first synchronize its proven grounded carrier');
  close(p.y,ferris.seat(0).floor+foot,.00001);
  assert.equal(timed.consumeJumpGrounded(body,0),true);
  assert.equal(timed.consumeJumpGrounded(body,0),false);
  const launch={...p};v.y=8;p.y+=.4;
  now=768109;ferris.setNetworkAngle(4.524582826222855);
  assert.equal(timed.prepareBody(body),null,'airborne rider must never be transported');
  close(p.x,launch.x,.00001);close(p.y,launch.y+.4,.00001);assert.equal(v.y,8);
  assert(p.y>launch.y+.12&&v.y>3,'unchanged free-flight displacement and speed bounds');
  // The fix must not disable a later genuine head strike on the same roof.
  const roof=timed.sample(p.x,p.z).intervals.filter(s=>s.cabin===0&&s.min>p.y-foot+1.45-.012);
  assert(roof.length);const cap=Math.min(...roof.map(s=>s.min))-1.45+foot-.012;
  p.y+=2;now+=16;timed.prepareBody(body);
  close(p.y,cap,.00001);assert.equal(v.y,0);
 }finally{timed.dispose();ferris.setNetworkAngle(0);}
});

test('CI 35647642059 synchronizes the historical queued launch, then retains its real airborne roof clamp',()=>{
 // Three distinct clocks from the retained hosted trace: trusted touch at
 // 432401ms, queued input consumption at 432889ms, next contact at 433464ms.
 // A dispatch-only headroom check missed the two later slow game frames.
 let now=432401,p={x:165.37924194335938,y:13.988451957702637,z:-173.10000610351562},v={x:0,y:0,z:0};
 const timed=createRideContacts(lunapark,{now:()=>now});
 const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
 try{
  ferris.setNetworkAngle(2.9446322474983537);timed.prepareBody(body);
  now=432889;ferris.setNetworkAngle(2.988684357818692);
  const carry=timed.prepareBody(body,{jumpQueued:true});
  assert(carry&&Math.hypot(carry.x,carry.y,carry.z)>.1,'queued historical launch must synchronize its verified cabin');
  close(p.x,ferris.seat(2*4).position.x+1.53,.00002);close(p.y,ferris.seat(2*4).floor+foot,.00002);
  assert.equal(timed.consumeJumpGrounded(body,0),true,'the original queued first jump is valid');
  const synced={...p};v.y=8;p.y=14.388453483581543;
  now=433464;ferris.setNetworkAngle(3.038853847167258);
  const roof=timed.sample(p.x,p.z).intervals.find(s=>s.cabin===2&&s.min>14.5&&s.min<16);
  assert(roof,'captured collision must belong to the real occupied cabin');
  close(roof.min,15.07247100830078,.00001);
  timed.prepareBody(body);
  close(p.y,14.165471076965332,.00001);assert.equal(v.y,0);
  assert(14.388453483581543>synced.y+.12,'body rose from the synchronized cabin floor before the legitimate roof contact');
  assert(!(p.y>synced.y+.12&&v.y>3),'the retained exact roof strike is not a free-flight observation');
 }finally{timed.dispose();ferris.setNetworkAngle(0);}
});

test('Ferris historical 650ms roof budget remains a stronger all-cabin free-flight bound',t=>{
 // This is the original conservative transform-only budget. It intentionally
 // remains narrower than the real launch test below, where longer delays may
 // correctly meet an authored cabin roof and must be classified as a strike.
 const rate=Math.PI*2/ferris.stats.period,head=1.45,skin=.012,safety=.02;
 const probes=[[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]];
 // `a` is arm -> trusted input. `b` and `c` are the two subsequent prepare
 // gaps. The exact hosted replay is b=.488/c=.575; endpoints cover <=.65s.
 const armToInput=Array.from({length:63},(_,n)=>n*.05);
 // Include fast bounded frames as well as the hosted .488/.575s slow frames.
 const firstPrepare=[0,.016,.033,.05,.325,.488,.65],nextPrepare=[0,.016,.033,.05,.325,.575,.65];
 const state=(cabin,angle)=>{
  ferris.setNetworkAngle(angle);
  const seat=ferris.seat(cabin*4),seats=Array.from({length:12},(_,n)=>ferris.seat(n*4));
  const cx=seats.reduce((v,s)=>v+s.position.x,0)/12,cy=seats.reduce((v,s)=>v+s.position.y,0)/12;
  return {p:{x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975},floorVelocity:(seat.position.x-cx)*rate,horizontalVelocity:-(seat.position.y-cy)*rate};
 };
 const cap=(cabin,angle,p,dx,dz)=>{
  ferris.setNetworkAngle(angle);
  const roof=contacts.sample(p.x+dx,p.z+dz).intervals.filter(s=>s.cabin===cabin&&s.min>p.y+.2);
  assert(roof.length,'real cabin roof must cover every sampled free-jump probe');
  return Math.min(...roof.map(s=>s.min))-head+foot-skin;
 };
 const phaseEdge=(cabin,target)=>{
  let lo=null,previous=state(cabin,0);
  for(let angle=.01;angle<=Math.PI*2+.0001;angle+=.01){
   const next=state(cabin,angle);
   if(previous.horizontalVelocity>.9&&next.horizontalVelocity>.9&&previous.floorVelocity<=target&&next.floorVelocity>=target){lo=angle-.01;break;}
   previous=next;
  }
  assert.notEqual(lo,null,`cabin ${cabin} needs the ${target} near-bottom phase edge`);
  let hi=lo+.01;
  for(let n=0;n<32;n++){
   const mid=(lo+hi)/2;
   if(state(cabin,mid).floorVelocity<target)lo=mid;else hi=mid;
  }
  const angle=(lo+hi)/2,edge=state(cabin,angle);
  assert(Math.abs(edge.floorVelocity-target)<1e-6,JSON.stringify({cabin,target,edge}));
  return angle;
 };
 let phaseSamples=0,minMargin=Infinity,minimum=null;
 try{
  for(let cabin=0;cabin<12;cabin++){
   const phases=[];
   for(let angle=0;angle<Math.PI*2;angle+=.01){
    const armed=state(cabin,angle);
    if(armed.floorVelocity>-.38&&armed.floorVelocity<-.32&&armed.horizontalVelocity>.9)phases.push(angle);
   }
   // The sampled interior covers the usable catch window; bisection adds
   // epsilon-inside full-band edges rather than relying on favorable .01rad bins.
   phases.push(phaseEdge(cabin,-.38+1e-7),phaseEdge(cabin,-.32-1e-7));
   assert(phases.length>=7,`cabin ${cabin} needs interior plus both phase edges`);
   for(const angle of phases){
    const armed=state(cabin,angle);phaseSamples++;
    assert(armed.floorVelocity>-.38&&armed.floorVelocity<-.32&&armed.horizontalVelocity>.9,JSON.stringify({cabin,angle,armed}));
    for(const a of armToInput){
     const input=state(cabin,angle+rate*a);
     assert(input.floorVelocity<-.05&&Math.abs(input.horizontalVelocity)>.3,'unchanged real-event kinematics across the full dispatch window');
     for(const b of firstPrepare)for(const c of nextPrepare){
      // Input arrives between frames, so the first physics dt is at least b.
      // Using bounded b gives an upper bound on launch speed; then advance
      // the next bounded c step. Include mixed fast/slow frame schedules.
      const launchVelocity=Math.max(0,CHARACTER_CONTROL.jump-CHARACTER_CONTROL.gravity*boundedSimulationStep(b));
      const flightStep=launchVelocity*boundedSimulationStep(c);
      const flightVelocity=Math.max(0,launchVelocity-CHARACTER_CONTROL.gravity*boundedSimulationStep(c));
      for(const [dx,dz] of probes){
       const roofCap=cap(cabin,angle+rate*(a+b+c),input.p,dx,dz),margin=roofCap-input.p.y-flightStep;
       if(margin<minMargin){minMargin=margin;minimum={cabin,angle,a,b,c,dx,dz,armed,input,roofCap,flightStep,flightVelocity};}
      }
     }
    }
   }
  }
  // At least one sampled schedule is a real free-flight browser observation:
  // rise >.12 and remaining upward velocity >3. Zero-length c samples still
  // participate in the roof-clearance budget but cannot themselves observe rise.
  const referenceLaunch=Math.max(0,CHARACTER_CONTROL.jump-CHARACTER_CONTROL.gravity*boundedSimulationStep(.05));
  const referenceStep=referenceLaunch*boundedSimulationStep(.05);
  const referenceVelocity=Math.max(0,referenceLaunch-CHARACTER_CONTROL.gravity*boundedSimulationStep(.05));
  assert(referenceStep>.12&&referenceVelocity>3,JSON.stringify({referenceStep,referenceVelocity}));
  assert(minMargin>safety,JSON.stringify({minMargin,minimum,phaseSamples,safety}));
  t.diagnostic(JSON.stringify({minMargin,phaseSamples,worstClock:minimum&&{a:minimum.a,b:minimum.b,c:minimum.c,dx:minimum.dx,dz:minimum.dz,cabin:minimum.cabin,angle:minimum.angle,flightStep:minimum.flightStep,flightVelocity:minimum.flightVelocity},bounds:{armFloorVelocity:'(-.38,-.32)',armHorizontalVelocity:'>.9',armToInput:'0..3.1/.05',prepareGaps:'[0,.016,.033,.05,.325,.488,.575,.65]',freeStep:'max(0,jump-gravity*boundedSimulationStep(b))*boundedSimulationStep(c)',jump:CHARACTER_CONTROL.jump,gravity:CHARACTER_CONTROL.gravity,safety}}));
 }finally{ferris.setNetworkAngle(0);}
});

test('Ferris launch-aligned prepares synchronize grounded riders and preserve real airborne roof strikes',t=>{
 const rate=Math.PI*2/ferris.stats.period,head=1.45,skin=.012;
 const probes=[[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]];
 // These include both hosted gaps and the 2.6s continuous-carry boundary
 // already exercised by the normal carrier test. They are independent clocks:
 // first is last grounded prepare -> queued launch, second is airborne prepare.
 const launchGaps=[.016,1.153,2.6],airborneGaps=[.016,1.068,2.6];
 const state=(cabin,angle)=>{
  ferris.setNetworkAngle(angle);
  const seat=ferris.seat(cabin*4),seats=Array.from({length:12},(_,n)=>ferris.seat(n*4));
  const cx=seats.reduce((sum,s)=>sum+s.position.x,0)/12,cy=seats.reduce((sum,s)=>sum+s.position.y,0)/12;
  return {p:{x:seat.position.x+1.53,y:seat.floor+foot,z:seat.position.z+.975},floorVelocity:(seat.position.x-cx)*rate,horizontalVelocity:-(seat.position.y-cy)*rate};
 };
 const ceilingCap=(timed,p,feet)=>{
  let ceiling=Infinity;
  for(const [dx,dz]of probes)for(const span of timed.sample(p.x+dx,p.z+dz).intervals)if(span.min>=feet+head-skin)ceiling=Math.min(ceiling,span.min);
  return ceiling-head+foot-skin;
 };
 let launches=0,freeFlights=0,roofStrikes=0,minCarry=Infinity;
 try{
  for(const cabin of [0,4,8]){
   const phases=[];
   for(let angle=0;angle<Math.PI*2&&phases.length<2;angle+=.01){
    const armed=state(cabin,angle);
    if(armed.floorVelocity>-.38&&armed.floorVelocity<-.32&&armed.horizontalVelocity>.9&&phases.every(previous=>Math.abs(previous-angle)>.03))phases.push(angle);
   }
   assert.equal(phases.length,2,`cabin ${cabin} needs two real descending launch phases`);
   for(const angle of phases)for(const launchGap of launchGaps)for(const airborneGap of airborneGaps){
    let now=0,p={...state(cabin,angle).p},v={x:0,y:0,z:0};
    const timed=createRideContacts(lunapark,{now:()=>now});
    const body={translation:()=>({...p}),linvel:()=>({...v}),setTranslation:q=>p={...q},setLinvel:q=>v={...q}};
    try{
     ferris.setNetworkAngle(angle);timed.prepareBody(body);
     now=launchGap*1e3;ferris.setNetworkAngle(angle+rate*launchGap);
     const carry=timed.prepareBody(body,{jumpQueued:true});
     assert(carry&&Math.hypot(carry.x,carry.y,carry.z)>1e-5,'only a current, proven grounded launch receives carrier synchronization');
     minCarry=Math.min(minCarry,Math.hypot(carry.x,carry.y,carry.z));
     const launch={...p},seat=ferris.seat(cabin*4);
     close(launch.x,seat.position.x+1.53,.00001);close(launch.y,seat.floor+foot,.00001);
     assert.equal(timed.consumeJumpGrounded(body,0),true,'synchronized launch exposes exactly one grounded query');
     assert.equal(timed.consumeJumpGrounded(body,0),false,'launch token cannot carry into another jump');
     // The live trace has already applied its bounded gravity frame by the
     // first airborne observation: vy=8 and rise=.4m. Keep that exact model.
     v.y=8;p.y=launch.y+.4;
     now+=(airborneGap*1e3);ferris.setNetworkAngle(angle+rate*(launchGap+airborneGap));
     const cap=ceilingCap(timed,p,launch.y-foot),expectsStrike=Number.isFinite(cap)&&p.y>cap;
     assert.equal(timed.prepareBody(body),null,'airborne body never receives a second carrier delta');
     if(expectsStrike){
      close(p.y,cap,.00001);assert.equal(v.y,0,'real roof contact remains a physical clamp');roofStrikes++;
     }else{
      close(p.y,launch.y+.4,.00001);assert.equal(v.y,8);
      assert(p.y>launch.y+.12&&v.y>3,'unobstructed launch preserves the unchanged browser observation');freeFlights++;
     }
     launches++;
    }finally{timed.dispose();}
   }
  }
  assert(freeFlights>0&&roofStrikes>0,JSON.stringify({launches,freeFlights,roofStrikes,minCarry}));
  t.diagnostic(JSON.stringify({launches,freeFlights,roofStrikes,minCarry,launchGaps,airborneGaps,cabins:[0,4,8],phasesPerCabin:2}));
 }finally{ferris.setNetworkAngle(0);}
});
