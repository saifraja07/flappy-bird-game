import { CONFIG } from './constants.js';

export class ObstacleManager {
  constructor(cfg = CONFIG, rng = Math.random) {
    this.cfg = cfg;
    this.rng = rng;
    this.pipes = [];
    this.lastGapY = null;
  }

  reset() {
    this.pipes.length = 0;
    this.lastGapY = null;
  }

  /** Picks a gap centre that never overlaps the ceiling/ground and is reachable from the previous gap. */
  pickGapY(gap) {
    const { cfg } = this;
    const playH = cfg.height - cfg.groundHeight;
    const min = cfg.pipe.minEdge + gap / 2;
    const max = playH - cfg.pipe.minEdge - gap / 2;
    let lo = min;
    let hi = max;
    if (this.lastGapY !== null) {
      lo = Math.max(min, this.lastGapY - cfg.pipe.maxGapShift);
      hi = Math.min(max, this.lastGapY + cfg.pipe.maxGapShift);
    }
    return lo + this.rng() * (hi - lo);
  }

  spawn(x, gap) {
    const gapY = this.pickGapY(gap);
    this.lastGapY = gapY;
    const pipe = { x, gapY, gap, scored: false };
    this.pipes.push(pipe);
    return pipe;
  }

  update(dt, d) {
    const { cfg, pipes } = this;
    for (const p of pipes) p.x -= d.speed * dt;
    while (pipes.length && pipes[0].x + cfg.pipe.width + cfg.pipe.capOverhang < 0) pipes.shift();
    const edge = cfg.width + 20;
    if (!pipes.length) this.spawn(cfg.pipe.firstSpawnX, d.gap);
    let guard = 4;
    while (guard-- > 0 && pipes[pipes.length - 1].x + d.spacing <= edge) {
      this.spawn(pipes[pipes.length - 1].x + d.spacing, d.gap);
    }
  }
}
