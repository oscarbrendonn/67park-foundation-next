"""Quality constrained surface mesh; stdin/stdout only, no source asset edits."""
import os, sys, json
sys.path.insert(0, os.environ.get('PARK_TRIANGLE_PATH','/tmp/67park-head-mesh.7dHUTq'))
import numpy as np
import triangle
data=json.load(sys.stdin)
verts=[];segments=[]
for contour in data['loops']:
    start=len(verts);verts.extend(contour)
    segments.extend([(start+i,start+(i+1)%len(contour)) for i in range(len(contour))])
result=triangle.triangulate({'vertices':np.array(verts),'segments':np.array(segments)},'pq25a'+str(data['maxArea'])+'Q')
print(json.dumps({'vertices':result['vertices'].tolist(),'triangles':result['triangles'].tolist()}))
