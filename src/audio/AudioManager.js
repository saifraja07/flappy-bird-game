import { AUDIO_MANIFEST } from '../assets/assetManifest.js';

const MIN_GAP = { flap: 0.06, score: 0.08, click: 0.04 };
const MAX_VOICES = 10;
const PRELOAD_TIMEOUT_MS = 8000;
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

/**
 * Audio for the game.
 *  - Short effects (flap, score, click) are synthesized with Web Audio.
 *  - File clips (start.mp3, gameover.mp3) are fetched + decoded into AudioBuffers up front, so they start
 *    instantly and are never streamed lazily on first play (that was the "audio plays only after a while" bug).
 * Every public method is a safe no-op if audio is unavailable; audio must never break gameplay.
 */
export class AudioManager {
  constructor({
    AudioCtx = globalThis.AudioContext ?? globalThis.webkitAudioContext,
    muted = false,
    clips = AUDIO_MANIFEST,
    baseUrl = import.meta.env?.BASE_URL ?? './',
    fetchFn = globalThis.fetch?.bind(globalThis),
  } = {}) {
    this.AudioCtx = AudioCtx;
    this.clipPaths = clips;
    this.baseUrl = baseUrl;
    this.fetchFn = fetchFn;
    this.muted = muted;
    this.ctx = null;
    this.master = null; // SFX bus (lowpass'd)
    this.clipGain = null; // file-clip bus
    this.voices = 0;
    this.lastPlayed = {};
    this.buffers = {}; // name -> decoded AudioBuffer
    this.playing = {}; // name -> { src, startedAt }
    this.paused = {}; // name -> resume offset (seconds)
    this.wanted = new Set(); // clips requested before they finished decoding
    this.preloadPromise = null;
    this.disposed = false;
  }

  /** Creates the AudioContext (suspended until a user gesture) and its buses. Returns the context or null. */
  ensureContext() {
    if (this.disposed || !this.AudioCtx) return null;
    if (this.ctx) return this.ctx;
    try {
      const ctx = new this.AudioCtx();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3200;
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(filter);
      filter.connect(ctx.destination);
      const clipGain = ctx.createGain();
      clipGain.gain.value = 1;
      clipGain.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.clipGain = clipGain;
    } catch {
      this.ctx = this.master = this.clipGain = null;
    }
    return this.ctx;
  }

  /** Resume the context. Safe to call repeatedly; browsers only allow it from a user gesture. */
  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
    } catch {
      /* ignore */
    }
  }

  /** Unlocks audio on the first real gesture of any kind (iOS needs touchend/click, not just pointerdown). */
  bindUnlock(target = globalThis.window) {
    if (!target?.addEventListener) return () => {};
    const onGesture = () => this.unlock();
    UNLOCK_EVENTS.forEach((e) => target.addEventListener(e, onGesture, { passive: true, capture: true }));
    return () => UNLOCK_EVENTS.forEach((e) => target.removeEventListener(e, onGesture, { capture: true }));
  }

  /**
   * Fetches and decodes every file clip. Never rejects. Resolves when all clips are ready, have failed,
   * or `timeoutMs` has passed (a clip that finishes later still plays, if it is still wanted by then).
   */
  preload(timeoutMs = PRELOAD_TIMEOUT_MS) {
    if (this.preloadPromise) return this.preloadPromise;
    let timer;
    const all = Promise.all(Object.keys(this.clipPaths).map((name) => this.loadClip(name)));
    const timeout = new Promise((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    });
    this.preloadPromise = Promise.race([all, timeout]).then(() => clearTimeout(timer));
    return this.preloadPromise;
  }

  async loadClip(name) {
    if (this.buffers[name] || this.disposed) return;
    try {
      if (!this.fetchFn || !this.ensureContext()) return;
      const res = await this.fetchFn(this.baseUrl + this.clipPaths[name]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.arrayBuffer();
      if (this.disposed || !this.ctx) return;
      const buffer = await this.decode(data);
      if (this.disposed) return;
      this.buffers[name] = buffer;
      if (this.wanted.delete(name) && !this.muted) this.startClip(name, 0);
    } catch {
      /* missing or undecodable file: that clip is simply silent */
    }
  }

  decode(data) {
    return new Promise((resolve, reject) => {
      // Older Safari only supports the callback form; modern browsers return a promise. Settling twice is harmless.
      const p = this.ctx.decodeAudioData(data, resolve, reject);
      p?.then?.(resolve, reject);
    });
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.stopClips();
  }

  // ---- file clips ---------------------------------------------------------
  startClip(name, offset = 0) {
    const buffer = this.buffers[name];
    if (!buffer || !this.ctx || !this.clipGain) return;
    this.stopNode(name); // a clip can never overlap itself
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.clipGain);
      src.onended = () => {
        if (this.playing[name]?.src === src) delete this.playing[name];
      };
      src.start(0, offset);
      this.playing[name] = { src, startedAt: this.ctx.currentTime - offset };
    } catch {
      /* ignore */
    }
  }

  stopNode(name) {
    const p = this.playing[name];
    if (!p) return;
    delete this.playing[name];
    p.src.onended = null;
    try {
      p.src.stop();
    } catch {
      /* already stopped */
    }
    try {
      p.src.disconnect();
    } catch {
      /* ignore */
    }
  }

  /** Plays a file clip from the start. If it is still loading it starts as soon as it is ready. */
  playClip(name) {
    if (this.muted || this.disposed || !this.clipPaths[name]) return;
    delete this.paused[name];
    if (this.buffers[name]) this.startClip(name, 0);
    else this.wanted.add(name);
  }

  stopClip(name) {
    this.wanted.delete(name);
    delete this.paused[name];
    this.stopNode(name);
  }

  stopClips() {
    Object.keys(this.clipPaths).forEach((n) => this.stopClip(n));
  }

  pauseClips() {
    this.wanted.clear();
    for (const name of Object.keys(this.playing)) {
      const offset = this.ctx.currentTime - this.playing[name].startedAt;
      if (offset < (this.buffers[name]?.duration ?? 0)) this.paused[name] = offset;
      this.stopNode(name);
    }
  }

  resumeClips() {
    if (this.muted) return;
    const paused = this.paused;
    this.paused = {};
    Object.entries(paused).forEach(([name, offset]) => this.startClip(name, offset));
  }

  // ---- synthesized effects -----------------------------------------------
  play(name) {
    if (this.muted || this.disposed || !this.ctx || !this.master || this.voices >= MAX_VOICES) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < (MIN_GAP[name] ?? 0.05)) return;
    this.lastPlayed[name] = now;
    try {
      switch (name) {
        case 'flap': this.tone('triangle', 360, 620, 0.1, 0.35, now); break;
        case 'score':
          this.tone('square', 784, 0, 0.07, 0.14, now);
          this.tone('square', 1175, 0, 0.14, 0.14, now + 0.07);
          break;
        case 'click': this.tone('triangle', 520, 780, 0.06, 0.25, now); break;
        default: break;
      }
    } catch {
      /* audio must never break gameplay */
    }
  }

  tone(type, f0, f1, dur, vol, t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    this.voices += 1;
    o.onended = () => {
      this.voices -= 1;
      g.disconnect();
    };
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  dispose() {
    this.disposed = true;
    this.stopClips();
    this.buffers = {};
    try {
      this.ctx?.close?.()?.catch?.(() => {});
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
    this.clipGain = null;
  }
}
