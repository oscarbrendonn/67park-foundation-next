import * as THREE from 'three';
import {PUNCH_SECONDS,PUNCH_COOLDOWN_SECONDS,PUNCH_IMPACT_SECONDS} from './character-punch.js?v=character-punch-1';

// Original poses built on the existing rig; no third-party animation assets.
export function addPreviewActionClips(clips) {
  const idle = clips.find(c => c.name === 'idle');
  function poseClip(name, duration, poses) {
    const times = [0, duration * .22, duration * .42, duration * .68, duration];
    const tracks = idle.tracks.map(track => {
      const size = track.getValueSize();
      const values = [];
      const bone = track.name.split('.')[0];
      for (let frame = 0; frame < times.length; frame++) {
        const value = Array.from(track.values.slice(0, size));
        if (track.name.endsWith('.quaternion') && poses[bone]) {
          const angles = poses[bone][frame];
          const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles));
          new THREE.Quaternion().fromArray(value).multiply(rotation).normalize().toArray(value);
        }
        values.push(...value);
      }
      const result = track.clone();
      result.times = new Float32Array(times);
      result.values = new Float32Array(values);
      result.setInterpolation(THREE.InterpolateLinear);
      return result;
    });
    return new THREE.AnimationClip(name, duration, tracks);
  }
  const zero = [0, 0, 0];
  const sequence = (a, b, c) => [zero, a, b, c, zero];
  const punch = poseClip('previewPunch', .46, {
    Spine2: sequence([0,-.14,0], [.08,.22,0], [.03,.1,0]),
    BiscepR: sequence([-.25,0,.12], [-1.1,.12,.2], [-.6,0,.12]),
    ArmR: sequence([.8,0,0], [.08,0,0], [.4,0,0]),
    BiscepL: sequence([-.15,0,-.1], [-.3,0,-.1], [-.15,0,0]),
    ArmL: sequence([.4,0,0], [.55,0,0], [.3,0,0]),
  });
  punch.tracks = punch.tracks.filter(t => /^(Spine[123]|Head|Biscep[LR]|Arm[LR]|Hand[LR])\.quaternion$/.test(t.name));
  const landing = poseClip('land', .32, {
    Spine1: sequence([.16,0,0], [.1,0,0], [.035,0,0]),
    ThighL: sequence([-.24,0,0], [-.16,0,0], [-.04,0,0]),
    ThighR: sequence([-.24,0,0], [-.16,0,0], [-.04,0,0]),
    ShinL: sequence([.38,0,0], [.24,0,0], [.06,0,0]),
    ShinR: sequence([.38,0,0], [.24,0,0], [.06,0,0]),
  });
  return [...clips.map(c => c.name === 'land' ? landing : c), punch];
}

let button, active = false, queued = false, cooldown = 0, elapsed = 0;
function visibleMenu() {
  return Array.from(document.querySelectorAll('.wardrobe,[role="dialog"]')).some(node =>
    !node.hidden && node.getAttribute('aria-hidden') !== 'true' && node.getClientRects().length > 0);
}
function request(event) {
  if (event?.type === 'pointerdown' && event.button !== 0) return;
  event?.preventDefault();
  event?.stopPropagation();
  // Consume rejected taps too: they must not focus the button or reach world controls.
  if (event?.type === 'click' && event.detail > 0) return;
  if (!active || queued || cooldown > 0 || visibleMenu()) return;
  queued = true;
}
function install() {
  if (button || typeof document === 'undefined') return;
  button = document.createElement('button');
  button.id = 'preview-hit';
  button.type = 'button';
  button.textContent = 'Punch · F';
  button.setAttribute('aria-label', 'Punch (F)');
  button.title = 'Punch nearby bots — online player damage is disabled';
  button.style.cssText = 'position:fixed;right:20px;bottom:calc(280px + env(safe-area-inset-bottom));z-index:50;padding:14px 18px;border:2px solid #fff9;border-radius:20px;background:#f4c7d4;color:#493e45;box-shadow:0 4px 0 #b596a2;font:600 14px system-ui;touch-action:manipulation;';
  button.addEventListener('click', request);
  button.addEventListener('pointerdown', request);
  // Capture F before the legacy movement listener can queue a sit command.
  window.addEventListener('keydown', event => {
    if (event.code !== 'KeyF' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]') || visibleMenu()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) request(event);
  }, {capture:true});
  const cancel = () => { queued = false; active = false; elapsed = 0; cooldown = 0; button.hidden = true; };
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  new MutationObserver(records => {
    if (records.some(record => Array.from(record.addedNodes).some(node =>
      node.nodeType === 1 && (node.matches('.wardrobe,[role="dialog"]') || node.querySelector('.wardrobe,[role="dialog"]'))))) { if (visibleMenu()) cancel(); }
  }).observe(document.getElementById('root'), {childList:true,subtree:true});
  document.body.append(button);
}
export function updatePreviewHit(state, dt, allowed) {
  install();
  state.punchImpact=false;
  dt = Number.isFinite(dt) ? Math.max(0,Math.min(dt,.05)) : 0;
  active = Boolean(allowed && state.enabled && state.grounded && !document.hidden);
  if (button) button.hidden = !active;
  cooldown = Math.max(0, cooldown - dt);
  if (!active || state.jumped) { queued = false; elapsed = 0; }
  if (queued) { elapsed = PUNCH_SECONDS; cooldown = PUNCH_COOLDOWN_SECONDS; queued = false; }
  state.punchT = elapsed;
  const nextElapsed = Math.max(0, elapsed - dt);
  const contactRemaining = PUNCH_SECONDS - PUNCH_IMPACT_SECONDS;
  state.punchImpact = elapsed > contactRemaining && nextElapsed <= contactRemaining;
  elapsed = nextElapsed;
  if (button) { button.setAttribute('aria-disabled', String(cooldown > 0)); button.dataset.active = String(elapsed > 0); }
}
