// Explicit, opt-in destructive process test, only when the preview has no
// connected players. Never run as part of routine unit tests or a monitor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const exec=promisify(execFile),origin='http://127.0.0.1:8498';
if(process.env.ALLOW_PREVIEW_RESTART_TEST!=='1')throw Error('Requires explicit ALLOW_PREVIEW_RESTART_TEST=1');
const service='gui/'+process.getuid()+'/com.67park.foundation-next.backend';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const health=async()=>{const r=await fetch(origin+'/health',{signal:AbortSignal.timeout(2000)});assert(r.ok);return r.json();};
const pid=async()=>Number((await exec('/bin/launchctl',['print',service])).stdout.match(/\n\s*pid = (\d+)/)?.[1]);
const guest=async token=>{
 const r=await fetch(origin+'/kimi/api/session?protocol=1',{headers:{Origin:'https://oscarbrendonn.github.io',...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(3000)});
 assert(r.ok);return r.json();
};
const before=await health();assert.equal(before.variants.kimi.online,0,'Do not interrupt active players');
const oldPID=await pid();assert(oldPID>1);
const session=await guest();
const tokenHash=createHash('sha256').update(session.token).digest('hex');
let persisted=false;
for(let i=0;i<40;i++){
 const data=await fs.readFile(new URL('../data/public/social.json',import.meta.url),'utf8');
 if(data.includes(tokenHash)){persisted=true;break;}await pause(250);
}
assert(persisted,'Guest identity must be on disk before simulating a crash');
const started=Date.now();
await exec('/bin/launchctl',['kill','SIGKILL',service]);
let newPID,after;
for(let i=0;i<80;i++){
 await pause(500);
 try{newPID=await pid();if(newPID&&newPID!==oldPID){after=await health();break;}}catch{}
}
assert(newPID&&newPID!==oldPID&&after?.ok,'Managed backend did not recover');
const recovered=await guest(session.token);
assert.equal(recovered.id,session.id);assert.equal(recovered.friendCode,session.friendCode);
assert.equal(after.faults,0);assert.equal(after.lobbyFaults,0);assert.equal(after.roomFaults,0);
const result={pass:true,test:'managed SIGKILL recovery',elapsedMs:Date.now()-started,oldPID,newPID,sameGuest:true,sameFriendCode:true,faults:after.faults};
await fs.writeFile(new URL('../.qa-results/managed-backend-restart.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
