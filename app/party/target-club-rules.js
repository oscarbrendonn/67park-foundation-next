export const ROUND_SECONDS=30;
export const SHOT_INTERVAL=.16;
export function createTargetRound(){return {phase:'ready',time:0,score:0,shots:0,hits:0,lastShot:-1,down:Array(6).fill(-1)};}
export function startTargetRound(){return {...createTargetRound(),phase:'playing'};}
export function advanceTargetRound(r,dt){
 if(r.phase!=='playing'||!Number.isFinite(dt)||dt<0)return;
 r.time=Math.min(ROUND_SECONDS,r.time+dt);if(r.time>=ROUND_SECONDS)r.phase='finished';
}
export function targetPositions(r,reduced=false){return Array.from({length:6},(_,id)=>({id,x:180+(id%3)*270+(reduced?0:42*Math.sin(r.time*.85+id*1.7+(r.seed||0)%97)),y:220+Math.floor(id/3)*158,radius:50,up:r.time>=r.down[id]}));}
export function shootTarget(r,x,y,reduced=false){
 if(r.phase!=='playing'||![x,y].every(Number.isFinite)||r.time-r.lastShot<SHOT_INTERVAL)return null;
 r.lastShot=r.time;r.shots++;
 const hit=targetPositions(r,reduced).find(t=>t.up&&Math.hypot(x-t.x,y-t.y)<=t.radius);
 if(!hit)return {points:0,x,y};
 const points=Math.hypot(x-hit.x,y-hit.y)<=18?100:25;
 r.hits++;r.score+=points;r.down[hit.id]=r.time+.9;return {points,x:hit.x,y:hit.y,id:hit.id};
}
export function nearTargetBooth(p,site){
 if(!p||!site||![p.x,p.y,p.z,site.x,site.y,site.z,site.yaw].every(Number.isFinite))return false;
 const dx=p.x-site.x,dz=p.z-site.z,c=Math.cos(site.yaw),s=Math.sin(site.yaw);
 const x=dx*c-dz*s,z=dx*s+dz*c;
 return Math.abs(x)<3.2&&z>1.85&&z<5.8&&Math.abs(p.y-site.y-.555)<1.0;
}
