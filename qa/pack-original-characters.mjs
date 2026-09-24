// Lossless only. Do not re-export meshes or re-quantize any animation value.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {MeshoptDecoder} from '../vendor/addons/libs/meshopt_decoder.module.js';
const req=createRequire('/opt/homebrew/lib/node_modules/@gltf-transform/cli/package.json');
const {MeshoptEncoder}=await import(req.resolve('meshoptimizer'));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const hash=b=>createHash('sha256').update(b).digest('hex'),reports=[];
for(const name of ['cat','ninja']){
 const file='models/park-originals/'+name+'.glb',old=execFileSync('git',['show','eb636e2ff5bd1d485716eb69d619d6c266b92869:'+file]),size=old.readUInt32LE(12);
 const json=JSON.parse(old.subarray(20,20+size)),bin=old.subarray(28+size);
 assert(!json.extensionsUsed?.includes('EXT_meshopt_compression'),'Already packed');
 const original=structuredClone(json),chunks=[];let offset=0,fallback=0,packed=0;
 const append=b=>{const start=offset;chunks.push(b);offset+=b.length;const pad=(4-offset%4)%4;chunks.push(Buffer.alloc(pad));offset+=pad;return start;};
 const dracoViews=new Set(json.meshes.flatMap(m=>m.primitives.map(p=>p.extensions?.KHR_draco_mesh_compression?.bufferView)).filter(i=>i!==undefined));
 // Group raw accessors by their exact element width before lossless coding.
 // This keeps adjacent quaternion/position/time values together, without
 // quantizing floats, changing keyframes, or touching existing Draco bytes.
 const views=[],rawGroups=new Map(),nextViews=[],remap=new Map(),width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 for(const [i,a] of json.accessors.entries())if(a.bufferView!==undefined&&!dracoViews.has(a.bufferView)){
  assert.equal(a.componentType,5126);assert(!a.sparse);const v=json.bufferViews[a.bufferView];assert(!v.byteStride);
  const stride=width[a.type]*4;assert(stride);const start=(v.byteOffset||0)+(a.byteOffset||0),raw=bin.subarray(start,start+a.count*stride);
  const group=rawGroups.get(stride)||{chunks:[],length:0,accessors:[]};
  group.accessors.push({index:i,offset:group.length,raw});group.chunks.push(raw);group.length+=raw.length;rawGroups.set(stride,group);
 }
 for(const [i,v] of json.bufferViews.entries())if(dracoViews.has(i)){
  assert.equal(v.buffer,0);assert(!v.extensions);
  const raw=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
  v.byteOffset=append(raw);remap.set(i,nextViews.length);nextViews.push(v);
  views.push({index:nextViews.length-1,decodedBytes:raw.length,sha256:hash(raw),dracoUnchanged:true,packed:false});
 }
 for(const [stride,group] of rawGroups){
   const raw=Buffer.concat(group.chunks),v={buffer:0,byteLength:raw.length};let compressed=null;
   const encoded=Buffer.from(MeshoptEncoder.encodeGltfBuffer(raw,raw.length/stride,stride,'ATTRIBUTES'));
   const decoded=new Uint8Array(raw.length);
   MeshoptDecoder.decodeGltfBuffer(decoded,raw.length/stride,stride,encoded,'ATTRIBUTES','NONE');
   assert.deepEqual(Buffer.from(decoded),raw,'Every decompressed byte must match');
   if(encoded.length+200<raw.length)compressed=encoded;
  if(compressed){
   v.buffer=1;v.byteOffset=fallback;fallback=(fallback+v.byteLength+3)&~3;
   v.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:append(compressed),byteLength:compressed.length,byteStride:stride,count:raw.length/stride,mode:'ATTRIBUTES',filter:'NONE'}};packed++;
  }else v.byteOffset=append(raw);
  for(const a of group.accessors){json.accessors[a.index].bufferView=nextViews.length;json.accessors[a.index].byteOffset=a.offset;assert.deepEqual(raw.subarray(a.offset,a.offset+a.raw.length),a.raw);}
  views.push({index:nextViews.length,decodedBytes:raw.length,sha256:hash(raw),dracoUnchanged:false,packed:!!compressed});nextViews.push(v);
 }
 json.bufferViews=nextViews;
 for(const m of json.meshes)for(const p of m.primitives)if(p.extensions?.KHR_draco_mesh_compression)p.extensions.KHR_draco_mesh_compression.bufferView=remap.get(p.extensions.KHR_draco_mesh_compression.bufferView);
 json.buffers=[{byteLength:offset},{byteLength:fallback,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 json.extensionsUsed=[...new Set([...(json.extensionsUsed||[]),'EXT_meshopt_compression'])];
 json.extensionsRequired=[...new Set([...(json.extensionsRequired||[]),'EXT_meshopt_compression'])];
 for(const key of ['nodes','skins','animations','materials','scenes'])assert.deepEqual(json[key],original[key],key+' unchanged');
 const semantics=j=>({meshes:j.meshes.map(m=>({...m,primitives:m.primitives.map(p=>({...p,extensions:p.extensions?.KHR_draco_mesh_compression?{...p.extensions,KHR_draco_mesh_compression:{...p.extensions.KHR_draco_mesh_compression,bufferView:0}}:p.extensions}))})),accessors:j.accessors.map(({bufferView,byteOffset,...a})=>a)});
 assert.deepEqual(semantics(json),semantics(original));
 let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
 const body=Buffer.concat(chunks),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+body.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
 binHeader.writeUInt32LE(body.length);binHeader.writeUInt32LE(0x004e4942,4);
 const result=Buffer.concat([header,text,binHeader,body]);assert(result.length<old.length);assert(gzipSync(result).length<gzipSync(old).length);
 const report={file,before:old.length,after:result.length,gzipBefore:gzipSync(old).length,gzipAfter:gzipSync(result).length,packed,lossless:true,beforeSha256:hash(old),afterSha256:hash(result),views};
 fs.writeFileSync(file,result);reports.push(report);console.log(JSON.stringify({...report,views:undefined}));
}
fs.writeFileSync('models/park-originals/lossless-report.json',JSON.stringify(reports,null,2)+'\n');
const info=JSON.parse(fs.readFileSync('models/park-originals/characters.json'));
for(const entry of info)entry.bytes=fs.statSync(entry.file).size;
fs.writeFileSync('models/park-originals/characters.json',JSON.stringify(info,null,2)+'\n');
