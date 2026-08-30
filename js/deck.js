/* =========================================================
   OBS Remote Director — Deck Page (v2 Companion-style)
   ========================================================= */
(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────── */
  const COLOR_HEX = {
    default: '#3a3a3a', green: '#00c853', red: '#ff1744', blue: '#2979ff',
    yellow: '#ffd600', purple: '#aa00ff', orange: '#ff6d00', cyan: '#00e5ff',
    gray: '#555555', pink: '#f06292',
  };

  const ACTION_HINTS = {
    set_scene: 'Program', set_preview_scene: 'Preview', transition: 'Take',
    start_stream: 'Go Live', stop_stream: 'Stop', toggle_stream: 'Toggle',
    start_record: 'Rec', stop_record: 'Stop', toggle_record: 'Toggle',
    pause_record: 'Pause', resume_record: 'Resume',
    start_virtual_cam: 'VCam', stop_virtual_cam: 'VCam', toggle_virtual_cam: 'VCam',
    start_replay_buffer: 'Replay', stop_replay_buffer: 'Replay', save_replay: 'Save',
    play_media: 'Play', pause_media: 'Pause', restart_media: 'Restart',
    stop_media: 'Stop', previous_media: 'Prev', next_media: 'Next',
    studio_mode: 'Studio', set_source_mute: 'Mute', toggle_source_mute: 'Mute',
  };

  /* ── Firebase ──────────────────────────────────────────── */
  firebase.initializeApp(FIREBASE_CONFIG);
  const db = firebase.database();

  /* ── DOM ───────────────────────────────────────────────── */
  const $auth      = document.getElementById('auth-screen');
  const $app       = document.getElementById('app-screen');
  const $grid      = document.getElementById('dk-grid');
  const $heading   = document.getElementById('dk-heading');
  const $overlay   = document.getElementById('dk-overlay');
  const $btnFS     = document.getElementById('btn-fullscreen');
  const $btnCfg    = document.getElementById('btn-settings');
  const $dkClose   = document.getElementById('dk-close');

  /* ── State ─────────────────────────────────────────────── */
  let pages     = {};
  let buttons   = {};
  let status    = {};
  let gridRows  = 4;
  let gridCols  = 8;

  // View settings (from URL params)
  let cfg = {
    pages: [],
    minCol: 0, maxCol: 99,
    minRow: 0, maxRow: 99,
    displayColumns: 0,
    hideConfig: false,
    hideFullscreen: false,
    showHeadings: false,
  };

  let currentPage = null;
  let isFS = false;
  let resizeTimer = null;

  /* ── URL Params ────────────────────────────────────────── */
  function parseParams() {
    const p = new URLSearchParams(location.search);
    if (p.has('pages')) {
      const raw = p.get('pages');
      const result = [];
      raw.split(',').forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes('..')) {
          const [a, b] = trimmed.split('..').map(Number);
          for (let i = a; i <= b; i++) result.push(i);
        } else {
          const n = parseInt(trimmed, 10);
          if (!isNaN(n)) result.push(n);
        }
      });
      cfg.pages = result;
    }
    cfg.minCol        = parseInt(p.get('minCol')) || 0;
    cfg.maxCol        = parseInt(p.get('maxCol'));
    if (isNaN(cfg.maxCol)) cfg.maxCol = 99;
    cfg.minRow        = parseInt(p.get('minRow')) || 0;
    cfg.maxRow        = parseInt(p.get('maxRow'));
    if (isNaN(cfg.maxRow)) cfg.maxRow = 99;
    cfg.displayColumns = parseInt(p.get('cols')) || 0;
    cfg.hideConfig     = p.get('hideConfig') === 'true';
    cfg.hideFullscreen = p.get('hideFullscreen') === 'true';
    cfg.showHeadings   = p.get('showHeadings') === 'true';
  }

  function writeParams() {
    const p = new URLSearchParams();
    if (cfg.pages.length) p.set('pages', cfg.pages.join(','));
    if (cfg.minCol) p.set('minCol', cfg.minCol);
    if (cfg.maxCol < 99) p.set('maxCol', cfg.maxCol);
    if (cfg.minRow) p.set('minRow', cfg.minRow);
    if (cfg.maxRow < 99) p.set('maxRow', cfg.maxRow);
    if (cfg.displayColumns) p.set('cols', cfg.displayColumns);
    if (cfg.hideConfig) p.set('hideConfig', 'true');
    if (cfg.hideFullscreen) p.set('hideFullscreen', 'true');
    if (cfg.showHeadings) p.set('showHeadings', 'true');
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* ── Auth ──────────────────────────────────────────────── */
  document.getElementById('pin-submit').addEventListener('click', doAuth);
  document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') doAuth(); });

  function doAuth() {
    const pin = document.getElementById('pin-input').value.trim();
    if (pin !== PIN_CODE) {
      document.getElementById('auth-error').textContent = 'Wrong PIN';
      return;
    }
    document.getElementById('auth-error').textContent = '';
    $auth.style.display = 'none';
    $app.classList.add('active');
    parseParams();
    applySettings();
    startListeners();
  }

  /* ── Listeners ─────────────────────────────────────────── */
  function startListeners() {
    db.ref('settings/grid').on('value', snap => {
      const g = snap.val();
      if (g) { gridRows = g.rows || 4; gridCols = g.cols || 8; }
      renderGrid();
    });

    db.ref('pages').on('value', snap => {
      pages = snap.val() || {};
      if (!currentPage || !pages[currentPage]) {
        const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
        currentPage = pickFirstPage(sorted);
      }
      renderGrid();
    });

    db.ref('buttons').on('value', snap => {
      buttons = snap.val() || {};
      console.log('[Buttons]', JSON.stringify(buttons).substring(0, 500));
      renderGrid();
    });

    db.ref('status').on('value', snap => {
      status = snap.val() || {};
      console.log('[Status]', { previewScene: status.previewScene, programScene: status.programScene, preview: status.preview });
      updateHighlights();
    });

    db.ref('.info/connected').on('value', snap => {
      // Could show connection indicator if needed
    });

    db.ref('status/scenes').on('value', snap => {
      window._scenes = snap.val() || [];
    });
  }

  function pickFirstPage(sortedKeys) {
    if (cfg.pages.length && sortedKeys.length) {
      const ordered = cfg.pages
        .map(n => sortedKeys.find((_, i) => i === n - 1))
        .filter(Boolean);
      if (ordered.length) return ordered[0];
    }
    return sortedKeys[0] || null;
  }

  /* ── Settings ──────────────────────────────────────────── */
  function applySettings() {
    $btnFS.style.display  = cfg.hideFullscreen ? 'none' : '';
    $btnCfg.style.display = cfg.hideConfig ? 'none' : '';
    $heading.style.display = cfg.showHeadings ? '' : 'none';
    writeParams();
  }

  /* ── Page Order ────────────────────────────────────────── */
  function getPageOrder() {
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    if (cfg.pages.length) {
      return cfg.pages
        .map(n => sorted.find((_, i) => i === n - 1))
        .filter(Boolean);
    }
    return sorted;
  }

  function totalPages() { return getPageOrder().length; }
  function currentPageIndex() { return getPageOrder().indexOf(currentPage); }

  /* ── Grid Rendering ────────────────────────────────────── */
  function renderGrid() {
    $grid.innerHTML = '';
    if (!currentPage || !pages[currentPage]) return;

    if (cfg.showHeadings) {
      $heading.textContent = pages[currentPage].name || currentPage;
    }

    const pageBtns = (buttons[currentPage]) || {};
    // If max is at default (99), clamp to Firebase grid size
    // If user explicitly set a value, use it directly
    const minC = cfg.minCol;
    const maxC = cfg.maxCol >= 99 ? gridCols - 1 : cfg.maxCol;
    const minR = cfg.minRow;
    const maxR = cfg.maxRow >= 99 ? gridRows - 1 : cfg.maxRow;
    const visCols = maxC - minC + 1;
    const visRows = maxR - minR + 1;

    $grid.style.setProperty('--dk-cols', visCols);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const key = r + '_' + c;
        const cfg2 = pageBtns[key];
        const div = document.createElement('div');

        // Coordinate label (always top-left, faded)
        const coord = document.createElement('span');
        coord.className = 'dk-coord';
        coord.textContent = `${r}/${c}`;
        div.appendChild(coord);

        if (cfg2 && cfg2.label) {
          div.className = 'dk-tile dk-assigned';
          // Default: neutral dark grey — color is earned through feedback only
          div.style.background = '#2a2a2a';

          if (cfg2.icon) {
            const ico = document.createElement('span');
            ico.className = 'dk-icon';
            ico.textContent = cfg2.icon;
            div.appendChild(ico);
          }

          const lbl = document.createElement('span');
          lbl.className = 'dk-label';
          lbl.textContent = cfg2.label;
          if (cfg2.fontSize) lbl.style.fontSize = cfg2.fontSize + 'px';
          div.appendChild(lbl);

          // Tap to fire
          div.addEventListener('click', () => fireActions(cfg2));
        } else {
          div.className = 'dk-tile dk-empty';
        }

        div.dataset.key = key;
        $grid.appendChild(div);
      }
    }

    updateHighlights();
    if (isFS) calcFit();
  }

  /* ── Fire Actions ──────────────────────────────────────── */
  function fireActions(btnCfg) {
    const actions = btnCfg.actions || [];
    if (!actions.length) return;
    actions.forEach((act, i) => {
      setTimeout(() => {
        const cmd = { action: act.type, ts: Date.now() };
        Object.keys(act).forEach(k => { if (k !== 'type') cmd[k] = act[k]; });
        db.ref('commands/latest').set(cmd);
      }, i * 500);
    });
  }

  /* ── Feedback Highlights ───────────────────────────────── */
  function safeKey(name) {
    return String(name).replace(/[.$#\[\]/]/g, '_');
  }

  function norm(s) { return (s || '').trim().toLowerCase(); }

  function updateHighlights() {
    const tiles = $grid.querySelectorAll('.dk-tile.dk-assigned');
    tiles.forEach(div => {
      const key = div.dataset.key;
      const cfg2 = (buttons[currentPage] || {})[key];
      if (!cfg2) return;

      const actions  = cfg2.actions  || [];
      const feedbacks = cfg2.feedbacks || [];
      let matched = false;

      // Custom feedbacks first
      for (const fb of feedbacks) {
        const t = fb.type || '';
        let match = false;
        let color = fb.activeColor || 'green';

        if (t === 'scene_in_program') {
          const s = fb.scene || (actions[0] && actions[0].scene) || '';
          const target = status.programScene || status.scene || '';
          if (s && norm(s) === norm(target)) match = true;
        } else if (t === 'scene_in_preview') {
          const s = fb.scene || (actions[0] && actions[0].scene) || '';
          const target = status.previewScene || status.preview || '';
          if (s && norm(s) === norm(target)) match = true;
        } else if (t === 'scene_in_preview_program') {
          const s = fb.scene || (actions[0] && actions[0].scene) || '';
          const prog = status.programScene || status.scene || '';
          const prev = status.previewScene || status.preview || '';
          if (s && norm(s) === norm(prog)) { match = true; color = fb.activeColor || 'red'; }
          else if (s && norm(s) === norm(prev)) { match = true; color = fb.activeColor2 || 'orange'; }
        } else if (t === 'transition_in_progress') {
          if (status.transitionInProgress) { match = true; color = fb.activeColor || 'yellow'; }
        } else if (t === 'source_visible_in_program') {
          const src = fb.source || '';
          const prog = status.programScene || status.scene || '';
          if (src && prog && status.sceneItems) {
            const m = status.sceneItems[prog] || status.sceneItems[safeKey(prog)] || {};
            if (m[src] === true || m[safeKey(src)] === true) match = true;
          }
        } else if (t === 'source_enabled_in_scene') {
          const src = fb.source || '';
          const scn = fb.scene || '';
          if (src && scn && status.sceneItems) {
            const m = status.sceneItems[scn] || status.sceneItems[safeKey(scn)] || {};
            if (m[src] === true || m[safeKey(src)] === true) match = true;
          }
        } else if (t === 'source_active_in_preview') {
          const src = fb.source || '';
          const prev = status.previewScene || status.preview || '';
          if (src && prev && status.sceneItems) {
            const m = status.sceneItems[prev] || status.sceneItems[safeKey(prev)] || {};
            if (m[src] === true || m[safeKey(src)] === true) match = true;
          }
        }

        if (match) {
          div.style.background = COLOR_HEX[color] || COLOR_HEX.default;
          matched = true;
          break;
        }
      }

      // Built-in action-based feedback (only if no custom feedback matched)
      // Color is only applied when the action is ACTIVE; otherwise neutral grey
      if (!matched && actions.length) {
        const a = actions[0];
        const t = a.type || '';
        const prog = status.programScene || status.scene || '';
        const prev = status.previewScene || status.preview || '';

        if (t === 'set_scene' && a.scene && a.scene === prog) {
          div.style.background = COLOR_HEX.red;
          div.classList.add('dk-live');
        } else if (t === 'set_preview_scene' && a.scene && a.scene === prev) {
          div.style.background = COLOR_HEX.blue;
          div.classList.remove('dk-live');
        } else if (t === 'start_stream' || t === 'stop_stream' || t === 'toggle_stream') {
          div.style.background = status.streaming ? COLOR_HEX.green : '#2a2a2a';
          div.classList.toggle('dk-live', !!status.streaming);
        } else if (t === 'start_record' || t === 'stop_record' || t === 'toggle_record') {
          div.style.background = status.recording ? COLOR_HEX.red : '#2a2a2a';
          div.classList.toggle('dk-live', !!status.recording);
        } else if (t === 'pause_record' || t === 'resume_record') {
          if (status.recording && status.paused) div.style.background = COLOR_HEX.yellow;
          else if (status.recording) div.style.background = COLOR_HEX.red;
          else div.style.background = '#2a2a2a';
        } else if (t === 'start_virtual_cam' || t === 'stop_virtual_cam' || t === 'toggle_virtual_cam') {
          div.style.background = status.virtualcam ? COLOR_HEX.cyan : '#2a2a2a';
          div.classList.toggle('dk-live', !!status.virtualcam);
        } else if (t === 'start_replay_buffer' || t === 'stop_replay_buffer' || t === 'save_replay') {
          div.style.background = status.replaybuffer ? COLOR_HEX.purple : '#2a2a2a';
          div.classList.toggle('dk-live', !!status.replaybuffer);
        } else if (t === 'transition' || t === 'transition_stinger') {
          div.style.background = status.transitionInProgress ? COLOR_HEX.yellow : '#2a2a2a';
          div.classList.toggle('dk-live', !!status.transitionInProgress);
        } else if (t === 'set_source_mute' || t === 'toggle_source_mute') {
          const src = a.source || '';
          if (src && status.mutes) {
            const muted = status.mutes[safeKey(src)];
            if (muted !== undefined) div.style.background = muted ? COLOR_HEX.red : COLOR_HEX.green;
            else div.style.background = '#2a2a2a';
          } else {
            div.style.background = '#2a2a2a';
          }
        } else {
          // No active state to reflect — stay neutral
          div.style.background = '#2a2a2a';
          div.classList.remove('dk-live');
        }
      } else if (!matched) {
        // No feedback and no matching action — neutral dark grey
        div.style.background = '#2a2a2a';
        div.classList.remove('dk-live');
      }
    });
  }

  /* ── Fullscreen ────────────────────────────────────────── */
  $btnFS.addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }

  document.addEventListener('fullscreenchange', onFSChange);
  document.addEventListener('webkitfullscreenchange', onFSChange);

  function onFSChange() {
    isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('dk-isfs', isFS);
    if (isFS) calcFit();
    else {
      $grid.style.removeProperty('--dk-tile-w');
      $grid.style.removeProperty('--dk-tile-h');
    }
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (isFS) calcFit(); }, 100);
  });

  // Orientation change
  screen.orientation?.addEventListener?.('change', () => {
    setTimeout(() => { if (isFS) calcFit(); }, 200);
  });

  /* ── Fit-Content Calculation ───────────────────────────── */
  function calcFit() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const minTile = 60;

    // Use config values — clamp defaults to Firebase grid, explicit values stay as-is
    const effMaxC = cfg.maxCol >= 99 ? gridCols - 1 : cfg.maxCol;
    const effMaxR = cfg.maxRow >= 99 ? gridRows - 1 : cfg.maxRow;
    const visCols = effMaxC - cfg.minCol + 1;
    const visRows = effMaxR - cfg.minRow + 1;
    const totalTiles = visCols * visRows;
    if (!totalTiles) return;

    let cols, rows;

    if (cfg.displayColumns > 0) {
      cols = Math.min(cfg.displayColumns, visCols);
      rows = Math.ceil(totalTiles / cols);
    } else {
      let bestCols = 1, bestScore = 0;
      for (let c = 1; c <= visCols; c++) {
        const r = Math.ceil(totalTiles / c);
        const tw = sw / c;
        const th = sh / r;
        if (tw < minTile || th < minTile) continue;
        const tile = Math.min(tw, th);
        const ratio = Math.max(tw, th) / Math.min(tw, th);
        const score = tile * (ratio < 2 ? 1 : 1 / ratio);
        if (score > bestScore) { bestScore = score; bestCols = c; }
      }
      cols = bestCols;
      rows = Math.ceil(totalTiles / cols);
    }

    const tw = Math.max(minTile, Math.floor(sw / cols));
    const th = Math.max(minTile, Math.floor(sh / rows));

    $grid.style.setProperty('--dk-tile-w', tw + 'px');
    $grid.style.setProperty('--dk-tile-h', th + 'px');
  }

  /* ── Configure Dialog ──────────────────────────────────── */
  $btnCfg.addEventListener('click', () => {
    $overlay.classList.toggle('dk-open');
    syncDialog();
  });
  $dkClose.addEventListener('click', () => $overlay.classList.remove('dk-open'));
  $overlay.addEventListener('click', e => { if (e.target === $overlay) $overlay.classList.remove('dk-open'); });

  function syncDialog() {
    document.getElementById('cfg-pages').value = cfg.pages.length ? cfg.pages.join(',') : '';
    document.getElementById('cfg-mincol').value = cfg.minCol;
    document.getElementById('cfg-maxcol').value = cfg.maxCol >= 99 ? '' : cfg.maxCol;
    document.getElementById('cfg-minrow').value = cfg.minRow;
    document.getElementById('cfg-maxrow').value = cfg.maxRow >= 99 ? '' : cfg.maxRow;
    document.getElementById('cfg-cols').value = cfg.displayColumns;
    document.getElementById('cfg-hidecfg').checked = cfg.hideConfig;
    document.getElementById('cfg-hidefs').checked = cfg.hideFullscreen;
    document.getElementById('cfg-heading').checked = cfg.showHeadings;
  }

  // Pages input
  document.getElementById('cfg-pages').addEventListener('input', e => {
    const raw = e.target.value.trim();
    if (!raw) { cfg.pages = []; }
    else {
      const result = [];
      raw.split(',').forEach(part => {
        const t = part.trim();
        if (t.includes('..')) {
          const [a, b] = t.split('..').map(Number);
          for (let i = a; i <= b; i++) if (!isNaN(i)) result.push(i);
        } else {
          const n = parseInt(t, 10);
          if (!isNaN(n)) result.push(n);
        }
      });
      cfg.pages = result;
    }
    const sorted = Object.keys(pages).sort((a, b) => (pages[a].order || 0) - (pages[b].order || 0));
    currentPage = pickFirstPage(sorted);
    writeParams();
    renderGrid();
  });

  // Stepper inputs
  document.querySelectorAll('.dk-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const dir = parseInt(btn.dataset.dir);
      const min = parseInt(input.min) || 0;
      const max = parseInt(input.max) || 999;
      input.value = Math.max(min, Math.min(max, parseInt(input.value || '0') + dir));
      input.dispatchEvent(new Event('input'));
    });
  });

  // Min/Max Column
  document.getElementById('cfg-mincol').addEventListener('input', e => {
    cfg.minCol = parseInt(e.target.value) || 0;
    writeParams(); renderGrid();
  });
  document.getElementById('cfg-maxcol').addEventListener('input', e => {
    cfg.maxCol = parseInt(e.target.value);
    if (isNaN(cfg.maxCol) || cfg.maxCol < cfg.minCol) cfg.maxCol = 99;
    writeParams(); renderGrid();
  });
  document.getElementById('cfg-minrow').addEventListener('input', e => {
    cfg.minRow = parseInt(e.target.value) || 0;
    writeParams(); renderGrid();
  });
  document.getElementById('cfg-maxrow').addEventListener('input', e => {
    cfg.maxRow = parseInt(e.target.value);
    if (isNaN(cfg.maxRow) || cfg.maxRow < cfg.minRow) cfg.maxRow = 99;
    writeParams(); renderGrid();
  });

  // Display columns
  document.getElementById('cfg-cols').addEventListener('input', e => {
    cfg.displayColumns = parseInt(e.target.value) || 0;
    writeParams(); renderGrid();
    if (isFS) calcFit();
  });

  // Checkboxes
  document.getElementById('cfg-hidecfg').addEventListener('change', e => {
    cfg.hideConfig = e.target.checked;
    $btnCfg.style.display = cfg.hideConfig ? 'none' : '';
    writeParams();
  });
  document.getElementById('cfg-hidefs').addEventListener('change', e => {
    cfg.hideFullscreen = e.target.checked;
    $btnFS.style.display = cfg.hideFullscreen ? 'none' : '';
    writeParams();
  });
  document.getElementById('cfg-heading').addEventListener('change', e => {
    cfg.showHeadings = e.target.checked;
    $heading.style.display = cfg.showHeadings ? '' : 'none';
    writeParams();
  });

})();
