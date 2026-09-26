import {k as controls,Aa as wardrobe} from '../chunk-G7D6MVRW.js?v=online-next-1';
import {createTargetBooth} from './target-club-model.js?v=target-club-1';
import {createTargetRound,startTargetRound,advanceTargetRound,targetPositions,shootTarget,nearTargetBooth,ROUND_SECONDS} from './target-club-rules.js?v=target-club-1';
import {createTargetWeeklyClient} from './target-club-weekly.js?v=target-club-1';
import {createTargetLobby} from './target-club-lobby.js?v=target-club-1';
import {createTargetGallery} from './target-club-gallery.js?v=target-club-1';

export function createTargetClub({world,state,sound=()=>{},reducedMotion=()=>false,online}){
 let current=null,model=null,site=null,body=null,enabled=false,round=createTargetRound(),panel=null,canvas=null,cover=null,hint=null;
 let raf=0,lastFrame=0,paused=false,aim={x:450,y:300},flash=null,beforeBlocked=false,previousFocus=null,best=0,ownsControls=false;
 let ranked=false,ranking=null,starting=false,openNonce=0,gallery=null,weeklyMessage='Connect to see this week’s players.';
 const lobby=createTargetLobby({sync:()=>weekly.sync()});
 const weekly=createTargetWeeklyClient({online,onBoard:value=>{ranking=value;weeklyMessage=value.message||'';renderBoard();},onScore:m=>{if(ranked){round.score=m.score;round.hits=m.hits;}},onLost:message=>{if(ranked){ranked=false;round.phase='ready';showCard('Weekly round stopped',message,'Play practice');}weeklyMessage=message;renderBoard();}});
 const abort=new AbortController(),signal=abort.signal;
 try{best=Math.max(0,Math.min(100000,Number(localStorage.getItem('67park.target-club.best'))||0));}catch{}
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./target-club.css?v=target-club-1',import.meta.url).href;document.head.append(sheet);
 function release(){window.dispatchEvent(new Event('park:release-controls'));const i=window.__eggyInput?.input;if(i){i.x=i.z=0;i.jumpQueued=false;i.run=false;}}
 function available(){
  const s=state();return enabled&&model&&nearTargetBooth(body?.translation?.(),site)&&s?.grounded&&!controls.blocked&&!wardrobe.open&&!document.hidden&&!document.querySelector('dialog[open],#party-settings:not([hidden]),.wardrobe')&&!window.__candy?.state?.().mounted&&!world()?.homeScene?.active;
 }
 function buildUI(){
  if(panel)return;
  panel=document.createElement('dialog');panel.id='target-club';panel.setAttribute('aria-labelledby','target-club-title');
  panel.innerHTML='<header><div><small>67PARK · FAIRGROUND</small><h2 id="target-club-title">Target Club</h2></div><button class="tc-close" type="button" aria-label="Leave Target Club">Leave ×</button></header><div class="tc-stats"><span>Score<b data-score>0</b></span><span>Time<b data-time>30</b></span><span>Your best<b data-best>0</b></span></div><div class="tc-stage"><canvas width="900" height="600" tabindex="0" aria-label="Shooting gallery. Aim with the mouse or arrow keys; click, tap or press Space to shoot."></canvas><div class="tc-cover"><div class="tc-card"><h3></h3><p></p><button type="button" data-start>Play · 30 seconds</button></div></div></div><footer>Tap a target or aim & click · Centre 100 / Ring 25<br>Arrows + Space also work · Esc to leave</footer>';
  document.body.append(panel);canvas=panel.querySelector('canvas');cover=panel.querySelector('.tc-cover');
  const weeklyButton=document.createElement('button');weeklyButton.type='button';weeklyButton.dataset.ranked='';weeklyButton.textContent='Play weekly round';weeklyButton.disabled=true;cover.querySelector('[data-start]').before(weeklyButton);
  // Keep the entire gallery visible on entry: the action card sits below it.
  panel.querySelector('.tc-stage').after(cover);
  panel.querySelector('[data-best]').parentElement.firstChild.textContent='Practice best';
  const actions=document.createElement('div');actions.className='tc-actions';weeklyButton.before(actions);actions.append(weeklyButton,cover.querySelector('[data-start]'));
  const status=document.createElement('p');status.dataset.weekStatus='';status.setAttribute('role','status');cover.querySelector('.tc-card').append(status);
  weeklyButton.addEventListener('click',async()=>{
   if(starting)return;starting=true;const nonce=openNonce;weeklyButton.disabled=true;weeklyMessage='Starting a server-verified round…';renderBoard();
   try{const m=await weekly.start();if(!panel.open||nonce!==openNonce){weekly.cancel();return;}round=startTargetRound();round.seed=m.seed;ranked=true;paused=false;flash=null;lastFrame=performance.now();cover.hidden=true;weeklyMessage='Weekly round · Leaving or switching away cancels this attempt.';release();canvas.focus({preventScroll:true});}
   catch(e){weeklyMessage=e.message;}finally{starting=false;renderBoard();}
  },{signal});
  panel.querySelector('.tc-close').addEventListener('click',close,{signal});
  panel.addEventListener('cancel',e=>{e.preventDefault();close();},{signal});
  panel.addEventListener('close',cleanupOpen,{signal});
  panel.querySelector('[data-start]').addEventListener('click',()=>{
   if(paused){paused=false;lastFrame=performance.now();}else{weekly.cancel();ranked=false;round=startTargetRound();flash=null;}
   cover.hidden=true;release();canvas.focus({preventScroll:true});
  },{signal});
  const position=e=>{const r=canvas.getBoundingClientRect();aim={x:(e.clientX-r.left)*900/r.width,y:(e.clientY-r.top)*600/r.height};};
  canvas.addEventListener('pointermove',position,{signal});
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;e.preventDefault();e.stopPropagation();position(e);fire();canvas.focus({preventScroll:true});},{signal});
  window.addEventListener('keydown',e=>{
   if(!panel.open)return;
   if(e.key==='Escape'){e.preventDefault();close();}
   else if(e.target===canvas){
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)fire();}
    const dirs={ArrowLeft:[-18,0],ArrowRight:[18,0],ArrowUp:[0,-18],ArrowDown:[0,18]},d=dirs[e.key];
    if(d){e.preventDefault();aim.x=Math.max(0,Math.min(900,aim.x+d[0]));aim.y=Math.max(0,Math.min(600,aim.y+d[1]));}
   }e.stopImmediatePropagation();
  },{capture:true,signal});
  window.addEventListener('keyup',e=>{if(panel.open)e.stopImmediatePropagation();},{capture:true,signal});
  window.addEventListener('blur',pause,{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();},{signal});
 }
 function renderBoard(){lobby.render(ranking,ranking?.available?'':weeklyMessage);if(!panel)return;
  panel.querySelector('[data-week-status]').textContent=weeklyMessage||(ranking?.available?'Weekly scores appear in Play & friends → Leaderboard.':'');
  panel.querySelector('[data-ranked]').disabled=starting||!ranking?.available;panel.querySelector('[data-ranked]').hidden=paused;
  panel.querySelector('[data-start]').disabled=starting;
 }
 function showCard(title,text,button){cover.hidden=false;cover.querySelector('h3').textContent=title;cover.querySelector('p').textContent=text;cover.querySelector('[data-start]').textContent=button;renderBoard();}
 function pause(){if(!panel?.open||round.phase!=='playing'||paused)return;
  if(ranked){weekly.cancel();ranked=false;round.phase='ready';release();showCard('Weekly round cancelled','Keep the game open for the full 30 seconds. This attempt was not added to the table.','Play practice');return;}
  paused=true;release();showCard('Taking a break','Your practice timer is paused. Ready when you are.','Resume');}
 function fire(){if(paused)return;const result=shootTarget(round,aim.x,aim.y,ranked?false:reducedMotion());if(!result)return;if(ranked)weekly.shoot(aim.x,aim.y,round.time);flash={...result,at:round.time};sound(result.points?'note':'throw');}
 function cleanupOpen(){if(panel?.open||!ownsControls)return;openNonce++;weekly.cancel();ranked=false;ownsControls=false;cancelAnimationFrame(raf);raf=0;gallery?.dispose();gallery=null;release();controls.blocked=beforeBlocked||!!wardrobe.open||!!document.querySelector('dialog[open]');previousFocus?.isConnected&&previousFocus.focus({preventScroll:true});}
 function close(){if(!panel?.open)return;panel.close();cleanupOpen();}
 function interact(){
  if(panel?.open)return true;
  if(!available())return false;
  buildUI();previousFocus=document.activeElement;beforeBlocked=controls.blocked;ownsControls=true;controls.blocked=true;release();
  openNonce++;round=createTargetRound();ranked=false;paused=false;flash=null;hint&&(hint.hidden=true);
  showCard('Take your best shot','Six targets. Thirty seconds. Aim for the centre and climb the weekly leaderboard.','Play practice');
  panel.showModal();try{gallery=createTargetGallery(canvas);}catch(e){close();console.error('Target Club gallery unavailable',e);return false;}weeklyMessage='Loading this week’s players…';renderBoard();weekly.sync().catch(e=>{ranking=null;weeklyMessage=e.message;renderBoard();});lastFrame=performance.now();raf=requestAnimationFrame(frame);return true;
 }
 function frame(now){
  if(!panel.open)return;
  const dt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;
  if(!paused&&!document.hidden){
   const playing=round.phase==='playing';advanceTargetRound(round,dt);
   if(playing&&round.phase==='finished'){
    if(ranked){const nonce=openNonce,finishedRound=round;showCard('Checking your score','Waiting for the server. Your weekly score is not saved yet.','Play practice');weekly.finish().then(m=>{if(!panel.open||nonce!==openNonce||round!==finishedRound)return;ranked=false;round.score=m.score;showCard('Weekly score saved',`${m.score} points · Your best completed score is in this week’s table.`,'Play practice');}).catch(e=>{if(!panel.open||nonce!==openNonce||round!==finishedRound)return;ranked=false;showCard('Score not confirmed',e.message,'Play practice');});}
    else{
    if(round.score>best){best=round.score;try{localStorage.setItem('67park.target-club.best',String(best));}catch{}}
    showCard(round.score?'Nice shooting!':'One more try?',`${round.score} points · ${round.hits} hits / ${round.shots} shots. Best score is saved on this browser.`,'Play again');
    cover.querySelector('[data-start]').focus({preventScroll:true});
    }
   }
  }
  panel.querySelector('[data-score]').textContent=String(round.score);panel.querySelector('[data-time]').textContent=String(Math.ceil(ROUND_SECONDS-round.time));panel.querySelector('[data-best]').textContent=String(best);
  draw();raf=requestAnimationFrame(frame);
 }
 function draw(){
  gallery?.render(round,aim,flash,paused,reducedMotion(),ranked);
 }
 function step(nextBody,dt,map){
  weekly.step();
  body=nextBody;enabled=map==='city';const w=world();
  lobby.step(enabled);
  if(current!==w){close();model?.dispose();model=null;site=null;current=w;}
  if(!enabled){close();if(hint)hint.hidden=true;return;}
  if(!model&&w?.ready){
   const raw=w.renderer?.domElement?.dataset.lunapark77;if(!raw)return;
   site=JSON.parse(raw).placements.find(p=>p.asset==='kiosk');if(!site)return;
   model=createTargetBooth(site);w.scene.add(model.root);
   if(!hint){hint=document.createElement('button');hint.id='target-club-hint';hint.textContent='Target Club · E / Interact';hint.hidden=true;hint.addEventListener('click',interact,{signal});document.body.append(hint);}
  }
  if(panel?.open&&(!enabled||w?.homeScene?.active))close();
  if(hint)hint.hidden=!available();
 }
 return {step,interact,close,get active(){return !!panel?.open;},get snapshot(){return {...round,paused,best,site,ranked,ranking,gallery:gallery?.info||null};},dispose(){close();weekly.dispose();lobby.dispose();abort.abort();model?.dispose();panel?.remove();hint?.remove();sheet.remove();}};
}
