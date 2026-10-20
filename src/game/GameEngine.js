import { CONFIG, STATES, STORAGE_KEYS } from './constants.js';
import { nextState } from './GameState.js';
import { createBird, applyFlap, stepBird } from './physics.js';
import { hitsBounds, hitsPipe, birdHitbox } from './collision.js';
import { ObstacleManager } from './obstacleManager.js';
import { ScoreManager } from './scoreManager.js';
import { getDifficulty } from './difficulty.js';
import { attachInput } from './inputManager.js';
import { renderFrame } from './renderer.js';

/**
 * Owns the animation loop and all fast-changing world state. React only receives
 * low-frequency events through `callbacks` (onStateChange, onScore, onGameOver).
 * Headless use (tests): omit `canvas` and call update(dt) / input() directly.
 */
export class GameEngine {
  constructor({ canvas = null, assets = null, audio = null, storage = null, callbacks = {}, options = {}, rng = Math.random, config = CONFIG } = {}) {
    this.cfg = config;
    this.canvas = canvas;
    this.assets = assets;
    this.audio = audio;
    this.cb = callbacks;
    this.options = { reduceEffects: false, pauseOnBlur: true, ...options };
    this.scoreManager = new ScoreManager(storage, STORAGE_KEYS.best);
    this.obstacles = new ObstacleManager(config, rng);
    this.rng = rng;
    this.particles = [];
    this.state = STATES.READY;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.scale = 1;
    this.ctx = null;
    this.cleanups = [];
    this.resetWorld();
  }

  get score() {
    return this.scoreManager.score;
  }
  get best() {
    return this.scoreManager.best;
  }

  resetWorld() {
    this.bird = createBird(this.cfg);
    this.obstacles.reset();
    this.particles.length = 0;
    this.scoreManager.reset();
    this.time = 0;
    this.scrollX = 0;
    this.cloudX = 0;
    this.hillX = 0;
    this.wingTime = 0;
    this.wingFrame = 0;
    this.shakeTime = 0;
    this.deadTime = 0;
  }

  setOptions(opts) {
    Object.assign(this.options, opts);
    if (opts.reduceEffects) this.particles.length = 0;
  }

  // ---- lifecycle -------------------------------------------------------
  start() {
    if (this.running) return; // never create a second loop
    this.running = true;
    this.last = 0;
    if (this.canvas) {
      this.setupCanvas();
      this.cleanups.push(
        attachInput(this.canvas, {
          flap: () => this.input(),
          togglePause: () => this.togglePause(),
          pause: () => this.pause(),
        }),
      );
      const onResize = () => this.setupCanvas();
      const onVisibility = () => {
        if (document.hidden) {
          if (this.options.pauseOnBlur) this.pause();
        } else this.last = 0; // skip the idle gap
      };
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);
      this.cleanups.push(() => {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
      });
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.cleanups.splice(0).forEach((fn) => fn());
    this.ctx = null;
  }

  setupCanvas() {
    const scale = Math.min(window.devicePixelRatio || 1, this.cfg.maxRenderScale);
    this.scale = scale;
    this.canvas.width = Math.round(this.cfg.width * scale);
    this.canvas.height = Math.round(this.cfg.height * scale);
    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
  }

  tick = (now) => {
    if (!this.running) return;
    const dt = this.last ? Math.min(Math.max((now - this.last) / 1000, 0), this.cfg.maxDelta) : 0;
    this.last = now;
    this.update(dt);
    if (this.ctx) renderFrame(this.ctx, this);
    this.raf = requestAnimationFrame(this.tick);
  };

  // ---- state transitions ----------------------------------------------
  transition(event) {
    const next = nextState(this.state, event);
    if (next === this.state) return false;
    this.state = next;
    this.cb.onStateChange?.(next);
    return true;
  }

  input() {
    this.audio?.unlock?.();
    if (this.state === STATES.READY) {
      this.transition('start');
      this.audio?.playClip?.('start');
      this.flap();
    } else if (this.state === STATES.PLAYING) {
      this.flap();
    } else if (this.state === STATES.GAME_OVER && this.deadTime >= this.cfg.gameOverRestartDelay) {
      this.restart();
    }
  }

