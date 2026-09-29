// Finds out which image models your API key can use, and what options each one supports.
//
// Google's model list tells us each model's name, description and basic settings
// (temperature etc.), but NOT its image options (aspect ratios, sizes, thinking...).
// Those come from the KNOWN_MODELS table below. If Google releases a model that isn't
// in the table, it still shows up; it just gets the safe basic options.

const STANDARD_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

// First matching entry wins, so keep the more specific patterns on top.
const KNOWN_MODELS = [
  {
    match: /gemini-3\.1-flash-lite-image/,
    nickname: 'Nano Banana 2 Lite',
    aspectRatios: STANDARD_RATIOS,
    imageSizes: [],
    thinkingLevels: [],
    search: false,
    maxRefs: 14,
    confirmed: false,
  },
  {
    match: /gemini-3\.1-flash-image/,
    nickname: 'Nano Banana 2',
    aspectRatios: [...STANDARD_RATIOS, '1:4', '4:1', '1:8', '8:1'],
    imageSizes: ['512', '1K', '2K', '4K'],
    thinkingLevels: ['minimal', 'high'],
    search: true,
    maxRefs: 14,
    confirmed: true,
  },
  {
    match: /gemini-3-pro-image/,
    nickname: 'Nano Banana Pro',
    aspectRatios: STANDARD_RATIOS,
    imageSizes: ['1K', '2K', '4K'],
    thinkingLevels: [], // always thinks, can't be changed
    search: true,
    maxRefs: 14,
    confirmed: true,
  },
  {
    match: /gemini-2\.5-flash-image/,
    nickname: 'Nano Banana',
    aspectRatios: STANDARD_RATIOS,
    imageSizes: [],
    thinkingLevels: [],
    search: false,
    maxRefs: 3,
    confirmed: true,
  },
];

// Used for image models that aren't in the table yet.
const UNKNOWN_MODEL = {
  nickname: '',
  aspectRatios: STANDARD_RATIOS,
  imageSizes: [],
  thinkingLevels: [],
  search: false,
  maxRefs: 3,
  confirmed: false,
};

// Shown before the list has been loaded from Google (e.g. no API key yet).
const FALLBACK_MODEL_IDS = [
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
];

const Models = {
  // Adds the known image options to a model from Google's list.
  withCaps(model) {
    const known = KNOWN_MODELS.find((k) => k.match.test(model.id)) || UNKNOWN_MODEL;
    const { match, ...caps } = known;
    return { ...caps, ...model, label: model.displayName || caps.nickname || model.id };
  },

  // The models to show in the dropdowns: loaded list if we have one, otherwise the fallback.
  list() {
    const cached = Store.get('cs.models', null);
    const raw = cached?.models?.length ? cached.models : FALLBACK_MODEL_IDS.map((id) => ({ id }));
    return raw.map((m) => this.withCaps(m));
  },

  loadedAt() {
    return Store.get('cs.models', null)?.at || null;
  },

  get(id) {
    return this.list().find((m) => m.id === id) || this.withCaps({ id });
  },

  // Asks Google which models this API key can use and keeps only the image ones
  // that can take reference images (Imagen models can't, so they're left out).
  async refresh(apiKey) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': apiKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `Could not load models (HTTP ${res.status})`);

    const models = (data.models || [])
      .filter((m) => /image/i.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => ({
        id: m.name.replace(/^models\//, ''),
        displayName: m.displayName,
        description: m.description,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
        temperature: m.temperature,
        maxTemperature: m.maxTemperature,
        topP: m.topP,
        topK: m.topK,
      }))
      // Newest-looking names first (3.1 before 3 before 2.5).
      .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

    Store.set('cs.models', { at: Date.now(), models });
    return models;
  },

  // Picks a sensible default: Nano Banana 2 if available, otherwise the first model.
  defaultId() {
    const list = this.list();
    return (list.find((m) => /gemini-3\.1-flash-image/.test(m.id)) || list[0]).id;
  },
};
