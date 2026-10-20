// Central tuning file. All units are logical pixels / seconds.
export const CONFIG = Object.freeze({
  width: 288,
  height: 512,
  groundHeight: 64,
  maxDelta: 0.05, // clamp for tab suspension / long frames
  maxRenderScale: 2, // cap on devicePixelRatio to limit canvas memory
  gameOverRestartDelay: 0.45, // blocks accidental instant restarts
  physics: { gravity: 1500, flapVelocity: -430, maxFallSpeed: 700, maxRiseSpeed: -600 },
  bird: { x: 84, width: 34, height: 52, hitbox: { width: 22, height: 34 } },
  pipe: { width: 52, capHeight: 20, capOverhang: 2, minEdge: 56, maxGapShift: 140, firstSpawnX: 348 },
  // Linear ramp from start -> end values as score goes 0 -> rampScore.
  difficulty: { rampScore: 40, speed: [120, 200], gap: [150, 112], spacing: [200, 168] },
  particles: { max: 64 },
  shake: { duration: 0.25, magnitude: 6 },
});

export const STATES = Object.freeze({ READY: 'ready', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover' });
export const STORAGE_KEYS = Object.freeze({ best: 'pixelHopper.best', settings: 'pixelHopper.settings' });
