// Keep the approved pond appearance readable across the swimmable island water.
// The authored pond mesh supplies its boundary; the ocean keeps its land mask.
function readableRipples(fragment) {
  return fragment
    .replace('vec3(-.035*ca+.021*cb,1.,-.014*ca-.030*cb)',
      'vec3(-.18*ca+.11*cb,1.,-.07*ca-.15*cb)')
    .replace('(light-.745)*.55*detail','(light-.745)*.85*detail')
    .replace('sheen*.065*detail','sheen*.20*detail');
}

// The controller's capsule floats 0.58 m above the local surface. Apply the
// approved pond's 0.47 m visual immersion at the actual sea/pond/pool level.
// This runs after the normal visual pose is rebuilt, leaving physics untouched.
export function immerseSwimmingVisual(world, root, p) {
  if (!root || root.rotation.x < .5 || !p || world.homeScene?.active) return;
  if (Math.hypot(root.position.x-p.x,root.position.z-p.z) > .1) return;
  if (!world.water(p.x,p.z)) return;
  const level=world.sea(p.x,p.z);
  if (!Number.isFinite(level) || Math.abs(p.y-level-.58) > .10) return;
  if (root.position.y > level+.30) root.position.y-=.47;
}

export function applyParkWaterSurface(world) {
  // This legacy GLB cap is not a pond: the authored S-bowl below is for skating.
  // Keep its source identity for collision/asset compatibility, never render it.
  const hiddenCaps=[];
  world.terrain?.traverse(node=>{
    if(node.isMesh && /^9_GOLET_MINI(?:$|[._-])/i.test(node.name)) {
      node.visible=false; hiddenCaps.push(node.name);
    }
  });
  if (world.parkWaterSurface) return world.parkWaterSurface;
  const ocean = world.scene?.getObjectByName('KIMI_WATERBODY_GORUNUR');
  const pond = world.terrain?.getObjectByName('67D_PARK_WATER_UNIFIED_V65');
  if (!ocean?.material?.isShaderMaterial || !pond?.isMesh) return null;
  const source = ocean.material;
  const mask = /if\(all\(greaterThanEqual\(uv,vec2\(0\.\)\)\)&&all\(lessThanEqual\(uv,vec2\(1\.\)\)\)&&texture2D\(uLand,uv\)\.r>\.5\)discard;/;
  if (!mask.test(source.fragmentShader)) throw Error('Park water: coast shader mask changed');
  if (!source.vertexShader.includes('p.z+=')) throw Error('Park water: coast wave adapter changed');
  const original = pond.material;
  const originalCoastFragment = source.fragmentShader;
  const material = source.clone();
  material.name = '67P_PARK_WATER_COAST_SURFACE';
  // Share the existing clock/player uniforms. No extra loop, texture or audio/physics changes.
  material.uniforms = {...source.uniforms};
  material.fragmentShader = source.fragmentShader.replace(mask, '');
  // Use the already approved pond ripple contrast on the coast too. The
  // distance fade, palette, land mask, wake radius and wave clock stay intact.
  material.fragmentShader = readableRipples(material.fragmentShader);
  source.fragmentShader = readableRipples(originalCoastFragment);
  source.needsUpdate = true;
  material.uniforms.uAmp={value:.025};
  // Ocean geometry is an XY plane rotated into the ground; the pond is already
  // in XYZ world space. Adapt only the displacement axis, retaining its waves.
  material.vertexShader = source.vertexShader.replace('p.z+=','p.y+=');
  material.visible=true;
  material.colorWrite=true;
  material.needsUpdate = true;
  pond.material = material;
  const report = {version:'park-water-5-all-swim',mesh:pond.name,source:ocean.name,hiddenSkateCaps:hiddenCaps,
    sharedWaveTiming:true,sharedSwimmerWake:true,geometryUnchanged:true,extraDrawCalls:0,
    immersion:'all-swimmable-island-water',surfaceLevel:'world.sea',coastRipples:'approved-pond'};
  world.parkWaterSurface = report;
  world.parkSwimVisual = root => {
    const p=globalThis.window?.__eggyInput?.playerRef?.body?.translation?.();
    immerseSwimmingVisual(world,root,p);
  };
  world.renderer.domElement.dataset.parkWaterSurface = JSON.stringify(report);
  const dispose = world.dispose?.bind(world);
  if (dispose) world.dispose = () => {
    pond.material = original; material.dispose();
    source.fragmentShader=originalCoastFragment;source.needsUpdate=true;
    delete world.parkWaterSurface; delete world.parkSwimVisual; dispose();
  };
  return report;
}
