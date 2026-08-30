/* =========================================================
   OBS Remote Director — Deck Page Logic
   ========================================================= */

(function() {
  'use strict';

  // ---- Firebase Init ----
  firebase.initializeApp(FIREBASE_CONFIG);
  const db   = firebase.database();

  // ---- DOM ----
  const authScreen   = document.getElementById('auth-screen');
  const appScreen    = document.getElementById('app-screen');
  const pinInput     = document.getElementById('pin-input');
  const pinSubmit    = document.getElementById('pin-submit');
  const authError    = document.getElementById('auth-error');
  const pageTabsEl   = document.getElementById('page-tabs');
  const buttonGrid   = document.getElementById('button-grid');

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

  // ---- State ----
  let currentPage = 'page1';
  let buttons     = {};  // { pageId: { "row_col": { ... } } }
  let status      = {};
  let totalPages  = 1;

  function safeKey(name) {
    return String(name).replace(/\./g,'_').replace(/\$/g,'_').replace(/#/g,'_').replace(/\[/g,'_').replace(/\]/g,'_').replace(/\//g,'_');
  }

  // ---- ICONS ----
  const ICONS = [
    '🎬','🎥','📺','📷','🖼','🎭','🎪','🎤',
    '🔊','🔇','🔈','🔉','🎚','🎛','🎵','🎶',
    '🔴','⏺','⏹','⏯','⏸','🟢','🟡','🔵',
    '⬜','⬛','🔴','🟠','🟡','🟢','🔵','🟣',
    '💡','⚡','🌟','✨','🎯','🚀','💻','📡',
    '▶','⏸','⏹','⏭','⏮','⏩','⏪','🔀',
    '🔁','🔂','💾','📂','📝','⚙','🔧','🔨',
    '👤','👥','🏷','📌','📎','🔗','🔒','🔓',
  ];

  // ---- Auth ----
  pinSubmit.addEventListener('click', doAuth);
  pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAuth(); });

  function doAuth() {
    const pin = pinInput.value.trim();
    if (pin !== PIN_CODE) {
      authError.textContent = 'Wrong PIN';
      return;
    }
    authError.textContent = '';
    authScreen.style.display = 'none';
    appScreen.classList.add('active');
    startListeners();
  }

  // ---- Listeners ----
  function startListeners() {
    // Listen for buttons config
    db.ref('buttons').on('value', (snap) => {
      buttons = snap.val() || {};
      if (!buttons[currentPage]) {
        currentPage = 'page1';
      }
      totalPages = Math.max(1, Object.keys(buttons).length);
      renderTabs();
      renderGrid();
    });

    // Listen for status
    db.ref('status').on('value', (snap) => {
      status = snap.val() || {};
      updateStatusStrip();
      updateButtonHighlights();
    });

    // Firebase connection state
    db.ref('.info/connected').on('value', (snap) => {
      const connected = snap.val();
      dotFirebase.className = 'status-dot ' + (connected ? 'green' : 'red');
      valFirebase.textContent = connected ? 'OK' : 'DOWN';
    });
  }

  // ---- Status Strip ----
  function updateStatusStrip() {
    // Scene
    valScene.textContent = status.scene || '--';

    // Streaming
    if (status.streaming) {
      dotStream.className = 'status-dot green';
      valStream.textContent = 'LIVE';
    } else {
      dotStream.className = 'status-dot red';
      valStream.textContent = 'OFF';
    }

    // Recording
    if (status.recording) {
      dotRecord.className = status.paused ? 'status-dot yellow' : 'status-dot red';
      valRecord.textContent = status.paused ? 'PAUSED' : 'REC';
    } else {
      dotRecord.className = 'status-dot red';
      valRecord.textContent = 'OFF';
    }

    // OBS bridge connection
    const connections = status.connections || {};
    const bridgeKeys = Object.keys(connections);
    if (bridgeKeys.length > 0) {
      const first = connections[bridgeKeys[0]];
      if (first && first.connected) {
        dotObs.className = 'status-dot green';
        valObs.textContent = 'Connected';
      } else {
        dotObs.className = 'status-dot red';
        valObs.textContent = 'Disconnected';
      }
    } else {
      dotObs.className = 'status-dot red';
      valObs.textContent = 'No Bridge';
    }
  }

  // ---- Page Tabs ----
  function renderTabs() {
    pageTabsEl.innerHTML = '';
    const pages = Object.keys(buttons).sort();
    pages.forEach((pid) => {
      const tab = document.createElement('button');
      tab.className = 'page-tab' + (pid === currentPage ? ' active' : '');
      tab.textContent = pid.replace('page', 'Page ');
      tab.addEventListener('click', () => {
        currentPage = pid;
        renderTabs();
        renderGrid();
      });
      pageTabsEl.appendChild(tab);
    });

    // Add page button
    const addBtn = document.createElement('button');
    addBtn.className = 'page-tab-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add page';
    addBtn.addEventListener('click', () => {
      const next = 'page' + (pages.length + 1);
      db.ref('buttons/' + next).set({});
    });
    pageTabsEl.appendChild(addBtn);
  }

  // ---- Button Grid ----
  function renderGrid() {
    buttonGrid.innerHTML = '';
    const pageButtons = buttons[currentPage] || {};
    const cols = 8;
    buttonGrid.style.setProperty('--cols', cols);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        const key = r + '_' + c;
        const cfg = pageButtons[key];
        if (cfg && cfg.label) {
          const btn = createDeckButton(cfg, r, c);
          buttonGrid.appendChild(btn);
        } else {
          const empty = document.createElement('div');
          empty.className = 'deck-btn empty';
          buttonGrid.appendChild(empty);
        }
      }
    }
  }

  function createDeckButton(cfg, row, col) {
    const btn = document.createElement('button');
    const colorClass = 'color-' + (cfg.color || 'default');
    btn.className = 'deck-btn ' + colorClass;
    btn.dataset.row = row;
    btn.dataset.col = col;

    if (cfg.icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'btn-icon';
      iconEl.textContent = cfg.icon;
      btn.appendChild(iconEl);
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'btn-label';
    labelEl.textContent = cfg.label || '';
    btn.appendChild(labelEl);

    // Live indicator
    if (cfg.action === 'SetCurrentProgramScene' && cfg.value === status.scene) {
      btn.classList.add('is-live');
    }
    if (cfg.action === 'ToggleStream' || cfg.action === 'StartStream') {
      if (status.streaming) btn.classList.add('is-live');
    }
    if (cfg.action === 'ToggleRecord' || cfg.action === 'StartRecord') {
      if (status.recording) btn.classList.add('is-live');
    }
    // Mute state coloring
    if (cfg.action === 'SetInputMute' || cfg.action === 'ToggleInputMute') {
      const inputName = cfg.input || cfg.value;
      if (inputName && status.mutes && status.mutes[safeKey(inputName)] !== undefined) {
        if (status.mutes[safeKey(inputName)]) {
          btn.classList.add('color-red');
        } else {
          btn.classList.add('color-green');
        }
      }
    }

    btn.addEventListener('click', () => sendCommand(cfg));

    return btn;
  }

  // ---- Send Command ----
  function sendCommand(cfg) {
    const cmd = {
      action: cfg.action,
      value: cfg.value || null,
      requestedBy: 'user',
      ts: Date.now(),
    };

    // Extra fields
    if (cfg.input)    cmd.input = cfg.input;
    if (cfg.scene)    cmd.scene = cfg.scene;
    if (cfg.item)     cmd.item = cfg.item;
    if (cfg.filter)   cmd.filter = cfg.filter;
    if (cfg.source)   cmd.source = cfg.source;
    if (cfg.settings) cmd.settings = cfg.settings;
    if (cfg.extra)    cmd.extra = cfg.extra;

    db.ref('commands/latest').set(cmd);
  }

  // ---- Update Button Highlights ----
  function updateButtonHighlights() {
    const btns = buttonGrid.querySelectorAll('.deck-btn:not(.empty)');
    btns.forEach((btn) => {
      const row = parseInt(btn.dataset.row);
      const col = parseInt(btn.dataset.col);
      const key = row + '_' + col;
      const cfg = ((buttons[currentPage] || {})[key]) || {};

      // Remove old live classes
      btn.classList.remove('is-live', 'color-green', 'color-red');
      btn.classList.add('color-' + (cfg.color || 'default'));

      if (cfg.action === 'SetCurrentProgramScene' && cfg.value === status.scene) {
        btn.classList.add('is-live');
      }
      if ((cfg.action === 'ToggleStream' || cfg.action === 'StartStream') && status.streaming) {
        btn.classList.add('is-live');
      }
      if ((cfg.action === 'ToggleRecord' || cfg.action === 'StartRecord') && status.recording) {
        btn.classList.add('is-live');
      }
      if (cfg.action === 'SetInputMute' || cfg.action === 'ToggleInputMute') {
        const inputName = cfg.input || cfg.value;
        if (inputName && status.mutes && status.mutes[safeKey(inputName)] !== undefined) {
          btn.className = 'deck-btn color-' + (status.mutes[safeKey(inputName)] ? 'red' : 'green');
          if (status.mutes[safeKey(inputName)]) {
            btn.classList.add('is-live');
          }
        }
      }
    });
  }

})();
