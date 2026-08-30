/* =========================================================
   OBS Remote Director — Admin Panel
   ========================================================= */
(function () {
  'use strict';

  const COLOR_HEX = {
    default: '#2a2a2a', green: '#00c853', red: '#ff1744', blue: '#2979ff',
    yellow: '#ffd600', purple: '#aa00ff', orange: '#ff6d00', cyan: '#00e5ff',
    gray: '#555555', pink: '#f06292',
  };
  const COLORS = Object.keys(COLOR_HEX);
  const ICONS = [
    { v: '', l: 'None', cls: 'none-icon' },
    { v: '\u{1F4FA}', l: 'TV' }, { v: '\u{1F3AC}', l: 'Film' },
    { v: '\u{1F3A4}', l: 'Mic' }, { v: '\u{1F50A}', l: 'Speaker' },
    { v: '\u{1F4F7}', l: 'Camera' }, { v: '\u{1F3A8}', l: 'Palette' },
    { v: '\u{26A1}', l: 'Bolt' }, { v: '\u{1F534}', l: 'Red Dot' },
    { v: '\u{1F7E2}', l: 'Green' }, { v: '\u{1F535}', l: 'Blue' },
    { v: '\u{1F680}', l: 'Rocket' }, { v: '\u{1F3C6}', l: 'Trophy' },
    { v: '\u{1F512}', l: 'Lock' }, { v: '\u{1F513}', l: 'Unlock' },
    { v: '\u{1F4E3}', l: 'Broadcast' }, { v: '\u{23F9}', l: 'Stop' },
    { v: '\u{25B6}', l: 'Play' }, { v: '\u{23F8}', l: 'Pause' },
    { v: '\u{1F39B}', l: 'Dial' }, { v: '\u{1F9E9}', l: 'Puzzle' },
  ];

  const ACTION_TYPES = [
    { v: 'set_scene',          t: 'Switch Scene',       fields: ['scene'] },
    { v: 'set_preview_scene',  t: 'Set Preview Scene',  fields: ['scene'] },
    { v: 'transition',         t: 'Transition (Cut)',    fields: [] },
    { v: 'transition_stinger',t: 'Transition (Stinger)',fields: [] },
    { v: 'start_stream',      t: 'Start Stream',        fields: [] },
    { v: 'stop_stream',       t: 'Stop Stream',         fields: [] },
    { v: 'start_record',      t: 'Start Recording',     fields: [] },
    { v: 'stop_record',       t: 'Stop Recording',      fields: [] },
    { v: 'pause_record',      t: 'Pause Recording',     fields: [] },
    { v: 'resume_record',     t: 'Resume Recording',    fields: [] },
    { v: 'toggle_record',     t: 'Toggle Recording',    fields: [] },
    { v: 'start_virtual_cam',  t: 'Start Virtual Cam',  fields: [] },
    { v: 'stop_virtual_cam',   t: 'Stop Virtual Cam',   fields: [] },
    { v: 'toggle_virtual_cam', t: 'Toggle Virtual Cam', fields: [] },
    { v: 'start_replay_buffer', t: 'Start Replay Buffer', fields: [] },
    { v: 'stop_replay_buffer',  t: 'Stop Replay Buffer',  fields: [] },
    { v: 'save_replay',         t: 'Save Replay',        fields: [] },
    { v: 'set_source_mute',   t: 'Mute/Unmute Source',  fields: ['source', 'muted'] },
    { v: 'toggle_source_mute',t: 'Toggle Mute',         fields: ['source'] },
    { v: 'set_scene_item_show', t: 'Show/Hide Source',  fields: ['source', 'visible'] },
    { v: 'set_scene_item_lock', t: 'Lock/Unlock Source',fields: ['source', 'locked'] },
    { v: 'play_media',        t: 'Play Media',          fields: ['source'] },
    { v: 'pause_media',       t: 'Pause Media',         fields: ['source'] },
    { v: 'restart_media',     t: 'Restart Media',       fields: ['source'] },
    { v: 'stop_media',        t: 'Stop Media',          fields: ['source'] },
    { v: 'text_grotto',       t: 'Set Text (GDI+)',     fields: ['source', 'text'] },
    { v: 'browser_source',    t: 'Browser Source URL',   fields: ['source', 'url'] },
    { v: 'hotkey',            t: 'Send Hotkey',          fields: ['hotkey'] },
    { v: 'obs_command',       t: 'Custom OBS Command',   fields: ['command'] },
  ];

  const FEEDBACK_FIELDS = [
    { v: 'scene',       t: 'Program Scene' },
    { v: 'preview',     t: 'Preview Scene' },
    { v: 'streaming',   t: 'Is Streaming' },
    { v: 'recording',   t: 'Is Recording' },
    { v: 'paused',      t: 'Is Paused' },
    { v: 'virtualcam',  t: 'Virtual Cam' },
    { v: 'replaybuffer',t: 'Replay Buffer' },
    { v: 'studio_mode', t: 'Studio Mode' },
    { v: 'transitioning',t: 'Transitioning' },
    { v: 'custom',      t: 'Custom field...' },
  ];
  const FEEDBACK_OPS = [
    { v: 'eq', t: 'Equals' },
    { v: 'neq', t: 'Not Equals' },
    { v: 'true', t: 'Is True' },
    { v: 'false', t: 'Is False' },
    { v: 'contains', t: 'Contains' },
  ];

  // ===== FIREBASE =====
  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();

  // ===== STATE =====
  let pinCode = null;
  let pages = {};          // { pageId: { name, order } }
  let buttons = {};        // { pageId: { "row_col": { ... } } }
  let gridRows = 4;
  let gridCols = 8;
  let currentPage = null;
  let currentKey = null;   // selected tile key e.g. "0_1"
  let saving = false;      // prevent editor refresh during live save

  // ===== DOM =====
  const $auth = document.getElementById('auth-screen');
  const $app = document.getElementById('app-screen');
  const $pinInput = document.getElementById('pin-input');
  const $pinSubmit = document.getElementById('pin-submit');
  const $authError = document.getElementById('auth-error');
  const $grid = document.getElementById('button-grid');
  const $gridSize = document.getElementById('grid-size-display');
  const $pageSelect = document.getElementById('page-select');
  const $pagePrev = document.getElementById('page-prev');
  const $pageNext = document.getElementById('page-next');
  const $editorEmpty = document.getElementById('editor-empty');
  const $editorForm = document.getElementById('editor-form');
  const $previewLabel = document.getElementById('preview-label');
  const $previewIcon = document.getElementById('preview-icon');
  const $edLabel = document.getElementById('ed-label');
  const $edColors = document.getElementById('ed-colors');
  const $edIcons = document.getElementById('ed-icons');
  const $actionsList = document.getElementById('actions-list');
  const $feedbacksList = document.getElementById('feedbacks-list');
  const $dotObs = document.getElementById('dot-obs');
  const $dotFirebase = document.getElementById('dot-firebase');

  // ===== AUTH =====
  $pinSubmit.addEventListener('click', tryPin);
  $pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPin(); });

  function tryPin() {
    const v = $pinInput.value.trim();
    db.ref('settings/pin').once('value', (snap) => {
      const correct = snap.val();
      if (!correct || v === correct) {
        pinCode = v;
        $auth.style.display = 'none';
        $app.classList.add('active');
        loadAll();
      } else {
        $authError.textContent = 'Wrong PIN';
        $pinInput.value = '';
        $pinInput.focus();
      }
    }).catch(() => {
      // Firebase unreachable — allow offline
      pinCode = v;
      $auth.style.display = 'none';
      $app.classList.add('active');
      loadAll();
    });
  }

  // ===== LOAD ALL =====
  function loadAll() {
    loadSettings();
    loadPages();
    loadButtons();
    listenFirebaseStatus();
  }

  function loadSettings() {
    db.ref('settings/grid').once('value', (snap) => {
      const g = snap.val();
      if (g) { gridRows = g.rows || 4; gridCols = g.cols || 8; }
      $grid.style.setProperty('--rows', gridRows);
      $grid.style.setProperty('--cols', gridCols);
      $grid.style.gridTemplateColumns = `repeat(${gridCols}, var(--button-w))`;
      $gridSize.textContent = `${gridRows}x${gridCols}`;
      document.getElementById('set-rows').value = gridRows;
      document.getElementById('set-cols').value = gridCols;
      renderGrid();
    });
    db.ref('settings/pin').once('value', (snap) => {
      document.getElementById('set-pin').value = snap.val() || '';
    });
  }

  function loadPages() {
    db.ref('pages').on('value', (snap) => {
      pages = snap.val() || {};
      renderPageSelect();
      if (!currentPage || !pages[currentPage]) {
        const keys = Object.keys(pages);
        currentPage = keys.length ? keys.sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0))[0] : null;
      }
      renderGrid();
    });
  }

  function loadButtons() {
    db.ref('buttons').on('value', (snap) => {
      buttons = snap.val() || {};
      renderGrid();
      if (currentKey && !saving) refreshEditor();
    });
  }

  function listenFirebaseStatus() {
    db.ref('.info/connected').on('value', (snap) => {
      $dotFirebase.className = 'status-dot' + (snap.val() ? ' green' : ' red');
    });
    // OBS status via feedback polling (simplified)
    db.ref('status/obs').on('value', (snap) => {
      $dotObs.className = 'status-dot' + (snap.val() ? ' green' : ' red');
    });
  }

  // ===== PAGE SELECTOR =====
  function renderPageSelect() {
    $pageSelect.innerHTML = '';
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    sorted.forEach((pid) => {
      const o = document.createElement('option');
      o.value = pid;
      o.textContent = pages[pid].name || pid;
      if (pid === currentPage) o.selected = true;
      $pageSelect.appendChild(o);
    });
    if (!sorted.length) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'No pages';
      $pageSelect.appendChild(o);
    }
  }

  $pageSelect.addEventListener('change', () => {
    currentPage = $pageSelect.value;
    currentKey = null;
    showEmptyEditor();
    renderGrid();
  });

  $pagePrev.addEventListener('click', () => {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const idx = sorted.indexOf(currentPage);
    if (idx > 0) { currentPage = sorted[idx - 1]; $pageSelect.value = currentPage; currentKey = null; showEmptyEditor(); renderGrid(); }
  });

  $pageNext.addEventListener('click', () => {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const idx = sorted.indexOf(currentPage);
    if (idx < sorted.length - 1) { currentPage = sorted[idx + 1]; $pageSelect.value = currentPage; currentKey = null; showEmptyEditor(); renderGrid(); }
  });

  // ===== GRID RENDERING =====
  function renderGrid() {
    $grid.innerHTML = '';
    $grid.style.setProperty('--cols', gridCols);
    $grid.style.gridTemplateColumns = `repeat(${gridCols}, var(--button-w))`;
    const pageBtns = (currentPage && buttons[currentPage]) || {};
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const key = `${r}_${c}`;
        const cfg = pageBtns[key];
        const div = document.createElement('div');
        div.className = 'deck-btn' + (cfg ? ' c-' + (cfg.color || 'default') : ' empty');
        if (key === currentKey && cfg) div.classList.add('selected');
        div.dataset.key = key;
        if (cfg) {
          if (cfg.icon) {
            const ico = document.createElement('span');
            ico.className = 'btn-icon';
            ico.textContent = cfg.icon;
            div.appendChild(ico);
          }
          const lbl = document.createElement('span');
          lbl.className = 'btn-label';
          lbl.textContent = cfg.label || key;
          div.appendChild(lbl);
          div.addEventListener('click', () => selectTile(key));
        } else {
          div.addEventListener('click', () => selectTile(key));
        }
        $grid.appendChild(div);
      }
    }
  }

  // ===== TILE SELECTION =====
  function selectTile(key) {
    currentKey = key;
    renderGrid();
    refreshEditor();
  }

  function showEmptyEditor() {
    $editorEmpty.style.display = '';
    $editorForm.style.display = 'none';
  }

  function refreshEditor() {
    if (!currentKey || !currentPage) { showEmptyEditor(); return; }
    const cfg = ((buttons[currentPage] || {})[currentKey]) || null;
    if (!cfg) {
      // Empty tile — show editor with defaults
      $editorEmpty.style.display = 'none';
      $editorForm.style.display = '';
      populateEditor({
        label: '', color: 'default', icon: '',
        actions: [], feedbacks: [],
      });
      return;
    }
    $editorEmpty.style.display = 'none';
    $editorForm.style.display = '';
    populateEditor(cfg);
  }

  function populateEditor(cfg) {
    // Preview
    $previewLabel.textContent = cfg.label || '';
    $previewIcon.textContent = cfg.icon || '';
    updatePreviewColor(cfg.color || 'default');

    // Label
    $edLabel.value = cfg.label || '';

    // Colors
    $edColors.innerHTML = '';
    COLORS.forEach((c) => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch' + (c === (cfg.color || 'default') ? ' selected' : '');
      sw.style.background = COLOR_HEX[c];
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        $edColors.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        updatePreviewColor(c);
        liveSave();
      });
      $edColors.appendChild(sw);
    });

    // Icons
    $edIcons.innerHTML = '';
    ICONS.forEach((ic) => {
      const sw = document.createElement('div');
      sw.className = 'icon-opt' + (ic.cls ? ' ' + ic.cls : '') + ((ic.v === (cfg.icon || '')) ? ' selected' : '');
      sw.textContent = ic.v || '—';
      sw.dataset.icon = ic.v;
      sw.addEventListener('click', () => {
        $edIcons.querySelectorAll('.icon-opt').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        $previewIcon.textContent = ic.v;
        liveSave();
      });
      $edIcons.appendChild(sw);
    });

    // Actions
    buildActionsList(cfg.actions || []);

    // Feedbacks
    buildFeedbacksList(cfg.feedbacks || []);
  }

  function updatePreviewColor(colorKey) {
    const hex = COLOR_HEX[colorKey] || COLOR_HEX.default;
    document.getElementById('btn-preview').style.background = hex;
  }

  // ===== ACTIONS LIST =====
  function buildActionsList(actions) {
    $actionsList.innerHTML = '';
    actions.forEach((act, i) => addActionRow(act, i));
  }

  function addActionRow(act, index) {
    act = act || {};
    const div = document.createElement('div');
    div.className = 'rule-row';
    div.dataset.idx = index;

    // Head: action type
    let opts = '';
    ACTION_TYPES.forEach(a => {
      const sel = (act.type || 'set_scene') === a.v ? ' selected' : '';
      opts += `<option value="${a.v}"${sel}>${a.t}</option>`;
    });
    div.innerHTML = `<div class="rule-row-head">
      <select class="act-type">${opts}</select>
      <button class="rule-remove">&times;</button>
    </div><div class="rule-row-body"></div>`;

    const head = div.querySelector('.rule-row-head');
    const body = div.querySelector('.rule-row-body');

    head.querySelector('.rule-remove').addEventListener('click', () => { div.remove(); liveSave(); });
    head.querySelector('.act-type').addEventListener('change', () => {
      rebuildActionBody(body, head.querySelector('.act-type').value, act);
      liveSave();
    });

    rebuildActionBody(body, act.type || 'set_scene', act);
    $actionsList.appendChild(div);
  }

  function rebuildActionBody(body, type, act) {
    body.innerHTML = '';
    const spec = ACTION_TYPES.find(a => a.v === type) || { fields: [] };
    spec.fields.forEach((f) => {
      if (f === 'scene') {
        const sel = document.createElement('select');
        sel.className = 'act-scene';
        sel.innerHTML = '<option value="">(current)</option>';
        (window._scenes || []).forEach(s => {
          const o = document.createElement('option');
          o.value = s; o.textContent = s;
          if (act.scene === s) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', liveSave);
        body.appendChild(sel);
      } else if (f === 'source') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'act-source'; inp.placeholder = 'Source name';
        inp.value = act.source || '';
        inp.addEventListener('input', liveSave);
        body.appendChild(inp);
      } else if (f === 'muted' || f === 'visible' || f === 'locked') {
        const sel = document.createElement('select');
        sel.className = 'act-' + f;
        const val = act[f];
        const isOn = f === 'muted' ? val === true || val === 'true' : val !== false && val !== 'false';
        sel.innerHTML = `<option value="true"${isOn ? ' selected' : ''}>${f === 'muted' ? 'Muted' : f === 'visible' ? 'Visible' : 'Locked'}</option><option value="false"${!isOn ? ' selected' : ''}>${f === 'muted' ? 'Unmuted' : f === 'visible' ? 'Hidden' : 'Unlocked'}</option>`;
        sel.addEventListener('change', liveSave);
        body.appendChild(sel);
      } else if (f === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'act-text'; inp.placeholder = 'New text';
        inp.value = act.text || '';
        inp.addEventListener('input', liveSave);
        body.appendChild(inp);
      } else if (f === 'url') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'act-url'; inp.placeholder = 'https://...';
        inp.value = act.url || '';
        inp.addEventListener('input', liveSave);
        body.appendChild(inp);
      } else if (f === 'hotkey') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'act-hotkey'; inp.placeholder = 'Hotkey name';
        inp.value = act.hotkey || '';
        inp.addEventListener('input', liveSave);
        body.appendChild(inp);
      } else if (f === 'command') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'act-command'; inp.placeholder = 'OBS command';
        inp.value = act.command || '';
        inp.addEventListener('input', liveSave);
        body.appendChild(inp);
      }
    });
  }

  document.getElementById('add-action').addEventListener('click', () => {
    addActionRow({ type: 'set_scene' }, $actionsList.children.length);
    liveSave();
  });

  // ===== FEEDBACKS LIST =====
  function buildFeedbacksList(feedbacks) {
    $feedbacksList.innerHTML = '';
    feedbacks.forEach((fb, i) => addFeedbackRow(fb, i));
  }

  function addFeedbackRow(fb, index) {
    fb = fb || {};
    const div = document.createElement('div');
    div.className = 'rule-row';
    div.dataset.idx = index;

    // Head: field + op
    let fieldOpts = '';
    FEEDBACK_FIELDS.forEach(f => {
      const sel = (fb.field || 'scene') === f.v ? ' selected' : '';
      fieldOpts += `<option value="${f.v}"${sel}>${f.t}</option>`;
    });
    let opOpts = '';
    FEEDBACK_OPS.forEach(o => {
      const sel = (fb.op || 'eq') === o.v ? ' selected' : '';
      opOpts += `<option value="${o.v}"${sel}>${o.t}</option>`;
    });

    div.innerHTML = `<div class="rule-row-head">
      <select class="fb-field">${fieldOpts}</select>
      <select class="fb-op">${opOpts}</select>
      <button class="rule-remove">&times;</button>
    </div>
    <div class="rule-row-body">
      <input class="fb-custom-field" type="text" placeholder="e.g. mutes.Mic_Aux" style="display:${fb.field === 'custom' ? '' : 'none'};">
      <input class="fb-value" type="text" placeholder="Compare value" style="display:${fb.op === 'true' || fb.op === 'false' ? 'none' : ''};">
    </div>
    <div class="rule-colors"></div>`;

    const head = div.querySelector('.rule-row-head');
    const body = div.querySelector('.rule-row-body');
    const colorsEl = div.querySelector('.rule-colors');

    // Colors
    const selectedColor = fb.trueColor || 'green';
    COLORS.forEach((c) => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch' + (c === selectedColor ? ' selected' : '');
      sw.style.background = COLOR_HEX[c];
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        colorsEl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        liveSave();
      });
      colorsEl.appendChild(sw);
    });

    // Events
    head.querySelector('.rule-remove').addEventListener('click', () => { div.remove(); liveSave(); });
    head.querySelector('.fb-field').addEventListener('change', () => {
      const v = head.querySelector('.fb-field').value;
      div.querySelector('.fb-custom-field').style.display = v === 'custom' ? '' : 'none';
      liveSave();
    });
    head.querySelector('.fb-op').addEventListener('change', () => {
      const v = head.querySelector('.fb-op').value;
      div.querySelector('.fb-value').style.display = (v === 'true' || v === 'false') ? 'none' : '';
      liveSave();
    });
    body.querySelector('.fb-custom-field').addEventListener('input', liveSave);
    body.querySelector('.fb-value').addEventListener('input', liveSave);

    $feedbacksList.appendChild(div);
  }

  document.getElementById('add-feedback').addEventListener('click', () => {
    addFeedbackRow({ field: 'scene', op: 'eq', trueColor: 'green', pulse: false }, $feedbacksList.children.length);
    liveSave();
  });

  // ===== LIVE SAVE =====
  let saveTimeout = null;
  function liveSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(doSave, 300);
  }

  function doSave() {
    if (!currentPage) return;
    const color = ($edColors.querySelector('.color-swatch.selected') || {}).dataset || {};
    const iconEl = ($edIcons.querySelector('.icon-opt.selected') || {}).dataset || {};

    // Gather actions
    const actions = [];
    $actionsList.querySelectorAll('.rule-row').forEach((row) => {
      const type = row.querySelector('.act-type').value;
      const act = { type };
      const spec = ACTION_TYPES.find(a => a.v === type) || { fields: [] };
      spec.fields.forEach((f) => {
        if (f === 'scene') act.scene = (row.querySelector('.act-scene') || {}).value || '';
        else if (f === 'source') act.source = (row.querySelector('.act-source') || {}).value || '';
        else if (f === 'text') act.text = (row.querySelector('.act-text') || {}).value || '';
        else if (f === 'url') act.url = (row.querySelector('.act-url') || {}).value || '';
        else if (f === 'hotkey') act.hotkey = (row.querySelector('.act-hotkey') || {}).value || '';
        else if (f === 'command') act.command = (row.querySelector('.act-command') || {}).value || '';
        else if (f === 'muted') act.muted = (row.querySelector('.act-muted') || {}).value === 'true';
        else if (f === 'visible') act.visible = (row.querySelector('.act-visible') || {}).value === 'true';
        else if (f === 'locked') act.locked = (row.querySelector('.act-locked') || {}).value === 'true';
      });
      actions.push(act);
    });

    // Gather feedbacks
    const feedbacks = [];
    $feedbacksList.querySelectorAll('.rule-row').forEach((row) => {
      const field = row.querySelector('.fb-field').value;
      const op = row.querySelector('.fb-op').value;
      const selColor = (row.querySelector('.rule-colors .color-swatch.selected') || {}).dataset || {};
      feedbacks.push({
        field,
        customField: row.querySelector('.fb-custom-field').value.trim(),
        op,
        compareValue: row.querySelector('.fb-value').value.trim(),
        trueColor: selColor.color || 'green',
      });
    });

    const cfg = {
      label: $edLabel.value.trim(),
      color: color.color || 'default',
      icon: iconEl.icon || '',
      actions,
      feedbacks,
    };

    const path = `buttons/${currentPage}/${currentKey}`;
    saving = true;
    db.ref(path).set(cfg).then(() => { saving = false; }).catch(() => { saving = false; });
  }

  // ===== NAV =====
  document.querySelectorAll('.sidebar-link[data-section]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const sec = link.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('section-active'));
      document.getElementById('section-' + sec).classList.add('section-active');
      document.querySelector('.topbar-title').textContent = link.querySelector('span:last-child').textContent;
      if (sec === 'pages') renderPagesList();
    });
  });

  // ===== PAGES MANAGER =====
  function renderPagesList() {
    const list = document.getElementById('pages-list');
    list.innerHTML = '';
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    sorted.forEach((pid) => {
      const div = document.createElement('div');
      div.className = 'page-item';
      div.innerHTML = `
        <input type="text" value="${pages[pid].name || pid}" class="page-name" data-pid="${pid}">
        <button class="page-item-btn" data-action="up" data-pid="${pid}">&#9650;</button>
        <button class="page-item-btn" data-action="down" data-pid="${pid}">&#9660;</button>
        <button class="page-item-btn danger" data-action="delete" data-pid="${pid}">&times;</button>
      `;
      div.querySelector('.page-name').addEventListener('input', (e) => {
        db.ref(`pages/${pid}/name`).set(e.target.value);
      });
      div.querySelector('[data-action="up"]').addEventListener('click', () => reorderPage(pid, -1));
      div.querySelector('[data-action="down"]').addEventListener('click', () => reorderPage(pid, 1));
      div.querySelector('[data-action="delete"]').addEventListener('click', () => deletePage(pid));
      list.appendChild(div);
    });
  }

  document.getElementById('add-page').addEventListener('click', () => {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const maxOrder = sorted.length ? (pages[sorted[sorted.length - 1]].order || 0) : 0;
    const newId = 'page_' + Date.now();
    db.ref(`pages/${newId}`).set({ name: `Page ${maxOrder + 1}`, order: maxOrder + 1 });
  });

  function reorderPage(pid, dir) {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const idx = sorted.indexOf(pid);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = pages[sorted[idx]], b = pages[sorted[swapIdx]];
    db.ref(`pages/${sorted[idx]}/order`).set(b.order || 0);
    db.ref(`pages/${sorted[swapIdx]}/order`).set(a.order || 0);
  }

  function deletePage(pid) {
    if (!confirm(`Delete "${pages[pid].name || pid}"?`)) return;
    db.ref(`pages/${pid}`).remove();
    db.ref(`buttons/${pid}`).remove();
    if (currentPage === pid) { currentPage = null; currentKey = null; showEmptyEditor(); renderGrid(); }
  }

  // ===== SETTINGS =====
  document.getElementById('save-settings').addEventListener('click', () => {
    const r = parseInt(document.getElementById('set-rows').value) || 4;
    const c = parseInt(document.getElementById('set-cols').value) || 8;
    const pin = document.getElementById('set-pin').value.trim();
    db.ref('settings/grid').set({ rows: r, cols: c });
    if (pin) db.ref('settings/pin').set(pin);
    gridRows = r; gridCols = c;
    $grid.style.gridTemplateColumns = `repeat(${c}, var(--button-w))`;
    $gridSize.textContent = `${r}x${c}`;
    renderGrid();
  });

  // ===== SCENE LIST (cached for action dropdowns) =====
  window._scenes = [];
  db.ref('status/scenes').on('value', (snap) => {
    window._scenes = snap.val() || [];
  });

})();
