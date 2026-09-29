// Wires the page together: menu, file inputs, buttons.

const $ = (id) => document.getElementById(id);

function setStatus(el, msg, kind = '') {
  el.textContent = msg;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

// "hero.png" -> "hero"
const baseName = (name) => name.replace(/\.[^.]+$/, '') || 'image';

function downloadUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// ---------------- Menu ----------------
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});
function showSection(id) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.section === id));
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
}

// Makes a drop area highlight while dragging and call `onFiles` with the chosen images.
function setupDropzone(zoneId, inputId, onFiles) {
  const zone = $(zoneId), input = $(inputId);
  input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    onFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  });
}

// ================ SETTINGS ================
function loadSettingsForm() {
  const s = Storage.getSettings();
  $('apiKey').value = s.apiKey;
  $('modelId').value = s.model;
}
$('settingsSave').addEventListener('click', () => {
  Storage.saveSettings({ apiKey: $('apiKey').value.trim(), model: $('modelId').value.trim() });
  setStatus($('settingsStatus'), 'Saved.', 'ok');
});

// ================ PROMPT LIBRARY ================
let prompts = Storage.getPrompts();

function fillPromptSelects(selectedId) {
  for (const sel of [$('sheetPreset'), $('promptPick')]) {
    const keep = selectedId || sel.value;
    sel.innerHTML = '';
    for (const p of prompts) sel.add(new Option(p.name, p.id));
    if (prompts.some((p) => p.id === keep)) sel.value = keep;
  }
  loadPromptEditor();
  loadSheetPrompt();
}
function loadPromptEditor() {
  const p = prompts.find((x) => x.id === $('promptPick').value);
  $('promptName').value = p ? p.name : '';
  $('promptText').value = p ? p.text : '';
}
$('promptPick').addEventListener('change', loadPromptEditor);

$('promptSave').addEventListener('click', () => {
  const name = $('promptName').value.trim();
  if (!name) return setStatus($('promptStatus'), 'Give the prompt a name first.', 'error');
  let p = prompts.find((x) => x.id === $('promptPick').value);
  if (!p) { p = { id: 'p' + Date.now() }; prompts.push(p); }
  p.name = name;
  p.text = $('promptText').value;
  Storage.savePrompts(prompts);
  fillPromptSelects(p.id);
  setStatus($('promptStatus'), 'Saved.', 'ok');
});
$('promptNew').addEventListener('click', () => {
  $('promptPick').value = '';
  $('promptName').value = '';
  $('promptText').value = '';
  $('promptName').focus();
  setStatus($('promptStatus'), 'Type a name and prompt, then Save.');
});
$('promptDelete').addEventListener('click', () => {
  const id = $('promptPick').value;
  if (!id || !confirm('Delete this prompt?')) return;
  prompts = prompts.filter((p) => p.id !== id);
  Storage.savePrompts(prompts);
  prompts = Storage.getPrompts(); // brings the default back if the list is now empty
  fillPromptSelects();
  setStatus($('promptStatus'), 'Deleted.', 'ok');
});

// ================ CHARACTER SHEET ================
let sheetFiles = [];

setupDropzone('sheetDrop', 'sheetFiles', (files) => {
  sheetFiles.push(...files);
  renderSheetThumbs();
});
function renderSheetThumbs() {
  const box = $('sheetThumbs');
  box.innerHTML = '';
  sheetFiles.forEach((f, i) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.title = `${f.name} (click to remove)`;
    img.style.cursor = 'pointer';
    img.onclick = () => { sheetFiles.splice(i, 1); renderSheetThumbs(); };
    box.append(img);
  });
}

function loadSheetPrompt() {
  const p = prompts.find((x) => x.id === $('sheetPreset').value);
  $('sheetPrompt').value = p ? p.text : '';
}
$('sheetPreset').addEventListener('change', loadSheetPrompt);

// Puts the "extra details" where {details} is, or at the end if there's no {details}.
function buildPrompt(template, details) {
  details = details.trim();
  if (template.includes('{details}')) return template.replaceAll('{details}', details).trim();
  return details ? `${template.trim()}\n\n${details}` : template.trim();
}

