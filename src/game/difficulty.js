import { CONFIG } from './constants.js';

const lerp = ([a, b], t) => a + (b - a) * t;

export function getDifficulty(score, cfg = CONFIG) {
  const d = cfg.difficulty;
  const t = Math.min(1, Math.max(0, score / d.rampScore));
  return { t, speed: lerp(d.speed, t), gap: lerp(d.gap, t), spacing: lerp(d.spacing, t) };
}
