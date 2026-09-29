// Saves settings and prompts in the browser's localStorage,
// so they're still there next time you open the page.

const DEFAULT_PROMPTS = [
  {
    id: 'character-sheet',
    name: 'Character Sheet (default)',
    // Replace this with your own Nano Banana 2 prompt in the Prompt Library.
    text:
      'Using the attached reference image, create a clean character sheet of this exact character. ' +
      'Keep their face, hair, outfit, colours and proportions consistent with the reference. ' +
      'Show 6 separate full-body views with clear space between each one: front, three-quarter, side, back, ' +
      'and two action poses. Plain flat white background, no overlapping figures, no text or labels.\n\n{details}',
  },
];

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gemini-3.1-flash-image-preview',
};

const Storage = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  _write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
  },

  getSettings() { return { ...DEFAULT_SETTINGS, ...this._read('cs.settings', {}) }; },
  saveSettings(s) { this._write('cs.settings', s); },

  getPrompts() {
    const saved = this._read('cs.prompts', null);
    return saved && saved.length ? saved : structuredClone(DEFAULT_PROMPTS);
  },
  savePrompts(list) { this._write('cs.prompts', list); },
};
