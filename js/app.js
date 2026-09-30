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
//
// Main page -> 3 big buttons: Characters (hub), Places (hub), Create a Scene (tool).
// A tool's `section` says which hub it lives in ('characters' is the default, 'home' = main page).
// Tools with a `group` are reached through a small menu page inside their hub (e.g. Character Builder).
const SECTIONS = {
  characters: {
    title: 'Characters', sub: 'Build, dress, pose and save your characters',
    extra: [['characters', 'Saved Characters'], ['cutter', 'Pose Cutter']],
  },
  places: {
    title: 'Places', sub: 'Rooms and locations you can reuse',
    extra: [['places', 'Saved Places']],
  },
};
const GROUPS = { builder: 'Character Builder', sheets: 'Sheets', background: 'Background', outfit: 'Outfit' };
const GROUP_QUESTIONS = {
  builder: 'How do you want to design your character?',
  sheets: 'Which sheet do you want to make?',
  background: 'What do you want to do?',
  outfit: 'How do you want to choose the outfit?',
};
const sectionOf = (t) => t.section || 'characters';
const parentOf = (t) => (t.group ? t.group + '-menu' : sectionOf(t) === 'home' ? 'home' : sectionOf(t) + '-hub');

// The buttons on one hub page, in tool order, with each group shown once as its menu.
function hubPages(section) {
  const pages = [];
  for (const t of TOOLS.filter((x) => sectionOf(x) === section)) {
    if (!t.group) pages.push([t.id, t.title]);
    else if (!pages.some(([id]) => id === t.group + '-menu')) pages.push([t.group + '-menu', GROUPS[t.group]]);
  }
  return [...pages, ...(SECTIONS[section]?.extra || [])];
}

// Simple line icons (24x24, drawn with strokes) for the menu buttons. Unknown ids get the sparkle.
const ICONS = {
  characters: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  places: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  scene: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M7 6l2 4M12 6l2 4M17 6l2 4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  builder: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  sheets: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  background: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  outfit: '<path d="M8 3l4 3 4-3 5 4-3 4-2-1v11H8V10l-2 1-3-4z"/>',
  pose: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M6 9l6 2 6-2M9 21l3-7 3 7"/>',
  makeup: '<path d="M14 3l7 7-9 9H5v-7z"/><path d="M5 19l-2 2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  'character-scene': '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
  saved: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  cutter: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
};
// Which icon each page uses.
const ICON_FOR = {
  'characters-hub': 'characters', 'places-hub': 'places', 'create-scene': 'scene', settings: 'settings',
  'builder-menu': 'builder', 'sheets-menu': 'sheets', 'background-menu': 'background', 'outfit-menu': 'outfit',
  pose: 'pose', makeup: 'makeup', edit: 'edit', scene: 'character-scene', characters: 'saved', places: 'saved',
  cutter: 'cutter', 'place-builder': 'builder', 'place-sheet': 'sheets', 'place-video': 'video',
  // tools inside the menus
  builder: 'builder', blend: 'characters', describe: 'edit', sheet: 'sheets', 'sheet-inspired': 'builder',
  'outfit-sheet': 'outfit', 'replace-person': 'characters', outfit: 'background', 'outfit-gallery': 'sheets', 'outfit-describe': 'edit',
};
function iconEl(pageId) {
  return el('span', { className: 'btn-icon', 'aria-hidden': 'true',
    innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[ICON_FOR[pageId]] || ICONS.sparkle}</svg>` });
}

// Main page: logo, one big card per hub, then tools that live on the main page, then Settings.
function buildHome() {
  const box = $('homeButtons');
  const card = (href, title, sub) => el('a', { className: 'home-btn menu-btn home-card', href },
    iconEl(href.slice(1)),
    el('span', { className: 'menu-text' }, el('span', { className: 'menu-title' }, title), el('span', { className: 'menu-sub' }, sub)),
    el('span', { className: 'chev', 'aria-hidden': 'true', textContent: '›' }));
  for (const [key, sec] of Object.entries(SECTIONS)) box.append(card(`#${key}-hub`, sec.title, sec.sub));
  for (const t of TOOLS.filter((x) => sectionOf(x) === 'home')) box.append(card('#' + t.id, t.title, t.menuText || ''));
  box.append(el('a', { className: 'home-btn settings-btn', href: '#settings' }, iconEl('settings'), el('span', {}, 'Settings')));
}

// Hub pages (Characters, Places): a header and one button per tool or menu.
function buildHubs() {
  for (const [key, sec] of Object.entries(SECTIONS)) {
    $('content').insertBefore(
      el('section', { id: key + '-hub', className: 'section', dataset: { parent: 'home' } },
        pageHeader(sec.title),
        el('div', { className: 'home-buttons' }, hubPages(key).map(([id, title]) =>
          el('a', { className: 'home-btn hub-tile', href: '#' + id }, iconEl(id), el('span', {}, title))))),
      $('cutter'));
  }
}

// Builds each menu page: a header and one big button per tool in the group.
function buildGroupMenus() {
  for (const [group, title] of Object.entries(GROUPS)) {
    const tools = TOOLS.filter((t) => t.group === group);
    const buttons = tools.map((t) =>
      el('a', { className: 'home-btn menu-btn', href: '#' + t.id },
        iconEl(t.id),
        el('span', { className: 'menu-title' }, t.title),
        el('span', { className: 'menu-sub' }, t.menuText || '')));
    $('content').insertBefore(
      el('section', { id: group + '-menu', className: 'section', dataset: { parent: sectionOf(tools[0]) + '-hub' } },
        pageHeader(title),
        el('p', { className: 'hint' }, GROUP_QUESTIONS[group] || ''),
        el('div', { className: 'home-buttons' }, ...buttons)),
      $('cutter'));
  }
}

function showSection(id) {
  if (location.hash !== '#' + id) location.hash = id; // triggers route()
  else route();
}

let currentPage = null, lastPage = null;
function route() {
  let id = location.hash.slice(1) || 'home';
  if (!document.getElementById(id)?.classList.contains('section')) id = 'home';
  if (currentPage && currentPage !== id) leavePage(currentPage);
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  lastPage = currentPage;
  currentPage = id;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// Leaving a page resets it completely: uploads, typed text, results, picked characters, places,
// outfits, poses, dropdowns and tiles. Only the model and its settings are kept.
function leavePage(id) {
  if (ToolUI.tools[id]) ToolUI.clear(id, { quiet: true });
  if (id === 'cutter') clearCutter(true);
}

// Back button at the top of each page goes to the page above it (Home, or a menu page).
// If we just came from there, step back in history so the phone's own back button stays in sync.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-back]');
  if (!btn) return;
  const parent = btn.closest('.section')?.dataset.parent || 'home';
  if (lastPage === parent) history.back();
  else location.hash = parent;
});

