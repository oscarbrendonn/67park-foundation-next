import * as T from 'three';

// One small reusable local toy kit, created only when a command needs it.
export function createPetToys(scene){
  const root=new T.Group();root.name='67PARK_PET_TOYS';scene.add(root);
  const materials=['#a1d4bb','#f1c47b','#dca5c8','#87664d'].map(color=>new T.MeshStandardMaterial({color,roughness:.45}));
  const ball=new T.Mesh(new T.SphereGeometry(.09,14,10),materials[0]);
  const frisbee=new T.Mesh(new T.CylinderGeometry(.18,.18,.035,20),materials[1]);
  const treat=new T.Mesh(new T.IcosahedronGeometry(.035,0),materials[3]);
  const feather=new T.Mesh(new T.SphereGeometry(1,12,8),materials[2]);feather.scale.set(.045,.13,.025);
  const wand=new T.Mesh(new T.CylinderGeometry(.012,.012,1,6),materials[3]);
  const stringGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
  const string=new T.Line(stringGeometry,new T.LineBasicMaterial({color:'#eee4d0'}));
  const all=[ball,frisbee,treat,feather,wand,string];root.add(...all);root.visible=false;
  const a=new T.Vector3(),b=new T.Vector3(),direction=new T.Vector3(),up=new T.Vector3(0,1,0);
  return {root,update(toy){
    root.visible=!!toy;if(!toy)return;for(const o of all)o.visible=false;
    const mesh={ball,frisbee,treat,feather}[toy.kind];if(!mesh)return;
    mesh.visible=true;mesh.position.set(toy.position.x,toy.position.y,toy.position.z);
    if(toy.kind==='frisbee')mesh.rotation.y=(toy.age||0)*14;
    if(toy.kind==='feather'&&toy.from){
      a.set(toy.from.x,toy.from.y,toy.from.z);b.copy(mesh.position);b.y+=.68;
      wand.visible=string.visible=true;wand.position.copy(a).add(b).multiplyScalar(.5);wand.scale.y=a.distanceTo(b);wand.quaternion.setFromUnitVectors(up,direction.copy(b).sub(a).normalize());
      const p=stringGeometry.attributes.position;p.setXYZ(0,b.x,b.y,b.z);p.setXYZ(1,mesh.position.x,mesh.position.y,mesh.position.z);p.needsUpdate=true;stringGeometry.computeBoundingSphere();
    }
  },dispose(){root.removeFromParent();for(const o of all)o.geometry.dispose();string.material.dispose();for(const m of materials)m.dispose();}};
}
