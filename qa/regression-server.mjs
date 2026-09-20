import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPreviewServer} from '../server/create-server.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),port=Number(process.env.PARK_QA_PORT||8499),origin='http://127.0.0.1:'+port;
const app=await createPreviewServer({origins:[origin],dataDir:null});
const handlers=app.server.listeners('request');app.server.removeAllListeners('request');
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
app.server.on('request',(req,res)=>{
 if(req.url.startsWith('/kimi/')||req.url==='/health'){
  // Same-origin GETs omit Origin. This loopback-only QA gateway supplies its
  // own origin; the public cross-origin backend keeps its strict allowlist.
  if(!req.headers.origin&&req.headers.host==='127.0.0.1:'+port)req.headers.origin=origin;
  for(const f of handlers)f.call(app.server,req,res);return;
 }
 if(req.url.includes('/app/preview-network-config.js')){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end(`export const PREVIEW_BACKEND=${JSON.stringify(origin)};export const PREVIEW_VARIANT="kimi";`);return;}
 let name;try{name=decodeURIComponent(new URL(req.url,origin).pathname).replace(/^\/67park-foundation-next\//,'/');}catch{res.writeHead(400);res.end();return;}
 if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||/^\/(?:server|qa|data|node_modules|\.git)(?:\/|$)/.test(name)){res.writeHead(403);res.end();return;}
 fs.stat(file,(error,s)=>{if(error||!s.isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);});
});
app.server.listen(port,'127.0.0.1',()=>console.log('REGRESSION_READY '+origin+'/67park-foundation-next/'));
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>app.close().then(()=>process.exit(0)));
