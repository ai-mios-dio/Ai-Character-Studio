// Builds the page section for each tool in TOOLS (see tools.js).

// Small helper to create elements: el('div', { className: 'x' }, child1, child2...)
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

const ToolUI = {
  tools: {},        // id -> { def, state, refs }

  build(def) {
    const saved = Store.getTool(def.id);
    const state = {
      model: saved.model || Models.defaultId(),
      options: saved.options || { ...(def.defaultOptions || {}) },
      prompt: saved.prompt || null,     // null = use the default prompt
      prompts: saved.prompts || {},     // tools with several outputs: one edited prompt per output
      closeness: saved.closeness || {}, // Character Builder: how closely to follow each part
      fields: saved.fields || {},       // Build from Description: the chosen dropdown values
      inputs: Object.fromEntries(def.inputs.map((i) => [i.key, []])),
      savedCharacter: '',               // id of the picked saved character, '' = none
    };
    const refs = {};
    const save = () => Store.setTool(def.id, { model: state.model, options: state.options, prompt: state.prompt, prompts: state.prompts, closeness: state.closeness, fields: state.fields });

    // ----- Model picker -----
    refs.model = el('select', { id: `${def.id}-model` });
    refs.modelInfo = el('div', { className: 'model-info' });
    refs.options = el('div', { className: 'options-grid' });
    refs.model.addEventListener('change', () => {
      state.model = refs.model.value;
      save();
      this.renderModelDetails(def.id);
    });
    refs.quick = el('div', { className: 'quick-row' });
    refs.options.hidden = true;
    const modelCard = el('div', { className: 'card' },
      el('label', { className: 'label', htmlFor: `${def.id}-model` }, 'Model'),
      refs.model,
      refs.modelInfo,
      refs.quick,
      refs.options,
    );

    // ----- Upload boxes -----
    const inputCards = def.inputs.map((inp) => {
      if (inp.type === 'saved') return null; // drawn inside the Character card
      if (inp.orSaved) return this.buildCharacterCard(def, inp, def.inputs.find((i) => i.type === 'saved'), state, refs);
      const thumbs = el('div', { className: 'thumbs' });
      refs['thumbs-' + inp.key] = thumbs;
      const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, id: `${def.id}-${inp.key}-files` });
      const zone = el('div', { className: 'dropzone' }, fileInput, el('span', {}, 'Tap to add image(s)'));
      setupDropzone(zone, fileInput, (files) => this.addInputs(def.id, inp.key, files));
      return el('div', { className: 'card' },
        el('div', { className: 'label' }, inp.label),
        inp.hint ? el('p', { className: 'hint small input-hint' }, inp.hint) : '',
        inp.closeness ? this.closenessSwitch(def.id, inp, state) : '',
        zone, thumbs);
    });

    // ----- Similarity switches not tied to one upload box -----
    let controlsCard = null;
    if (def.closenessControls) {
      controlsCard = el('div', { className: 'card' },
        el('div', { className: 'label' }, 'How similar should the new character be?'),
        ...def.closenessControls.map((c) => this.closenessSwitch(def.id, c, state, c.label)));
    }

    // ----- Dropdown choices (Build from Description) -----
    let fieldsCard = null;
    if (def.fields) {
      refs.fields = {};
      const rows = def.fields.map((f) => {
        const sel = el('select', { id: `${def.id}-field-${f.key}` });
        sel.add(new Option('Any', ''));
        for (const o of f.options) sel.add(new Option(o, o));
        sel.value = state.fields[f.key] || '';
        sel.addEventListener('change', () => {
          if (sel.value) state.fields[f.key] = sel.value; else delete state.fields[f.key];
          this.tools[def.id].save();
        });
        refs.fields[f.key] = sel;
        return el('label', { className: 'field' }, el('span', { className: 'quick-caption' }, f.label), sel);
      });
      fieldsCard = el('div', { className: 'card' },
        el('div', { className: 'label' }, 'Your character'),
        el('p', { className: 'hint small input-hint' }, 'Leave any choice on "Any" to let the AI decide.'),
        el('div', { className: 'fields-grid' }, ...rows));
    }

    // ----- Optional request box -----
    let requestCard = null;
    if (def.request) {
      refs.request = el('textarea', { id: `${def.id}-request`, rows: 3, placeholder: def.request.placeholder });
      requestCard = el('div', { className: 'card' },
        el('label', { className: 'label', htmlFor: `${def.id}-request` }, def.request.label + (def.request.optional ? ' (optional)' : '')), refs.request);
    }

    // ----- Run -----
    refs.run = el('button', { className: 'primary run-btn', textContent: def.runLabel || 'Run' });
    refs.status = el('div', { className: 'status' });
    refs.run.addEventListener('click', () => this.run(def.id));
    const clearBtn = el('button', { className: 'clear-btn', textContent: 'Clear & start fresh' });
    clearBtn.addEventListener('click', () => this.clear(def.id));

    refs.results = el('div', { className: 'results' });

    const section = el('section', { id: def.id, className: 'section', dataset: { parent: def.group ? def.group + '-menu' : 'home' } },
      pageHeader(def.title),
      el('p', { className: 'hint' }, def.intro),
      modelCard,
      ...inputCards,
      fieldsCard,
      controlsCard,
      requestCard,
      el('div', { className: 'run-row' }, refs.run, clearBtn, refs.status),
      refs.results,
    );

    this.tools[def.id] = { def, state, refs, save };
    this.renderModelSelect(def.id);
    return section;
  },

  // Loose / Balanced / Close buttons for one inspiration box.
  closenessSwitch(id, inp, state, caption = 'How closely to follow') {
    const levels = [['loose', 'Loose'], ['balanced', 'Balanced'], ['close', 'Close']];
    const current = () => state.closeness[inp.key] || 'balanced';
    const group = el('div', { className: 'segmented', role: 'radiogroup', 'aria-label': `How closely to follow the ${inp.label.toLowerCase()}` });
    const buttons = levels.map(([value, text]) => {
      const b = el('button', { type: 'button', textContent: text, role: 'radio', dataset: { value } });
      b.addEventListener('click', () => {
        state.closeness[inp.key] = value;
        this.tools[id].save();
        paint();
      });
      return b;
    });
    const paint = () => buttons.forEach((b) => {
      const on = b.dataset.value === current();
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    paint();
    group.append(...buttons);
    return el('div', { className: 'closeness' }, el('span', { className: 'quick-caption' }, caption), group);
  },

  // The default and current prompt for a tool, or for one output of a multi-output tool.
  defaultPrompt(id, outKey) {
    const { def } = this.tools[id];
    return outKey ? def.outputs.find((o) => o.key === outKey).prompt : def.prompt;
  },
  currentPrompt(id, outKey) {
    const { state } = this.tools[id];
    return (outKey ? state.prompts[outKey] : state.prompt) ?? this.defaultPrompt(id, outKey);
  },
  setPrompt(id, outKey, text) {
    const { state, save } = this.tools[id];
    const value = text === this.defaultPrompt(id, outKey) ? null : text;
    if (outKey) { if (value == null) delete state.prompts[outKey]; else state.prompts[outKey] = value; }
    else state.prompt = value;
    save();
  },

  // Hidden prompt editors for one tool (one per output). These all live on the Settings page.
  buildPromptEditors(id) {
    const { def } = this.tools[id];
    const outs = def.outputs ? def.outputs.map((o) => [o.key, `${def.title}: ${o.title}`]) : [[null, def.title]];
    return outs.map(([outKey, title]) => {
      const area = el('textarea', { id: `${def.id}-${outKey || 'main'}-prompt`, rows: 14, value: this.currentPrompt(id, outKey) });
      const badge = el('span', { className: 'badge' });
      const status = el('div', { className: 'status' });
      const updateBadge = () => {
        const edited = this.currentPrompt(id, outKey) !== this.defaultPrompt(id, outKey);
        badge.textContent = edited ? 'edited' : 'default';
        badge.className = 'badge' + (edited ? ' edited' : '');
      };
      const saveBtn = el('button', { className: 'primary', textContent: 'Save prompt' });
      const resetBtn = el('button', { textContent: 'Reset to default' });
      saveBtn.addEventListener('click', () => { this.setPrompt(id, outKey, area.value); updateBadge(); setStatus(status, 'Saved.', 'ok'); });
      resetBtn.addEventListener('click', () => {
        this.setPrompt(id, outKey, this.defaultPrompt(id, outKey));
        area.value = this.defaultPrompt(id, outKey);
        updateBadge();
        setStatus(status, 'Back to the default prompt.', 'ok');
      });
      updateBadge();
      return el('details', { className: 'prompt-box' },
        el('summary', {}, title, badge),
        def.request ? el('p', { className: 'hint small' }, '{request} is replaced by what you type in the tool\'s text box.') : '',
        area,
        el('div', { className: 'row' }, saveBtn, resetBtn),
        status,
      );
    });
  },

  renderModelSelect(id) {
    const { state, refs, save } = this.tools[id];
    const list = Models.list();
    if (!list.some((m) => m.id === state.model)) { state.model = Models.defaultId(); save(); }
    refs.model.innerHTML = '';
    for (const m of list) refs.model.add(new Option(m.nickname && m.label !== m.nickname ? `${m.label} (${m.nickname})` : m.label, m.id));
    refs.model.value = state.model;
    this.renderModelDetails(id);
  },

  // Shows what the chosen model can do, and builds only the options it supports.
  renderModelDetails(id) {
    const { state, refs, save } = this.tools[id];
    const m = Models.get(state.model);
    const opts = state.options;

    // Drop saved choices the new model doesn't support.
    if (opts.aspectRatio && !m.aspectRatios.includes(opts.aspectRatio)) delete opts.aspectRatio;
    if (opts.imageSize && !m.imageSizes.includes(opts.imageSize)) delete opts.imageSize;
    if (opts.thinkingLevel && !m.thinkingLevels.includes(opts.thinkingLevel)) delete opts.thinkingLevel;
    if (!m.search) delete opts.googleSearch;
    save();

    // Only show a note for models whose options we're unsure about.
    refs.modelInfo.innerHTML = '';
    if (!m.confirmed) refs.modelInfo.append(el('p', { className: 'hint small warn' },
      'This model is new to Character Studio, so its options are a best guess. If a run fails, set them back to Auto/Default.'));

    // Option fields
    const fields = [];
    const onChange = (key, value) => {
      if (value === '' || value === false) delete opts[key]; else opts[key] = value;
      save();
    };
    const select = (key, label, values, names = {}) => {
      const s = el('select', { id: `${id}-opt-${key}` });
      s.add(new Option('Default', ''));
      for (const v of values) s.add(new Option(names[v] || v, v));
      s.value = opts[key] || '';
      s.addEventListener('change', () => onChange(key, s.value));
      fields.push(el('label', {}, label, s));
    };
    const number = (key, label, { min, max, step, def }) => {
      const n = el('input', { type: 'number', id: `${id}-opt-${key}`, min, max, step, placeholder: def != null ? `Default (${def})` : 'Default' });
      n.value = opts[key] ?? '';
      n.addEventListener('change', () => onChange(key, n.value));
      fields.push(el('label', {}, label, n));
    };
    const check = (key, label) => {
      const c = el('input', { type: 'checkbox', id: `${id}-opt-${key}`, checked: !!opts[key] });
      c.addEventListener('change', () => onChange(key, c.checked));
      fields.push(el('label', { className: 'check' }, c, label));
    };

    // Quick settings: compact boxes in one row. The text inside says what each one is.
    const quick = [];
    const quickSelect = (key, caption, values, show = (v) => v) => {
      const sel = el('select', { id: `${id}-opt-${key}`, className: 'quick' });
      sel.add(new Option('Auto', ''));
      for (const v of values) sel.add(new Option(show(v), v));
      sel.value = opts[key] || '';
      sel.addEventListener('change', () => onChange(key, sel.value));
      quick.push(el('label', { className: 'quick-item' }, el('span', { className: 'quick-caption' }, caption), sel));
    };
    if (!this.tools[id].def.outputs) quickSelect('aspectRatio', 'Ratio', m.aspectRatios); // sheets set their own ratio
    if (m.imageSizes.length) quickSelect('imageSize', 'Size', m.imageSizes, (v) => (v === '512' ? '512px' : v));
    if (m.thinkingLevels.length) quickSelect('thinkingLevel', 'Thinking', m.thinkingLevels, (v) => v[0].toUpperCase() + v.slice(1));

    const gear = el('button', { className: 'gear-btn', type: 'button', 'aria-label': 'More settings', title: 'More settings', textContent: '\u2699' });
    gear.setAttribute('aria-expanded', String(!refs.options.hidden));
    gear.addEventListener('click', () => {
      refs.options.hidden = !refs.options.hidden;
      gear.setAttribute('aria-expanded', String(!refs.options.hidden));
      gear.classList.toggle('open', !refs.options.hidden);
    });
    gear.classList.toggle('open', !refs.options.hidden);
    refs.quick.innerHTML = '';
    refs.quick.append(...quick, gear);

    // Everything else lives behind the gear.
    select('count', 'Images per run', ['1', '2', '3', '4']);
    if (m.maxTemperature != null) number('temperature', 'Temperature (creativity)', { min: 0, max: m.maxTemperature, step: 0.05, def: m.temperature });
    if (m.topP != null) number('topP', 'Top P', { min: 0, max: 1, step: 0.01, def: m.topP });
    if (m.topK != null) number('topK', 'Top K', { min: 1, step: 1, def: m.topK });
    number('seed', 'Seed (same seed = more repeatable)', { min: 0, step: 1 });
    check('imageOnly', 'Image only (no text reply)');
    if (m.search) check('googleSearch', 'Use Google Search for real-world details');

    refs.options.innerHTML = '';
    refs.options.append(el('div', { className: 'options-title' }, 'More settings'), ...fields);
  },

  addInputs(id, key, blobs) {
    const { state, refs } = this.tools[id];
    if (key === 'sheet' && state.sheetFromSaved) {
      state.inputs.sheet = [];
      state.sheetFromSaved = false;
      state.savedCharacter = '';
      if (refs.saved) refs.saved.value = '';
    }
    state.inputs[key].push(...blobs);
    this.renderThumbs(id, key);
  },

  renderThumbs(id, key) {
    const { state, refs } = this.tools[id];
    const box = refs['thumbs-' + key];
    if (!box) return;
    box.innerHTML = '';
    state.inputs[key].forEach((blob, i) => {
      const img = el('img', { src: URL.createObjectURL(blob), title: 'Tap to remove' });
      img.addEventListener('click', () => {
        state.inputs[key].splice(i, 1);
        if (key === 'sheet' && state.sheetFromSaved) {
          state.sheetFromSaved = false;
          state.savedCharacter = '';
          if (refs.saved) refs.saved.value = '';
        }
        this.renderThumbs(id, key);
      });
      box.append(img);
    });
    if (state.inputs[key].length && !box.closest('.upload-col')) box.append(el('span', { className: 'hint small' }, 'Tap an image to remove it'));
  },

  // One small upload box (used side by side inside the Character card).
  uploadBox(def, key, label) {
    const thumbs = el('div', { className: 'thumbs' });
    this._pendingThumbs = this._pendingThumbs || {};
    const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, id: `${def.id}-${key}-files`, 'aria-label': label });
    const zone = el('div', { className: 'dropzone mini' }, fileInput, el('span', {}, label));
    setupDropzone(zone, fileInput, (files) => this.addInputs(def.id, key, files));
    return { box: el('div', { className: 'upload-col' }, zone, thumbs), thumbs };
  },

  // The Character card: saved-character dropdown on top, reference + sheet uploads side by side.
  buildCharacterCard(def, charInp, sheetInp, state, refs) {
    refs.saved = el('select', { id: `${def.id}-saved`, 'aria-label': 'Saved character' });
    refs.saved.addEventListener('change', () => this.pickSaved(def.id, refs.saved.value));
    const ref = this.uploadBox(def, charInp.key, 'Upload character reference');
    const sheet = this.uploadBox(def, sheetInp.key, 'Upload character sheet');
    refs['thumbs-' + charInp.key] = ref.thumbs;
    refs['thumbs-' + sheetInp.key] = sheet.thumbs;
    this.fillSavedPicker(def.id, refs);
    return el('div', { className: 'card' },
      el('div', { className: 'label' }, 'Character'),
      refs.saved,
      el('div', { className: 'upload-pair' }, ref.box, sheet.box),
      el('p', { className: 'hint small' },
        'Pick a saved character or upload a reference, a sheet, or both. With both, the reference gives the outfit and look, and the sheet keeps the face and body exact. Tap a picture to remove it.'),
      el('a', { href: '#characters', className: 'small-link', textContent: 'Add or manage characters' }),
    );
  },

  // Picking a saved character puts its sheet into the Character sheet box.
  async pickSaved(id, charId) {
    const { state } = this.tools[id];
    state.savedCharacter = charId;
    if (state.sheetFromSaved) { state.inputs.sheet = []; state.sheetFromSaved = false; }
    if (charId) {
      const c = await Characters.get(charId);
      if (c && c.images.length) {
        // Put all of this character's sheets (body + face) into the sheet box.
        state.inputs.sheet = c.images.map((img) => new File([img.blob], `${c.name}-${img.kind}.png`, { type: img.blob.type || 'image/png' }));
        state.sheetFromSaved = true;
      }
    }
    this.renderThumbs(id, 'sheet');
  },

  async fillSavedPicker(id, refs = this.tools[id]?.refs) {
    if (!refs?.saved) return;
    const list = await Characters.list();
    const keep = refs.saved.value;
    refs.saved.innerHTML = '';
    refs.saved.add(new Option(list.length ? 'Saved character: none' : 'Saved character: none yet', ''));
    for (const c of list) refs.saved.add(new Option(c.name, c.id));
    const stillThere = list.some((c) => c.id === keep);
    refs.saved.value = stillThere ? keep : '';
    if (this.tools[id] && keep && !stillThere) this.pickSaved(id, ''); // it was deleted
  },

  // Empties uploads, text box and results so the tool is fresh. Model and options stay.
  clear(id) {
    const { def, state, refs } = this.tools[id];
    for (const inp of def.inputs) {
      state.inputs[inp.key] = [];
      this.renderThumbs(id, inp.key);
    }
    if (refs.request) refs.request.value = '';
    if (refs.fields) {
      state.fields = {};
      Object.values(refs.fields).forEach((sel) => { sel.value = ''; });
      this.tools[id].save();
    }
    if (refs.saved) refs.saved.value = '';
    state.savedCharacter = '';
    state.sheetFromSaved = false;
    refs.results.innerHTML = '';
    setStatus(refs.status, 'Cleared.', 'ok');
  },

  // Builds the full prompt text.
  buildPrompt(id, outKey) {
    const { def, state, refs } = this.tools[id];
    let text = this.currentPrompt(id, outKey);
    // Tool-specific sections written fresh for each Run, e.g. {parts} in the Character Builder.
    if (def.fill) {
      const has = Object.fromEntries(def.inputs.map((i) => [i.key, state.inputs[i.key].length > 0]));
      for (const [key, value] of Object.entries(def.fill({ has, closeness: state.closeness, fields: state.fields }))) text = text.replaceAll(`{${key}}`, value);
    }
    if (!def.request) return text;
    const request = refs.request.value.trim() || (def.request.optional ? 'None.' : '');
    return text.includes('{request}') ? text.replaceAll('{request}', request) : `${text}\n\n${request}`;
  },

  async run(id) {
    const { def, state, refs } = this.tools[id];
    const apiKey = Store.getApiKey();
    const model = Models.get(state.model);

    if (!apiKey) return setStatus(refs.status, 'Add your Gemini API key in Settings first.', 'error');
    const sheetImgs = state.inputs.sheet || [];
    if (def.requireAny && !def.inputs.some((i) => state.inputs[i.key].length)) {
      return setStatus(refs.status, def.requireAny, 'error');
    }
    for (const inp of def.inputs) {
      if (inp.optional || inp.type === 'saved') continue;
      if (inp.orSaved && sheetImgs.length) continue; // a sheet alone is enough for the character
      if (!state.inputs[inp.key].length) {
        const name = inp.label.replace(/\s*\(.*\)/, '').toLowerCase();
        return setStatus(refs.status, inp.orSaved
          ? 'Add a character: pick a saved one, or upload a reference or a sheet.'
          : `Add a ${name} image first.`, 'error');
      }
    }
    if (def.request && !def.request.optional && !refs.request.value.trim()) {
      return setStatus(refs.status, `Fill in "${def.request.label}" first.`, 'error');
    }

    // Work out which images go under which label.
    //   Reference + sheet -> reference is CHARACTER, sheet is CHARACTER SHEET.
    //   Sheet only        -> the sheet becomes the CHARACTER image itself.
    const groups = [];
    for (const inp of def.inputs) {
      if (inp.type === 'saved') continue;
      const imgs = state.inputs[inp.key];
      if (inp.orSaved) {
        const sheetTag = def.inputs.find((i) => i.type === 'saved').tag;
        if (imgs.length) groups.push({ tag: inp.tag, imgs });
        if (imgs.length && sheetImgs.length) groups.push({ tag: sheetTag, imgs: sheetImgs });
        if (!imgs.length) groups.push({ tag: inp.tag, imgs: sheetImgs });
      } else if (imgs.length) {
        groups.push({ tag: inp.tag, imgs });
      }
    }
    const totalRefs = groups.reduce((n, g) => n + g.imgs.length, 0);
    if (totalRefs > model.maxRefs) {
      return setStatus(refs.status, `${model.label} takes up to ${model.maxRefs} images; you added ${totalRefs}. Remove some or pick another model.`, 'error');
    }

    // Each group of images gets a label first, so the prompt can refer to it by name.
    const parts = [];
    for (const g of groups) {
      parts.push({ text: `${g.tag} image${g.imgs.length > 1 ? 's' : ''}:` });
      g.imgs.forEach((blob) => parts.push({ blob }));
    }
    const count = Number(state.options.count || 1);
    refs.run.disabled = true;
    setStatus(refs.status, `Working on ${count > 1 || def.outputs ? 'your images' : 'it'}… this can take up to a minute.`);

    // Tools with several outputs (Character Sheet: body + face) make one image per output, in parallel.
    const outputs = def.outputs || [{ key: null }];
    const makeSet = () => Promise.allSettled(outputs.map((out) => Gemini.generate({
      apiKey, model: model.id,
      parts: [...parts, { text: this.buildPrompt(id, out.key) }],
      options: out.aspectRatio ? { ...state.options, aspectRatio: out.aspectRatio } : state.options,
    })));
    const sets = await Promise.all(Array.from({ length: count }, makeSet));
    refs.run.disabled = false;

    let made = 0;
    const errors = [];
    for (const set of sets) {
      const images = []; // [{ kind, title, src }]
      set.forEach((r, i) => {
        if (r.status === 'fulfilled') r.value.forEach((src) => images.push({ kind: outputs[i].key, title: outputs[i].title, src }));
        else errors.push((outputs[i].title ? outputs[i].title + ': ' : '') + r.reason.message);
      });
      made += images.length;
      if (!images.length) continue;
      if (def.outputs) refs.results.prepend(this.resultGroup(def, images));
      else images.forEach((img) => refs.results.prepend(this.resultCard(def, img.src)));
    }
    if (!made) setStatus(refs.status, 'Error: ' + errors[0], 'error');
    else setStatus(refs.status, `Done: ${made} image${made > 1 ? 's' : ''}.` +
      (errors.length ? ` ${errors.length} failed: ${errors[0]}` : ''), errors.length ? 'error' : 'ok');
  },

  // A set of images from one run (e.g. body sheet + face sheet) with one "Save as character".
  resultGroup(def, images) {
    const cards = images.map((img) => {
      const card = this.resultCard(def, img.src, img.kind);
      card.prepend(el('div', { className: 'result-title' }, img.title));
      return card;
    });
    return el('div', { className: 'result-group' }, ...cards, def.saveAsCharacter ? this.saveCharacterForm(images) : '');
  },

  // "Save as character": a name box and a Save button under a result.
  saveCharacterForm(images) {
    const name = el('input', { type: 'text', placeholder: 'Character name' });
    const btn = el('button', { className: 'primary', textContent: images.length > 1 ? 'Save both as a character' : 'Save as character' });
    const status = el('div', { className: 'status' });
    btn.addEventListener('click', async () => {
      if (!name.value.trim()) { name.focus(); return setStatus(status, 'Type a name first.', 'error'); }
      btn.disabled = true;
      try {
        const sheets = [];
        for (const img of images) sheets.push({ kind: img.kind || 'sheet', blob: await (await fetch(img.src)).blob() });
        await Characters.add(name.value, sheets);
        setStatus(status, `Saved "${name.value.trim()}". Pick it from the Character box in any tool.`, 'ok');
      } catch (err) {
        btn.disabled = false;
        setStatus(status, 'Could not save: ' + err.message, 'error');
      }
    });
    return el('div', { className: 'save-character' }, name, btn, status);
  },

  // One generated image with Download and "Send to…" controls.
  resultCard(def, src, kind) {
    const name = `${def.id}${kind ? '-' + kind : ''}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
    const download = el('button', { textContent: 'Download' });
    download.addEventListener('click', () => downloadUrl(src, name));

    const send = el('select', { className: 'send-to' });
    send.add(new Option('Send to…', ''));
    send.add(new Option('Pose Cutter', 'cutter'));
    for (const t of Object.values(this.tools)) {
      for (const inp of t.def.inputs) send.add(new Option(`${t.def.title} › ${inp.sendLabel || inp.label.replace(/\s*\(.*\)/, '')}`, `${t.def.id}:${inp.key}`));
    }
    send.addEventListener('change', async () => {
      const target = send.value;
      send.value = '';
      if (!target) return;
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], name, { type: blob.type });
      if (target === 'cutter') {
        addCutSources([file]);
        showSection('cutter');
      } else {
        const [toolId, key] = target.split(':');
        this.addInputs(toolId, key, [file]);
        showSection(toolId);
      }
    });

    return el('div', { className: 'result-item' },
      el('img', { src, alt: 'Generated image' }),
      el('div', { className: 'row' }, download, send),
      el('p', { className: 'hint small' }, 'Tip: on a phone you can also press and hold the image to save it.'),
    );
  },
};
