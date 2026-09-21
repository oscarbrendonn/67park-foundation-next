"""Bake closed map-edge solids from the post-repair scene, never floating decals.

The scene export and footprint survey are independent inputs. Runtime validates
both source vertex and index hashes before committing any of these changes.
"""
import json, sys, zlib
from pathlib import Path
import numpy as np
import shapely
from shapely import Polygon, Point, box, union_all, set_precision, constrained_delaunay_triangles
from shapely.geometry.polygon import orient

source, footprints, destination = map(Path, sys.argv[1:4])
meshes = {m['name']: m for m in json.loads(source.read_text())['meshes']}
shapes = {n: shapely.from_geojson(s) for n, s in json.loads(footprints.read_text()).items()}
rows = {}

def polys(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [p for c in getattr(g, 'geoms', []) for p in polys(c)]

def expected(m):
    return {'vertices': len(m['p']) // 3, 'indices': len(m['ix']),
            'positionCRC': f'{zlib.crc32(np.array(m["p"], dtype="<f4").tobytes()):08x}',
            'indexCRC': f'{zlib.crc32(np.array(m["ix"], dtype="<u4").tobytes()):08x}'}

def row_for(name):
    if name not in rows:
        rows[name] = {'name': name, 'expected': expected(meshes[name]), 'replace': False, 'remove': [], 'p': [], 'n': [], 'ix': []}
    return rows[name]

def triangle(row, verts):
    v = np.array(verts); n = np.cross(v[1] - v[0], v[2] - v[0]); length = np.linalg.norm(n)
    if length < 1e-11: return
    n /= length; start = len(row['p']) // 3
    row['p'].extend(np.round(v, 8).ravel().tolist()); row['n'].extend(np.tile(n, (3, 1)).ravel().tolist()); row['ix'].extend([start, start + 1, start + 2])

def flat(row, shape, height, up=True):
    for poly in polys(shape):
        for f in constrained_delaunay_triangles(poly).geoms:
            v = [[x, height, z] for x, z in list(f.exterior.coords)[:3]]
            if np.cross(np.subtract(v[1], v[0]), np.subtract(v[2], v[0]))[1] * (1 if up else -1) < 0: v.reverse()
            triangle(row, v)

def solid(row, shape, top, bottom=8.79):
    flat(row, shape, top); flat(row, shape, bottom, False)
    for poly in polys(shape):
        poly = orient(poly, sign=1)
        for ring in [poly.exterior, *poly.interiors]:
            for (x, z), (a, b) in zip(ring.coords, list(ring.coords)[1:]):
                triangle(row, [[x, top, z], [a, top, b], [a, bottom, b]])
                triangle(row, [[x, top, z], [a, bottom, b], [x, bottom, z]])

def clip_out(row, region):
    """Retriangulate only intersecting source faces, preserving their planes."""
    from shapely.geometry import LineString
    m = meshes[row['name']]; p = np.array(m['p']).reshape(-1, 3); matrix = np.array(m['matrix']).reshape(4, 4).T
    w = np.einsum('ij,kj->ik', np.column_stack((p, np.ones(len(p)))), matrix)[:, :3]
    tris = w[np.array(m['ix']).reshape(-1, 3)]; bounds = region.bounds
    for i, v in enumerate(tris):
        xz = v[:, [0, 2]]
        if xz[:,0].max()<bounds[0] or xz[:,0].min()>bounds[2] or xz[:,1].max()<bounds[1] or xz[:,1].min()>bounds[3]: continue
        poly = Polygon(xz); n = np.cross(v[1]-v[0],v[2]-v[0]); length = np.linalg.norm(n)
        if length<1e-12: continue
        n /= length
        if poly.area<1e-10:
            pair = max(((a,b) for a in range(3) for b in range(a+1,3)),key=lambda ab:np.linalg.norm(xz[ab[1]]-xz[ab[0]]))
            origin = xz[pair[0]]; axis = xz[pair[1]]-origin; total = np.linalg.norm(axis)
            if total<1e-9: continue
            axis /= total; remain = LineString([origin,origin+axis*total]).difference(region)
            if abs(remain.length-total)<1e-9: continue
            row['remove'].append(i*3)
            face = Polygon([[(q-origin)@axis,y] for q,y in zip(xz,v[:,1])])
            segments = [remain] if remain.geom_type=='LineString' else list(getattr(remain,'geoms',[]))
            for segment in segments:
                if segment.geom_type!='LineString' or segment.length<1e-8: continue
                ts = [(np.array(q)-origin)@axis for q in segment.coords]
                for p in polys(face.intersection(box(min(ts),v[:,1].min()-1,max(ts),v[:,1].max()+1))):
                    for f in constrained_delaunay_triangles(p).geoms:
                        verts = [[(origin+axis*t)[0],y,(origin+axis*t)[1]] for t,y in list(f.exterior.coords)[:3]]
                        if np.dot(np.cross(np.subtract(verts[1],verts[0]),np.subtract(verts[2],verts[0])),n)<0: verts.reverse()
                        triangle(row,verts)
            continue
        remain = poly.difference(region)
        if poly.area-remain.area<1e-11: continue
        row['remove'].append(i*3)
        if remain.is_empty: continue
        coeff = np.linalg.solve(np.column_stack([xz,np.ones(3)]),v[:,1])
        for p in polys(remain):
            for f in constrained_delaunay_triangles(p).geoms:
                verts = [[x,float(np.clip(np.dot(coeff,[x,z,1]),v[:,1].min(),v[:,1].max())),z] for x,z in list(f.exterior.coords)[:3]]
                if np.dot(np.cross(np.subtract(verts[1],verts[0]),np.subtract(verts[2],verts[0])),n)<0: verts.reverse()
                triangle(row,verts)

# The park already has deliberately graded grass/path/bowl solids. Do not add
# a flat carrier there. Everywhere else, close only genuinely absent support
# under the main grass sheet. Its visible contour and all grass vertices stay.
grass = set_precision(shapes['3_CIMEN'].union(shapes['8_CIM_STUB_DOLGU']), .00001)
support = set_precision(union_all([s for n, s in shapes.items() if n.startswith(('6_', '7_'))]), .00001)
park = set_precision(box(118.5, 27, 211, 112.5), .00001)
missing = set_precision(grass.difference(support).difference(park), .00001)
missing = union_all([p for p in polys(missing) if p.area > .0001])
# A submillimetre buried overlap joins Float32 seams without changing the
# visible grass outline. Cap remains 18 mm below grass, with no top overlay.
carrier = missing.buffer(.00015, quad_segs=2).intersection(grass).difference(park)
print('CARRIER_CHECK', json.dumps({'missing':missing.area,'carrier':carrier.area,'outside':carrier.difference(grass).area}),flush=True)
solid(row_for('7_KALDIRIM_TABANI'), carrier, 9.38008564)
assert carrier.difference(grass).area < 1e-5  # 10-micrometre fixed-grid intersection tolerance
assert carrier.difference(grass.buffer(.00002)).area == 0
assert carrier.intersection(park).area < 1e-8

# The two legacy grass-fill entrances sit over an old tapered curb stub.
# Top-down coverage alone sees its cap, but its triangular front faces leave
# visible holes from player height. Give each flat grass lip one continuous
# base. The 2 mm buried front overlap covers the old source rounding seam.
stub_entries,stub_aprons,stub_windows = [],[],[]
for part in polys(shapes['8_CIM_STUB_DOLGU']):
    x0,z0,x1,z1 = part.bounds
    assert x1-x0 < 5 and abs(z0-128.68393) < .0001
    closure = box(x0,z0-.002,x1,z0+.25)
    solid(row_for('7_KALDIRIM_TABANI'),closure,9.38008564)
    stub_entries.append(closure)
    # The old stub's sloped triangles have a footprint but no continuous
    # high cap. Rebuild the narrow entrance strip at the existing curb
    # height, clipping its old tapered faces before adding the closed cap.
    # Filling footprint gaps alone leaves those diagonal side faces visible.
    window = box(x0,z0-.5,x1,z0+.002)
    apron = window.difference(shapes['6_BORDUR'])
    stub_windows.append(window)
    stub_aprons.append(apron)
assert len(stub_entries) == 2
clip_out(row_for('6_BORDUR'),union_all(stub_windows))
for window in stub_windows: solid(row_for('6_BORDUR'),window,9.38008564)
stub_trimmed_triangles = len(row_for('6_BORDUR')['remove'])

# The closed-window city block has a rolled curb whose old corner triangles
# abruptly return to full height at the outside edge. Rebuild this one complete
# perimeter from its authored footprint, so all corners share the same 6 cm
# rounded profile. Keep the road, inner paving, building meshes and outline.
city_curb = next(p for p in polys(shapes['6_BORDUR']) if p.distance(Point(-15.10,114.245)) < .02)
assert np.allclose(city_curb.bounds,[-99.64092,23.72720,-15.09900,116.34467],atol=.00002)
assert len(city_curb.interiors) == 1 and 350 < city_curb.area < 353
# The close-angle perimeter sweep also exposed the same profile breaks on
# the adjacent west waterfront curb. Both remain separate authored solids;
# rebuilding their profiles must not bridge the intervening road or water.
waterfront_curb = next(p for p in polys(shapes['6_BORDUR']) if np.allclose(p.bounds,[-123.94439,52.26971,-48.67709,115.87984],atol=.002))
assert 278 < waterfront_curb.area < 281
city_curbs = union_all([city_curb,waterfront_curb])
# Survey footprints include tiny triangle cracks as interior rings. These are
# not planted courtyards: preserve the two large openings, close only rings
# below 1,000 square millimetres, then remove sub-centimetre contour jogs.
city_closed_cracks = [Polygon(p.exterior,[h for h in p.interiors if Polygon(h).area>=.001]) for p in [city_curb,waterfront_curb]]
city_precision_parts = [set_precision(p,.0001) for p in city_closed_cracks]
city_precision_area = sum(a.symmetric_difference(b).area for a,b in zip(city_closed_cracks,city_precision_parts))
assert city_precision_area < .04  # collapse zero-width backtracking spikes
city_clean_parts = [p.simplify(.01,preserve_topology=True) for p in city_precision_parts]
city_outline_deviation = max(a.boundary.hausdorff_distance(b.boundary) for a,b in zip(city_precision_parts,city_clean_parts))
assert city_outline_deviation < .0101
assert all(len(p.interiors)==1 for p in city_clean_parts)
# The NW inner return contains a 7.14 cm backtracking pair on Z=27. The
# inherited footprint kept that tooth even after the sub-centimetre cleanup.
# Join its two neighboring arc vertices; do not round/simplify other edges.
city_notch = box(-98.07,26.57,-97.77,27.24)
city_before_notch = city_clean_parts[0]
notch_vertices = {(-97.8898,27.0),(-97.8184,27.0)}
removed_notch_vertices = 0
def without_city_notch(ring):
    global removed_notch_vertices
    points=[]
    for point in ring.coords:
        if tuple(point) in notch_vertices: removed_notch_vertices+=1
        else: points.append(point)
    return points
city_clean_parts[0] = Polygon(without_city_notch(city_before_notch.exterior),[without_city_notch(r) for r in city_before_notch.interiors])
city_notch_delta = city_before_notch.symmetric_difference(city_clean_parts[0])
assert removed_notch_vertices==2 and city_clean_parts[0].is_valid
assert city_notch_delta.area<.03 and city_notch_delta.difference(city_notch).area<1e-10
city_curb_clean = union_all(city_clean_parts)
assert city_curbs.symmetric_difference(city_curb_clean).area < 1.2
city_row = row_for('6_BORDUR')
city_removed_before = len(city_row['remove'])
clip_out(city_row,city_curbs.buffer(.0002,quad_segs=2))
city_removed = len(city_row['remove'])-city_removed_before
assert city_removed > 200
city_base,city_radius = 9.32008564,.06
city_boundary = city_curb_clean.boundary
city_boundary_segments=[]
for poly in polys(city_curb_clean):
    poly=orient(poly,sign=1)
    for ring in [poly.exterior,*poly.interiors]:
        for a,b in zip(ring.coords,list(ring.coords)[1:]):
            edge=np.subtract(b,a); length=np.linalg.norm(edge)
            if length>1e-10: city_boundary_segments.append((np.array(a),edge,length,np.array([edge[1],-edge[0]])/length))
def city_outward_at(x,z):
    point=np.array([x,z]); nearest=[]; best=float('inf')
    for origin,edge,length,normal in city_boundary_segments:
        t=np.clip(np.dot(point-origin,edge)/(length*length),0,1)
        distance=np.linalg.norm(point-(origin+t*edge))
        if distance<best-1e-7: best=distance;nearest=[normal]
        elif abs(distance-best)<1e-7: nearest.append(normal)
    normal=np.sum(nearest,axis=0); length=np.linalg.norm(normal)
    assert length>1e-10
    return normal/length
city_levels = [0,.06*(1-np.cos(np.pi/6)),.03,.06]
city_offsets = [city_curb_clean.buffer(-d,quad_segs=12) for d in city_levels]
def city_surface_triangle(verts):
    start=len(city_row['n'])
    triangle(city_row,verts)
    if len(city_row['n']) == start: return
    # Continuous vertex normals join the three bevel bands without pale
    # triangular lighting seams. Topology itself is a closed, ordinary solid.
    from shapely.ops import nearest_points
    normals=[]
    for x,y,z in verts:
        point=Point(x,z); distance=min(city_radius,city_boundary.distance(point))
        edge=nearest_points(city_boundary,point)[0]
        dx,dz=edge.x-x,edge.y-z; length=np.hypot(dx,dz)
        horizontal=max(0,(city_radius-distance)/city_radius)
        vertical=np.sqrt(max(0,1-horizontal*horizontal))
        normals.extend([dx/length*horizontal if length>1e-9 else 0,vertical,dz/length*horizontal if length>1e-9 else 0])
    # At exact outside vertices the nearest point is itself; use the face's
    # outward horizontal normal, not a zero vector.
    for i in range(3):
        if np.linalg.norm(normals[i*3:i*3+3]) < 1e-8:
            outward=city_outward_at(verts[i][0],verts[i][2])
            normals[i*3:i*3+3]=[outward[0],0,outward[1]]
    city_row['n'][start:]=normals
for outside,inside in zip(city_offsets,city_offsets[1:]):
    for poly in polys(outside.difference(inside)):
        for f in constrained_delaunay_triangles(poly).geoms:
            verts=[]
            for x,z in list(f.exterior.coords)[:3]:
                d=min(city_radius,city_boundary.distance(Point(x,z)))
                verts.append([x,city_base+np.sqrt(max(0,city_radius**2-(city_radius-d)**2)),z])
            if np.cross(np.subtract(verts[1],verts[0]),np.subtract(verts[2],verts[0]))[1]<0: verts.reverse()
            city_surface_triangle(verts)
flat(city_row,city_offsets[-1],city_base+city_radius)
flat(city_row,city_curb_clean,8.79,False)
for poly in polys(city_curb_clean):
    poly=orient(poly,sign=1)
    for ring in [poly.exterior,*poly.interiors]:
        for (x,z),(a,b) in zip(ring.coords,list(ring.coords)[1:]):
            triangle(city_row,[[x,city_base,z],[a,city_base,b],[a,8.79,b]])
            triangle(city_row,[[x,city_base,z],[a,8.79,b],[x,8.79,z]])

# Match the two filled grass entrances to their adjacent authored straight
# grass front. The earlier filler stopped 9.7 cm behind that line, leaving
# two conspicuous little jogs around each divider.
grass_front_fills=[]
for part in polys(shapes['8_CIM_STUB_DOLGU']):
    x0,z0,x1,z1=part.bounds
    target=box(x0-.5,128.58658,x1+.5,129.10)
    front=target.difference(grass)
    assert front.area<1
    front=front.buffer(.00015,quad_segs=2).intersection(target)
    solid(row_for('3_CIMEN'),front,9.398031,9.38008564)
    solid(row_for('7_KALDIRIM_TABANI'),front,9.38008564)
    grass_front_fills.append(front)

# Two legacy internal grass walls beside the southeast divider show as tiny
# dark spikes. Replace only those narrow seam windows, retaining the outer
# grass contour. Blend back to the original top at each cut boundary.
grass_seam_windows = [box(224.10,130.50,224.50,130.76),box(225.05,130.50,225.55,130.76)]
seam_scope = union_all(grass_seam_windows)
grass_row = row_for('3_CIMEN'); clip_out(grass_row,seam_scope)
m = meshes['3_CIMEN']; pp = np.array(m['p']).reshape(-1,3); mm = np.array(m['matrix']).reshape(4,4).T
ww = np.einsum('ij,kj->ik',np.column_stack((pp,np.ones(len(pp)))),mm)[:,:3]
top_faces = []
for v in ww[np.array(m['ix']).reshape(-1,3)]:
    xz = v[:,[0,2]]; poly = Polygon(xz)
    if poly.area<1e-9 or not poly.intersects(seam_scope): continue
    if np.cross(v[1]-v[0],v[2]-v[0])[1] <= 0: continue
    top_faces.append((poly,np.linalg.solve(np.column_stack((xz,np.ones(3))),v[:,1])))
def grass_source_height(x,z):
    point = Point(x,z)
    return max((float(coeff@[x,z,1]) for poly,coeff in top_faces if poly.buffer(.00002).covers(point)),default=9.398031)
for window in grass_seam_windows:
    shape = shapes['3_CIMEN'].intersection(window)
    inner = shape.intersection(window.buffer(-.035))
    flat(grass_row,inner,9.398031)
    for poly in polys(shape.difference(inner)):
        for f in constrained_delaunay_triangles(poly).geoms:
            verts=[]
            for x,z in list(f.exterior.coords)[:3]:
                blend=min(1,window.boundary.distance(Point(x,z))/.035)
                old=grass_source_height(x,z)
                verts.append([x,old+(9.398031-old)*blend,z])
            if np.cross(np.subtract(verts[1],verts[0]),np.subtract(verts[2],verts[0]))[1]<0: verts.reverse()
            triangle(grass_row,verts)

# The coastal walkway and rounded dead-end were separate contours. Fill their
# tiny concave meeting notch with a tangent fillet, only at the reported join.
paving = union_all([s for n, s in shapes.items() if n.startswith(('6_', '7_'))])
join_scope = box(-18, 139, -11, 145)
local = paving.intersection(join_scope.buffer(5))
closed = local.buffer(1.35, quad_segs=24).buffer(-1.35, quad_segs=24)
fillets = closed.difference(local).buffer(-.00002, quad_segs=2).buffer(.00002, quad_segs=2)
join = union_all([p for p in polys(fillets) if p.area > .0005 and p.distance(Point(-13.98,141.85)) < .01])
print('FILLET_CHECK',json.dumps({'area':join.area,'bounds':join.bounds}),flush=True)
assert join.difference(join_scope).area == 0, 'Do not clip a fillet mid-curve'
assert 0.001 < join.area < 4, ('unexpected coastal join', join.area)
# Rebuild the touching bevel as well: a flat wedge next to the old lowered
# bevel would leave a new 6 cm ridge. The old stub itself is untouched.
finish_outline = set_precision(paving.union(join), .0001).buffer(.0002, quad_segs=4).buffer(-.0002, quad_segs=4)
collar = join.buffer(.16, quad_segs=12)
stub = shapes['7_KALDIRIM_TABANI_STUB67']
# Cover the cut boundary by a buried 0.2 mm collar overlap. Otherwise rounding
# the rebuilt contour can leave a hairline gap against retained source caps.
# This extends only into existing paving, never beyond the coastal outline.
piece = shapes['7_KALDIRIM_TABANI'].union(join).intersection(collar.buffer(.0002)).difference(stub)
# Boolean intersections with the Float32 source can leave 15 micrometre
# backtracking edges. They become inward micro-walls after GPU quantization.
# Remove only sub-0.05 mm contour noise before deriving every cap and wall
# from the same polygon; never flip individual triangles to hide a bad ring.
piece_before_cleanup = piece
piece = set_precision(piece, .0001).simplify(.00005, preserve_topology=True)
assert piece.symmetric_difference(piece_before_cleanup).area < .001
row = row_for('7_KALDIRIM_TABANI'); clip_out(row, collar)
# Keep the authored lower bevel where this patch rejoins the original curb,
# but ease it up to the adjoining flat-capped stub. Both top and wall use the
# same sampled boundary; there is no floating filler or material overlay.
piece=piece.segmentize(.025)
inner=finish_outline.buffer(-.06,quad_segs=12)
flat(row,piece.intersection(inner),9.38008564)
def curb_height(x,z):
    point=Point(x,z);distance=min(.06,finish_outline.boundary.distance(point))
    blend=min(1,stub.distance(point)/.16);blend=blend*blend*(3-2*blend)
    return 9.38008564-(.06-distance)*blend
for poly in polys(piece.difference(inner)):
    for face in constrained_delaunay_triangles(poly).geoms:
        vertices=[[x,curb_height(x,z),z] for x,z in list(face.exterior.coords)[:3]]
        if np.cross(np.subtract(vertices[1],vertices[0]),np.subtract(vertices[2],vertices[0]))[1]<0: vertices.reverse()
        triangle(row,vertices)
flat(row,piece,8.79,False)
for poly in polys(piece):
    poly=orient(poly,sign=1)
    for ring in [poly.exterior,*poly.interiors]:
        for (x,z),(a,b) in zip(ring.coords,list(ring.coords)[1:]):
            triangle(row,[[x,curb_height(x,z),z],[a,curb_height(a,b),b],[a,8.79,b]])
            triangle(row,[[x,curb_height(x,z),z],[a,8.79,b],[x,8.79,z]])

# Rebuild the four *ground slabs only* using one mirrored outline. Previous
# independent gap fillers made small square teeth at all eight roundabout
# tangencies. Buildings, planting beds, fountain, materials and road width
# remain unchanged. Match the original 9.29 walking surface / 9.38 rolled lip.
cx, cz = 49.3719545, -32.327407
half_road = 3.050765
rx, rz = 52.75872, 44.342375
quadrant = box(half_road, half_road, rx, rz).difference(Point(0, 0).buffer(10.4, quad_segs=64))
quadrant = quadrant.buffer(-.9, quad_segs=20).buffer(.9, quad_segs=20)
central_after = []
for sx in [-1, 1]:
    for sz in [-1, 1]:
        from shapely.affinity import scale, translate
        name = f'CENTER_WHITE71_{sx}_{sz}'
        shape = set_precision(translate(scale(quadrant, xfact=sx, yfact=sz, origin=(0, 0)), cx, cz), .00001)
        row = row_for(name); row['replace'] = True
        inner = shape.buffer(-.5, quad_segs=16)
        flat(row, inner, 9.29); flat(row, shape, 8.79, False)
        # Triangulate the narrow lip once; all ring vertices are on either the
        # outer or inner contour, so the interpolated bevel is watertight.
        ring = shape.difference(inner)
        for poly in polys(ring):
            for f in constrained_delaunay_triangles(poly).geoms:
                v = [[x, 9.29 if inner.boundary.distance(Point(x, z)) < .00001 else 9.38008564, z] for x, z in list(f.exterior.coords)[:3]]
                if np.cross(np.subtract(v[1], v[0]), np.subtract(v[2], v[0]))[1] < 0: v.reverse()
                triangle(row, v)
        for poly in polys(shape):
            poly = orient(poly, sign=1)
            for (x, z), (a, b) in zip(poly.exterior.coords, list(poly.exterior.coords)[1:]):
                triangle(row, [[x, 9.38008564, z], [a, 9.38008564, b], [a, 8.79, b]])
                triangle(row, [[x, 9.38008564, z], [a, 8.79, b], [x, 8.79, z]])
        central_after.append(shape)
central_before = union_all([s for n, s in shapes.items() if n.startswith('CENTER_WHITE71_')])
central_after = union_all(central_after)
exposed_road = central_before.difference(central_after)
solid(row_for('5_YOL'), exposed_road.buffer(.00015, quad_segs=2), 9.22754747)
assert central_before.symmetric_difference(central_after).area < 10

# Third divider is the sole 59 cm-high extrusion; the other nine are 44.9 mm.
# Preserve its XZ outline and length, including the separately shortened tip.
m = meshes['8_REF_AYIRICI']; p = np.array(m['p']).reshape(-1, 3)
matrix = np.array(m['matrix']).reshape(4, 4).T
world = np.einsum('ij,kj->ik', np.column_stack((p, np.ones(len(p)))), matrix)[:, :3]
mask = (world[:, 0] > -151.17) & (world[:, 0] < -137.09) & (world[:, 2] > 49.98) & (world[:, 2] < 63.19)
selected = np.flatnonzero(mask)
bottom, top = world[mask, 1].min(), world[mask, 1].max()
assert len(selected) > 100 and abs(top - bottom - .59) < 1e-5
divider = {'name': m['name'], 'expected': expected(m), 'vertices': selected.tolist(),
           'from': [float(bottom), float(top)], 'to': [9.38008564, 9.42494970]}

discarded_count, discarded_area = 0, 0.0
for row in rows.values():
    assert np.isfinite(row['p']).all() and np.isfinite(row['n']).all(), 'Nonfinite baked curb geometry'
    # Fixed-grid polygon booleans can leave subpixel slivers that collapse
    # when WebGL stores positions as Float32. Discard only <0.05 mm² faces,
    # including the actual world->local quantization used by the runtime.
    pp = np.array(row['p'], dtype=np.float32).reshape(-1,3)
    matrix = np.array(meshes[row['name']]['matrix']).reshape(4,4).T
    local = np.einsum('ij,kj->ik', np.column_stack((pp,np.ones(len(pp)))), np.linalg.inv(matrix)).astype(np.float32)
    roundtrip = np.einsum('ij,kj->ik', local.astype(float), matrix)[:,:3]
    keep = []
    for k in range(0,len(row['ix']),3):
        ids = row['ix'][k:k+3]; a = pp[ids].astype(float); b = roundtrip[ids]
        area2 = np.linalg.norm(np.cross(a[1]-a[0],a[2]-a[0]))
        if min(area2,np.linalg.norm(np.cross(b[1]-b[0],b[2]-b[0]))) <= 1e-7:
            discarded_count += 1; discarded_area += area2/2; continue
        keep.extend(ids)
    row['ix'] = keep
    unique, p, n, ix = {}, [], [], []
    for j in row['ix']:
        a = row['p'][j * 3:j * 3 + 3]; b = [round(v, 7) for v in row['n'][j * 3:j * 3 + 3]]; key = tuple(a + b)
        if key not in unique: unique[key] = len(p) // 3; p.extend(a); n.extend(b)
        ix.append(unique[key])
    row.update(p=p, n=n, ix=ix)
metrics = {'grassCarrierArea': carrier.area, 'grassCarrierParts': len(polys(carrier)),
           'carrierOutsideGrass': carrier.difference(grass).area, 'carrierParkOverlap': carrier.intersection(park).area,
           'coastalFilletArea': join.area, 'coastalFilletBounds': join.bounds,
           'centralChangedArea': central_before.symmetric_difference(central_after).area,
           'centralRoadRestoredArea': exposed_road.area, 'centralSlabs': 4,
           'dividerVertices': len(selected), 'addedMeshes': 0, 'addedMaterials': 0, 'perFrameWork': 0}
metrics.update(discardedMicroscopicFaces=discarded_count,discardedMicroscopicArea=discarded_area)
metrics.update(stubEntryClosures=len(stub_entries),stubEntryOverlap=.002)
metrics.update(stubTrimmedTriangles=stub_trimmed_triangles,stubApronArea=sum(p.area for p in stub_aprons))
metrics.update(cityCurbProfile={"bounds":list(city_curb.bounds),"area":city_curb_clean.area,"components":2,"waterfrontBounds":list(waterfront_curb.bounds),"removedTriangles":city_removed,"bevelRadius":city_radius,"top":city_base+city_radius,"outlineChangedArea":city_curbs.symmetric_difference(city_curb_clean).area,"maxOutlineDeviation":city_outline_deviation,"closedMicroscopicCracks":sum(len(p.interiors)-1 for p in [city_curb,waterfront_curb])})
metrics.update(cityNotchRepair={"removedVertices":removed_notch_vertices,"changedArea":city_notch_delta.area,"scope":list(city_notch.bounds)},coastalJoinBlend=.16)
metrics.update(grassSeamWindows=[list(w.bounds) for w in grass_seam_windows],grassSeamArea=seam_scope.intersection(shapes['3_CIMEN']).area)
metrics.update(grassFrontFillArea=sum(p.area for p in grass_front_fills),grassFrontZ=128.58658)
patch = {'version': 1, 'metrics': metrics, 'meshes': list(rows.values()), 'divider': divider,
         'grassFill': {'name': '8_CIM_STUB_DOLGU', 'expected': expected(meshes['8_CIM_STUB_DOLGU']),
                       'source': '3_CIMEN', 'sourceExpected': expected(meshes['3_CIMEN'])}}
destination.write_text(json.dumps(patch, separators=(',', ':')))
print(json.dumps(metrics, indent=2), flush=True)
print([(r['name'], len(r['p']) // 3, len(r['ix']) // 3, r['replace']) for r in rows.values()], flush=True)
