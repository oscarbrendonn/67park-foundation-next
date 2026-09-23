"""Join the two northern housing lawns and interior pavements; keep the beach.

Input is a live post-repair mesh export. Output uses the existing grass/paving
meshes and materials; no new draw calls or frame-time work are introduced.
"""
import json, sys, zlib
from pathlib import Path
import numpy as np
import shapely
from shapely import Polygon, Point, box, union_all, set_precision, constrained_delaunay_triangles
from shapely.geometry.polygon import orient
from shapely.ops import nearest_points

source, destination = map(Path, sys.argv[1:3])
meshes = {m['name']:m for m in json.loads(source.read_text())['meshes']}
def parts(g):
    return [] if g.is_empty else [g] if g.geom_type=='Polygon' else [p for c in g.geoms for p in parts(c)]
def triangles(m):
    p=np.array(m['p']).reshape(-1,3);matrix=np.array(m['matrix']).reshape(4,4).T
    w=np.einsum('ij,kj->ik',np.column_stack((p,np.ones(len(p)))),matrix)[:,:3]
    return w[np.array(m['ix']).reshape(-1,3)]
def footprint(t):
    n=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0])
    top=t[(n[:,1]>1e-9)&(t[:,:,1].min(axis=1)>9)]
    return union_all(set_precision(shapely.polygons(top[:,:,[0,2]]),.00001))
def selected(name,bounds):
    t=triangles(meshes[name]);a,b,c,d=bounds;xz=t[:,:,[0,2]]
    inside=(xz[:,:,0]>=a)&(xz[:,:,0]<=c)&(xz[:,:,1]>=b)&(xz[:,:,1]<=d)
    assert not np.any(inside.any(axis=1)&~inside.all(axis=1)), 'Do not split unrelated faces: '+name
    return t,inside.all(axis=1)

pt,ps=selected('7_KALDIRIM_TABANI',(-3,-242,136,-215))
gt,gs=selected('3_CIMEN',(0,-242,135,-218))
old_paving=footprint(pt[ps]);old_grass=footprint(gt[gs])
assert len(parts(old_paving))==2 and len(parts(old_grass))==2
assert 2290<old_paving.area<2294 and 1700<old_grass.area<1705
lawns=sorted(parts(old_grass),key=lambda p:p.bounds[0])
# Shared back and front contours continue the two authored lawn boundaries.
grass_bridge=Polygon([(64.66048,-235.74118),(80.81157,-232.76522),
                      (84.04179,-218.44049),(61.43026,-218.44049)])
new_grass=set_precision(union_all([old_grass,grass_bridge]),.00001)
assert len(parts(new_grass))==1 and new_grass.covers(old_grass)
# Keep one continuous cap at the housing/road join. The old independent curb
# has a lowered inner bevel, while the replacement paving is flat: retaining
# both leaves broken shading seams. Its complete northern U is isolated from
# other curb components, so absorb its footprint into the existing pavement.
ct,cs=selected('6_BORDUR',(-5,-238,150,-189))
curb_triangles=ct[cs].copy()
end_mask=(curb_triangles[:,:,0]<-3.3)&(curb_triangles[:,:,2]<-237)
curb_triangles[:,:,2][end_mask]-=3.4740943948413587
housing_curb=footprint(curb_triangles)
assert len(parts(housing_curb))==1 and 280<housing_curb.area<285
# The previous union retained the old squared-off coastal tabs. Derive this
# edge ONLY from the joined lawn, with a uniform round-offset promenade.
# Width also meets the existing western inner curb without a narrow sand slit.
coast_width=4.34016
coast_band=new_grass.buffer(coast_width,quad_segs=24,join_style='round')
# Front plaza remains joined to the exact authored curb. It is independent of
# the coastal contour, so apartment plots and road boundaries cannot move.
corner_radius=3.44049
corner=[(148.33391-corner_radius+corner_radius*np.cos(a),-215+corner_radius*np.sin(a)) for a in np.linspace(-np.pi/2,0,25)]
infill=Polygon([(-3.38677,-218.44049),*corner,(148.33391,-192.12653),
 (147.78192,-191.61547),(147.27087,-191.06350),(-2.32373,-191.06350),
 (-2.83478,-191.61547),(-3.38677,-192.12653)])
