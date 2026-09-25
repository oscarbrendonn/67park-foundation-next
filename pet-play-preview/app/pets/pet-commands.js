import {createPetFollower} from '/67park-foundation-next/app/pets/pet-follow.js?v=pet-play-1';

export const PET_COMMANDS=Object.freeze([
  {id:'come',label:'Come'},{id:'stay',label:'Stay'},{id:'sit',label:'Sit'},
  {id:'lie',label:'Lie down'},{id:'paw',label:'Give paw'},
  {id:'pet',label:'Pet'},{id:'treat',label:'Give treat'},
  {id:'ball',label:'Fetch ball',catLabel:'Roll & chase ball'},
  {id:'frisbee',label:'Throw frisbee',kind:'dog'},
  {id:'feather',label:'Feather toy',kind:'cat'},
  {id:'follow',label:'Follow me'},
]);
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const facing=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
// The shared avatar rig's right hand is on local -X. Approach that side so
// its short, unchanged arm can reach the pet instead of reaching across it.
const nearOwner=(owner,yaw)=>({x:owner.x-Math.cos(yaw)*.32+Math.sin(yaw)*.34,y:owner.y,z:owner.z+Math.sin(yaw)*.32+Math.cos(yaw)*.34});

// Local companion state machine. No player-body writes, network events,
// timers, downloaded assets or physics objects. Every movement is probed.
export function createPetCompanion(kind,probe,{sound=()=>{}}={}) {
  const follow=createPetFollower(probe),nav=follow.state;
  const state={command:'follow',phase:'follow',pose:'idle',actionTime:0,playSide:1,happy:0,ownerAction:'',toy:null,message:'Following you',completed:0,fetches:0};
  let clock=0,age=0,phaseAge=0,idle=0,lastOwner=null,actionOrigin=null,lastCommand=-10,cycles=0;
  function phase(value){state.phase=value;phaseAge=state.actionTime=0;}
  function finish(message='Following you',count=true) {
    if(count&&state.command!=='follow')state.completed++;state.command='follow';phase('follow');state.pose='idle';state.ownerAction='';state.toy=null;state.message=message;age=0;
    follow.hold();
  }
  function reset(){finish('Following you',false);follow.reset();lastOwner=null;idle=0;state.happy=0;}
  function throwTarget(owner,yaw,distance) {
    // Sample the complete flight corridor at short ground intervals. Stop
    // before water, walls or a raised ledge, not on the far side of one.
    let previous={...owner},target=null;
    for(let d=.35;d<=distance;d+=.30){
      const x=owner.x+Math.sin(yaw)*d,z=owner.z+Math.cos(yaw)*d,y=probe(x,z,previous.y);
      if(!Number.isFinite(y)||Math.abs(y-previous.y)>.32)break;
      previous={x,y,z};if(d>1.3)target=previous;
    }
    return target;
  }
  function faceToy(dt){follow.moveTo(dt,{...nav},{face:facing(nav,state.toy.position)});}
  function batTarget(){
    const angle=nav.heading+state.playSide*.6,from=state.toy.position;
    let target={x:from.x,y:nav.y,z:from.z};
    // Probe the entire small roll, not just its endpoint: a paw cannot send
    // the ball through a thin wall or across water either.
    for(let d=.12;d<=.60;d+=.12){
      const x=from.x+Math.sin(angle)*d,z=from.z+Math.cos(angle)*d,y=probe(x,z,target.y);
      if(!Number.isFinite(y)||Math.abs(y-target.y)>.3)break;
      target={x,y,z};
    }
    return gap(from,target)>.1?target:null;
  }
  function command(id,owner,yaw=0) {
    const spec=PET_COMMANDS.find(c=>c.id===id&&(!c.kind||c.kind===kind));
    if(!spec||!finite(owner)||!Number.isFinite(yaw)||!nav.visible)return {ok:false,message:'Your pet is not nearby yet.'};
    if(clock-lastCommand<.25)return {ok:false,message:'Let your pet respond first.'};
    let target=null;
    if(id==='ball'||id==='frisbee') {
      target=throwTarget(owner,yaw,kind==='dog'?5:2.9);
      if(!target)return {ok:false,message:'Face an open, dry space to throw.'};
    }
    lastCommand=clock;age=phaseAge=idle=0;cycles=0;state.toy=null;state.ownerAction='';state.happy=1;state.pose='idle';
    state.command=id;state.message=kind==='cat'?(spec.catLabel||spec.label):spec.label;state.playSide=1;actionOrigin={...owner};follow.hold();
    if(id==='follow'){phase('follow');state.message='Following you';}
    else if(['stay','sit','lie'].includes(id)){phase('hold');state.pose=id==='stay'?'idle':id;state.message=id==='stay'?'Waiting here':id==='sit'?'Sitting here':'Resting here';}
    else if(target){
      const cat=kind==='cat',from={...owner,y:owner.y+(cat?.065:.8)};
      phase(cat?'roll-out':'throw');state.ownerAction=cat?'roll':'throw';
      state.toy={kind:id,phase:cat?'rolling':'flying',from,target,position:{...from},age:0,radius:cat?.065:.09};
      state.message=cat?'Stalk, pounce, paw — no fetching':'Fetch!';sound('throw');
    }
    else phase('approach');
    if(!target)sound(kind==='dog'?'pet-happy':'pet-purr');
    return {ok:true,message:state.message};
  }
  function step(dt,owner,yaw=0,{resting=false}={}) {
    dt=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));if(!dt||!finite(owner))return state;
    clock+=dt;age+=dt;phaseAge+=dt;state.happy=Math.max(0,state.happy-dt*.22);state.actionTime=phaseAge;
    const moved=lastOwner?gap(lastOwner,owner):0;
    const teleported=lastOwner&&(moved>12||Math.abs(owner.y-lastOwner.y)>3);
    idle=moved<.03?idle+dt:0;lastOwner={...owner};
    if(teleported||!nav.visible){finish('Following you',false);follow.reset();follow.step(dt,owner,yaw);return state;}
    if(state.phase==='follow'){
      follow.step(dt,owner,yaw);state.pose=nav.speed<.1&&(idle>9||(resting&&idle>2))?'lie':'idle';state.ownerAction='';return state;
    }
    // A held pose really stays put; normal walking does not silently recall it.
    if(state.phase==='hold'){follow.hold();return state;}
    if(age>24){finish('Path blocked — following you again');return state;}
    if(['approach','care','feather'].includes(state.phase)&&state.command!=='come'&&gap(owner,actionOrigin)>1.2){finish('Following you');return state;}
    const target=nearOwner(owner,yaw);
    // Play farther out than a head stroke: keep the wand above the cat and
    // outside the owner's large head, with a clear space to stalk and swat.
    if(state.command==='feather'){target.x-=Math.cos(yaw)*.36-Math.sin(yaw)*.44;target.z+=Math.sin(yaw)*.36+Math.cos(yaw)*.44;}
    if(state.phase==='approach'){
      const arrived=follow.moveTo(dt,target,{speed:2.5,radius:.025,face:facing(nav,owner)});
      state.pose='idle';
      if(arrived){
        if(state.command==='come'){finish('Here I am!');return state;}
        phase(state.command==='feather'?'feather':'care');
      }
    }else if(state.phase==='care'){
      follow.moveTo(dt,{...nav},{face:facing(nav,owner)});
      state.ownerAction=state.command;
      state.pose=state.command==='pet'?(kind==='cat'?'rub':'happy'):state.command==='treat'?'eat':'paw';
      state.happy=1;
      if(state.command==='treat')state.toy={kind:'treat',phase:'hand',position:{x:nav.x,y:nav.y+.30,z:nav.z}};
      if(phaseAge>2.8)finish(state.command==='treat'?'Yum!':kind==='cat'?'Purr…':'Happy tail!');
    }else if(state.phase==='roll-out'){
      follow.hold();state.pose='stalk';const toy=state.toy,t=Math.min(1,phaseAge/.7),roll=t*(2-t);
      toy.age=phaseAge;toy.position={x:toy.from.x+(toy.target.x-toy.from.x)*roll,y:toy.target.y+toy.radius,z:toy.from.z+(toy.target.z-toy.from.z)*roll};
      if(t===1){toy.phase='ground';state.ownerAction='';phase('stalk');}
    }else if(state.phase==='throw'){
      follow.hold();const toy=state.toy,t=Math.min(1,phaseAge/.7);toy.age=phaseAge;
      toy.position={x:toy.from.x+(toy.target.x-toy.from.x)*t,y:toy.from.y+(toy.target.y+.08-toy.from.y)*t+Math.sin(t*Math.PI)*1.0,z:toy.from.z+(toy.target.z-toy.from.z)*t};
      if(t===1){toy.phase='ground';state.ownerAction='';phase('chase');}
    }else if(state.phase==='stalk'){
      faceToy(dt);state.pose='stalk';if(phaseAge>.65)phase('chase');
    }else if(state.phase==='chase'){
      state.pose=kind==='cat'?'stalk':'idle';
      if(follow.moveTo(dt,state.toy.target,{speed:kind==='dog'?3.6:1.5,radius:kind==='dog'?.24:.75}))phase(kind==='dog'?'pickup':'pounce');
    }else if(state.phase==='pounce'){
      state.pose='pounce';
      follow.moveTo(dt,state.toy.target,{speed:2.4,radius:.24});
      if(phaseAge>=.40){phase(gap(nav,state.toy.target)<.30?'bat':'chase');state.playSide=cycles%2?-1:1;}
    }else if(state.phase==='pickup'){
      follow.hold();state.pose='eat';if(phaseAge>.40){state.toy.phase='carried';phase('return');}
    }else if(state.phase==='return'){
      state.pose='idle';const arrived=follow.moveTo(dt,target,{speed:3.2,radius:.16,face:facing(nav,owner)});
      state.toy.position={x:nav.x+Math.sin(nav.heading)*.31,y:nav.y+.36,z:nav.z+Math.cos(nav.heading)*.31};
      if(arrived){state.toy.phase='ground';state.toy.position={...target,y:nav.y+.08};state.fetches++;phase('drop');state.message='Brought it back!';state.happy=1;}
    }else if(state.phase==='drop'){
      follow.hold();state.pose='happy';if(phaseAge>1.5)finish('Brought it back!');
    }else if(state.phase==='bat'){
      faceToy(dt);state.pose='swat';
      if(phaseAge>=.275){
        const next=batTarget();cycles++;
        if(!next){phase('watch');return state;}
        state.toy.from={...state.toy.position};state.toy.target=next;state.toy.phase='rolling';phase('roll');
      }
    }else if(state.phase==='roll'){
      follow.hold();const toy=state.toy,t=Math.min(1,phaseAge/.35);
      // The toy moves at the stroke, while the same paw finishes its recovery.
      state.pose='swat';state.actionTime=.275+phaseAge;
      toy.position={x:toy.from.x+(toy.target.x-toy.from.x)*t,y:toy.target.y+toy.radius,z:toy.from.z+(toy.target.z-toy.from.z)*t};
      if(t===1){toy.phase='ground';phase(cycles>=3?'watch':'stalk');}
    }else if(state.phase==='watch'){
      faceToy(dt);state.pose='idle';if(phaseAge>1)finish('Good game!');
    }else if(state.phase==='feather'){
      state.ownerAction='feather';
      const t=phaseAge%2.6,tip={x:target.x-Math.cos(yaw)*.07+Math.sin(yaw)*.48+Math.cos(yaw)*Math.sin(phaseAge*2)*.10,y:target.y+.13,z:target.z+Math.sin(yaw)*.07+Math.cos(yaw)*.48-Math.sin(yaw)*Math.sin(phaseAge*2)*.10};
      state.toy={kind:'feather',phase:'lure',position:tip,from:{x:owner.x+Math.cos(yaw)*.18,y:owner.y+.7,z:owner.z-Math.sin(yaw)*.18}};
      state.pose=t<.75?'stalk':t<1.15?'pounce':t<1.70?'swat':'idle';
      state.actionTime=t<.75?t:t<1.15?t-.75:t<1.70?t-1.15:t-1.70;
      state.playSide=Math.floor(phaseAge/2.6)%2?-1:1;
      if(t>=.75&&t<1.15)follow.moveTo(dt,tip,{speed:1.7,radius:.35});else follow.moveTo(dt,{...nav},{face:facing(nav,tip)});
      if(phaseAge>7.8)finish('Good game!');
    }
    return state;
  }
  return {follow,state,command,step,reset,debug:()=>({...state,toy:state.toy?JSON.parse(JSON.stringify(state.toy)):null})};
}
