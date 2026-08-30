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
  const edFbField = document.getElementById('ed-fb-field');
  const fbCustomFieldWrap = document.getElementById('fb-custom-field-wrap');
  const edFbCustomField = document.getElementById('ed-fb-custom-field');
  const edFbOp = document.getElementById('ed-fb-op');
  const fbValueWrap = document.getElementById('fb-value-wrap');
  const edFbValue = document.getElementById('ed-fb-value');
  const edFbPulse = document.getElementById('ed-fb-pulse');
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

  edFbField.addEventListener('change', () => {
    fbCustomFieldWrap.style.display = edFbField.value === 'custom' ? '' : 'none';
  });

  edFbOp.addEventListener('change', () => {
    const op = edFbOp.value;
    fbValueWrap.style.display = (op === 'true' || op === 'false') ? 'none' : '';
  });

  let fbTrueColor = 'green';
  let fbFalseColor = 'default';

  function buildFbColorGrids() {
    const trueGrid = document.getElementById('fb-true-colors');
    const falseGrid = document.getElementById('fb-false-colors');
    trueGrid.innerHTML = '';
    falseGrid.innerHTML = '';
    COLORS.forEach((c) => {
      // True color swatch
      const st = document.createElement('div');
      st.className = 'color-swatch';
      st.style.background = COLOR_HEX[c];
      st.dataset.color = c;
      if (c === fbTrueColor) st.classList.add('selected');
      st.addEventListener('click', () => {
        trueGrid.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
        st.classList.add('selected');
        fbTrueColor = c;
      });
      trueGrid.appendChild(st);

      // False color swatch
      const sf = document.createElement('div');
      sf.className = 'color-swatch';
      sf.style.background = COLOR_HEX[c];
      sf.dataset.color = c;
      if (c === fbFalseColor) sf.classList.add('selected');
      sf.addEventListener('click', () => {
        falseGrid.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
        sf.classList.add('selected');
        fbFalseColor = c;
      });
      falseGrid.appendChild(sf);
    });
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
      edFbField.value = fb.field || 'scene';
      fbCustomFieldWrap.style.display = edFbField.value === 'custom' ? '' : 'none';
      edFbCustomField.value = fb.customField || '';
      edFbOp.value = fb.op || 'eq';
      fbValueWrap.style.display = (fb.op === 'true' || fb.op === 'false') ? 'none' : '';
      edFbValue.value = fb.compareValue || '';
      fbTrueColor = fb.trueColor || 'green';
      fbFalseColor = fb.falseColor || 'default';
      edFbPulse.value = fb.pulse !== false ? 'true' : 'false';
      buildFbColorGrids();
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
      feedback = {
        type: 'custom',
        field: edFbField.value,
        customField: edFbCustomField.value.trim(),
        op: edFbOp.value,
        compareValue: edFbValue.value.trim(),
        trueColor: fbTrueColor,
        falseColor: fbFalseColor,
        pulse: edFbPulse.value === 'true',
      };
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
