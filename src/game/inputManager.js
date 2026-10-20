const FLAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const INTERACTIVE = 'button,input,select,textarea,a,[role="dialog"]';

/** Attaches keyboard + pointer controls. Returns a detach function. */
export function attachInput(canvas, handlers, win = window) {
  const onKey = (e) => {
    if (e.repeat) return;
    const inUi = e.target instanceof Element && e.target.closest(INTERACTIVE);
    if (FLAP_KEYS.has(e.code)) {
      if (inUi) return; // let focused buttons keep their native Space/Enter behaviour
      e.preventDefault();
      handlers.flap();
    } else if (e.code === 'KeyP') {
      if (!inUi) handlers.togglePause();
    } else if (e.code === 'Escape') {
      handlers.pause();
    }
  };
  const onPointer = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    handlers.flap();
  };
  const onMenu = (e) => e.preventDefault();

  win.addEventListener('keydown', onKey);
  canvas?.addEventListener('pointerdown', onPointer);
  canvas?.addEventListener('contextmenu', onMenu);
  return () => {
    win.removeEventListener('keydown', onKey);
    canvas?.removeEventListener('pointerdown', onPointer);
    canvas?.removeEventListener('contextmenu', onMenu);
  };
}
