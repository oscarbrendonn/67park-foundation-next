import {createTravelSampler} from './feel-camera.js';
import {isNativeCharacter} from './native-character.js?v=cat-character-1';
import * as T from 'three';
import {createClaudeGorillaAnimation} from './claude-gorilla-animation.js?v=bot-hit-13';
import {createClaudeCharacterAnimation} from './claude-character-animation.js?v=bot-hit-13';

// Share the park's approved clips without importing its movement controller.
// Mini-game physics, hit rules, weapon poses and vehicle seating remain owners
// of those states. Failed clip loading falls back to the existing animator.
export function shareMinigameMotion(model, donor, root, fallback) {
  const base=root.userData.equipment?.base??'goril',native=isNativeCharacter(base);
  const mixer=native?new T.AnimationMixer(model):null;
  const motion=native?createClaudeGorillaAnimation({model,mixer,actions:{},base}):createClaudeCharacterAnimation({model,donor:donor.scene,base});
  const sampleTravel=createTravelSampler(),travelPosition=new T.Vector3();
  let disposed=false,jump=0,land=0,special=0,phase=0,step=0;
  const contact=fallback.contact??{serial:0,foot:'left'};
  const stats={source:'Claude selected character motion',base,backend:'loading',animation:motion.stats,disposed:false};
  root.userData.locomotion=stats;
  return {
    contact,stats,ready:motion.ready,mixer:mixer??motion.mixer,
    signal(action){if(disposed)return false;if(action==='jump'){jump=.25;land=0;}if(action==='land'){land=.22;jump=0;}return fallback.signal?.(action);},
    play(action){if(disposed)return false;special=1.4;motion.reset();return fallback.play?.(action);},
    reset(){if(disposed)return;motion.reset();fallback.reset?.();jump=land=special=phase=step=0;},
    update(delta,input={}){
      if(disposed)return;
      const dt=T.MathUtils.clamp(Number.isFinite(delta)?delta:0,0,.05),speed=Math.max(0,Number.isFinite(input.speed)?input.speed:0);
      jump=Math.max(0,jump-dt);land=Math.max(0,land-dt);special=Math.max(0,special-dt);
      if(input.seated||input.mounted||input.board||input.swimming||input.enabled===false){motion.reset();stats.backend='special';return;}
      if(!motion.stats.ready||special>0){motion.reset();fallback.update(dt,input);stats.backend='fallback';return;}
      root.getWorldPosition(travelPosition);
      const measured=sampleTravel(travelPosition,dt);
      const state={enabled:true,visualSpeed:measured??speed,grounded:jump<=0&&input.grounded!==false,speed,verticalVelocity:Number.isFinite(input.verticalVelocity)?input.verticalVelocity:jump>0?7:0,landT:land,hover:!!input.hover,squash:0,stretch:0};
      const handled=native?motion.update(state):motion.update(dt,state);
      if(native&&handled)mixer.update(dt);
      if(!handled)fallback.update(dt,input);
      stats.backend=handled?'claude':'fallback';stats.clip=motion.stats.clip;stats.speed=speed;
      if(handled&&state.grounded&&speed>.3){phase+=dt*speed/1.7;const next=Math.floor(phase);if(next!==step){contact.serial++;contact.foot=next%2?'left':'right';step=next;}}
    },
    dispose(){if(disposed)return;disposed=true;motion.dispose();fallback.dispose();mixer?.stopAllAction();mixer?.uncacheRoot(model);stats.disposed=true;stats.backend='disposed';},
  };
}
