import * as T from 'three';
import {createPetModels} from './pet-model.js?v=pet-play-1';
import {createPetFollower} from './pet-follow.js?v=pet-play-1';
import {createPetCompanion} from './pet-commands.js?v=pet-play-1';
import {createPetControls} from './pet-controls.js?v=pet-play-1';
import {createPetToys} from './pet-toys.js?v=pet-play-1';
import {queuePetOwnerPose} from './pet-owner-pose.js?v=pet-play-1';
import {petSelection,petFromCombo,comboWithPet,validPet} from './pet-state.js?v=pets-soft-2';

// Optional, isolated cosmetic layer. One existing frame hook and shared avatar
// metadata; no new RAF, light, physics body, position stream or server process.
export function createParkPets({world,net,heading=()=>0,reducedMotion=()=>false,sound=()=>{},resting=()=>false,canCare=()=>true}) {
  let current=null,models=null,local=null,clock=0,nextRoster=0,failed=false,active=false,disposed=false;
  let profileNet=null,originalHello=null,wrappedHello=null,onlineClient=null,originalSend=null,wrappedSend=null,lastProfile=-10,dirty=true;
  const remotes=new Map(),counts={frames:0,probes:0,failed:0};let body=null,remaining=0,lastZone='',created=0;
  const unsubscribe=petSelection.subscribe(()=>{dirty=true;});
  const requested=validPet(new URLSearchParams(globalThis.location?.search||'').get('pet'));
  if(requested)petSelection.select(requested);
  const mobile=globalThis.matchMedia?.('(pointer: coarse)').matches;
  const remoteLimit=mobile?6:10;
  let owner=null,toys=null,nextUI=0,down=null,careHand=null;
  const controls=createPetControls({snapshot:()=>({active,kind:local?.kind,visible:local?.model.root.visible,command:local?.companion?.state.command,message:local?.companion?.state.message}),command});
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  function pointerDown(e){if(e.button===0&&e.target?.tagName==='CANVAS')down={x:e.clientX,y:e.clientY,id:e.pointerId};else down=null;}
  function pointerUp(e){
    const start=down;down=null;if(!start||start.id!==e.pointerId||Math.hypot(start.x-e.clientX,start.y-e.clientY)>7||!local?.model.root.visible||!owner)return;
    const camera=current?.camera||globalThis.__eggyCamera,canvas=e.target;
    if(!camera?.isCamera||!canvas?.getBoundingClientRect||Math.hypot(owner.x-local.follow.state.x,owner.z-local.follow.state.z)>3)return;
    const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
    if(ray.intersectObject(local.model.mesh,false).length){command('pet');controls.open();}
  }
  globalThis.document?.addEventListener('pointerdown',pointerDown,{passive:true});
  globalThis.document?.addEventListener('pointerup',pointerUp,{passive:true});
  function probe(x,z,reference) {
    if(!current||remaining--<=0)return null;counts.probes++;
    const y=current.ground?.(x,z,true);
    if(!Number.isFinite(y)||current.water?.(x,z)||Math.abs(y-reference)>2.2)return null;
    // The runtime's obstacle test includes tree trunks and home furniture.
    if(current.treeBlocked?.(x,y+.25,z))return null;
    for(const [dx,dz] of [[-.18,0],[.18,0],[0,-.18],[0,.18]])if(current.treeBlocked?.(x+dx,y+.25,z+dz))return null;
    return y;
  }
  function make(kind,isLocal=false) {
    const model=models.create(kind,{scale:.48}),companion=isLocal?createPetCompanion(kind,probe,{sound}):null,follow=companion?.follow||createPetFollower(probe);
    current.scene.add(model.root);return {kind,model,follow,companion,navAge:(++created%11)/88};
  }
  function remove(record){record?.model.dispose();}
  function clear(){remove(local);local=null;for(const r of remotes.values())remove(r);remotes.clear();toys?.dispose();toys=null;models?.dispose();models=null;current=null;}
  function command(id){
    if(!active||!local?.companion||!owner)return {ok:false,message:'Choose a pet in Bag and enter the park first.'};
    if(!canCare()&&!['follow','come','stay','sit','lie'].includes(id))return {ok:false,message:'Stand on foot with empty hands to play.'};
    remaining=20;const result=local.companion.command(id,owner,heading());controls.update();return result;
  }
  function hooks(){
    const n=net();
    if(n&&n!==profileNet){
      if(profileNet&&profileNet.sendHello===wrappedHello)profileNet.sendHello=originalHello;
      profileNet=n;originalHello=n.sendHello;
      wrappedHello=function(name,combo){return originalHello.call(this,name,comboWithPet(combo,petSelection.get()));};
      n.sendHello=wrappedHello;dirty=true;
    }
    // The social channel may refresh the same profile on a room transition.
    // Preserve its existing hello fields and the selected cosmetic there too.
    const online=globalThis.__candyOnline;
    if(online?.send&&online!==onlineClient){
      if(onlineClient?.send===wrappedSend)onlineClient.send=originalSend;
      onlineClient=online;originalSend=online.send;
      wrappedSend=function(message){return originalSend.call(this,message?.t==='hello'&&typeof message.combo==='string'?{...message,combo:comboWithPet(message.combo,petSelection.get())}:message);};
      online.send=wrappedSend;
    }
    if(dirty&&clock-lastProfile>.8&&n?.connected&&n.lastHello?.combo){
      n.sendHello(n.lastHello.name,n.lastHello.combo);dirty=false;lastProfile=clock;
    }
  }
  function move(record,dt,owner,yaw,localPlayer=false){
    record.navAge+=dt;
    // Local navigation at <= 24 Hz; nearby remotes at <= 8 Hz. The rig still
    // interpolates every frame. The hard global budget also covers crowded rooms.
    const interval=localPlayer?1/24:1/8;
    if(record.navAge>=interval){
      const step=record.companion?record.companion.step(Math.min(.1,record.navAge),owner,yaw,{resting:resting()}):record.follow.step(Math.min(.1,record.navAge),owner,yaw);record.navAge=0;
    }
    const st=record.follow.state,root=record.model.root;
    root.visible=active&&st.visible;
    if(!root.visible)return;
    const factor=1-Math.exp(-22*dt);
    if(!record.placed||Math.hypot(root.position.x-st.x,root.position.z-st.z)>10){root.position.set(st.x,st.y,st.z);record.placed=true;}
    else {root.position.x+=(st.x-root.position.x)*factor;root.position.y+=(st.y-root.position.y)*factor;root.position.z+=(st.z-root.position.z)*factor;}
    root.rotation.y+=Math.atan2(Math.sin(st.heading-root.rotation.y),Math.cos(st.heading-root.rotation.y))*(1-Math.exp(-16*dt));
    const behavior=record.companion?.state;
    record.model.update(dt,{speed:st.speed,reducedMotion:reducedMotion(),pose:behavior?.pose,actionTime:behavior?.actionTime,happy:behavior?.happy});
    if(localPlayer){
      if(behavior?.toy&&!toys)toys=createPetToys(current.scene);
      const toy=behavior?.toy;
      if(toy&&careHand){if(toy.kind==='feather')toy.from={...careHand};if(toy.kind==='treat')toy.position={...careHand};}
      toys?.update(toy);
    }
  }
  function step(nextBody,dt,map) {
    if(disposed||failed)return;
    try {
      dt=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));clock+=dt;counts.frames++;body=nextBody;
      hooks();
      const w=world(),p=body?.translation?.();
      active=map==='city'&&!!w?.ready&&!!p&&[p.x,p.y,p.z].every(Number.isFinite);
      if(!active){if(local){local.model.root.visible=false;local.companion.reset();}toys?.update(null);for(const r of remotes.values()){r.model.root.visible=false;r.follow.reset();}controls.update();return;}
      if(w!==current){clear();current=w;models=createPetModels();}
      remaining=20;
      const zone=p.x>450?`${Math.round(p.x/100)}:${Math.round(p.z/100)}`:'park';
      if(zone!==lastZone){local?.companion.reset();for(const r of remotes.values())r.follow.reset();lastZone=zone;}
      const selected=petSelection.get();
      if(local?.kind!==selected){remove(local);toys?.update(null);local=selected?make(selected,true):null;}
      owner={x:p.x,y:p.y-.555,z:p.z};
      if(local)move(local,dt,owner,heading(),true);
      if(clock>=nextUI){nextUI=clock+.2;controls.update();}
      if(clock>=nextRoster){
        nextRoster=clock+.6;
        const rows=[];
        for(const [id,r]of net()?.remotes||[]) {
          const q=r.targetP;
          if(!Array.isArray(q)||q.length!==3||!q.every(Number.isFinite))continue;
          const kind=petFromCombo(r.combo),distance=Math.hypot(q[0]-p.x,q[2]-p.z);
          if(kind&&distance<30&&Math.abs(q[1]-p.y)<5)rows.push({id,r,kind,distance});
        }
        rows.sort((a,b)=>a.distance-b.distance);const keep=new Set(rows.slice(0,remoteLimit).map(r=>r.id));
        for(const [id,r]of remotes)if(!keep.has(id)){remove(r);remotes.delete(id);}
        for(const row of rows.slice(0,remoteLimit)){
          let r=remotes.get(row.id);if(r&&r.kind!==row.kind){remove(r);r=null;}
          if(!r){r=make(row.kind);remotes.set(row.id,r);}r.owner=row.r;
        }
      }
      for(const r of remotes.values()){
        const q=r.owner.targetP;move(r,dt,{x:q[0],y:q[1]-.555,z:q[2]},r.owner.targetRy||0);
      }
    } catch(error) {
      failed=true;active=false;counts.failed++;clear();controls.update();console.warn('[pets] companion layer stopped safely',error);
    }
  }
  return {step,command,openControls:controls.open,
    interact(){return active&&local&&owner&&Math.hypot(owner.x-local.follow.state.x,owner.z-local.follow.state.z)<2.5?controls.open():false;},
    visual(root,dt){
      const b=local?.companion.state,n=local?.follow.state;
      careHand=root?.userData.petCare?.active?root.userData.petCare.hand:null;
      const action=active&&canCare()&&b?.ownerAction&&n?.visible?b.ownerAction:'';
      const yaw=heading(),point=action?local.model.contactPoint(action):null;
      if(action==='feather'&&owner)point.set(owner.x-Math.cos(yaw)*.34+Math.sin(yaw)*.12,owner.y+.48,owner.z+Math.sin(yaw)*.34+Math.cos(yaw)*.12);
      queuePetOwnerPose(root,action?{action,time:b.actionTime,heading:yaw,point:{x:point.x,y:point.y,z:point.z}}:null,dt);
    },
    select:petSelection.select,play(){local?.model.play();},debug:()=>({selected:petSelection.get(),active,failed,...counts,local:local?{...local.model.stats,follow:local.follow.stats(),behavior:local.companion?.debug(),position:local.model.root.position.toArray()}:null,remotes:[...remotes].map(([id,r])=>({id,kind:r.kind,visible:r.model.root.visible})),remoteLimit,models:models?.stats(),toyVisible:!!toys?.root.visible}),dispose(){if(disposed)return;disposed=true;unsubscribe();clear();controls.dispose();globalThis.document?.removeEventListener('pointerdown',pointerDown);globalThis.document?.removeEventListener('pointerup',pointerUp);if(profileNet?.sendHello===wrappedHello)profileNet.sendHello=originalHello;if(onlineClient?.send===wrappedSend)onlineClient.send=originalSend;}};
}
