// Wires the page together: menu, settings, Pose Cutter, and start-up.

const $ = (id) => document.getElementById(id);

function setStatus(elm, msg, kind = '') {
  elm.textContent = msg;
  elm.className = 'status' + (kind ? ' ' + kind : '');
}

// "hero.png" -> "hero"
const baseName = (name) => name.replace(/\.[^.]+$/, '') || 'image';

function downloadUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// Makes a drop area highlight while dragging and call `onFiles` with the chosen images.
function setupDropzone(zone, input, onFiles) {
  input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    onFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  });
}

// ---------------- Pages ----------------
// Each page has its own address (#sheet, #settings...), so the phone's back button works.
const PAGES = () => [...TOOLS.map((t) => [t.id, t.title]), ['characters', 'Characters'], ['cutter', 'Pose Cutter']];

function showSection(id) {
  if (location.hash !== '#' + id) location.hash = id; // triggers route()
  else route();
}

let currentPage = null, lastPage = null;
function route() {
  let id = location.hash.slice(1) || 'home';
  if (!document.getElementById(id)?.classList.contains('section')) id = 'home';
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  lastPage = currentPage;
  currentPage = id;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// Back button at the top of each page. If we got here from Home, step back in history
// (keeps the phone's own back button in sync); otherwise just open Home.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-back]')) return;
  if (lastPage === 'home') history.back();
  else location.hash = 'home';
});

function pageHeader(title) {
  return el('header', { className: 'page-head' },
    el('button', { className: 'back-btn', innerHTML: '&larr; Back', dataset: { back: '' } }),
    el('h2', {}, title));
}

function buildHome() {
  const box = $('homeButtons');
  for (const [id, title] of PAGES()) {
    const btn = el('a', { className: 'home-btn', href: '#' + id, textContent: title });
    box.append(btn);
  }
  box.append(el('a', { className: 'home-btn settings-btn', href: '#settings', textContent: 'Settings' }));
}

// ================ SETTINGS ================
function renderModelsTable() {
  const box = $('modelsTable');
  box.innerHTML = '';
  for (const m of Models.list()) {
    const rows = [
      ['Reference images', `up to ${m.maxRefs}`],
      ['Image sizes', m.imageSizes.join(', ') || 'Default only'],
      ['Aspect ratios', m.aspectRatios.join(', ')],
    ];
    if (m.thinkingLevels.length) rows.push(['Thinking', m.thinkingLevels.join(', ')]);
    if (m.search) rows.push(['Google Search', 'Yes']);
    if (m.maxTemperature != null) rows.push(['Temperature', `0 to ${m.maxTemperature} (default ${m.temperature})`]);
    if (m.inputTokenLimit) rows.push(['Input limit', `${m.inputTokenLimit.toLocaleString()} tokens`]);
    box.append(el('div', { className: 'model-card' },
      el('div', { className: 'model-name' }, m.label, m.nickname && m.nickname !== m.label ? ` (${m.nickname})` : ''),
      el('code', {}, m.id),
      m.description ? el('p', { className: 'hint small' }, m.description) : '',
      el('dl', {}, rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)])),
      m.confirmed ? '' : el('p', { className: 'hint small warn' }, 'New model: image options are a best guess.'),
    ));
  }
  const at = Models.loadedAt();
  $('modelsLoaded').textContent = at
    ? `Loaded from Google on ${new Date(at).toLocaleString()}. Only models that accept reference images are shown.`
    : 'Showing the built-in list. Save your API key to load the models your key can actually use.';
}

async function refreshModels(statusEl) {
  const key = Store.getApiKey();
  if (!key) return setStatus(statusEl, 'Add your API key first.', 'error');
  setStatus(statusEl, 'Loading models from Google…');
  try {
    const models = await Models.refresh(key);
    renderModelsTable();
    Object.keys(ToolUI.tools).forEach((id) => ToolUI.renderModelSelect(id));
    setStatus(statusEl, `Found ${models.length} image model${models.length === 1 ? '' : 's'}.`, 'ok');
  } catch (err) {
    setStatus(statusEl, 'Error: ' + err.message, 'error');
  }
}

