"""Extend only the northern dead-end road and its existing side curbs.

Use a post-photo-repair mesh export. Vertex/index counts, road width, heights,
materials and all other roads stay unchanged. No overlay geometry is added.
"""
import json, sys, zlib
from pathlib import Path
import numpy as np

source, destination = map(Path, sys.argv[1:3])
meshes={m['name']:m for m in json.loads(source.read_text())['meshes']}
patch=json.loads(destination.read_text())
old_z=-237.28341623769234
end_z=-240.75751  # Existing coastal pavement tangent at x=0.94837.
rows=[]
for name in ['5_YOL','6_BORDUR']:
 m=meshes[name];p=np.array(m['p']).reshape(-1,3);mat=np.array(m['matrix']).reshape(4,4).T
 w=np.einsum('ij,kj->ik',np.column_stack((p,np.ones(len(p)))),mat)[:,:3]
 selected=(w[:,0]>-16.5)&(w[:,0]<-3.3)&(w[:,2]<-237)
 ids=np.flatnonzero(selected)
 assert len(ids)>0 and w[ids,2].min()>-237.5
 if name=='5_YOL':
  assert np.max(abs(w[ids,2]-old_z))<.00002
  old_z=float(w[ids[0],2])
 changes=w[ids].copy();changes[:,2]+=end_z-old_z
 rows.append({'name':name,'ids':ids.tolist(),'p':np.round(changes,8).ravel().tolist(),'expected':{
  'vertices':len(p),'indices':len(m['ix']),
  'positionCRC':f'{zlib.crc32(np.array(m["p"],dtype="<f4").tobytes()):08x}',
  'indexCRC':f'{zlib.crc32(np.array(m["ix"],dtype="<u4").tobytes()):08x}'}})
patch['roadEnd']={'oldZ':old_z,'endZ':end_z,'extension':old_z-end_z,'rows':rows,'addedTriangles':0}
destination.write_text(json.dumps(patch,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in patch['roadEnd'].items() if k!='rows'}),[(r['name'],len(r['ids']))for r in rows])
