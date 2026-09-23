"""Bake the three reported surface repairs from a post-repair scene export.

Only the skatepark perimeter and four central paving quadrants are rebuilt.
The bowl hole, rides, grass, architecture and all other terrain are retained.
"""
import json, sys, zlib
from pathlib import Path
import numpy as np
import shapely
from shapely import Polygon, Point, box, union_all, set_precision, constrained_delaunay_triangles
from shapely.geometry.polygon import orient
from shapely.affinity import scale, translate

source, destination = map(Path, sys.argv[1:3])
meshes = {m['name']: m for m in json.loads(source.read_text())['meshes']}
rows = []

def parts(g):
    if g.is_empty: return []
    return [g] if g.geom_type == 'Polygon' else [p for c in g.geoms for p in parts(c)]

def world(m):
    p = np.array(m['p']).reshape(-1, 3)
    matrix = np.array(m['matrix']).reshape(4, 4).T
    return np.einsum('ij,kj->ik', np.column_stack((p, np.ones(len(p)))), matrix)[:, :3]

def triangles(m):
    return world(m)[np.array(m['ix']).reshape(-1, 3)]

def footprint(tris):
    n = np.cross(tris[:, 1]-tris[:, 0], tris[:, 2]-tris[:, 0])
    top = tris[(n[:, 1]>1e-9) & (tris[:, :, 1].min(axis=1)>9)]
    return union_all(set_precision(shapely.polygons(top[:, :, [0, 2]]), .00001))

def row(name, replace=False):
    m = meshes[name]
    r = dict(name=name, replace=replace, remove=[], p=[], n=[], ix=[], expected={
        'vertices':len(m['p'])//3, 'indices':len(m['ix']),
        'positionCRC':f'{zlib.crc32(np.array(m["p"],dtype="<f4").tobytes()):08x}',
        'indexCRC':f'{zlib.crc32(np.array(m["ix"],dtype="<u4").tobytes()):08x}'})
    rows.append(r)
    return r

def triangle(r, vertices):
    v = np.array(vertices); n = np.cross(v[1]-v[0], v[2]-v[0]); length = np.linalg.norm(n)
    if length < 1e-10: return
    n /= length; start = len(r['p'])//3
    r['p'].extend(np.round(v, 8).ravel().tolist()); r['n'].extend(np.tile(n,(3,1)).ravel().tolist()); r['ix'].extend([start,start+1,start+2])

def cap(r, shape, height, up=True):
    for poly in parts(shape):
        for f in constrained_delaunay_triangles(poly).geoms:
            v = [[x,height(x,z) if callable(height) else height,z] for x,z in list(f.exterior.coords)[:3]]
            if np.cross(np.subtract(v[1],v[0]),np.subtract(v[2],v[0]))[1]*(1 if up else -1)<0: v.reverse()
            triangle(r,v)

def walls(r, shape, top, bottom):
    for poly in parts(shape):
        poly = orient(poly,sign=1)
        for ring in [poly.exterior,*poly.interiors]:
            for (x,z),(a,b) in zip(ring.coords,list(ring.coords)[1:]):
                triangle(r,[[x,top,z],[a,top,b],[a,bottom,b]])
                triangle(r,[[x,top,z],[a,bottom,b],[x,bottom,z]])

curb = footprint(triangles(meshes['6_BORDUR']))
skate = footprint(triangles(meshes['67D_SKATEPARK_BASE']))
skate = max(parts(skate),key=lambda p:p.area)
parcel = next(p for p in parts(curb) if p.contains(Point(0,-100)) or any(Polygon(h).contains(Point(30,-100)) for h in p.interiors))
parcel = max((Polygon(h) for h in parcel.interiors),key=lambda p:p.area)
assert np.allclose(parcel.bounds,[-3.3868,-178.209,148.3339,-89.5243],atol=.001)
assert len(skate.interiors)==1, 'Keep the existing bowl opening'
expanded = Polygon(parcel.exterior,skate.interiors)
assert expanded.covers(skate.buffer(-.0001))
assert 1000 < expanded.area-skate.area < 1100
base = row('67D_SKATEPARK_BASE',True)
cap(base,expanded,9.241904107431894);cap(base,expanded,8.800440892459303,False)
walls(base,expanded,9.241904107431894,8.800440892459303)

