// Physical Android QA only: attach to the isolated game tab, never emulate a
// phone or connect to unrelated tabs. Closing this socket does not close Chrome.
// Never query /json/protocol on this Android build: a diagnostic request to it
// coincided with a native browser SIGTRAP. Consult the bundled CDP types instead.
import WebSocket from 'ws';
import fs from 'node:fs';
import path from 'node:path';
export async function androidPage(origin=process.env.PARK_ANDROID_ORIGIN||'http://127.0.0.1:8521'){
 const address=process.env.PARK_ANDROID_CDP||'http://127.0.0.1:9223';
 const version=await(await fetch(address+'/json/version')).json();
 if(!/Android/.test(version['User-Agent']||''))throw Error('A physical Android Chrome connection is required');
 const tabs=await(await fetch(address+'/json/list')).json();
 const tab=tabs.find(t=>t.type==='page'&&t.url.startsWith(origin+'/67park-foundation-next/'));
 if(!tab)throw Error('The isolated Android game tab is not open');
 const ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map();let next=0;
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.terminate();reject(Error('Android debugger timeout'))},10000);ws.once('open',()=>{clearTimeout(timer);resolve()});ws.once('error',e=>{clearTimeout(timer);reject(e)})});
 ws.on('message',wire=>{const m=JSON.parse(wire);if(!m.id)return;const row=pending.get(m.id);if(!row)return;pending.delete(m.id);clearTimeout(row.timer);m.error?row.reject(Error(m.error.message)):row.resolve(m.result)});
 ws.on('close',()=>{for(const row of pending.values()){clearTimeout(row.timer);row.reject(Error('Android debugger disconnected'))}pending.clear()});
 const call=(method,params={},timeout=20000)=>new Promise((resolve,reject)=>{
  const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},timeout);
  pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));
 });
 return {call,browser:version.Browser,userAgent:version['User-Agent'],close:()=>ws.close(),async evaluate(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result?.value}};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 const page=await androidPage();
 try{
  const [command,arg]=process.argv.slice(2);
  if(command==='eval')console.log(JSON.stringify(await page.evaluate(arg)));
  else if(command==='screenshot'){
   const output=path.resolve(arg),directory=path.resolve('.qa-results')+path.sep;
   if(!output.startsWith(directory)||!output.endsWith('.png'))throw Error('Screenshots must be PNGs in .qa-results');
   const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},60000);
   fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.from(shot.data,'base64'));console.log(output);
  }else throw Error('Use eval or screenshot');
 }finally{page.close()}
}
