import { CONFIG } from '../game/constants.js';
import { PALETTE, SPRITES } from './spriteData.js';

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Renders a sprite (frames side by side) from the built-in pixel data. */
export function spriteToCanvas(key) {
  const { frames, scale } = SPRITES[key];
  const fw = frames[0][0].length;
  const h = frames[0].length;
  const c = makeCanvas(fw * frames.length * scale, h * scale);
  const ctx = c.getContext('2d');
  frames.forEach((rows, f) =>
    rows.forEach((line, y) =>
      [...line].forEach((ch, x) => {
        if (!PALETTE[ch]) return;
        ctx.fillStyle = PALETTE[ch];
        ctx.fillRect((f * fw + x) * scale, y * scale, scale, scale);
      }),
    ),
  );
  return c;
}

/** Procedural parallax scenery (sky bands, seamless hills, clouds). Always built in code, never fails the game. */
export function buildScenery(cfg = CONFIG) {
  const W = cfg.width;
  const H = cfg.height - cfg.groundHeight;
  const sky = makeCanvas(W, H);
  const s = sky.getContext('2d');
  const bands = ['#2b2d5b', '#3a3f86', '#4b5fb0', '#5f86d4', '#7fb2ec', '#a8d8f5', '#d4efff', '#fff1c9'];
  bands.forEach((c, i) => {
    s.fillStyle = c;
    s.fillRect(0, Math.floor((H / bands.length) * i), W, Math.ceil(H / bands.length));
  });

  const hills = makeCanvas(W, 140);
  const h = hills.getContext('2d');
  const layer = (color, base, amp, k, phase) => {
    h.fillStyle = color;
    for (let x = 0; x < W; x += 4) {
      const top = Math.round((base + amp * Math.sin(((x / W) * Math.PI * 2 * k) + phase)) / 4) * 4;
      h.fillRect(x, top, 4, 140 - top);
    }
  };
  layer('#3d7f9e', 60, 22, 2, 0.5);
  layer('#4aa56b', 92, 16, 3, 2);

  const clouds = makeCanvas(W, 180);
  const c = clouds.getContext('2d');
  c.fillStyle = 'rgba(255,255,255,0.9)';
  [[40, 30, 56], [160, 70, 72], [90, 130, 48], [220, 20, 40]].forEach(([x, y, w]) => {
    c.fillRect(x, y + 8, w, 12);
    c.fillRect(x + 8, y, w - 20, 8);
    c.fillRect(x + 4, y + 20, w - 8, 4);
  });
  return { sky, hills, clouds };
}
