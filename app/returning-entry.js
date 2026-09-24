// Returning players keep their selection; loading must never be a blank wardrobe.
export function returningEntryView(entry,avatar,now=Date.now()){
 const elapsed=Math.max(0,now-(entry.entryStarted||now));
 const failed=entry.status==='error'||avatar.status==='error';
 const delayed=!!entry.slow||elapsed>=20000;
 const timedOut=elapsed>=180000&&!(entry.status==='ready'&&avatar.status==='ready');
 const title=failed?'Let’s try again':timedOut?'Loading is taking longer than expected':'Welcome back';
 const stage=failed?'Your saved character is safe. You can retry below.':entry.status==='ready'&&avatar.status!=='ready'?'Preparing your saved character':entry.stage||'Opening the park';
 return {failed,delayed,timedOut,title,stage,retry:failed||delayed||timedOut,
  progress:Math.max(0,Math.min(1,Number(entry.progress)||0)),
  download:entry.downloadTotal>0?Math.min(entry.downloadBytes||0,entry.downloadTotal)/1048576:null,
  total:entry.downloadTotal>0?entry.downloadTotal/1048576:null};
}
export function createReturningEntry(React){
 return function ReturningEntry({entry,avatar,onRetry,onChoose}){
  const [now,setNow]=React.useState(Date.now);
  React.useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const s=returningEntryView(entry,avatar,now),h=React.createElement;
  return h('section',{className:'return-entry','aria-label':'Returning player loading','data-return-entry':s.failed?'error':s.timedOut?'timeout':'loading'},
   h('img',{className:'return-entry-logo',src:new URL('../brand/67park-logo.png',import.meta.url).href,alt:'67Park'}),
   h('h1',null,s.title),
   h('p',{className:'return-entry-stage',role:'status','aria-live':'polite'},s.stage),
   h('progress',{max:1,value:s.progress,'aria-label':'Park preparation progress'}),
   h('p',{className:'return-entry-detail'},entry.status==='ready'&&avatar.status!=='ready'?'The park is ready. Finishing your character…':Math.round(s.progress*100)+'% · '+(entry.step===14?'Finishing graphics':s.download===null?'Preparing your park':'Map files: '+s.download.toFixed(1)+' / '+s.total.toFixed(1)+' MiB')),
   (s.delayed||s.failed||s.timedOut)&&h('p',{className:'return-entry-hint'},s.failed?'Check your connection, then try again.':'The first visit can take longer. Keep this page open while the park loads.'),
   h('div',{className:'return-entry-actions'},
    s.retry&&h('button',{type:'button',onClick:onRetry},avatar.status==='error'?'Retry character':'Retry loading'),
    h('button',{type:'button',className:'return-entry-secondary',onClick:onChoose},'Back to wardrobe'))
  );
 };
}
