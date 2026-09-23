// app/explore/explore.js
import * as THREE from "three";
import { beginEntry, subscribeEntry, entrySnapshot, entryReady, entryFailed, watchEntry } from "/67park-foundation-next/app/entry-loading.js";

// explore-local-helper:/67park-foundation-next/app/island-camera-depth.js
var savedClipping = /* @__PURE__ */ new WeakMap();
function updateIslandOverviewDepth(camera2, active) {
  if (!camera2?.isPerspectiveCamera) return;
  let saved = savedClipping.get(camera2);
  const height = camera2.position.y;
  if (!active || !Number.isFinite(height) || height < 120) {
    if (!saved) return;
    camera2.near = saved.near;
    camera2.far = saved.far;
    camera2.updateProjectionMatrix();
    savedClipping.delete(camera2);
    return;
  }
  if (!saved) {
    saved = { near: camera2.near, far: camera2.far };
    savedClipping.set(camera2, saved);
  }
  const near = Math.min(100, height * 0.05);
  const far = Math.max(saved.far, height + 750);
  if (camera2.near === near && camera2.far === far) return;
  camera2.near = near;
  camera2.far = far;
  camera2.updateProjectionMatrix();
}

// explore-local-helper:/67park-foundation-next/app/island-startup-warmup.js
import { Vector4 } from "three";
var renderable = (o) => o.isMesh || o.isLine || o.isPoints || o.isSprite;
var yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 0));
function captureRenderer(renderer2, lights) {
  return {
    target: renderer2.getRenderTarget(),
    face: renderer2.getActiveCubeFace(),
    mip: renderer2.getActiveMipmapLevel(),
    viewport: renderer2.getViewport(new Vector4()),
    scissor: renderer2.getScissor(new Vector4()),
    scissorTest: renderer2.getScissorTest(),
    autoUpdate: renderer2.shadowMap.autoUpdate,
    needsUpdate: renderer2.shadowMap.needsUpdate,
    shadows: lights.map((o) => ({ shadow: o.shadow, autoUpdate: o.shadow.autoUpdate, needsUpdate: o.shadow.needsUpdate }))
  };
}
function restoreRenderer(renderer2, saved) {
  renderer2.shadowMap.autoUpdate = saved.autoUpdate;
  renderer2.shadowMap.needsUpdate = saved.needsUpdate;
  for (const s of saved.shadows) {
    s.shadow.autoUpdate = s.autoUpdate;
    s.shadow.needsUpdate = s.needsUpdate;
  }
  renderer2.setViewport(saved.viewport);
  renderer2.setScissor(saved.scissor);
  renderer2.setScissorTest(saved.scissorTest);
  renderer2.setRenderTarget(saved.target, saved.face, saved.mip);
}
async function warmIslandForEntry(renderer2, scene2, camera2, { cancelled = () => false, batchSize = 64 } = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 128) throw RangeError("Island GPU warmup batch size must be 1\u2013128");
  const started = performance.now(), meshes = [], lights = [];
  scene2.traverseVisible((o) => {
    if (renderable(o)) meshes.push(o);
    if (o.isLight && o.castShadow && o.shadow) lights.push(o);
  });
  const stats = { meshes: meshes.length, batches: 0, batchSize, maxBatchMs: 0, fullRenderMs: 0, totalMs: 0, cancelled: false };
  const finish = () => {
    stats.totalMs = performance.now() - started;
    return stats;
  };
  for (let start = 0; start < meshes.length; start += batchSize) {
    if (cancelled()) {
      stats.cancelled = true;
      return finish();
    }
    const saved2 = captureRenderer(renderer2, lights), masks = meshes.map((o) => o.layers.mask);
    const sliceStart = performance.now();
    try {
      for (let i = 0; i < meshes.length; i++) if (i < start || i >= start + batchSize) meshes[i].layers.mask = 0;
      renderer2.setRenderTarget(null);
      renderer2.setViewport(saved2.viewport);
      renderer2.setScissor(0, 0, 1, 1);
      renderer2.setScissorTest(true);
      renderer2.shadowMap.autoUpdate = false;
      renderer2.shadowMap.needsUpdate = true;
      for (const { shadow } of saved2.shadows) shadow.needsUpdate = true;
      renderer2.render(scene2, camera2);
    } finally {
      for (let i = 0; i < meshes.length; i++) meshes[i].layers.mask = masks[i];
      restoreRenderer(renderer2, saved2);
    }
    stats.batches++;
    stats.maxBatchMs = Math.max(stats.maxBatchMs, performance.now() - sliceStart);
    await yieldToUI();
  }
  if (cancelled()) {
    stats.cancelled = true;
    return finish();
  }
  const saved = captureRenderer(renderer2, lights), fullStart = performance.now();
  try {
    renderer2.setRenderTarget(null);
    renderer2.setViewport(saved.viewport);
    renderer2.setScissorTest(false);
    renderer2.shadowMap.needsUpdate = true;
    for (const { shadow } of saved.shadows) shadow.needsUpdate = true;
    renderer2.render(scene2, camera2);
  } finally {
    restoreRenderer(renderer2, saved);
  }
  stats.fullRenderMs = performance.now() - fullStart;
  return finish();
}

