// Backup & restore: saves everything this app keeps in the browser (saved characters with their
// outfits and heights, saved places, Outfit Gallery pictures, edited prompts and tool choices) into
// ONE file, and loads it back. Use it to move to a new web address or a new phone: the browser keeps
// data per website address, so a new address starts empty.
// The API key is NOT included (paste it again on the new address).

const Backup = {
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  },
  async dataUrlToBlob(url) { return (await fetch(url)).blob(); },

  // Turns every Blob inside a saved item into text (a data: URL) so it fits in a file, and back.
  async pack(value) {
    if (value instanceof Blob) return { __blob: await this.blobToDataUrl(value) };
    if (Array.isArray(value)) return Promise.all(value.map((v) => this.pack(v)));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = await this.pack(v);
      return out;
    }
    return value;
  },
  async unpack(value) {
    if (value && typeof value === 'object' && '__blob' in value) return this.dataUrlToBlob(value.__blob);
    if (Array.isArray(value)) return Promise.all(value.map((v) => this.unpack(v)));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = await this.unpack(v);
      return out;
    }
    return value;
  },

  async create() {
    const db = await StudioDB.open();
    const all = (store) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const s = tx.objectStore(store);
      const items = s.getAll(), keys = s.getAllKeys();
      tx.oncomplete = () => resolve(keys.result.map((k, i) => ({ key: k, value: items.result[i] })));
      tx.onerror = () => reject(tx.error);
    });
    const settings = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('cs.') && k !== 'cs.apiKey') settings[k] = localStorage.getItem(k);
    }
    return {
      app: 'AI Character Studio', version: 1, created: new Date().toISOString(),
      characters: await this.pack((await all('characters')).map((e) => e.value)),
      places: await this.pack((await all('places')).map((e) => e.value)),
      examples: await this.pack(await all('examples')),
      settings,
    };
  },

  async download(status) {
    setStatus(status, 'Making the backup…');
    try {
      const data = await this.create();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const name = `ai-character-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadUrl(URL.createObjectURL(blob), name);
      setStatus(status, `Saved ${name}: ${data.characters.length} character(s), ${data.places.length} place(s) (${(blob.size / 1048576).toFixed(1)} MB). Keep it somewhere safe.`, 'ok');
    } catch (err) {
      setStatus(status, 'Could not make the backup: ' + err.message, 'error');
    }
  },

  // Adds everything from a backup file. Items with the same id are replaced; nothing else is deleted.
  async restore(file, status) {
    setStatus(status, 'Restoring…');
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'AI Character Studio' || !data.version) throw new Error('this is not an AI Character Studio backup file');
      const put = async (store, value, key) => StudioDB.run(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key)));
      for (const item of await this.unpack(data.characters || [])) await put('characters', item);
      for (const item of await this.unpack(data.places || [])) await put('places', item);
      for (const e of data.examples || []) await put('examples', await this.unpack(e.value), e.key);
      for (const [k, v] of Object.entries(data.settings || {})) { try { localStorage.setItem(k, v); } catch { /* full */ } }
      Characters._changed();
      Places._changed();
      setStatus(status, `Restored ${data.characters?.length || 0} character(s) and ${data.places?.length || 0} place(s). Reloading…`, 'ok');
      setTimeout(() => location.reload(), 1500); // picks up restored settings and gallery pictures
    } catch (err) {
      setStatus(status, 'Could not restore: ' + err.message, 'error');
    }
  },
};

// Settings → Backup & restore
(() => {
  const status = document.getElementById('backupStatus');
  document.getElementById('backupMake').addEventListener('click', () => Backup.download(status));
  const input = document.getElementById('backupFile');
  input.addEventListener('change', () => { if (input.files[0]) Backup.restore(input.files[0], status); input.value = ''; });
})();
