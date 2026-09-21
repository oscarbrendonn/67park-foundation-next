import { Box3, Matrix4, Ray, Vector3 } from 'three';

// The camera boom only consults the authored blocker list. Each unique static
// BufferGeometry gets a local-space triangle BVH; instances retain their exact
// transforms, so gaps between houses never become camera colliders.
const indexes = new WeakMap();
const geometryTrees = new WeakMap();
const geometryBounds = new WeakMap();
const LEAF_TRIANGLES = 12;
const finite = (...values) => values.every(Number.isFinite);

function geometryToken(geometry) {
 const position = geometry?.getAttribute?.('position'), index = geometry?.getIndex?.(), range = geometry?.drawRange || {};
 return { position, positionVersion: position?.version, index, indexVersion: index?.version, start: range.start, count: range.count };
}
function sameToken(a, b) { return a && a.position === b.position && a.positionVersion === b.positionVersion && a.index === b.index && a.indexVersion === b.indexVersion && a.start === b.start && a.count === b.count; }

function boundsFor(geometry) {
 const token = geometryToken(geometry), cached = geometryBounds.get(geometry);
 if (cached && sameToken(cached.token, token)) return cached;
 geometry?.computeBoundingBox?.();
 const bounds = { token, box: geometry?.boundingBox?.clone?.() || new Box3().makeEmpty() };
 geometryBounds.set(geometry, bounds); return bounds;
}

function triangleTree(geometry) {
 const token = geometryToken(geometry), cached = geometryTrees.get(geometry);
 if (cached && sameToken(cached.token, token)) return cached;
 const started = globalThis.performance?.now?.() ?? Date.now();
 const position = token.position, source = token.index, triangles = [], references = [];
 if (position?.itemSize >= 3) {
  const available = source ? source.count : position.count, start = Math.max(0, token.start || 0), end = Math.min(available, start + (Number.isFinite(token.count) ? token.count : Infinity));
  const vertexAt = source ? offset => source.getX(offset) : offset => offset;
  for (let offset = start; offset + 2 < end; offset += 3) {
   const ia = vertexAt(offset), ib = vertexAt(offset + 1), ic = vertexAt(offset + 2);
   if (ia >= position.count || ib >= position.count || ic >= position.count) continue;
   const values = [position.getX(ia), position.getY(ia), position.getZ(ia), position.getX(ib), position.getY(ib), position.getZ(ib), position.getX(ic), position.getY(ic), position.getZ(ic)];
   if (finite(...values)) { triangles.push(...values); references.push(offset); }
  }
 }
 const data = new Float64Array(triangles), count = data.length / 9, bounds = new Float64Array(count * 6), centers = new Float64Array(count * 3), localBox = new Box3(); localBox.makeEmpty();
 for (let triangle = 0; triangle < count; triangle++) {
  const at = triangle * 9, box = triangle * 6, center = triangle * 3;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let vertex = 0; vertex < 9; vertex += 3) { const x = data[at + vertex], y = data[at + vertex + 1], z = data[at + vertex + 2]; minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z); }
  bounds.set([minX, minY, minZ, maxX, maxY, maxZ], box); centers.set([(minX + maxX) * .5, (minY + maxY) * .5, (minZ + maxZ) * .5], center);
  localBox.expandByPoint({ x: minX, y: minY, z: minZ }); localBox.expandByPoint({ x: maxX, y: maxY, z: maxZ });
 }
 let nodes = 0;
 const build = ids => {
  nodes++;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const triangle of ids) { const at = triangle * 6; minX = Math.min(minX, bounds[at]); minY = Math.min(minY, bounds[at + 1]); minZ = Math.min(minZ, bounds[at + 2]); maxX = Math.max(maxX, bounds[at + 3]); maxY = Math.max(maxY, bounds[at + 4]); maxZ = Math.max(maxZ, bounds[at + 5]); }
  const node = { minX, minY, minZ, maxX, maxY, maxZ };
  if (ids.length <= LEAF_TRIANGLES) { node.ids = Uint32Array.from(ids, triangle => references[triangle]); return node; }
  const spans = [maxX - minX, maxY - minY, maxZ - minZ], axis = spans[1] > spans[0] && spans[1] >= spans[2] ? 1 : spans[2] > spans[0] ? 2 : 0, midpoint = [minX, minY, minZ][axis] + spans[axis] * .5;
  const left = [], right = [];
  for (const triangle of ids) (centers[triangle * 3 + axis] < midpoint ? left : right).push(triangle);
  // Coincident centroids have no spatial split; a deterministic split still
  // bounds leaf work without sorting every triangle at every tree level.
  if (!left.length || !right.length) { const middle = ids.length >> 1; node.left = build(ids.slice(0, middle)); node.right = build(ids.slice(middle)); }
  else { node.left = build(left); node.right = build(right); }
  return node;
 };
 const root = count ? build(Array.from({ length: count }, (_, i) => i)) : null;
 const finished = globalThis.performance?.now?.() ?? Date.now();
 const tree = { token, position, source, data: null, root, localBox, triangleCount: count, nodeCount: nodes, referenceBytes: count * 4, transientBuildBytes: data.byteLength + bounds.byteLength + centers.byteLength, buildMs: +(finished - started).toFixed(3) };
 geometryTrees.set(geometry, tree); return tree;
}