// app/explore/explore.js
import { stickVector, rotatePose, stepPose, overviewPose, transformMapGesture, clampMapPose } from "./controls.js?v=map-gestures-2";
var $ = (id) => document.getElementById(id);
var canvas = $("map");
var keys = /* @__PURE__ */ new Set();
var touch = { x: 0, z: 0, y: 0, fast: false };
var world;
var renderer;
var box;
var sun;
var pose = { x: 40, y: 350, z: 220, yaw: 0, pitch: -1.1 };
var aerial = false;
var overviewLighting = false;
var ready = false;
var failed = false;
var frame = 0;
var last = 0;
var floorElapsed = 0;
var gesture = null;
var stick = null;
var overviewFitted = false;
var canvasPointers = /* @__PURE__ */ new Map();
var heldVertical = /* @__PURE__ */ new Map();
var focus = new THREE.Vector3();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2200);
var bounds = { minX: -400, maxX: 430, minZ: -450, maxZ: 380, minY: 2, maxY: 2e3 };
var mapLimits = { planeY: 0, minHeight: 28, maxHeight: 2e3, minX: -400, maxX: 430, minZ: -450, maxZ: 380 };
var unbounded = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity, minY: 2, maxY: 2e3 };
var input = { x: 0, z: 0, y: 0, fast: false };
var look = new THREE.Vector3();
document.body.dataset.ready = "false";
window.__explore = { state: () => ({ ready, failed, mode: aerial ? "overview" : "free", pose: { ...pose }, mapLimits: { ...mapLimits }, overviewFitted, gesture: gesture?.type ?? null, aspect: camera.aspect, fov: camera.fov, draws: renderer?.info.render.calls, triangles: renderer?.info.render.triangles, held: keys.size + heldVertical.size + canvasPointers.size + (stick !== null ? 1 : 0), errors: window.__exploreErrors ?? [] }) };
window.__exploreErrors = [];
addEventListener("error", (e) => window.__exploreErrors.push(e.message));
addEventListener("unhandledrejection", (e) => window.__exploreErrors.push(String(e.reason)));
var applyPose = () => {
  camera.position.set(pose.x, pose.y, pose.z);
  look.set(pose.x + Math.sin(pose.yaw) * Math.cos(pose.pitch), pose.y + Math.sin(pose.pitch), pose.z - Math.cos(pose.yaw) * Math.cos(pose.pitch));
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
};
function clearControls() {
  keys.clear();
  heldVertical.clear();
  canvasPointers.clear();
  touch.x = touch.z = touch.y = 0;
  gesture = stick = null;
  $("knob").style.transform = "translate(0,0)";
}
function setAerial(value) {
  aerial = value;
  document.body.dataset.mode = value ? "overview" : "free";
  $("overview").setAttribute("aria-pressed", String(value));
  $("street").setAttribute("aria-pressed", String(!value));
  const zoom = $("map-zoom");
  if (zoom) zoom.hidden = !value;
  const hint = document.querySelector(".hint");
  if (hint) hint.textContent = value ? "Pan · Pinch to zoom" : "Drag to look around";
}
var viewport = () => ({ width: canvas.clientWidth, height: canvas.clientHeight, fov: camera.fov });
function updateMapLimits() {
  if (!box) return;
  mapLimits.maxHeight = Math.max(600, (overviewPose(box, camera.aspect, camera.fov).y - mapLimits.planeY) * 1.6, pose.y - mapLimits.planeY);
  unbounded.minY = mapLimits.planeY + mapLimits.minHeight;
  unbounded.maxY = mapLimits.planeY + mapLimits.maxHeight;
}
function overview() {
  if (!ready) return;
  clearControls();
  setAerial(true);
  overviewLighting = true;
  overviewFitted = true;
  pose = overviewPose(box, camera.aspect, camera.fov);
  updateMapLimits();
  applyPose();
}
function street() {
  if (!world) return;
  clearControls();
  setAerial(false);
  overviewLighting = false;
  overviewFitted = false;
  const [x, y, z] = world.spawn;
  pose = { x: x - 6, y: y + 9, z: z + 19, yaw: 0.1, pitch: -0.28 };
  applyPose();
}
function resize() {
  if (!renderer) return;
  clearControls();
  const width = innerWidth, height = innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (ready && aerial) {
    if (overviewFitted) overview();
    else updateMapLimits();
  }
}
function gestureState() {
  const points = [...canvasPointers.values()];
  if (!points.length) return null;
  if (aerial && points.length === 2) return { type: "pinch", x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2, distance: Math.max(12, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)) };
  return { type: aerial ? "pan" : "look", ...points[0], distance: 1 };
}
var localPoint = (e) => {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};
canvas.addEventListener("pointerdown", (e) => {
  if (!ready || e.button > 0 || canvasPointers.size >= (aerial ? 2 : 1)) return;
  canvas.focus({ preventScroll: true });
  canvasPointers.set(e.pointerId, localPoint(e));
  canvas.setPointerCapture(e.pointerId);
  gesture = gestureState();
  e.preventDefault();
});
canvas.addEventListener("pointermove", (e) => {
  if (!canvasPointers.has(e.pointerId)) return;
  canvasPointers.set(e.pointerId, localPoint(e));
  const next = gestureState();
  if (gesture && next && gesture.type === next.type) {
    if (aerial) {
      overviewFitted = false;
      transformMapGesture(pose, gesture, next, next.type === "pinch" ? gesture.distance / next.distance : 1, viewport(), mapLimits);
    } else rotatePose(pose, next.x - gesture.x, next.y - gesture.y);
    applyPose();
  }
  gesture = next;
  e.preventDefault();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(type, (e) => {
  canvasPointers.delete(e.pointerId);
  gesture = gestureState();
});
function mapZoom(scale, pixel) {
  if (!ready || !aerial) return;
  const view = viewport(), point = pixel ?? { x: view.width / 2, y: view.height / 2 };
  overviewFitted = false;
  transformMapGesture(pose, point, point, scale, view, mapLimits);
  applyPose();
  gesture = gestureState();
}
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (aerial) {
    const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
    mapZoom(Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * units * 15e-4))), localPoint(e));
  }
}, { passive: false });
if ($("zoom-in")) $("zoom-in").onclick = () => mapZoom(1 / 1.35);
if ($("zoom-out")) $("zoom-out").onclick = () => mapZoom(1.35);
var stickMove = (e) => {
  if (stick !== e.pointerId) return;
  const r = $("stick").getBoundingClientRect(), v = stickVector(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, r.width * 0.31);
  touch.x = v.x;
  touch.z = v.z;
  $("knob").style.transform = `translate(${v.px}px,${v.py}px)`;
};
$("stick").addEventListener("pointerdown", (e) => {
  if (!ready || stick !== null) return;
  stick = e.pointerId;
  $("stick").setPointerCapture(e.pointerId);
  stickMove(e);
  e.preventDefault();
});
$("stick").addEventListener("pointermove", stickMove);
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) $("stick").addEventListener(type, (e) => {
  if (stick === e.pointerId) {
    stick = null;
    touch.x = touch.z = 0;
    $("knob").style.transform = "translate(0,0)";
  }
});
for (const [id, value] of [["up", 1], ["down", -1]]) {
  const button = $(id), release = (e) => {
    heldVertical.delete(e.pointerId);
    touch.y = [...heldVertical.values()].reduce((a, b) => a + b, 0);
  };
  button.addEventListener("pointerdown", (e) => {
    if (!ready) return;
    button.setPointerCapture(e.pointerId);
    heldVertical.set(e.pointerId, value);
    touch.y = [...heldVertical.values()].reduce((a, b) => a + b, 0);
    e.preventDefault();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(event, release);
}
$("fast").onclick = () => {
  touch.fast = !touch.fast;
  $("fast").setAttribute("aria-pressed", String(touch.fast));
};
$("overview").onclick = overview;
$("street").onclick = street;
$("help-toggle").onclick = () => {
  $("help").hidden = !$("help").hidden;
  $("help-toggle").setAttribute("aria-expanded", String(!$("help").hidden));
};
$("retry").onclick = () => location.reload();
var codes = /* @__PURE__ */ new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"]);
addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    $("help").hidden = true;
    $("help-toggle").setAttribute("aria-expanded", "false");
    clearControls();
  }
  if (!ready || !codes.has(e.code) || e.altKey || e.ctrlKey || e.metaKey) return;
  keys.add(e.code);
  e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", clearControls);
addEventListener("resize", resize);
visualViewport?.addEventListener("resize", resize);
function fail(error) {
  if (failed) return;
  failed = true;
  ready = false;
  cancelAnimationFrame(frame);
  clearControls();
  entryFailed(error);
  $("loading").hidden = false;
  $("controls").hidden = true;
  $("overview").disabled = $("street").disabled = true;
  $("stage").textContent = "The map could not load. Check your connection and try again.";
  $("retry").hidden = false;
  window.__exploreErrors.push(String(error?.message ?? error));
}
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  fail(new Error("WebGL context lost"));
});
function tick(now) {
  if (!ready || document.hidden) return;
  const dt = Math.min(last ? (now - last) / 1e3 : 0, 0.05);
  last = now;
  input.x = touch.x + Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  input.z = touch.z + Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
  input.y = touch.y + Number(keys.has("KeyE")) - Number(keys.has("KeyQ"));
  input.fast = touch.fast || keys.has("ShiftLeft") || keys.has("ShiftRight");
  if (input.x || input.z || input.y) {
    if (aerial) {
      overviewFitted = false;
      stepPose(pose, input, dt, unbounded);
      clampMapPose(pose, viewport(), mapLimits);
      gesture = gestureState();
    } else stepPose(pose, input, dt, bounds);
  }
  floorElapsed += dt;
  if (!aerial && floorElapsed >= 0.1 && pose.y < 130) {
    floorElapsed = 0;
    const ground = world.ground(pose.x, pose.z), water = world.sea?.(pose.x, pose.z);
    const floor = Math.max(Number.isFinite(ground) ? ground : bounds.minY, Number.isFinite(water) ? water : bounds.minY);
    pose.y = Math.max(pose.y, floor + 1.7);
  }
  applyPose();
  updateIslandOverviewDepth(camera, pose.y > 120);
  world.setOverview(overviewLighting);
  world.update(dt, null);
  if (sun) {
    if (overviewLighting) focus.set((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2);
    else focus.set(pose.x + Math.sin(pose.yaw) * 18, 0, pose.z - Math.cos(pose.yaw) * 18);
    world.shadowAnchor?.update(focus, sun.shadow.camera);
  }
  renderer.render(scene, camera);
  frame = requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange", () => {
  clearControls();
  cancelAnimationFrame(frame);
  last = 0;
  if (!document.hidden && ready) frame = requestAnimationFrame(tick);
});
var stageLabels = ["Opening the map…","Downloading the island…","Preparing the ground and roads…","Preparing the park trees…","Preparing the neighbourhood…","Preparing the central plaza…","Preparing the docks…","Preparing the amusement park…","Preparing the garden…","Preparing the sports areas…","Preparing the stadium and coast…","Preparing the homes…","Preparing the pool…","Finishing the neighbourhood…","Preparing the scene…"];
var unsubscribe = subscribeEntry(() => {
  const state = entrySnapshot();
  $("progress").value = state.progress || 0;
  $("stage").textContent = stageLabels[state.step] ?? "Finishing up…";
  if (state.status === "error") fail(new Error(state.error));
});
beginEntry({ restart: true });
var stopWatch = watchEntry();
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  resize();
  const { createIslandRuntime } = await import("/67park-foundation-next/island/runtime.bundle.js?v=north-housing-8");
  world = await createIslandRuntime({ renderer, sahne: scene, kam: camera });
  if (failed || entrySnapshot().status === "error") throw Error(entrySnapshot().error || "The map could not load");
  box = new THREE.Box3().setFromObject(world.terrain);
  bounds.minX = box.min.x - 35;
  bounds.maxX = box.max.x + 35;
  bounds.minZ = box.min.z - 35;
  bounds.maxZ = box.max.z + 35;
  bounds.minY = Math.max(2, box.min.y + 1.7);
  Object.assign(mapLimits, { planeY: world.spawn[1] - 0.56, minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ });
  sun = scene.children.find((o) => o.isDirectionalLight && o.castShadow);
  camera.fov = 50;
  camera.near = 0.5;
  camera.far = 2400;
  camera.updateProjectionMatrix();
  street();
  world.setOverview(false);
  applyPose();
  await renderer.compileAsync(scene, camera);
  await warmIslandForEntry(renderer, scene, camera, { cancelled: () => failed });
  if (failed || entrySnapshot().status === "error") throw Error(entrySnapshot().error || "Renderer unavailable");
  renderer.render(scene, camera);
  ready = true;
  entryReady();
  stopWatch();
  unsubscribe();
  $("loading").hidden = true;
  $("controls").hidden = false;
  $("overview").disabled = $("street").disabled = false;
  document.body.dataset.ready = "true";
  if (new URLSearchParams(location.search).get("view") === "overview") overview();
  frame = requestAnimationFrame(tick);
} catch (error) {
  stopWatch();
  unsubscribe();
  fail(error);
}
