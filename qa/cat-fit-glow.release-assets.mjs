import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=process.env.PARK_FIT_SHA,out=process.env.PARK_FIT_EVIDENCE;
assert(/^[a-f0-9]{40}$/.test(sha)&&out,'Exact commit and separate evidence path required');
const base='https://oscarbrendonn.github.io/67park-foundation-next/';
const files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',sha],{encoding:'utf8'}).trim().split('\n').filter(f=>!f.startsWith('qa/')&&/\.(js|html|glb|json)$/.test(f));
const report={sha,files:[],pass:false};fs.mkdirSync(out,{recursive:true});
try{
 for(let i=0;i<files.length;i+=4)await Promise.all(files.slice(i,i+4).map(async file=>{
  const alias=file.endsWith('.js')?'cat-fit-glow-1':file.endsWith('.glb')?'head-fit-1':sha;
  const url=base+file+'?v='+alias,response=await fetch(url,{signal:AbortSignal.timeout(45000)});assert(response.ok,url+' HTTP '+response.status);
  const actual=Buffer.from(await response.arrayBuffer()),expected=execFileSync('git',['show',sha+':'+file],{maxBuffer:15e6});
  assert(actual.equals(expected),file+' must equal exact commit bytes');
  if(file.endsWith('.html')&&!file.startsWith('cat-character/')){
   const match=actual.toString().match(/<script type="importmap">([\s\S]*?)<\/script>/);assert(match,file);
   const imports=JSON.parse(match[1]).imports;
   for(const asset of files.filter(f=>f.endsWith('.js'))){const bare='/67park-foundation-next/'+asset;for(const [key,value] of Object.entries(imports))if(key.split('?')[0]===bare)assert.equal(value,bare+'?v=cat-fit-glow-1',file+': '+key)}
  }
  report.files.push({file,url,bytes:actual.length,sha256:createHash('sha256').update(actual).digest('hex')});
 }));
 report.pass=true;console.log('CAT_FIT_GLOW_LIVE_ASSETS_PASS',JSON.stringify({sha,files:files.length}));
}catch(error){report.failure=String(error);throw error;}
finally{fs.writeFileSync(out+'/assets.json',JSON.stringify(report,null,2))}