$('settingsSave').addEventListener('click', () => {
  Store.setApiKey($('apiKey').value.trim());
  refreshModels($('settingsStatus'));
});
$('modelsRefresh').addEventListener('click', () => refreshModels($('modelsStatus')));

// ================ CHARACTERS ================
// The two sheets being added: body (full-body views) and face (close-ups).
const charFiles = { body: null, face: null };
const CHAR_SLOTS = { body: ['charBodyDrop', 'charBodyFile', 'charBodyText', 'Body sheet'], face: ['charFaceDrop', 'charFaceFile', 'charFaceText', 'Face sheet'] };
for (const [kind, [drop, input, text, label]] of Object.entries(CHAR_SLOTS)) {
  setupDropzone($(drop), $(input), (files) => {
    charFiles[kind] = files[0] || null;
    $(text).textContent = charFiles[kind] ? `${label} ✓` : label;
  });
}

$('charAdd').addEventListener('click', async () => {
  const status = $('charStatus');
  if (!$('charName').value.trim()) return setStatus(status, 'Type a name first.', 'error');
  const images = Object.entries(charFiles).filter(([, f]) => f).map(([kind, blob]) => ({ kind, blob }));
  if (!images.length) return setStatus(status, 'Add a body sheet, a face sheet, or both.', 'error');
  try {
    await Characters.add($('charName').value, images);
    setStatus(status, `Saved "${$('charName').value.trim()}".`, 'ok');
    $('charName').value = '';
    for (const [kind, [, , text, label]] of Object.entries(CHAR_SLOTS)) { charFiles[kind] = null; $(text).textContent = label; }
  } catch (err) {
    setStatus(status, 'Could not save: ' + err.message, 'error');
  }
});

async function renderCharacters() {
  const box = $('charList');
  const list = await Characters.list();
  box.innerHTML = '';
  if (!list.length) {
    box.append(el('p', { className: 'hint' }, 'No characters yet. Add one above.'));
    return;
  }
  for (const c of list) {
    const name = el('input', { type: 'text', value: c.name, 'aria-label': 'Character name' });
    const rename = el('button', { className: 'small-btn', textContent: 'Rename' });
    rename.addEventListener('click', () => Characters.rename(c.id, name.value));
    // Delete asks for a second tap instead of a pop-up.
    const del = el('button', { className: 'small-btn danger', textContent: 'Delete' });
    del.addEventListener('click', () => {
      if (del.dataset.armed) return Characters.remove(c.id);
      del.dataset.armed = '1';
      del.textContent = 'Tap again to delete';
      setTimeout(() => { delete del.dataset.armed; del.textContent = 'Delete'; }, 4000);
    });
    const kinds = { body: 'Body sheet', face: 'Face sheet', sheet: 'Sheet' };
    const has = c.images.map((img) => kinds[img.kind] || img.kind).join(' + ');
    box.append(el('div', { className: 'char-card' },
      el('img', { src: c.thumb, alt: c.name }),
      el('div', { className: 'char-info' }, name, el('div', { className: 'hint small' }, has), el('div', { className: 'row' }, rename, del))));
  }
}

// Keep this page and every tool's dropdown up to date when characters change.
Characters.onChange(() => {
  renderCharacters();
  Object.keys(ToolUI.tools).forEach((id) => ToolUI.fillSavedPicker(id));
});

// ================ POSE CUTTER ================
let cutSources = [];   // image files waiting to be cut
let cutOutputs = [];   // [{ sheet, files: [{ name, blob }] }]

setupDropzone($('cutDrop'), $('cutFiles'), (files) => addCutSources(files));
function addCutSources(files) {
  cutSources.push(...files);
  renderCutSources();
}
function renderCutSources() {
  const box = $('cutThumbs');
  box.innerHTML = '';
  cutSources.forEach((f, i) => {
    const img = el('img', { src: URL.createObjectURL(f), title: `${f.name} (tap to remove)` });
    img.addEventListener('click', () => { cutSources.splice(i, 1); renderCutSources(); });
    box.append(img);
  });
  setStatus($('cutStatus'), cutSources.length ? `${cutSources.length} sheet(s) ready.` : '');
}
$('cutClear').addEventListener('click', () => {
  cutSources = [];
  cutOutputs = [];
  $('cutResults').innerHTML = '';
  $('cutZip').disabled = true;
  renderCutSources();
  setStatus($('cutStatus'), 'Cleared.', 'ok');
});

