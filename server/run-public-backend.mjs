import {spawn} from 'node:child_process';
import {mkdir,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createPreviewServer} from './create-server.mjs';

// This entry point is only for the user's Mac mini preview service. Data must
// survive a process restart; never silently fall back to an in-memory store.
const dataDir=process.env.PARK_DATA_DIR;
if(!dataDir||!path.isAbsolute(dataDir))throw Error('PARK_DATA_DIR must be an absolute persistent directory');
await mkdir(dataDir,{recursive:true,mode:0o700});
await access(dataDir,constants.W_OK);
const app=await createPreviewServer({dataDir});
let awake;
if(process.platform==='darwin'){
 awake=spawn('/usr/bin/caffeinate',['-i','-s','-w',String(process.pid)],{stdio:'ignore'});
 awake.on('error',()=>console.error('Could not acquire the preview-only wake assertion'));
}
app.server.on('error',error=>{console.error('Preview listen failed:',error.code||error.name);process.exitCode=1;void shutdown();});
app.server.listen(Number(process.env.PREVIEW_PORT||8498),'127.0.0.1',()=>console.log(new Date().toISOString(),'67Park persistent preview ready on',app.server.address().port));
let closing=false;
async function shutdown(){
 if(closing)return;closing=true;
 const deadline=setTimeout(()=>process.exit(1),8000);deadline.unref();
 try{await app.close();}finally{awake?.kill('SIGTERM');clearTimeout(deadline);process.exit(process.exitCode||0);}
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void shutdown());
