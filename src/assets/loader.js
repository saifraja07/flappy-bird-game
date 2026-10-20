import { ASSET_MANIFEST } from './assetManifest.js';
import { spriteToCanvas, buildScenery } from './sprites.js';

const KEY_TO_SPRITE = { birdSheet: 'bird', pipeBody: 'pipeBody', pipeCap: 'pipeCap', ground: 'ground' };

function loadImage(src, createImage, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(v);
      }
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      const img = createImage();
      img.onload = () => finish(img.naturalWidth === 0 ? null : img);
      img.onerror = () => finish(null);
      img.src = src;
    } catch {
      finish(null);
    }
  });
}

/**
 * Preloads every manifest image. A failed image never rejects: it is replaced by the built-in pixel-data
 * sprite so the game stays playable. Resolves { assets, failed }.
 */
export async function loadAssets({
  manifest = ASSET_MANIFEST,
  baseUrl = import.meta.env?.BASE_URL ?? './',
  createImage = () => new Image(),
  fallback = spriteToCanvas,
  scenery = buildScenery,
  timeoutMs = 5000,
} = {}) {
  const entries = Object.entries(manifest);
  const loaded = await Promise.all(entries.map(([, path]) => loadImage(baseUrl + path, createImage, timeoutMs)));
  const assets = {};
  const failed = [];
  entries.forEach(([key], i) => {
    if (loaded[i]) {
      assets[key] = loaded[i];
      return;
    }
    failed.push(key);
    try {
      assets[key] = fallback(KEY_TO_SPRITE[key] ?? key);
    } catch {
      assets[key] = null; // renderer draws flat shapes for missing sprites
    }
  });
  try {
    Object.assign(assets, scenery());
  } catch {
    failed.push('scenery');
  }
  return { assets, failed };
}