carriers=footprint(triangles(meshes['7_KB_SPOR_CIM_TASIYICI']))
parcels=[Polygon(p.exterior) for p in parts(carriers) if p.bounds[0]>0 and p.bounds[2]<145 and -217<p.bounds[1]<-215]
assert len(parcels)==2
reserved=union_all(parcels)
west_join=box(-4.52901,-240.75751,0.94837,-192.12653)
new_paving=set_precision(union_all([coast_band,infill,housing_curb,west_join]).difference(reserved),.00001)
assert len(parts(new_paving))==1 and new_paving.is_valid, [(p.area,p.bounds) for p in parts(new_paving)]
assert new_paving.intersection(reserved).area==0
# Pool-side continuation: the former end-cap was translated but its inner
# pavement finger was not, leaving a sand notch and a stepped curb tooth.
# Merge the existing isolated northern pool pavement/curb into one cap, just
# like the housing side. Preserve their footprint everywhere except the small
# photographed corner; the pool rim, grass, water and palm meshes are untouched.
_,pool_ps=selected('7_KALDIRIM_TABANI',(-83,-245,-15,-189))
_,pool_cs=selected('6_BORDUR',(-83,-245,-15,-189))
pool_old=footprint(pt[pool_ps]);pool_ct=ct[pool_cs].copy()
end_mask=(pool_ct[:,:,0]>-16.5)&(pool_ct[:,:,2]<-237)
pool_ct[:,:,2][end_mask]-=3.4740943948413587
pool_curb=footprint(pool_ct)
pool_before=set_precision(union_all([pool_old,pool_curb]),.00001)
corner_window=box(-24,-241,-15.099,-231)
# The small convex return continues directly from the authored pool edge to
# the road endpoint. It removes the backtracking notch without a square tab.
corner=pool_before.intersection(corner_window).intersection(box(-83,-240.75751,-15.099,-189)).convex_hull
pool_new=set_precision(union_all([pool_before.difference(corner_window),corner]),.00001)
pool_changed=pool_before.symmetric_difference(pool_new)
assert pool_changed.difference(corner_window).area<1e-8
assert 20<pool_new.difference(pool_before).area<50
assert pool_before.difference(pool_new).area<1
assert pool_new.is_valid
pool_added=pool_new.difference(pool_before).area
old_paving=union_all([old_paving,pool_old]);new_paving=union_all([new_paving,pool_new])
ps|=pool_ps;cs|=pool_cs
# Check the actual coastal contour, not only the intended buffer argument.
coast_samples=[Point(x,z) for poly in parts(new_paving) for x,z in poly.exterior.coords if z < -220 and 1<x<130]
coast_samples += [Point((a.x+b.x)/2,(a.y+b.y)/2) for a,b in zip(coast_samples,coast_samples[1:]) if a.distance(b)<2]
widths=[p.distance(new_grass) for p in coast_samples]
assert len(widths)>100 and max(abs(w-coast_width) for w in widths)<.003
coast_probe_candidates=[p for p in coast_samples if 1<p.x<130]
coast_probes=[]
for i in np.linspace(0,len(coast_probe_candidates)-1,16,dtype=int):
    p=coast_probe_candidates[i];q=nearest_points(new_grass,p)[0]
    dx,dz=(p.x-q.x)/coast_width,(p.y-q.y)/coast_width
    coast_probes.append({'inside':[p.x-dx*.025,p.y-dz*.025], 'outside':[p.x+dx*.025,p.y+dz*.025]})
for x,z in [(72,-242),(145,-225),(154,-210),(-8,-220)]:
    assert not new_paving.covers(Point(x,z)), 'Keep sand or road outside the housing strip'
for x,z in [(70,-225),(74,-203),(-2,-225),(-2,-200),(72,-195),(147,-205)]:
    assert new_paving.covers(Point(x,z)), 'Interior sand gap remains'

rows=[]
def triangle(r,v):
    v=np.array(v);n=np.cross(v[1]-v[0],v[2]-v[0]);length=np.linalg.norm(n)
    if length<1e-10:return
    n/=length;start=len(r['p'])//3
    r['p'].extend(np.round(v,8).ravel().tolist());r['n'].extend(np.tile(n,(3,1)).ravel().tolist());r['ix'].extend([start,start+1,start+2])
def cap(r,shape,y,up):
    for p in parts(shape):
        for f in constrained_delaunay_triangles(p).geoms:
            v=[[x,y,z] for x,z in list(f.exterior.coords)[:3]]
            if np.cross(np.subtract(v[1],v[0]),np.subtract(v[2],v[0]))[1]*(1 if up else -1)<0:v.reverse()
            triangle(r,v)
def solid(r,shape,top,bottom):
    cap(r,shape,top,True);cap(r,shape,bottom,False)
    for p in parts(shape):
        p=orient(p,sign=1)
        for ring in [p.exterior,*p.interiors]:
            for (x,z),(a,b) in zip(ring.coords,list(ring.coords)[1:]):
                triangle(r,[[x,top,z],[a,bottom,b],[a,top,b]])
                triangle(r,[[x,top,z],[x,bottom,z],[a,bottom,b]])
