import {coast20Data as data} from './kimi-coast20-data.js?v=coast-24';
import {expandIslandDriveArea} from './island-drive-area.js?v=rail-corner-1';

// Server authority uses the same world-space triangles as the rendered repair.
// This changes only the added coast strip; old terrain remains the fallback.
export function withPreviewCoast(source) {
  const cells=new Map(),size=8;
  for(let i=0;i<data.ix.length;i+=3){
    const a=data.ix[i]*3,b=data.ix[i+1]*3,c=data.ix[i+2]*3,p=data.p;
    const ax=p[a],az=p[a+2],bx=p[b],bz=p[b+2],cx=p[c],cz=p[c+2];
    const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
    // Vertical walls and sub-millimetre bevel slivers are not driving floors.
    if(Math.abs(den)<1e-8||data.n[a+1]+data.n[b+1]+data.n[c+1]<=0)continue;
    const triangle={ax,az,bx,bz,cx,cz,ay:p[a+1],by:p[b+1],cy:p[c+1],den};
    for(let x=Math.floor(Math.min(ax,bx,cx)/size);x<=Math.floor(Math.max(ax,bx,cx)/size);x++)
      for(let z=Math.floor(Math.min(az,bz,cz)/size);z<=Math.floor(Math.max(az,bz,cz)/size);z++){
        const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(triangle);
      }
  }
  const original=source.ground;
  source.ground=(x,z)=>{
    let height=original(x,z);
    for(const t of cells.get(Math.floor(x/size)+','+Math.floor(z/size))||[]){
      const u=((t.bz-t.cz)*(x-t.cx)+(t.cx-t.bx)*(z-t.cz))/t.den;
      const v=((t.cz-t.az)*(x-t.cx)+(t.ax-t.cx)*(z-t.cz))/t.den;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8){const y=u*t.ay+v*t.by+(1-u-v)*t.cy;if(height==null||y>height)height=y;}
    }
    return height;
  };
  expandIslandDriveArea(source.area,{ground:source.ground,water:source.water});
  source.previewFloorRevision=data.revision;
  return source;
}
