import PixelButton from './PixelButton.jsx';

export default function GameOverScreen({ score, best, newBest, onRestart }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/50 px-4 text-center font-pixel" role="status">
      <h2 className="text-xl text-ember [text-shadow:3px_3px_0_#1b1b2f]">GAME OVER</h2>
      {newBest && <p className="animate-pop text-[10px] text-sun motion-reduce:animate-none">★ NEW BEST! ★</p>}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-4 border-ink bg-cream p-4 text-[10px] text-ink">
        <dt>SCORE</dt>
        <dd className="text-right">{score}</dd>
        <dt>BEST</dt>
        <dd className="text-right">{best}</dd>
      </dl>
      <PixelButton onClick={onRestart} autoFocus>
        Play again
      </PixelButton>
    </div>
  );
}
