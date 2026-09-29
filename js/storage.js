// Saves things in the browser's localStorage so they're still there next time.
// Everything stays on your device; nothing is uploaded.

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* storage blocked */ }
  },

  getApiKey() { return this.get('cs.apiKey', ''); },
  setApiKey(k) { this.set('cs.apiKey', k); },

  // Per-tool memory: chosen model, options, and your edited hidden prompt.
  getTool(id) { return this.get('cs.tool.' + id, {}); },
  setTool(id, value) { this.set('cs.tool.' + id, value); },
};
