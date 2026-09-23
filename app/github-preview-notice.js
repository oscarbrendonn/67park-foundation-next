import{applyParkWaterSurface}from'./park-water-surface.js?v=park-water-5-all-swim';
const notice=document.createElement('aside');
notice.id='github-preview-notice';notice.setAttribute('role','status');notice.textContent='Online test · Connecting…';
const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./responsive-shell.css?v=mobile-29',import.meta.url).href;document.head.append(sheet);document.body.append(notice);
const localPractice=new URLSearchParams(location.search).get('practice')==='1'&&(/\/(sports|race|rockets|balloon)\//.test(location.pathname)||new URLSearchParams(location.search).get('map')==='obstacle');
const archivedMap=new URLSearchParams(location.search).get('legacyGames')==='1';
if(archivedMap){const back=document.createElement('a');back.href=new URL('../archive-games.html',import.meta.url).href;back.textContent='← Prototype archive';back.style.cssText='position:fixed;z-index:10000;left:16px;top:84px;background:#fff9eb;color:#384845;border:1px solid #ded7c8;border-radius:18px;padding:12px 16px;font:700 13px system-ui;text-decoration:none';document.body.append(back);}
let last='';
const update=()=>{
 const client=window.__candyOnline,net=window.__eggyNet;
 const online=!!client?.data?.connected;
 // Standalone Play/minigame pages have a community socket, not an island presence socket.
 const standalone=/\/(play|sports|race|rockets|balloon)\/(index\.html)?$/.test(location.pathname);
 const lobby=standalone||!!net?.connected;
 const displaced=net?.displaced||client?.data?.error?.includes('another tab');
 const label=archivedMap?'Archived prototype · Not an active online mini-game':localPractice?'Bot practice · Local game':displaced?'Opened in another tab · Refresh here to switch back':online&&lobby?'Online test · Mac mini connected':'Online test · Server disconnected — reconnecting…';
 if(label!==last){notice.textContent=label;notice.dataset.connected=String(!localPractice&&!displaced&&online&&lobby);last=label;}
};
update();
let timer=setInterval(update,1000);
window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;});
window.addEventListener('pageshow',()=>{update();if(timer===null)timer=setInterval(update,1000);});
const poolDeadline=performance.now()+180000;
const installPool=()=>{const world=window.__islandWorld;if(world?.ready&&world.terrain){try{applyParkWaterSurface(world)}catch(error){console.error(error)}return}if(performance.now()<poolDeadline)setTimeout(installPool,120)};
installPool();
