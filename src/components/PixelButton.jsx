const VARIANTS = {
  primary: 'bg-sun text-ink',
  ember: 'bg-ember text-cream',
  ghost: 'bg-cream text-ink',
};

export default function PixelButton({ variant = 'primary', className = '', onClick, children, ...rest }) {
  const handle = (e) => {
    onClick?.(e);
    // Pointer clicks drop focus so Space goes back to flapping; keyboard activation keeps focus.
    if (e.detail > 0) e.currentTarget.blur();
  };
  return (
    <button
      type="button"
      onClick={handle}
      className={`pointer-events-auto select-none border-4 border-ink px-3 py-2 font-pixel text-[10px] uppercase shadow-[0_4px_0_0_#1b1b2f] transition-transform active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:text-xs ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
