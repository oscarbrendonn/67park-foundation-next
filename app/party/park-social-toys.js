import {Group} from 'three';
import {createToyModels} from './park-toy-models.js?v=1';
import {applyBalloonGrip} from './balloon-grip.js?v=1';

const finite=Number.isFinite,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=p=>p&&[p.x,p.y,p.z].every(finite);
const dist=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);
export const TOY_RULES=Object.freeze({rideSeconds:5.5,rideHeight:8,glideSeconds:6,fallSpeed:2.2,seesawSpeed:10.5});
export function validToySite(w,x,z,rx,rz){
 let base=w.ground(x,z);if(!finite(base))return false;
 for(let i=-2;i<=2;i++)for(let j=-1;j<=1;j++){
  const px=x+i*rx/2,pz=z+j*rz,hit=w.sample?.(px,pz),g=w.ground(px,pz);
  if(!finite(g)||Math.abs(g-base)>.12||!hit||!/CIM|GRASS/i.test(hit.object?.name||'')||Math.abs(g-hit.point.y)>.2||w.water?.(px,pz)||w.treeBlocked?.(px,g+.6,pz))return false;
 }
 return true;
}
export function chooseToySites(w){
 const rows=[{kind:'seesaw',x:139,z:97,rx:3.2,rz:2.1},{kind:'music',x:169,z:55,rx:4.6,rz:2},{kind:'balloon',x:139,z:109,rx:2,rz:2}];
 const offsets=[[0,0],[0,3],[0,-3],[3,0],[-3,0],[0,6],[0,-6],[6,0],[-6,0],[6,6],[-6,-6]];
 const out=[];
 for(const row of rows)for(const [dx,dz]of offsets){const x=row.x+dx,z=row.z+dz;if(!validToySite(w,x,z,row.rx,row.rz)||out.some(p=>Math.hypot(p.x-x,p.z-z)<p.rx+row.rx+1))continue;out.push({...row,x,z,y:w.ground(x,z)});break;}
 return out;
}

