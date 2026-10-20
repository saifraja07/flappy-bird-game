export class ScoreManager {
  constructor(storage, key) {
    this.storage = storage;
    this.key = key;
    this.score = 0;
    const saved = parseInt(storage?.get(key) ?? '', 10);
    this.savedBest = Number.isFinite(saved) && saved > 0 ? saved : 0;
  }

  get best() {
    return Math.max(this.savedBest, this.score);
  }

  reset() {
    this.score = 0;
  }

  /** Scores each pipe pair exactly once, when its trailing edge passes birdX. Returns newly scored count. */
  passPipes(pipes, birdX, pipeWidth) {
    let gained = 0;
    for (const p of pipes) {
      if (!p.scored && p.x + pipeWidth < birdX) {
        p.scored = true;
        gained += 1;
      }
    }
    this.score += gained;
    return gained;
  }

  /** Called once when the run ends. Persists a new best when storage is available. */
  commit() {
    const isNewBest = this.score > this.savedBest;
    if (isNewBest) {
      this.savedBest = this.score;
      this.storage?.set(this.key, this.score);
    }
    return { score: this.score, best: this.savedBest, isNewBest };
  }
}
