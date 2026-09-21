import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createPreviewServer} from '../server/create-server.mjs';

const origin='https://qa-restart.example';

async function start(dataDir){
 const app=await createPreviewServer({origins:[origin],dataDir,worldSource:null});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const {port}=app.server.address();
 return {app,endpoint:`http://127.0.0.1:${port}`};
}

async function session(endpoint,token){
 const response=await fetch(endpoint+'/kimi/api/session?protocol=1',{headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{})}});
 assert.equal(response.status,200);
 return response.json();
}

function memorySocket(){
 const messages=[];
 return {readyState:1,bufferedAmount:0,messages,send(value){messages.push(JSON.parse(value));},close(){this.readyState=3;},on(){}};
}

function lastResult(socket){return socket.messages.findLast(message=>message.t==='house.result');}

test('preview restart retains authenticated guest identity and safety preferences, but not housing occupancy',async()=>{
 const dataDir=mkdtempSync(path.join(tmpdir(),'67park-backend-restart-'));
 let first;
 try{
  first=await start(dataDir);
  const guest=await session(first.endpoint),other=await session(first.endpoint);
  const hub=first.app.hubs.get('kimi'),player=hub.lookup(guest.token),socket=memorySocket();
  player.online=socket;

  hub.message(player,{t:'safety.set',kind:'blocked',target:other.id,value:true});
  hub.message(player,{t:'house.claim',house:'H01',request:'before-restart'});
  assert.equal(lastResult(socket)?.ok,true);
  await first.app.close();
  first=null;

  const restarted=await start(dataDir);
  try{
   const returned=await session(restarted.endpoint,guest.token);
   assert.equal(returned.id,guest.id);
   assert.equal(returned.friendCode,guest.friendCode);

   const nextHub=restarted.app.hubs.get('kimi'),returnedPlayer=nextHub.lookup(guest.token);
   assert.equal(nextHub.safety.blocked(returnedPlayer.id,other.id),true);

   const nextSocket=memorySocket();
   returnedPlayer.online=nextSocket;
   nextHub.message(returnedPlayer,{t:'house.claim',house:'H01',request:'after-restart'});
   assert.equal(lastResult(nextSocket)?.ok,true,'housing claims must be released when the authority restarts');
  }finally{await restarted.app.close();}
 }finally{
  if(first)await first.app.close();
  rmSync(dataDir,{recursive:true,force:true});
 }
});
