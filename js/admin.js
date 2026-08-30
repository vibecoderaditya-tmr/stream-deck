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

  // ---- Listeners ----
  function startListeners() {
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
    const cols = 8;
    buttonGrid.style.setProperty('--cols', cols);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
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
        buttonGrid.appendChild(btn);
      }
    }
  }

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
