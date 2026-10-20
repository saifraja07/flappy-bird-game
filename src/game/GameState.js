import { STATES } from './constants.js';

const TABLE = {
  [STATES.READY]: { start: STATES.PLAYING },
  [STATES.PLAYING]: { pause: STATES.PAUSED, die: STATES.GAME_OVER },
  [STATES.PAUSED]: { resume: STATES.PLAYING, restart: STATES.READY },
  [STATES.GAME_OVER]: { restart: STATES.READY },
};

/** Returns the next state for an event, or the same state when the event is not valid. */
export function nextState(state, event) {
  return TABLE[state]?.[event] ?? state;
}
