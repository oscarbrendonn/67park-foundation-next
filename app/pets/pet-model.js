import * as T from 'three';
import {validPet} from './pet-state.js?v=pets-soft-2';
import {buildPet} from './pet-sculpt.js?v=pets-soft-2';

const clamp = T.MathUtils.clamp;

export function createPetModels({shadows=true}={}) {
  const templates=new Map(),live=new Set(); let disposed=false;
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:0,envMapIntensity:.75});
  let shadowGeometry,shadowMaterial,shadowTexture;
  if(shadows && globalThis.document){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');
    if(ctx){const gradient=ctx.createRadialGradient(32,32,2,32,32,31);gradient.addColorStop(0,'rgba(61,48,48,.25)');gradient.addColorStop(.50,'rgba(61,48,48,.13)');gradient.addColorStop(1,'rgba(61,48,48,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);shadowTexture=new T.CanvasTexture(canvas);shadowGeometry=new T.PlaneGeometry(1.1,1.35);shadowMaterial=new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});}
  }
  function create(kind,{scale=.78}={}) {
    if(disposed||!validPet(kind))throw Error('Unknown or disposed pet');
    if(!templates.has(kind))templates.set(kind,buildPet(kind));
    const template=templates.get(kind), root=new T.Group(), rig=new T.Group();
    root.name='67PARK_PET_'+kind.toUpperCase();root.add(rig);rig.scale.setScalar(scale);
    const bones=template.bind.map(row=>{const b=new T.Bone();b.name=row.name;b.position.fromArray(row.position);return b});
    template.bind.forEach((row,i)=>{if(row.parent>=0)bones[row.parent].add(bones[i]);});
    const skeleton=new T.Skeleton(bones), mesh=new T.SkinnedMesh(template.geometry,material);
    mesh.name='pet-sculpt-'+kind;mesh.add(bones[0]);mesh.bind(skeleton);mesh.frustumCulled=false;rig.add(mesh);
    const shadow=shadowMaterial?new T.Mesh(shadowGeometry,shadowMaterial):null;
    if(shadow){shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;shadow.scale.setScalar(scale);root.add(shadow);}
    const named=Object.fromEntries(bones.map(b=>[b.name,b]));
    const feet={};
    for(const name of ['frontL','frontR','backL','backR']){
      const index=template.bind.findIndex(b=>b.name===name),offset=template.bind[index].position,points=[];
      const p=template.geometry.attributes.position,skin=template.geometry.attributes.skinIndex;
      for(let i=0;i<p.count;i++)if(skin.getX(i)===index)points.push([p.getX(i)-offset[0],p.getY(i)-(.47+offset[1]),p.getZ(i)-(-.08+offset[2])]);
      feet[name]=points;
    }
    let phase=0,clock=0,idle=0,pose=0,lie=0,paw=0,stalk=0,rub=0,eat=0,closed=false,playAge=10;
    const stats={kind,triangles:template.triangles,draws:shadow?2:1,frames:0,speed:0,pose:'idle',distance:0};root.userData.pet=stats;
    function update(dt,{speed=0,distance,reducedMotion=false,sitting=false,pose:commandPose='idle',actionTime=0,happy=0}={}) {
      if(closed)return;
      dt=clamp(Number.isFinite(dt)?dt:0,0,.05);speed=clamp(Number.isFinite(speed)?speed:0,0,20);clock+=dt;playAge+=dt;
      const moved=Number.isFinite(distance)?Math.max(0,distance):speed*dt;
      phase+=moved/scale*6.5;stats.distance+=moved;idle=speed<.08?idle+dt:0;
      const desiredSit=(sitting||commandPose==='sit'||commandPose==='paw'||(idle>2.2&&commandPose==='idle'))&&speed<.12?1:0;
      pose+=(desiredSit-pose)*(1-Math.exp(-8*dt));
      const ease=1-Math.exp(-12*dt);
      lie+=((commandPose==='lie'?1:0)-lie)*ease;
      paw+=((commandPose==='paw'||commandPose==='swat'?1:0)-paw)*ease;
      stalk+=((commandPose==='stalk'?1:0)-stalk)*ease;
      rub+=((commandPose==='rub'?1:0)-rub)*ease;
      eat+=((commandPose==='eat'?1:0)-eat)*ease;
      const run=clamp(speed/3.8,0,1),swing=clamp(speed/2.5,0,1)*.62;
      for(const [name,offset,back]of [['frontL',0,false],['frontR',Math.PI,false],['backL',Math.PI,true],['backR',0,true]]) {
        const b=named[name];b.rotation.x=Math.sin(phase+offset)*swing*(1-pose)+(back?-.60:.10)*pose;
        b.position.y=-.10+(back?.019:.092)*pose;
        b.rotation.x=b.rotation.x*(1-lie)+(-1.02)*lie;
        b.rotation.x-=stalk*(back?.35:.22);
        if(name==='frontR'){b.rotation.x-=paw*(commandPose==='swat'?.55+.22*Math.sin(actionTime*9):.9);b.position.y+=paw*.10;}
      }
      const bounce=reducedMotion?0:Math.abs(Math.sin(phase))*.033*run;
      const play=playAge<1.2&&!reducedMotion?Math.sin(clamp(playAge/1.2,0,1)*Math.PI):0;
      named.body.position.y=.47-.082*pose-.13*lie-.05*stalk+bounce+play*.17;
      named.body.rotation.x=.10*pose-.07*run;
      named.body.rotation.x*=1-lie;
      named.body.rotation.z=reducedMotion?0:Math.sin(phase)*.027*run+rub*Math.sin(actionTime*3)*.055;
      named.body.position.x=reducedMotion?0:rub*Math.sin(actionTime*3)*.018;
      named.head.rotation.set(-.07*pose+.025*Math.sin(clock*1.3)*(reducedMotion?0:1),Math.sin(clock*.75)*.05*(reducedMotion?0:1),Math.sin(clock*.9)*.03*(reducedMotion?0:1));
      named.head.rotation.x+=eat*.22+stalk*.1-lie*.07;
      named.head.rotation.z+=rub*.13;
      const wag=reducedMotion?.04:(kind==='dog'?.26:.13)*(1+happy*.85);
      named.tail.rotation.z=Math.sin(clock*(kind==='dog'?6.5+happy*3:2.5))*wag*(1+play)*(1-lie*.6);
      named.tailTip.rotation.z=Math.sin(clock*(kind==='dog'?6.5:2.5)-.7)*wag*.7;
      named.leftEar.rotation.x=named.rightEar.rotation.x=reducedMotion?0:Math.sin(phase+.7)*run*.12;
      // Blink around the eye centre; no eyelid geometry or per-frame allocations.
      const blink=clock%4.9,eyeScale=blink>4.64&&blink<4.86?Math.max(.09,Math.abs(blink-4.75)/.11):1;
      named.eyes.scale.y=eyeScale;named.eyes.position.y=(1-eyeScale)*.119;
      // Ground the tucked legs without stretching the sculpt. Evaluate only
      // their cached local vertices; walking/sitting keep the original poses.
      if(lie>.001||stalk>.001){
        const c=Math.cos(named.body.rotation.x),s=Math.sin(named.body.rotation.x);
        for(const name of ['frontL','frontR','backL','backR']){
          const b=named[name],cx=Math.cos(b.rotation.x),sx=Math.sin(b.rotation.x);let min=Infinity;
          for(const [,y,z]of feet[name])min=Math.min(min,named.body.position.y+(b.position.y+y*cx-z*sx)*c-(b.position.z+y*sx+z*cx)*s);
          b.position.y+=(.025-min)/c*Math.min(1,lie+stalk);
        }
      }
      stats.frames++;stats.speed=speed;stats.pose=commandPose!=='idle'?commandPose:play>.05?'play':pose>.5?'sit':speed>.08?'walk':'idle';
    }
    const contact=new T.Vector3();
    const api={root,rig,mesh,shadow,stats,update,contactPoint(action){
      // Authored head-space crown / muzzle points follow the actual animated
      // sculpt, including the cat's rub. No guessed world-space head height.
      root.updateWorldMatrix(true,true);contact.set(0,action==='pet'?.45:-.02,action==='pet'?-.06:.31);
      return named.head.localToWorld(contact);
    },play(){playAge=0},dispose(){if(closed)return;closed=true;root.removeFromParent();skeleton.dispose();live.delete(api);}};
    live.add(api);return api;
  }
  return {create,stats:()=>({templates:templates.size,instances:live.size,geometries:templates.size+(shadowGeometry?1:0),materials:1+(shadowMaterial?1:0),textureBytes:shadowTexture?16384:0,triangles:Object.fromEntries([...templates].map(([k,v])=>[k,v.triangles]))}),dispose(){if(disposed)return;disposed=true;for(const pet of [...live])pet.dispose();for(const row of templates.values())row.geometry.dispose();material.dispose();shadowGeometry?.dispose();shadowMaterial?.dispose();shadowTexture?.dispose();templates.clear();}};
}