  flap() {
    applyFlap(this.bird, this.cfg);
    this.audio?.play('flap');
    this.burst(this.bird.x - 10, this.bird.y + 6, 2, '#ffffff', 40);
  }

  pause() {
    const ok = this.transition('pause');
    if (ok) this.audio?.pauseClips?.();
    return ok;
  }
  resume() {
    this.last = 0;
    const ok = this.transition('resume');
    if (ok) this.audio?.resumeClips?.();
    return ok;
  }
  togglePause() {
    if (this.state === STATES.PLAYING) this.pause();
    else if (this.state === STATES.PAUSED) this.resume();
  }

  restart() {
    if (this.state !== STATES.GAME_OVER && this.state !== STATES.PAUSED) return false;
    this.audio?.stopClips?.();
    this.resetWorld();
    this.cb.onScore?.(0, this.scoreManager.best);
    return this.transition('restart');
  }

  die() {
    if (this.state !== STATES.PLAYING) return;
    this.transition('die');
    const result = this.scoreManager.commit();
    this.deadTime = 0;
    this.shakeTime = this.cfg.shake.duration;
    this.audio?.stopClip?.('start');
    this.audio?.playClip?.('gameover');
    const hb = birdHitbox(this.bird, this.cfg);
    this.burst(hb.x + hb.w / 2, hb.y + hb.h / 2, 14, '#ffd23f', 140);
    this.cb.onGameOver?.(result);
  }

  // ---- simulation -------------------------------------------------------
  update(dt) {
    this.time += dt;
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.updateParticles(dt);
    switch (this.state) {
      case STATES.READY: {
        const d = getDifficulty(0, this.cfg);
        this.scrollWorld(dt, d.speed);
        this.animateWings(dt);
        this.bird.y = (this.cfg.height - this.cfg.groundHeight) / 2 + Math.sin(this.time * 4) * 5;
        break;
      }
      case STATES.PLAYING:
        this.updatePlaying(dt);
        break;
      case STATES.GAME_OVER:
        this.deadTime += dt;
        this.updateDeadBird(dt);
        break;
      default:
        break; // paused: world frozen
    }
  }

  scrollWorld(dt, speed) {
    this.scrollX += speed * dt;
    this.hillX += speed * dt * 0.35;
    this.cloudX += speed * dt * 0.12;
  }

  animateWings(dt) {
    this.wingTime += dt;
    this.wingFrame = Math.floor(this.wingTime * 12);
  }

  updatePlaying(dt) {
    const { cfg } = this;
    const d = getDifficulty(this.score, cfg);
    this.scrollWorld(dt, d.speed);
    this.animateWings(dt);
    stepBird(this.bird, dt, cfg);
    this.obstacles.update(dt, d);

    const bound = hitsBounds(this.bird, cfg);
    if (bound === 'ceiling') {
      this.bird.y = cfg.bird.hitbox.height / 2; // ceiling stops the bird but is not fatal
      this.bird.vy = Math.max(0, this.bird.vy);
    }
    if (bound === 'ground' || this.obstacles.pipes.some((p) => hitsPipe(this.bird, p, cfg))) {
      this.die();
      return; // no scoring on the frame of death
    }
    const gained = this.scoreManager.passPipes(this.obstacles.pipes, this.bird.x, cfg.pipe.width);
    if (gained) {
      this.audio?.play('score');
      this.burst(this.bird.x, this.bird.y, 6, '#fff6d6', 90);
      this.cb.onScore?.(this.score, this.best);
    }
  }

  updateDeadBird(dt) {
    const groundLimit = this.cfg.height - this.cfg.groundHeight - this.cfg.bird.hitbox.height / 2;
    if (this.bird.y < groundLimit) {
      stepBird(this.bird, dt, this.cfg);
      if (this.bird.y >= groundLimit) {
        this.bird.y = groundLimit;
        this.bird.vy = 0;
      }
    }
  }

  burst(x, y, count, color, speed) {
    if (this.options.reduceEffects) return;
    const max = this.cfg.particles.max;
    for (let i = 0; i < count && this.particles.length < max; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = speed * (0.4 + this.rng() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5, maxLife: 0.5, size: 3, color });
    }
  }

  updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      p.vy += 400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
}
