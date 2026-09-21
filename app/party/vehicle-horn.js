const COOLDOWN_MS = 800;

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
 * A deliberately edge-triggered vehicle horn.  Audio and network ownership stay
 * with the supplied adapters, so this module never creates its own audio graph
 * or background scheduler.
 */
export function createVehicleHorn({
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
  driver = () => false,
  blocked = () => false,
  play = () => {},
  send = () => {},
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  let disposed = false;
  let button = null;
  let suppressClick = false;
  let suppressPointerId = null;
  let lastAt = -Infinity;
  const counts = {presses: 0, emitted: 0, rejected: 0};

  const eligible = () => !disposed && !safe(() => documentRef?.hidden, true) &&
    safe(driver) === true && safe(blocked) !== true;

  const removeButton = () => {
    if (!button) return;
    safe(() => button.remove());
    button = null;
    suppressClick = false;
    suppressPointerId = null;
  };

  const press = () => {
    counts.presses++;
    if (!eligible()) { counts.rejected++; return false; }
    const at = Number(safe(now, NaN));
    if (!Number.isFinite(at) || at - lastAt < COOLDOWN_MS) { counts.rejected++; return false; }
    lastAt = at;
    counts.emitted++;
    // Keep the local, muted-aware SFX path and the replication path independent.
    safe(play);
    safe(send);
    return true;
  };

  const onKeyDown = event => {
    if (event?.code !== 'KeyH' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || editableTarget(event.target)) return;
    if (press()) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  };
  const onPointerDown = event => {
    if (event?.pointerType === 'mouse' && event.button !== 0) return;
    suppressClick = press();
    if (suppressClick) {
      suppressPointerId = event?.pointerId ?? null;
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  };
  const onPointerCancel = event => {
    if (event?.pointerId !== suppressPointerId) return;
    suppressClick = false;
    suppressPointerId = null;
  };
  const onClick = event => {
    // detail === 0 is the native keyboard/accessibility click, never a pointer echo.
    if (suppressClick && event?.detail !== 0) { suppressClick = false; suppressPointerId = null; return; }
    suppressClick = false;
    suppressPointerId = null;
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
    button.setAttribute?.('title', 'Horn (H)');
    // The class/id are intentionally stable for the application stylesheet.
    Object.assign(button.style || {}, {
      position: 'fixed', left: '50%', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      transform: 'translateX(-50%)', zIndex: '20',
    });
    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('pointercancel', onPointerCancel);
    button.addEventListener('click', onClick);
    documentRef.body.appendChild(button);
  };

  const step = () => {
    if (eligible()) addButton(); else removeButton();
    return !!button;
  };

  const stats = () => ({...counts, eligible: eligible(), mounted: !!button, cooldownMs: COOLDOWN_MS});

  windowRef?.addEventListener?.('keydown', onKeyDown);
  step();

  return {
    press,
    step,
    dispose() {
      if (disposed) return;
      disposed = true;
      windowRef?.removeEventListener?.('keydown', onKeyDown);
      if (button) {
        button.removeEventListener?.('pointerdown', onPointerDown);
        button.removeEventListener?.('pointercancel', onPointerCancel);
        button.removeEventListener?.('click', onClick);
      }
      removeButton();
    },
    stats,
  };
}