function pageHeader(title) {
  return el('header', { className: 'page-head' },
    el('button', { className: 'back-btn', innerHTML: '&larr; Back', dataset: { back: '' } }),
    el('h2', {}, title));
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

$('safetyLevel').value = Store.getSafety();
$('safetyLevel').addEventListener('change', () => {
  Store.setSafety($('safetyLevel').value);
  setStatus($('safetyStatus'), 'Saved. Used by every tool from the next Run.', 'ok');
});

// ================ SAVED LIBRARIES (Characters, Places) ================
// Both pages are built from this description, so they work the same way.
const LIBRARY_PAGES = [
  {
    id: 'characters', title: 'Saved Characters', library: Characters, prefix: 'char', parent: 'characters-hub', noun: 'character', outfits: true, height: true,
    slots: [['body', 'Body sheet'], ['face', 'Face sheet']],
    intro: 'Your saved characters. Pick them in the Character box of the character tools and in Create a Scene. They are stored on this device only.',
    addHint: 'Give them a name and add their body sheet, face sheet, or both. You can also tap "Save both as a character" under a Character Sheet result.',
  },
  {
    id: 'places', title: 'Saved Places', library: Places, prefix: 'place', parent: 'places-hub', noun: 'place',
    notes: 'Room description (optional): layout wall by wall, furniture, colours, lighting',
    slots: [['views', 'Views sheet'], ['details', 'Details sheet']],
    intro: 'Your saved places (rooms and locations). Pick them in Create a Scene so the same place looks the same every time. They are stored on this device only.',
    addHint: 'Give it a name and add its views sheet, details sheet, or both. You can also tap "Save both as a place" under a Place Sheet result.',
  },
];
const cap = (w) => w[0].toUpperCase() + w.slice(1);

function buildLibraryPage(cfg) {
  const P = cfg.prefix;
  const files = {};
  const nameInput = el('input', { type: 'text', id: P + 'Name', placeholder: `${cap(cfg.noun)} name` });
  const status = el('div', { className: 'status', id: P + 'Status' });
  const cols = cfg.slots.map(([kind, label]) => {
    const input = el('input', { type: 'file', id: `${P}${cap(kind)}File`, accept: 'image/*', 'aria-label': label });
    const text = el('span', { id: `${P}${cap(kind)}Text` }, label);
    const zone = el('div', { className: 'dropzone mini', id: `${P}${cap(kind)}Drop` }, input, text);
    setupDropzone(zone, input, (list) => {
      files[kind] = list[0] || null;
      text.textContent = files[kind] ? `${label} ✓` : label;
    });
    return el('div', { className: 'upload-col' }, zone);
  });
  const notesInput = cfg.notes ? el('textarea', { id: P + 'Notes', rows: 3, placeholder: cfg.notes }) : null;
  const heightInput = cfg.height ? el('input', { type: 'text', id: P + 'Height', placeholder: `Height (optional), e.g. 5'4" or 163 cm` }) : null;
  const addBtn = el('button', { className: 'primary', id: P + 'Add', textContent: `Save ${cfg.noun}` });
  addBtn.addEventListener('click', async () => {
    if (!nameInput.value.trim()) return setStatus(status, 'Type a name first.', 'error');
    const images = cfg.slots.filter(([k]) => files[k]).map(([kind]) => ({ kind, blob: files[kind] }));
    if (!images.length) return setStatus(status, `Add a ${cfg.slots.map(([, l]) => l.toLowerCase()).join(', a ')}, or both.`, 'error');
    try {
      await cfg.library.add(nameInput.value, images, notesInput ? notesInput.value.trim() : '', heightInput ? heightInput.value : '');
      setStatus(status, `Saved "${nameInput.value.trim()}".`, 'ok');
      nameInput.value = '';
      if (notesInput) notesInput.value = '';
      if (heightInput) heightInput.value = '';
      cfg.slots.forEach(([kind, label]) => { files[kind] = null; $(`${P}${cap(kind)}Text`).textContent = label; });
    } catch (err) {
      setStatus(status, 'Could not save: ' + err.message, 'error');
    }
  });
  cfg.list = el('div', { id: P + 'List', className: 'char-list' });
  $('content').insertBefore(
    el('section', { id: cfg.id, className: 'section', dataset: { parent: cfg.parent } },
      pageHeader(cfg.title),
      el('p', { className: 'hint' }, cfg.intro),
      el('div', { className: 'card' },
        el('div', { className: 'label' }, `Add a ${cfg.noun}`),
        el('p', { className: 'hint small input-hint' }, cfg.addHint),
        nameInput,
        heightInput || '',
        el('div', { className: 'upload-pair' }, ...cols),
        notesInput || '',
        addBtn, status),
      cfg.list),
    $('cutter'));
  cfg.library.onChange(() => renderLibrary(cfg));
  renderLibrary(cfg);
}

async function renderLibrary(cfg) {
  const box = cfg.list;
  const list = await cfg.library.list();
  box.innerHTML = '';
  if (!list.length) {
    box.append(el('p', { className: 'hint' }, `No ${cfg.noun}s yet. Add one above.`));
    return;
  }
  const kinds = Object.fromEntries([...cfg.slots, ['sheet', 'Sheet']]);
  for (const item of list) {
    const name = el('input', { type: 'text', value: item.name, 'aria-label': `${cap(cfg.noun)} name` });
    const notes = cfg.notes ? el('textarea', { rows: 3, value: item.notes || '', placeholder: cfg.notes, 'aria-label': 'Description' }) : null;
    const height = cfg.height ? el('input', { type: 'text', value: item.height || '', placeholder: `Height, e.g. 5'4" or 163 cm`, 'aria-label': 'Height' }) : null;
    const rename = el('button', { className: 'small-btn', textContent: cfg.notes || cfg.height ? 'Save changes' : 'Rename' });
    rename.addEventListener('click', () => cfg.library.rename(item.id, name.value, notes ? notes.value : undefined, height ? height.value : undefined));
    // Delete asks for a second tap instead of a pop-up.
    const del = el('button', { className: 'small-btn danger', textContent: 'Delete' });
    del.addEventListener('click', () => {
      if (del.dataset.armed) return cfg.library.remove(item.id);
      del.dataset.armed = '1';
      del.textContent = 'Tap again to delete';
      setTimeout(() => { delete del.dataset.armed; del.textContent = 'Delete'; }, 4000);
    });
    const has = item.images.map((img) => kinds[img.kind] || img.kind).join(' + ');
    box.append(el('div', { className: 'char-card' },
      el('img', { src: item.thumb, alt: item.name }),
      el('div', { className: 'char-info' }, name, height || '', el('div', { className: 'hint small' }, has), notes || '', el('div', { className: 'row' }, rename, del)),
      cfg.outfits ? outfitsBox(cfg, item) : ''));
  }
}

// A character's outfits: each one is a full-body sheet of them wearing it, picked in Create a Scene.
function outfitsBox(cfg, item) {
  const list = el('div', { className: 'outfit-list' });
  for (const o of item.outfits) {
    const del = el('button', { className: 'small-btn danger', textContent: 'Delete' });
    del.addEventListener('click', () => {
      if (del.dataset.armed) return cfg.library.removeOutfit(item.id, o.id);
      del.dataset.armed = '1';
      del.textContent = 'Tap again';
      setTimeout(() => { delete del.dataset.armed; del.textContent = 'Delete'; }, 4000);
    });
    list.append(el('div', { className: 'outfit-item' }, el('img', { src: o.thumb, alt: o.name }), el('div', { className: 'outfit-name' }, o.name), del));
  }
  let file = null;
  const name = el('input', { type: 'text', placeholder: 'Outfit name (e.g. Red dress)', 'aria-label': 'Outfit name' });
  const input = el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Outfit body sheet' });
  const text = el('span', {}, 'Outfit body sheet');
  const zone = el('div', { className: 'dropzone mini' }, input, text);
  setupDropzone(zone, input, (files) => { file = files[0] || null; text.textContent = file ? 'Outfit body sheet ✓' : 'Outfit body sheet'; });
  const add = el('button', { className: 'small-btn', textContent: 'Add outfit' });
  const status = el('div', { className: 'status' });
  add.addEventListener('click', async () => {
    if (!name.value.trim()) { name.focus(); return setStatus(status, 'Type an outfit name first.', 'error'); }
    if (!file) return setStatus(status, 'Add the body sheet of them wearing this outfit.', 'error');
    try { await cfg.library.addOutfit(item.id, name.value, file); } catch (err) { setStatus(status, 'Could not save: ' + err.message, 'error'); }
  });
  // Stay open after the list redraws (e.g. right after adding an outfit).
  cfg.openOutfits = cfg.openOutfits || new Set();
  const box = el('details', { className: 'outfits', open: cfg.openOutfits.has(item.id) });
  box.addEventListener('toggle', () => { if (box.open) cfg.openOutfits.add(item.id); else cfg.openOutfits.delete(item.id); });
  box.append(
    el('summary', {}, `Outfits (${item.outfits.length})`),
    el('p', { className: 'hint small' }, 'Each outfit is its own body sheet of this character wearing it. Make one with Sheets → Outfit Sheet, or upload one here.'),
    list, name, zone, add, status);
  return box;
}

// Keep every tool's dropdowns up to date when characters or places change.
for (const lib of Object.values(LIBRARIES)) {
  lib.onChange(() => Object.keys(ToolUI.tools).forEach((id) => { ToolUI.fillSavedPicker(id); ToolUI.fillLibraryPickers(id); }));
}

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
function clearCutter(quiet = false) {
  cutSources = [];
  cutOutputs = [];
  $('cutResults').innerHTML = '';
  $('cutZip').disabled = true;
  renderCutSources();
  setStatus($('cutStatus'), quiet ? '' : 'Cleared.', quiet ? '' : 'ok');
}
$('cutClear').addEventListener('click', () => clearCutter());

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
buildHubs();
buildGroupMenus();
LIBRARY_PAGES.forEach(buildLibraryPage);
$('cutter').dataset.parent = 'characters-hub';
const cutterSection = $('cutter');
for (const def of TOOLS) {
  $('content').insertBefore(ToolUI.build(def), cutterSection);
  $('promptEditors').append(...ToolUI.buildPromptEditors(def.id));
}
// Every tool starts fresh after a reload too (older versions remembered picks between visits).
for (const id of Object.keys(ToolUI.tools)) ToolUI.clear(id, { quiet: true });
$('apiKey').value = Store.getApiKey();
renderModelsTable();
route();

// Quietly refresh the model list once a day if we have a key.
if (Store.getApiKey() && Date.now() - (Models.loadedAt() || 0) > 24 * 3600 * 1000) {
  refreshModels($('modelsStatus'));
}
