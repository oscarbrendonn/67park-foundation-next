import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Color} from '../vendor/three.module.js';
import {CAT_FINISH,parseGLB,finishCatGLB,restoreCatMaterialBaseline,sha256} from './cat-finish.mjs';
const file='models/park-originals/cat.glb',current=fs.readFileSync(file),proof=JSON.parse(fs.readFileSync('models/park-originals/cat-finish.json'));
test('Cat finish changes only coat/face/ear colour and roughness; packed shape and animation remain exact',()=>{
 const baseline=restoreCatMaterialBaseline(current,proof),original=parseGLB(baseline),next=parseGLB(current);
 assert.equal(sha256(baseline),proof.beforeSha256);assert.equal(sha256(current),proof.afterSha256);
 assert.deepEqual(next.binChunk,original.binChunk);assert.equal(sha256(next.binChunk),proof.binChunkSha256);
 const expected=structuredClone(original.json);
 for(const material of expected.materials){
  if(!['cat_matching_body','cat_face','cat_ear_satin'].includes(material.name))continue;
  material.pbrMetallicRoughness.baseColorFactor=[...new Color(material.name==='cat_ear_satin'?CAT_FINISH.ear:CAT_FINISH.fur).toArray(),1];
  material.pbrMetallicRoughness.roughnessFactor=CAT_FINISH.roughness;
 }
 assert.deepEqual(next.json,expected);assert.deepEqual(finishCatGLB(current),current);
 assert(current.length<=baseline.length+256);assert.equal(next.json.images?.length||0,0);
 assert.equal(JSON.parse(fs.readFileSync('models/park-originals/characters.json')).find(c=>c.base==='cat67').bytes,current.length);
});
test('Gorilla and Ninja model bytes are unchanged',()=>{
 assert.equal(sha256(fs.readFileSync('models/goril-motion-v3.glb')),'cd14c7a06dda3c6c7a25e7106e90bfb34c8276bd1cc09b810d9b5c2f174e9c01');
 const ninja=JSON.parse(fs.readFileSync('models/park-originals/lossless-report.json')).find(r=>r.file.endsWith('/ninja.glb'));
 assert.equal(sha256(fs.readFileSync(ninja.file)),ninja.afterSha256);
});