for name,mask,shape,top,bottom in [
 ('7_KALDIRIM_TABANI',ps,new_paving,9.380085642765648,8.79685173345),
 ('3_CIMEN',gs,new_grass,9.398031270658556,9.380085642765648)]:
    m=meshes[name];r=dict(name=name,remove=(np.flatnonzero(mask)*3).tolist(),p=[],n=[],ix=[],expected={
     'vertices':len(m['p'])//3,'indices':len(m['ix']),
     'positionCRC':f'{zlib.crc32(np.array(m["p"],dtype="<f4").tobytes()):08x}',
     'indexCRC':f'{zlib.crc32(np.array(m["ix"],dtype="<u4").tobytes()):08x}'})
    solid(r,shape,top,bottom)
    unique={};p=[];n=[];ix=[]
    for i in r['ix']:
        a=r['p'][i*3:i*3+3];b=[round(v,7) for v in r['n'][i*3:i*3+3]];key=tuple(a+b)
        if key not in unique:unique[key]=len(p)//3;p.extend(a);n.extend(b)
        ix.append(unique[key])
    r.update(p=p,n=n,ix=ix);rows.append(r)
# The old coast soil collar contains a flat cap exactly at pavement height.
# All 210 affected faces lie wholly underneath the new pavement; remove only
# these hidden faces, keeping every beach face and slope outside it unchanged.
soil=meshes['4_KIYI_TOPRAK_TABANI'];st=triangles(soil);soil_remove=[];soil_area=0
soil_row={'name':soil['name'],'remove':soil_remove,'p':[],'n':[],'ix':[],'expected':{
 'vertices':len(soil['p'])//3,'indices':len(soil['ix']),
 'positionCRC':f'{zlib.crc32(np.array(soil["p"],dtype="<f4").tobytes()):08x}',
 'indexCRC':f'{zlib.crc32(np.array(soil["ix"],dtype="<u4").tobytes()):08x}'}}
soil_preserved_area=0
for i,v in enumerate(st):
    if np.max(abs(v[:,1]-9.380085642765648))>1e-5:continue
    poly=Polygon(v[:,[0,2]])
    if poly.area<1e-10 or poly.intersection(new_paving).area<1e-9:continue
    # A few pool-side collar triangles straddle the new perimeter. Retain
    # their exposed remainder on its original plane, rather than deleting
    # beach or leaving a coplanar soil patch over the new pavement.
    remain=poly.difference(new_paving)
    if remain.area>1e-8:
        assert poly.bounds[2]<-15, 'Housing-side soil must remain fully covered'
        cap(soil_row,remain,float(v[0,1]),True);soil_preserved_area+=remain.area
    soil_remove.append(i*3);soil_area+=poly.intersection(new_paving).area
assert set(range(864*3,1074*3,3)).issubset(soil_remove)
rows.append(soil_row)
metrics={'joinedLawns':2,'pavingAddedArea':new_paving.difference(old_paving).area,
 'mergedCurbTriangles':int(cs.sum()),'mergedCurbArea':housing_curb.area+pool_curb.area,
 'poolCornerAddedArea':pool_added,'poolCornerChangedBounds':list(pool_changed.bounds),'poolOutsideCornerChangedArea':pool_changed.difference(corner_window).area,
 'removedCoplanarSoilTriangles':len(soil_remove),'retainedSoilTriangles':len(soil_row['ix'])//3,'retainedExteriorSoilArea':soil_preserved_area,'coveredSoilArea':soil_area,'exteriorSoilChangedArea':0,
 'pavingRemovedArea':old_paving.difference(new_paving).area,
 'coastWalkwayWidth':coast_width,'coastWidthMin':min(widths),'coastWidthMax':max(widths),'coastWidthSamples':len(widths),
 'grassAddedArea':new_grass.difference(old_grass).area,'existingGrassRemovedArea':old_grass.difference(new_grass).area,
 'reservedParcelChangedArea':new_paving.intersection(reserved).area,'addedMeshes':0,'addedMaterials':0,'perFrameWork':0,
 'bounds':list(new_paving.bounds),
 'triangleDelta':sum(len(r['ix'])//3-len(r['remove']) for r in rows)-int(cs.sum())}
assert 800<metrics['pavingAddedArea']<2000 and 250<metrics['grassAddedArea']<400
destination.write_text(json.dumps({'version':1,'metrics':metrics,'coastProbes':coast_probes,'curbMerge':{'name':'6_BORDUR','remove':(np.flatnonzero(cs)*3).tolist()},'meshes':rows},separators=(',',':'))+'\n')
print(json.dumps(metrics))