$('sheetGenerate').addEventListener('click', async () => {
  const status = $('sheetStatus');
  const { apiKey, model } = Storage.getSettings();
  if (!apiKey) { setStatus(status, 'Add your Gemini API key in Settings first.', 'error'); return; }
  if (!sheetFiles.length) { setStatus(status, 'Add at least one reference image.', 'error'); return; }

  const btn = $('sheetGenerate');
  btn.disabled = true;
  setStatus(status, 'Generating… this can take up to a minute.');
  try {
    const images = await Gemini.generate({
      apiKey, model,
      prompt: buildPrompt($('sheetPrompt').value, $('sheetDetails').value),
      files: sheetFiles,
      aspectRatio: $('sheetAspect').value,
      imageSize: $('sheetSize').value,
    });
    images.forEach(addSheetResult);
    setStatus(status, `Done — ${images.length} image${images.length > 1 ? 's' : ''} generated.`, 'ok');
  } catch (err) {
    setStatus(status, 'Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

function addSheetResult(dataUrl) {
  const name = `character-sheet_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  const item = document.createElement('div');
  item.className = 'result-item';
  const img = document.createElement('img');
  img.src = dataUrl;
  const dl = document.createElement('button');
  dl.textContent = 'Download';
  dl.onclick = () => downloadUrl(dataUrl, name);
  const send = document.createElement('button');
  send.className = 'primary';
  send.textContent = 'Send to Pose Cutter';
  send.onclick = () => {
    addCutSources([{ name, src: dataUrl }]);
    showSection('cutter');
  };
  item.append(img, dl, send);
  $('sheetResults').prepend(item);
}

// ================ POSE CUTTER ================
let cutSources = [];   // [{ name, src }] images waiting to be cut
let cutOutputs = [];   // [{ sheet, files: [{ name, blob }] }]

setupDropzone('cutDrop', 'cutFiles', (files) => {
  addCutSources(files.map((f) => ({ name: f.name, src: URL.createObjectURL(f) })));
});
function addCutSources(list) {
  cutSources.push(...list);
  renderCutSources();
}
function renderCutSources() {
  const box = $('cutThumbs');
  box.innerHTML = '';
  cutSources.forEach((s, i) => {
    const img = document.createElement('img');
    img.src = s.src;
    img.title = `${s.name} (click to remove)`;
    img.style.cursor = 'pointer';
    img.onclick = () => { cutSources.splice(i, 1); renderCutSources(); };
    box.append(img);
  });
  setStatus($('cutStatus'), cutSources.length ? `${cutSources.length} sheet(s) ready.` : '');
}
$('cutClear').addEventListener('click', () => { cutSources = []; renderCutSources(); });

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

  for (const [n, src] of cutSources.entries()) {
    setStatus(status, `Processing ${n + 1} of ${cutSources.length}: ${src.name}…`);
    await new Promise((r) => setTimeout(r, 20)); // let the page redraw the message
    try {
      const img = await Cutter.loadImage(src.src);
      const pieces = await Cutter.cut(img, opts);
      const base = baseName(src.name);
      const files = [];
      for (const [i, p] of pieces.entries()) {
        files.push({ name: `${base}_${String(i + 1).padStart(2, '0')}.png`, blob: await canvasToBlob(p.canvas) });
      }
      cutOutputs.push({ sheet: base, files });
      renderCutGroup(src.name, files);
      total += files.length;
    } catch (err) {
      renderCutGroup(src.name, [], err.message);
    }
  }

  setStatus(status, `Done — found ${total} figure${total === 1 ? '' : 's'} in ${cutSources.length} sheet(s).`, 'ok');
  $('cutRun').disabled = false;
  $('cutZip').disabled = total === 0;
});

function renderCutGroup(title, files, error) {
  const group = document.createElement('div');
  group.className = 'sheet-group';
  const h = document.createElement('h3');
  h.textContent = error ? `${title} — error: ${error}` : `${title} — ${files.length} figure(s)`;
  const grid = document.createElement('div');
  grid.className = 'cut-grid';
  for (const f of files) {
    const url = URL.createObjectURL(f.blob);
    const card = document.createElement('div');
    card.className = 'cut';
    const img = document.createElement('img');
    img.src = url;
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = f.name;
    const dl = document.createElement('button');
    dl.className = 'small-btn';
    dl.textContent = 'Download';
    dl.onclick = () => downloadUrl(url, f.name);
    card.append(img, name, dl);
    grid.append(card);
  }
  group.append(h, grid);
  $('cutResults').append(group);
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
loadSettingsForm();
fillPromptSelects();
