// Assemble the existing cat head and exact gorilla body without re-exporting geometry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Matrix4, Vector3, Quaternion } from '../vendor/three.module.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function source(relative) {
  const bytes = fs.readFileSync(path.join(root, relative));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  let json, bin;
  for (let p = 12; p < bytes.length;) {
    const n = bytes.readUInt32LE(p), type = bytes.readUInt32LE(p + 4);
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(p + 8, p + 8 + n));
    if (type === 0x004e4942) bin = bytes.subarray(p + 8, p + 8 + n);
    p += n + 8;
  }
  return { relative, bytes, json, bin, cache: new Map() };
}
const gorilla = source('models/goril-motion-v3.glb');
const cat = source('cat-preview/cat-head-mobile.glb');
const out = {
  asset: { version: '2.0', generator: '67Park cat/body assembly v5 — canonical head fit' },
  scene: 0, scenes: [{ nodes: [24], extras: { parkNativeHeight: .3345185926093267 } }], nodes: [], meshes: [], skins: [],
  accessors: [], bufferViews: [], materials: [], textures: [], images: [], samplers: [],
  animations: [], extensionsUsed: ['KHR_mesh_quantization', 'KHR_draco_mesh_compression'],
  extensionsRequired: ['KHR_mesh_quantization', 'KHR_draco_mesh_compression'],
};
const clone = value => structuredClone(value);
const parts = [];
let offset = 0;
function cached(src, kind, index, create) {
  const key = `${kind}:${index}`;
  if (src.cache.has(key)) return src.cache.get(key);
  const id = create(); src.cache.set(key, id); return id;
}
function view(src, index) {
  return cached(src, 'view', index, () => {
    const v = clone(src.json.bufferViews[index]);
    assert.equal(v.buffer, 0);
    const data = src.bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    const pad = (4 - offset % 4) % 4;
    parts.push(Buffer.alloc(pad), data); offset += pad;
    v.byteOffset = offset; v.buffer = 0; offset += data.length;
    return out.bufferViews.push(v) - 1;
  });
}
function accessor(src, index) {
  return cached(src, 'accessor', index, () => {
    const a = clone(src.json.accessors[index]);
    if (a.bufferView !== undefined) a.bufferView = view(src, a.bufferView);
    if (a.sparse) {
      a.sparse.indices.bufferView = view(src, a.sparse.indices.bufferView);
      a.sparse.values.bufferView = view(src, a.sparse.values.bufferView);
    }
    return out.accessors.push(a) - 1;
  });
}
function texture(src, index) {
  return cached(src, 'texture', index, () => {
    const t = clone(src.json.textures[index]);
    if (t.sampler !== undefined) t.sampler = cached(src, 'sampler', t.sampler,
      () => out.samplers.push(clone(src.json.samplers[t.sampler])) - 1);
    t.source = cached(src, 'image', t.source, () => {
      const i = clone(src.json.images[t.source]); i.bufferView = view(src, i.bufferView);
      return out.images.push(i) - 1;
    });
    return out.textures.push(t) - 1;
  });
}
function material(src, index) {
  return cached(src, 'material', index, () => {
    const m = clone(src.json.materials[index]);
    for (const container of [m, m.pbrMetallicRoughness]) {
      for (const [key, value] of Object.entries(container || {})) {
        if (key.endsWith('Texture')) value.index = texture(src, value.index);
      }
    }
    return out.materials.push(m) - 1;
  });
}
// Keep the head untouched. Use its actual sRGB fur atlas on the body too,
// instead of approximating the texture by a constant baseColorFactor.
const headMaterialIndex = material(cat, 0);
const bodyMaterial = clone(out.materials[headMaterialIndex]);
bodyMaterial.name = 'Cat_Fur_Shared_Atlas_Light_Grey_Body';
// Tight body curves produced hard plastic streaks at the head's low roughness.
// A softer body response matches the existing broad head's appearance while
// leaving its face, eyes, texture and original material exactly unchanged.
delete bodyMaterial.pbrMetallicRoughness.metallicRoughnessTexture;
bodyMaterial.pbrMetallicRoughness.roughnessFactor = .7;
// Match the visible grey of the unchanged head, not just its atlas texel.
// User clarified that the matte body still looked too white. Calibrated under
// the unchanged preview lights/camera; keep the accepted matte response.
const bodyTintLinear = [.65, .65, .65];
bodyMaterial.pbrMetallicRoughness.baseColorFactor = [...bodyTintLinear, 1];
const bodyMaterialIndex = out.materials.push(bodyMaterial) - 1;
const bodyFurUVRect = [25 / 512, 155 / 512, 90 / 512, 235 / 512];
function bodyUV(src, index) {
  const original = src.json.accessors[index], v = src.json.bufferViews[original.bufferView];
  assert.equal(original.type, 'VEC2'); assert(!original.sparse);
  const types = {5121: [1, 'readUInt8', 255], 5122: [2, 'readInt16LE', 32767],
    5123: [2, 'readUInt16LE', 65535], 5126: [4, 'readFloatLE', 1]};
  const [bytes, read, divisor] = types[original.componentType];
  const stride = v.byteStride || bytes * 2;
  const data = Buffer.alloc(original.count * 8);
  for (let i = 0; i < original.count; i++) for (let axis = 0; axis < 2; axis++) {
    let n = src.bin[read]((v.byteOffset || 0) + (original.byteOffset || 0) + i * stride + axis * bytes);
    if (original.normalized) n /= divisor;
    assert(Number.isFinite(n));
    n = Math.max(0, Math.min(1, n));
    data.writeFloatLE(bodyFurUVRect[axis] + n * (bodyFurUVRect[axis + 2] - bodyFurUVRect[axis]), i * 8 + axis * 4);
  }
  const pad = (4 - offset % 4) % 4; parts.push(Buffer.alloc(pad), data); offset += pad;
  const bufferView = out.bufferViews.push({buffer: 0, byteOffset: offset, byteLength: data.length, target: 34962}) - 1;
  offset += data.length;
  return out.accessors.push({bufferView, componentType: 5126, count: original.count, type: 'VEC2',
    min: bodyFurUVRect.slice(0, 2), max: bodyFurUVRect.slice(2)}) - 1;
}
out.nodes = gorilla.json.nodes.slice(0, 20).map(clone);
const boneMap = new Map(out.nodes.map((node, i) => [node.name, i]));
function addMesh(src, originalNode, body = false) {
  const n = clone(src.json.nodes[originalNode]);
  const m = clone(src.json.meshes[n.mesh]);
  for (const p of m.primitives) {
    for (const key of Object.keys(p.attributes)) p.attributes[key] = body && key === 'TEXCOORD_0'
      ? bodyUV(src, p.attributes[key]) : accessor(src, p.attributes[key]);
    if (p.indices !== undefined) p.indices = accessor(src, p.indices);
    p.material = body ? bodyMaterialIndex : material(src, p.material);
    const draco = p.extensions?.KHR_draco_mesh_compression;
    if (draco) draco.bufferView = view(src, draco.bufferView);
  }
  n.mesh = out.meshes.push(m) - 1;
  const skin = clone(src.json.skins[n.skin]);
  skin.joints = skin.joints.map(i => {
    const mapped = boneMap.get(src.json.nodes[i].name); assert.notEqual(mapped, undefined); return mapped;
  });
  if (skin.skeleton !== undefined) skin.skeleton = boneMap.get(src.json.nodes[skin.skeleton].name);
  skin.inverseBindMatrices = accessor(src, skin.inverseBindMatrices);
  n.skin = out.skins.push(skin) - 1;
  out.nodes.push(n);
}
for (const name of ['FS_Body', 'Goril_El_L', 'Goril_El_R']) {
  addMesh(gorilla, gorilla.json.nodes.findIndex(n => n.name === name), true);
}
addMesh(cat, cat.json.nodes.findIndex(n => n.name === '67Park_Cat_Head'));
out.nodes.push({ name: 'Character_Rig', children: [19, 20, 21, 22, 23] });
for (const original of gorilla.json.animations) {
  const a = clone(original);
  a.samplers = a.samplers.map(s => ({ ...s, input: accessor(gorilla, s.input), output: accessor(gorilla, s.output) }));
  for (const channel of a.channels) assert(channel.target.node < 20, 'Animation must target retained bones');
  out.animations.push(a);
}
out.buffers = [{ byteLength: offset }];
const bin = Buffer.concat(parts);
// Rest-pose bounds measured with the shipping GLTFLoader and retained Gorilla
// bones. Fit the complete Cat head to the Gorilla's head envelope, without
// recompressing its vertices, UVs or texture. Both avatars use the same body
// normalization (Gorilla's source includes its optional crown in that height).
assert.equal(crypto.createHash('sha256').update(cat.bytes).digest('hex'),
  'e1f628ea5fc06bcd874c12270356ec5d2ce9368db57ac4cbae6b0e28d0bd789a');