async function stagedTriangleTree(geometry, yieldTask, limits) {
 const token = geometryToken(geometry), cached = geometryTrees.get(geometry); if (cached && sameToken(cached.token, token)) return cached;
 const started = performance.now(), position = token.position, source = token.index, triangles = [], references = []; let operations = 0;
 const checkpoint = () => { if (++operations % 512) return null; const now = performance.now(); if (now - limits.lastYield < limits.budgetMs) return null; limits.maxChunkMs = Math.max(limits.maxChunkMs, now - limits.lastYield); return Promise.resolve(yieldTask()).then(() => { limits.lastYield = performance.now(); }); };
 if (position?.itemSize >= 3) {
  const available = source ? source.count : position.count, start = Math.max(0, token.start || 0), end = Math.min(available, start + (Number.isFinite(token.count) ? token.count : Infinity)), vertexAt = source ? offset => source.getX(offset) : offset => offset;
  for (let offset = start; offset + 2 < end; offset += 3) { const ia = vertexAt(offset), ib = vertexAt(offset + 1), ic = vertexAt(offset + 2); if (ia < position.count && ib < position.count && ic < position.count) { const values = [position.getX(ia), position.getY(ia), position.getZ(ia), position.getX(ib), position.getY(ib), position.getZ(ib), position.getX(ic), position.getY(ic), position.getZ(ic)]; if (finite(...values)) { triangles.push(...values); references.push(offset); } } const pause = checkpoint(); if (pause) await pause; }
 }
 const data = new Float64Array(triangles), count = data.length / 9, bounds = new Float64Array(count * 6), centers = new Float64Array(count * 3), localBox = new Box3(); localBox.makeEmpty();
 for (let triangle = 0; triangle < count; triangle++) { const at = triangle * 9, box = triangle * 6, center = triangle * 3; let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity; for (let vertex = 0; vertex < 9; vertex += 3) { const x = data[at + vertex], y = data[at + vertex + 1], z = data[at + vertex + 2]; minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z); } bounds.set([minX, minY, minZ, maxX, maxY, maxZ], box); centers.set([(minX + maxX) * .5, (minY + maxY) * .5, (minZ + maxZ) * .5], center); localBox.expandByPoint({ x:minX,y:minY,z:minZ }); localBox.expandByPoint({ x:maxX,y:maxY,z:maxZ }); const pause = checkpoint(); if (pause) await pause; }
 let nodes = 0;
 const build = async ids => { nodes++; let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity; for (const triangle of ids) { const at=triangle*6; minX=Math.min(minX,bounds[at]);minY=Math.min(minY,bounds[at+1]);minZ=Math.min(minZ,bounds[at+2]);maxX=Math.max(maxX,bounds[at+3]);maxY=Math.max(maxY,bounds[at+4]);maxZ=Math.max(maxZ,bounds[at+5]); const pause=checkpoint();if(pause)await pause; } const node={minX,minY,minZ,maxX,maxY,maxZ}; if(ids.length<=LEAF_TRIANGLES){node.ids=Uint32Array.from(ids,triangle=>references[triangle]);return node;} const spans=[maxX-minX,maxY-minY,maxZ-minZ],axis=spans[1]>spans[0]&&spans[1]>=spans[2]?1:spans[2]>spans[0]?2:0,midpoint=[minX,minY,minZ][axis]+spans[axis]*.5,left=[],right=[]; for(const triangle of ids){(centers[triangle*3+axis]<midpoint?left:right).push(triangle);const pause=checkpoint();if(pause)await pause;} if(!left.length||!right.length){const middle=ids.length>>1;node.left=await build(ids.slice(0,middle));node.right=await build(ids.slice(middle));}else{node.left=await build(left);node.right=await build(right);}return node; };
 const root = count ? await build(Array.from({length:count},(_,i)=>i)) : null, finished = performance.now(); limits.maxChunkMs = Math.max(limits.maxChunkMs, finished - limits.lastYield); const tree={token,position,source,data:null,root,localBox,triangleCount:count,nodeCount:nodes,referenceBytes:count*4,transientBuildBytes:data.byteLength+bounds.byteLength+centers.byteLength,buildMs:+(finished-started).toFixed(3)};
 if (sameToken(token, geometryToken(geometry))) geometryTrees.set(geometry, tree); return tree;
}

