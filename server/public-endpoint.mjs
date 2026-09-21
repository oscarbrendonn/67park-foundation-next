import {spawn} from 'node:child_process';
import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns';

const repository='repos/oscarbrendonn/67park-foundation-next';
export const endpointBranch='ops-endpoint';
const endpointPath='backend.json';
const tunnelHost=/^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/;

export function endpointManifest(backend,now=new Date()){
 const url=new URL(backend);
 if(url.protocol!=='https:'||!tunnelHost.test(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid public preview origin');
 return {version:1,backend:url.origin,updatedAt:now.toISOString()};
}
export function parseQuickTunnelURL(text){
 const match=String(text).match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com(?=[\s|]|$)/);
 return match?endpointManifest(match[0]).backend:null;
}

// The existing gh login stays in the user's credential store. Never put a
// credential in a command argument, manifest, repository, or service log.
export function githubAPI(route,body,method=body?'POST':'GET'){
 if(!route.startsWith(repository+'/'))throw Error('Endpoint writer repository is fixed');
 return new Promise((resolve,reject)=>{
  const args=['api',route,'--method',method];
  if(body)args.push('--input','-');
  const child=spawn('/opt/homebrew/bin/gh',args,{env:{...process.env,GH_PROMPT_DISABLED:'1'},stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',ended=false;
  const finish=(error,value)=>{if(ended)return;ended=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('GitHub routing update timed out'));},20000);
  child.on('error',()=>finish(Error('GitHub routing updater unavailable')));
  child.stdout.on('data',data=>{stdout+=data;if(stdout.length>262144){child.kill('SIGKILL');finish(Error('GitHub routing response too large'));}});
  child.stderr.on('data',data=>{stderr=(stderr+data).slice(-4096);});
  child.on('close',code=>{
   if(code!==0){const error=Error('GitHub routing request failed');error.status=Number(stderr.match(/HTTP (\d{3})/)?.[1])||0;finish(error);return;}
   try{finish(null,stdout?JSON.parse(stdout):null);}catch{finish(Error('Invalid GitHub routing response'));}
  });
  child.stdin.on('error',()=>{});
  child.stdin.end(body?JSON.stringify(body):undefined);
 });
}

// Only this operational data branch is changed. Main and the gated Pages
// release are never written by the service.
export async function publishEndpoint(backend,{api=githubAPI,now=new Date()}={}){
 const manifest=endpointManifest(backend,now),content=JSON.stringify(manifest,null,2)+'\n';
 let existing;
 try{existing=await api(repository+'/contents/'+endpointPath+'?ref='+endpointBranch);}
 catch(error){if(error.status!==404)throw error;}
 if(existing){
  let old;try{old=JSON.parse(Buffer.from(existing.content,'base64').toString('utf8'));}catch{}
  if(old?.version===1&&old.backend===manifest.backend)return {changed:false,manifest:old};
  if(typeof existing.sha!=='string')throw Error('Missing endpoint manifest revision');
  await api(repository+'/contents/'+endpointPath,{message:'Refresh Mac mini preview endpoint',branch:endpointBranch,sha:existing.sha,content:Buffer.from(content).toString('base64')},'PUT');
 }else{
  let branch;
  try{branch=await api(repository+'/git/ref/heads/'+endpointBranch);}catch(error){if(error.status!==404)throw error;}
  if(branch){
   await api(repository+'/contents/'+endpointPath,{message:'Add Mac mini preview endpoint',branch:endpointBranch,content:Buffer.from(content).toString('base64')},'PUT');
  }else{
   const tree=await api(repository+'/git/trees',{tree:[{path:endpointPath,mode:'100644',type:'blob',content}]});
   const commit=await api(repository+'/git/commits',{message:'Mac mini preview routing data',tree:tree.sha,parents:[]});
   await api(repository+'/git/refs',{ref:'refs/heads/'+endpointBranch,sha:commit.sha});
  }
 }
 return {changed:true,manifest};
}

export function previewHealthy(origin){
 if(origin!=='http://127.0.0.1:8498')endpointManifest(origin);
 // Probe new, allowlisted Cloudflare hostnames with Cloudflare's public DNS.
 // Querying the home router before propagation can cache NXDOMAIN for several
 // minutes for every phone on that router. This resolver is local to this
 // health probe: it does not change the Mac's or the browser's DNS settings.
 const resolver=new dns.Resolver({timeout:1500,tries:1});
 resolver.setServers(['1.1.1.1','1.0.0.1']);
 const lookup=(host,options,callback)=>{
  resolver.resolve4(host,(next,addresses)=>{
   if(next||!addresses?.length)return callback(next||Error('No public preview DNS record'));
   callback(null,options?.all?addresses.map(address=>({address,family:4})):addresses[0],4);
  });
 };
 return new Promise(resolve=>{
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const transport=origin.startsWith('https:')?https:http;
  const request=transport.get(origin+'/health',{lookup,headers:{'Cache-Control':'no-cache'}},response=>{
   if(response.statusCode!==200){response.resume();finish(false);return;}
   let body='';response.setEncoding('utf8');
   response.on('data',chunk=>{body+=chunk;if(body.length>4096){request.destroy();finish(false);}});
   response.on('error',()=>finish(false));
   response.on('end',()=>{
    try{const value=JSON.parse(body);finish(value.ok===true&&value.faults===0&&value.lobbyFaults===0&&value.roomFaults===0);}catch{finish(false);}
   });
  });
  const timer=setTimeout(()=>{request.destroy();finish(false);},6000);
  request.on('error',()=>finish(false));
 });
}
