import * as T from 'three';
import {LOBBY_COURTS,courtContains,constrainCourtBall} from './lobby-court-rules.js?v=english-ui-1';

export function installLobbyCourts(world){
 if(world.lobbyCourts)return world;
 const balls=[];
 for(const c of LOBBY_COURTS){const object=world.scene.getObjectByName(c.mesh);if(!object)continue;
  const parent=object.parent;object.updateWorldMatrix(true,true);world.scene.attach(object);
  object.traverse(o=>{o.matrixAutoUpdate=true;o.matrixWorldAutoUpdate=true;});object.userData.interactive=true;
  balls.push({c,object,parent,y:object.position.y,ready:false});
 }
 const panel=document.createElement('section');panel.className='lobby-court-panel';panel.hidden=true;panel.setAttribute('aria-label','Court free play');
 panel.innerHTML='<strong></strong><span>Lobby · Free play</span><small>Walk into the ball to move it. It stays inside the court.</small><button type="button">Play a match ↗</button>';
 const style=document.createElement('style');style.textContent='.lobby-court-panel{position:fixed;z-index:18;left:50%;bottom:150px;transform:translateX(-50%);width:min(235px,45vw);padding:12px;border:1px solid #fff9ed;border-radius:20px;background:#fff7e8f2;color:#4b5550;box-shadow:0 5px 0 #92857224;font:12px system-ui;text-align:center;pointer-events:auto}.lobby-court-panel[hidden]{display:none}.lobby-court-panel strong,.lobby-court-panel span,.lobby-court-panel small{display:block;margin-bottom:5px}.lobby-court-panel small{font-size:10px;line-height:1.4}.lobby-court-panel button{border:0;border-radius:12px;background:#f7d967;color:#494737;font:700 12px system-ui;padding:10px;width:100%;cursor:pointer;touch-action:manipulation}@media(min-width:800px){.lobby-court-panel{bottom:105px;width:235px}}';
 document.head.append(style);document.body.append(panel);let selected=null,overview=false,uiClock=0;
 panel.addEventListener('pointerdown',e=>e.stopPropagation());
 panel.querySelector('button').addEventListener('click',()=>{if(selected)window.dispatchEvent(new CustomEvent('candy:online-open',{detail:{mode:selected.id}}));});
 const update=world.update.bind(world),setOverview=world.setOverview?.bind(world),dispose=world.dispose.bind(world);
 world.setOverview=value=>{overview=value;setOverview?.(value);};
 world.update=(dt,actor)=>{
  update(dt,actor);const online=window.__candyOnline,s=online?.world,now=performance.now();
  const fresh=online?.data.connected&&s?.island===online.data.island?.code&&now-s.received<1000;
  for(const b of balls){const state=fresh?s.balls?.find(v=>v.id===b.c.id):null;if(!state)continue;
   const next=constrainCourtBall({...state,x:state.x+state.vx*Math.min(.08,(now-s.received)/1000),z:state.z+state.vz*Math.min(.08,(now-s.received)/1000)},b.c);
   const k=b.ready?1-Math.exp(-20*Math.min(dt,.05)):1,ox=b.object.position.x,oz=b.object.position.z;
   b.object.position.x+=(next.x-ox)*k;b.object.position.z+=(next.z-oz)*k;b.object.position.y=b.y;
   if(b.ready){b.object.rotation.z-=(b.object.position.x-ox)/b.c.radius;b.object.rotation.x+=(b.object.position.z-oz)/b.c.radius;}
   b.ready=true;b.object.updateMatrixWorld(true);
  }
  uiClock+=dt;if(uiClock<.1)return;uiClock=0;
  const p=actor?.body?.translation?.(),blocked=overview||document.hidden||!!document.querySelector('dialog[open]')||!!window.__candy?.state?.().mounted;
  selected=!blocked&&p?LOBBY_COURTS.find(c=>courtContains(c,p.x,p.z,1)||Math.hypot(p.x-c.entry[0],p.z-c.entry[1])<5):null;
  panel.hidden=!selected;if(selected){panel.querySelector('strong').textContent=selected.label;panel.querySelector('small').textContent=fresh?'Walk into the ball to move it. It stays inside the court.':'Waiting for the lobby connection…';}
 };
 world.lobbyCourts={balls,stats:{shared:true,bounded:true,count:balls.length}};
 world.renderer.domElement.dataset.lobbyCourts=JSON.stringify(world.lobbyCourts.stats);
 world.dispose=()=>{panel.remove();style.remove();for(const b of balls)b.parent.attach(b.object);dispose();};
 return world;
}