// Call while constructing the unpublished world. It builds every exact triangle
// index in time-bounded chunks; cameraMeshCast still has its synchronous exact
// fallback for later geometry mutation rather than returning an unsafe no-hit.
export async function prepareCameraMeshes(world, { yieldTask = () => new Promise(resolve => setTimeout(resolve, 0)), budgetMs = 6 } = {}) {
 const limits = { budgetMs: Math.max(1, Math.min(12, budgetMs)), maxChunkMs: 0, lastYield: performance.now() }, geometries = [...new Set((world?.blockers || []).filter(mesh => mesh?.isMesh && !mesh.isSkinnedMesh).map(mesh => mesh.geometry))];
 for (const geometry of geometries) { boundsFor(geometry); const now = performance.now(); limits.maxChunkMs = Math.max(limits.maxChunkMs, now - limits.lastYield); if (now - limits.lastYield >= limits.budgetMs) { await yieldTask(); limits.lastYield = performance.now(); } await stagedTriangleTree(geometry, yieldTask, limits); }
 limits.maxChunkMs = +Math.max(limits.maxChunkMs, 0).toFixed(3); return { geometries: geometries.length, ...cameraMeshCastStats(world), maxChunkMs: limits.maxChunkMs };
}

function refresh(record) {
 const { mesh } = record, count = mesh.isInstancedMesh ? mesh.count : 1, bounds = boundsFor(mesh.geometry); mesh.updateWorldMatrix(true, false);
 const version = mesh.isInstancedMesh ? mesh.instanceMatrix.version : 0;
 if (record.geometry === mesh.geometry && record.count === count && record.version === version && record.world.equals(mesh.matrixWorld) && record.bounds === bounds) return;
 if (record.geometry !== mesh.geometry || record.count !== count) record.rows = Array.from({ length: count }, () => ({ world: new Matrix4(), inverse: new Matrix4(), box: new Box3() }));
 for (let instance = 0; instance < count; instance++) { const row = record.rows[instance]; if (mesh.isInstancedMesh) { mesh.getMatrixAt(instance, record.instance); row.world.multiplyMatrices(mesh.matrixWorld, record.instance); } else row.world.copy(mesh.matrixWorld); row.inverse.copy(row.world).invert(); row.box.copy(bounds.box).applyMatrix4(row.world); }
 record.geometry = mesh.geometry; record.count = count; record.version = version; record.world.copy(mesh.matrixWorld); record.bounds = bounds;
}

function intersects(node, ray) {
 let minimum = -Infinity, maximum = Infinity;
 for (const [origin, direction, min, max] of [[ray.origin.x, ray.direction.x, node.minX, node.maxX], [ray.origin.y, ray.direction.y, node.minY, node.maxY], [ray.origin.z, ray.direction.z, node.minZ, node.maxZ]]) {
  if (Math.abs(direction) < 1e-12) { if (origin < min || origin > max) return false; continue; }
  const first = (min - origin) / direction, last = (max - origin) / direction; minimum = Math.max(minimum, Math.min(first, last)); maximum = Math.min(maximum, Math.max(first, last)); if (maximum < minimum) return false;
 }
 return maximum >= 0;
}

