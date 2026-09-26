const COOLDOWN_MS = 120;

function safe(call, fallback = false) {
  try { return call(); } catch { return fallback; }
}

function editableTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || target.nodeName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return true;
  if (safe(() => target.getAttribute?.('role') === 'textbox') || target.role === 'textbox') return true;
  return !!safe(() => target.closest?.('input,textarea,select,[contenteditable],[role="textbox"]'));
}

/**
 * Hold-to-sound local driver control. Multiple input owners share one voice;
 * no repeating timers, audio graph or new network messages live in this module.
 */
export function createVehicleHorn({
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
  driver = () => false,
  blocked = () => false,
  play = () => {},
  start = play,
  stop = () => {},
  send = () => {},
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  let disposed = false;
  let button = null;
  let suppressClick = false;
  const held = new Set();
  let lastAt = -Infinity;
  const counts = {presses: 0, emitted: 0, rejected: 0};

  const eligible = () => !disposed && !safe(() => documentRef?.hidden, true) &&
    safe(driver) === true && safe(blocked) !== true;

  const reflect = () => button?.setAttribute?.('aria-pressed', String(held.size > 0));
  const release = owner => {
    if (!held.delete(owner)) return;
    if (!held.size) safe(stop);
    reflect();
  };
  const releaseAll = () => {
    held.clear(); safe(stop); reflect();
  };

  const removeButton = () => {
    if (!button) return;
    safe(() => button.remove());
    button = null;
    suppressClick = false;
  };

  const accept = () => {
    counts.presses++;
    if (!eligible()) { counts.rejected++; return false; }
    const at = Number(safe(now, NaN));
    if (!Number.isFinite(at) || at - lastAt < COOLDOWN_MS) { counts.rejected++; return false; }
    lastAt = at;
    counts.emitted++;
    safe(send);
    return true;
  };
  // Native assistive clicks and legacy callers get a finite short beep.
  const press = () => {
    if (held.size || !accept()) return false;
    safe(play); return true;
  };
  const hold = owner => {
    if (held.has(owner) || !eligible()) return false;
    if (!held.size && !accept()) return false;
    const wasHeld = held.size > 0; held.add(owner);
    if (!wasHeld) safe(start);
    reflect(); return true;
  };

  const onKeyDown = event => {
    const native = event?.target === button && ['Space','Enter','NumpadEnter'].includes(event.code);
    if ((!native && event?.code !== 'KeyH') || event.ctrlKey || event.metaKey || event.altKey || editableTarget(event.target)) return;
    const owner = 'key:' + event.code;
    if (held.has(owner) || (!event.repeat && hold(owner))) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  };
  const onKeyUp = event => {
    const owner = 'key:' + event?.code;
    if (!held.has(owner)) return;
    release(owner); event.preventDefault?.(); event.stopPropagation?.();
  };
  const onPointerDown = event => {
    if (event?.pointerType === 'mouse' && event.button !== 0) return;
    suppressClick = true;
    if (hold('pointer:' + event.pointerId)) {
      safe(() => button?.setPointerCapture?.(event.pointerId));
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  };
  const onPointerEnd = event => {
    release('pointer:' + event?.pointerId);
    if (event?.type === 'pointercancel') suppressClick = false;
  };
  const onClick = event => {
    // detail === 0 is the native keyboard/accessibility click, never a pointer echo.
    if (suppressClick && event?.detail !== 0) { suppressClick = false; return; }
    suppressClick = false;
    press();
  };

  const addButton = () => {
    if (button || !documentRef?.createElement || !documentRef?.body) return;
    button = documentRef.createElement('button');
    button.id = 'vehicle-horn-button';
    button.className = 'vehicle-horn-control';
    button.type = 'button';
    button.textContent = 'Horn';
    button.setAttribute?.('aria-label', 'Sound vehicle horn');
    button.setAttribute?.('title', 'Horn (hold H)');
    button.setAttribute?.('aria-pressed', 'false');
    // The class/id are intentionally stable for the application stylesheet.
    Object.assign(button.style || {}, {
      position: 'fixed', left: '50%', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      transform: 'translateX(-50%)', zIndex: '20',
    });
    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('pointerup', onPointerEnd);
    button.addEventListener('pointercancel', onPointerEnd);
    button.addEventListener('lostpointercapture', onPointerEnd);
    button.addEventListener('click', onClick);
    documentRef.body.appendChild(button);
  };

  const step = () => {
    if (eligible()) addButton(); else { releaseAll(); removeButton(); }
    return !!button;
  };

  const stats = () => ({...counts, eligible: eligible(), mounted: !!button, held: held.size > 0, cooldownMs: COOLDOWN_MS});
  const onVisibility = () => { if (documentRef?.hidden) releaseAll(); };
  const onFocus = event => { if (editableTarget(event.target) || safe(blocked)) releaseAll(); };

  windowRef?.addEventListener?.('keydown', onKeyDown);
  windowRef?.addEventListener?.('keyup', onKeyUp);
  windowRef?.addEventListener?.('pointerup', onPointerEnd);
  windowRef?.addEventListener?.('pointercancel', onPointerEnd);
  windowRef?.addEventListener?.('blur', releaseAll);
  windowRef?.addEventListener?.('pagehide', releaseAll);
  documentRef?.addEventListener?.('visibilitychange', onVisibility);
  documentRef?.addEventListener?.('focusin', onFocus);
  step();

  return {
    press,
    release: releaseAll,
    step,
    dispose() {
      if (disposed) return;
      disposed = true;
      releaseAll();
      windowRef?.removeEventListener?.('keydown', onKeyDown);
      windowRef?.removeEventListener?.('keyup', onKeyUp);
      windowRef?.removeEventListener?.('pointerup', onPointerEnd);
      windowRef?.removeEventListener?.('pointercancel', onPointerEnd);
      windowRef?.removeEventListener?.('blur', releaseAll);
      windowRef?.removeEventListener?.('pagehide', releaseAll);
      documentRef?.removeEventListener?.('visibilitychange', onVisibility);
      documentRef?.removeEventListener?.('focusin', onFocus);
      if (button) {
        button.removeEventListener?.('pointerdown', onPointerDown);
        button.removeEventListener?.('pointerup', onPointerEnd);
        button.removeEventListener?.('pointercancel', onPointerEnd);
        button.removeEventListener?.('lostpointercapture', onPointerEnd);
        button.removeEventListener?.('click', onClick);
      }
      removeButton();
    },
    stats,
  };
}
