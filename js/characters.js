// Your saved characters. Each one is a name plus its character sheet image.
// Stored in IndexedDB, the browser's built-in database, because images are too big
// for localStorage. Like everything else, it stays on this device only.

const Characters = {
  _db: null,
  _listeners: [],

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('character-studio', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('characters', { keyPath: 'id' });
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  // Runs one database action and waits for it to finish.
  async _do(mode, action) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', mode);
      const req = action(tx.objectStore('characters'));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  },

  // All characters, newest first.
  async list() {
    try {
      const all = await this._do('readonly', (store) => store.getAll());
      return (all || []).sort((a, b) => b.created - a.created);
    } catch {
      return []; // storage blocked (e.g. private browsing): behave as "no characters"
    }
  },

  get(id) { return this._do('readonly', (store) => store.get(id)); },

  async add(name, sheetBlob) {
    const character = {
      id: 'c' + Date.now(),
      name: name.trim() || 'Unnamed character',
      sheet: sheetBlob,
      thumb: await this.makeThumb(sheetBlob),
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
