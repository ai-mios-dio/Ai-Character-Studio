// Your saved characters. Each one is a name plus its sheets:
// usually a full-body 'body' sheet and a close-up 'face' sheet (older saves have one 'sheet').
// Stored in IndexedDB, the browser's built-in database, because images are too big
// for localStorage. Like everything else, it stays on this device only.

const Characters = {
  _db: null,
  _listeners: [],

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      // Version 2 adds 'examples' (gallery example pictures). Existing characters are kept.
      const req = indexedDB.open('character-studio', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('examples')) db.createObjectStore('examples');
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  // Runs one database action and waits for it to finish.
  async _do(mode, action, storeName = 'characters') {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const req = action(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  },

  // Older saves kept one image in `sheet`; newer ones keep a list in `images`.
  _normalise(c) {
    if (c && !c.images) c.images = c.sheet ? [{ kind: 'sheet', blob: c.sheet }] : [];
    return c;
  },

  // All characters, newest first.
  async list() {
    try {
      const all = await this._do('readonly', (store) => store.getAll());
      return (all || []).map((c) => this._normalise(c)).sort((a, b) => b.created - a.created);
    } catch {
      return []; // storage blocked (e.g. private browsing): behave as "no characters"
    }
  },

  async get(id) { return this._normalise(await this._do('readonly', (store) => store.get(id))); },

  // images: [{ kind: 'body' | 'face' | 'sheet', blob }]  (a single Blob also works)
  async add(name, images) {
    if (images instanceof Blob) images = [{ kind: 'sheet', blob: images }];
    const character = {
      id: 'c' + Date.now(),
      name: name.trim() || 'Unnamed character',
      images,
      thumb: await this.makeThumb(images[0].blob),
      created: Date.now(),
    };
    await this._do('readwrite', (store) => store.put(character));
    this._changed();
    return character;
  },

  async rename(id, name) {
    const c = await this.get(id);
    if (!c) return;
    c.name = name.trim() || c.name;
    await this._do('readwrite', (store) => store.put(c));
    this._changed();
  },

  async remove(id) {
    await this._do('readwrite', (store) => store.delete(id));
    this._changed();
  },

  // Other parts of the page (like the tool dropdowns) call this to hear about changes.
  onChange(fn) { this._listeners.push(fn); },
  _changed() { this._listeners.forEach((fn) => fn()); },

  // A small preview picture so lists load quickly.
  async makeThumb(blob, size = 240) {
    const img = await Cutter.loadImage(URL.createObjectURL(blob));
    const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  },
};

// Example pictures for gallery tiles (e.g. Outfit Gallery), keyed by tile id.
// Kept in the same on-device database as characters.
const Examples = {
  async get(id) {
    try { return await Characters._do('readonly', (store) => store.get(id), 'examples'); } catch { return null; }
  },
  set(id, blob) { return Characters._do('readwrite', (store) => store.put(blob, id), 'examples'); },
};
