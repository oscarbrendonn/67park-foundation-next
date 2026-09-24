import * as THREE from 'three';

// Reuse the game's existing action cadence and contact time. The Cat's second
// paw is cosmetic: only the original .14-second impact may apply gameplay hits.
export const PUNCH_SECONDS=.46;
export const PUNCH_COOLDOWN_SECONDS=.65;
export const PUNCH_IMPACT_SECONDS=.14;
export const CAT_FOLLOW_THROUGH_SECONDS=.27;
const zero=[0,0,0],sequence=(windup,impact,recover)=>[zero,windup,impact,recover,zero];
const times=[0,.10,PUNCH_IMPACT_SECONDS,CAT_FOLLOW_THROUGH_SECONDS,PUNCH_SECONDS];
export const CHARACTER_PUNCH_PROFILES=Object.freeze({
 goril:{id:'gorilla-punch',effect:'star',colors:['#ffcf61','#fff5cc'],poses:{
  Spine2:sequence([0,-.14,0],[.08,.22,0],[.03,.1,0]),
  BiscepR:sequence([.25,0,.12],[1.1,.12,.2],[.6,0,.12]),
  ArmR:sequence([.8,0,0],[.08,0,0],[.4,0,0]),
  BiscepL:sequence([.15,0,-.1],[.3,0,-.1],[.15,0,0]),
  ArmL:sequence([.4,0,0],[.55,0,0],[.3,0,0]),
 }},
 ninja67:{id:'ninja-strike',effect:'slash',colors:['#9684d5','#83d6e7'],poses:{
  Spine2:sequence([0,-.25,0],[.1,.4,0],[.03,.12,0]),
  BiscepR:sequence([.45,.1,.15],[1.45,-.12,.16],[.6,0,.08]),
  ArmR:sequence([1.1,0,0],[.08,0,0],[.6,0,0]),
  BiscepL:sequence([.9,0,-.1],[.7,0,-.1],[.4,0,0]),
  ArmL:sequence([.85,0,0],[1.1,0,0],[.5,0,0]),
  Head:sequence([0,.12,0],[0,-.2,0],[0,-.04,0]),
 }},
 cat67:{id:'cat-scratch',effect:'paw',colors:['#e993bd','#b69cdd'],poses:{
  Spine1:sequence([.12,0,0],[.24,0,0],[.18,0,0]),
  Head:sequence([-.08,0,0],[-.16,0,0],[-.12,0,0]),
  BiscepR:sequence([1.25,-.15,.16],[.55,.2,.05],[1.3,0,.1]),
  ArmR:sequence([.65,0,0],[.1,0,0],[.75,0,0]),
  BiscepL:sequence([1.0,.15,-.16],[1.3,0,-.1],[.55,-.2,-.05]),
  ArmL:sequence([.6,0,0],[.75,0,0],[.1,0,0]),
  HandL:sequence([-.22,0,0],[-.3,0,0],[-.6,0,0]),
  HandR:sequence([-.22,0,0],[-.6,0,0],[-.3,0,0]),
 }},
});
export const punchProfile=base=>CHARACTER_PUNCH_PROFILES[base]||CHARACTER_PUNCH_PROFILES.goril;

// Absolute authoring against the shared idle rig; the animation controller
// converts only this new clip to an additive upper-body layer. Never mutate the
// shared cached clips, root transform, lower body, head geometry or jump clips.
export function withCharacterPunch(clips,base){
 const profile=CHARACTER_PUNCH_PROFILES[base];if(!profile)return clips;
 const idle=clips.find(c=>c.name==='idle');if(!idle)throw Error('Punch needs the shared idle rig');
 const tracks=Object.entries(profile.poses).map(([bone,poses])=>{
  const rest=idle.tracks.find(t=>t.name===bone+'.quaternion');if(!rest)throw Error('Missing punch bone '+bone);
  const q=new THREE.Quaternion().fromArray(rest.values),values=[];
  for(const angles of poses)values.push(...q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles))).normalize().toArray());
  return new THREE.QuaternionKeyframeTrack(rest.name,times,values,THREE.InterpolateLinear);
 });
 const clip=new THREE.AnimationClip('previewPunch',PUNCH_SECONDS,tracks);
 return [...clips.filter(c=>c.name!=='previewPunch'),clip];
}
