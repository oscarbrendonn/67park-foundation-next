export function createTargetWeeklyClient({online=()=>window.__candyOnline,onBoard=()=>{},onScore=()=>{},onLost=()=>{}}={}){
 let socket=null,seq=0,run=null,shot=0;const pending=new Map();
 function detach(){socket?.removeEventListener('message',receive);socket?.removeEventListener('close',lost);for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Connection changed. This score was not confirmed.'));}pending.clear();}
 function lost(){const active=!!run;run=null;detach();socket=null;if(active)onLost('Connection lost. This round will not enter the weekly table.');}
 function step(){const next=online()?.ws;if(next!==socket){const active=!!run;run=null;detach();socket=next;socket?.addEventListener('message',receive);socket?.addEventListener('close',lost);if(active)onLost('Connection changed. Please start a new weekly round.');}}
 function receive(event){let m;try{m=JSON.parse(event.data);}catch{return;}if(m.t!=='target.reply')return;const p=pending.get(m.request);if(!p)return;clearTimeout(p.timer);pending.delete(m.request);
  if(!m.ok){p.reject(Error(m.message||'Weekly score was not accepted.'));return;}
  if(m.board)onBoard(m.board);p.resolve(m);
 }
 function request(action,extra={}){step();return new Promise((resolve,reject)=>{
  if(!online()?.data.connected||!socket){reject(Error('Connect to the island to use the weekly table.'));return;}
  const id='tc-'+ ++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('Weekly server did not answer. Practice is still available.'));},4500);
  pending.set(id,{resolve,reject,timer});if(!online().send({t:'target.'+action,request:id,...extra})){clearTimeout(timer);pending.delete(id);reject(Error('Could not send to the weekly server.'));}
 });}
 return {step,sync:()=>request('board'),async start(){const m=await request('start');run=m.run;shot=0;return m;},
  shoot(x,y,time){if(!run)return;const id=run;request('shot',{run:id,seq:++shot,x,y,time}).then(m=>{if(run===id)onScore(m);}).catch(e=>{if(run===id){run=null;online()?.send({t:'target.cancel',run:id});onLost(e.message);}});},
  async finish(){if(!run)throw Error('No connected weekly round.');const id=run;try{return await request('finish',{run:id});}finally{if(run===id)run=null;}},
  cancel(){if(run)online()?.send({t:'target.cancel',run});run=null;},dispose(){this.cancel();detach();socket=null;},get active(){return !!run;}};
}