function nearestHit(tree, ray, origin, near, far, scratch) {
 if (!tree.root || !intersects(tree.root, ray)) return null;
 let closest = far, found = null; scratch.stack.length = 0; scratch.stack.push(tree.root);
 while (scratch.stack.length) {
  const node = scratch.stack.pop(); if (!intersects(node, ray)) continue;
  if (!node.ids) { scratch.stack.push(node.left, node.right); continue; }
  for (const offset of node.ids) {
   scratch.triangles++; const ia = tree.source ? tree.source.getX(offset) : offset, ib = tree.source ? tree.source.getX(offset + 1) : offset + 1, ic = tree.source ? tree.source.getX(offset + 2) : offset + 2, position = tree.position;
   scratch.a.set(position.getX(ia), position.getY(ia), position.getZ(ia)); scratch.b.set(position.getX(ib), position.getY(ib), position.getZ(ib)); scratch.c.set(position.getX(ic), position.getY(ic), position.getZ(ic));
   if (!ray.intersectTriangle(scratch.a, scratch.b, scratch.c, false, scratch.localHit)) continue;
   scratch.worldHit.copy(scratch.localHit).applyMatrix4(scratch.world); const distance = scratch.worldHit.distanceTo(origin);
   if (distance >= near && distance <= closest) { closest = distance; found = distance; }
  }
 }
 return found;
}
function sameBlockers(index, blockers) { return index.source === blockers && index.meshes.length === blockers.length && index.meshes.every((mesh, i) => mesh === blockers[i]); }

export function cameraMeshCast(world, origin, direction, length) {
 if (!world?.blockers?.length) return null;
 let index = indexes.get(world);
 if (!index || !sameBlockers(index, world.blockers)) { const records = world.blockers.filter(mesh => mesh.isMesh && !mesh.isSkinnedMesh).map(mesh => ({ mesh, rows: [], world: new Matrix4(), instance: new Matrix4(), count: -1, bounds: null })); index = { source: world.blockers, meshes: [...world.blockers], records, ray: new Ray(), localRay: new Ray(), point: new Vector3(), scratch: { a: new Vector3(), b: new Vector3(), c: new Vector3(), localHit: new Vector3(), worldHit: new Vector3(), world: new Matrix4(), stack: [], triangles: 0 }, lastTriangleTests: 0 }; indexes.set(world, index); }
 const { ray, localRay, point, scratch } = index; ray.origin.set(origin.x, origin.y, origin.z); ray.direction.set(direction.x, direction.y, direction.z).normalize(); let closest = length, found = false; scratch.triangles = 0;
 for (const record of index.records) {
  let visible = true; for (let node = record.mesh; node; node = node.parent) if (!node.visible) { visible = false; break; }
  if (!visible || record.mesh.userData?.cameraIgnore) continue;
  refresh(record);
  for (const row of record.rows) {
   if (row.box.isEmpty() || (!row.box.containsPoint(ray.origin) && (!ray.intersectBox(row.box, point) || point.distanceTo(ray.origin) > closest))) continue;
   localRay.origin.copy(ray.origin).applyMatrix4(row.inverse); localRay.direction.copy(ray.direction).transformDirection(row.inverse); scratch.world.copy(row.world);
   const hit = nearestHit(triangleTree(record.mesh.geometry), localRay, ray.origin, .02, closest, scratch); if (hit !== null) { closest = hit; found = true; }
  }
 }
 index.lastTriangleTests = scratch.triangles; return found ? closest : null;
}

// Test-only observability for a complexity bound; it cannot affect casting.
export function cameraMeshCastStats(world) {
 const index = indexes.get(world), meshes = index?.records.map(record => record.mesh) || (world?.blockers || []), trees = new Set(meshes.map(mesh => geometryTrees.get(mesh.geometry)).filter(Boolean));
 let triangles = 0, nodes = 0, referenceBytes = 0, transientBuildPeakBytes = 0, buildMs = 0;
 for (const tree of trees) { triangles += tree.triangleCount; nodes += tree.nodeCount; referenceBytes += tree.referenceBytes; transientBuildPeakBytes = Math.max(transientBuildPeakBytes, tree.transientBuildBytes); buildMs += tree.buildMs; }
 // Node objects have engine-dependent overhead. The exact retained payload is
 // one Uint32 source-slot reference per triangle; positions stay in the mesh.
 return { triangleTests: index?.lastTriangleTests || 0, trees: trees.size, triangles, nodes, minimumRetainedBytes: referenceBytes, transientBuildPeakBytes, buildMs: +buildMs.toFixed(3) };
}
