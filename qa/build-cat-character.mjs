// Assemble the existing cat head and exact gorilla body without re-exporting geometry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

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
  asset: { version: '2.0', generator: '67Park cat/body assembly v4 — grey tone match' },
  scene: 0, scenes: [{ nodes: [24] }], nodes: [], meshes: [], skins: [],
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
const bin = Buffer.concat(parts), json = Buffer.from(JSON.stringify(out));
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
  installedInGame: false,
};
assert.equal(report.triangles, 20912); assert.equal(report.meshes, 4);
fs.writeFileSync(path.join(directory, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
