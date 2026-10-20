import { describe, it, expect } from 'vitest';
import { CONFIG, STATES } from '../constants.js';
import { createBird, applyFlap, stepBird } from '../physics.js';
import { rectsOverlap, hitsBounds, hitsPipe, birdHitbox } from '../collision.js';
import { ObstacleManager } from '../obstacleManager.js';
import { getDifficulty } from '../difficulty.js';
import { nextState } from '../GameState.js';
import { ScoreManager } from '../scoreManager.js';
import { createStorage } from '../storage.js';
import { loadSettings } from '../settings.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('physics', () => {
  it('gravity accelerates the bird downward', () => {
    const b = createBird();
    stepBird(b, 0.1);
    expect(b.vy).toBeCloseTo(CONFIG.physics.gravity * 0.1);
    expect(b.y).toBeGreaterThan(createBird().y);
  });
  it('flap sets an upward impulse', () => {
    const b = createBird();
    b.vy = 300;
    applyFlap(b);
    expect(b.vy).toBe(CONFIG.physics.flapVelocity);
  });
  it('fall speed is capped', () => {
    const b = createBird();
    for (let i = 0; i < 200; i++) stepBird(b, 0.05);
    expect(b.vy).toBe(CONFIG.physics.maxFallSpeed);
  });
  it('is delta-time based: two half steps ≈ one full step', () => {
    const a = createBird();
    const c = createBird();
    applyFlap(a);
    applyFlap(c);
    stepBird(a, 0.032);
    stepBird(c, 0.016);
    stepBird(c, 0.016);
    expect(Math.abs(a.y - c.y)).toBeLessThan(0.6);
  });
});

describe('collision', () => {
  it('rect overlap boundaries are exclusive', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(rectsOverlap(a, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
    expect(rectsOverlap(a, { x: 9.9, y: 0, w: 5, h: 5 })).toBe(true);
  });
  it('detects ground and ceiling', () => {
    const b = createBird();
    expect(hitsBounds(b)).toBeNull();
    b.y = CONFIG.height - CONFIG.groundHeight - CONFIG.bird.hitbox.height / 2;
    expect(hitsBounds(b)).toBe('ground');
    b.y = CONFIG.bird.hitbox.height / 2 - 1;
    expect(hitsBounds(b)).toBe('ceiling');
  });
  it('hits pipes outside the gap, passes inside it', () => {
    const pipe = { x: 70, gapY: 200, gap: 120, scored: false };
    const b = createBird();
    b.y = 200;
    expect(hitsPipe(b, pipe)).toBe(false);
    b.y = 130;
    expect(hitsPipe(b, pipe)).toBe(true);
    b.y = 270;
    expect(hitsPipe(b, pipe)).toBe(true);
  });
  it('hitbox is independent of sprite size', () => {
    const hb = birdHitbox(createBird());
    expect(hb.w).toBe(CONFIG.bird.hitbox.width);
    expect(hb.w).toBeLessThan(CONFIG.bird.width);
  });
});

describe('obstacles & difficulty', () => {
  it('never spawns impossible gaps or gaps overlapping the ground', () => {
    const om = new ObstacleManager(CONFIG, seeded(7));
    const playH = CONFIG.height - CONFIG.groundHeight;
    let prev = null;
    for (let score = 0; score <= 60; score++) {
      for (let i = 0; i < 60; i++) {
        const { gap } = getDifficulty(score);
        const p = om.spawn(400, gap);
        expect(p.gapY - gap / 2).toBeGreaterThanOrEqual(CONFIG.pipe.minEdge - 1e-9);
        expect(p.gapY + gap / 2).toBeLessThanOrEqual(playH - CONFIG.pipe.minEdge + 1e-9);
        if (prev !== null) expect(Math.abs(p.gapY - prev)).toBeLessThanOrEqual(CONFIG.pipe.maxGapShift + 1e-9);
        prev = p.gapY;
      }
    }
  });
  it('spawns with spacing, moves left and cleans up offscreen pipes', () => {
    const om = new ObstacleManager(CONFIG, seeded(3));
    const d = getDifficulty(0);
    for (let i = 0; i < 1200; i++) om.update(1 / 60, d);
    expect(om.pipes.length).toBeGreaterThan(0);
    expect(om.pipes.length).toBeLessThan(6);
    expect(om.pipes.every((p) => p.x > -CONFIG.pipe.width - 10)).toBe(true);
  });
  it('difficulty ramps up and is clamped', () => {
    const a = getDifficulty(0);
    const b = getDifficulty(20);
    const c = getDifficulty(1000);
    expect(b.speed).toBeGreaterThan(a.speed);
    expect(b.gap).toBeLessThan(a.gap);
    expect(c.speed).toBe(CONFIG.difficulty.speed[1]);
    expect(c.gap).toBe(CONFIG.difficulty.gap[1]);
  });
});

describe('state machine', () => {
  it('follows valid transitions and ignores invalid ones', () => {
    expect(nextState(STATES.READY, 'start')).toBe(STATES.PLAYING);
    expect(nextState(STATES.PLAYING, 'pause')).toBe(STATES.PAUSED);
    expect(nextState(STATES.PAUSED, 'resume')).toBe(STATES.PLAYING);
    expect(nextState(STATES.PLAYING, 'die')).toBe(STATES.GAME_OVER);
    expect(nextState(STATES.GAME_OVER, 'restart')).toBe(STATES.READY);
    expect(nextState(STATES.READY, 'die')).toBe(STATES.READY);
    expect(nextState(STATES.GAME_OVER, 'resume')).toBe(STATES.GAME_OVER);
  });
});

describe('storage & best score', () => {
  const memory = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  };
  it('persists a new best and reloads it', () => {
    const backing = memory();
    const s1 = new ScoreManager(createStorage(() => backing), 'b');
    s1.score = 7;
    expect(s1.commit()).toEqual({ score: 7, best: 7, isNewBest: true });
    const s2 = new ScoreManager(createStorage(() => backing), 'b');
    expect(s2.best).toBe(7);
    s2.score = 3;
    expect(s2.commit().isNewBest).toBe(false);
  });
  it('survives throwing / unavailable storage', () => {
    const throwing = createStorage(() => {
      throw new Error('blocked');
    });
    expect(throwing.get('x')).toBeNull();
    expect(throwing.set('x', 1)).toBe(false);
    const s = new ScoreManager(throwing, 'b');
    s.score = 4;
    expect(() => s.commit()).not.toThrow();
    expect(new ScoreManager(createStorage(() => null), 'b').best).toBe(0);
  });
  it('ignores corrupt saved values and settings', () => {
    const bad = { getItem: () => 'not-a-number', setItem() {} };
    expect(new ScoreManager(createStorage(() => bad), 'b').best).toBe(0);
    expect(loadSettings(createStorage(() => ({ getItem: () => '{oops', setItem() {} })), true).reduceEffects).toBe(true);
  });
});
