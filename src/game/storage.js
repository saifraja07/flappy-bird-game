/** localStorage wrapper: every access is guarded (private mode, blocked storage, quota). */
export function createStorage(getBacking = () => globalThis.localStorage) {
  return {
    get(key) {
      try {
        const s = getBacking();
        return s ? s.getItem(key) : null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        const s = getBacking();
        if (!s) return false;
        s.setItem(key, String(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}
