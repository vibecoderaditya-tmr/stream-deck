/* =========================================================
   OBS Remote Director — Admin Panel (v2 Companion-style)
   ========================================================= */
(function () {
  'use strict';

  const COLOR_HEX = {
    default: '#3a3a3a', green: '#00c853', red: '#ff1744', blue: '#2979ff',
    yellow: '#ffd600', purple: '#aa00ff', orange: '#ff6d00', cyan: '#00e5ff',
    gray: '#555555', pink: '#f06292',
  };
  const COLORS = Object.keys(COLOR_HEX);
  const ICONS = [
    { v: '', l: 'None', cls: 'none-icon' },
    { v: '\u{1F4FA}', l: 'TV' }, { v: '\u{1F3AC}', l: 'Film' },
    { v: '\u{1F3A4}', l: 'Mic' }, { v: '\u{1F50A}', l: 'Speaker' },
    { v: '\u{1F4F7}', l: 'Camera' }, { v: '\u{1F3A8}', l: 'Palette' },
    { v: '\u26A1', l: 'Bolt' }, { v: '\u{1F534}', l: 'Red Dot' },
    { v: '\u{1F7E2}', l: 'Green' }, { v: '\u{1F535}', l: 'Blue' },
    { v: '\u{1F680}', l: 'Rocket' }, { v: '\u{1F512}', l: 'Lock' },
    { v: '\u23F9', l: 'Stop' }, { v: '\u25B6}', l: 'Play' },
    { v: '\u23F8', l: 'Pause' }, { v: '\u{1F4E3}', l: 'Broadcast' },
  ];

  const ACTION_TYPES = [
    { v: 'set_scene', t: 'Switch Program Scene', fields: ['scene'] },
    { v: 'set_preview_scene', t: 'Set Preview Scene', fields: ['scene'] },
    { v: 'transition', t: 'Transition (Take)', fields: [] },
    { v: 'quick_transition', t: 'Quick Transition', fields: ['quick_transition'] },
    { v: 'preview_next_scene', t: 'Preview Next Scene', fields: [] },
    { v: 'preview_previous_scene', t: 'Preview Previous Scene', fields: [] },
    { v: 'start_stream', t: 'Start Stream', fields: [] },
    { v: 'stop_stream', t: 'Stop Stream', fields: [] },
    { v: 'toggle_stream', t: 'Toggle Stream', fields: [] },
    { v: 'start_record', t: 'Start Recording', fields: [] },
    { v: 'stop_record', t: 'Stop Recording', fields: [] },
    { v: 'toggle_record', t: 'Toggle Recording', fields: [] },
    { v: 'pause_record', t: 'Pause Recording', fields: [] },
    { v: 'resume_record', t: 'Resume Recording', fields: [] },
    { v: 'split_record', t: 'Split Recording', fields: [] },
    { v: 'start_virtual_cam', t: 'Start Virtual Cam', fields: [] },
    { v: 'stop_virtual_cam', t: 'Stop Virtual Cam', fields: [] },
    { v: 'toggle_virtual_cam', t: 'Toggle Virtual Cam', fields: [] },
    { v: 'start_replay_buffer', t: 'Start Replay Buffer', fields: [] },
    { v: 'stop_replay_buffer', t: 'Stop Replay Buffer', fields: [] },
    { v: 'save_replay', t: 'Save Replay', fields: [] },
    { v: 'set_source_mute', t: 'Set Source Mute', fields: ['source', 'muted'] },
    { v: 'toggle_source_mute', t: 'Toggle Mute', fields: ['source'] },
    { v: 'set_scene_item_show', t: 'Set Source Visibility', fields: ['source', 'visible'] },
    { v: 'set_scene_item_lock', t: 'Lock/Unlock Source', fields: ['source', 'locked'] },
    { v: 'set_scene_item_transform', t: 'Set Source Transform', fields: ['source', 'transform'] },
    { v: 'set_source_text', t: 'Set Source Text', fields: ['source', 'text'] },
    { v: 'set_source_filter_enabled', t: 'Set Filter On/Off', fields: ['source', 'filter', 'filter_enabled'] },
    { v: 'set_source_filter_settings', t: 'Set Filter Settings', fields: ['source', 'filter', 'filter_settings'] },
    { v: 'play_media', t: 'Play Media', fields: ['source'] },
    { v: 'pause_media', t: 'Pause Media', fields: ['source'] },
    { v: 'restart_media', t: 'Restart Media', fields: ['source'] },
    { v: 'stop_media', t: 'Stop Media', fields: ['source'] },
    { v: 'previous_media', t: 'Previous Media', fields: ['source'] },
    { v: 'next_media', t: 'Next Media', fields: ['source'] },
    { v: 'set_media_time', t: 'Seek Media (ms)', fields: ['source', 'media_time'] },
    { v: 'refresh_browser_source', t: 'Refresh Browser Source', fields: ['source'] },
    { v: 'studio_mode', t: 'Toggle Studio Mode', fields: ['studio_mode'] },
    { v: 'set_profile', t: 'Switch Profile', fields: ['profile'] },
    { v: 'set_scene_collection', t: 'Switch Scene Collection', fields: ['scene_collection'] },
    { v: 'hotkey', t: 'Send Hotkey', fields: ['hotkey'] },
  ];

  const FEEDBACK_TYPES = [
    { v: 'scene_in_program', t: 'Scene in Program (Live)', fields: ['scene', 'activeColor'] },
    { v: 'scene_in_preview', t: 'Scene in Preview', fields: ['scene', 'activeColor'] },
    { v: 'scene_in_preview_program', t: 'Scene in Preview+Program', fields: ['scene', 'activeColor', 'activeColor2'] },
    { v: 'transition_in_progress', t: 'Transition in Progress', fields: ['activeColor'] },
    { v: 'source_visible_in_program', t: 'Source Visible in Program', fields: ['source', 'activeColor'] },
    { v: 'source_enabled_in_scene', t: 'Source Enabled in Scene', fields: ['scene', 'source', 'activeColor'] },
    { v: 'source_active_in_preview', t: 'Source Active in Preview', fields: ['source', 'activeColor'] },
  ];

  // ===== PRESETS =====
  const PRESETS = {
    'General': [
      { label: 'Blank', icon: '', color: 'default', actions: [], feedbacks: [] },
      { label: 'Transition', icon: '\u{1F504}', color: 'blue', actions: [{ type: 'transition' }], feedbacks: [{ type: 'transition_in_progress', activeColor: 'yellow' }] },
      { label: 'Studio Mode', icon: '\u{1F5A5}', color: 'purple', actions: [{ type: 'studio_mode', studio_mode: true }], feedbacks: [] },
    ],
    'Scene to Program': [
      // auto-generated from scenes
    ],
    'Scene to Preview': [
      // auto-generated from scenes
    ],
    'Streaming': [
      { label: 'GO LIVE', icon: '\u{1F534}', color: 'red', actions: [{ type: 'toggle_stream' }], feedbacks: [{ type: 'scene_in_program', activeColor: 'red' }] },
      { label: 'Start Stream', icon: '\u25B6', color: 'green', actions: [{ type: 'start_stream' }], feedbacks: [] },
      { label: 'Stop Stream', icon: '\u23F9', color: 'red', actions: [{ type: 'stop_stream' }], feedbacks: [] },
      { label: 'V-Cam On', icon: '\u{1F4F7}', color: 'cyan', actions: [{ type: 'toggle_virtual_cam' }], feedbacks: [] },
    ],
    'Recording': [
      { label: 'REC', icon: '\u23FA', color: 'red', actions: [{ type: 'toggle_record' }], feedbacks: [] },
      { label: 'Pause REC', icon: '\u23F8', color: 'yellow', actions: [{ type: 'pause_record' }], feedbacks: [] },
      { label: 'Split REC', icon: '\u2702', color: 'orange', actions: [{ type: 'split_record' }], feedbacks: [] },
      { label: 'Save Replay', icon: '\u{1F4BE}', color: 'cyan', actions: [{ type: 'save_replay' }], feedbacks: [] },
    ],
    'Sources': [
      { label: 'Mute', icon: '\u{1F507}', color: 'default', actions: [{ type: 'toggle_source_mute', source: '' }], feedbacks: [] },
      { label: 'Show/Hide', icon: '\u{1F441}', color: 'default', actions: [{ type: 'set_scene_item_show', source: '', visible: true }], feedbacks: [] },
      { label: 'Set Text', icon: '\u{1F4DD}', color: 'default', actions: [{ type: 'set_source_text', source: '', text: '' }], feedbacks: [] },
    ],
    'Media Sources': [
      { label: 'Play', icon: '\u25B6', color: 'green', actions: [{ type: 'play_media', source: '' }], feedbacks: [] },
      { label: 'Pause', icon: '\u23F8', color: 'yellow', actions: [{ type: 'pause_media', source: '' }], feedbacks: [] },
      { label: 'Stop', icon: '\u23F9', color: 'red', actions: [{ type: 'stop_media', source: '' }], feedbacks: [] },
      { label: 'Prev Track', icon: '\u23EE', color: 'default', actions: [{ type: 'previous_media', source: '' }], feedbacks: [] },
      { label: 'Next Track', icon: '\u23ED', color: 'default', actions: [{ type: 'next_media', source: '' }], feedbacks: [] },
      { label: 'Refresh', icon: '\u{1F504}', color: 'cyan', actions: [{ type: 'refresh_browser_source', source: '' }], feedbacks: [] },
    ],
    'Transitions': [
      { label: 'Cut', icon: '\u2702', color: 'default', actions: [{ type: 'quick_transition', quick_transition: 'Cut' }], feedbacks: [] },
    ],
    'Outputs': [
      { label: 'Profile', icon: '\u2699', color: 'default', actions: [{ type: 'set_profile', profile: '' }], feedbacks: [] },
      { label: 'Scene Coll.', icon: '\u{1F4C2}', color: 'default', actions: [{ type: 'set_scene_collection', scene_collection: '' }], feedbacks: [] },
    ],
  };

  // ===== FIREBASE =====
  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();

  // ===== STATE =====
  let pages = {};
  let buttons = {};
  let gridRows = 4, gridCols = 8;
  let currentPage = null;
  let currentKey = null;
  let saving = false;
  let copyBuffer = null;
  let moveMode = null; // null | 'move' | 'swap'
  let moveSource = null;

  // ===== DOM =====
  const $auth = document.getElementById('auth-screen');
  const $app = document.getElementById('app-screen');
  const $pinInput = document.getElementById('pin-input');
  const $grid = document.getElementById('button-grid');
  const $pageSelect = document.getElementById('page-select');
  const $editorEmpty = document.getElementById('editor-empty');
  const $editorAssigned = document.getElementById('editor-assigned');
  const $editorTabLabel = document.getElementById('editor-tab-label');
  const $actionsList = document.getElementById('actions-list');
  const $feedbacksList = document.getElementById('feedbacks-list');
  const $addActionSelect = document.getElementById('add-action-select');
  const $addFeedbackSelect = document.getElementById('add-feedback-select');
  const $livePreview = document.getElementById('live-preview');
  const $lpIcon = document.getElementById('lp-icon');
  const $lpLabel = document.getElementById('lp-label');
  const $spIcon = document.getElementById('sp-icon');
  const $spLabel = document.getElementById('sp-label');

  // ===== AUTH =====
  document.getElementById('pin-submit').addEventListener('click', tryPin);
  $pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });

  function tryPin() {
    const v = $pinInput.value.trim();
    db.ref('settings/pin').once('value', snap => {
      if (!snap.val() || v === snap.val()) { login(v); }
      else { document.getElementById('auth-error').textContent = 'Wrong PIN'; $pinInput.value = ''; $pinInput.focus(); }
    }).catch(() => login(v));
  }
  function login(v) {
    $auth.style.display = 'none';
    $app.classList.add('active');
    loadAll();
  }

  // ===== LOAD =====
  function loadAll() {
    db.ref('settings/grid').once('value', snap => {
      const g = snap.val();
      if (g) { gridRows = g.rows || 4; gridCols = g.cols || 8; }
      $grid.style.setProperty('--cols', gridCols);
      $grid.style.gridTemplateColumns = `repeat(${gridCols}, var(--button-w))`;
      renderGrid();
    });
    db.ref('pages').on('value', snap => {
      pages = snap.val() || {};
      if (!currentPage || !pages[currentPage]) {
        const keys = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
        currentPage = keys[0] || null;
      }
      renderPageSelect();
      renderGrid();
    });
    db.ref('buttons').on('value', snap => {
      buttons = snap.val() || {};
      renderGrid();
      if (currentKey && !saving) refreshEditor();
    });
    db.ref('status').on('value', snap => {
      const s = snap.val() || {};
      document.getElementById('dot-obs').className = 'status-dot' + (s.connections ? ' green' : '');
    });
    db.ref('.info/connected').on('value', snap => {
      document.getElementById('dot-firebase').className = 'status-dot' + (snap.val() ? ' green' : ' red');
    });
    db.ref('status/scenes').on('value', snap => { window._scenes = snap.val() || []; buildPresets(); });
    buildActionDropdown();
    buildFeedbackDropdown();
    buildPresets();
  }

  // ===== TOP TABS =====
  document.querySelectorAll('.top-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('tab-active'));
      document.getElementById('tab-' + tab.dataset.tab).classList.add('tab-active');
    });
  });

  // ===== SUB-TABS =====
  document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('subtab-active'));
      document.getElementById('subtab-' + tab.dataset.subtab).classList.add('subtab-active');
    });
  });

  // ===== PAGE SELECTOR =====
  function renderPageSelect() {
    $pageSelect.innerHTML = '';
    Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0)).forEach(pid => {
      const o = document.createElement('option');
      o.value = pid; o.textContent = pages[pid].name || pid;
      if (pid === currentPage) o.selected = true;
      $pageSelect.appendChild(o);
    });
  }
  $pageSelect.addEventListener('change', () => { currentPage = $pageSelect.value; currentKey = null; showEmpty(); renderGrid(); });
  document.getElementById('page-prev').addEventListener('click', () => navPage(-1));
  document.getElementById('page-next').addEventListener('click', () => navPage(1));
  document.getElementById('page-home').addEventListener('click', () => {
    const keys = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    if (keys.length) { currentPage = keys[0]; $pageSelect.value = currentPage; currentKey = null; showEmpty(); renderGrid(); }
  });
  document.getElementById('page-rename').addEventListener('click', () => {
    if (!currentPage || !pages[currentPage]) return;
    const name = prompt('Page name:', pages[currentPage].name || '');
    if (name !== null) db.ref(`pages/${currentPage}/name`).set(name);
  });
  function navPage(dir) {
    const keys = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const idx = keys.indexOf(currentPage);
    const next = idx + dir;
    if (next >= 0 && next < keys.length) {
      currentPage = keys[next]; $pageSelect.value = currentPage;
      currentKey = null; showEmpty(); renderGrid();
    }
  }

  // ===== GRID =====
  function renderGrid() {
    $grid.innerHTML = '';
    const pageBtns = (currentPage && buttons[currentPage]) || {};
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const key = `${r}_${c}`;
        const cfg = pageBtns[key];
        const div = document.createElement('div');
        if (cfg && cfg.label) {
          div.className = 'deck-btn c-' + (cfg.color || 'default');
          if (key === currentKey) div.classList.add('selected');
          if (cfg.icon) { const ico = document.createElement('span'); ico.className = 'btn-icon'; ico.textContent = cfg.icon; div.appendChild(ico); }
          const lbl = document.createElement('span'); lbl.className = 'btn-label'; lbl.textContent = cfg.label; div.appendChild(lbl);
        } else {
          div.className = 'deck-btn empty';
          if (key === currentKey) div.classList.add('selected');
          const coord = document.createElement('span'); coord.className = 'btn-coord'; coord.textContent = `${r}/${c}`; div.appendChild(coord);
        }
        div.dataset.key = key;
        div.addEventListener('click', () => selectTile(key));
        // Drag-drop target
        div.addEventListener('dragover', e => { e.preventDefault(); div.style.outline = '2px solid var(--accent)'; });
        div.addEventListener('dragleave', () => { div.style.outline = ''; });
        div.addEventListener('drop', e => { e.preventDefault(); div.style.outline = ''; handlePresetDrop(key, e); });
        $grid.appendChild(div);
      }
    }
  }

  function selectTile(key) {
    if (moveMode && moveSource && moveSource !== key) {
      const srcData = JSON.parse(JSON.stringify((buttons[currentPage] || {})[moveSource] || null));
      const dstData = JSON.parse(JSON.stringify((buttons[currentPage] || {})[key] || null));
      if (moveMode === 'move') {
        if (srcData) db.ref(`buttons/${currentPage}/${key}`).set(srcData);
        db.ref(`buttons/${currentPage}/${moveSource}`).remove();
      } else if (moveMode === 'swap') {
        if (srcData) db.ref(`buttons/${currentPage}/${key}`).set(srcData);
        else db.ref(`buttons/${currentPage}/${key}`).remove();
        if (dstData) db.ref(`buttons/${currentPage}/${moveSource}`).set(dstData);
        else db.ref(`buttons/${currentPage}/${moveSource}`).remove();
      }
      moveMode = null; moveSource = null;
      $grid.classList.remove('move-mode');
      return;
    }
    currentKey = key;
    renderGrid();
    const cfg = (buttons[currentPage] || {})[key];
    if (cfg && cfg.label) { showAssigned(cfg); } else { showEmpty(); }
  }

  function showEmpty() {
    $editorEmpty.style.display = '';
    $editorAssigned.style.display = 'none';
    $editorTabLabel.textContent = 'Edit Button';
  }
  function showAssigned(cfg) {
    $editorEmpty.style.display = 'none';
    $editorAssigned.style.display = '';
    $editorTabLabel.textContent = `Edit ${currentKey.replace('_', '/')}`;
    populateEditor(cfg);
  }

  // ===== EDITOR: EMPTY → REGULAR =====
  document.getElementById('btn-choose-regular').addEventListener('click', () => {
    if (!currentPage || !currentKey) return;
    const cfg = { label: '', color: 'default', icon: '', actions: [], feedbacks: [], notes: '' };
    db.ref(`buttons/${currentPage}/${currentKey}`).set(cfg);
    saving = true;
    db.ref(`buttons/${currentPage}/${currentKey}`).once('value', () => { saving = false; showAssigned(cfg); });
  });

  // ===== EDITOR: POPULATE =====
  function populateEditor(cfg) {
    // Top bar
    updateLivePreview(cfg);

    // Notes
    document.getElementById('ed-notes').value = cfg.notes || '';

    // Style fields
    document.getElementById('ed-label').value = cfg.label || '';
    $spLabel.textContent = cfg.label || 'Button';
    $lpLabel.textContent = cfg.label || 'Button';

    // Colors
    buildColorStrip('ed-colors', cfg.color || 'default', c => {
      updateLivePreview({ ...cfg, color: c });
    });

    // Text colors (store as textColor)
    buildColorStrip('ed-text-colors', cfg.textColor || 'default', () => {});

    // Icons
    buildIconStrip(cfg.icon || '');

    // Font size
    document.getElementById('ed-fontsize').value = cfg.fontSize || 10;
    document.getElementById('font-down').onclick = () => { const el = document.getElementById('ed-fontsize'); el.value = Math.max(6, parseInt(el.value) - 1); liveSave(); };
    document.getElementById('font-up').onclick = () => { const el = document.getElementById('ed-fontsize'); el.value = Math.min(30, parseInt(el.value) + 1); liveSave(); };

    // Actions
    buildActionsList(cfg.actions || []);

    // Feedbacks
    buildFeedbacksList(cfg.feedbacks || []);
  }

  function updateLivePreview(cfg) {
    const hex = COLOR_HEX[cfg.color || 'default'] || COLOR_HEX.default;
    $livePreview.style.background = hex;
    $spIcon.textContent = cfg.icon || '';
    $lpIcon.textContent = cfg.icon || '';
    $spLabel.textContent = cfg.label || '';
    $lpLabel.textContent = cfg.label || '';
  }

  function buildColorStrip(containerId, selected, onChange) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch' + (c === selected ? ' selected' : '');
      sw.style.background = COLOR_HEX[c];
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        el.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        if (onChange) onChange(c);
        liveSave();
      });
      el.appendChild(sw);
    });
  }

  function buildIconStrip(selected) {
    const el = document.getElementById('ed-icons');
    el.innerHTML = '';
    ICONS.forEach(ic => {
      const sw = document.createElement('div');
      sw.className = 'icon-opt' + (ic.cls ? ' ' + ic.cls : '') + (ic.v === selected ? ' selected' : '');
      sw.textContent = ic.v || '\u2014';
      sw.dataset.icon = ic.v;
      sw.addEventListener('click', () => {
        el.querySelectorAll('.icon-opt').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        liveSave();
      });
      el.appendChild(sw);
    });
  }

  // ===== ACTIONS =====
  function buildActionDropdown() {
    $addActionSelect.innerHTML = '<option value="">+ Add action...</option>';
    ACTION_TYPES.forEach(a => {
      const o = document.createElement('option'); o.value = a.v; o.textContent = a.t;
      $addActionSelect.appendChild(o);
    });
    $addActionSelect.addEventListener('change', () => {
      if (!$addActionSelect.value) return;
      addActionRow({ type: $addActionSelect.value });
      $addActionSelect.value = '';
      liveSave();
    });
  }

  function buildActionsList(actions) {
    $actionsList.innerHTML = '';
    actions.forEach(a => addActionRow(a));
  }

  function addActionRow(act) {
    act = act || {};
    const div = document.createElement('div');
    div.className = 'rule-row';

    let opts = '';
    ACTION_TYPES.forEach(a => { opts += `<option value="${a.v}"${(act.type || 'set_scene') === a.v ? ' selected' : ''}>${a.t}</option>`; });

    div.innerHTML = `<div class="rule-row-head">
      <select class="act-type">${opts}</select>
      <button class="rule-remove">&times;</button>
    </div><div class="rule-row-body"></div>`;

    div.querySelector('.rule-remove').addEventListener('click', () => { div.remove(); liveSave(); });
    div.querySelector('.act-type').addEventListener('change', () => { rebuildActionBody(div, act); liveSave(); });

    rebuildActionBody(div, act);
    $actionsList.appendChild(div);
  }

  function rebuildActionBody(row, act) {
    const body = row.querySelector('.rule-row-body');
    const type = row.querySelector('.act-type').value;
    const spec = ACTION_TYPES.find(a => a.v === type) || { fields: [] };
    body.innerHTML = '';

    spec.fields.forEach(f => {
      if (f === 'scene') {
        const sel = document.createElement('select'); sel.className = 'act-scene';
        sel.innerHTML = '<option value="">(current)</option>';
        (window._scenes || []).forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; if (act.scene === s) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', liveSave); body.appendChild(sel);
      } else if (f === 'source') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-source'; inp.placeholder = 'Source name'; inp.value = act.source || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'text') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-text'; inp.placeholder = 'Text content'; inp.value = act.text || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'quick_transition') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-quick_transition'; inp.placeholder = 'Transition name'; inp.value = act.quick_transition || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'filter') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-filter'; inp.placeholder = 'Filter name'; inp.value = act.filter || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'filter_enabled') {
        const sel = document.createElement('select'); sel.className = 'act-filter_enabled';
        const on = act.filter_enabled !== false; sel.innerHTML = `<option value="true"${on ? ' selected' : ''}>On</option><option value="false"${!on ? ' selected' : ''}>Off</option>`;
        sel.addEventListener('change', liveSave); body.appendChild(sel);
      } else if (f === 'filter_settings') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-filter_settings'; inp.placeholder = 'JSON settings'; inp.value = act.filter_settings || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'transform') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-transform'; inp.placeholder = 'JSON transform'; inp.value = act.transform || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'media_time') {
        const inp = document.createElement('input'); inp.type = 'number'; inp.className = 'act-media_time'; inp.placeholder = 'ms'; inp.value = act.media_time || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'profile') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-profile'; inp.placeholder = 'Profile name'; inp.value = act.profile || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'scene_collection') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-scene_collection'; inp.placeholder = 'Collection name'; inp.value = act.scene_collection || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'hotkey') {
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'act-hotkey'; inp.placeholder = 'Hotkey name'; inp.value = act.hotkey || '';
        inp.addEventListener('input', liveSave); body.appendChild(inp);
      } else if (f === 'muted') {
        const sel = document.createElement('select'); sel.className = 'act-muted';
        sel.innerHTML = `<option value="true"${act.muted ? ' selected' : ''}>Muted</option><option value="false"${!act.muted ? ' selected' : ''}>Unmuted</option>`;
        sel.addEventListener('change', liveSave); body.appendChild(sel);
      } else if (f === 'visible') {
        const sel = document.createElement('select'); sel.className = 'act-visible';
        sel.innerHTML = `<option value="true"${act.visible !== false ? ' selected' : ''}>Visible</option><option value="false"${act.visible === false ? ' selected' : ''}>Hidden</option>`;
        sel.addEventListener('change', liveSave); body.appendChild(sel);
      } else if (f === 'locked') {
        const sel = document.createElement('select'); sel.className = 'act-locked';
        sel.innerHTML = `<option value="true"${act.locked ? ' selected' : ''}>Locked</option><option value="false"${!act.locked ? ' selected' : ''}>Unlocked</option>`;
        sel.addEventListener('change', liveSave); body.appendChild(sel);
      } else if (f === 'studio_mode') {
        const sel = document.createElement('select'); sel.className = 'act-studio_mode';
        sel.innerHTML = `<option value="true"${act.studio_mode !== false ? ' selected' : ''}>Enable</option><option value="false"${act.studio_mode === false ? ' selected' : ''}>Disable</option>`;
        sel.addEventListener('change', liveSave); body.appendChild(sel);
      }
    });
  }

  // ===== FEEDBACKS =====
  function buildFeedbackDropdown() {
    $addFeedbackSelect.innerHTML = '<option value="">+ Add feedback...</option>';
    FEEDBACK_TYPES.forEach(f => {
      const o = document.createElement('option'); o.value = f.v; o.textContent = f.t;
      $addFeedbackSelect.appendChild(o);
    });
    $addFeedbackSelect.addEventListener('change', () => {
      if (!$addFeedbackSelect.value) return;
      addFeedbackRow({ type: $addFeedbackSelect.value, activeColor: 'green' });
      $addFeedbackSelect.value = '';
      liveSave();
    });
  }

  function buildFeedbacksList(feedbacks) {
    $feedbacksList.innerHTML = '';
    feedbacks.forEach(fb => addFeedbackRow(fb));
  }

  function addFeedbackRow(fb) {
    fb = fb || {};
    const div = document.createElement('div');
    div.className = 'rule-row';

    let typeOpts = '';
    FEEDBACK_TYPES.forEach(ft => { typeOpts += `<option value="${ft.v}"${(fb.type || 'scene_in_program') === ft.v ? ' selected' : ''}>${ft.t}</option>`; });

    div.innerHTML = `<div class="rule-row-head">
      <select class="fb-type">${typeOpts}</select>
      <button class="rule-remove">&times;</button>
    </div><div class="rule-row-body"></div><div class="rule-colors"></div>`;

    const head = div.querySelector('.rule-row-head');
    const body = div.querySelector('.rule-row-body');

    function renderFields() {
      const type = head.querySelector('.fb-type').value;
      const spec = FEEDBACK_TYPES.find(ft => ft.v === type) || { fields: [] };
      body.innerHTML = '';
      spec.fields.forEach(f => {
        if (f === 'scene') {
          const sel = document.createElement('select'); sel.className = 'fb-scene';
          sel.innerHTML = '<option value="">(any)</option>';
          (window._scenes || []).forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; if (fb.scene === s) o.selected = true; sel.appendChild(o); });
          sel.addEventListener('change', liveSave); body.appendChild(sel);
        } else if (f === 'source') {
          const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'fb-source'; inp.placeholder = 'Source name'; inp.value = fb.source || '';
          inp.addEventListener('input', liveSave); body.appendChild(inp);
        } else if (f === 'activeColor') {
          const strip = document.createElement('div'); strip.className = 'rule-colors';
          const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:10px;color:var(--text-secondary);width:100%;'; lbl.textContent = 'Color when active:';
          body.appendChild(lbl); body.appendChild(strip);
          COLORS.forEach(c => { const sw = document.createElement('div'); sw.className = 'color-swatch' + (c === (fb.activeColor || 'green') ? ' selected' : ''); sw.style.background = COLOR_HEX[c]; sw.dataset.color = c; sw.dataset.field = 'activeColor';
            sw.addEventListener('click', () => { strip.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected')); sw.classList.add('selected'); liveSave(); }); strip.appendChild(sw); });
        } else if (f === 'activeColor2') {
          const strip = document.createElement('div'); strip.className = 'rule-colors';
          const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:10px;color:var(--text-secondary);width:100%;'; lbl.textContent = 'Color when in Preview:';
          body.appendChild(lbl); body.appendChild(strip);
          COLORS.forEach(c => { const sw = document.createElement('div'); sw.className = 'color-swatch' + (c === (fb.activeColor2 || 'orange') ? ' selected' : ''); sw.style.background = COLOR_HEX[c]; sw.dataset.color = c; sw.dataset.field = 'activeColor2';
            sw.addEventListener('click', () => { strip.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected')); sw.classList.add('selected'); liveSave(); }); strip.appendChild(sw); });
        }
      });
    }

    renderFields();
    head.querySelector('.rule-remove').addEventListener('click', () => { div.remove(); liveSave(); });
    head.querySelector('.fb-type').addEventListener('change', () => { renderFields(); liveSave(); });
    $feedbacksList.appendChild(div);
  }

  // ===== LIVE SAVE =====
  let saveTimeout = null;
  function liveSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(doSave, 300);
  }

  function doSave() {
    if (!currentPage || !currentKey) return;

    // Color
    const colorEl = document.querySelector('#ed-colors .color-swatch.selected');
    const color = colorEl ? colorEl.dataset.color : 'default';

    // Text color
    const textColEl = document.querySelector('#ed-text-colors .color-swatch.selected');
    const textColor = textColEl ? textColEl.dataset.color : 'default';

    // Icon
    const iconEl = document.querySelector('#ed-icons .icon-opt.selected');
    const icon = iconEl ? iconEl.dataset.icon : '';

    // Gather actions
    const actions = [];
    $actionsList.querySelectorAll('.rule-row').forEach(row => {
      const type = row.querySelector('.act-type').value;
      const act = { type };
      const spec = ACTION_TYPES.find(a => a.v === type) || { fields: [] };
      spec.fields.forEach(f => {
        const el = row.querySelector('.act-' + f);
        if (!el) return;
        if (['muted', 'visible', 'locked', 'filter_enabled', 'studio_mode'].includes(f)) {
          act[f] = el.value === 'true';
        } else {
          act[f] = el.value || '';
        }
      });
      actions.push(act);
    });

    // Gather feedbacks
    const feedbacks = [];
    $feedbacksList.querySelectorAll('.rule-row').forEach(row => {
      const type = row.querySelector('.fb-type').value;
      const fb = { type };
      const sceneEl = row.querySelector('.fb-scene');
      if (sceneEl) fb.scene = sceneEl.value;
      const sourceEl = row.querySelector('.fb-source');
      if (sourceEl) fb.source = sourceEl.value;
      row.querySelectorAll('.rule-colors .color-swatch.selected, .rule-row-body .color-swatch.selected').forEach(sw => {
        fb[sw.dataset.field || 'activeColor'] = sw.dataset.color || 'green';
      });
      feedbacks.push(fb);
    });

    const cfg = {
      label: document.getElementById('ed-label').value.trim(),
      color, textColor, icon,
      fontSize: parseInt(document.getElementById('ed-fontsize').value) || 10,
      notes: document.getElementById('ed-notes').value.trim(),
      actions, feedbacks,
    };

    saving = true;
    db.ref(`buttons/${currentPage}/${currentKey}`).set(cfg).then(() => { saving = false; }).catch(() => { saving = false; });
  }

  // ===== KEYBOARD SHORTCUTS =====
  document.addEventListener('keydown', e => {
    if (!$app.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (!currentPage) return;
    const keys = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let [r, c] = (currentKey || '0_0').split('_').map(Number);
      if (e.key === 'ArrowRight') c = Math.min(c + 1, gridCols - 1);
      if (e.key === 'ArrowLeft') c = Math.max(c - 1, 0);
      if (e.key === 'ArrowDown') r = Math.min(r + 1, gridRows - 1);
      if (e.key === 'ArrowUp') r = Math.max(r - 1, 0);
      selectTile(r + '_' + c);
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && currentKey) {
      e.preventDefault();
      db.ref(`buttons/${currentPage}/${currentKey}`).remove();
      currentKey = null; showEmpty(); renderGrid();
    }
    if (e.ctrlKey && e.key === 'c' && currentKey) {
      copyBuffer = JSON.parse(JSON.stringify((buttons[currentPage] || {})[currentKey] || null));
    }
    if (e.ctrlKey && e.key === 'v' && currentKey && copyBuffer) {
      db.ref(`buttons/${currentPage}/${currentKey}`).set(copyBuffer);
    }
    if (e.key === 'PageUp' && keys.length) {
      const idx = keys.indexOf(currentPage);
      if (idx > 0) { currentPage = keys[idx - 1]; $pageSelect.value = currentPage; currentKey = null; showEmpty(); renderGrid(); }
    }
    if (e.key === 'PageDown' && keys.length) {
      const idx = keys.indexOf(currentPage);
      if (idx < keys.length - 1) { currentPage = keys[idx + 1]; $pageSelect.value = currentPage; currentKey = null; showEmpty(); renderGrid(); }
    }
    if (e.key === 'Escape') {
      moveMode = null; moveSource = null; $grid.classList.remove('move-mode');
    }
  });

  // ===== EDITOR BUTTONS =====
  document.getElementById('editor-delete').addEventListener('click', () => {
    if (!currentPage || !currentKey) return;
    db.ref(`buttons/${currentPage}/${currentKey}`).remove();
    currentKey = null; showEmpty(); renderGrid();
  });
  document.getElementById('editor-test').addEventListener('click', () => {
    if (!currentPage || !currentKey) return;
    const cfg = (buttons[currentPage] || {})[currentKey];
    if (cfg) sendButtonActions(cfg);
  });
  document.getElementById('editor-stop').addEventListener('click', () => {
    // Send stop commands
    db.ref('commands/latest').set({ action: 'stop_stream', ts: Date.now() });
  });

  function sendButtonActions(cfg) {
    (cfg.actions || []).forEach((act, i) => {
      setTimeout(() => {
        const cmd = { action: act.type, ts: Date.now() };
        Object.keys(act).forEach(k => { if (k !== 'type') cmd[k] = act[k]; });
        db.ref('commands/latest').set(cmd);
      }, i * 500);
    });
  }

  // ===== PAGES MANAGER =====
  document.getElementById('add-page').addEventListener('click', () => {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const maxOrder = sorted.length ? (pages[sorted[sorted.length - 1]].order || 0) : 0;
    const newId = 'page_' + Date.now();
    db.ref(`pages/${newId}`).set({ name: `Page ${maxOrder + 1}`, order: maxOrder + 1 });
  });

  function renderPagesList() {
    const list = document.getElementById('pages-list');
    list.innerHTML = '';
    Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0)).forEach(pid => {
      const div = document.createElement('div'); div.className = 'page-item';
      div.innerHTML = `<input type="text" value="${pages[pid].name || pid}" class="page-name">
        <button class="page-item-btn" data-a="up">&#9650;</button>
        <button class="page-item-btn" data-a="down">&#9660;</button>
        <button class="page-item-btn danger" data-a="del">&times;</button>`;
      div.querySelector('.page-name').addEventListener('input', e => db.ref(`pages/${pid}/name`).set(e.target.value));
      div.querySelector('[data-a="up"]').addEventListener('click', () => reorderPage(pid, -1));
      div.querySelector('[data-a="down"]').addEventListener('click', () => reorderPage(pid, 1));
      div.querySelector('[data-a="del"]').addEventListener('click', () => {
        if (confirm(`Delete "${pages[pid].name || pid}"?`)) {
          db.ref(`pages/${pid}`).remove(); db.ref(`buttons/${pid}`).remove();
          if (currentPage === pid) { currentPage = null; currentKey = null; showEmpty(); renderGrid(); }
        }
      });
      list.appendChild(div);
    });
  }

  function reorderPage(pid, dir) {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    const idx = sorted.indexOf(pid);
    const swap = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;
    const a = pages[sorted[idx]], b = pages[sorted[swap]];
    db.ref(`pages/${sorted[idx]}/order`).set(b.order || 0);
    db.ref(`pages/${sorted[swap]}/order`).set(a.order || 0);
  }

  // Re-render pages list when Pages tab is shown
  document.querySelector('[data-tab="pages"]').addEventListener('click', renderPagesList);

  // ===== PRESETS =====
  function buildPresets() {
    const container = document.getElementById('presets-categories');
    container.innerHTML = '';
    const scenes = window._scenes || [];

    // Auto-generate scene presets
    const sceneProg = []; const scenePrev = [];
    scenes.forEach(s => {
      sceneProg.push({ label: s, icon: '\u{1F3AC}', color: 'red', actions: [{ type: 'set_scene', scene: s }], feedbacks: [{ type: 'scene_in_program', scene: s, activeColor: 'red' }] });
      scenePrev.push({ label: s, icon: '\u{1F3AC}', color: 'green', actions: [{ type: 'set_preview_scene', scene: s }], feedbacks: [{ type: 'scene_in_preview', scene: s, activeColor: 'green' }] });
    });

    const cats = { ...PRESETS, 'Scene to Program': sceneProg, 'Scene to Preview': scenePrev };

    Object.keys(cats).forEach(catName => {
      const items = cats[catName];
      if (!items || !items.length) return;
      const cat = document.createElement('div'); cat.className = 'preset-cat';
      cat.innerHTML = `<div class="preset-cat-header"><span class="preset-cat-arrow">&#9654;</span> ${catName} <span style="margin-left:auto;font-size:10px;color:var(--text-dim);">${items.length}</span></div><div class="preset-cat-items"></div>`;
      const header = cat.querySelector('.preset-cat-header');
      const itemsEl = cat.querySelector('.preset-cat-items');
      header.addEventListener('click', () => cat.classList.toggle('open'));

      items.forEach(preset => {
        const btn = document.createElement('div');
        btn.className = 'preset-btn';
        btn.style.background = COLOR_HEX[preset.color] || COLOR_HEX.default;
        btn.style.color = '#fff';
        btn.draggable = true;
        btn.innerHTML = `<span class="pb-icon">${preset.icon || ''}</span><span class="pb-label">${preset.label}</span>`;
        btn.addEventListener('dragstart', e => {
          e.dataTransfer.setData('application/json', JSON.stringify(preset));
          e.dataTransfer.effectAllowed = 'copy';
        });
        itemsEl.appendChild(btn);
      });

      container.appendChild(cat);
    });

    // Search filter
    document.getElementById('preset-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.preset-cat').forEach(cat => {
        const name = cat.querySelector('.preset-cat-header').textContent.toLowerCase();
        const btns = cat.querySelectorAll('.preset-btn');
        let anyVisible = false;
        btns.forEach(btn => {
          const label = btn.querySelector('.pb-label').textContent.toLowerCase();
          const show = !q || label.includes(q) || name.includes(q);
          btn.style.display = show ? '' : 'none';
          if (show) anyVisible = true;
        });
        cat.style.display = anyVisible ? '' : 'none';
        if (q && anyVisible) cat.classList.add('open');
      });
    });
    document.getElementById('preset-clear').addEventListener('click', () => {
      document.getElementById('preset-search').value = '';
      container.querySelectorAll('.preset-cat').forEach(c => { c.style.display = ''; c.classList.remove('open'); });
      container.querySelectorAll('.preset-btn').forEach(b => b.style.display = '');
    });
  }

  function handlePresetDrop(key, e) {
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!data || !currentPage) return;
      db.ref(`buttons/${currentPage}/${key}`).set(data);
    } catch (err) {}
  }

  // ===== GRID TOOLBAR =====
  document.getElementById('tb-copy').addEventListener('click', () => {
    if (!currentKey || !currentPage) return;
    copyBuffer = JSON.parse(JSON.stringify((buttons[currentPage] || {})[currentKey] || null));
  });
  document.getElementById('tb-paste').addEventListener('click', () => {
    if (!currentKey || !currentPage || !copyBuffer) return;
    db.ref(`buttons/${currentPage}/${currentKey}`).set(copyBuffer);
  });
  document.getElementById('tb-move').addEventListener('click', () => {
    if (!currentKey || !currentPage) return;
    moveMode = 'move'; moveSource = currentKey;
    $grid.classList.add('move-mode');
  });
  document.getElementById('tb-swap').addEventListener('click', () => {
    if (!currentKey || !currentPage) return;
    moveMode = 'swap'; moveSource = currentKey;
    $grid.classList.add('move-mode');
  });
  document.getElementById('tb-delete').addEventListener('click', () => {
    if (!currentKey || !currentPage) return;
    db.ref(`buttons/${currentPage}/${currentKey}`).remove();
    currentKey = null; showEmpty(); renderGrid();
  });
  document.getElementById('tb-reset').addEventListener('click', () => {
    if (!currentPage) return;
    if (!confirm('Reset page to default empty grid?')) return;
    db.ref(`buttons/${currentPage}`).remove();
    currentKey = null; showEmpty(); renderGrid();
  });
  document.getElementById('tb-wipe').addEventListener('click', () => {
    if (!currentPage) return;
    if (!confirm('Wipe all buttons on this page?')) return;
    db.ref(`buttons/${currentPage}`).remove();
    currentKey = null; showEmpty(); renderGrid();
  });

})();
