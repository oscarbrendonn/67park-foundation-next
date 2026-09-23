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
# The front edge follows the existing inner curb exactly. The tapered rear
# edge stays within the housing strip; the two outer sandy corners stay sand.
infill=Polygon([(-3.38677,-236.41735),(0.95339,-236.41735),
 (64.13255,-237.51534),(81.27871,-235.67313),(132.98977,-218.44049),
 (144.51865,-216.43129),(148.33391,-215.0),(148.33391,-192.12653),
 (147.78192,-191.61547),(147.27087,-191.06350),(-2.32373,-191.06350),
 (-2.83478,-191.61547),(-3.38677,-192.12653)])
carriers=footprint(triangles(meshes['7_KB_SPOR_CIM_TASIYICI']))
parcels=[Polygon(p.exterior) for p in parts(carriers) if p.bounds[0]>0 and p.bounds[2]<145 and -217<p.bounds[1]<-215]
assert len(parcels)==2
reserved=union_all(parcels)
new_paving=set_precision(union_all([old_paving,infill,new_grass]).difference(reserved),.00001)
assert len(parts(new_paving))==1 and new_paving.is_valid
assert old_paving.difference(new_paving).area<.0001
assert new_paving.intersection(reserved).area==0
for x,z in [(-3.8,-238),(72,-242),(145,-225),(154,-210),(-8,-220)]:
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
metrics={'joinedLawns':2,'pavingAddedArea':new_paving.difference(old_paving).area,
 'grassAddedArea':new_grass.difference(old_grass).area,'existingGrassRemovedArea':old_grass.difference(new_grass).area,
 'reservedParcelChangedArea':new_paving.intersection(reserved).area,'addedMeshes':0,'addedMaterials':0,'perFrameWork':0,
 'bounds':[-3.38677,-240.48899,148.33391,-191.0635],
 'triangleDelta':sum(len(r['ix'])//3-len(r['remove']) for r in rows)}
assert 800<metrics['pavingAddedArea']<2000 and 250<metrics['grassAddedArea']<400
destination.write_text(json.dumps({'version':1,'metrics':metrics,'meshes':rows},separators=(',',':'))+'\n')
print(json.dumps(metrics))
