import { CONFIG } from './constants.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createBird(cfg = CONFIG) {
  return { x: cfg.bird.x, y: (cfg.height - cfg.groundHeight) / 2, vy: 0, rotation: 0 };
}

export function applyFlap(bird, cfg = CONFIG) {
  bird.vy = cfg.physics.flapVelocity;
}

/** Semi-implicit Euler step. Mutates and returns the bird. */
export function stepBird(bird, dt, cfg = CONFIG) {
  const p = cfg.physics;
  bird.vy = clamp(bird.vy + p.gravity * dt, p.maxRiseSpeed, p.maxFallSpeed);
  bird.y += bird.vy * dt;
  bird.rotation = clamp(bird.vy / 500, -0.45, 1.2);
  return bird;
}
