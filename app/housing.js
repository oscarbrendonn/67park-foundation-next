import {HOUSES,houseById,nearDoor,isHousingZone} from './housing-layout.js?v=home-social-3';
import {createHousingLoader} from './housing-loader.js?v=home-entry-3';
import {createHousingMarkers} from './housing-markers.js?v=home-scene-1';
import {createHousingScene,ISOLATED_HOME} from './housing-scene.js?v=home-scene-1';
import {g as input,k as controls,Aa as wardrobe,i as board} from './chunk-G7D6MVRW.js?v=recovery-graphics-1';
import {b as overview} from './chunk-OZ77422N.js?v=foundation-next-movement-1';
import {HOME_SPOTS,homeSpot,spotPosition,nearHomeSpot} from './housing-actions.js?v=home-social-3';
import {queueHomePose} from './housing-poses.js?v=home-social-3';

export function createHousing({sound=()=>{}}={}){
 let body=null,world=null,interior=null,ws=null,model=null,visit=null,travel=null,pending=null,seq=0,clock=0,nextPoll=0,lastIsland='',beforeBlocked=false,releaseId='',failed=false,exitWhenConnected=false;
 let loader=null,markers=null,partition=null,preparing=null,mapTravel=null;
 let rest=null,standQueued=false,lastStand=0,bell=null,bellUntil=0,peopleKey='',inboxKey='';
 const isolate=new URLSearchParams(location.search).get('homeScene')!=='legacy';
 const online=()=>window.__candyOnline,position=()=>body?.translation?.();
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./housing.css?v=home-social-3',import.meta.url).href;document.head.append(sheet);
 const button=document.createElement('button');button.id='park-home-button';button.type='button';button.textContent='⌂ Homes';button.setAttribute('aria-haspopup','dialog');button.hidden=true;
 const panel=document.createElement('dialog');panel.id='park-homes';panel.setAttribute('aria-labelledby','homes-title');
 panel.innerHTML='<header><div><small>YOUR LITTLE PLACE IN THE PARK</small><h2 id="homes-title">Make yourself at home</h2></div><button type="button" class="home-close" aria-label="Close homes">×</button></header><p>Claim a cottage. Invite your friends over.</p><div id="home-inside" hidden><button type="button" data-home-action="exit">Leave home</button><strong></strong><br><span>Move, jump and chat together.</span></div><div class="home-grid"></div><p id="home-message" role="status" aria-live="polite"></p><small>ONE HOME PER PERSON · THIS LOBBY ONLY</small><p style="font-size:11px;margin:6px 0 0">Your home stays reserved during a short reconnect. Leaving this lobby releases it. A locked door stops new visitors; friends already inside can stay.</p>';
 const hint=document.createElement('button');hint.id='park-home-hint';hint.type='button';hint.hidden=true;
 document.body.append(button,panel,hint);
 const grid=panel.querySelector('.home-grid'),message=panel.querySelector('#home-message');
 const social=document.createElement('section');social.className='home-social';
 social.innerHTML='<div id="home-invitations"></div><div id="home-host" hidden><h3>Invite a friend</h3><p id="home-bell-message" role="status"></p><label for="home-guest-select">Online in this lobby</label><div class="home-invite-row"><select id="home-guest-select"></select><button type="button" data-home-action="invite">Invite</button></div><p>Their choice: Visit or Not now. Invitations last 5 minutes, even if your door is locked.</p></div>';
 grid.before(social);
 const guestSelect=social.querySelector('select'),hostBox=social.querySelector('#home-host'),inbox=social.querySelector('#home-invitations');
 const cards=new Map();
 for(const h of HOUSES){
  const card=document.createElement('article');card.className='home-card';card.dataset.house=h.id;
  card.innerHTML=`<svg class="home-icon" viewBox="0 0 80 68" aria-hidden="true"><path d="M12 29 40 7 68 29v30a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4Z" fill="${h.color}" stroke="#fffaf0" stroke-width="3"/><path d="M6 30 40 3 74 30" fill="none" stroke="#95898a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="31" y="37" width="18" height="26" rx="6" fill="#fff6df"/><rect x="17" y="34" width="10" height="12" rx="3" fill="#dcebee"/><rect x="54" y="34" width="10" height="12" rx="3" fill="#dcebee"/><circle cx="44" cy="51" r="2" fill="#a89d82"/></svg><h3></h3><div class="home-owner"></div><div class="home-actions"><button type="button" data-home-action="claim" class="home-primary">Claim home</button><button type="button" data-home-action="door">Go to door</button><button type="button" data-home-action="enter" class="home-primary">Enter</button><button type="button" data-home-action="lock" class="home-lock"></button><button type="button" data-home-action="release" class="home-release">Release home</button></div>`;
  card.querySelector('h3').textContent=h.name;grid.append(card);cards.set(h.id,card);
  const ring=document.createElement('button');ring.type='button';ring.dataset.homeAction='bell';ring.textContent='Ring doorbell';card.querySelector('.home-actions').append(ring);
 }
 function say(text){message.textContent=text;}
 function releaseControls(){window.dispatchEvent(new Event('park:release-controls'));input.x=input.z=0;input.jumpQueued=false;}
 function close(){if(!panel.open)return;panel.close();controls.blocked=beforeBlocked||!!wardrobe.open||!!document.querySelector('dialog[open]');releaseControls();button.focus({preventScroll:true});}
 function open(){if(failed){failed=false;world=null;pending=preparing=travel=mapTravel=null;lastIsland='';button.textContent='⌂ Homes';say('Homes are reconnecting. Try the door again in a moment.');return;}if(panel.open)return;releaseId='';beforeBlocked=controls.blocked;controls.blocked=true;releaseControls();render();panel.showModal();panel.querySelector('.home-close').focus({preventScroll:true});if(!model)send('sync');}
 const state=h=>model?.houses.find(q=>q.id===h.id);
 function render(){
  const connected=online()?.data.connected&&!!model&&model.island===online()?.data.island?.code;
  const mine=model?.houses.find(q=>q.owner===online()?.data.me?.id);
  const p=position(),arr=p&&[p.x,p.y,p.z];
  for(const h of HOUSES){
   const card=cards.get(h.id),q=state(h),own=q?.owner===online()?.data.me?.id&&!!q?.owner;
   card.dataset.mine=String(own);card.querySelector('.home-owner').textContent=!connected?'Connecting…':!q?.owner?'Available':(own?'Your home':q.name+"’s home")+(q.locked?' · Locked':' · Open')+(q.guests?' · '+q.guests+' inside':'');
   for(const b of card.querySelectorAll('[data-home-action]')){
    const a=b.dataset.homeAction;
    b.hidden=a==='bell'?!model?.features?.includes('bell')||!q?.owner||own||!!visit||!nearDoor(h,arr):a==='claim'?!!q?.owner:a==='lock'||a==='release'?!own:a==='enter'?!q?.owner||!nearDoor(h,arr)||!!visit:false;
    b.disabled=!connected||!!pending||!!preparing||(a==='claim'&&!!mine)||(a==='enter'&&q?.locked&&!own);
    if(a==='lock')b.textContent=q?.locked?'Unlock door':'Lock door';
    if(a==='release')b.textContent=releaseId===h.id?'Confirm release':'Release home';
   }
  }
  const inside=panel.querySelector('#home-inside');inside.hidden=!visit;inside.querySelector('strong').textContent=houseById(visit)?.name||'';
  inside.querySelector('span').textContent=rest?'Move, jump or Interact to stand up.':'Walk beside the sofa or bed and press Interact.';
  inside.querySelector('button').disabled=visit&&!online()?.data.connected?false:!connected||!!pending;
  hostBox.hidden=!mine||!model?.features?.includes('invite');hostBox.dataset.house=mine?.id||'';
  const people=model?.people||[],roster=JSON.stringify(people);
  if(peopleKey!==roster){peopleKey=roster;const selected=guestSelect.value;guestSelect.replaceChildren(...people.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o;}));if(people.some(p=>p.id===selected))guestSelect.value=selected;}
  hostBox.querySelector('button').disabled=!connected||!!pending||!!preparing||!people.length;
  guestSelect.disabled=!people.length;hostBox.querySelector('#home-bell-message').textContent=bell&&bellUntil>clock?bell.name+' is at your door.':'';
  const invitations=model?.invitations||[],key=JSON.stringify([invitations,!!pending,!!preparing,!!connected]);
  if(inboxKey!==key){inboxKey=key;inbox.replaceChildren();for(const i of invitations){
   const row=document.createElement('div');row.className='home-invitation';row.dataset.house=i.house;
   const label=document.createElement('strong');label.textContent=i.name+' invited you to '+(houseById(i.house)?.name||'their home');row.append(label);
   for(const [action,title]of [['accept','Visit'],['decline','Not now']]){const b=document.createElement('button');b.type='button';b.dataset.homeAction=action;b.textContent=title;b.disabled=!connected||!!pending||!!preparing;row.append(b);}inbox.append(row);
  }}
  button.textContent=bell&&bellUntil>clock?'Doorbell · '+bell.name:invitations.length?'⌂ Homes · '+invitations.length+' invite'+(invitations.length>1?'s':''):'⌂ Homes';
  if(!connected)say('Connecting to this island. Homes will be ready when the server reconnects.');
  else if(!pending&&!message.textContent)say('Choose an available cottage, then go to its front door.');
 }
 function prepareRoom(done,onFailure){
  if(preparing||!loader)return false;
  const ticket={world,loader,island:online()?.data.island?.code};preparing=ticket;
  say('Preparing home… You can still move and chat.');render();
  loader.prepare().then(room=>{
   if(preparing!==ticket||world!==ticket.world||failed)return;
   preparing=null;interior=room;
   if(ticket.island===online()?.data.island?.code)done();
   render();
  }).catch(()=>{
   if(preparing!==ticket)return;preparing=null;
   say('Home could not load. You are safe outside. Press Enter to try again.');
   onFailure?.();render();
  });return true;
 }
 function send(action,house,extra={},prepared=false){
  if((action==='enter'||action==='accept')&&!prepared&&!interior){return prepareRoom(()=>send(action,house,extra,true));}
  if(action==='exit'&&visit&&!online()?.data.connected){travel={house:null,p:houseById(visit).door};exitWhenConnected=true;pending=null;return true;}
  if(pending||preparing||!online()?.data.connected){say('Wait for the island connection, then try again.');return false;}
  if(action!=='sync')releaseControls();
  const request='home-'+(++seq);pending={request,at:clock,action};
  const ok=online().send({t:'house.'+action,house,request,...extra});
  if(!ok){pending=null;say('Could not send. Please reconnect and try again.');}else if(action!=='sync')say('One moment…');
  render();return ok;
 }
 function received(event){
  let m;try{m=JSON.parse(event.data);}catch{return;}
  if(m.t==='house.state'){model=m;if(!m.rest)standQueued=false;if(!standQueued)rest=m.rest||null;if(!m.visiting&&!travel&&(visit||isHousingZone(position()?.x,position()?.z)))travel={house:null,p:(houseById(visit)||HOUSES[0]).door};render();}
  else if(m.t==='house.travel'&&Array.isArray(m.p)&&m.p.length===3&&m.p.every(Number.isFinite)&&(!m.house||houseById(m.house))){if(m.standing&&standQueued)return;pending=null;travel=m;}
  else if(m.t==='house.bell'&&houseById(m.house)){bell=m;bellUntil=clock+20000;if((model?.people||[]).some(p=>p.id===m.from))guestSelect.value=m.from;sound('bell');render();}
  else if(m.t==='house.result'){
   if(pending?.request===m.request){const action=pending.action;pending=null;if(action==='exit'&&!m.ok)mapTravel=null;say(m.ok?(action==='claim'?'It’s yours! Go to the front door to enter.':action==='lock'?'Door updated.':action==='release'?'Home released.':action==='bell'?'Doorbell rang. Your friend can invite you in.':action==='invite'?'Invitation sent. Your friend chooses whether to visit.':''):m.message||'Please try again.');render();}
  }
 }
 function nearestSpot(){
  const h=houseById(visit),p=position();if(!h||!p||!model?.features?.includes('rest'))return null;
  const taken=new Set((model.poses||[]).filter(r=>r.house===visit&&r.id!==online()?.data.me?.id).map(r=>r.spot));
  return HOME_SPOTS.filter(s=>!taken.has(s.id)&&nearHomeSpot(h,s,[p.x,p.y,p.z])).sort((a,b)=>Math.hypot(p.x-h.room.x-a.x,p.z-h.room.z-a.z)-Math.hypot(p.x-h.room.x-b.x,p.z-h.room.z-b.z))[0]||null;
 }
 function stand(){
  if(!rest)return false;const h=houseById(visit),s=homeSpot(rest);rest=null;standQueued=true;lastStand=0;
  if(h&&s&&body){const [x,y,z]=spotPosition(h,s,true);body.setTranslation({x,y,z},true);body.setLinvel({x:0,y:0,z:0},true);}
  return true;
 }
 function interact(){
  if(failed||!world?.ready||controls.blocked||wardrobe.open||!body||online()?.data.room||window.__candy?.state?.().mounted)return false;
  const p=position();if(!p)return false;
  if(visit){if(stand())return true;const h=houseById(visit);if(Math.hypot(p.x-h.room.x,p.z-h.room.z-5)<2){send('exit');return true;}const s=nearestSpot();if(s){send('rest',visit,{spot:s.id});return true;}return false;}
  const h=HOUSES.find(h=>nearDoor(h,[p.x,p.y,p.z]));if(!h)return false;
  if(state(h)?.owner)send(state(h).locked&&state(h).owner!==online()?.data.me?.id&&model?.features?.includes('bell')?'bell':'enter',h.id);else{open();cards.get(h.id).scrollIntoView({block:'nearest'});}
  return true;
 }
 function travelFromMap(go){
  if(!visit)return undefined;
  if(pending||preparing||typeof go!=='function')return false;
  // Keep server admission and local scene in agreement before applying the
  // existing validated map destination. Never teleport out of an occupied room.
  const ticket={go,world,island:online()?.data.island?.code};
  if(!send('exit'))return false;
  mapTravel=ticket;return true;
 }
 button.addEventListener('click',open);panel.querySelector('.home-close').addEventListener('click',close);
 panel.addEventListener('cancel',e=>{e.preventDefault();close();});
 panel.addEventListener('click',e=>{
  if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();return;}
  const b=e.target.closest('[data-home-action]');if(!b||b.disabled)return;
  const h=b.closest('[data-house]')?.dataset.house,a=b.dataset.homeAction;
  if(a==='release'&&releaseId!==h){releaseId=h;say('Release this home? Everyone inside will return to its front door. Press Confirm release to continue.');render();return;}
  send(a,h,a==='lock'?{locked:!state(houseById(h))?.locked}:a==='invite'?{target:guestSelect.value}:{});releaseId='';
 });
 // Native dialog traps focus; capture prevents movement/chat shortcuts leaking
 // through to the game, while preserving Tab and normal button keyboard use.
 const keydown=e=>{if(!panel.open)return;if(e.key==='Escape'){e.preventDefault();close();}e.stopImmediatePropagation();};
 const keyup=e=>{if(panel.open)e.stopImmediatePropagation();};
 window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup,true);
 hint.addEventListener('click',()=>{if(!interact())open();});
 function tick(nextBody,map){
  body=nextBody;clock=performance.now();const w=window.__islandWorld;
  if(w!==world){preparing=mapTravel=null;partition?.dispose();loader?.dispose();markers?.dispose();loader=markers=partition=null;interior=null;world=w;visit=null;model=null;travel=null;rest=null;standQueued=false;lastIsland='';}
  if(map!=='city'||!world?.ready){if(map!=='city'){preparing=mapTravel=null;travel=null;visit=null;rest=null;standQueued=false;}partition?.leave();interior?.show(null);markers?.show(false);button.hidden=true;hint.hidden=true;return;}
  if(!loader){loader=createHousingLoader(world);markers=createHousingMarkers(world);partition=createHousingScene(world);world.homeScene=partition;}
  button.hidden=!!wardrobe.open;
  if(online()?.ws!==ws){ws?.removeEventListener('message',received);ws=online()?.ws;ws?.addEventListener('message',received);model=null;lastIsland='';pending=null;}
  const island=online()?.data.island?.code;
  if(online()?.data.connected&&island&&island!==lastIsland){lastIsland=island;pending=null;send(exitWhenConnected?'exit':standQueued?'stand':'sync');exitWhenConnected=false;}
  if(pending&&clock-pending.at>6000){pending=mapTravel=null;say('The server did not answer. Please try again.');render();}
  if(travel&&body){
   if(travel.house&&!interior){
    if(!preparing)prepareRoom(()=>{},()=>{travel=null;online()?.send({t:'house.exit'});});
    return;
   }
   const destination=!travel.house&&mapTravel;mapTravel=null;
   visit=travel.house||null;rest=standQueued?null:travel.rest||null;if(rest)board.on=false;interior?.show(houseById(visit));
   if(isolate&&visit===ISOLATED_HOME&&!overview.on)partition.enter();else partition.leave();
   const [x,y,z]=travel.p,from=body.translation();
   // Preserve the player's chosen orbit, but never sweep across the entire map.
   for(const cam of new Set([world.camera,window.__eggyCam]))if(cam?.position){cam.position.x+=x-from.x;cam.position.y+=y-from.y;cam.position.z+=z-from.z;cam.updateMatrixWorld();}
   body.setTranslation({x,y,z},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel?.({x:0,y:0,z:0},true);
   // A stand acknowledgement must not swallow the jump/joystick input that
   // just got the player up. Other travels release stale held controls.
   if(!standQueued)releaseControls();if(travel.reason)say(travel.reason);travel=null;close();render();
   if(destination&&destination.world===world&&destination.island===online()?.data.island?.code)destination.go();
  }
  // The map overview still needs the exterior, even while visiting a house.
  if(isolate&&visit===ISOLATED_HOME&&!overview.on)partition.enter();else partition.leave();
  interior?.step();partition.step();markers.show(!visit);
  if(rest&&!controls.blocked&&!wardrobe.open&&(Math.hypot(input.x||0,input.z||0)>.12||input.jumpQueued))stand();
  if(standQueued&&online()?.data.connected&&clock-lastStand>700){lastStand=clock;online().send({t:'house.stand'});}
  // Never leave a disconnected player trapped behind a UI. Local exit returns
  // to the door; the next connection authoritatively resynchronizes ownership.
  if(visit&&!online()?.data.connected&&panel.open){panel.querySelector('#home-inside button').disabled=false;}
  if(clock<nextPoll)return;nextPoll=clock+250;
  const p=position(),h=visit?houseById(visit):p&&HOUSES.find(h=>nearDoor(h,[p.x,p.y,p.z]));
  const available=!!h&&!wardrobe.open&&!controls.blocked&&!online()?.data.room&&!window.__candy?.state?.().mounted;
  hint.hidden=!available;
  if(available){const nearExit=visit&&Math.hypot(p.x-h.room.x,p.z-h.room.z-5)<2,s=nearestSpot(),q=state(h);hint.textContent=preparing?'Preparing home…':loader?.stats.phase==='error'&&!visit?'Home unavailable · Tap to retry':rest?'Move / Jump / Interact · Stand up':visit?(nearExit?'Interact · Leave '+h.name:s?'Interact · '+s.label:h.name+' · Home controls'):q?.owner?(q.locked&&q.owner!==online()?.data.me?.id?'Interact · Ring doorbell':'Interact · Enter '+h.name):'Interact · Claim '+h.name;}
  if(bell&&bellUntil<=clock){bell=null;render();}
  if(panel.open)render();
 }
 return {
  step(body,input,dt,map){if(failed)return;try{tick(body,map);}catch(e){failed=true;close();if(visit){const h=houseById(visit);exitWhenConnected=true;try{online()?.send({t:'house.exit'});}catch{}if(h&&body){body.setTranslation({x:h.door[0],y:h.door[1],z:h.door[2]},true);body.setLinvel({x:0,y:0,z:0},true);}}releaseControls();hint.hidden=true;button.hidden=false;button.textContent='Retry homes';ws?.removeEventListener('message',received);ws=null;for(const resource of [partition,loader,markers])try{resource?.dispose();}catch{}partition=loader=markers=null;visit=rest=preparing=pending=null;console.error('[housing]',e);}},
  interact,open,travelFromMap,isResting:()=>!!rest&&!failed,
  isPlayerResting:id=>!!model?.poses?.some(p=>p.id===id),
  visual(root,dt){queueHomePose(root,homeSpot(!failed&&rest),houseById(!failed&&visit),dt);},
  remoteVisual(root,id,dt,map){const r=!failed&&map==='city'&&model?.poses?.find(p=>p.id===id);queueHomePose(root,homeSpot(r?.spot),houseById(r?.house),dt);},
  debug:()=>({visit,rest,standQueued,model,pending,failed,loading:loader?.stats,scene:partition?.stats,resources:interior?.stats()}),
 };
}
