import * as THREE from 'three';

// Apply an offline, measured local patch to the existing meshes. Keep their
// material objects, node identities, transforms and all untouched triangles.
// No extra visible meshes, textures, render loops or geometry work per frame.
export function applyRoadJoin(root,patch){
  if(root.userData.roadJoinVersion===34)return root.userData.roadJoinReport;
  if(patch.version!==34)throw Error('Road-join data version mismatch');
  const targets=[];
  for(const [name,data]of Object.entries(patch.meshes)){
    const mesh=root.getObjectByName(name),old=mesh?.geometry;
    if(!mesh?.isMesh||old.attributes.position.count!==data.expectedVertices||old.index?.count!==data.expectedIndices)
      throw Error('Road-join source geometry mismatch: '+name);
    const count=data.add.position.length/3;
    if(!Number.isInteger(count)||count%3)throw Error('Missing road triangle: '+name);
    for(const [key,a]of Object.entries(old.attributes))
      if(data.add[key]?.length!==count*a.itemSize||!data.add[key].every(Number.isFinite))throw Error('Invalid road-surface data: '+name+'/'+key);
    if(data.removeFaces.some((v,i,a)=>!Number.isInteger(v)||v<0||v>=old.index.count/3||(i&&v<=a[i-1])))throw Error('Invalid road-surface selection');
    targets.push({mesh,old,data,count});
  }
  let delta=0;
  for(const {mesh,old,data,count}of targets){
    const next=new THREE.BufferGeometry(),offset=old.attributes.position.count;
    for(const [key,a]of Object.entries(old.attributes)){
      const values=new Float32Array(a.array.length+data.add[key].length);
      values.set(a.array);values.set(data.add[key],a.array.length);
      next.setAttribute(key,new THREE.BufferAttribute(values,a.itemSize,a.normalized));
    }
    const remove=new Set(data.removeFaces),indices=new Uint32Array(old.index.count-remove.size*3+count);let at=0;
    for(let i=0;i<old.index.count;i+=3)if(!remove.has(i/3)){
      indices[at++]=old.index.getX(i);indices[at++]=old.index.getX(i+1);indices[at++]=old.index.getX(i+2);
    }
    for(let i=0;i<count;i++)indices[at++]=offset+i;
    next.setIndex(new THREE.BufferAttribute(indices,1));next.computeBoundingBox();next.computeBoundingSphere();
    mesh.geometry=next;old.dispose();delta+=count/3-remove.size;
  }
  const report={version:34,roi:patch.roi,roadWidth:patch.roadWidth,addedRoadArea:patch.addedRoadArea,meshes:targets.map(t=>t.mesh.name),triangleDelta:delta};
  root.userData.roadJoinVersion=34;root.userData.roadJoinReport=report;
  return report;
}
