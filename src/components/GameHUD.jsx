import PixelButton from './PixelButton.jsx';
import { STATES } from '../game/constants.js';

export default function GameHUD({ ui, settings, actions, onOpenSettings }) {
  const playing = ui.state === STATES.PLAYING;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
      <div className="flex gap-1">
        <PixelButton variant="ghost" onClick={actions.togglePause} disabled={!playing && ui.state !== STATES.PAUSED} aria-label={playing ? 'Pause game' : 'Resume game'} className="disabled:opacity-40">
          {playing ? 'II' : '▶'}
        </PixelButton>
        <PixelButton variant="ghost" onClick={() => actions.toggleSetting('muted')} aria-pressed={settings.muted} aria-label={settings.muted ? 'Unmute sound' : 'Mute sound'}>
          {settings.muted ? 'SFX×' : 'SFX'}
        </PixelButton>
        <PixelButton variant="ghost" onClick={onOpenSettings} aria-label="Open settings">
          ⚙
        </PixelButton>
      </div>
      <div className="text-right font-pixel text-cream [text-shadow:2px_2px_0_#1b1b2f]" aria-live="polite">
        <div key={ui.score} className="animate-pop text-2xl motion-reduce:animate-none sm:text-3xl" aria-label={`Score ${ui.score}`}>
          {ui.score}
        </div>
        <div className="mt-1 text-[8px] sm:text-[10px]">BEST {ui.best}</div>
      </div>
    </div>
  );
}
