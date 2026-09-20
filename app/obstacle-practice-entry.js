export function installObstaclePractice({store,start,wardrobe,subscribeWardrobe}){
 const params=new URLSearchParams(location.search);
 if(params.get('map')!=='obstacle'||params.get('practice')!=='1')return;
 const host=document.createElement('section');host.className='obstacle-practice-entry';host.setAttribute('aria-label','Obstacle Dash practice');
 const title=document.createElement('strong');title.textContent='Obstacle Dash';
 const info=document.createElement('span');info.textContent='Race against 4 bots · Move + Jump';
 const button=document.createElement('button');button.textContent='Start race';button.type='button';
 const back=document.createElement('a');back.href='/67park-foundation-next/?v=release-40c';back.textContent='Back to island';
 let starting=false;
 button.onclick=()=>{
  if(starting||wardrobe.open||!['roam','ready'].includes(store.getState().phase))return;
  starting=true;button.disabled=true;button.textContent='Starting…';
  try{start();}catch(error){starting=false;button.disabled=false;button.textContent='Start race';throw error;}
 };
 host.append(title,info,button,back);document.body.append(host);
 const update=()=>{
  const phase=store.getState().phase;
  if(!['roam','ready'].includes(phase)){starting=false;button.disabled=false;button.textContent='Start race';}
  host.hidden=wardrobe.open||!['roam','ready'].includes(phase);
 };
 const unsub=store.subscribe(update),unsubWardrobe=subscribeWardrobe(update);update();
 window.addEventListener('pagehide',event=>{if(event.persisted)return;unsub();unsubWardrobe?.();host.remove();});
}
