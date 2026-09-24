"""Four bounded contour repairs, baked from the 682fa42 rendered terrain.

Usage: python3 qa/bake-map-joint-finish.py [audit-directory]
No textures, floating decals, new scene objects, or per-frame modifiers.
"""
import json, sys, zlib
from pathlib import Path
import numpy as np
import shapely
from shapely import Polygon, Point, LineString, box, union_all, set_precision, constrained_delaunay_triangles
from shapely.geometry.polygon import orient
from shapely.ops import nearest_points

audit=Path(sys.argv[1] if len(sys.argv)>1 else '.qa-results/crack-audit-682fa42-20260924')
meshes={m['name']:m for m in json.loads((audit/'terrain-live.json').read_text())['meshes']}
shapes={n:shapely.from_geojson(s) for n,s in json.loads((audit/'geometry-complete/footprints.json').read_text()).items()}
rows={};changes={};world={}
TOP=9.38008564;ROAD=9.22754747;BOTTOM=8.79685173
def parts(g):
    return [] if g.is_empty else [g] if g.geom_type=='Polygon' else [p for c in getattr(g,'geoms',[]) for p in parts(c)]
def expected(m):
    return dict(vertices=len(m['p'])//3,indices=len(m['ix']),positionCRC=f'{zlib.crc32(np.array(m["p"],dtype="<f4").tobytes()):08x}',indexCRC=f'{zlib.crc32(np.array(m["ix"],dtype="<u4").tobytes()):08x}')
def row(name):
    if name not in rows:rows[name]=dict(name=name,expected=expected(meshes[name]),remove=[],p=[],n=[],ix=[])
    return rows[name]
def triangles(name):
    if name not in world:
        m=meshes[name];p=np.array(m['p']).reshape(-1,3);M=np.array(m['matrix']).reshape(4,4).T
        w=np.einsum('ij,kj->ik',np.column_stack((p,np.ones(len(p)))),M)[:,:3]
        world[name]=w[np.array(m['ix'],dtype=int).reshape(-1,3)]
    return world[name]
def tri(r,v,normals=None):
    v=np.round(np.array(v),8);n=np.cross(v[1]-v[0],v[2]-v[0]);length=np.linalg.norm(n)
    if length<1e-11:return
    start=len(r['p'])//3;r['p'].extend(np.round(v,8).ravel().tolist());r['n'].extend(np.round(np.tile(n/length,(3,1)) if normals is None else normals,7).ravel().tolist());r['ix'].extend([start,start+1,start+2])
def cap(r,shape,y,up=True):
    for p in parts(shape):
        for f in constrained_delaunay_triangles(p).geoms:
            v=[[x,y,z] for x,z in list(f.exterior.coords)[:3]]
            if np.cross(np.subtract(v[1],v[0]),np.subtract(v[2],v[0]))[1]*(1 if up else -1)<0:v.reverse()
            tri(r,v)
def walls(r,shape,top,bottom):
    for p in parts(shape):
        p=orient(p,sign=1)
        for ring in [p.exterior,*p.interiors]:
            for (x,z),(a,b) in zip(ring.coords,list(ring.coords)[1:]):
                tri(r,[[x,top,z],[a,bottom,b],[a,top,b]])
                tri(r,[[x,top,z],[x,bottom,z],[a,bottom,b]])
def solid(r,shape,top,bottom=BOTTOM):
    cap(r,shape,top);cap(r,shape,bottom,False);walls(r,shape,top,bottom)
def rounded(r,shape,top=TOP,radius=.06):
    """Closed solid with a continuous circular shoulder, not faceted normals."""
    boundary=shape.boundary;segments=[]
    for p in parts(shape):
        p=orient(p,sign=1)
        for ring in [p.exterior,*p.interiors]:
            for a,b in zip(ring.coords,list(ring.coords)[1:]):
                a=np.array(a);d=np.subtract(b,a);length=np.linalg.norm(d)
                if length>1e-9:segments.append((a,d,length,np.array([d[1],-d[0]])/length))
    def at(x,z):
        p=Point(x,z);distance=min(radius,boundary.distance(p));edge=nearest_points(boundary,p)[0]
        d=np.array([edge.x-x,edge.y-z]);length=np.linalg.norm(d)
        if length<1e-8:
            q=np.array([x,z]);best=float('inf');ns=[]
            for a,e,L,n in segments:
                ds=np.linalg.norm(q-a-e*np.clip(np.dot(q-a,e)/(L*L),0,1))
                if ds<best-1e-7:best=ds;ns=[n]
                elif abs(ds-best)<1e-7:ns.append(n)
            d=np.sum(ns,axis=0);length=np.linalg.norm(d)
        horizontal=max(0,1-distance/radius);vertical=np.sqrt(max(0,1-horizontal*horizontal))
        return top-radius+radius*vertical,[d[0]/length*horizontal,vertical,d[1]/length*horizontal]
    levels=[0,radius*(1-np.cos(np.pi/6)),radius/2,radius]
    offsets=[shape.buffer(-d,quad_segs=16) for d in levels]
    for a,b in zip(offsets,offsets[1:]):
        for p in parts(a.difference(b)):
            for f in constrained_delaunay_triangles(p).geoms:
                coords=list(f.exterior.coords)[:3];v=[];ns=[]
                for x,z in coords:y,n=at(x,z);v.append([x,y,z]);ns.append(n)
                if np.cross(np.subtract(v[1],v[0]),np.subtract(v[2],v[0]))[1]<0:v.reverse();ns.reverse()
                tri(r,v,ns)
    cap(r,offsets[-1],top);cap(r,shape,BOTTOM,False);walls(r,shape,top-radius,BOTTOM)
def clip_out(r,region):
    """Clip intersecting source faces in their original plane, no global rebuild."""
    bounds=region.bounds
    for i,v in enumerate(triangles(r['name'])):
        if i*3 in removed[r['name']]:continue
        xz=v[:,[0,2]]
        if xz[:,0].max()<bounds[0] or xz[:,0].min()>bounds[2] or xz[:,1].max()<bounds[1] or xz[:,1].min()>bounds[3]:continue
        p=Polygon(xz);n=np.cross(v[1]-v[0],v[2]-v[0]);L=np.linalg.norm(n)
        if L<1e-12:continue
        n/=L
        if p.area<1e-10:
            aa,bb=max(((a,b) for a in range(3) for b in range(a+1,3)),key=lambda ab:np.linalg.norm(xz[ab[1]]-xz[ab[0]]))
            origin=xz[aa];axis=xz[bb]-origin;total=np.linalg.norm(axis)
            if total<1e-9:continue
            axis/=total;remain=LineString([origin,origin+axis*total]).difference(region)
            if abs(remain.length-total)<1e-9:continue
            removed[r['name']].add(i*3)
            face=Polygon([[(q-origin)@axis,y] for q,y in zip(xz,v[:,1])])
            for seg in [remain] if remain.geom_type=='LineString' else getattr(remain,'geoms',[]):
                if seg.geom_type!='LineString' or seg.length<1e-8:continue
                ts=[(np.array(q)-origin)@axis for q in seg.coords]
                for part in parts(face.intersection(box(min(ts),v[:,1].min()-1,max(ts),v[:,1].max()+1))):
                    for f in constrained_delaunay_triangles(part).geoms:
                        verts=[[(origin+axis*t)[0],y,(origin+axis*t)[1]] for t,y in list(f.exterior.coords)[:3]]
                        if np.dot(np.cross(np.subtract(verts[1],verts[0]),np.subtract(verts[2],verts[0])),n)<0:verts.reverse()
                        tri(r,verts)
            continue
        remain=p.difference(region)
        if p.area-remain.area<1e-11:continue
        removed[r['name']].add(i*3)
        if remain.is_empty:continue
        coeff=np.linalg.solve(np.column_stack([xz,np.ones(3)]),v[:,1])
        for part in parts(remain):
            for f in constrained_delaunay_triangles(part).geoms:
                verts=[[x,float(np.clip(coeff@[x,z,1],v[:,1].min(),v[:,1].max())),z] for x,z in list(f.exterior.coords)[:3]]
                if np.dot(np.cross(np.subtract(verts[1],verts[0]),np.subtract(verts[2],verts[0])),n)<0:verts.reverse()
                tri(r,verts)

from collections import defaultdict
removed=defaultdict(set)
# Fairground: one concentric rounded perimeter follows the ACTUAL plaza.
# The lower four-corner apron and chamfered curb caused the crescent seams.
plaza=max(parts(shapes['5_DOGU_SAHIL_MEYDAN_ZEMIN']),key=lambda p:p.area)
plaza=set_precision(Polygon(plaza.exterior),.00001).simplify(.00005)
assert np.allclose(plaza.bounds,[161.18838,-178.20901,201.79851,-89.52426],atol=.0001)
fair_old=next(p for p in parts(shapes['6_BORDUR']) if p.bounds[0]>159 and p.bounds[2]<204 and p.area>290)
fair_width=1.14224
fair_outer=plaza.buffer(fair_width,quad_segs=24)
fair_new=fair_outer.difference(plaza.buffer(-.0002))
clip_out(row('6_BORDUR'),fair_old.buffer(.0003));rounded(row('6_BORDUR'),fair_new)
apron=row('7_DOGU_SAHIL_MEYDAN_APRON');removed[apron['name']]=set(range(0,apron['expected']['indices'],3))
# Beneath the removed angular corners, continue the adjacent road, not soil.
fair_road=Polygon(fair_old.exterior).union(fair_outer).difference(plaza).difference(shapes['5_YOL'])
solid(row('5_YOL'),fair_road.buffer(.0003),ROAD-.0002)
changes['fairground']={'old':fair_old,'new':fair_new,'plaza':plaza}

# City: remove the measured backtracking vertices and match both ends of the
# southern horizontal return to a single Z. Retain large authored openings.
city=next(p for p in parts(shapes['6_BORDUR']) if p.bounds[0]>-100 and p.bounds[0]<-99 and p.area>350)
west=next(p for p in parts(shapes['6_BORDUR']) if p.bounds[0]<-123 and 278<p.area<282)
def clean(p,kind):
    def ring(r,is_outer):
        out=[]
        for x,z in r.coords[:-1]:
            if kind=='city' and abs(z-27)<.0001 and -99.15<x<-99.12:continue
            if kind=='west':
                if is_outer and abs(z-114.4)<.0001:continue
                if not is_outer and ((abs(z-114.4)<.0001 and x<-49.9) or (-52.51<x<-52.29 and z>114.67)):continue
                if not is_outer and x>-54 and z>114.67:z=114.6734
                if is_outer and x>-54 and z>115.8:z=115.8398
            out.append((x,z))
        return out
    new=Polygon(ring(p.exterior,True),[ring(r,False) for r in p.interiors if Polygon(r).area>.001])
    assert new.is_valid and len(new.interiors)==1
    return new
city_new=clean(city,'city');west_new=clean(west,'west')
south_window=box(-54,114,-48,116.5)
filleted=west_new.buffer(.18,quad_segs=16).buffer(-.36,quad_segs=16).buffer(.18,quad_segs=16)
west_new=union_all([west_new.difference(south_window),filleted.intersection(south_window)])
assert city.symmetric_difference(city_new).area<.02
assert west.symmetric_difference(west_new).area<.4
city_old=union_all([city,west]);city_new_all=union_all([city_new,west_new])
clip_out(row('6_BORDUR'),city_old.buffer(.0003));rounded(row('6_BORDUR'),city_new_all)
changes['city']={'old':city_old,'new':city_new_all}

# Actual enclosed top-surface slivers around the city and curved bridge.
# Large courtyard/water openings are never filled. 0.05 m² is an explicit
# candidate area ceiling; the affected upper footprint totals < 0.5 m².
covered=set_precision(union_all(list(shapes.values())),.00001)
city_scope=box(-125,23,-15,117)
gaps=[Polygon(r) for p in parts(covered) for r in p.interiors if .00000001<Polygon(r).area<.05 and city_scope.covers(Polygon(r))]
gap_union=union_all(gaps)
assert .08<gap_union.area<.5 and len(gaps)>10
solid(row('5_YOL'),gap_union.buffer(.0004,quad_segs=2),ROAD-.0002)
# Any area exposed by straightening the old teeth retains the road surface.
city_exposed=city_old.difference(city_new_all).difference(shapes['5_YOL'])
solid(row('5_YOL'),city_exposed.buffer(.0004),ROAD-.0002)
changes['bridge']={'new':gap_union}

# Stadium: replace the stray round tab + tapered coastal spike with a single
# tangent transition from the exact road end to a constant-width grass edge.
stadium_scope=box(225,23.7272,253,37)
grass=shapes['3_CIMEN_KOYU']
coast_width=1.14224;coast=grass.buffer(coast_width,quad_segs=24)
x0=238.32959;z0=23.7272;x1=241.65
z1=28.73117-coast_width*np.sqrt(1+(1/3.75)**2)
control=np.array([x0,z1-(x1-x0)/3.75]);start=np.array([x0,z0]);end=np.array([x1,z1])
arc=[((1-t)**2*start+2*(1-t)*t*control+t*t*end).tolist() for t in np.linspace(0,1,49)]
transition=Polygon([(225,z0),*arc,[x1,37],[225,37]])
stadium_new=set_precision(union_all([coast,transition]).intersection(stadium_scope),.00001)
stadium_old=union_all([shapes['6_BORDUR'],shapes['7_KALDIRIM_TABANI']]).intersection(stadium_scope)
# Blend into the unchanged shoreline contour with zero derivative at each
# end. A rectangular repair window must not become a new visible curb step.
join=[]
zs=sorted(set(np.linspace(32,37,81).tolist()+[z for p in parts(stadium_old) for x,z in p.exterior.coords if 32<z<37]))
for z in zs:
    line=LineString([(225,z),(253,z)])
    authored=stadium_old.intersection(line).bounds[2]
    regular=stadium_new.intersection(line).bounds[2]
    t=(z-32)/5;t=t*t*(3-2*t)
    join.append((regular*(1-t)+authored*t,z))
stadium_new=set_precision(union_all([stadium_new.intersection(box(225,23.7272,253,32)),Polygon([(225,32),*join,(225,37)])]),.00001)
assert stadium_new.is_valid and len(parts(stadium_new))==1
assert not stadium_new.covers(Point(239.15,24.5)), 'No isolated protruding tab'
clip_out(row('6_BORDUR'),stadium_scope);clip_out(row('7_KALDIRIM_TABANI'),stadium_scope)
# Flat at shared cuts and inside the lawn; only the exposed coast is vertical.
# The inherited lane-to-curb height is unchanged.
solid(row('7_KALDIRIM_TABANI'),stadium_new,TOP)
changes['stadium']={'old':stadium_old,'new':stadium_new}

for r in rows.values():
    r['remove']=sorted(removed[r['name']]);unique={};p=[];n=[];ix=[]
    for i in r['ix']:
        a=r['p'][i*3:i*3+3];b=r['n'][i*3:i*3+3];key=tuple(a+b)
        if key not in unique:unique[key]=len(p)//3;p.extend(a);n.extend(b)
        ix.append(unique[key])
    r.update(p=p,n=n,ix=ix)
    assert len(r['p'])==len(r['n']) and all(np.isfinite(r['p'])) and all(np.isfinite(r['n']))
metrics=dict(fairgroundWidth=fair_width,coastWidth=coast_width,cityGapCount=len(gaps),cityGapArea=gap_union.area,cityContourDelta=city_old.symmetric_difference(city_new_all).area,stadiumContourDelta=stadium_old.symmetric_difference(stadium_new).area,addedDrawCalls=0,perFrameWork=0)
patch=dict(version=1,sourceRevision='682fa42441bdbd9c679a8a6ec03fa9048e71f318',meshes=list(rows.values()),donors=[dict(name=plaza_name,expected=expected(meshes[plaza_name])) for plaza_name in ['5_DOGU_SAHIL_MEYDAN_ZEMIN','3_CIMEN_KOYU']],metrics=metrics)
destination=Path('repairs/map-joint-finish-1.json');destination.write_text(json.dumps(patch,separators=(',',':'))+'\n')
out=Path('.qa-results/map-joint-finish-1');out.mkdir(exist_ok=True)
(out/'contours.json').write_text(json.dumps({k:{n:shapely.to_geojson(v) for n,v in values.items()} for k,values in changes.items()}))
print(json.dumps(dict(metrics=metrics,bytes=destination.stat().st_size,meshes=[dict(name=r['name'],removed=len(r['remove']),added=len(r['ix'])//3) for r in rows.values()]),indent=2))
