// Authored playing-line bounds; the stadium uses the existing west widening.
const sx=80.3/40.3,stadiumX=x=>201.15+(x-201.15)*sx;
export const LOBBY_COURTS=Object.freeze([
 {id:'basket',sport:'basketball',label:'Basketball',mesh:'SPORT103_BASKETBALL',radius:.32,x:-54,z:-30.5,halfX:14,halfZ:7.5,spawn:[-51.2,-28.3],anchor:[-63.5,-32.5],lift:.31,entry:[-54,-18.9]},
 {id:'penalty',sport:'football',label:'Football',mesh:'SPORT103_FOOTBALL',radius:.34,x:stadiumX(181.2),z:-37,halfX:9.5*sx,halfZ:23.4,spawn:[stadiumX(183),-28.8],anchor:[181.2,-37],lift:.32,entry:[stadiumX(181.2),1.8]}
]);
export function courtContains(c,x,z,margin=0){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x-c.x)<=c.halfX+margin&&Math.abs(z-c.z)<=c.halfZ+margin;}
export function constrainCourtBall(ball,c){
 for(const [axis,center,half] of [['x',c.x,c.halfX],['z',c.z,c.halfZ]]){
  const lo=center-half+c.radius,hi=center+half-c.radius,v='v'+axis;
  if(ball[axis]<lo){ball[axis]=lo;ball[v]=Math.abs(ball[v])*.42;}
  if(ball[axis]>hi){ball[axis]=hi;ball[v]=-Math.abs(ball[v])*.42;}
 }
 return ball;
}
export class LobbyCourtBalls{
 constructor(ground=()=>0){this.players=new Map();this.balls=LOBBY_COURTS.map(c=>({id:c.id,x:c.spawn[0],z:c.spawn[1],vx:0,vz:0,floor:(ground(...c.anchor)??0)+c.lift}));}
 step(dt,now,players=[]){
  dt=Math.max(0,Math.min(.05,dt));const active=[];
  for(const p of players){
   if(!p.p||!p.p.every(Number.isFinite)||now-p.at>250||p.mounted||p.inMatch)continue;
   let last=this.players.get(p.id);
   if(!last||p.at!==last.at){
    const seconds=last?(p.at-last.at)/1000:0,dx=last?p.p[0]-last.x:0,dz=last?p.p[2]-last.z:0;
    // Joining, teleporting and stale/reconnected packets cannot kick a ball.
    const valid=seconds>0&&seconds<.3&&Math.hypot(dx,dz)<3;
    last={x:p.p[0],z:p.p[2],at:p.at,vx:valid?dx/seconds:0,vz:valid?dz/seconds:0};this.players.set(p.id,last);
   }
   active.push({...last,y:p.p[1],id:p.id});
  }
  for(const [id,p] of this.players)if(now-p.at>1000)this.players.delete(id);
  for(const b of this.balls){const c=LOBBY_COURTS.find(c=>c.id===b.id);
   const near=active.filter(p=>courtContains(c,p.x,p.z)&&Math.abs(p.y-b.floor)<1.8&&Math.hypot(p.vx,p.vz)>.15&&Math.hypot(b.x-p.x,b.z-p.z)<c.radius+.68).sort((a,d)=>Math.hypot(b.x-a.x,b.z-a.z)-Math.hypot(b.x-d.x,b.z-d.z)||a.id.localeCompare(d.id));
   const p=near[0];if(p){let dx=b.x-p.x,dz=b.z-p.z,len=Math.hypot(dx,dz);if(len<.01){dx=p.vx;dz=p.vz;len=Math.hypot(dx,dz);}dx/=len;dz/=len;
    const approach=p.vx*dx+p.vz*dz;if(approach>0){const speed=Math.min(8,Math.max(2,approach*1.08)),separation=Math.max(len,c.radius+.53);b.vx=dx*speed;b.vz=dz*speed;b.x=p.x+dx*separation;b.z=p.z+dz*separation;}
   }
   b.x+=b.vx*dt;b.z+=b.vz*dt;const drag=Math.exp(-2.4*dt);b.vx*=drag;b.vz*=drag;if(Math.hypot(b.vx,b.vz)<.025)b.vx=b.vz=0;constrainCourtBall(b,c);
  }
 }
 snapshot(){return this.balls.map(({id,x,z,vx,vz})=>({id,x,z,vx,vz}));}
}
