// Saved libraries: Characters and Places. Each item is a name plus its sheets:
//   Characters: a full-body 'body' sheet and a close-up 'face' sheet (older saves have one 'sheet').
//   Places:     a 'views' sheet (the room from several camera spots) and a 'details' sheet (close-ups).
// Stored in IndexedDB, the browser's built-in database, because images are too big
// for localStorage. Like everything else, it stays on this device only.

const StudioDB = {
  _db: null,

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      // v2 added 'examples' (gallery pictures), v3 adds 'places'. Existing data is kept.
      const req = indexedDB.open('character-studio', 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('examples')) db.createObjectStore('examples');
        if (!db.objectStoreNames.contains('places')) db.createObjectStore('places', { keyPath: 'id' });
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  // Runs one database action on one store and waits for it to finish.
  async run(storeName, mode, action) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const req = action(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  },
};

// Makes a library (list of saved items) stored in one database store.
function makeLibrary(storeName, idPrefix) {
  return {
    _listeners: [],
    _do(mode, action) { return StudioDB.run(storeName, mode, action); },

    // Older character saves kept one image in `sheet`; newer ones keep a list in `images`.
    _normalise(item) {
      if (item && !item.images) item.images = item.sheet ? [{ kind: 'sheet', blob: item.sheet }] : [];
      return item;
    },

    // All items, newest first.
    async list() {
      try {
        const all = await this._do('readonly', (store) => store.getAll());
        return (all || []).map((i) => this._normalise(i)).sort((a, b) => b.created - a.created);
      } catch {
        return []; // storage blocked (e.g. private browsing): behave as "nothing saved"
      }
    },

    async get(id) { return this._normalise(await this._do('readonly', (store) => store.get(id))); },

    // images: [{ kind, blob }]  (a single Blob also works)
    async add(name, images, notes = '') {
      if (images instanceof Blob) images = [{ kind: 'sheet', blob: images }];
      const item = {
        id: idPrefix + Date.now(),
        name: name.trim() || 'Unnamed',
        images,
        notes: notes || '',
        thumb: await this.makeThumb(images[0].blob),
        created: Date.now(),
      };
      await this._do('readwrite', (store) => store.put(item));
      this._changed();
      return item;
    },

    async rename(id, name, notes) {
      const item = await this.get(id);
      if (!item) return;
      item.name = name.trim() || item.name;
      if (notes !== undefined) item.notes = notes.trim();
      await this._do('readwrite', (store) => store.put(item));
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
}

const Characters = makeLibrary('characters', 'c');
const Places = makeLibrary('places', 'p');
const LIBRARIES = { characters: Characters, places: Places };

// Example pictures for gallery tiles (e.g. Outfit Gallery), keyed by tile id.
const Examples = {
  async get(id) {
    try { return await StudioDB.run('examples', 'readonly', (store) => store.get(id)); } catch { return null; }
  },
  set(id, blob) { return StudioDB.run('examples', 'readwrite', (store) => store.put(blob, id)); },
};