// The existing server relays bounded 40-char emote tags. No extra transport or
// remote-body writes. A seesaw event can launch only a local opposite occupant.
export function createParkSocialToys({world,scene,state,net,settings,sfx,send,blocked=()=>false,reducedMotion=()=>false,carrying=()=>false}){
 let current=null,models=null,group=null,originalGround=null,groundWrapper=null,body=null,input=null,enabled=false,localRoot=null;
 let sites=[],saw=null,music=null,station=null,flight=null,glide=null,cooldown=0,clock=0,seq=0,lastToggle=-1;
 let angle=0,angular=0,targetAngle=0,impactAge=99,sawCooldown=0,armedSide=0,lastSide=0,previousY=null,note=-1,hook=null;
 const keyLife=Array(6).fill(0),keyCooldown=Array(6).fill(0),remoteBalloons=new Map(),seen=new Map(),remoteRates=new Map(),roots=new Map();
 const counts={notes:0,impacts:0,launches:0,rides:0,releases:0,rejected:0};
 let rootsAt=-1,hint=null,hintText='';
 const pnow=()=>body?.translation?.();
 const sawSite=()=>sites.find(s=>s.kind==='seesaw'),musicSite=()=>sites.find(s=>s.kind==='music'),balloonSite=()=>sites.find(s=>s.kind==='balloon');
 const sawSide=p=>{const s=sawSite();if(!s||Math.abs(p.z-s.z)>.8)return 0;const x=p.x-s.x;return Math.abs(x)>1.3&&Math.abs(x)<2.8?Math.sign(x):0;};
 const sawHeight=(x,z)=>{const s=sawSite();if(!s||Math.abs(x-s.x)>2.7||Math.abs(z-s.z)>.54)return null;return s.y+.40+Math.sin(angle)*(x-s.x)+.08+(Math.abs(x-s.x)>1.5?.16:0);};
 const noteAt=p=>{const s=musicSite();if(!s||Math.abs(p.z-s.z)>.63)return -1;const i=Math.round((p.x-s.x)/1.44+2.5);return i>=0&&i<6&&Math.abs(p.x-(s.x+(i-2.5)*1.44))<.62?i:-1;};
 function floor(x,z,ignoreCar=false,ignoreRideContacts=false){let g=originalGround(x,z,ignoreCar,ignoreRideContacts),sy=sawHeight(x,z);if(finite(sy))g=Math.max(g??-1e4,sy);const m=musicSite();if(m&&noteAt({x,z})>=0)g=Math.max(g??-1e4,m.y+.135);return g;}
 function groundNear(p){return current?.ground?.(p.x,p.z);}
 function showHint(text){if(text===hintText)return;hintText=text;if(!hint&&text){hint=document.createElement('div');hint.id='park-toy-hint';hint.setAttribute('role','status');hint.style.cssText='position:fixed;left:50%;top:calc(220px + env(safe-area-inset-top));transform:translateX(-50%);max-width:min(300px,75vw);padding:9px 15px;border:1px solid #fff;border-radius:18px;background:#fff8e9ed;color:#44544e;font:600 12px/1.35 system-ui;text-align:center;pointer-events:none;z-index:35;box-shadow:0 3px 12px #55443312';document.body.append(hint);}if(hint){hint.textContent=text;hint.hidden=!text;}}
 function emit(action,value){send(`pk1t:${action}:${++seq%100000}:${value}`,280);}
 function launch(){const p=pnow(),v=body?.linvel?.(),st=state();if(!enabled||blocked()||flight||!point(p)||!point(v)||!st?.enabled||carrying())return false;body.setLinvel({x:v.x,y:TOY_RULES.seesawSpeed,z:v.z},true);Object.assign(st,{grounded:false,hover:false,airT:0,jumpsLeft:1,stretch:1,fallPeak:0,verticalVelocity:TOY_RULES.seesawSpeed});counts.launches++;armedSide=0;sfx.play('pad');return true;}
 function impact(side,remote=false){if(sawCooldown>0)return false;sawCooldown=1.15;impactAge=0;targetAngle=-side*.13;counts.impacts++;if(remote){const p=pnow(),g=p&&groundNear(p),v=body?.linvel?.();if(point(p)&&finite(g)&&sawSide(p)===-side&&p.y-g<.85&&p.y-g>.35&&v?.y<1)launch();}return true;}
 function playNote(i,audible=true){if(!music||i<0||i>5||keyCooldown[i]>0)return false;keyCooldown[i]=.18;keyLife[i]=.32;counts.notes++;if(audible)sfx.play('note',i);return true;}
 function release(announce=true){if(!flight)return false;flight=null;glide={age:0};cooldown=2;counts.releases++;if(announce)emit('b',0);return true;}
 function cancel(){flight=null;glide=null;cooldown=1;armedSide=0;note=-1;showHint('');}
 function isCarried(){const n=net();if(carrying())return true;for(const r of n?.remotes?.values()||[])if(r.carryTarget===n.id)return true;return false;}
 function interact(){if(!enabled||blocked()||!state()?.enabled||!body)return false;if(flight){if(clock-lastToggle<.25)return true;lastToggle=clock;release();return true;}
  const p=pnow(),s=balloonSite();if(!point(p)||!s||dist(p,s)>1.45||Math.abs(p.y-s.y-.555)>.75||isCarried()||cooldown>0||glide)return false;
  lastToggle=clock;flight={age:0,x:p.x,z:p.z,base:p.y,nonce:++seq%100000};glide=null;input&&(input.jumpQueued=false);counts.rides++;sfx.play('grab');emit('b',1);return true;}
 function packet(){return flight?`pk1t:b:${flight.nonce}:1`:'';}
 function receive(m){
  if(!enabled||!group||!m||typeof m.id!=='string'||!net()?.remotes?.has(m.id)||!Array.isArray(m.p)||m.p.length!==3||!m.p.every(finite))return;
  const parts=String(m.e||'').match(/^pk1t:([snb]):(\d{1,5}):(-?\d)$/);if(!parts)return;
  const action=parts[1],n=Number(parts[2]),value=Number(parts[3]),p={x:m.p[0],y:m.p[1],z:m.p[2]},me=pnow();
  if(action==='b'){
   const s=balloonSite();if(!s||![0,1].includes(value)||dist(p,s)>3||p.y<s.y+.25||p.y>s.y+TOY_RULES.rideHeight+1.5){counts.rejected++;return;}
   let entry=remoteBalloons.get(m.id);
   if(value===0){if(entry){entry.mesh.visible=false;entry.active=false;entry.until=clock+.2;}return;}
   if(!entry&&remoteBalloons.size<16){entry={mesh:models.balloon(),active:false,until:0};group.add(entry.mesh);remoteBalloons.set(m.id,entry);}
   if(entry){entry.until=clock+.65;entry.active=true;entry.nonce=n;}return;
  }
  const key=m.id+':'+action+':'+n;if(seen.has(key))return;
  const rate=m.id+':'+action;if(clock-(remoteRates.get(rate)??-100)<(action==='s'?.85:.12))return;
  if(action==='s'){const s=sawSite();if(!s||Math.abs(value)!==1||sawSide(p)!==value||Math.abs(p.y-(sawHeight(p.x,p.z)+.555))>1.25){counts.rejected++;return;}if(!impact(value,true))return;}
  else{const s=musicSite();if(!s||value<0||value>5||noteAt(p)!==value||Math.abs(p.y-s.y-.69)>1){counts.rejected++;return;}playNote(value,point(me)&&dist(me,p)<20);}
  seen.set(key,clock);remoteRates.set(rate,clock);if(seen.size>256)seen.delete(seen.keys().next().value);
 }
 function refreshRoots(){if(clock-rootsAt<.6)return;rootsAt=clock;roots.clear();scene()?.traverse(o=>{const id=o.userData?.claudeRemoteCharacter?.id;if(!id||roots.has(id))return;let r=o;while(r.parent&&r.parent!==scene()&&!(r.position.x||r.position.z))r=r.parent;roots.set(id,r);});}
 function gripTarget(root){const remoteId=[...roots].find(([,r])=>r===root)?.[0],active=root===localRoot?!!flight:!!remoteBalloons.get(remoteId)?.active;if(!active)return null;const h=root===localRoot?state()?.heading||0:root.rotation.y;return{x:root.position.x+Math.sin(h)*.17,y:root.position.y-.08,z:root.position.z+Math.cos(h)*.17};}
 function visual(root,dt){localRoot=root;if(!group||!enabled)return;if(remoteBalloons.size)refreshRoots();if(!hook){const s=scene(),before=s.onBeforeRender;hook={s,before,fn:function(...args){before?.apply(this,args);try{applyBalloonGrip(localRoot,gripTarget(localRoot),state()?.heading||0);for(const r of roots.values())applyBalloonGrip(r,gripTarget(r),r.rotation.y);}catch(e){console.warn('[park toys] grip skipped',e?.message);}}};s.onBeforeRender=hook.fn;}}
 function dispose(){cancel();applyBalloonGrip(localRoot,null,0);for(const r of roots.values())applyBalloonGrip(r,null,0);if(current&&current.ground===groundWrapper)current.ground=originalGround;if(hook&&hook.s.onBeforeRender===hook.fn)hook.s.onBeforeRender=hook.before;hook=null;group?.removeFromParent();models?.dispose();models=group=saw=music=station=null;sites=[];remoteBalloons.clear();seen.clear();remoteRates.clear();roots.clear();originalGround=groundWrapper=null;hint?.remove();hint=null;hintText='';}
 function step(nextBody,nextInput,dt,active=true){
  body=nextBody;input=nextInput;const w=world(),s=scene();if(w!==current){dispose();current=w;}
  enabled=!!active;dt=clamp(finite(dt)?dt:0,0,.05);clock+=dt;
  if(!w?.ready||!s)return;
  if(!group){models=createToyModels();sites=chooseToySites(w);group=new Group();group.name='PARK_SOCIAL_TOYS';s.add(group);for(const site of sites){const o=site.kind==='seesaw'?saw=models.seesaw(site.x,site.y,site.z):site.kind==='music'?music=models.music(site.x,site.y,site.z):station=models.station(site.x,site.y,site.z);group.add(o.group);}originalGround=w.ground;groundWrapper=(x,z,ignoreCar=false,ignoreRideContacts=false)=>floor(x,z,ignoreCar,ignoreRideContacts);w.ground=groundWrapper;cooldown=0;}
  group.visible=enabled;if(!enabled){cancel();return;}
  cooldown=Math.max(0,cooldown-dt);sawCooldown=Math.max(0,sawCooldown-dt);impactAge+=dt;
  if(impactAge>.48)targetAngle=0;angular+=((targetAngle-angle)*100-angular*10)*dt;angle=clamp(angle+angular*dt,-.14,.14);if(Math.abs(angle)+Math.abs(angular)<.00001)angle=angular=0;if(saw)saw.pivot.rotation.z=angle;
  for(let i=0;i<6;i++){keyLife[i]=Math.max(0,keyLife[i]-dt);keyCooldown[i]=Math.max(0,keyCooldown[i]-dt);if(music){music.keys[i].position.y=.07-(reducedMotion()?0:.025*Math.min(1,keyLife[i]/.12));music.materials[i].emissiveIntensity=.18*Math.min(1,keyLife[i]/.12);}}
  const p=pnow(),v=body?.linvel?.(),st=state(),eligible=point(p)&&point(v)&&st?.enabled&&!blocked()&&!isCarried();
  if(eligible){
   const side=sawSide(p),h=side?sawHeight(p.x,p.z):null;
   if(!flight&&!glide&&side&&finite(h)){
    if(p.y-h>1.02&&p.y-h<3.8&&side===lastSide)armedSide=side;
    if(armedSide===side&&p.y-h<.82&&p.y-h>.32&&v.y<=.8&&previousY!==null&&p.y<=previousY+.04){if(impact(side)){emit('s',side);sfx.play('land');}armedSide=0;}
   }else armedSide=0;
   lastSide=side;previousY=p.y;
   const i=noteAt(p),m=musicSite(),contact=m&&i>=0&&p.y-m.y<.95&&p.y-m.y>.35&&v.y<=.8;if(contact){if(i!==note&&playNote(i))emit('n',i);note=i;}else note=-1;
  }else{armedSide=0;note=-1;}
  if(flight){const b=balloonSite();if(!eligible||!b||dist(p,flight)>1.8||p.y<flight.base-1||p.y>flight.base+TOY_RULES.rideHeight+1.8){release();}else if(input?.jumpQueued){input.jumpQueued=false;release();}else{
    flight.age+=dt;if(flight.age>=TOY_RULES.rideSeconds)release();else{const t=flight.age/TOY_RULES.rideSeconds,y=flight.base+TOY_RULES.rideHeight*Math.sin(t*Math.PI/2);body.setTranslation({x:flight.x,y,z:flight.z},true);body.setLinvel({x:0,y:1,z:0},true);Object.assign(st,{grounded:false,hover:false,airT:0,speed:0,verticalVelocity:1,fallPeak:0});input.x=input.z=0;input.run=false;}}
  }
  if(glide&&point(p)&&point(v)){glide.age+=dt;const g=groundNear(p);if(!st?.enabled||glide.age>TOY_RULES.glideSeconds||finite(g)&&p.y-g<.7&&v.y<=0)glide=null;else if(v.y<-TOY_RULES.fallSpeed){body.setLinvel({x:v.x,y:-TOY_RULES.fallSpeed,z:v.z},true);st.verticalVelocity=-TOY_RULES.fallSpeed;st.hover=false;st.fallPeak=0;}}
  if(station){const p=pnow();station.balloon.visible=!flight;if(flight&&point(p)){if(!station.flying){station.flying=models.balloon();group.add(station.flying);}station.flying.visible=true;const h=st?.heading||0;station.flying.rotation.y=h;station.flying.position.set(p.x+Math.sin(h)*.17,p.y-.555,p.z+Math.cos(h)*.17);}else if(station.flying)station.flying.visible=false;}
  const peers=net()?.remotes;for(const [id,r]of remoteBalloons){const peer=peers?.get(id);if(!peer||r.until+1<clock){applyBalloonGrip(roots.get(id),null,0);roots.delete(id);r.mesh.removeFromParent();remoteBalloons.delete(id);continue;}if(r.until<clock)r.active=false;r.mesh.visible=r.active;const q=peer.p||peer.targetP,h=peer.ry||0;if(r.active&&q){r.mesh.rotation.y=h;r.mesh.position.set(q[0]+Math.sin(h)*.17,q[1]-.555,q[2]+Math.cos(h)*.17);}}
  for(const [k,t]of seen)if(clock-t>6)seen.delete(k);for(const [k,t]of remoteRates)if(clock-t>6)remoteRates.delete(k);
  const b=balloonSite();showHint(!eligible?'':flight?'Interact / Jump · Let go':glide?'Float down · steer to land':b&&dist(p,b)<2?'Interact · Hold the balloon':sawSide(p)?'Your friend waits opposite · jump here':note>=0?'Walk across · make a melody':'');
 }
 return{step,visual,interact,receive,packet,dispose,debug:()=>({sites:sites.map(s=>({...s})),counts:{...counts},angle,flight:flight&&{...flight},glide:glide&&{...glide},note,armedSide,grip:localRoot?.userData.balloonGrip,visualY:localRoot?.position.y,remoteBalloons:[...remoteBalloons].map(([id,r])=>({id,active:r.active})),resources:models?.stats()})};
}
