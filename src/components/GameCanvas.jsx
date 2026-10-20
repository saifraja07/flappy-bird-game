/** Logical-resolution canvas scaled with CSS only; the engine owns everything drawn inside. */
export default function GameCanvas({ canvasRef }) {
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Modi Votechor game area. Press space, up arrow, click or tap to flap."
      className="block h-full w-full touch-none select-none"
    />
  );
}
