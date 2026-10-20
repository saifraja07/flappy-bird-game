import PixelButton from './PixelButton.jsx';

export default function StartScreen({ onStart }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[16%] flex flex-col items-center gap-4 px-4 text-center font-pixel">
      <h1 className="text-2xl leading-snug text-sun [text-shadow:3px_3px_0_#1b1b2f] sm:text-3xl">
        MODI
        <br />
        VOTECHOR
      </h1>
      <p className="max-w-[16rem] bg-ink/70 p-2 text-[9px] leading-relaxed text-cream sm:text-[10px]">
        Tap, click or press SPACE to flap. Squeeze through the pipes!
      </p>
      <PixelButton onClick={onStart} autoFocus>
        Play
      </PixelButton>
    </div>
  );
}
