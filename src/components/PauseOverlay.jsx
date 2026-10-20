import PixelButton from './PixelButton.jsx';

export default function PauseOverlay({ onResume, onRestart }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/70 font-pixel" role="dialog" aria-label="Game paused">
      <h2 className="text-xl text-sun">PAUSED</h2>
      <PixelButton onClick={onResume} autoFocus>
        Resume
      </PixelButton>
      <PixelButton variant="ghost" onClick={onRestart}>
        Restart
      </PixelButton>
    </div>
  );
}
