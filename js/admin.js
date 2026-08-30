/* =========================================================
   OBS Remote Director — Admin/Editor Page Logic
   ========================================================= */

(function() {
  'use strict';

  firebase.initializeApp(FIREBASE_CONFIG);
  const db   = firebase.database();

  const authScreen   = document.getElementById('auth-screen');
  const appScreen    = document.getElementById('app-screen');
  const pinInput     = document.getElementById('pin-input');
  const pinSubmit    = document.getElementById('pin-submit');
  const authError    = document.getElementById('auth-error');
  const pageTabsEl   = document.getElementById('page-tabs');
  const buttonGrid   = document.getElementById('button-grid');
  const adminPanel   = document.getElementById('admin-panel');

  // Status elements
  const dotObs       = document.getElementById('dot-obs');
  const valObs       = document.getElementById('val-obs');
  const dotStream    = document.getElementById('dot-stream');
  const valStream    = document.getElementById('val-stream');
  const dotRecord    = document.getElementById('dot-record');
  const valRecord    = document.getElementById('val-record');
  const dotFirebase  = document.getElementById('dot-firebase');
  const valFirebase  = document.getElementById('val-firebase');
  const valScene     = document.getElementById('val-scene');

  // Editor fields
  const edLabel   = document.getElementById('ed-label');
  const edAction  = document.getElementById('ed-action');
  const edValue   = document.getElementById('ed-value');
  const edInput   = document.getElementById('ed-input');
  const edScene   = document.getElementById('ed-scene');
  const edItem    = document.getElementById('ed-item');
  const edFilter  = document.getElementById('ed-filter');
  const edFeedbackType = document.getElementById('ed-feedback-type');
  const feedbackBuiltin = document.getElementById('feedback-builtin');
  const feedbackCustom = document.getElementById('feedback-custom');
  const fbRulesEl = document.getElementById('fb-rules');
  const fbAddRule = document.getElementById('fb-add-rule');
  const btnSave   = document.getElementById('btn-save');
  const btnDelete = document.getElementById('btn-delete');
  const btnClose  = document.getElementById('btn-close');

  const COLORS = ['default','green','red','blue','yellow','purple','orange','cyan','gray','pink'];
  const COLOR_HEX = {
    default: '#0f3460', green: '#00c853', red: '#ff1744', blue: '#2979ff',
    yellow: '#ffd600', purple: '#aa00ff', orange: '#ff6d00', cyan: '#00e5ff',
    gray: '#555555', pink: '#f06292'
  };
  const ICONS = [
    '🎬','🎥','📺','📷','🖼','🎭','🎪','🎤',
    '🔊','🔇','🔈','🔉','🎚','🎛','🎵','🎶',
    '🔴','⏺','⏹','⏯','⏸','🟢','🟡','🔵',
    '⬜','⬛','💡','⚡','🌟','✨','🎯','🚀',
    '▶','💾','📂','📝','⚙','🔧','👤','📡',
  ];

  let currentPage = 'page1';
  let buttons     = {};
  let status      = {};
  let editingKey  = null;
  let gridRows    = 4;
  let gridCols    = 8;
  let clipboard   = null;
  let cutSource   = null;
  let ctxTarget   = null;

  // ---- Auth ----
  pinSubmit.addEventListener('click', doAuth);
  pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAuth(); });

  function doAuth() {
    const pin = pinInput.value.trim();
    if (pin !== PIN_CODE) { authError.textContent = 'Wrong PIN'; return; }
    authError.textContent = '';
    authScreen.style.display = 'none';
    appScreen.classList.add('active');
    buildColorGrid();
    buildIconGrid();
    startListeners();
  }

  // Show/hide custom feedback fields
  edFeedbackType.addEventListener('change', () => {
    const t = edFeedbackType.value;
    feedbackBuiltin.style.display = t === 'builtin' ? '' : 'none';
    feedbackCustom.style.display = t === 'custom' ? '' : 'none';
  });

  const FB_FIELDS = [
    { v: 'scene', t: 'Program Scene' },
    { v: 'preview', t: 'Preview Scene' },
    { v: 'streaming', t: 'Is Streaming' },
    { v: 'recording', t: 'Is Recording' },
    { v: 'paused', t: 'Is Paused' },
    { v: 'virtualcam', t: 'Virtual Cam Active' },
    { v: 'replaybuffer', t: 'Replay Buffer Active' },
    { v: 'studio_mode', t: 'Studio Mode On' },
    { v: 'transitioning', t: 'Transition In Progress' },
    { v: 'custom', t: 'Custom field...' },
  ];

  let fbRuleCount = 0;

  function addFbRule(rule) {
    rule = rule || {};
    const id = fbRuleCount++;
    const div = document.createElement('div');
    div.className = 'fb-rule';
    div.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:8px;margin-bottom:6px;position:relative;';
    div.dataset.idx = id;

    let fieldOpts = '';
    FB_FIELDS.forEach(f => {
      const sel = (rule.field || 'scene') === f.v ? ' selected' : '';
      fieldOpts += `<option value="${f.v}"${sel}>${f.t}</option>`;
    });

    div.innerHTML = `
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <select class="fb-field" style="flex:1;padding:4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text-primary);font-size:11px;">${fieldOpts}</select>
        <select class="fb-op" style="width:80px;padding:4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text-primary);font-size:11px;">
          <option value="eq"${(rule.op||'eq')==='eq'?' selected':''}>Equals</option>
          <option value="neq"${rule.op==='neq'?' selected':''}>Not Equals</option>
          <option value="true"${rule.op==='true'?' selected':''}>Is True</option>
          <option value="false"${rule.op==='false'?' selected':''}>Is False</option>
          <option value="contains"${rule.op==='contains'?' selected':''}>Contains</option>
        </select>
      </div>
      <div class="fb-custom-wrap" style="display:${(rule.field||'scene')==='custom'?'':'none'};margin-bottom:6px;">
        <input class="fb-custom-field" type="text" value="${rule.customField||''}" placeholder="e.g. mutes.Mic_Aux" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text-primary);font-size:11px;">
      </div>
      <div class="fb-val-wrap" style="display:${(rule.op||'eq')==='true'||(rule.op||'eq')==='false'?'none':''};margin-bottom:6px;">
        <input class="fb-value" type="text" value="${rule.compareValue||''}" placeholder="e.g. Scene 2" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text-primary);font-size:11px;">
      </div>
      <div class="fb-colors" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;"></div>
      <div style="display:flex;align-items:center;gap:6px;">
        <label style="font-size:10px;color:var(--text-secondary);margin:0;">Pulse</label>
        <select class="fb-pulse" style="padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text-primary);font-size:11px;">
          <option value="true"${rule.pulse!==false?' selected':''}>Yes</option>
          <option value="false"${rule.pulse===false?' selected':''}>No</option>
        </select>
        <button class="fb-remove" style="margin-left:auto;padding:2px 8px;border:1px solid var(--accent-red);border-radius:4px;background:transparent;color:var(--accent-red);cursor:pointer;font-size:11px;">Remove</button>
      </div>
    `;

    // Build color swatches
    const colorsEl = div.querySelector('.fb-colors');
    const selectedTrueColor = rule.trueColor || 'green';
    COLORS.forEach((c) => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch' + (c === selectedTrueColor ? ' selected' : '');
      sw.style.cssText = 'width:22px;height:22px;border-radius:4px;cursor:pointer;border:2px solid transparent;';
      sw.style.background = COLOR_HEX[c];
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        colorsEl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
      colorsEl.appendChild(sw);
    });

    // Event listeners
    div.querySelector('.fb-field').addEventListener('change', (e) => {
      div.querySelector('.fb-custom-wrap').style.display = e.target.value === 'custom' ? '' : 'none';
    });
    div.querySelector('.fb-op').addEventListener('change', (e) => {
      const op = e.target.value;
      div.querySelector('.fb-val-wrap').style.display = (op === 'true' || op === 'false') ? 'none' : '';
    });
    div.querySelector('.fb-remove').addEventListener('click', () => div.remove());

    fbRulesEl.appendChild(div);
  }

  fbAddRule.addEventListener('click', () => addFbRule());

  function getFbRules() {
    const rules = [];
    fbRulesEl.querySelectorAll('.fb-rule').forEach((div) => {
      const selColor = div.querySelector('.fb-colors .color-swatch.selected');
      rules.push({
        field: div.querySelector('.fb-field').value,
        customField: div.querySelector('.fb-custom-field').value.trim(),
        op: div.querySelector('.fb-op').value,
        compareValue: div.querySelector('.fb-value').value.trim(),
        trueColor: selColor ? selColor.dataset.color : 'green',
        pulse: div.querySelector('.fb-pulse').value === 'true',
      });
    });
    return rules;
  }

  // ---- Grid Settings ----
  document.getElementById('grid-apply').addEventListener('click', () => {
    const r = parseInt(document.getElementById('grid-rows').value) || 4;
    const c = parseInt(document.getElementById('grid-cols').value) || 8;
    gridRows = Math.max(1, Math.min(20, r));
    gridCols = Math.max(1, Math.min(20, c));
    db.ref('settings/grid').set({ rows: gridRows, cols: gridCols });
  });

  // ---- Listeners ----
  function startListeners() {
    db.ref('settings/grid').on('value', (snap) => {
      const g = snap.val();
      if (g) {
        gridRows = g.rows || 4;
        gridCols = g.cols || 8;
        document.getElementById('grid-rows').value = gridRows;
        document.getElementById('grid-cols').value = gridCols;
      }
      renderGrid();
    });

    db.ref('buttons').on('value', (snap) => {
      buttons = snap.val() || {};
      if (!buttons[currentPage]) currentPage = 'page1';
      renderTabs();
      renderGrid();
    });

    db.ref('status').on('value', (snap) => {
      status = snap.val() || {};
      updateStatusStrip();
    });

    db.ref('.info/connected').on('value', (snap) => {
      const connected = snap.val();
      dotFirebase.className = 'status-dot ' + (connected ? 'green' : 'red');
      valFirebase.textContent = connected ? 'OK' : 'DOWN';
    });
  }

  // ---- Status Strip ----
  function updateStatusStrip() {
    valScene.textContent = status.scene || '--';
    if (status.streaming) { dotStream.className = 'status-dot green'; valStream.textContent = 'LIVE'; }
    else { dotStream.className = 'status-dot red'; valStream.textContent = 'OFF'; }
    if (status.recording) {
      dotRecord.className = status.paused ? 'status-dot yellow' : 'status-dot red';
      valRecord.textContent = status.paused ? 'PAUSED' : 'REC';
    } else { dotRecord.className = 'status-dot red'; valRecord.textContent = 'OFF'; }
    const connections = status.connections || {};
    const bk = Object.keys(connections);
    if (bk.length > 0 && connections[bk[0]] && connections[bk[0]].connected) {
      dotObs.className = 'status-dot green'; valObs.textContent = 'Connected';
    } else { dotObs.className = 'status-dot red'; valObs.textContent = 'No Bridge'; }
  }

  // ---- Tabs ----
  function renderTabs() {
    pageTabsEl.innerHTML = '';
    const pages = Object.keys(buttons).sort();
    pages.forEach((pid) => {
      const tab = document.createElement('button');
      tab.className = 'page-tab' + (pid === currentPage ? ' active' : '');
      tab.textContent = pid.replace('page', 'Page ');
      tab.addEventListener('click', () => { currentPage = pid; renderTabs(); renderGrid(); });
      pageTabsEl.appendChild(tab);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'page-tab-add';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      const next = 'page' + (pages.length + 1);
      db.ref('buttons/' + next).set({});
    });
    pageTabsEl.appendChild(addBtn);
  }

  // ---- Grid ----
  function renderGrid() {
    buttonGrid.innerHTML = '';
    const pageButtons = buttons[currentPage] || {};
    buttonGrid.style.setProperty('--cols', gridCols);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const key = r + '_' + c;
        const cfg = pageButtons[key];
        const btn = document.createElement('button');
        const colorClass = (cfg && cfg.label) ? 'color-' + (cfg.color || 'default') : 'empty';
        btn.className = 'deck-btn admin-mode ' + colorClass;
        btn.dataset.row = r;
        btn.dataset.col = c;

        if (cfg && cfg.label) {
          if (cfg.icon) {
            const iconEl = document.createElement('span');
            iconEl.className = 'btn-icon';
            iconEl.textContent = cfg.icon;
            btn.appendChild(iconEl);
          }
          const labelEl = document.createElement('span');
          labelEl.className = 'btn-label';
          labelEl.textContent = cfg.label;
          btn.appendChild(labelEl);

          // Edit overlay
          const overlay = document.createElement('span');
          overlay.className = 'edit-overlay';
          overlay.textContent = '✎';
          btn.appendChild(overlay);
        } else {
          const plus = document.createElement('span');
          plus.className = 'btn-label';
          plus.textContent = '+';
          plus.style.opacity = '0.3';
          btn.appendChild(plus);
        }

        btn.addEventListener('click', () => openEditor(r, c));
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          ctxTarget = { row: r, col: c };
          showCtxMenu(e.pageX, e.pageY, r, c);
        });
        buttonGrid.appendChild(btn);
      }
    }
  }

  // ---- Context Menu ----
  const ctxMenu = document.getElementById('ctx-menu');

  function showCtxMenu(x, y, row, col) {
    const key = row + '_' + col;
    const cfg = ((buttons[currentPage] || {})[key]) || null;
    const hasBtn = cfg && cfg.label;

    ctxMenu.querySelector('[data-action="copy"]').style.display = hasBtn ? '' : 'none';
    ctxMenu.querySelector('[data-action="cut"]').style.display = hasBtn ? '' : 'none';
    ctxMenu.querySelector('[data-action="paste"]').style.display = (clipboard && !hasBtn) ? '' : 'none';
    ctxMenu.querySelector('[data-action="delete"]').style.display = hasBtn ? '' : 'none';

    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.remove('hidden');
  }

  document.addEventListener('click', () => ctxMenu.classList.add('hidden'));

  ctxMenu.querySelectorAll('.ctx-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!ctxTarget) return;
      const key = ctxTarget.row + '_' + ctxTarget.col;
      const action = item.dataset.action;

      if (action === 'copy') {
        clipboard = JSON.parse(JSON.stringify(((buttons[currentPage] || {})[key]) || null));
        cutSource = null;
      }

      if (action === 'cut') {
        clipboard = JSON.parse(JSON.stringify(((buttons[currentPage] || {})[key]) || null));
        cutSource = { page: currentPage, key: key };
      }

      if (action === 'paste' && clipboard) {
        db.ref('buttons/' + currentPage + '/' + key).set(JSON.parse(JSON.stringify(clipboard)));
        if (cutSource) {
          db.ref('buttons/' + cutSource.page + '/' + cutSource.key).remove();
          cutSource = null;
        }
        clipboard = null;
      }

      if (action === 'delete') {
        db.ref('buttons/' + currentPage + '/' + key).remove();
      }

      ctxMenu.classList.add('hidden');
    });
  });

  // ---- Color Grid ----
  function buildColorGrid() {
    const grid = document.getElementById('color-grid');
    grid.innerHTML = '';
    COLORS.forEach((c) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = COLOR_HEX[c];
      swatch.dataset.color = c;
      swatch.addEventListener('click', () => {
        grid.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
      grid.appendChild(swatch);
    });
  }

  // ---- Icon Grid ----
  function buildIconGrid() {
    const grid = document.getElementById('icon-grid');
    grid.innerHTML = '';

    // No icon option
    const none = document.createElement('div');
    none.className = 'icon-option';
    none.textContent = '✕';
    none.style.opacity = '0.4';
    none.dataset.icon = '';
    none.addEventListener('click', () => {
      grid.querySelectorAll('.icon-option').forEach((s) => s.classList.remove('selected'));
      none.classList.add('selected');
    });
    grid.appendChild(none);

    ICONS.forEach((ic) => {
      const el = document.createElement('div');
      el.className = 'icon-option';
      el.textContent = ic;
      el.dataset.icon = ic;
      el.addEventListener('click', () => {
        grid.querySelectorAll('.icon-option').forEach((s) => s.classList.remove('selected'));
        el.classList.add('selected');
      });
      grid.appendChild(el);
    });
  }

  // ---- Editor ----
  function openEditor(row, col) {
    editingKey = row + '_' + col;
    const cfg = ((buttons[currentPage] || {})[editingKey]) || {};

    edLabel.value  = cfg.label || '';
    edAction.value = cfg.action || 'SetCurrentProgramScene';
    edValue.value  = cfg.value || '';
    edInput.value  = cfg.input || '';
    edScene.value  = cfg.scene || '';
    edItem.value   = cfg.item || '';
    edFilter.value = cfg.filter || '';

    // Feedback fields
    const fb = cfg.feedback || {};
    fbRulesEl.innerHTML = '';
    fbRuleCount = 0;
    if (!fb.type) {
      edFeedbackType.value = '';
      feedbackBuiltin.style.display = 'none';
      feedbackCustom.style.display = 'none';
    } else if (fb.type === 'builtin') {
      edFeedbackType.value = 'builtin';
      feedbackBuiltin.style.display = '';
      feedbackCustom.style.display = 'none';
    } else if (fb.type === 'custom') {
      edFeedbackType.value = 'custom';
      feedbackBuiltin.style.display = 'none';
      feedbackCustom.style.display = '';
      (fb.rules || []).forEach(r => addFbRule(r));
    }

    // Select color
    document.querySelectorAll('.color-swatch').forEach((s) => {
      s.classList.toggle('selected', s.dataset.color === (cfg.color || 'default'));
    });

    // Select icon
    document.querySelectorAll('.icon-option').forEach((s) => {
      s.classList.toggle('selected', s.dataset.icon === (cfg.icon || ''));
    });

    adminPanel.classList.add('open');
  }

  function closeEditor() {
    adminPanel.classList.remove('open');
    editingKey = null;
  }

  btnClose.addEventListener('click', closeEditor);

  btnSave.addEventListener('click', () => {
    if (!editingKey) return;
    const selectedColor = document.querySelector('.color-swatch.selected');
    const selectedIcon  = document.querySelector('.icon-option.selected');

    const feedbackType = edFeedbackType.value;
    let feedback = null;
    if (feedbackType === 'builtin') {
      feedback = { type: 'builtin' };
    } else if (feedbackType === 'custom') {
      feedback = { type: 'custom', rules: getFbRules() };
    }

    const data = {
      label:  edLabel.value.trim(),
      action: edAction.value,
      value:  edValue.value.trim(),
      input:  edInput.value.trim(),
      scene:  edScene.value.trim(),
      item:   edItem.value.trim(),
      filter: edFilter.value.trim(),
      color:  selectedColor ? selectedColor.dataset.color : 'default',
      icon:   selectedIcon ? selectedIcon.dataset.icon : '',
      feedback: feedback,
    };
    db.ref('buttons/' + currentPage + '/' + editingKey).set(data);
    closeEditor();
  });

  btnDelete.addEventListener('click', () => {
    if (!editingKey) return;
    if (!confirm('Delete this button?')) return;
    db.ref('buttons/' + currentPage + '/' + editingKey).remove();
    closeEditor();
  });

})();