// Show the current slider values next to each slider.
[['cutTol', 'tolOut'], ['cutMerge', 'mergeOut'], ['cutMin', 'minOut'], ['cutPad', 'padOut']].forEach(([inp, out]) => {
  $(inp).addEventListener('input', () => { $(out).textContent = $(inp).value; });
});

const canvasToBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));

$('cutRun').addEventListener('click', async () => {
  const status = $('cutStatus');
  if (!cutSources.length) { setStatus(status, 'Add at least one character sheet.', 'error'); return; }

  const opts = {
    tolerance: +$('cutTol').value,
    merge: +$('cutMerge').value,
    minPercent: +$('cutMin').value,
    padding: +$('cutPad').value,
    transparent: $('cutTransparent').checked,
  };
  $('cutRun').disabled = true;
  $('cutZip').disabled = true;
  $('cutResults').innerHTML = '';
  cutOutputs = [];
  let total = 0;

  for (const [n, file] of cutSources.entries()) {
    setStatus(status, `Processing ${n + 1} of ${cutSources.length}: ${file.name}…`);
    await new Promise((r) => setTimeout(r, 20)); // let the page redraw the message
    try {
      const img = await Cutter.loadImage(URL.createObjectURL(file));
      const pieces = await Cutter.cut(img, opts);
      const base = baseName(file.name);
      const files = [];
      for (const [i, p] of pieces.entries()) {
        files.push({ name: `${base}_${String(i + 1).padStart(2, '0')}.png`, blob: await canvasToBlob(p.canvas) });
      }
      cutOutputs.push({ sheet: base, files });
      renderCutGroup(file.name, files);
      total += files.length;
    } catch (err) {
      renderCutGroup(file.name, [], err.message);
    }
  }

  setStatus(status, `Done: found ${total} figure${total === 1 ? '' : 's'} in ${cutSources.length} sheet(s).`, 'ok');
  $('cutRun').disabled = false;
  $('cutZip').disabled = total === 0;
});

function renderCutGroup(title, files, error) {
  const grid = el('div', { className: 'cut-grid' });
  for (const f of files) {
    const url = URL.createObjectURL(f.blob);
    const dl = el('button', { className: 'small-btn', textContent: 'Download' });
    dl.addEventListener('click', () => downloadUrl(url, f.name));
    grid.append(el('div', { className: 'cut' }, el('img', { src: url }), el('div', { className: 'name' }, f.name), dl));
  }
  $('cutResults').append(el('div', { className: 'sheet-group' },
    el('h3', {}, error ? `${title}: error: ${error}` : `${title}: ${files.length} figure(s)`),
    grid));
}

$('cutZip').addEventListener('click', async () => {
  const all = cutOutputs.flatMap((o) => o.files.map((f) => ({ ...f, folder: o.sheet })));
  if (typeof JSZip === 'undefined') {
    // No internet for the zip library: fall back to downloading each file.
    for (const f of all) downloadUrl(URL.createObjectURL(f.blob), f.name);
    return;
  }
  const zip = new JSZip();
  for (const f of all) zip.folder(f.folder).file(f.name, f.blob);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadUrl(URL.createObjectURL(blob), 'cutouts.zip');
});

// ---------------- Start up ----------------
buildHome();
const cutterSection = $('cutter');
for (const def of TOOLS) {
  $('content').insertBefore(ToolUI.build(def), cutterSection);
  $('promptEditors').append(...ToolUI.buildPromptEditors(def.id));
}
$('apiKey').value = Store.getApiKey();
renderModelsTable();
renderCharacters();
route();

// Quietly refresh the model list once a day if we have a key.
if (Store.getApiKey() && Date.now() - (Models.loadedAt() || 0) > 24 * 3600 * 1000) {
  refreshModels($('modelsStatus'));
}
