import * as T from 'three';
// Small authored additions only; existing kiosk, bounds and collisions stay intact.
export function createTargetBooth(site){
 const root=new T.Group();root.name='TARGET_CLUB_BOOTH';root.position.set(site.x,site.y,site.z);root.rotation.y=site.yaw;root.scale.set(1.6,1.3,1.6);
 const materials=[],geometries=[],textures=[];
 const mat=color=>{const m=new T.MeshStandardMaterial({color,roughness:.38,metalness:0});materials.push(m);return m;};
 const cream=mat('#fff0cf'),pink=mat('#e88391'),mint=mat('#85b7a2'),gold=mat('#eac36f');
 function mesh(g,m,x,y,z){geometries.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);root.add(o);return o;}
 for(let i=0;i<4;i++){
  const x=-.9+i*.6;
  mesh(new T.BoxGeometry(.045,.34,.05),cream,x,1.77,.09);
  const disk=mesh(new T.CylinderGeometry(.235,.235,.055,24),i%2?mint:pink,x,2.06,.1);disk.rotation.x=Math.PI/2;
  mesh(new T.RingGeometry(.11,.18,24),cream,x,2.06,.13);
  mesh(new T.CircleGeometry(.062,20),gold,x,2.06,.135);
 }
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const c=canvas.getContext('2d');
 c.fillStyle='#315b53';c.fillRect(0,0,768,128);c.strokeStyle='#edcc88';c.lineWidth=6;c.strokeRect(8,8,752,112);
 c.fillStyle='#fff1d1';c.font='bold 58px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('TARGET CLUB',384,61);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
 const label=new T.MeshBasicMaterial({map:texture});materials.push(label);mesh(new T.PlaneGeometry(3.3,.55),label,0,3.12,.2);
 mesh(new T.BoxGeometry(3.4,.65,.1),mint,0,3.12,.12);
 // A pastel toy launcher rests on the serving counter, never a player weapon.
 mesh(new T.BoxGeometry(.7,.13,.15),mint,.5,1.48,.88);
 mesh(new T.BoxGeometry(.17,.15,.18),gold,.89,1.48,.88);
 mesh(new T.BoxGeometry(.15,.18,.14),pink,.27,1.39,.88);
 return {root,dispose(){root.removeFromParent();for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of textures)x.dispose();}};
}