assert.equal(crypto.createHash('sha256').update(gorilla.bytes).digest('hex'),
  'cd14c7a06dda3c6c7a25e7106e90bfb34c8276bd1cc09b810d9b5c2f174e9c01');
const catMin = new Vector3(-.09897012270731134, .14000423868360884, -.06398971378263478);
const catSize = new Vector3(.19794024531270993, .14933416244612358, .12995453185701147);
const gorillaMin = new Vector3(-.08357045799493962, .13401102130338838, -.0798059983559614);
const gorillaSize = new Vector3(.16714091598987663, .1565106442502403, .1596119863069428);
const headScale = gorillaSize.clone().divide(catSize);
const fit = new Matrix4().makeTranslation(...gorillaMin.toArray())
  .multiply(new Matrix4().makeScale(...headScale.toArray()))
  .multiply(new Matrix4().makeTranslation(...catMin.clone().negate().toArray()));
const parent = new Map();
out.nodes.forEach((n, i) => (n.children || []).forEach(c => parent.set(c, i)));
function boneWorld(i) {
  const n = out.nodes[i], local = n.matrix ? new Matrix4().fromArray(n.matrix)
    : new Matrix4().compose(new Vector3().fromArray(n.translation || [0, 0, 0]),
      new Quaternion().fromArray(n.rotation || [0, 0, 0, 1]), new Vector3().fromArray(n.scale || [1, 1, 1]));
  return parent.has(i) ? boneWorld(parent.get(i)).multiply(local) : local;
}
const headSkin = out.skins[out.nodes[23].skin], headSlot = headSkin.joints.indexOf(boneMap.get('Head'));
const bindAccessor = out.accessors[headSkin.inverseBindMatrices], bindView = out.bufferViews[bindAccessor.bufferView];
const bindOffset = bindView.byteOffset + (bindAccessor.byteOffset || 0) + headSlot * 64;
const oldBind = new Matrix4().fromArray(Array.from({length: 16}, (_, i) => bin.readFloatLE(bindOffset + i * 4)));
const rest = boneWorld(boneMap.get('Head'));
const fittedBind = rest.clone().invert().multiply(fit).multiply(rest).multiply(oldBind);
fittedBind.elements.forEach((n, i) => bin.writeFloatLE(n, bindOffset + i * 4));
const json = Buffer.from(JSON.stringify(out));
const jsonPad = Buffer.alloc((4 - json.length % 4) % 4, 32);
const binPad = Buffer.alloc((4 - bin.length % 4) % 4);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + jsonPad.length + bin.length + binPad.length, 8);
header.writeUInt32LE(json.length + jsonPad.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(bin.length + binPad.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([header, json, jsonPad, binHeader, bin, binPad]);
const directory = path.join(root, 'cat-character'); fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'cat-gorilla-body.glb'), result);
// Byte witnesses cover geometry, skin matrices, atlas images and animation samples.
let preservedViews = 0;
for (const src of [gorilla, cat]) for (const [key, index] of src.cache) {
  if (!key.startsWith('view:')) continue;
  const original = src.json.bufferViews[Number(key.slice(5))], copied = out.bufferViews[index];
  // Only the Cat Head bind matrix is intentionally adjusted; all other bytes
  // in its skin buffer must still match the source exactly.
  if (src === cat && index === bindAccessor.bufferView) {
    const expected = Buffer.from(src.bin.subarray(original.byteOffset || 0, (original.byteOffset || 0) + original.byteLength));
    fittedBind.elements.forEach((n, i) => expected.writeFloatLE(n, (bindAccessor.byteOffset || 0) + headSlot * 64 + i * 4));
    assert(expected.equals(bin.subarray(copied.byteOffset, copied.byteOffset + copied.byteLength)));
    continue;
  }
  assert(src.bin.subarray(original.byteOffset || 0, (original.byteOffset || 0) + original.byteLength)
    .equals(bin.subarray(copied.byteOffset, copied.byteOffset + copied.byteLength)));
  preservedViews++;
}
const report = {
  sources: [gorilla, cat].map(s => ({ path: s.relative, sha256: crypto.createHash('sha256').update(s.bytes).digest('hex') })),
  output: 'cat-character/cat-gorilla-body.glb', bytes: result.length,
  triangles: out.meshes.reduce((n, m) => n + m.primitives.reduce((n, p) => n + out.accessors[p.indices].count / 3, 0), 0),
  meshes: out.meshes.length, materials: out.materials.length, bones: 20,
  clips: out.animations.map(a => a.name), preservedViews,
  bodyFurTextureSRGB: '#e7e9e8', bodyTintLinear, bodyRoughness: .7, bodySharesHeadBaseColorTexture: true,
  bodyFurUVRect, bodyUVChanged: true, bodyGeometryChanged: false, headGeometryChanged: false, headMaterialChanged: false,
  headFitScale: headScale.toArray(), headBindAdjusted: true,
  parkNativeHeight: out.scenes[0].extras.parkNativeHeight,
  installedInGame: true,
};
assert.equal(report.triangles, 20912); assert.equal(report.meshes, 4);
fs.writeFileSync(path.join(directory, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
