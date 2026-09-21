"""Offline map-wide footprint/edge evidence from the actual rendered scene."""
import json, sys
from pathlib import Path
import numpy as np
import shapely
from shapely import union_all, set_precision

def polygons(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [p for c in getattr(g, 'geoms', []) for p in polygons(c)]

def world_mesh(m):
    p = np.array(m['p']).reshape(-1, 3)
    matrix = np.array(m['matrix']).reshape(4, 4).T
    p = np.einsum('ij,kj->ik', np.column_stack((p, np.ones(len(p)))), matrix)
    assert np.isfinite(p).all(), m['name'] + ' has nonfinite vertices'
    ix = np.array(m['ix'] if m['ix'] is not None else range(len(p))).reshape(-1, 3)
    return p[:, :3], p[ix, :3]

def survey(source, output):
    output.mkdir(parents=True, exist_ok=True)
    rows = json.loads(source.read_text())['meshes']
    shapes, summary = {}, []
    for m in rows:
        if not (m['name'].startswith(('3_', '5_', '6_', '7_', '8_REF_', '8_CIM_STUB_', 'CENTER_WHITE'))): continue
        p, tris = world_mesh(m)
        n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
        top = tris[(n[:, 1] > 1e-9) & (tris[:, :, 1].min(axis=1) > 9)]
        if not len(top): continue
        shape = union_all(set_precision(shapely.polygons(top[:, :, [0, 2]]), .00001))
        shapes[m['name']] = shape
        row = {'name': m['name'], 'bounds': shape.bounds, 'height': [float(p[:, 1].min()), float(p[:, 1].max())],
               'parts': len(polygons(shape)), 'area': shape.area, 'vertices': len(p), 'triangles': len(tris)}
        summary.append(row)
        print(json.dumps(row), flush=True)
        if m['name'].startswith(('8_REF_', 'CENTER_WHITE')):
            for part in polygons(shape):
                within = shapely.intersects_xy(part.buffer(.001), p[:, 0], p[:, 2])
                selected = p[within]
                print('COMPONENT', json.dumps({'mesh': m['name'], 'bounds': part.bounds, 'area': part.area,
                    'y': [float(selected[:,1].min()),float(selected[:,1].max())]}), flush=True)
    grass = shapes['3_CIMEN']
    support = union_all([s for n, s in shapes.items() if n.startswith(('6_', '7_'))])
    unsupported = grass.difference(support.buffer(.001))
    missing = [{'area': p.area, 'bounds': p.bounds} for p in polygons(unsupported) if p.area > .01]
    print('GRASS_OUTSIDE_CURB', json.dumps(missing), flush=True)
    (output / 'footprints.json').write_text(json.dumps({n: shapely.to_geojson(s) for n, s in shapes.items()}))
    (output / 'report.json').write_text(json.dumps({'meshes': summary, 'grassOutsideCurb': missing}, indent=2))
    return shapes

if __name__ == '__main__':
    survey(Path(sys.argv[1]), Path(sys.argv[2]))
