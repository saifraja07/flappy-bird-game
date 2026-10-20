import { CONFIG } from './constants.js';

export const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Hitbox is independent from the sprite size (see CONFIG.bird.hitbox). */
export function birdHitbox(bird, cfg = CONFIG) {
  const { width: w, height: h } = cfg.bird.hitbox;
  return { x: bird.x - w / 2, y: bird.y - h / 2, w, h };
}

export function pipeRects(pipe, cfg = CONFIG) {
  const groundY = cfg.height - cfg.groundHeight;
  const topH = pipe.gapY - pipe.gap / 2;
  const bottomY = pipe.gapY + pipe.gap / 2;
  const w = cfg.pipe.width;
  return [
    { x: pipe.x, y: 0, w, h: topH },
    { x: pipe.x, y: bottomY, w, h: groundY - bottomY },
  ];
}

export const hitsPipe = (bird, pipe, cfg = CONFIG) => {
  const box = birdHitbox(bird, cfg);
  return pipeRects(pipe, cfg).some((r) => rectsOverlap(box, r));
};

/** Returns 'ground', 'ceiling' or null. */
export function hitsBounds(bird, cfg = CONFIG) {
  const box = birdHitbox(bird, cfg);
  if (box.y + box.h >= cfg.height - cfg.groundHeight) return 'ground';
  if (box.y <= 0) return 'ceiling';
  return null;
}
