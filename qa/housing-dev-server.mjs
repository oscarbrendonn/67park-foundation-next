// Isolated QA gateway; never attaches test players to the production server.
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {installHousing} from '../server/housing.mjs';
import {installLobbyLoadGuard} from '../server/lobby-load-guard.mjs';
if(!process.env.PARK_SERVER_FACTORY)throw Error('PARK_SERVER_FACTORY must name the non-listening server factory.');
const {createVehicleServer}=await import(pathToFileURL(process.env.PARK_SERVER_FACTORY));
const app=await createVehicleServer();installLobbyLoadGuard(app,{capacity:16});installHousing(app);
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const backend=app.server.address().port,port=Number(process.env.HOUSE_PREVIEW_PORT||8495);
const gateway=http.createServer((req,res)=>{
 if(req.url.includes('/app/preview-network-config.js')){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end(`export const PREVIEW_BACKEND="http://127.0.0.1:${port}";export const PREVIEW_VARIANT="kimi";`);return;}
 const api=req.url.startsWith('/kimi/')||req.url==='/health';
 const out=http.request({host:'127.0.0.1',port:api?backend:8493,path:req.url,method:req.method,headers:{...req.headers,...(api?{origin:'http://127.0.0.1:8288'}:{})}},r=>{res.writeHead(r.statusCode,{...r.headers,'access-control-allow-origin':`http://127.0.0.1:${port}`});r.pipe(res);});
 out.on('error',()=>{res.writeHead(502);res.end('Preview backend unavailable');});req.pipe(out);
});
gateway.on('upgrade',(req,socket,head)=>{
 const out=http.request({host:'127.0.0.1',port:backend,path:req.url,headers:{...req.headers,origin:'http://127.0.0.1:8288'}});
 out.on('upgrade',(r,peer,other)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(r.headers).map(([k,v])=>k+': '+v+'\r\n').join('')+'\r\n');if(other.length)socket.write(other);if(head.length)peer.write(head);socket.pipe(peer).pipe(socket);socket.on('error',()=>peer.destroy());peer.on('error',()=>socket.destroy());});
 out.on('error',()=>socket.destroy());out.end();
});
gateway.listen(port,'127.0.0.1',()=>console.log('Isolated homes preview http://127.0.0.1:'+port+'/67park-foundation-next/'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{gateway.close();app.close().then(()=>process.exit(0));});