# Replace the four old L-shaped perimeter strips together with their paving.
# No faces are clipped mid-triangle: every selected curb face is wholly inside
# the central district, which is separated from other districts by roads.
central_box = box(-5,-78,104,14)
ct = triangles(meshes['6_BORDUR']); xz = ct[:,:,[0,2]]
inside = ((xz[:,:,0]>=-5)&(xz[:,:,0]<=104)&(xz[:,:,1]>=-78)&(xz[:,:,1]<=14))
assert not np.any(inside.any(axis=1) & ~inside.all(axis=1))
selected = inside.all(axis=1)
old_curb = footprint(ct[selected])
assert 419 < old_curb.area < 422 and len(parts(old_curb))==4
cr = row('6_BORDUR');cr['remove']= (np.flatnonzero(selected)*3).tolist()
cx,cz = 49.3719545,-32.327407
half_road = 3.050765
quadrant = box(half_road,half_road,53.901,45.4846).difference(Point(0,0).buffer(10.4,quad_segs=64))
quadrant = quadrant.buffer(-.9,quad_segs=20).buffer(.9,quad_segs=20)
old_slabs, new_slabs = [],[]
for sx in [-1,1]:
    for sz in [-1,1]:
        name = f'CENTER_WHITE71_{sx}_{sz}'
        old_slabs.append(footprint(triangles(meshes[name])))
        shape = set_precision(translate(scale(quadrant,xfact=sx,yfact=sz,origin=(0,0)),cx,cz),.00001)
        new_slabs.append(shape);r=row(name,True)
        inner=shape.buffer(-.5,quad_segs=16)
        cap(r,inner,9.29)
        cap(r,shape.difference(inner),lambda x,z:9.29 if inner.boundary.distance(Point(x,z))<.00001 else 9.38008564)
        cap(r,shape,8.79,False);walls(r,shape,9.38008564,8.79)
old_union=union_all([old_curb,*old_slabs]);new_union=union_all(new_slabs)
exposed=old_union.difference(new_union)
assert old_union.symmetric_difference(new_union).area<12
road=row('5_YOL')
if not exposed.is_empty:
    fill=exposed.buffer(.00015,quad_segs=2)
    cap(road,fill,9.2275474714);cap(road,fill,8.79,False);walls(road,fill,9.2275474714,8.79)

for r in rows:
    # Compact identical position/normal vertices; retain sharp top/wall edges.
    unique={};p=[];n=[];ix=[]
    for i in r['ix']:
        a=r['p'][i*3:i*3+3];b=[round(v,7) for v in r['n'][i*3:i*3+3]];key=tuple(a+b)
        if key not in unique:unique[key]=len(p)//3;p.extend(a);n.extend(b)
        ix.append(unique[key])
    r.update(p=p,n=n,ix=ix)
    assert np.isfinite(p).all() and np.isfinite(n).all()
metrics={'skateAddedArea':expanded.area-skate.area,'skateBounds':list(expanded.bounds),
         'bowlHoleChangedArea':Polygon(expanded.interiors[0]).symmetric_difference(Polygon(skate.interiors[0])).area,
         'centralChangedArea':old_union.symmetric_difference(new_union).area,'roadRestoredArea':exposed.area,
         'centralQuadrants':4,'removedCurbTriangles':int(selected.sum()),'removedRaisedConnectors':4,
         'addedMeshes':0,'addedMaterials':0,'perFrameWork':0}
assert metrics['bowlHoleChangedArea']==0
destination.write_text(json.dumps({'version':1,'metrics':metrics,'meshes':rows},separators=(',',':'))+'\n')
print(json.dumps(metrics))
