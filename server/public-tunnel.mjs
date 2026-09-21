import {spawn} from 'node:child_process';
import {parseQuickTunnelURL,publishEndpoint,previewHealthy} from './public-endpoint.mjs';

const log=(...values)=>console.log(new Date().toISOString(),...values);
const tunnel=spawn('/opt/homebrew/bin/cloudflared',['tunnel','--no-autoupdate','--url','http://127.0.0.1:8498','--protocol','quic'],{stdio:['ignore','pipe','pipe']});
let backend=null,published=false,publishing=false,closing=false,buffer='';
async function publishWhenHealthy(){
 if(!backend||published||publishing||closing)return;
 publishing=true;
 try{
  if(!await previewHealthy('http://127.0.0.1:8498')||!await previewHealthy(backend))return;
  const result=await publishEndpoint(backend);
  published=true;log('Public preview routing ready:',result.manifest.backend);
 }catch(error){log('Routing not ready; will retry:',error.message,error.status||'');}
 finally{publishing=false;}
}
function output(data){
 const text=data.toString();process.stdout.write(text);
 buffer=(buffer+text).slice(-8192);
 if(!backend){backend=parseQuickTunnelURL(buffer);if(backend)void publishWhenHealthy();}
}
tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);
const retry=setInterval(()=>void publishWhenHealthy(),10000);
tunnel.on('error',()=>{log('Cloudflare tunnel could not start');clearInterval(retry);process.exit(1);});
tunnel.on('close',code=>{clearInterval(retry);log('Cloudflare tunnel exited; launchd owns recovery');process.exit(closing?0:(code||1));});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(closing)return;closing=true;clearInterval(retry);tunnel.kill('SIGTERM');setTimeout(()=>process.exit(1),8000).unref();});
