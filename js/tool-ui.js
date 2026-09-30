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
      fields: saved.fields || { ...(def.defaultFields || {}) }, // dropdown choices (a tool can preset some)
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
      if (inp.type === 'library') return this.buildLibraryPicker(def, inp, state, refs);
      if (inp.type === 'video') return this.buildVideoCard(def, inp, state, refs);
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

    // ----- Dropdown choices (Build from Description, Makeup) -----
    //   f.required: no "Any"; the user must pick one.   f.describe(value): text shown under the dropdown.
    let fieldsCard = null;
    if (def.fields) {
      refs.fields = refs.fields || {};
      const rows = def.fields.map((f) => {
        const sel = el('select', { id: `${def.id}-field-${f.key}` });
        sel.add(new Option(f.required ? `Choose ${f.label.toLowerCase()}…` : 'Any', ''));
        for (const o of f.options) sel.add(new Option(o, o));
        sel.value = state.fields[f.key] || '';
        const about = el('p', { className: 'hint small field-about' });
        const showAbout = () => { about.textContent = f.describe && sel.value ? f.describe(sel.value) : ''; };
        sel.addEventListener('change', () => {
          if (sel.value) state.fields[f.key] = sel.value; else delete state.fields[f.key];
          this.tools[def.id].save();
          showAbout();
        });
        showAbout();
        refs.fields[f.key] = sel;
        return el('label', { className: 'field' + (f.wide ? ' wide' : '') }, el('span', { className: 'quick-caption' }, f.label), sel, f.describe ? about : '');
      });
      const anyOptional = def.fields.some((f) => !f.required);
      fieldsCard = el('div', { className: 'card' },
        el('div', { className: 'label' }, def.fieldsTitle || 'Your character'),
        anyOptional ? el('p', { className: 'hint small input-hint' }, 'Leave any choice on "Any" to let the AI decide.') : '',
        el('div', { className: 'fields-grid' }, ...rows));
    }

    // ----- Tile board (Outfit Gallery): tap one tile to choose it -----
    let tilesCard = null;
    if (def.tiles) tilesCard = this.buildTiles(def, state, refs);

    // ----- Optional request box -----
    let requestCard = null;
    if (def.request) {
      refs.request = el('textarea', { id: `${def.id}-request`, rows: 3, placeholder: def.request.placeholder });
      // Quick-tap suggestions add their text to the box (e.g. the Edit tool's "Remove shoes").
      let suggestions = '';
      if (def.request.suggestions) {
        suggestions = el('div', { className: 'suggestions' }, def.request.suggestions.map(([label, text]) => {
          const b = el('button', { type: 'button', textContent: label });
          b.addEventListener('click', () => {
            const box = refs.request;
            box.value = box.value.trim() ? `${box.value.trim().replace(/[.;,]$/, '')}; ${text}` : text;
            box.focus();
          });
          return b;
        }));
      }
      let aiRow = '';
      if (def.request.aiPrompt) {
        const aiBtn = el('button', { type: 'button', className: 'small-btn', textContent: 'Describe the room with AI' });
        const aiStatus = el('div', { className: 'status' });
        aiBtn.addEventListener('click', () => this.aiDescribe(def.id, aiBtn, aiStatus));
        aiRow = el('div', {}, aiBtn, aiStatus);
      }
      requestCard = el('div', { className: 'card' },
        el('label', { className: 'label', htmlFor: `${def.id}-request` }, def.request.label + (def.request.optional ? ' (optional)' : '')),
        def.request.hint ? el('p', { className: 'hint small input-hint' }, def.request.hint) : '',
        refs.request,
        aiRow,
        def.request.suggestions ? el('p', { className: 'hint small' }, 'Tap to add, then edit the words to fit:') : '',
        suggestions);
    }

    // ----- Run -----
    refs.run = el('button', { className: 'primary run-btn', textContent: def.runLabel || 'Run' });
    refs.status = el('div', { className: 'status' });
    refs.run.addEventListener('click', () => this.run(def.id));
    const clearBtn = el('button', { className: 'clear-btn', textContent: 'Clear & start fresh' });
    clearBtn.addEventListener('click', () => this.clear(def.id));
    // Same prompt and pictures, but for pasting into Google AI Studio by hand (no API credits used).
    const manualBtn = el('button', { className: 'clear-btn', textContent: 'Do it in AI Studio (copy prompt)' });
    manualBtn.addEventListener('click', () => this.run(def.id, { manual: true }));

    refs.results = el('div', { className: 'results' });

    const section = el('section', { id: def.id, className: 'section', dataset: { parent: parentOf(def) } },
      pageHeader(def.title),
      el('p', { className: 'hint' }, def.intro),
      modelCard,
      ...inputCards,
      fieldsCard,
      tilesCard,
      controlsCard,
      requestCard,
      el('div', { className: 'run-row' }, refs.run, manualBtn, clearBtn, refs.status),
      refs.results,
    );

    this.tools[def.id] = { def, state, refs, save };
    this.renderModelSelect(def.id);
    return section;
  },

  // A board of tiles grouped by category. The chosen tile's id is kept in state.fields[tiles.key].
  buildTiles(def, state, refs) {
    const t = def.tiles;
    refs.tiles = {};
    const pick = (id) => {
      state.fields[t.key] = id;
      this.tools[def.id].save();
      Object.entries(refs.tiles).forEach(([tid, node]) => {
        node.classList.toggle('on', tid === id);
        node.setAttribute('aria-pressed', String(tid === id));
      });
      const item = t.items.find((i) => i.id === id);
      refs.tileChosen.textContent = item ? `Chosen: ${item.name}. ${item.desc}` : '';
    };
    const cats = [...new Set(t.items.map((i) => i.cat))];
    const groups = cats.map((cat) =>
      el('div', { className: 'tile-group', dataset: { cat } },
        el('div', { className: 'tile-cat' }, cat),
        el('div', { className: 'tile-grid' }, t.items.filter((i) => i.cat === cat).map((item) => {
          const img = el('div', { className: 'tile-img' });
          const tile = el('button', { type: 'button', className: 'tile', 'aria-pressed': 'false', title: item.desc },
            img, el('span', { className: 'tile-name' }, item.name));
          tile.addEventListener('click', () => pick(item.id));
          refs.tiles[item.id] = tile;
          this.showExample(item.id, img);
          return tile;
        }))));
    refs.tileChosen = el('p', { className: 'hint small tile-chosen' });

    // Category buttons: show one category at a time so the board stays short on a phone.
    const chips = el('div', { className: 'cat-chips', role: 'tablist' });
    const showCat = (cat) => {
      groups.forEach((g) => { g.hidden = cat !== 'All' && g.dataset.cat !== cat; });
      chips.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('on', b.dataset.cat === cat);
        b.setAttribute('aria-selected', String(b.dataset.cat === cat));
      });
    };
    for (const cat of ['All', ...cats]) {
      const b = el('button', { type: 'button', role: 'tab', textContent: cat, dataset: { cat } });
      b.addEventListener('click', () => showCat(cat));
      chips.append(b);
    }
    const chosenItem = t.items.find((i) => i.id === state.fields[t.key]);
    showCat(chosenItem ? chosenItem.cat : cats[0]);

    // One-time: make an example picture for every tile that doesn't have one yet.
    const makeBtn = el('button', { className: 'small-btn', textContent: 'Create example pictures' });
    const makeStatus = el('div', { className: 'status' });
    makeBtn.addEventListener('click', () => this.makeExamples(def, makeBtn, makeStatus));

    const card = el('div', { className: 'card' },
      el('div', { className: 'label' }, t.title),
      el('p', { className: 'hint small input-hint' }, t.hint),
      chips,
      ...groups,
      refs.tileChosen,
      el('div', { className: 'examples-row' }, makeBtn, el('span', { className: 'hint small' }, 'Uses your API key once per tile; pictures are saved on this device.')),
      makeStatus);
    if (state.fields[t.key]) setTimeout(() => pick(state.fields[t.key]));
    return card;
  },

  async showExample(tileId, box) {
    const blob = await Examples.get(tileId);
    if (blob) {
      box.style.backgroundImage = `url(${URL.createObjectURL(blob)})`;
      box.classList.add('has-img');
    }
  },

  async makeExamples(def, btn, status) {
    const t = def.tiles;
    const apiKey = Store.getApiKey();
    if (!apiKey) return setStatus(status, 'Add your Gemini API key in Settings first.', 'error');
    const missing = [];
    for (const item of t.items) if (!(await Examples.get(item.id))) missing.push(item);
    if (!missing.length) return setStatus(status, 'Every tile already has an example picture.', 'ok');
    // Ask for a second tap before spending API calls.
    if (!btn.dataset.armed) {
      btn.dataset.armed = '1';
      btn.textContent = `Tap again to make ${missing.length} pictures`;
      setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Create example pictures'; }, 5000);
      return;
    }
    delete btn.dataset.armed;
    btn.disabled = true;
    const model = Models.get(this.tools[def.id].state.model);
    const size = model.imageSizes.includes('512') ? '512' : model.imageSizes.includes('1K') ? '1K' : '';
    let done = 0, failed = 0;
    for (const item of missing) {
      setStatus(status, `Making ${done + failed + 1} of ${missing.length}: ${item.name}…`);
      try {
        const [src] = await Gemini.generate({
          apiKey, model: model.id,
          parts: [{ text: t.examplePrompt(item) }],
          options: { aspectRatio: '3:4', imageSize: size || undefined, imageOnly: true, safety: Store.getSafety() },
        });
        const blob = await (await fetch(src)).blob();
        await Examples.set(item.id, blob);
        this.showExample(item.id, this.tools[def.id].refs.tiles[item.id].querySelector('.tile-img'));
        done++;
      } catch {
        failed++;
      }
    }
    btn.disabled = false;
    btn.textContent = 'Create example pictures';
    setStatus(status, `Made ${done} example picture${done === 1 ? '' : 's'}.` + (failed ? ` ${failed} failed; tap again to retry them.` : ''), failed ? 'error' : 'ok');
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
    refs.saved.addEventListener('change', () => { state.savedOutfit = ''; this.pickSaved(def.id, refs.saved.value); });
    // Which of the saved character's outfits to use (tools that don't change the outfit themselves).
    let outfitRow = '';
    if (!def.noOutfitPick) {
      refs.savedOutfit = el('select', { id: `${def.id}-saved-outfit`, 'aria-label': 'Outfit' });
      refs.savedOutfit.addEventListener('change', () => { state.savedOutfit = refs.savedOutfit.value; this.pickSaved(def.id, refs.saved.value); });
      outfitRow = el('label', { className: 'field wide pick-extra' }, el('span', { className: 'quick-caption' }, 'Outfit'), refs.savedOutfit);
      this.fillOutfitPicker(refs, null);
    }
    const ref = this.uploadBox(def, charInp.key, 'Upload character reference');
    const sheet = this.uploadBox(def, sheetInp.key, 'Upload character sheet');
    refs['thumbs-' + charInp.key] = ref.thumbs;
    refs['thumbs-' + sheetInp.key] = sheet.thumbs;
    this.fillSavedPicker(def.id, refs);
    return el('div', { className: 'card' },
      el('div', { className: 'label' }, 'Character'),
      refs.saved,
      outfitRow,
      el('div', { className: 'upload-pair' }, ref.box, sheet.box),
      el('p', { className: 'hint small' },
        'Pick a saved character or upload a reference, a sheet, or both. With both, the reference gives the outfit and look, and the sheet keeps the face and body exact. Tap a picture to remove it.'),
      el('a', { href: '#characters', className: 'small-link', textContent: 'Add or manage characters' }),
    );
  },

  // A video box: pick a video, the app pulls frames, tap frames to keep or drop them.
  // The kept frames become this input's pictures (state.inputs[inp.key]).
  buildVideoCard(def, inp, state, refs) {
    const fileInput = el('input', { type: 'file', accept: 'video/*', id: `${def.id}-${inp.key}-video`, 'aria-label': inp.label });
    const zone = el('div', { className: 'dropzone' }, fileInput, el('span', {}, 'Tap to choose a video'));
    const status = el('div', { className: 'status' });
    const grid = el('div', { className: 'frame-grid' });
    refs['thumbs-' + inp.key] = grid;
    const max = inp.maxFrames || 10;
    let frames = [], picked = new Set();

    const apply = () => {
      state.inputs[inp.key] = frames.filter((_, i) => picked.has(i)).map((f) => f.blob);
      grid.querySelectorAll('.frame').forEach((node, i) => {
        node.classList.toggle('on', picked.has(i));
        node.setAttribute('aria-pressed', String(picked.has(i)));
      });
      setStatus(status, frames.length ? `${picked.size} of ${frames.length} frames kept (up to ${max}). Tap a frame to keep or drop it.` : '');
    };
    refs.videoReset = refs.videoReset || {};
    refs.videoReset[inp.key] = () => { frames = []; picked = new Set(); grid.innerHTML = ''; setStatus(status, ''); };

    setupDropzone(zone, fileInput, async ([file]) => {
      if (!file) return;
      refs.videoReset[inp.key]();
      state.inputs[inp.key] = [];
      setStatus(refs.status, ''); // clear any old "choose a video first" message
      try {
        frames = await VideoFrames.extract(file, {
          count: inp.frameCount || 12,
          onProgress: (n, total) => setStatus(status, `Reading the video… frame ${n} of ${total}`),
        });
      } catch (err) {
        return setStatus(status, err.message, 'error');
      }
      picked = VideoFrames.autoPick(frames, max);
      frames.forEach((f, i) => {
        const node = el('button', { type: 'button', className: 'frame', title: `${f.time.toFixed(1)} s` }, el('img', { src: f.url, alt: `Frame at ${f.time.toFixed(1)} seconds` }));
        node.addEventListener('click', () => {
          if (picked.has(i)) picked.delete(i);
          else if (picked.size < max) picked.add(i);
          else return setStatus(status, `You can keep up to ${max} frames. Drop one first.`, 'error');
          apply();
        });
        grid.append(node);
      });
      apply();
    });

    return el('div', { className: 'card' },
      el('div', { className: 'label' }, inp.label),
      inp.hint ? el('p', { className: 'hint small input-hint' }, inp.hint) : '',
      zone, status, grid);
  },

  // "Describe the room with AI": a text model looks at the kept frames and writes a description.
  async aiDescribe(id, btn, status) {
    const { def, state, refs } = this.tools[id];
    const apiKey = Store.getApiKey();
    if (!apiKey) return setStatus(status, 'Add your Gemini API key in Settings first.', 'error');
    const images = def.inputs.flatMap((i) => state.inputs[i.key] || []);
    if (!images.length) return setStatus(status, 'Add the video (or pictures) first.', 'error');
    btn.disabled = true;
    setStatus(status, 'Looking at the room…');
    try {
      refs.request.value = await Gemini.describe({ apiKey, images, prompt: def.request.aiPrompt });
      setStatus(status, 'Done. Check it and fix anything that is wrong before you tap Run.', 'ok');
    } catch (err) {
      setStatus(status, 'Error: ' + err.message, 'error');
    }
    btn.disabled = false;
  },

  // A dropdown of saved characters or places (Create a Scene). The pick is kept like other choices.
  buildLibraryPicker(def, inp, state, refs) {
    refs.fields = refs.fields || {};
    const sel = el('select', { id: `${def.id}-${inp.key}-pick` });
    const preview = el('div', { className: 'thumbs' });
    refs.fields[inp.key] = sel;
    refs.libPreviews = refs.libPreviews || {};
    refs.libPreviews[inp.key] = preview;
    sel.addEventListener('change', () => {
      if (sel.value) state.fields[inp.key] = sel.value; else delete state.fields[inp.key];
      this.tools[def.id]?.save();
      this.showLibraryPreview(def.id, inp);
    });
    const manage = el('a', { href: '#' + inp.library, className: 'small-link', textContent: inp.library === 'places' ? 'Add or manage places' : 'Add or manage characters' });
    setTimeout(() => this.fillLibraryPickers(def.id));

    // Characters in Create a Scene: which of their outfits to wear, and a ready-made pose.
    const extras = [];
    if (inp.outfits) {
      const outfit = el('select', { id: `${def.id}-${inp.key}-outfit` });
      refs.outfitPicks = refs.outfitPicks || {};
      refs.outfitPicks[inp.key] = outfit;
      outfit.addEventListener('change', () => {
        if (outfit.value) state.fields[inp.key + 'Outfit'] = outfit.value; else delete state.fields[inp.key + 'Outfit'];
        this.tools[def.id]?.save();
        this.showLibraryPreview(def.id, inp);
      });
      extras.push(el('label', { className: 'field wide pick-extra' }, el('span', { className: 'quick-caption' }, 'Outfit'), outfit));
    }
    if (inp.poses) {
      const key = inp.key + 'Pose';
      const pose = el('select', { id: `${def.id}-${key}` });
      pose.add(new Option('Pose: whatever fits the scene', ''));
      const cats = [...new Set(POSES.map((p) => p.cat))];
      for (const cat of cats) {
        const group = el('optgroup', { label: cat });
        POSES.filter((p) => p.cat === cat).forEach((p) => group.append(new Option(p.name, p.id)));
        pose.append(group);
      }
      pose.value = state.fields[key] || '';
      const about = el('p', { className: 'hint small field-about' });
      const showAbout = () => { about.textContent = POSES.find((p) => p.id === pose.value)?.desc || ''; };
      pose.addEventListener('change', () => {
        if (pose.value) state.fields[key] = pose.value; else delete state.fields[key];
        this.tools[def.id]?.save();
        showAbout();
      });
      showAbout();
      refs.fields[key] = pose;
      extras.push(el('label', { className: 'field wide pick-extra' }, el('span', { className: 'quick-caption' }, 'Pose'), pose, about));
    }
    return el('div', { className: 'card' },
      el('label', { className: 'label', htmlFor: sel.id }, inp.label),
      inp.hint ? el('p', { className: 'hint small input-hint' }, inp.hint) : '',
      sel, ...extras, preview, manage);
  },

  async fillLibraryPickers(id) {
    const t = this.tools[id];
    if (!t) return;
    for (const inp of t.def.inputs.filter((i) => i.type === 'library')) {
      const sel = t.refs.fields[inp.key];
      const list = await LIBRARIES[inp.library].list();
      const noun = inp.library === 'places' ? 'place' : 'character';
      sel.innerHTML = '';
      sel.add(new Option(list.length ? (inp.optional ? 'None' : `Choose a ${noun}…`) : `No saved ${noun}s yet`, ''));
      for (const item of list) sel.add(new Option(item.name, item.id));
      const keep = t.state.fields[inp.key];
      sel.value = list.some((i) => i.id === keep) ? keep : '';
      if (!sel.value) delete t.state.fields[inp.key];
      this.showLibraryPreview(id, inp);
    }
  },

  async showLibraryPreview(id, inp) {
    const t = this.tools[id];
    const box = t.refs.libPreviews[inp.key];
    const pick = t.state.fields[inp.key];
    const token = (t.previewTokens = t.previewTokens || {})[inp.key] = {};
    const item = pick ? await LIBRARIES[inp.library].get(pick) : null;
    // Outfit dropdown: "From their sheet" plus this character's own outfits.
    let outfit = null;
    const outfitSel = t.refs.outfitPicks?.[inp.key];
    if (outfitSel) {
      const outfits = item?.outfits || [];
      const keep = t.state.fields[inp.key + 'Outfit'];
      outfitSel.innerHTML = '';
      outfitSel.add(new Option(!item ? 'Choose a character first' : outfits.length ? 'As on their body sheet' : 'As on their body sheet (no saved outfits yet)', ''));
      for (const o of outfits) outfitSel.add(new Option(o.name, o.id));
      outfitSel.disabled = !outfits.length;
      outfit = outfits.find((o) => o.id === keep) || null;
      outfitSel.value = outfit ? outfit.id : '';
      if (!outfit) delete t.state.fields[inp.key + 'Outfit'];
    }
    // Show exactly what Run will send for this pick.
    //   With an outfit: the outfit sheet + their face sheet (their old body sheet is left out).
    const shown = !item ? [] : outfit
      ? [{ blob: outfit.blob, label: `Outfit: ${outfit.name}` }, ...item.images.filter((i) => i.kind === 'face').map((i) => ({ blob: i.blob, label: 'Face sheet' }))]
      : item.images.map((i) => ({ blob: i.blob, label: { body: 'Body sheet', face: 'Face sheet', views: 'Views sheet', details: 'Details sheet' }[i.kind] || 'Sheet' }));
    if (t.previewTokens[inp.key] !== token) return; // a newer pick is already being shown
    const urls = shown.map((x) => URL.createObjectURL(x.blob));
    box.innerHTML = '';
    shown.forEach((x, n) => box.append(el('figure', { className: 'pick-thumb' }, el('img', { src: urls[n], alt: x.label }), el('figcaption', {}, x.label))));
    if (shown.length) box.append(el('p', { className: 'hint small pick-sends' }, `Sends ${shown.length} picture${shown.length > 1 ? 's' : ''}: ${shown.map((x) => x.label.replace(/^Outfit: .*/, 'outfit sheet').toLowerCase()).join(' + ')}.`));
  },

  // Picking a saved character puts its sheets into the Character sheet box.
  // With one of their outfits picked, the outfit sheet takes the place of their body sheet (face sheet stays).
  async pickSaved(id, charId) {
    const { state, refs } = this.tools[id];
    state.savedCharacter = charId;
    if (state.sheetFromSaved) { state.inputs.sheet = []; state.sheetFromSaved = false; }
    const c = charId ? await Characters.get(charId) : null;
    if (refs.savedOutfit) this.fillOutfitPicker(refs, c, state);
    const outfit = c && c.outfits.find((o) => o.id === state.savedOutfit);
    const file = (blob, name) => new File([blob], name, { type: blob.type || 'image/png' });
    if (c && outfit) {
      state.inputs.sheet = [file(outfit.blob, `${c.name}-outfit-${outfit.name}-body.png`),
        ...c.images.filter((img) => img.kind === 'face').map((img) => file(img.blob, `${c.name}-face.png`))];
      state.sheetFromSaved = true;
    } else if (c && c.images.length) {
      state.inputs.sheet = c.images.map((img) => file(img.blob, `${c.name}-${img.kind}.png`));
      state.sheetFromSaved = true;
    }
    this.renderThumbs(id, 'sheet');
  },

  // The Outfit dropdown under a saved character: "As on their body sheet" plus their outfits.
  fillOutfitPicker(refs, c, state = {}) {
    const sel = refs.savedOutfit;
    const outfits = c?.outfits || [];
    sel.innerHTML = '';
    sel.add(new Option(!c ? 'Pick a saved character first' : outfits.length ? 'As on their body sheet' : 'As on their body sheet (no saved outfits yet)', ''));
    for (const o of outfits) sel.add(new Option(o.name, o.id));
    sel.disabled = !outfits.length;
    if (!outfits.some((o) => o.id === state.savedOutfit)) state.savedOutfit = '';
    sel.value = state.savedOutfit || '';
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
    else if (this.tools[id] && keep && refs.savedOutfit) this.pickSaved(id, keep); // its outfits may have changed
  },

  // Empties uploads, text box and results so the tool is fresh. Model and options stay.
  // quiet: no "Cleared." message (used when you leave the page).
  // keepChoices: keep dropdowns and the chosen tile (used by "Edit this picture").
  clear(id, { quiet = false, keepChoices = false } = {}) {
    const { def, state, refs } = this.tools[id];
    state.runId = (state.runId || 0) + 1; // any run still in progress is ignored when it finishes
    refs.run.disabled = false;
    for (const inp of def.inputs) {
      state.inputs[inp.key] = [];
      if (inp.type === 'video') refs.videoReset?.[inp.key]?.();
      else this.renderThumbs(id, inp.key);
    }
    if (refs.request) refs.request.value = '';
    if (!keepChoices) {
      if (refs.tiles) {
        Object.values(refs.tiles).forEach((t) => { t.classList.remove('on'); t.setAttribute('aria-pressed', 'false'); });
        refs.tileChosen.textContent = '';
      }
      if (refs.fields || refs.tiles) {
        state.fields = { ...(def.defaultFields || {}) };
        Object.entries(refs.fields || {}).forEach(([key, sel]) => { sel.value = state.fields[key] || ''; sel.dispatchEvent(new Event('change')); });
        this.tools[id].save();
      }
    }
    if (refs.saved) refs.saved.value = '';
    state.savedOutfit = '';
    if (refs.savedOutfit) this.fillOutfitPicker(refs, null, state);
    state.savedCharacter = '';
    state.sheetFromSaved = false;
    refs.results.innerHTML = '';
    setStatus(refs.status, quiet ? '' : 'Cleared.', quiet ? '' : 'ok');
  },


  // Builds the full prompt text.
  buildPrompt(id, outKey) {
    const { def, state, refs } = this.tools[id];
    let text = this.currentPrompt(id, outKey);
    // Tool-specific sections written fresh for each Run, e.g. {parts} in the Character Builder.
    if (def.fill) {
      const has = Object.fromEntries(def.inputs.map((i) => [i.key, state.inputs[i.key].length > 0]));
      const count = Object.fromEntries(def.inputs.map((i) => [i.key, state.inputs[i.key].length]));
      for (const [key, value] of Object.entries(def.fill({ has, count, closeness: state.closeness, fields: state.fields, described: state.described || {} }))) text = text.replaceAll(`{${key}}`, value);
    }
    if (!def.request) return text;
    const request = refs.request.value.trim() || (def.request.optional ? 'None.' : '');
    return text.includes('{request}') ? text.replaceAll('{request}', request) : `${text}\n\n${request}`;
  },

  // manual: don't generate; show the prompt and pictures to use in Google AI Studio instead.
  async run(id, { manual = false } = {}) {
    const { def, state, refs } = this.tools[id];
    const apiKey = Store.getApiKey();
    const model = Models.get(state.model);

    if (!apiKey && !manual) return setStatus(refs.status, 'Add your Gemini API key in Settings first.', 'error');
    const sheetImgs = state.inputs.sheet || [];
    for (const inp of def.inputs.filter((i) => i.type === 'library' && !i.optional)) {
      if (!state.fields[inp.key]) return setStatus(refs.status, inp.missing || `Choose ${inp.label.toLowerCase()} first.`, 'error');
    }
    for (const f of def.fields || []) {
      if (f.required && !state.fields[f.key]) return setStatus(refs.status, `Choose a ${f.label.toLowerCase()} first.`, 'error');
    }
    if (def.tiles && !state.fields[def.tiles.key]) return setStatus(refs.status, def.tiles.required, 'error');
    const typed = def.requireAnyOrText && refs.request && refs.request.value.trim();
    if (def.requireAny && !typed && !def.inputs.some((i) => state.inputs[i.key].length)) {
      return setStatus(refs.status, def.requireAny, 'error');
    }
    for (const inp of def.inputs) {
      if (inp.optional || inp.type === 'saved' || inp.type === 'library') continue;
      if (inp.orSaved && sheetImgs.length && !inp.required) continue; // a sheet alone is enough for the character
      if (!state.inputs[inp.key].length) {
        const name = inp.label.replace(/\s*\(.*\)/, '').toLowerCase();
        if (inp.missing) return setStatus(refs.status, inp.missing, 'error');
        return setStatus(refs.status, inp.orSaved
          ? 'Add a character: pick a saved one, or upload a reference or a sheet.'
          : `Add a ${name} image first.`, 'error');
      }
    }
    if (def.request && !def.request.optional && !refs.request.value.trim()) {
      return setStatus(refs.status, `Fill in "${def.request.label}" first.`, 'error');
    }

    // Pictures sent as words instead (Create a Scene "Words only"): describe them first.
    state.described = {};
    for (const inp of def.inputs.filter((i) => i.describe && state.inputs[i.key].length && state.fields[i.describe.field] === i.describe.value)) {
      setStatus(refs.status, 'Describing the pose picture in words…');
      try {
        state.described[inp.key] = await Gemini.describe({ apiKey, images: state.inputs[inp.key], prompt: inp.describe.prompt });
      } catch (err) {
        return setStatus(refs.status, 'Could not describe the pose picture: ' + err.message, 'error');
      }
    }

    // Work out which images go under which label.
    //   Reference + sheet -> reference is CHARACTER, sheet is CHARACTER SHEET.
    //   Sheet only        -> the sheet becomes the CHARACTER image itself.
    const groups = [];
    for (const inp of def.inputs) {
      if (inp.type === 'saved') continue;
      if (inp.type === 'library') {
        // A saved character or place: send all of its sheets, labelled with its name.
        const item = state.fields[inp.key] && await LIBRARIES[inp.library].get(state.fields[inp.key]);
        // With an outfit picked, the outfit sheet replaces their body sheet (it already shows the full body,
        // in the right clothes). The face sheet still goes along: its close-ups keep the face exact.
        const outfit = item && inp.outfits && item.outfits.find((o) => o.id === state.fields[inp.key + 'Outfit']);
        if (outfit) {
          groups.push({ tag: `${inp.tag} "${item.name}" OUTFIT SHEET "${outfit.name}"`, imgs: [outfit.blob], note: item.notes, height: item.height });
          const faces = item.images.filter((i) => i.kind === 'face');
          if (faces.length) groups.push({ tag: `${inp.tag} "${item.name}" FACE SHEET`, imgs: faces.map((i) => i.blob) });
        } else if (item && item.images.length) {
          groups.push({ tag: `${inp.tag} "${item.name}"`, imgs: item.images.map((i) => i.blob), note: item.notes, height: item.height });
        }
        continue;
      }
      const imgs = state.inputs[inp.key];
      if (inp.orSaved) {
        const sheetTag = def.inputs.find((i) => i.type === 'saved').tag;
        if (imgs.length) groups.push({ tag: inp.tag, imgs });
        if (imgs.length && sheetImgs.length) groups.push({ tag: sheetTag, imgs: sheetImgs });
        if (!imgs.length) groups.push({ tag: inp.tag, imgs: sheetImgs });
      } else if (imgs.length && !state.described[inp.key]) {
        const g = { tag: inp.tag, imgs, after: inp.afterText, labelEach: inp.labelEach };
        if (inp.sendFirst) groups.unshift(g); else groups.push(g);
      }
    }
    const totalRefs = groups.reduce((n, g) => n + g.imgs.length, 0);
    if (totalRefs > model.maxRefs) {
      return setStatus(refs.status, `${model.label} takes up to ${model.maxRefs} images; you added ${totalRefs}. Remove some or pick another model.`, 'error');
    }
    if (manual) return this.showManual(id, groups);

    // Each group of images gets a label first, so the prompt can refer to it by name.
    const parts = [];
    for (const g of groups) {
      // labelEach: every picture gets its own label ("1 of 3"), so the model treats them as equals
      // instead of copying the first one.
      if (g.labelEach && g.imgs.length > 1) {
        g.imgs.forEach((blob, n) => parts.push({ text: `${g.tag} image ${n + 1} of ${g.imgs.length}:` }, { blob }));
      } else {
        parts.push({ text: `${g.tag} image${g.imgs.length > 1 ? 's' : ''}:` });
        g.imgs.forEach((blob) => parts.push({ blob }));
      }
      if (g.after) parts.push({ text: g.after });
      if (g.note) parts.push({ text: `${g.tag} written description (follow it for layout and details): ${g.note}` });
      if (g.height) parts.push({ text: `${g.tag.replace(/ OUTFIT SHEET .*/, '')} real height: ${g.height} (use exactly this height, measured against the room).` });
    }
    const count = Number(state.options.count || 1);
    refs.run.disabled = true;
    const twoSteps = def.outputs?.some((o) => o.first);
    setStatus(refs.status, twoSteps ? 'Designing the new character, then making the sheets… this can take up to two minutes.'
      : `Working on ${count > 1 || def.outputs ? 'your images' : 'it'}… this can take up to a minute.`);

    // Tools with several outputs (Character Sheet: body + face) make one image per output, in parallel.
    // An output marked `first` (Inspired Character Sheet: the new character) is made before the others,
    // and the others are then made from that picture, so they all show the same new person.
    const outputs = def.outputs || [{ key: null }];
    const first = outputs.find((o) => o.first);
    const rest = outputs.filter((o) => !o.first);
    const gen = (out, useParts) => Gemini.generate({
      apiKey, model: model.id,
      parts: [...useParts, { text: this.buildPrompt(id, out.key) }],
      options: { ...state.options, ...(out.aspectRatio ? { aspectRatio: out.aspectRatio } : {}), safety: Store.getSafety() },
    });
    const makeSet = async () => {
      if (!first) return Promise.allSettled(rest.map((out) => gen(out, parts)));
      let src;
      try { [src] = await gen(first, parts); } catch (err) { return [{ status: 'rejected', reason: err }]; }
      const blob = await (await fetch(src)).blob();
      const fromDesign = [{ text: 'CHARACTER REFERENCE image:' }, { blob }];
      return [{ status: 'fulfilled', value: [src] }, ...await Promise.allSettled(rest.map((out) => gen(out, fromDesign)))];
    };
    const ordered = first ? [first, ...rest] : rest; // matches the order of each set's results
    const runId = state.runId = (state.runId || 0) + 1;
    const sets = await Promise.all(Array.from({ length: count }, makeSet));
    if (runId !== state.runId) return; // the page was cleared (or left) while this was running
    refs.run.disabled = false;

    let made = 0;
    const errors = [];
    for (const set of sets) {
      const images = []; // [{ kind, title, src }]
      set.forEach((r, i) => {
        if (r.status === 'fulfilled') r.value.forEach((src) => images.push({ kind: ordered[i].key, title: ordered[i].title, src, first: ordered[i].first }));
        else errors.push((ordered[i].title ? ordered[i].title + ': ' : '') + r.reason.message);
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

  // "Do it in AI Studio": numbered pictures to download and a ready-to-paste prompt for each output.
  // AI Studio can't put a label before each picture, so the prompt starts with a numbered list
  // saying what each attached picture is; attach them in that order.
  showManual(id, groups) {
    const { def, state, refs } = this.tools[id];
    const items = [];
    const notes = [];
    for (const g of groups) {
      g.imgs.forEach((blob, n) => items.push({ blob, label: g.tag + (g.imgs.length > 1 ? ` (${n + 1} of ${g.imgs.length})` : '') }));
      if (g.after) notes.push(`About the ${g.tag} image: ${g.after}`);
      if (g.note) notes.push(`${g.tag} written description (follow it for layout and details): ${g.note}`);
      if (g.height) notes.push(`${g.tag.replace(/ OUTFIT SHEET .*/, '')} real height: ${g.height} (use exactly this height, measured against the room).`);
    }
    const list = (entries) => `ATTACHED IMAGES (in this order):\n${entries.map((e, n) => `Image ${n + 1}: ${e}`).join('\n')}`;
    const header = [items.length ? list(items.map((i) => i.label)) : 'No images attached.', ...notes].join('\n');
    const outputs = def.outputs || [{ key: null, title: def.title }];
    const hasFirst = outputs.some((o) => o.first);

    const copyText = async (text, box) => {
      try { await navigator.clipboard.writeText(text); } catch { box.select(); document.execCommand('copy'); }
    };
    // Pictures go on the clipboard as PNG (the type phones and browsers accept for pasting).
    const toPng = async (blob) => {
      if (blob.type === 'image/png') return blob;
      const img = await Cutter.loadImage(URL.createObjectURL(blob));
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return new Promise((r) => c.toBlob(r, 'image/png'));
    };
    // The PNG is handed over as a promise so the copy still counts as part of the tap (needed on iPhone).
    const copyImage = (blob) => navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(blob) })]);
    const copyFailed = 'This browser could not copy the picture. Use "Download the pictures" instead.';

    const copyBox = (text) => {
      const box = el('textarea', { rows: 6, readOnly: true, value: text, className: 'manual-prompt' });
      const btn = el('button', { textContent: 'Copy prompt only' });
      btn.addEventListener('click', async () => {
        await copyText(text, box);
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = 'Copy prompt only'; }, 2000);
      });
      return [box, btn];
    };

    // One button that copies everything in order: picture 1, picture 2, … then the prompt.
    // Tap, paste in AI Studio, come back, tap again.
    const stepper = (pics, text, box) => {
      const queue = [...pics.map((it, n) => ({ label: `picture ${n + 1} of ${pics.length}`, run: () => copyImage(it.blob) })),
        { label: 'the prompt', run: () => copyText(text, box) }];
      let at = 0;
      const btn = el('button', { className: 'primary' });
      const note = el('p', { className: 'hint small' });
      const show = () => {
        btn.textContent = at < queue.length ? `Copy ${queue[at].label}` : 'All copied ✓ (tap to start over)';
      };
      btn.addEventListener('click', async () => {
        if (at >= queue.length) { at = 0; note.textContent = ''; return show(); }
        try {
          await queue[at].run();
          note.textContent = at === queue.length - 1 ? 'Copied the prompt. Paste it in AI Studio and run.'
            : `Copied ${queue[at].label}. Paste it in AI Studio, then come back and tap again.`;
          at += 1;
        } catch {
          note.textContent = copyFailed;
        }
        show();
      });
      show();
      return [btn, note];
    };

    // The numbered pictures, each with its own Copy button (to redo one).
    const picRow = (pics) => el('div', { className: 'manual-pics' }, pics.map((it, n) => {
      const b = el('button', { className: 'small-btn', textContent: `Copy ${n + 1}` });
      b.addEventListener('click', async () => {
        try { await copyImage(it.blob); b.textContent = `Copied ${n + 1} ✓`; } catch { b.textContent = 'Could not copy'; }
        setTimeout(() => { b.textContent = `Copy ${n + 1}`; }, 2000);
      });
      return el('figure', { className: 'pick-thumb' }, el('img', { src: URL.createObjectURL(it.blob), alt: it.label }), el('figcaption', {}, `${n + 1}. ${it.label}`), b);
    }));

    const ext = (b) => ({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[b.type] || 'png');
    const slug = (t) => t.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
    const dl = el('button', { textContent: `Download the ${items.length} picture${items.length === 1 ? '' : 's'}` });
    dl.addEventListener('click', async () => {
      for (const [n, it] of items.entries()) {
        downloadUrl(URL.createObjectURL(it.blob), `${String(n + 1).padStart(2, '0')}-${slug(it.label)}.${ext(it.blob)}`);
        await new Promise((r) => setTimeout(r, 500)); // phones block downloads that come too fast
      }
    });

    const steps = outputs.map((out, n) => {
      const ratio = out.aspectRatio || state.options.aspectRatio;
      const later = hasFirst && !out.first;
      const text = (later ? list(['CHARACTER REFERENCE (the new character picture you made in step 1)']) : header) + '\n\n' + this.buildPrompt(id, out.key);
      const pics = later ? [] : items;
      const [box, promptBtn] = copyBox(text);
      return el('div', { className: 'manual-step' },
        el('div', { className: 'result-title' }, (outputs.length > 1 ? `${n + 1}. ` : '') + (out.title || def.title)),
        el('p', { className: 'hint small' },
          (later ? 'New chat. Attach ONLY the picture from step 1 (save it from AI Studio, then attach it). ' : pics.length ? `New chat. Tap the button below: it copies picture 1, then picture 2… and finally the prompt. Paste each one into AI Studio in that order. ` : 'New chat. ') +
          `Set the aspect ratio to ${ratio || 'what you like'}${state.options.imageSize ? `, size ${state.options.imageSize}` : ''}, then run.`),
        ...stepper(pics, text, box),
        pics.length ? picRow(pics) : '',
        box, promptBtn);
    });

    refs.results.prepend(el('div', { className: 'result-item manual-card' },
      el('div', { className: 'result-title' }, 'Do it yourself in Google AI Studio'),
      el('p', { className: 'hint small' }, 'Open aistudio.google.com, choose the image model (Nano Banana), then follow the steps. The pictures are numbered: add them in that order, because the prompt refers to them by number. Copying or downloading both give the full-size pictures.'),
      items.length ? dl : '',
      ...steps));
    setStatus(refs.status, 'Ready: download the pictures and copy the prompt below.', 'ok');
    window.scrollTo(0, refs.results.offsetTop - 20);
  },

  // A set of images from one run (e.g. body sheet + face sheet) with one "Save as character".
  resultGroup(def, images) {
    const cards = images.map((img) => {
      const card = this.resultCard(def, img.src, img.kind);
      card.prepend(el('div', { className: 'result-title' }, img.title));
      return card;
    });
    const saveTo = def.saveAs || (def.saveAsCharacter ? 'characters' : null);
    // Tools with `saveNotes` also save the typed description with the item (e.g. a room description).
    const notes = def.saveNotes && this.tools[def.id].refs.request ? this.tools[def.id].refs.request.value.trim() : '';
    // Outfit Sheet: save the sheet as one outfit of the saved character that was picked.
    const body = def.saveAsOutfit && images.find((i) => i.kind === 'body');
    return el('div', { className: 'result-group' }, ...cards,
      saveTo && images.some((i) => !i.first) ? this.saveCharacterForm(images.filter((i) => !i.first), saveTo, notes) : '',
      body ? this.saveOutfitForm(body, this.tools[def.id].state.savedCharacter) : '');
  },

  // "Save as an outfit of…": saves the sheet as one outfit of a saved character.
  saveOutfitForm(body, charId = '') {
    const who = el('select', { 'aria-label': 'Character' });
    const name = el('input', { type: 'text', placeholder: 'Outfit name (e.g. Red dress)' });
    const btn = el('button', { className: 'primary', textContent: 'Save as an outfit' });
    const status = el('div', { className: 'status' });
    Characters.list().then((list) => {
      who.add(new Option(list.length ? 'Outfit of which character?' : 'No saved characters yet', ''));
      for (const c of list) who.add(new Option(c.name, c.id));
      if (list.some((c) => c.id === charId)) who.value = charId;
    });
    btn.addEventListener('click', async () => {
      if (!who.value) return setStatus(status, 'Choose the character first.', 'error');
      if (!name.value.trim()) { name.focus(); return setStatus(status, 'Type an outfit name first.', 'error'); }
      btn.disabled = true;
      try {
        await Characters.addOutfit(who.value, name.value, await (await fetch(body.src)).blob());
        setStatus(status, `Added "${name.value.trim()}" to ${who.selectedOptions[0].text}. Pick it under Outfit in Create a Scene.`, 'ok');
      } catch (err) {
        btn.disabled = false;
        setStatus(status, 'Could not save: ' + err.message, 'error');
      }
    });
    return el('div', { className: 'save-character save-outfit' }, who, name, btn, status);
  },

  // Puts a result picture into another tool's box (or the Pose Cutter) and opens that page.
  // The picture REPLACES whatever was in that box, so old pictures don't pile up.
  //   fresh: also empty the rest of that tool (text, other pictures, results), e.g. "Edit this picture".
  async sendTo(src, name, target, { fresh = false } = {}) {
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], name, { type: blob.type });
    if (target === 'cutter') {
      clearCutter(true);
      addCutSources([file]);
      showSection('cutter');
      return;
    }
    const [toolId, key] = target.split(':');
    const t = this.tools[toolId];
    if (fresh) this.clear(toolId, { quiet: true, keepChoices: true });
    // A saved character's sheet counts as the sheet box; replacing it means that pick no longer applies.
    if (key === 'sheet' && t.refs.saved) {
      t.refs.saved.value = ''; t.state.savedCharacter = ''; t.state.sheetFromSaved = false; t.state.savedOutfit = '';
      if (t.refs.savedOutfit) this.fillOutfitPicker(t.refs, null, t.state);
    }
    t.state.inputs[key] = [];
    this.addInputs(toolId, key, [file]);
    if (fresh || toolId === location.hash.slice(1)) {
      // Staying on the same page (e.g. editing an edit): start clean below the picture.
      if (!fresh) { t.refs.results.innerHTML = ''; setStatus(t.refs.status, ''); }
      window.scrollTo(0, 0);
    }
    showSection(toolId);
    if (fresh && t.refs.request) t.refs.request.focus({ preventScroll: true });
  },

  // "Save as character": a name box and a Save button under a result.
  saveCharacterForm(images, libName = 'characters', notes = '') {
    const noun = libName === 'places' ? 'place' : 'character';
    const name = el('input', { type: 'text', placeholder: `${noun[0].toUpperCase() + noun.slice(1)} name` });
    const height = libName === 'characters' ? el('input', { type: 'text', placeholder: `Height (optional), e.g. 5'4" or 163 cm` }) : null;
    const btn = el('button', { className: 'primary', textContent: images.length > 1 ? `Save both as a ${noun}` : `Save as ${noun}` });
    const status = el('div', { className: 'status' });
    btn.addEventListener('click', async () => {
      if (!name.value.trim()) { name.focus(); return setStatus(status, 'Type a name first.', 'error'); }
      btn.disabled = true;
      try {
        const sheets = [];
        for (const img of images) sheets.push({ kind: img.kind || 'sheet', blob: await (await fetch(img.src)).blob() });
        await LIBRARIES[libName].add(name.value, sheets, notes, height ? height.value : '');
        setStatus(status, `Saved "${name.value.trim()}". Pick it in ${libName === 'places' ? 'Create a Scene' : 'the Character box of any tool'}.`, 'ok');
      } catch (err) {
        btn.disabled = false;
        setStatus(status, 'Could not save: ' + err.message, 'error');
      }
    });
    return el('div', { className: 'save-character' }, name, height || '', btn, status);
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
      for (const inp of t.def.inputs.filter((i) => i.type !== 'library' && i.type !== 'video')) send.add(new Option(`${t.def.title} › ${inp.sendLabel || inp.label.replace(/\s*\(.*\)/, '')}`, `${t.def.id}:${inp.key}`));
    }
    send.addEventListener('change', () => {
      const target = send.value;
      send.value = '';
      if (target) this.sendTo(src, name, target);
    });

    // One tap: open this picture in the Edit tool, ready for the next change.
    const editBtn = el('button', { className: 'primary', textContent: 'Edit this picture' });
    editBtn.addEventListener('click', () => this.sendTo(src, name, 'edit:image', { fresh: true }));

    return el('div', { className: 'result-item' },
      el('img', { src, alt: 'Generated image' }),
      el('div', { className: 'row' }, this.tools.edit ? editBtn : '', download, send),
      el('p', { className: 'hint small' }, 'Tip: on a phone you can also press and hold the image to save it.'),
    );
  },
};
