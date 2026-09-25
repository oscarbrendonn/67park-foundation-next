// Change only the approved Cat's material JSON; never decode/re-export its mesh.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {Color} from '../vendor/three.module.js';

export const CAT_FINISH = Object.freeze({version:'cat-silver-1',fur:'#d8dcd8',ear:'#bcc4be',roughness:.38});
const furNames=new Set(['cat_matching_body','cat_glossy_fur','cat_face']);
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function parseGLB(bytes){
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);assert.equal(bytes.readUInt32LE(24+length),0x004e4942);
 return {json:JSON.parse(bytes.subarray(20,20+length)),binChunk:bytes.subarray(20+length)};
}
export function encodeGLB(json,binChunk){
 const raw=Buffer.from(JSON.stringify(json)),text=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),header=Buffer.alloc(20);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+text.length+binChunk.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
 return Buffer.concat([header,text,binChunk]);
}
export function finishCatGLB(bytes){
 const {json,binChunk}=parseGLB(bytes);let changed=0;
 for(const material of json.materials){
  if(!furNames.has(material.name)&&material.name!=='cat_ear_satin')continue;
  const pbr=material.pbrMetallicRoughness;
  pbr.baseColorFactor=[...new Color(material.name==='cat_ear_satin'?CAT_FINISH.ear:CAT_FINISH.fur).toArray(),1];
  pbr.roughnessFactor=CAT_FINISH.roughness;changed++;
 }
 assert(changed>=3,'Expected Cat coat, face and ears');
 return encodeGLB(json,binChunk);
}
export function restoreCatMaterialBaseline(bytes,receipt){
 const {json,binChunk}=parseGLB(bytes);json.materials=receipt.beforeMaterials;return encodeGLB(json,binChunk);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file='models/park-originals/cat.glb',proofFile='models/park-originals/cat-finish.json',before=fs.readFileSync(file);
 const packed=JSON.parse(fs.readFileSync('models/park-originals/lossless-report.json')).find(r=>r.file===file);
 if(fs.existsSync(proofFile)&&sha256(before)===JSON.parse(fs.readFileSync(proofFile)).afterSha256){assert.deepEqual(finishCatGLB(before),before);console.log('CAT_FINISH_ALREADY_APPLIED');}
 else{
  assert.equal(sha256(before),packed.afterSha256,'Only patch the recorded packed release');
  const next=finishCatGLB(before),a=parseGLB(before),b=parseGLB(next);
  assert.deepEqual(a.binChunk,b.binChunk,'Geometry, rig, animation and colour bytes remain exact');
  const receipt={version:CAT_FINISH.version,file,beforeBytes:before.length,afterBytes:next.length,beforeSha256:sha256(before),afterSha256:sha256(next),binChunkSha256:sha256(a.binChunk),beforeMaterials:a.json.materials,finish:CAT_FINISH};
  assert.deepEqual(restoreCatMaterialBaseline(next,receipt),before,'Only material properties may differ');
  fs.writeFileSync(file,next);fs.writeFileSync(proofFile,JSON.stringify(receipt,null,2)+'\n');
  const catalogFile='models/park-originals/characters.json',catalog=JSON.parse(fs.readFileSync(catalogFile));catalog.find(c=>c.base==='cat67').bytes=next.length;fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n');
  console.log('CAT_FINISH_APPLIED',JSON.stringify({before:before.length,after:next.length,binUnchanged:true}));
 }
}
