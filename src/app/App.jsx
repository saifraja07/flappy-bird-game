import { useCallback, useRef, useState } from 'react';
import GameCanvas from '../components/GameCanvas.jsx';
import GameHUD from '../components/GameHUD.jsx';
import StartScreen from '../components/StartScreen.jsx';
import PauseOverlay from '../components/PauseOverlay.jsx';
import GameOverScreen from '../components/GameOverScreen.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import { useGameController } from '../hooks/useGameController.js';
import { STATES } from '../game/constants.js';

export default function App() {
  const canvasRef = useRef(null);
  const { ui, settings, actions } = useGameController(canvasRef);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = () => {
    actions.pause();
    setSettingsOpen(true);
  };
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <main className="flex h-dvh w-full flex-col items-center overflow-hidden bg-night font-pixel text-cream">
      {/* Size container: the game box is the largest 9:16 rectangle that fits the remaining space. */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
        <div className="relative aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))] overflow-hidden border-4 border-ink bg-ink">
          <GameCanvas canvasRef={canvasRef} />
          {ui.loading && <div className="absolute inset-0 flex items-center justify-center bg-ink text-xs">LOADING…</div>}
          {!ui.loading && (
            <>
              <GameHUD ui={ui} settings={settings} actions={actions} onOpenSettings={openSettings} />
              {ui.state === STATES.READY && <StartScreen onStart={actions.start} />}
              {ui.state === STATES.PAUSED && !settingsOpen && <PauseOverlay onResume={actions.resume} onRestart={actions.restart} />}
              {ui.state === STATES.GAME_OVER && <GameOverScreen score={ui.score} best={ui.best} newBest={ui.newBest} onRestart={actions.restart} />}
              {settingsOpen && <SettingsPanel settings={settings} onToggle={actions.toggleSetting} onClose={closeSettings} />}
            </>
          )}
        </div>
      </div>
      <p className="hidden py-2 text-[8px] text-cream/80 sm:block">SPACE / CLICK / TAP: FLAP · P: PAUSE</p>
    </main>
  );
}
