import * as T from 'three';
import {RoundedBoxGeometry} from '../island/utils/RoundedBoxGeometry.js';
let logo=null,logoMaterial=null;
export function parkLogoMaterial(){
 if(!logoMaterial){
  if(typeof document!=='undefined'){
   logo=new T.TextureLoader().load('/67park-foundation-next/brand/67park-logo.png');
   logo.colorSpace=T.SRGBColorSpace;
  }
  logoMaterial=new T.MeshBasicMaterial({name:'67park-colour-logo',map:logo,color:'#ffffff',transparent:true,depthWrite:false,side:T.FrontSide,toneMapped:false});
 }
 return logoMaterial;
}
export function addParkPlates(car,{bus=false}={}){
 const group=new T.Group();group.name='67PARK_COLOUR_PLATES';
 for(const side of [-1,1]){
  const sign=new T.Mesh(new T.PlaneGeometry(bus?.84:.70,bus?.267:.222),parkLogoMaterial());
  sign.name='67park-logo-'+(side===1?'front':'rear');
  sign.position.set(0,bus?.89:.965,side*(bus?3.578:2.51));sign.rotation.y=side<0?Math.PI:0;group.add(sign);
  if(bus){
   const backing=new T.Mesh(new RoundedBoxGeometry(1,.36,.045,2,.04),car.mats.roof);
   backing.position.set(0,.89,side*3.544);group.add(backing);
  }
 }
 car.model.add(group);car.plates={text:'67park',source:'brand/67park-logo.png',coloured:true,front:true,rear:true};
 return car;
}
// Keep the original factory seats, wheel axes and collision envelope intact.
export function styleParkBus(car){
 if(car.kind!=='bus')return car;
 car.mats.paint.color.set('#83b9b6');car.mats.roof.color.set('#f0e5cf');car.mats.cream.color.set('#e8ddc4');
 car.mats.recess.color.set('#65928f');car.mats.rubber.color.set('#414a4b');
 car.mats.glass.opacity=.28;car.mats.glass.color.set('#829fa2');
 // The rounded factory minibus has real side-window openings and a cream belt.
 const retired=[];car.model.traverse(o=>{if(o.isMesh&&o.material===car.mats.label)retired.push(o);});
 for(const old of retired){
  const badge=new T.Mesh(new T.PlaneGeometry(1.23,.39),parkLogoMaterial());
  badge.position.copy(old.position);badge.rotation.copy(old.rotation);badge.position.z+=old.position.z>0?.008:-.008;car.model.add(badge);
  old.removeFromParent();old.geometry.dispose();
 }
 car.style='67park-rounded-mint-minibus';return addParkPlates(car,{bus:true});
}
