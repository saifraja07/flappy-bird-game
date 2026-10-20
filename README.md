# Modi Votechor

A retro pixel-art, side-scrolling obstacle-dodging arcade game. Original character, art and sound; no backend.

**Stack:** React 19, Vite, JavaScript (ES modules), HTML Canvas 2D, Tailwind CSS v4, Vitest.
**Prerequisites:** Node.js 20.19+ (or 22+) and npm.

## Commands
```bash
npm install
npm run dev       # dev server
npm run build     # production build -> dist/
npm run preview   # serve the production build
npm test          # Vitest unit tests
npm run assets    # regenerate PNGs in public/assets/images from src/assets/spriteData.js
```

## Controls
Space / Up / W, mouse click or screen tap: flap · P: pause/resume · Esc: pause. Pause, sound and settings buttons are in the HUD.

## Architecture
- `src/game/` — engine, framework-free: `GameEngine` (rAF loop, clamped delta time, state machine via `GameState`), `physics`, `collision`, `obstacleManager`, `scoreManager`, `difficulty`, `renderer`, `inputManager`, `storage`/`settings` (guarded localStorage), `constants` (all tuning).
- `src/hooks/useGameController.js` — creates/destroys the engine in an effect (Strict-Mode safe) and forwards only low-frequency events (state, score, game over) to React. Coordinates never live in React state.
- `src/components/` — Tailwind UI: start, HUD, pause, game over, settings.
- `src/audio/AudioManager.js` — procedural Web Audio SFX, unlocked on first user gesture.
- `src/assets/` — manifest, loader (failures fall back to built-in sprites), sprite data, procedural scenery.

## Replacing assets
Overwrite PNGs in `public/assets/images/` (sizes are listed in `src/assets/assetManifest.js`: bird sheet is 3 frames of 36x27; pipe cap 56x20; pipe body 52xN stretched; ground tile 32x64). Missing or broken files fall back to the built-in pixel art. Hitboxes are configured separately (`CONFIG.bird.hitbox`), so sprite size changes don't affect gameplay. To change the built-in art, edit `src/assets/spriteData.js` and run `npm run assets`.

## Audio
Sounds are synthesized in `AudioManager` (flap, score, hit, best, click). To use recorded files, load them into `AudioBuffer`s in `AudioManager` and play them from `play(name)`; keep calls inside try/catch so missing files cannot break the game. Background music is not included.

## Configuration
Edit `src/game/constants.js`: `physics` (gravity, flap velocity, speed caps), `bird.hitbox`, `pipe` (width, min edge margin, max gap shift), `difficulty` (`rampScore`, start/end `speed`, `gap`, `spacing`), `maxDelta`, `maxRenderScale`, `shake`.

## Deployment (static)
- **Vercel:** import the repo; framework Vite, build `npm run build`, output `dist`.
- **Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** upload/publish `dist/`; asset URLs are relative (`base: './'`).

## Known limitations
No background music. Pixel font loads from Google Fonts (falls back to monospace offline). Not yet tested in real browsers/devices by automated tooling; tests cover game logic only.
# flappy-bird-game
