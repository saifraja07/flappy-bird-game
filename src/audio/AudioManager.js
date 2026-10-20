import { AUDIO_MANIFEST } from '../assets/assetManifest.js';

const MIN_GAP = { flap: 0.06, score: 0.08, hit: 0.2, best: 0.5, click: 0.04 };
const MAX_VOICES = 10;

/** Procedural Web Audio sound effects. Every call is a safe no-op if audio is unavailable. */
export class AudioManager {
  constructor({
    AudioCtx = globalThis.AudioContext ?? globalThis.webkitAudioContext,
    muted = false,
    createAudio = (src) => new Audio(src),
    clips = AUDIO_MANIFEST,
    baseUrl = import.meta.env?.BASE_URL ?? './',
  } = {}) {
    this.createAudio = createAudio;
    this.clipPaths = clips;
    this.baseUrl = baseUrl;
    this.clips = {};
    this.AudioCtx = AudioCtx;
    this.muted = muted;
    this.ctx = null;
    this.master = null;
    this.voices = 0;
    this.lastPlayed = {};
    this.disposed = false;
  }

  /** Create/resume the context. Call from a user gesture (pointer/key). */
  unlock() {
    if (this.disposed || !this.AudioCtx) return;
    try {
      if (!this.ctx) {
        this.ctx = new this.AudioCtx();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3200;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(filter);
        filter.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume?.().catch?.(() => {});
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.stopClips();
  }

  getClip(name) {
    if (!this.clips[name] && this.clipPaths[name]) {
      try {
        const a = this.createAudio(this.baseUrl + this.clipPaths[name]);
        a.preload = 'auto';
        this.clips[name] = a;
      } catch {
        this.clips[name] = null;
      }
    }
    return this.clips[name] ?? null;
  }

  /** Plays a file clip from the start. Never throws; missing files are ignored. */
  playClip(name) {
    if (this.muted || this.disposed) return;
    const a = this.getClip(name);
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play()?.catch?.(() => {});
    } catch {
      /* ignore */
    }
  }

  stopClip(name) {
    const a = this.clips[name];
    try {
      a?.pause();
      if (a) a.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  stopClips() {
    Object.keys(this.clips).forEach((n) => this.stopClip(n));
  }

  pauseClips() {
    Object.values(this.clips).forEach((a) => {
      try {
        a?.pause();
      } catch {
        /* ignore */
      }
    });
  }

  resumeClips() {
    if (this.muted) return;
    const a = this.clips.start;
    if (a && a.currentTime > 0 && !a.ended) a.play?.()?.catch?.(() => {});
  }

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
        case 'hit':
          this.noise(0.18, 0.35, now);
          this.tone('sawtooth', 190, 50, 0.3, 0.3, now);
          break;
        case 'best': [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, 0, 0.16, 0.25, now + 0.25 + i * 0.09)); break;
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

  noise(dur, vol, t) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.master);
    this.voices += 1;
    src.onended = () => {
      this.voices -= 1;
      g.disconnect();
    };
    src.start(t);
  }

  dispose() {
    this.disposed = true;
    this.stopClips();
    this.clips = {};
    try {
      this.ctx?.close?.().catch?.(() => {});
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
  }
}
