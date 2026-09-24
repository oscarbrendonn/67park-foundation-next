// Assemble approved authored heads onto the unchanged Gorilla rig/body.
// The existing Gorilla file is read-only and never re-exported in place.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {Matrix4,Color} from '../vendor/three.module.js';
const req=createRequire('/opt/homebrew/lib/node_modules/@gltf-transform/cli/package.json');
const {NodeIO}=req('@gltf-transform/core'),{ALL_EXTENSIONS}=req('@gltf-transform/extensions');
const {mergeDocuments,prune,unpartition,draco,dedup,resample}=req('@gltf-transform/functions'),draco3d=req('draco3dgltf');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule()});
const source='models/goril-motion-v3.glb',sourceHash=createHash('sha256').update(fs.readFileSync(source)).digest('hex');
assert.equal(sourceHash,'cd14c7a06dda3c6c7a25e7106e90bfb34c8276bd1cc09b810d9b5c2f174e9c01');
const reports=[];
for(const [name,base,headName,color] of [['cat','cat67','67Park_Cat_Head','#888D8B'],['ninja','ninja67','67Park_Ninja_Head','#232422']]){
 const doc=await io.read(source),root=doc.getRoot(),scene=root.listScenes()[0];
 for(const name of ['GORIL_KAFA','TAC','CICEK'])root.listNodes().find(n=>n.getName()===name).dispose();
 const bodyMaterial=doc.createMaterial(name+'_matching_body').setBaseColorFactor([...new Color(color).toArray(),1]).setRoughnessFactor(.28).setMetallicFactor(0);
 const bodyNames=['FS_Body','Goril_El_L','Goril_El_R'];
 for(const name of bodyNames)for(const p of root.listNodes().find(n=>n.getName()===name).getMesh().listPrimitives())p.setMaterial(bodyMaterial);
 const headDoc=await io.read('models/park-originals/'+name+'-head.glb'),mapped=mergeDocuments(doc,headDoc);
 const headScene=mapped.get(headDoc.getRoot().listScenes()[0]),head=headScene.listChildren()[0],bone=root.listNodes().find(n=>n.getName()==='Head');
 head.setName(headName).setExtras({authoredFrom2DReference:true,flushEyes:true,base});
 head.setMatrix(new Matrix4().fromArray(bone.getWorldMatrix()).invert().toArray());bone.addChild(head);headScene.dispose();
 scene.setExtras({parkNativeHeight:.3345185926093267,originalCharacter:base,authoredHead:true});
 await doc.transform(prune({keepExtras:true,keepLeaves:true}),resample({tolerance:1e-6}),dedup(),unpartition(),draco({method:'edgebreaker',quantizePosition:18,quantizeNormal:14,quantizeColor:12,quantizeGeneric:16,quantizationVolume:'scene'}));
 const bytes=await io.writeBinary(doc);console.log('CHARACTER_BYTES',name,bytes.length);assert(bytes.length<512*1024,'Full character exceeds the half-MiB budget');
 const file='models/park-originals/'+name+'.glb';fs.writeFileSync(file,bytes);
 const decoded=await io.readBinary(bytes),r=decoded.getRoot();
 assert.deepEqual(r.listAnimations().map(a=>a.getName()).sort(),['celebrate','fall','idle','jump','land','run','walk']);
 assert(r.listSkins().every(s=>s.listJoints().length===20));
 assert(!r.listNodes().some(n=>['GORIL_KAFA','TAC','CICEK'].includes(n.getName())));
 assert.equal(r.listNodes().find(n=>n.getName()===headName).getParentNode().getName(),'Head');
 const report={base,file,bytes:bytes.length,sourceHash,headName,sharedRigBones:20,clips:r.listAnimations().map(a=>a.getName()),triangles:r.listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+p.getIndices().getCount()/3,0),textures:r.listTextures().length};
 reports.push(report);console.log('ORIGINAL_CHARACTER',JSON.stringify(report));
}
assert.equal(createHash('sha256').update(fs.readFileSync(source)).digest('hex'),sourceHash);
fs.writeFileSync('models/park-originals/characters.json',JSON.stringify(reports,null,2)+'\n');
