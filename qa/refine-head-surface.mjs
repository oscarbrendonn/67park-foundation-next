// Conforming refinement in the reference plane, measured on the curved 3D
// surface. Shared edge midpoints keep adjacent colour regions watertight.
export function refineHeadSurface(inputPoints,inputTriangles,surface,{tolerance=.00012,rounds=12}={}) {
 const points=inputPoints.map(p=>p.clone());let triangles=inputTriangles.map(t=>[...t]);
 const key=(a,b)=>a<b?a+':'+b:b+':'+a;
 let maxError=0,passes=0;
 for(;passes<=rounds;passes++){
  const split=new Map();maxError=0;
  for(const tri of triangles)for(let k=0;k<3;k++){
   const a=tri[k],b=tri[(k+1)%3],id=key(a,b);if(split.has(id))continue;
   const p=points[a],q=points[b],start=surface(p),end=surface(q);
   // Bisect in 3D arc distance, not in flattened image space. A flat midpoint
   // crowds many tiny triangles onto the silhouette's square-root slope.
   let lo=0,hi=1;
   for(let n=0;n<16;n++){const t=(lo+hi)/2,m=surface(p.clone().lerp(q,t));if(m.distanceToSquared(start)>m.distanceToSquared(end))hi=t;else lo=t;}
   const mid=p.clone().lerp(q,(lo+hi)/2),curved=surface(mid),edge=end.clone().sub(start);
   const t=Math.max(0,Math.min(1,curved.clone().sub(start).dot(edge)/edge.lengthSq()));
   const error=curved.distanceTo(start.addScaledVector(edge,t));
   maxError=Math.max(maxError,error);
   if(error>tolerance)split.set(id,mid);
  }
  if(!split.size)break;
  if(passes===rounds)throw Error('Head refinement did not meet curvature tolerance: '+maxError);
  for(const [id,point] of split){split.set(id,points.length);points.push(point);}
  const next=[];
  for(const tri of triangles){
   const mid=tri.map((a,k)=>split.get(key(a,tri[(k+1)%3]))),count=mid.filter(x=>x!==undefined).length;
   if(!count){next.push(tri);continue;}
   if(count===3){const [a,b,c]=tri,[ab,bc,ca]=mid;next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);continue;}
   if(count===1){const k=mid.findIndex(x=>x!==undefined),a=tri[k],b=tri[(k+1)%3],c=tri[(k+2)%3],ab=mid[k];next.push([a,ab,c],[ab,b,c]);continue;}
   const k=mid.findIndex(x=>x===undefined),a=tri[k],b=tri[(k+1)%3],c=tri[(k+2)%3],bc=mid[(k+1)%3],ca=mid[(k+2)%3];
   next.push([a,b,bc],[a,bc,ca],[ca,bc,c]);
  }
  triangles=next;
 }
 return {points,triangles,stats:{maxChordError:maxError,tolerance,passes,triangles:triangles.length}};
}
