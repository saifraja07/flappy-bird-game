import { useEffect } from 'react';
import PixelButton from './PixelButton.jsx';

const ROWS = [
  ['muted', 'Mute sound'],
  ['reduceEffects', 'Reduce effects (shake, particles)'],
  ['pauseOnBlur', 'Pause when tab is hidden'],
];

export default function SettingsPanel({ settings, onToggle, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink/80 p-4 font-pixel" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="w-full max-w-xs border-4 border-ink bg-cream p-4 text-ink">
        <h2 className="mb-3 text-sm">SETTINGS</h2>
        <ul className="flex flex-col gap-3">
          {ROWS.map(([key, label]) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-[9px] leading-relaxed">
                <span>{label}</span>
                <input type="checkbox" checked={settings[key]} onChange={() => onToggle(key)} className="size-5 accent-ember focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-night" />
              </label>
            </li>
          ))}
        </ul>
        <PixelButton className="mt-4 w-full" onClick={onClose} autoFocus>
          Close
        </PixelButton>
      </div>
    </div>
  );
}
