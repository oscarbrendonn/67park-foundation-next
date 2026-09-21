"""Retessellate only the two south-park entry shoulders at their existing height.

Uses the same plane-preserving triangle clipping as bake-map-edge-finish.py.
No cover sheet: old cap/bevel/side faces inside the windows are removed first.
"""
import json, sys, zlib
from pathlib import Path
import numpy as np
from shapely import Polygon, box, union_all, constrained_delaunay_triangles
from shapely.geometry import LineString

source, destination = map(Path, sys.argv[1:3])
meshes = {m['name']: m for m in json.loads(source.read_text())['meshes']}
windows = [[167.14,113.48,168.59,116.34474498], [175.58,113.48,177.04,116.34474498]]
top, bottom = 9.38008564, 8.79
rows = []

def polys(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [p for c in getattr(g, 'geoms', []) for p in polys(c)]

def row(name, replace=False):
    m=meshes[name]
    result={'name':name,'replace':replace,'expected':{'vertices':len(m['p'])//3,'indices':len(m['ix']),
        'positionCRC':f'{zlib.crc32(np.array(m["p"],dtype="<f4").tobytes()):08x}',
        'indexCRC':f'{zlib.crc32(np.array(m["ix"],dtype="<u4").tobytes()):08x}'},'remove':[],'p':[],'n':[],'ix':[]}
    rows.append(result)
    return result

def tri(row, verts, expected=None, normals=None):
    v=np.array(verts); n=np.cross(v[1]-v[0],v[2]-v[0]); length=np.linalg.norm(n)
    if length<1e-11: return
    if expected is not None and np.dot(n,expected)<0:
        v=v[::-1]; n=-n
        if normals is not None: normals=np.array(normals)[::-1]
    n/=length; start=len(row['p'])//3
    row['p'].extend(np.round(v,8).ravel().tolist()); row['n'].extend((np.tile(n,(3,1)) if normals is None else np.array(normals)).ravel().tolist()); row['ix'].extend([start,start+1,start+2])

def clip(row, region):
    m=meshes[row['name']]; p=np.array(m['p']).reshape(-1,3); matrix=np.array(m['matrix']).reshape(4,4).T
    w=np.einsum('ij,kj->ik',np.column_stack((p,np.ones(len(p)))),matrix)[:,:3]
    index=np.array(m['ix']).reshape(-1,3)
    tris=w[index]; bounds=region.bounds
    normal_matrix=np.linalg.inv(matrix[:3,:3]).T
    normals=np.einsum('ij,kj->ik',np.array(m['n']).reshape(-1,3),normal_matrix)
    lengths=np.linalg.norm(normals,axis=1)[:,None]
    normals=np.divide(normals,lengths,out=np.zeros_like(normals),where=lengths>1e-12)
    assert np.isfinite(normals).all()
    for i,v in enumerate(tris):
        xz=v[:,[0,2]]
        if xz[:,0].max()<bounds[0] or xz[:,0].min()>bounds[2] or xz[:,1].max()<bounds[1] or xz[:,1].min()>bounds[3]: continue
        poly=Polygon(xz); n=np.cross(v[1]-v[0],v[2]-v[0]); length=np.linalg.norm(n)
        if length<1e-12: continue
        n/=length
        # Preserve the authored vertex-normal field on retained pieces, even
        # when one original long triangle extends far beyond these windows.
        original_normals=normals[index[i]]
        ab,ac=v[1]-v[0],v[2]-v[0]
        aa,bb,cc=np.dot(ab,ab),np.dot(ab,ac),np.dot(ac,ac)
        den=aa*cc-bb*bb
        def emit(verts):
            new_normals=[]
            for point in verts:
                delta=np.array(point)-v[0]; d,e=np.dot(delta,ab),np.dot(delta,ac)
                u=(cc*d-bb*e)/den; t=(aa*e-bb*d)/den
                normal=(1-u-t)*original_normals[0]+u*original_normals[1]+t*original_normals[2]
                size=np.linalg.norm(normal)
                new_normals.append(normal/size if size>1e-10 else n)
            tri(row,verts,n,new_normals)
        if poly.area<1e-10:
            pair=max(((a,b) for a in range(3) for b in range(a+1,3)),key=lambda ab:np.linalg.norm(xz[ab[1]]-xz[ab[0]]))
            origin=xz[pair[0]]; axis=xz[pair[1]]-origin; total=np.linalg.norm(axis)
            if total<1e-9: continue
            axis/=total; remain=LineString([origin,origin+axis*total]).difference(region)
            if abs(remain.length-total)<1e-9: continue
            row['remove'].append(i*3)
            face=Polygon([[(q-origin)@axis,y] for q,y in zip(xz,v[:,1])])
            segments=[remain] if remain.geom_type=='LineString' else list(getattr(remain,'geoms',[]))
            for segment in segments:
                if segment.geom_type!='LineString' or segment.length<1e-8: continue
                ts=[(np.array(q)-origin)@axis for q in segment.coords]
                for p in polys(face.intersection(box(min(ts),v[:,1].min()-1,max(ts),v[:,1].max()+1))):
                    for f in constrained_delaunay_triangles(p).geoms:
                        emit([[(origin+axis*t)[0],y,(origin+axis*t)[1]] for t,y in list(f.exterior.coords)[:3]])
            continue
        remain=poly.difference(region)
        if poly.area-remain.area<1e-11: continue
        row['remove'].append(i*3)
        if remain.is_empty: continue
        coeff=np.linalg.solve(np.column_stack([xz,np.ones(3)]),v[:,1])
        for p in polys(remain):
            for f in constrained_delaunay_triangles(p).geoms:
                emit([[x,float(np.clip(np.dot(coeff,[x,z,1]),v[:,1].min(),v[:,1].max())),z] for x,z in list(f.exterior.coords)[:3]])

# Extend the clipping volume beyond the exact front plane to remove its old
# vertical face as well. The replacement front is at the original world Z.
region=union_all([box(a,b,c,d+.0001) for a,b,c,d in windows])
for name in ['6_BORDUR','7_KALDIRIM_TABANI']: clip(row(name),region)
for side,window in zip(['WEST','EAST'],windows):
    target=row(f'7_KALDIRIM_TABANI_PARK_ENTRY57_{side}_SLOT',True)
    a,b,c,d=window
    # A closed, six-face solid, reusing the existing shoulder mesh/material.
    corners=[[a,top,b],[c,top,b],[c,top,d],[a,top,d],[a,bottom,b],[c,bottom,b],[c,bottom,d],[a,bottom,d]]
    for ids,normal in [([0,1,2,3],[0,1,0]),([4,5,6,7],[0,-1,0]),([0,1,5,4],[0,0,-1]),([1,2,6,5],[1,0,0]),([2,3,7,6],[0,0,1]),([3,0,4,7],[-1,0,0])]:
        tri(target,[corners[ids[i]] for i in [0,1,2]],normal)
        tri(target,[corners[ids[i]] for i in [0,2,3]],normal)
    # The obsolete rounded tips are inside the new closed shoulder. Retain
    # their objects/materials but no duplicate triangles or shadow surfaces.
    row(f'6_BORDUR_PARK_ENTRY57_{side}_TIP',True)
assert len(rows)==6 and all(len(r['remove'])>0 for r in rows[:2])
assert sum(len(r['remove']) for r in rows[:2])<1500
patch={'version':1,'windows':windows,'top':top,'bottom':bottom,'meshes':rows,'metrics':{
    'shoulders':2,'area':sum((c-a)*(d-b) for a,b,c,d in windows),'removedTriangles':sum(len(r['remove']) for r in rows),
    'addedDrawCalls':0,'perFrameWork':0,'pathAndGrassUnchanged':True}}
destination.write_text(json.dumps(patch,separators=(',',':'))+'\n')
print(json.dumps({'destination':str(destination),'metrics':patch['metrics'],'rows':[{k:r[k] for k in ['name','replace']}|{'removed':len(r['remove']),'added':len(r['ix'])//3} for r in rows]}))
