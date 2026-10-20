import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine.js';
import { STATES } from '../game/constants.js';
import { createStorage } from '../game/storage.js';
import { loadSettings, saveSettings } from '../game/settings.js';
import { AudioManager } from '../audio/AudioManager.js';
import { loadAssets } from '../assets/loader.js';

const storage = createStorage();
const prefersReduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Bridges the imperative engine to React. Only low-frequency events reach React state. */
export function useGameController(canvasRef) {
  const [ui, setUi] = useState({ loading: true, state: STATES.READY, score: 0, best: 0, newBest: false });
  const [settings, setSettings] = useState(() => loadSettings(storage, prefersReduced()));
  const settingsRef = useRef(settings);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    let engine = null;
    const audio = new AudioManager({ muted: settingsRef.current.muted });
    audioRef.current = audio;
    const unbindUnlock = audio.bindUnlock();
    // Hold the loading screen until sprites AND sounds are ready, so the first run always has audio.
    Promise.all([loadAssets(), audio.preload()]).then(([{ assets }]) => {
      if (cancelled || !canvasRef.current) return;
      engine = new GameEngine({
        canvas: canvasRef.current,
        assets,
        audio,
        storage,
        options: settingsRef.current,
        callbacks: {
          onStateChange: (state) => setUi((u) => ({ ...u, state, newBest: state === STATES.READY ? false : u.newBest })),
          onScore: (score, best) => setUi((u) => ({ ...u, score, best })),
          onGameOver: ({ score, best, isNewBest }) => setUi((u) => ({ ...u, score, best, newBest: isNewBest })),
        },
      });
      engineRef.current = engine;
      engine.start();
      setUi((u) => ({ ...u, loading: false, best: engine.best }));
    });
    return () => {
      cancelled = true;
      unbindUnlock();
      engine?.destroy();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, [canvasRef]);

  useEffect(() => {
    audioRef.current?.setMuted(settings.muted);
    engineRef.current?.setOptions({ reduceEffects: settings.reduceEffects, pauseOnBlur: settings.pauseOnBlur });
    saveSettings(storage, settings);
  }, [settings]);

  const click = () => {
    audioRef.current?.unlock();
    audioRef.current?.play('click');
  };

  const actions = {
    start: useCallback(() => {
      click();
      engineRef.current?.input();
    }, []),
    togglePause: useCallback(() => {
      click();
      engineRef.current?.togglePause();
    }, []),
    pause: useCallback(() => engineRef.current?.pause(), []),
    resume: useCallback(() => {
      click();
      engineRef.current?.resume();
    }, []),
    restart: useCallback(() => {
      click();
      engineRef.current?.restart();
    }, []),
    toggleSetting: useCallback((key) => {
      click();
      setSettings((s) => ({ ...s, [key]: !s[key] }));
    }, []),
  };
  return { ui, settings, actions };
}
