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
      inputs: Object.fromEntries(def.inputs.map((i) => [i.key, []])),
      savedCharacter: '',               // id of the picked saved character, '' = none
    };
    const refs = {};
    const save = () => Store.setTool(def.id, { model: state.model, options: state.options, prompt: state.prompt });

    // ----- Model picker -----
    refs.model = el('select', { id: `${def.id}-model` });
    refs.modelInfo = el('div', { className: 'model-info' });
    refs.options = el('div', { className: 'options-grid' });
    refs.model.addEventListener('change', () => {
      state.model = refs.model.value;
      save();
      this.renderModelDetails(def.id);
    });
    const modelCard = el('div', { className: 'card' },
      el('label', { className: 'label', htmlFor: `${def.id}-model` }, 'Model'),
      refs.model,
      refs.modelInfo,
      el('details', { className: 'settings-box' }, el('summary', {}, 'Model options'), refs.options),
    );

    // ----- Upload boxes -----
    const inputCards = def.inputs.map((inp) => {
      if (inp.type === 'saved') return this.buildSavedPicker(def, inp, state, refs);
      const thumbs = el('div', { className: 'thumbs' });
      refs['thumbs-' + inp.key] = thumbs;
      const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, id: `${def.id}-${inp.key}-files` });
      const zone = el('div', { className: 'dropzone' }, fileInput, el('span', {}, 'Tap to add image(s)'));
      setupDropzone(zone, fileInput, (files) => this.addInputs(def.id, inp.key, files));
      return el('div', { className: 'card' },
        el('div', { className: 'label' }, inp.label),
        inp.hint ? el('p', { className: 'hint small input-hint' }, inp.hint) : '',
        zone, thumbs);
    });

    // ----- Optional request box -----
    let requestCard = null;
    if (def.request) {
      refs.request = el('textarea', { id: `${def.id}-request`, rows: 3, placeholder: def.request.placeholder });
      requestCard = el('div', { className: 'card' },
        el('label', { className: 'label', htmlFor: `${def.id}-request` }, def.request.label), refs.request);
    }

    // ----- Run -----
    refs.run = el('button', { className: 'primary run-btn', textContent: def.runLabel || 'Run' });
    refs.status = el('div', { className: 'status' });
    refs.run.addEventListener('click', () => this.run(def.id));
    const clearBtn = el('button', { className: 'clear-btn', textContent: 'Clear & start fresh' });
    clearBtn.addEventListener('click', () => this.clear(def.id));

    refs.results = el('div', { className: 'results' });

    const section = el('section', { id: def.id, className: 'section' },
      pageHeader(def.title),
      el('p', { className: 'hint' }, def.intro),
      modelCard,
      ...inputCards,
      requestCard,
      el('div', { className: 'run-row' }, refs.run, clearBtn, refs.status),
      refs.results,
    );

    this.tools[def.id] = { def, state, refs, save };
    this.renderModelSelect(def.id);
    return section;
  },

  // The hidden prompt editor for one tool. These all live on the Settings page.
  buildPromptEditor(id) {
    const { def, state, refs, save } = this.tools[id];
    refs.prompt = el('textarea', { id: `${def.id}-prompt`, rows: 14, value: state.prompt ?? def.prompt });
    refs.promptBadge = el('span', { className: 'badge' });
    refs.promptStatus = el('div', { className: 'status' });
    const promptSave = el('button', { className: 'primary', textContent: 'Save prompt' });
    const promptReset = el('button', { textContent: 'Reset to default' });
    promptSave.addEventListener('click', () => {
      state.prompt = refs.prompt.value === def.prompt ? null : refs.prompt.value;
      save();
      this.updatePromptBadge(id);
      setStatus(refs.promptStatus, 'Saved.', 'ok');
    });
    promptReset.addEventListener('click', () => {
      state.prompt = null;
      refs.prompt.value = def.prompt;
      save();
      this.updatePromptBadge(id);
      setStatus(refs.promptStatus, 'Back to the default prompt.', 'ok');
    });
    const box = el('details', { className: 'prompt-box' },
      el('summary', {}, def.title, refs.promptBadge),
      def.request ? el('p', { className: 'hint small' }, '{request} is replaced by what you type in the tool\'s text box.') : '',
      refs.prompt,
      el('div', { className: 'row' }, promptSave, promptReset),
      refs.promptStatus,
    );
    this.updatePromptBadge(id);
    return box;
  },

  updatePromptBadge(id) {
    const { state, refs } = this.tools[id];
    refs.promptBadge.textContent = state.prompt ? 'edited' : 'default';
    refs.promptBadge.className = 'badge' + (state.prompt ? ' edited' : '');
  },

  // Fills the model dropdown. Called at start and after the model list is refreshed.
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

    // Summary chips
    const chips = [`Up to ${m.maxRefs} reference images`];
    if (m.imageSizes.length) chips.push('Sizes ' + m.imageSizes.join(' / '));
    chips.push(m.aspectRatios.length + ' aspect ratios');
    if (m.thinkingLevels.length) chips.push('Thinking control');
    if (m.search) chips.push('Google Search');
    refs.modelInfo.innerHTML = '';
    refs.modelInfo.append(
      el('div', { className: 'chips' }, chips.map((c) => el('span', { className: 'chip' }, c))),
      m.description ? el('p', { className: 'hint small' }, m.description) : '',
      m.confirmed ? '' : el('p', { className: 'hint small warn' },
        'This model is new to Character Studio, so its image options are a best guess. If a run fails, set the options back to Default.'),
    );

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

    select('aspectRatio', 'Aspect ratio', m.aspectRatios);
    if (m.imageSizes.length) select('imageSize', 'Image size', m.imageSizes, { 512: '512 px' });
    if (m.thinkingLevels.length) select('thinkingLevel', 'Thinking', m.thinkingLevels, { minimal: 'Minimal (faster)', high: 'High (more careful)' });
    select('count', 'Images per run', ['1', '2', '3', '4']);
    if (m.maxTemperature != null) number('temperature', 'Temperature (creativity)', { min: 0, max: m.maxTemperature, step: 0.05, def: m.temperature });
    if (m.topP != null) number('topP', 'Top P', { min: 0, max: 1, step: 0.01, def: m.topP });
    if (m.topK != null) number('topK', 'Top K', { min: 1, step: 1, def: m.topK });
    number('seed', 'Seed (same seed = more repeatable)', { min: 0, step: 1 });
    check('imageOnly', 'Image only (no text reply)');
    if (m.search) check('googleSearch', 'Use Google Search for real-world details');

    refs.options.innerHTML = '';
    refs.options.append(...fields);
  },

  addInputs(id, key, blobs) {
    this.tools[id].state.inputs[key].push(...blobs);
    this.renderThumbs(id, key);
  },

  renderThumbs(id, key) {
    const { state, refs } = this.tools[id];
    const box = refs['thumbs-' + key];
    if (!box) return;
    box.innerHTML = '';
    state.inputs[key].forEach((blob, i) => {
      const img = el('img', { src: URL.createObjectURL(blob), title: 'Tap to remove' });
      img.addEventListener('click', () => { state.inputs[key].splice(i, 1); this.renderThumbs(id, key); });
      box.append(img);
    });
    if (state.inputs[key].length) box.append(el('span', { className: 'hint small' }, 'Tap an image to remove it'));
  },

  // Dropdown of saved characters, with a small preview of the picked one's sheet.
  buildSavedPicker(def, inp, state, refs) {
    refs.saved = el('select', { id: `${def.id}-saved` });
    refs.savedPreview = el('div', { className: 'thumbs' });
    refs.saved.addEventListener('change', () => {
      state.savedCharacter = refs.saved.value;
      this.renderSavedPreview(def.id);
    });
    const manage = el('a', { href: '#characters', className: 'small-link', textContent: 'Add or manage characters' });
    this.fillSavedPicker(def.id, refs);
    return el('div', { className: 'card' },
      el('label', { className: 'label', htmlFor: `${def.id}-saved` }, inp.label),
      inp.hint ? el('p', { className: 'hint small input-hint' }, inp.hint) : '',
      refs.saved, refs.savedPreview, manage);
  },

  async fillSavedPicker(id, refs = this.tools[id]?.refs) {
    if (!refs?.saved) return;
    const list = await Characters.list();
    const keep = refs.saved.value;
    refs.saved.innerHTML = '';
    refs.saved.add(new Option(list.length ? 'None' : 'None (no saved characters yet)', ''));
    for (const c of list) refs.saved.add(new Option(c.name, c.id));
    refs.saved.value = list.some((c) => c.id === keep) ? keep : '';
    if (this.tools[id]) {
      this.tools[id].state.savedCharacter = refs.saved.value;
      this.renderSavedPreview(id);
    }
  },

  async renderSavedPreview(id) {
    const { state, refs } = this.tools[id];
    refs.savedPreview.innerHTML = '';
    if (!state.savedCharacter) return;
    const c = await Characters.get(state.savedCharacter);
    if (c) refs.savedPreview.append(el('img', { src: c.thumb, alt: c.name }));
  },

  // Empties uploads, text box and results so the tool is fresh. Model and options stay.
  clear(id) {
    const { def, state, refs } = this.tools[id];
    for (const inp of def.inputs) {
      state.inputs[inp.key] = [];
      this.renderThumbs(id, inp.key);
    }
    if (refs.request) refs.request.value = '';
    if (refs.saved) { refs.saved.value = ''; state.savedCharacter = ''; this.renderSavedPreview(id); }
    refs.results.innerHTML = '';
    setStatus(refs.status, 'Cleared.', 'ok');
  },

  // Builds the full prompt text.
  buildPrompt(id) {
    const { def, state, refs } = this.tools[id];
    const template = state.prompt ?? def.prompt;
    if (!def.request) return template;
    const request = refs.request.value.trim();
    return template.includes('{request}') ? template.replaceAll('{request}', request) : `${template}\n\n${request}`;
  },

  async run(id) {
    const { def, state, refs } = this.tools[id];
    const apiKey = Store.getApiKey();
    const model = Models.get(state.model);

    if (!apiKey) return setStatus(refs.status, 'Add your Gemini API key in Settings first.', 'error');
    // Load the picked saved character's sheet, if any.
    const saved = state.savedCharacter ? await Characters.get(state.savedCharacter) : null;
    for (const inp of def.inputs) {
      if (inp.optional || inp.type === 'saved') continue;
      if (inp.orSaved && saved) continue; // a saved character can stand in for this upload
      if (!state.inputs[inp.key].length) {
        const name = inp.label.replace(/\s*\(.*\)/, '').toLowerCase();
        return setStatus(refs.status, `Add a ${name} image${inp.orSaved ? ' or pick a saved character' : ''} first.`, 'error');
      }
    }
    if (def.request && !refs.request.value.trim()) {
      return setStatus(refs.status, `Fill in "${def.request.label}" first.`, 'error');
    }

    // Work out which images go under which label.
    //   Photo + saved character -> photo is CHARACTER, saved sheet is CHARACTER SHEET.
    //   Saved character only    -> the saved sheet becomes the CHARACTER image itself.
    const groups = [];
    for (const inp of def.inputs) {
      if (inp.type === 'saved') continue;
      let imgs = state.inputs[inp.key];
      if (inp.orSaved && !imgs.length && saved) imgs = [saved.sheet];
      if (imgs.length) groups.push({ tag: inp.tag, imgs });
      if (inp.orSaved && state.inputs[inp.key].length && saved) {
        const sheetInp = def.inputs.find((i) => i.type === 'saved');
        groups.push({ tag: sheetInp.tag, imgs: [saved.sheet] });
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
    parts.push({ text: this.buildPrompt(id) });

    const count = Number(state.options.count || 1);
    refs.run.disabled = true;
    setStatus(refs.status, `Working on ${count > 1 ? count + ' images' : 'it'}… this can take up to a minute.`);
    const runs = await Promise.allSettled(
      Array.from({ length: count }, () => Gemini.generate({ apiKey, model: model.id, parts, options: state.options })),
    );
    refs.run.disabled = false;

    const images = runs.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
    const errors = runs.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
    images.forEach((src) => refs.results.prepend(this.resultCard(def, src)));
    if (!images.length) setStatus(refs.status, 'Error: ' + errors[0], 'error');
    else setStatus(refs.status, `Done: ${images.length} image${images.length > 1 ? 's' : ''}.` +
      (errors.length ? ` ${errors.length} failed: ${errors[0]}` : ''), errors.length ? 'error' : 'ok');
  },

  // "Save as character": a name box and a Save button under a result.
  saveCharacterForm(src) {
    const name = el('input', { type: 'text', placeholder: 'Character name' });
    const btn = el('button', { className: 'primary', textContent: 'Save as character' });
    const status = el('div', { className: 'status' });
    btn.addEventListener('click', async () => {
      if (!name.value.trim()) { name.focus(); return setStatus(status, 'Type a name first.', 'error'); }
      btn.disabled = true;
      try {
        const blob = await (await fetch(src)).blob();
        await Characters.add(name.value, blob);
        setStatus(status, `Saved "${name.value.trim()}". Pick it from "Saved character" in any tool.`, 'ok');
      } catch (err) {
        btn.disabled = false;
        setStatus(status, 'Could not save: ' + err.message, 'error');
      }
    });
    return el('div', { className: 'save-character' }, name, btn, status);
  },

  // One generated image with Download and "Send to…" controls.
  resultCard(def, src) {
    const name = `${def.id}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
    const download = el('button', { textContent: 'Download' });
    download.addEventListener('click', () => downloadUrl(src, name));

    const send = el('select', { className: 'send-to' });
    send.add(new Option('Send to…', ''));
    send.add(new Option('Pose Cutter', 'cutter'));
    for (const t of Object.values(this.tools)) {
      for (const inp of t.def.inputs.filter((i) => i.type !== 'saved')) send.add(new Option(`${t.def.title} › ${inp.label.replace(/\s*\(.*\)/, '')}`, `${t.def.id}:${inp.key}`));
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
      def.saveAsCharacter ? this.saveCharacterForm(src) : '',
      el('p', { className: 'hint small' }, 'Tip: on a phone you can also press and hold the image to save it.'),
    );
  },
};
