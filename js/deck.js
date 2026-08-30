/* =========================================================
   OBS Remote Director — Deck Page Logic
   ========================================================= */
(function() {
  'use strict';

  // ---- Firebase Init ----
  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();

  // ---- DOM ----
  const authScreen   = document.getElementById('auth-screen');
  const appScreen    = document.getElementById('app-screen');
  const pinInput     = document.getElementById('pin-input');
  const pinSubmit    = document.getElementById('pin-submit');
  const authError    = document.getElementById('auth-error');
  const pageTabsEl   = document.getElementById('page-tabs');
  const buttonGrid   = document.getElementById('button-grid');
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
  let currentPage = null;
  let pages       = {};   // { pageId: { name, order } }
  let buttons     = {};   // { pageId: { "row_col": { ... } } }
  let status      = {};
  let gridRows    = 4;
  let gridCols    = 8;

  function safeKey(name) {
    return String(name).replace(/\./g,'_').replace(/\$/g,'_').replace(/#/g,'_').replace(/\[/g,'_').replace(/\]/g,'_').replace(/\//g,'_');
  }

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
    db.ref('settings/grid').on('value', (snap) => {
      const g = snap.val();
      if (g) { gridRows = g.rows || 4; gridCols = g.cols || 8; }
      renderGrid();
    });

    db.ref('pages').on('value', (snap) => {
      pages = snap.val() || {};
      if (!currentPage || !pages[currentPage]) {
        const keys = Object.keys(pages);
        currentPage = keys.length ? keys.sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0))[0] : null;
      }
      renderTabs();
      renderGrid();
    });

    db.ref('buttons').on('value', (snap) => {
      buttons = snap.val() || {};
      renderGrid();
    });

    db.ref('status').on('value', (snap) => {
      status = snap.val() || {};
      updateStatusStrip();
      updateButtonHighlights();
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
    if (status.streaming) {
      dotStream.className = 'status-dot green';
      valStream.textContent = 'LIVE';
    } else {
      dotStream.className = 'status-dot red';
      valStream.textContent = 'OFF';
    }
    if (status.recording) {
      dotRecord.className = status.paused ? 'status-dot yellow' : 'status-dot red';
      valRecord.textContent = status.paused ? 'PAUSED' : 'REC';
    } else {
      dotRecord.className = 'status-dot red';
      valRecord.textContent = 'OFF';
    }
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
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    sorted.forEach((pid) => {
      const tab = document.createElement('button');
      tab.className = 'page-tab' + (pid === currentPage ? ' active' : '');
      tab.textContent = pages[pid].name || pid;
      tab.addEventListener('click', () => {
        currentPage = pid;
        renderTabs();
        renderGrid();
      });
      pageTabsEl.appendChild(tab);
    });
  }

  // ---- Button Grid ----
  function renderGrid() {
    buttonGrid.innerHTML = '';
    const pageButtons = (currentPage && buttons[currentPage]) || {};
    buttonGrid.style.setProperty('--cols', gridCols);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const key = r + '_' + c;
        const cfg = pageButtons[key];
        if (cfg && cfg.label) {
          const btn = createDeckButton(cfg);
          btn.dataset.row = r;
          btn.dataset.col = c;
          buttonGrid.appendChild(btn);
        } else {
          const empty = document.createElement('div');
          empty.className = 'deck-btn empty';
          buttonGrid.appendChild(empty);
        }
      }
    }
  }

  function createDeckButton(cfg) {
    const btn = document.createElement('button');
    btn.className = 'deck-btn color-' + (cfg.color || 'default');

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

    btn.addEventListener('click', () => sendButtonActions(cfg));
    return btn;
  }

  // ---- Send Actions ----
  function sendButtonActions(cfg) {
    const actions = cfg.actions || [];
    if (!actions.length) return;
    actions.forEach((act, i) => {
      const delay = i * 500; // stagger by 500ms
      setTimeout(() => {
        const cmd = {
          action: act.type || act.action,
          ts: Date.now(),
        };
        if (act.scene)      cmd.scene = act.scene;
        if (act.source)     cmd.source = act.source;
        if (act.text)       cmd.text = act.text;
        if (act.url)        cmd.url = act.url;
        if (act.hotkey)     cmd.hotkey = act.hotkey;
        if (act.command)    cmd.command = act.command;
        if (act.muted !== undefined)  cmd.muted = act.muted;
        if (act.visible !== undefined) cmd.visible = act.visible;
        if (act.locked !== undefined)  cmd.locked = act.locked;
        db.ref('commands/latest').set(cmd);
      }, delay);
    });
  }

  // ---- Update Button Highlights ----
  function updateButtonHighlights() {
    const btns = buttonGrid.querySelectorAll('.deck-btn:not(.empty)');
    btns.forEach((btn) => {
      const row = parseInt(btn.dataset.row);
      const col = parseInt(btn.dataset.col);
      if (isNaN(row) || isNaN(col)) return;
      const key = row + '_' + col;
      const cfg = ((buttons[currentPage] || {})[key]) || {};
      const actions = cfg.actions || [];
      const feedbacks = cfg.feedbacks || [];

      // Reset to base color
      const allColorClasses = 'color-default color-green color-red color-yellow color-blue color-purple color-orange color-cyan color-pink color-gray';
      allColorClasses.split(' ').forEach(c => btn.classList.remove(c));
      btn.classList.remove('is-live');
      btn.classList.add('color-' + (cfg.color || 'default'));

      // Built-in feedback from first action
      if (actions.length > 0) {
        const a = actions[0];
        const t = a.type || a.action || '';
        if (t === 'set_scene' && a.scene === status.scene) {
          btn.classList.add('is-live');
        }
        if (t === 'set_preview_scene' && a.scene === status.preview) {
          btn.classList.add('color-blue');
        }
        if (t === 'start_stream' || t === 'stop_stream' || t === 'toggle_stream') {
          if (status.streaming) btn.classList.add('is-live');
        }
        if (t === 'start_record' || t === 'stop_record' || t === 'toggle_record') {
          if (status.recording) btn.classList.add('is-live');
        }
        if (t === 'pause_record' || t === 'resume_record') {
          if (status.recording && status.paused) btn.classList.add('color-yellow');
          else if (status.recording) btn.classList.add('is-live');
        }
        if (t === 'start_virtual_cam' || t === 'stop_virtual_cam' || t === 'toggle_virtual_cam') {
          if (status.virtualcam) btn.classList.add('is-live');
        }
        if (t === 'start_replay_buffer' || t === 'stop_replay_buffer' || t === 'save_replay') {
          if (status.replaybuffer) btn.classList.add('is-live');
        }
        if (t === 'set_source_mute' || t === 'toggle_source_mute') {
          const src = a.source || '';
          if (src && status.mutes) {
            const muted = status.mutes[safeKey(src)];
            if (muted !== undefined) {
              btn.className = 'deck-btn color-' + (muted ? 'red' : 'green');
              if (muted) btn.classList.add('is-live');
            }
          }
        }
        if (t === 'transition' || t === 'transition_stinger') {
          if (status.transitioning) btn.classList.add('color-yellow');
        }
      }

      // Custom feedback rules — first match wins
      let customMatched = false;
      for (const fb of feedbacks) {
        const fieldKey = fb.field === 'custom' ? fb.customField : fb.field;
        const parts = (fieldKey || '').split('.');
        let val = status;
        for (const p of parts) { val = val ? val[p] : undefined; }

        let condition = false;
        const op = fb.op || 'eq';
        const cmp = fb.compareValue || '';

        if (op === 'eq') condition = (String(val) === cmp);
        else if (op === 'neq') condition = (String(val) !== cmp);
        else if (op === 'true') condition = !!val;
        else if (op === 'false') condition = !val;
        else if (op === 'contains') condition = String(val).includes(cmp);

        if (condition) {
          allColorClasses.split(' ').forEach(c => btn.classList.remove(c));
          btn.classList.remove('is-live');
          btn.classList.add('color-' + (fb.trueColor || 'green'));
          customMatched = true;
          break;
        }
      }
      // If no feedback matched, button keeps base color (already set)
    });
  }

})();
