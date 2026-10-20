import { STORAGE_KEYS } from './constants.js';

export const DEFAULT_SETTINGS = Object.freeze({ muted: false, reduceEffects: false, pauseOnBlur: true });

export function loadSettings(storage, prefersReducedMotion = false) {
  const base = { ...DEFAULT_SETTINGS, reduceEffects: prefersReducedMotion };
  try {
    const raw = storage?.get(STORAGE_KEYS.settings);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const out = { ...base };
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (typeof parsed[k] === 'boolean') out[k] = parsed[k];
    return out;
  } catch {
    return base;
  }
}

export function saveSettings(storage, settings) {
  return storage?.set(STORAGE_KEYS.settings, JSON.stringify(settings)) ?? false;
}
