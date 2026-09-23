// Lossless container assembly only: retain authored buffers, normals, triangles
// and materials. The pink variant shares the yellow elephant's geometry bytes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const elephants=new URL('../../2026-09-23-67park-elephant-pair/optimized/',import.meta.url);
function read(url){
 const bytes=fs.readFileSync(url),length=bytes.readUInt32LE(12);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);
 const json=JSON.parse(bytes.toString('utf8',20,20+length));
 assert(!json.textures&&!json.skins&&!json.animations,'Static untextured assets only');
 return {json,bin:bytes.subarray(28+length)};
}
const old=read(new URL('island/park-toys-v57.glb',root));
const yellow=read(new URL('yellow-elephant.glb',elephants));
const pink=read(new URL('pink-elephant.glb',elephants));
assert.deepEqual(yellow.bin,pink.bin,'Approved variants must have identical geometry');
assert.deepEqual(yellow.json.accessors,pink.json.accessors);
assert.deepEqual(yellow.json.bufferViews,pink.json.bufferViews);
const out={asset:{version:'2.0',generator:'67Park lossless animal display assembler'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[],extensionsUsed:[],extensionsRequired:[]};
const chunks=[],views=new Map();let offset=0,fallbackOffset=0;
function append(bytes){const start=offset;chunks.push(bytes);offset+=bytes.length;const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}return start;}
function addView(source,index){
 const v=structuredClone(source.json.bufferViews[index]),e=v.extensions?.EXT_meshopt_compression;
 assert(!v.extensions||e,'Unknown buffer extension');
 const bytes=source.bin.subarray(e?.byteOffset??v.byteOffset??0,(e?.byteOffset??v.byteOffset??0)+(e?.byteLength??v.byteLength));
 const key=JSON.stringify({...v,buffer:undefined,byteOffset:undefined,extensions:e?{EXT_meshopt_compression:{...e,buffer:undefined,byteOffset:undefined}}:undefined})+createHash('sha256').update(bytes).digest('hex');
 if(views.has(key))return views.get(key);
 if(e){e.buffer=0;e.byteOffset=append(bytes);v.buffer=1;v.byteOffset=fallbackOffset;fallbackOffset+=v.byteLength;fallbackOffset=(fallbackOffset+3)&~3;}
 else{assert.equal(v.buffer,0);v.buffer=0;v.byteOffset=append(bytes);}
 const at=out.bufferViews.push(v)-1;views.set(key,at);return at;
}
function importRoot(source,name,newName=name){
 const j=source.json,cache={node:new Map(),mesh:new Map(),accessor:new Map(),material:new Map()};
 const once=(kind,index,fn)=>{if(cache[kind].has(index))return cache[kind].get(index);const value=fn();cache[kind].set(index,value);return value;};
 const accessor=i=>once('accessor',i,()=>{const a=structuredClone(j.accessors[i]);assert(!a.sparse);a.bufferView=addView(source,a.bufferView);return out.accessors.push(a)-1;});
 const material=i=>once('material',i,()=>out.materials.push(structuredClone(j.materials[i]))-1);
 const mesh=i=>once('mesh',i,()=>{const m=structuredClone(j.meshes[i]);for(const p of m.primitives){assert(!p.targets&&!p.extensions);p.indices=accessor(p.indices);for(const k of Object.keys(p.attributes))p.attributes[k]=accessor(p.attributes[k]);p.material=material(p.material);}return out.meshes.push(m)-1;});
 const node=i=>once('node',i,()=>{const n=structuredClone(j.nodes[i]);if(n.mesh!==undefined)n.mesh=mesh(n.mesh);if(n.children)n.children=n.children.map(node);return out.nodes.push(n)-1;});
 const index=j.nodes.findIndex(n=>n.name===name);assert(index>=0,name);
 const added=node(index);out.nodes[added].name=newName;
 out.nodes[added].extras={...out.nodes[added].extras,asset_id:newName};
 delete out.nodes[added].extras.not_live;
 out.scenes[0].nodes.push(added);
 out.extensionsUsed.push(...j.extensionsUsed??[]);out.extensionsRequired.push(...j.extensionsRequired??[]);
}
for(const name of ['toy-bull-orange','kennel-coral','kennel-blue','kennel-yellow','sculpture-plinth-warm-blush'])importRoot(old,name);
importRoot(yellow,'Yellow elephant','toy-elephant-yellow');
importRoot(pink,'Pink elephant','toy-elephant-pink');
out.extensionsUsed=[...new Set(out.extensionsUsed)];out.extensionsRequired=[...new Set(out.extensionsRequired)];
out.buffers=[{byteLength:offset},{byteLength:fallbackOffset,extensions:{EXT_meshopt_compression:{fallback:true}}}];
let json=Buffer.from(JSON.stringify(out));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
const bin=Buffer.concat(chunks),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,binHeader,bin]);
fs.writeFileSync(new URL('island/park-animals-1.glb',root),result);
console.log('PARK_ANIMAL_ASSET_BUILT',JSON.stringify({bytes:result.length,oldBytes:fs.statSync(new URL('island/park-toys-v57.glb',root)).size,elephantSharedBytes:yellow.bin.length,roots:out.scenes[0].nodes.map(i=>out.nodes[i].name)}));
