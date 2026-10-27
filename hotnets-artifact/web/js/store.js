// localStorage wrapper that never throws (private mode, blocked storage).
const PREFIX = 'wakegpu:';
export function load(key, fallback = null) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* storage unavailable */ }
}
// Drop every key whose name starts with `prefix` (used to clear data from removed features).
export function removePrefix(prefix) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX + prefix)) localStorage.removeItem(k);
  } catch { /* storage unavailable */ }
}
