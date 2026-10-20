// Pixel-art source of truth. Pure data (no DOM) so the PNG generator script and the runtime fallback share it.
export const PALETTE = {
  k: '#1b1b2f', y: '#ffd23f', d: '#e0a020', w: '#ffffff', o: '#ff6b35',
  G: '#b8f27b', e: '#e9ffc4', g: '#5cc23a', h: '#2f8a2f',
  t: '#7ed957', T: '#4caf3a', n: '#d9a066', u: '#b5793f',
};

export const SCALE = { bird: 3, pipe: 4, ground: 4 };

const BIRD_BASE = [
  '...kkkkk....',
  '..kyyyyykk..',
  '.kyyyyykwwk.',
  '.kyyyyyywkwk',
  '.kyyyyyyyooo',
  '.kyyyyyyykkk',
  '.kyyyyyyykk.',
  '..kkyyyykk..',
  '....kkkk....',
];
// Wing rows per frame: up, mid, down.
const WING_ROWS = [[3, 4], [4, 5], [5, 6]];

export const BIRD_FRAMES = WING_ROWS.map((rows) =>
  BIRD_BASE.map((line, y) =>
    rows.includes(y) ? line.split('').map((c, x) => (x >= 2 && x <= 5 ? 'd' : c)).join('') : line,
  ),
);

export const PIPE_BODY = ['kGeggggggghhk'];
export const PIPE_CAP = [
  'kkkkkkkkkkkkkk',
  'kGeeGggggghhhk',
  'kGeGgggggggghk',
  'kGeGgggggggghk',
  'kkkkkkkkkkkkkk',
];

const DIRT = ['nnnnunnn', 'nnnnnnnn', 'unnnnnnn', 'nnnnnnnu'];
export const GROUND = [
  'tttttttt',
  'TTtTTtTT',
  'kkkkkkkk',
  ...Array.from({ length: 13 }, (_, i) => DIRT[i % DIRT.length]),
];

export const SPRITES = {
  bird: { frames: BIRD_FRAMES, scale: SCALE.bird }, // exported as a horizontal sheet
  pipeBody: { frames: [PIPE_BODY], scale: SCALE.pipe },
  pipeCap: { frames: [PIPE_CAP], scale: SCALE.pipe },
  ground: { frames: [GROUND], scale: SCALE.ground },
};
