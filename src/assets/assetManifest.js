// Replace any of these PNGs in public/assets/images to re-skin the game. Missing/broken files fall back
// to the built-in pixel data in spriteData.js. Layouts (sizes in logical px at scale 3/4/4):
//   birdSheet : single transparent portrait image, scaled to fit the bird position
//   pipeBody  : 52xN, vertically stretched      pipeCap : 56x20
//   ground    : 32x64 tile, scrolls horizontally
export const ASSET_MANIFEST = {
  birdSheet: 'assets/images/bird.png',
  pipeBody: 'assets/images/pipe-body.png',
  pipeCap: 'assets/images/pipe-cap.png',
  ground: 'assets/images/ground.png',
};

// Audio clips played as files (HTMLAudio). Missing files are ignored silently.
export const AUDIO_MANIFEST = {
  start: 'assets/audio/start.mp3', // plays when a run starts, stops when it ends
  gameover: 'assets/audio/gameover.mp3', // plays every time a run ends
};
