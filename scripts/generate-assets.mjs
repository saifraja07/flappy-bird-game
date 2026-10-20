// Generates the pixel-art PNGs in public/assets/images from src/assets/spriteData.js (no dependencies).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PALETTE, SPRITES } from '../src/assets/spriteData.js';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function png(frames, scale) {
  const fw = frames[0][0].length * scale;
  const h = frames[0].length * scale;
  const w = fw * frames.length;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const f = Math.floor(x / fw);
      const ch = frames[f][Math.floor(y / scale)][Math.floor((x % fw) / scale)];
      const o = y * (w * 4 + 1) + 1 + x * 4;
      if (PALETTE[ch]) raw.set([...hex(PALETTE[ch]), 255], o);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const files = { bird: 'bird.png', pipeBody: 'pipe-body.png', pipeCap: 'pipe-cap.png', ground: 'ground.png' };
mkdirSync('public/assets/images', { recursive: true });
for (const [key, name] of Object.entries(files)) {
  writeFileSync(`public/assets/images/${name}`, png(SPRITES[key].frames, SPRITES[key].scale));
  console.log('wrote', name);
}
