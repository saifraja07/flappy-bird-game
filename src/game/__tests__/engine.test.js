import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { CONFIG, STATES } from '../constants.js';
import { createStorage } from '../storage.js';
import { loadAssets } from '../../assets/loader.js';
import { AudioManager } from '../../audio/AudioManager.js';

const memStorage = () => {
  const m = new Map();
  return createStorage(() => ({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }));
};
const make = (extra = {}) => new GameEngine({ storage: memStorage(), rng: () => 0.5, ...extra });
const step = (e, frames, dt = 1 / 60, hold = false) => {
  for (let i = 0; i < frames; i++) {
    if (hold) {
      e.bird.y = hold.y;
      e.bird.vy = 0;
    }
    e.update(dt);
  }
};

describe('GameEngine', () => {
  it('goes ready -> playing on first input and flaps', () => {
    const e = make();
    const states = [];
    e.cb.onStateChange = (s) => states.push(s);
    e.input();
    expect(e.state).toBe(STATES.PLAYING);
    expect(e.bird.vy).toBe(CONFIG.physics.flapVelocity);
    e.input();
    expect(states).toEqual([STATES.PLAYING]);
  });

  it('pause freezes the world and resume continues', () => {
    const e = make();
    e.input();
    e.pause();
    const y = e.bird.y;
    step(e, 30);
    expect(e.bird.y).toBe(y);
    e.resume();
    step(e, 5);
    expect(e.bird.y).not.toBe(y);
  });

  it('scores exactly once per pipe pair', () => {
    const e = make();
    const onScore = vi.fn();
    e.cb.onScore = onScore;
    e.input();
    const y = 220;
    e.obstacles.pipes.push({ x: e.bird.x + 10, gapY: y, gap: 150, scored: false });
    e.obstacles.lastGapY = y;
    step(e, 45, 1 / 60, { y });
    expect(e.score).toBe(1);
    step(e, 5, 1 / 60, { y });
    expect(e.score).toBe(1);
    expect(onScore).toHaveBeenCalledTimes(1);
  });

  it('dies on ground, commits best, and no more score after game over', () => {
    const e = make();
    const onOver = vi.fn();
    e.cb.onGameOver = onOver;
    e.input();
    e.scoreManager.score = 3;
    step(e, 200); // falls to the ground
    expect(e.state).toBe(STATES.GAME_OVER);
    expect(onOver).toHaveBeenCalledTimes(1);
    expect(onOver.mock.calls[0][0]).toMatchObject({ score: 3, best: 3, isNewBest: true });
    e.obstacles.pipes.push({ x: 0, gapY: 220, gap: 150, scored: false });
    step(e, 10);
    expect(e.score).toBe(3);
    expect(onOver).toHaveBeenCalledTimes(1);
  });

  it('blocks instant accidental restart, then restarts cleanly', () => {
    const e = make();
    e.input();
    for (let i = 0; i < 300 && e.state !== STATES.GAME_OVER; i++) e.update(1 / 60);
    expect(e.state).toBe(STATES.GAME_OVER);
    e.input(); // too soon after death: ignored
    expect(e.state).toBe(STATES.GAME_OVER);
    step(e, 40);
    e.input();
    expect(e.state).toBe(STATES.READY);
    expect(e.score).toBe(0);
    expect(e.obstacles.pipes).toHaveLength(0);
    expect(e.best).toBe(0);
  });

  it('clamps huge frame deltas in the loop (tab suspension)', () => {
    const e = make();
    e.running = true;
    globalThis.requestAnimationFrame = () => 1;
    e.tick(1000);
    e.tick(1000 + 60_000);
    expect(e.time).toBeLessThanOrEqual(CONFIG.maxDelta + 1e-9);
    e.running = false;
  });

  it('never starts duplicate loops', () => {
    const raf = vi.fn(() => 1);
    globalThis.requestAnimationFrame = raf;
    globalThis.cancelAnimationFrame = () => {};
    const e = make();
    e.start();
    e.start();
    expect(raf).toHaveBeenCalledTimes(1);
    e.destroy();
    expect(e.running).toBe(false);
  });
});

describe('failure handling', () => {
  it('falls back when every image fails to load', async () => {
    const createImage = () => {
      const img = {};
      Object.defineProperty(img, 'src', { set() { setTimeout(() => img.onerror?.(), 0); } });
      return img;
    };
    const { assets, failed } = await loadAssets({ createImage, fallback: (k) => `fallback:${k}`, scenery: () => ({ sky: 's' }), baseUrl: '/' });
    expect(failed).toEqual(['birdSheet', 'pipeBody', 'pipeCap', 'ground']);
    expect(assets.birdSheet).toBe('fallback:bird');
    expect(assets.sky).toBe('s');
  });

  it('survives a throwing fallback and scenery builder', async () => {
    const createImage = () => {
      throw new Error('no Image');
    };
    const boom = () => {
      throw new Error('boom');
    };
    const { assets, failed } = await loadAssets({ createImage, fallback: boom, scenery: boom });
    expect(assets.ground).toBeNull();
    expect(failed).toContain('scenery');
  });

  it('audio is a safe no-op without Web Audio or when muted', () => {
    const a = new AudioManager({ AudioCtx: undefined });
    expect(() => {
      a.unlock();
      a.play('flap');
      a.setMuted(true);
      a.dispose();
    }).not.toThrow();
    const Throwing = class {
      constructor() {
        throw new Error('blocked');
      }
    };
    const b = new AudioManager({ AudioCtx: Throwing });
    expect(() => {
      b.unlock();
      b.play('hit');
    }).not.toThrow();
  });
});

describe('audio clips', () => {
  const fakeAudio = () => {
    const log = [];
    return { log, create: (src) => ({ src, currentTime: 0, play: () => (log.push(['play', src]), Promise.resolve()), pause: () => log.push(['pause', src]) }) };
  };
  it('plays start clip on run start and game-over clip on every death', () => {
    const f = fakeAudio();
    const audio = new AudioManager({ AudioCtx: undefined, createAudio: f.create, baseUrl: '/' });
    for (let run = 0; run < 2; run++) {
      const e = make({ audio });
      e.input();
      for (let i = 0; i < 300 && e.state !== STATES.GAME_OVER; i++) e.update(1 / 60);
    }
    const plays = f.log.filter((l) => l[0] === 'play').map((l) => l[1]);
    expect(plays).toEqual(['/assets/audio/start.mp3', '/assets/audio/gameover.mp3', '/assets/audio/start.mp3', '/assets/audio/gameover.mp3']);
  });
  it('respects mute and tolerates a failing Audio constructor', () => {
    const f = fakeAudio();
    const a = new AudioManager({ AudioCtx: undefined, createAudio: f.create, muted: true });
    a.playClip('start');
    expect(f.log).toHaveLength(0);
    const b = new AudioManager({ AudioCtx: undefined, createAudio: () => { throw new Error('x'); } });
    expect(() => b.playClip('start')).not.toThrow();
  });
});
