/*! swarm-rebuild.js: "Swarm Rebuild". Cursor agents scan a page, then rebuild it layer by layer as the visitor scrolls.
 *  One IIFE, no dependencies. Drop it in as the FIRST tag in <body>; it never depends on your markup.
 *    <script src="swarm-rebuild.js" data-agents="14" data-speed="1" data-line="0.88" data-bg="#000" data-accent="#3D8BFF"></script>
 *  Sound: synthesised FX, on by default after the first click/key; data-sound="off" starts muted, data-volume="0..1". Toolbar speaker button toggles it.
 *  Clone mode: data-clone="auto|on|off" (default auto). Identical siblings (card grids) are copied from the first finished one instead of rebuilt.
 *  Hooks (all optional): data-sr-skip, data-sr-logo, data-sr-replay, data-sr-stat="layers|texts|frames|agents".
 *  API: window.SwarmRebuild.replay() / .skip() / .destroy()
 */
(function () {
  'use strict';

  var S = document.currentScript, D = (S && S.dataset) || {};
  if (window.SwarmRebuild && window.SwarmRebuild.__sr) return;       // already included once
  function noop() { }
  // 1. Reduced motion: do nothing at all, expose harmless no-op methods.
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.SwarmRebuild = { __sr: 1, active: false, replay: noop, skip: noop, destroy: noop, setSpeed: noop, setSound: noop, setClone: noop, tour: noop, layers: [] };
    return;
  }

  /* ───────────── config ───────────── */
  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var CFG = {
    agents: Math.round(clamp(num(D.agents, 14), 1, window.innerWidth < 640 ? 8 : 16)),   // max 8 on small screens
    speed: [1, 2, 4].indexOf(num(D.speed, 1)) >= 0 ? num(D.speed, 1) : 1,
    line: clamp(num(D.line, 0.88), 0.05, 2),
    bg: D.bg || '#000',
    accent: D.accent || '#3D8BFF'
  };
  var Z = 2147483000;                                               // root < scan < agents < hud
  var PAL = ['#FF5C8A', '#FFC233', '#A970FF', '#2DD4BF', '#4ADE80', '#FF8A3D', '#38BDF8', '#F43F5E', '#C084FC', '#FACC15',
    '#34D399', '#60A5FA', '#FB7185', '#F97316', '#22D3EE', '#A3E635'];
  var NAMES = ['Ada', 'Bo', 'Cyd', 'Dex', 'Eli', 'Fen', 'Gus', 'Hal', 'Ivy', 'Jun', 'Kai', 'Lux', 'Mo', 'Nia', 'Oz', 'Pip'];
  var HARD = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, META: 1, BR: 1 };
  var MEDIA = {
    IMG: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, PICTURE: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, IFRAME: 1, HR: 1,
    PROGRESS: 1, METER: 1, OBJECT: 1, EMBED: 1
  };
  var MAX_LAYERS = 4000;
  var CLONE = /^(on|off)$/.test(D.clone || '') ? D.clone : 'auto';   // clone mode: auto (when the swarm is overwhelmed) | on | off

  /* ───────────── state ───────────── */
  var phase = 'idle';                  // idle | scan | build
  var gen = 0, raf = 0, lastT = 0, startT = 0, collected = false, scanEnd = 0;
  var VW = 0, VH = 0, SX = 0, SY = 0, dpr = 1, docH = 0;
  var layers = [], pending = [], agents = [], late = [], wraps = [], addQ = [], listeners = [];
  var nBuilt = 0, needCompact = false, lastUi = 0;
  var counts = { layers: 0, texts: 0, frames: 0 };
  var layerOf = new WeakMap(), mine = new WeakSet();
  var styleEl, rootEl, canvas, ctx, scanEl, sqEl, agentsEl, hudEl, hudText, mo = null, ro = null, hudEls = {};
  var speed = CFG.speed, touring = false, tourPos = 0, needRead = true, lastRead = 0, buildT0 = 0, doneT = 0, guideA = 0, lastWork = 0;
  var trigPend = 0, toFinish = [], guideOn = false, lastHud = 0, groups = [], cloneNow = false;
  var ms = { x: 0, y: 0, rx: 0, ry: 0, on: false, last: 0, dx: 1, dy: 0 }, lastScroll = 0, freeMode = false, dismissed = false, leaveT0 = 0;

  /* ───────────── 2. CSS (one <style>, every class and id prefixed sr-) ───────────── */
  function css() {
    var ac = '--sr-ac:' + CFG.accent + ';', mono = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    return [
      'html.sr-lock{overflow:hidden!important;scrollbar-gutter:stable}',
      '#sr-root,#sr-agents,#sr-scan,#sr-hud{position:fixed;box-sizing:border-box;' + ac + '}',
      '#sr-root{left:0;top:0;right:0;bottom:0;z-index:' + Z + ';pointer-events:none;overflow:hidden}',
      '#sr-root canvas{position:absolute;left:0;top:0;width:100%;height:100%}',
      '.sr-fr{position:absolute;left:0;top:0;border:1px solid var(--sr-ac);box-sizing:border-box;transition-property:opacity;transition-timing-function:linear}',
      '.sr-fr i{position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:#fff;border:1px solid var(--sr-ac);box-sizing:border-box}',
      '.sr-fr i:nth-child(1){left:0;top:0}.sr-fr i:nth-child(2){left:100%;top:0}.sr-fr i:nth-child(3){left:0;top:100%}.sr-fr i:nth-child(4){left:100%;top:100%}',
      '.sr-sz{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:7px;padding:2px 6px;border-radius:4px;background:var(--sr-ac);' +
      'color:#fff;font:10px/1.3 ' + mono + ';white-space:nowrap}',
      '.sr-cr{position:absolute;left:0;top:0;width:2px;border-radius:1px}',
      '#sr-scan{left:0;top:0;right:0;bottom:0;z-index:' + (Z + 1) + ';display:grid;place-items:center;pointer-events:auto}',
      '.sr-sq{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;overflow:hidden;color:#fff;' +
      'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);' +
      'box-shadow:0 8px 32px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.28);animation:sr-pulse 1.3s ease-in-out infinite}',
      '#sr-scan.sr-lt .sr-sq{color:#111;background:rgba(0,0,0,.06);border-color:rgba(0,0,0,.14);box-shadow:0 8px 32px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.6)}',
      '.sr-sq>*{max-width:36px;max-height:36px;margin:0}',
      '@keyframes sr-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}',
      '#sr-agents{left:0;top:0;right:0;bottom:0;z-index:' + (Z + 2) + ';pointer-events:none;overflow:hidden}',
      '.sr-ag{position:absolute;left:0;top:0;will-change:transform}',
      '.sr-ar{position:absolute;left:0;top:0;overflow:visible;transform-origin:0 0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}',
      '.sr-ib{position:absolute;left:-5px;top:-9px;display:none;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}',
      '.sr-ty .sr-ar{display:none}.sr-ty .sr-ib{display:block}',
      '.sr-nm{position:absolute;left:12px;top:17px;opacity:0;transition:opacity .2s;font:600 10.5px/1 system-ui,-apple-system,sans-serif;' +
      'color:#101114;padding:3px 7px;border-radius:999px;white-space:nowrap}',
      '.sr-ty .sr-nm{left:7px;top:12px}.sr-on .sr-nm{opacity:1}',
      // 5. toolbar
      '#sr-hud{left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:' + (Z + 3) + ';display:flex;align-items:center;' +
      'gap:10px;max-width:calc(100vw - 24px);padding:7px 8px 7px 12px;border-radius:13px;background:rgba(22,23,27,.9);' +
      '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#f4f4f6;border:1px solid rgba(255,255,255,.1);' +
      'font:500 12px/1 system-ui,-apple-system,sans-serif;pointer-events:auto;box-shadow:0 8px 28px rgba(0,0,0,.4)}',
      '.sr-avs{display:flex;flex:none}',
      '.sr-av{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;margin-left:-7px;border:2px solid #16171b;box-sizing:content-box;' +
      'font:700 9px/1 system-ui,sans-serif;color:#101114}.sr-av:first-child{margin-left:0}',
      '.sr-st{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}.sr-an{font-weight:600;margin-right:6px}',
      '.sr-bar{flex:none;width:64px;height:4px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden}',
      '.sr-bar i{display:block;height:100%;width:100%;background:var(--sr-ac);transform-origin:0 0;transform:scaleX(0)}',
      '.sr-bt{all:unset;cursor:pointer;flex:none;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.1);color:#f4f4f6;' +
      'font:500 12px/1 system-ui,-apple-system,sans-serif;white-space:nowrap}.sr-bt:hover{background:rgba(255,255,255,.18)}',
      '.sr-bt:focus-visible{outline:2px solid var(--sr-ac);outline-offset:2px}.sr-bx{padding:6px 9px;font-size:15px}',
      '.sr-snd{display:grid;place-items:center;padding:6px 8px}.sr-snd svg{display:block}',
      '#sr-hud:not(.sr-s-build) .sr-avs,#sr-hud:not(.sr-s-build) .sr-bar,#sr-hud:not(.sr-s-build) .sr-an{display:none}',
      '@media (max-width:559px){.sr-avs,.sr-bar,.sr-an{display:none!important}}',
      // 6. hiding without moving anything: paint only, opacity only, or transparent text that still occupies its space
      '.sr-hide-paint{background-color:transparent!important;background-image:none!important;border-color:transparent!important;' +
      'box-shadow:none!important;outline-color:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
      '.sr-hide-media{opacity:0!important}',
      '.sr-rest{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}',
      '.sr-reveal{transition:background-color .45s ease,border-color .45s ease,box-shadow .6s ease,opacity .45s ease!important}',
      '.sr-now,html.sr-fin *{transition:none!important}'
    ].join('');
  }

  function parseRgb(str) {                                         // any CSS colour -> luminance 0..1
    var p = document.createElement('i'); p.style.color = str;
    if (!p.style.color) return 0;
    document.documentElement.appendChild(p);
    var m = (getComputedStyle(p).color.match(/[\d.]+/g) || [0, 0, 0]); p.remove();
    return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
  }

  /* ───────────── 2. boot: overlay elements on <html>, never inside <body> ───────────── */
  function mkEl(tag, id, cls) { var e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; return e; }

  function makeScan() {
    scanEl = mkEl('div', 'sr-scan'); scanEl.style.background = CFG.bg;
    if (parseRgb(CFG.bg) > 0.55) scanEl.className = 'sr-lt';
    sqEl = mkEl('div', null, 'sr-sq');
    sqEl.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5C12.7 7.1 16.9 11.3 22.5 12C16.9 12.7 12.7 16.9 12 22.5C11.3 16.9 7.1 12.7 1.5 12C7.1 11.3 11.3 7.1 12 1.5Z" fill="currentColor"/></svg>';
    scanEl.appendChild(sqEl);
    swapLogo();
    document.documentElement.insertBefore(scanEl, agentsEl);
    document.documentElement.classList.add('sr-lock');
  }
  function btn(cls, txt, label, fn) {
    var b = mkEl('button', null, 'sr-bt ' + cls); b.type = 'button'; b.textContent = txt;
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', fn);
    return b;
  }
  function buildOverlay() {
    styleEl = document.createElement('style'); styleEl.setAttribute('data-sr', ''); styleEl.textContent = css();
    (document.head || document.documentElement).appendChild(styleEl);
    rootEl = mkEl('div', 'sr-root'); canvas = mkEl('canvas'); ctx = canvas.getContext('2d'); rootEl.appendChild(canvas);
    agentsEl = mkEl('div', 'sr-agents');
    hudEl = mkEl('div', 'sr-hud'); hudEl.className = 'sr-s-scan';
    hudEls.av = mkEl('span', null, 'sr-avs');
    hudEls.st = mkEl('span', null, 'sr-st'); hudEls.an = mkEl('b', null, 'sr-an'); hudEls.sl = mkEl('span');
    hudEls.st.appendChild(hudEls.an); hudEls.st.appendChild(hudEls.sl);
    hudEls.bar = mkEl('span', null, 'sr-bar'); hudEls.fill = document.createElement('i'); hudEls.bar.appendChild(hudEls.fill);
    hudEls.tour = btn('sr-tour', 'Tour', 'Auto-scroll the page', onTourBtn);
    hudEls.snd = btn('sr-snd', '', 'Mute sound', function () { setSound(!soundOn); });
    hudEls.spd = btn('sr-spd', speed + '×', 'Change speed', cycleSpeed);
    hudEls.x = btn('sr-bx', '×', 'Skip the rebuild animation', onX); hudEls.x.title = 'Skip (Esc)';
    [hudEls.av, hudEls.st, hudEls.bar, hudEls.tour, hudEls.snd, hudEls.spd, hudEls.x].forEach(function (e) { hudEl.appendChild(e); });
    hudText = hudEls.sl;
    var h = document.documentElement;
    h.appendChild(rootEl); h.appendChild(agentsEl); h.appendChild(hudEl);   // z-index decides the stacking: root < scan < agents < hud
    makeScan();
    sizeCanvas();
  }
  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(VW * dpr); canvas.height = Math.round(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    guideOn = true;
  }

  // The scan screen holds a clone of the page's [data-sr-logo] once the body has been parsed (fallback: four-point star).
  function swapLogo() {
    var lg = document.querySelector('[data-sr-logo]');
    if (!lg || !sqEl || sqEl.getAttribute('data-l')) return;
    var c = lg.cloneNode(true), all = [c].concat([].slice.call(c.querySelectorAll('*')));
    all.forEach(function (n) { n.removeAttribute('id'); n.removeAttribute('data-sr-logo'); n.removeAttribute('data-sr-skip'); });
    c.style.cssText += ';margin:0;position:static;transform:none;pointer-events:none';
    sqEl.textContent = ''; sqEl.appendChild(c); sqEl.setAttribute('data-l', '1');
  }

  /* ───────────── 3. agents ───────────── */
  function spawn() {
    var N = CFG.agents, i, a, e, c, k, cnt, side, base;
    hudEls.av.textContent = '';
    for (i = 0; i < N; i++) {
      c = PAL[i % 16];
      e = mkEl('div', null, 'sr-ag');
      e.innerHTML = '<svg class="sr-ar" width="14" height="20" viewBox="0 0 14 20"><path d="M0 0V16.5L4.6 12.4L7.6 19L10.4 17.8L7.5 11.3H13.4Z" fill="' + c +
        '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
        '<svg class="sr-ib" width="10" height="18" viewBox="0 0 10 18"><path d="M1.5 1.5h7M5 1.5v15M1.5 16.5h7" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M1.5 1.5h7M5 1.5v15M1.5 16.5h7" stroke="' + c + '" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>' +
        '<span class="sr-nm" style="background:' + c + '">' + NAMES[i % 16] + '</span>';
      agentsEl.appendChild(e);
      if (i < 5) { var av = mkEl('span', null, 'sr-av'); av.style.background = c; av.textContent = NAMES[i % 16].charAt(0); hudEls.av.appendChild(av); }
      k = Math.floor(i / 3); cnt = Math.ceil((N - (i % 3)) / 3);
      base = (i % 3) * 2.0944;                                     // three flocks, a third of the ellipse apart
      side = base + (Math.random() - 0.5) * 0.6;
      a = {
        i: i, el: e, ar: e.firstChild, color: c, flock: i % 3, ph: 'free', sph: base + (k - (cnt - 1) / 2) * 0.3, w1: Math.random() * 6.3, w2: Math.random() * 6.3,
        x: VW / 2 + Math.cos(side) * Math.max(VW, VH) * 0.7, y: VH / 2 + Math.sin(side) * Math.max(VW, VH) * 0.7, px: 0, py: 0, rot: 0,
        L: null, t: 0, dur: 1, fr: null, sz: null, cr: null, wx: 0, wy: 0, wt: 0, fl: 0, ft: 0, fw: 0, fh: 0,
        rl: 0, rt: 0, rw: 0, rh: 0, sx: 0, sy: 0, cx: 0, cy: 0, ch: 0, szTxt: ''
      };
      a.px = a.x; a.py = a.y;
      agents.push(a);
    }
  }

  // Turn the arrow so its tip points along the velocity (the arrow's natural tip direction is up-left, hence +135deg).
  function aim(a, dt, free) {
    var vx = a.x - a.px, vy = a.y - a.py, th = free ? a.rot : (vx * vx + vy * vy > 0.04 ? Math.atan2(vy, vx) * 57.2958 + 135 : a.rot);
    if (!free) { a.rot += (((th - a.rot + 540) % 360) - 180) * (1 - Math.exp(-12 * dt)); }
    else a.rot += (((0 - a.rot + 540) % 360) - 180) * (1 - Math.exp(-6 * dt));
    a.ar.style.transform = 'rotate(' + a.rot.toFixed(1) + 'deg)';
  }

  // 4. scan screen: three flocks orbit the centre of an ellipse, flock 2 the other way, each agent wobbling +-10px
  function scanMove(dt, t) {
    var cx = VW / 2, cy = VH / 2, rx = Math.min(VW * 0.32, 230), ry = Math.min(VH * 0.28, 170);
    var sp = Math.sqrt(speed), k = 1 - Math.exp(-3.2 * sp * dt), i, a, ang;
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      ang = a.sph + (a.flock === 1 ? -1 : 1) * 1.3 * sp * t;
      a.px = a.x; a.py = a.y;
      a.x += (cx + Math.cos(ang) * rx + Math.sin(t * 3.1 + a.w1) * 10 - a.x) * k;
      a.y += (cy + Math.sin(ang) * ry + Math.sin(t * 2.3 + a.w2) * 10 - a.y) * k;
      aim(a, dt, false);
    }
  }

  /* ───────────── 5. layer collection ───────────── */
  function alphaOf(c) {                                            // alpha from rgb()/rgba()/color() strings
    if (!c || c === 'transparent') return 0;
    var m = c.match(/\/\s*([\d.]+)(%?)\s*\)$/);
    if (m) return +m[1] / (m[2] ? 100 : 1);
    m = c.match(/^rgba?\(([^)]*)\)/);
    if (m) { var p = m[1].split(/[\s,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) / (/%/.test(p[3]) ? 100 : 1) : 1; }
    return 1;
  }
  function isBox(cs) {
    if (alphaOf(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none') return true;
    var s = ['Top', 'Right', 'Bottom', 'Left'], i;
    for (i = 0; i < 4; i++) {
      if (parseFloat(cs['border' + s[i] + 'Width']) > 0 && cs['border' + s[i] + 'Style'] !== 'none' &&
        cs['border' + s[i] + 'Style'] !== 'hidden' && alphaOf(cs['border' + s[i] + 'Color']) > 0.02) return true;
    }
    return false;
  }
  function ours(e) {
    var c = e.getAttribute && e.getAttribute('class');
    return (e.id && e.id.indexOf('sr-') === 0) || (c && /(^|\s)sr-/.test(c));
  }
  function mk(type, e, parent, fixed, cap) {
    return { type: type, el: e, parent: parent, fixed: fixed, cap: cap, st: 0, tx: false, r: null, ag: null, y: 0, w: null, ty: null, rs: null, str: '', orig: null, k: 0 };
  }
  var hadCls = new WeakMap();                                     // so a class attribute we created is removed again, not left empty
  function addCls(e, c) { if (!hadCls.has(e)) hadCls.set(e, e.hasAttribute('class')); e.classList.add(c); }
  function rmCls(e, c) { e.classList.remove(c); if (!e.classList.length && hadCls.get(e) === false) e.removeAttribute('class'); }
  function hasText(e) { return /\S/.test(e.textContent); }

  // Reads only. Pre-order, so parents always come before their children.
  function walk(e, parent, fixed, out) {
    var tag = e.tagName.toUpperCase();
    if (HARD[tag] || ours(e) || e.hasAttribute('data-sr-skip') || e.hasAttribute('data-sr-stat')) return;
    var cs = getComputedStyle(e);
    if (cs.display === 'none') return;
    var fx = fixed || cs.position === 'fixed' || cs.position === 'sticky', L = null;
    if (MEDIA[tag]) { L = mk('media', e, parent, fx); layerOf.set(e, L); out.push(L); return; }
    var kids = e.children.length, box = isBox(cs);
    if (box) { L = mk('box', e, parent, fx, cs.textTransform === 'capitalize'); L.tx = !kids && hasText(e); }
    else if (!kids && hasText(e)) L = mk('text', e, parent, fx, cs.textTransform === 'capitalize');
    if (L) { layerOf.set(e, L); out.push(L); }
    if (kids) walkKids(e, L || parent, fx, out, cs.textTransform === 'capitalize');
  }
  function walkKids(e, parent, fx, out, cap) {
    for (var n = e.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1) walk(n, parent, fx, out);
      else if (n.nodeType === 3 && /\S/.test(n.data)) {            // text next to child elements: its own text layer
        var P = mk('tn', e, parent, fx, cap); P.node = n; out.push(P);
      }
    }
  }

  // Wrap loose text nodes in <span class="sr-tn">, hide every layer, measure (writes first, then one layout read).
  function commit(out) {
    var i, L, sp;
    for (i = 0; i < out.length; i++) {
      L = out[i];
      if (L.type !== 'tn') continue;
      if (!L.node.parentNode) { L.type = 'dead'; continue; }
      sp = mkEl('span', null, 'sr-tn');
      L.node.parentNode.insertBefore(sp, L.node); sp.appendChild(L.node);
      mine.add(L.node); wraps.push({ span: sp, node: L.node });
      L.el = sp; L.type = 'text'; layerOf.set(sp, L);
    }
    out = out.filter(function (l) { return l.type !== 'dead'; });
    for (i = 0; i < out.length; i++) hide(out[i]);
    for (i = 0; i < out.length; i++) readRect(out[i]);
    for (i = 0; i < out.length; i++) {
      L = out[i]; layers.push(L); pending.push(L); counts.layers++;
      if (L.type === 'text' || L.tx) counts.texts++;
      if (L.type !== 'text') counts.frames++;
    }
    buildGroups(out);
  }

  /* ───────────── 6. hide without moving anything ───────────── */
  function hideText(L) {
    var e = L.el, w = mkEl('span', null, 'sr-w'), ty = mkEl('span', null, 'sr-typed'), rs = mkEl('span', null, 'sr-rest');
    L.orig = [].slice.call(e.childNodes); L.str = e.textContent;     // kept so the original DOM can be restored exactly
    rs.textContent = L.str; w.appendChild(ty); w.appendChild(rs);
    L.orig.forEach(function (n) { mine.add(n); e.removeChild(n); });
    e.appendChild(w); L.w = w; L.ty = ty; L.rs = rs; L.k = 0;
  }
  function hide(L) {
    if (L.type === 'media') addCls(L.el, 'sr-hide-media');
    else { if (L.type === 'box') addCls(L.el, 'sr-hide-paint'); if (L.type === 'text' || L.tx) hideText(L); }
  }
  function restoreText(L) {
    if (!L.w) return;
    var e = L.el;
    if (L.w.parentNode === e) { e.removeChild(L.w); L.orig.forEach(function (n) { e.appendChild(n); }); }   // skip if the page rewrote it
    L.w = L.ty = L.rs = null;
  }
  // Show k characters. With text-transform:capitalize we only cut at word starts so widths never change.
  function typeTo(L, k) {
    if (L.cap && k < L.str.length) { var m = L.str.slice(0, k).search(/\s\S*$/); k = m < 0 ? 0 : m + 1; }
    L.ty.textContent = L.str.slice(0, k); L.rs.textContent = L.str.slice(k); L.k = k;
  }

  function readRect(L) {                                          // layer rect in viewport coordinates (reads only)
    var e = L.type === 'text' && L.w && L.w.isConnected ? L.w : L.el, r = e.getBoundingClientRect();
    L.rl = r.left; L.rt = r.top; L.rw = r.width; L.rh = r.height; L.rb = r.bottom;
  }
  function later(ms, fn) { late.push({ at: performance.now() + ms, fn: fn }); }

  // Remove the hide class and add sr-reveal (transitions); sr-reveal goes 800ms later. Instant mode uses sr-now (no transition).
  function fill(L, anim) {
    var e = L.el, c = anim ? 'sr-reveal' : 'sr-now';
    addCls(e, c); rmCls(e, L.type === 'media' ? 'sr-hide-media' : 'sr-hide-paint');
    later(anim ? 800 : 120, function () { rmCls(e, c); });
  }
  function done(L) { if (L.st !== 2) { L.st = 2; nBuilt++; needCompact = true; } }
  function instant(L) {                                           // finish with no animation
    if (L.st === 2) return;
    if (L.type !== 'text') fill(L, false);
    if (L.type === 'text' || L.tx) restoreText(L);
    done(L);
  }

  /* ───────────── build phase: triggering, picking, task phases ───────────── */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // 1. Triggering. Reads only: every unfinished layer's rect, then decide what is triggered or must finish instantly.
  function readAll() {
    var i, L, bottom, line;
    docH = document.documentElement.scrollHeight;
    bottom = SY + VH >= docH - 4;
    line = bottom ? 1e9 : VH * CFG.line;               // at the very bottom of the page every remaining layer counts as triggered
    trigPend = 0; toFinish = [];
    for (i = 0; i < pending.length; i++) {
      L = pending[i];
      if (L.st === 2) continue;
      readRect(L);
      if (L.st !== 0) continue;
      L.trig = L.rt < line;                            // top above H * line
      if (L.rb < -60 || (L.trig && (L.rw <= 0 || L.rh <= 0 || L.rl + L.rw < 0 || L.rl > VW))) toFinish.push(L);   // finish instantly
      else if (L.trig) trigPend++;
    }
    cloneNow = CLONE === 'on' || (CLONE === 'auto' && (trigPend > Math.max(6, agents.length * 1.2) || (cloneNow && trigPend > Math.max(3, agents.length * 0.5))));
    needRead = false; lastRead = performance.now();
  }

  // 2. Picking: lowest score = rect.top + 0.3 * distance from the agent; a layer needs its parent to have started.
  function assign(a, L) {
    L.st = 1; L.ag = a; a.L = L; a.ph = 'travel'; a.t = 0;
    a.el.classList.add('sr-on');                       // name tag only while working
  }
  function pick() {
    var free = [], elig = [], i, j, a, L, best, bs, s;
    for (i = 0; i < agents.length; i++) if (!agents[i].L) free.push(agents[i]);
    if (!free.length || !trigPend) return;
    for (i = 0; i < pending.length; i++) {
      L = pending[i];
      if (L.st === 0 && L.trig && (!L.parent || L.parent.st >= 1) && !(cloneNow && isCloneTarget(L))) elig.push(L);
    }
    for (i = 0; i < free.length && elig.length; i++) {
      a = free[i]; best = 0; bs = 1e18;
      for (j = 0; j < elig.length; j++) {
        L = elig[j]; s = L.rt + 0.3 * Math.hypot(a.x - L.rl, a.y - L.rt);
        if (s < bs) { bs = s; best = j; }
      }
      assign(a, elig.splice(best, 1)[0]);
    }
  }

  // 3. Selection frame: 1px accent border, four 7px handles (not on text), size label pill under its centre.
  function showFrame(a) {
    var f = mkEl('div', null, 'sr-fr'), z = mkEl('b', null, 'sr-sz'), i;
    if (a.L.type !== 'text') for (i = 0; i < 4; i++) f.appendChild(document.createElement('i'));
    f.appendChild(z); rootEl.appendChild(f);
    a.fr = f; a.sz = z; a.szTxt = '';
  }
  function setFrame(a, l, t, w, h) {
    a.fl = l; a.ft = t; a.fw = w; a.fh = h;
    var s = a.fr.style;
    s.transform = 'translate3d(' + l.toFixed(1) + 'px,' + t.toFixed(1) + 'px,0)';
    s.width = w.toFixed(1) + 'px'; s.height = h.toFixed(1) + 'px';
    var txt = a.lbl || (Math.round(w) + ' × ' + Math.round(h));
    if (txt !== a.szTxt) { a.szTxt = txt; a.sz.textContent = txt; }
  }
  function dropFrame(a, ms) {
    if (a.fr) {
      var f = a.fr; a.fr = null;
      if (!ms) f.remove(); else { f.style.transitionDuration = ms + 'ms'; f.style.opacity = '0'; later(ms + 60, function () { f.remove(); }); }
    }
    if (a.cr) { a.cr.remove(); a.cr = null; }
  }

  function readAgent(a) {                              // live rects every frame so frames follow scrolling (reads only)
    var L = a.L, r, rs;
    if (!L) return;
    r = (L.type === 'text' && L.w ? L.w : L.el).getBoundingClientRect();
    a.rl = r.left; a.rt = r.top; a.rw = r.width; a.rh = r.height;
    if (a.ph === 'travel' && L.type === 'text' && L.w) {
      rs = L.w.getClientRects();
      a.sx = rs.length ? rs[0].left : a.rl; a.sy = rs.length ? rs[0].top + rs[0].height / 2 : a.rt;
    }
    if (a.ph === 'type' && L.ty) {                     // end of the typed text, or the start of the rest
      rs = L.ty.getClientRects();
      if (rs.length) { r = rs[rs.length - 1]; a.cx = r.right; a.cy = r.top; a.ch = r.height || a.ch; }
      else { rs = L.rs.getClientRects(); if (rs.length) { a.cx = rs[0].left; a.cy = rs[0].top; a.ch = rs[0].height || a.ch; } }
    }
  }

  function startType(a) {
    var L = a.L;
    a.ph = 'type'; a.t = 0; a.dur = clamp(L.str.length * 0.018, 0.25, 1.3) / speed; L.k = 0; a.lk = 0;
    a.cx = a.rl; a.cy = a.rt; a.ch = 16;
    a.el.classList.add('sr-ty');                       // arrow -> I-beam
    a.cr = mkEl('div', null, 'sr-cr'); a.cr.style.background = a.color; rootEl.appendChild(a.cr);
  }
  function wander(a, dt) {                             // free: random points in the upper 88% of the viewport
    a.wt -= dt;
    if (a.wt <= 0) { a.wx = 20 + Math.random() * Math.max(10, VW - 60); a.wy = 20 + Math.random() * Math.max(10, VH * 0.88 - 40); a.wt = 1.2 + Math.random() * 2; }
    var k = 1 - Math.exp(-1.4 * dt);
    a.px = a.x; a.py = a.y; a.x += (a.wx - a.x) * k; a.y += (a.wy - a.y) * k;
    aim(a, dt, true);                                  // arrow eases back to upright
  }
  function finishTask(a) {                             // hold is over: restore the real text, fade the frame, free the agent
    var L = a.L;
    sfx('done', a);
    if (L.type === 'text' || L.tx) restoreText(L);
    dropFrame(a, 250 / speed);
    a.el.classList.remove('sr-on'); a.el.classList.remove('sr-ty');
    done(L); L.ag = null; a.L = null; a.ph = 'free'; a.t = 0; a.wt = 0;
  }
  function abortTask(a) {                              // skip / replay: drop whatever the agent was doing
    if (a.cp) { a.cp.ghosts.forEach(function (g) { g.fr.remove(); }); a.cp = null; a.lbl = null; }
    if (a.L) { a.L.ag = null; a.L = null; }
    dropFrame(a, 0);
    a.el.classList.remove('sr-on'); a.el.classList.remove('sr-ty'); a.ph = 'free'; a.t = 0;
  }

  function stepAgent(a, dt) {
    var L = a.L, S = speed, tx, ty, p, w, h, f;
    if (!L) { if (freeMode) follow(a, dt); else wander(a, dt); return; }
    if (a.cp) { stepCopy(a, dt); return; }
    a.t += dt;
    if (a.ph === 'travel') {                           // ease to the top-left corner (box/media) or the start of the text
      tx = L.type === 'text' ? a.sx : a.rl; ty = L.type === 'text' ? a.sy : a.rt;
      tx = clamp(tx, 0, VW - 14); ty = clamp(ty, 0, VH - 20);
      f = 1 - Math.exp(-(6 + 3 * S) * dt); a.px = a.x; a.py = a.y;
      a.x += (tx - a.x) * f; a.y += (ty - a.y) * f;
      aim(a, dt, true);
      if (Math.hypot(tx - a.x, ty - a.y) < 3 || a.t >= 1.2 / S) {
        showFrame(a); a.t = 0; sfx('frame', a);
        if (L.type === 'text') { setFrame(a, a.rl, a.rt, a.rw, a.rh); startType(a); }
        else { a.ph = 'draw'; a.dur = (0.22 + Math.min(0.34, Math.sqrt(a.rw * a.rh) / 1600)) / S; setFrame(a, a.rl, a.rt, 0, 0); }
      }
    } else if (a.ph === 'draw') {                      // grow top-left -> full size, cursor rides the bottom-right corner
      p = easeOut(clamp(a.t / a.dur, 0, 1)); w = a.rw * p; h = a.rh * p;
      setFrame(a, a.rl, a.rt, w, h);
      if (p < 1) sfx('draw', a, p);
      a.px = a.x; a.py = a.y; a.x = clamp(a.rl + w, 0, VW - 14); a.y = clamp(a.rt + h, 0, VH - 20); aim(a, dt, true);
      if (a.t >= a.dur) { fill(L, true); a.ph = 'fill'; a.t = 0; sfx('fill', a); }
    } else if (a.ph === 'fill') {                      // real element fades in while the cursor wiggles
      setFrame(a, a.rl, a.rt, a.rw, a.rh);
      p = a.t * S * 38;
      a.x = clamp(a.rl + a.rw, 0, VW - 14) + Math.sin(p) * 3; a.y = clamp(a.rt + a.rh, 0, VH - 20) + Math.cos(p * 1.3) * 3;
      if (a.t >= 0.32 / S) { if (L.tx && L.ty) startType(a); else { a.ph = 'hold'; a.t = 0; } }
    } else if (a.ph === 'type') {
      if (!L.ty) { a.ph = 'hold'; a.t = 0; return; }
      setFrame(a, a.rl, a.rt, a.rw, a.rh);
      p = clamp(a.t / a.dur, 0, 1);
      f = a.t >= a.dur ? L.str.length : Math.floor(p * L.str.length);
      if (f !== L.k) { typeTo(L, f); if (f - a.lk >= 2 || f >= L.str.length) { a.lk = f; sfx('key', a); } }                     // characters move from sr-rest to sr-typed
      a.cr.style.transform = 'translate3d(' + a.cx.toFixed(1) + 'px,' + a.cy.toFixed(1) + 'px,0)'; a.cr.style.height = a.ch + 'px';
      f = 1 - Math.exp(-30 * dt); a.px = a.x; a.py = a.y;
      a.x += (clamp(a.cx, 0, VW - 10) - a.x) * f; a.y += (clamp(a.cy + a.ch / 2, 8, VH - 12) - a.y) * f;
      if (a.t >= a.dur) { a.ph = 'hold'; a.t = 0; }
    } else if (a.ph === 'hold') {
      if (a.fr) setFrame(a, a.rl, a.rt, a.rw, a.rh);
      if (a.t >= 0.16 / S) finishTask(a);
    }
  }

  /* ───────────── sound FX (Web Audio, synthesised: no files) ───────────── */
  // The audio context is only created after the first click/key/touch (browsers block it before), and every sound is rate-limited.
  var AC = null, master = null, noiseBuf = null, soundOn = !/^(off|false|0)$/.test(D.sound || ''), sActive = 0, sLast = {};
  try { var sv = window.localStorage.getItem('sr-sound'); if (sv === '0') soundOn = false; else if (sv === '1') soundOn = true; } catch (e) { /* storage blocked */ }
  var SND_VOL = clamp(num(D.volume, 0.6), 0, 1);

  function unlock() {
    if (!soundOn) return;
    try {
      if (!AC) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        AC = new C();
        var comp = AC.createDynamicsCompressor();
        master = AC.createGain(); master.gain.value = 0.4 * SND_VOL;
        master.connect(comp); comp.connect(AC.destination);
      }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { AC = null; }
  }
  function snd() { return soundOn && AC && AC.state === 'running' && sActive < 28; }
  function gate(name, ms) { var n = performance.now(); if (n - (sLast[name] || 0) < ms) return false; sLast[name] = n; return true; }
  function panner(pan, out) {
    if (pan === undefined || !AC.createStereoPanner) return out;
    var p = AC.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); out.connect(p); return p;
  }
  function env(g, t, v, d) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  }
  function tone(f, d, type, v, f2, pan, delay) {
    if (!snd()) return;
    var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    env(g, t, v, d); o.connect(g); panner(pan, g).connect(master);
    sActive++; o.onended = function () { sActive--; };
    o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, v, f0, f1, pan) {                              // filtered noise sweep: whooshes
    if (!snd()) return;
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var ch = noiseBuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    var t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + d);
    env(g, t, v, d); s.connect(f); f.connect(g); panner(pan, g).connect(master);
    sActive++; s.onended = function () { sActive--; };
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.03);
  }
  function sfx(name, a, p) {
    if (!snd()) return;
    var pan = a ? (a.x / Math.max(VW, 1)) * 2 - 1 : 0, i = a ? a.i : 0;
    switch (name) {
      case 'scan': noise(1.7 / speed, 0.12, 200, 2600); tone(110, 1.7 / speed, 'sine', 0.07, 360); break;
      case 'boot': tone(392, 0.28, 'triangle', 0.12); tone(587, 0.34, 'triangle', 0.1, undefined, 0, 0.07); noise(0.5, 0.08, 2600, 500); break;
      case 'frame': if (gate('frame', 25)) tone(640 + (i % 8) * 45, 0.07, 'triangle', 0.1, undefined, pan); break;
      case 'draw': if (gate('draw', 22)) tone(360 + p * 760, 0.035, 'square', 0.028, undefined, pan); break;
      case 'fill': if (gate('fill', 40)) { tone(240, 0.16, 'sine', 0.15, 520, pan); tone(880, 0.1, 'triangle', 0.05, undefined, pan, 0.04); } break;
      case 'key': if (gate('key', 28)) tone(1500 + ((i * 97) % 500), 0.022, 'square', 0.03, undefined, pan); break;
      case 'done': if (gate('done', 40)) tone(1100 + (i % 6) * 60, 0.07, 'sine', 0.07, undefined, pan); break;
      case 'chord': [523, 659, 784, 1047].forEach(function (f, k) { tone(f, 0.5, 'triangle', 0.11, undefined, 0, k * 0.09); }); break;
      case 'skip': noise(0.35, 0.12, 3200, 300); break;
      case 'replay': noise(0.55, 0.12, 300, 3200); tone(300, 0.4, 'sine', 0.06, 700); break;
      case 'leave': noise(1.6, 0.1, 2400, 200); break;
      case 'tick': tone(900, 0.045, 'triangle', 0.1); break;
    }
  }
  var SND_ON = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6v4h3l4 3V3L5 6H2Z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var SND_OFF = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6v4h3l4 3V3L5 6H2Z" fill="currentColor"/><path d="M11.5 5.5l3.5 5M15 5.5l-3.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  function updSnd() {
    if (!hudEls.snd) return;
    hudEls.snd.innerHTML = soundOn ? SND_ON : SND_OFF;
    hudEls.snd.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound'); hudEls.snd.setAttribute('aria-pressed', String(!soundOn));
  }
  function setSound(on) {
    soundOn = !!on;
    try { window.localStorage.setItem('sr-sound', soundOn ? '1' : '0'); } catch (e) { /* ignore */ }
    if (soundOn) { unlock(); sfx('tick'); }
    updSnd();
  }

  /* ───────────── mouse-follow mode ───────────── */
  function onPtr(e) {                                              // real mouse only: touch keeps the wandering swarm
    if (e.pointerType !== 'mouse') return;
    var now = performance.now();
    if (!ms.on) { ms.on = true; ms.x = ms.rx = e.clientX; ms.y = ms.ry = e.clientY; return; }
    ms.x = e.clientX; ms.y = e.clientY;
    var dx = ms.x - ms.rx, dy = ms.y - ms.ry, d = Math.hypot(dx, dy);
    if (d > 2) {                                                   // only moves over 2px count
      ms.last = now;
      var w = Math.min(1, d / 40);                                 // smoothed unit direction of travel
      ms.dx += (dx / d - ms.dx) * w; ms.dy += (dy / d - ms.dy) * w;
      var m = Math.hypot(ms.dx, ms.dy) || 1; ms.dx /= m; ms.dy /= m;
      ms.rx = ms.x; ms.ry = ms.y;
    }
  }
  function onLeave() { ms.on = false; }
  function aimAt(a, dt, mx, my) {                                  // arrow tip turns to point at (mx, my)
    var th = Math.atan2(my - a.y, mx - a.x) * 57.2958 + 135;
    a.rot += (((th - a.rot + 540) % 360) - 180) * (1 - Math.exp(-12 * dt));
    a.ar.style.transform = 'rotate(' + a.rot.toFixed(1) + 'deg)';
  }
  function follow(a, dt) {                                         // free swarm: stream behind a moving mouse, ring around a resting one
    var now = performance.now(), i = a.i, n = agents.length, tx, ty, k, r, ang, lag, spread;
    a.px = a.x; a.py = a.y;
    if (now - ms.last < 350) {
      lag = 34 + (i % 5) * 11; spread = (((i * 37) % 60) - 30) * 0.9; k = 3.2 + (i % 4) * 0.9;
      tx = ms.x - ms.dx * lag - ms.dy * spread; ty = ms.y - ms.dy * lag + ms.dx * spread;
      a.x += (tx - a.x) * (1 - Math.exp(-k * dt)); a.y += (ty - a.y) * (1 - Math.exp(-k * dt));
      aim(a, dt, false);                                           // arrows point along their own velocity
    } else {
      r = Math.max(46, n * 4.4); ang = 6.28319 * i / n + now / 1000 * 0.35; k = 5;
      tx = ms.x + Math.cos(ang) * r; ty = ms.y + Math.sin(ang) * r;
      a.x += (tx - a.x) * (1 - Math.exp(-k * dt)); a.y += (ty - a.y) * (1 - Math.exp(-k * dt));
      aimAt(a, dt, ms.x, ms.y);
    }
  }
  // x in the done state: agents leave through the nearest side edge over 1.8s, then agents and toolbar are hidden
  function dismiss() {
    if (phase !== 'done' || dismissed || leaveT0) return;
    leaveT0 = performance.now(); sfx('leave');
    agents.forEach(function (a) {
      var d = [a.x, VW - a.x, a.y, VH - a.y], m = Math.min.apply(null, d), j = d.indexOf(m);
      a.l0x = a.x; a.l0y = a.y;
      a.lx = j === 0 ? -70 : j === 1 ? VW + 70 : a.x; a.ly = j === 2 ? -70 : j === 3 ? VH + 70 : a.y;
    });
  }
  function stepLeave(now, dt) {
    var q = clamp((now - leaveT0) / 1800, 0, 1), e = ease(q);
    agents.forEach(function (a) {
      a.px = a.x; a.py = a.y; a.x = a.l0x + (a.lx - a.l0x) * e; a.y = a.l0y + (a.ly - a.l0y) * e; aim(a, dt, false);
    });
    if (q >= 1) {
      leaveT0 = 0; dismissed = true;
      if (agentsEl) agentsEl.style.display = 'none';
      if (hudEl) hudEl.style.display = 'none';
    }
  }
  function onX() { if (phase === 'done') dismiss(); else skip(); }

  /* ───────────── clone mode: copy a finished object instead of rebuilding every identical sibling ───────────── */
  // Siblings with the same structure (a grid of cards, say) form a group. Once the first one is fully built, an agent selects it,
  // "copies" it, and pastes it onto every other triggered member at once: ghost frames fly out and each member's whole subtree fills in.
  function elSig(e, d) {                                           // structural signature: tag, classes, children (depth-limited)
    var c = (e.getAttribute('class') || '').split(/\s+/).filter(function (x) { return x && x.indexOf('sr-') !== 0; }).sort().join('.');
    var s = e.tagName + (c ? '.' + c : ''), k, kids = e.children;
    if (d > 0) {
      s += '(';
      for (k = 0; k < kids.length; k++) if (!HARD[kids[k].tagName.toUpperCase()] && !ours(kids[k])) s += elSig(kids[k], d - 1) + ',';
      s += ')';
    }
    return s;
  }
  function buildGroups(out) {
    if (CLONE === 'off') return;
    var byParent = new Map(), i, L, p, fresh = [];
    for (i = 0; i < out.length; i++) {
      L = out[i];
      if (L.type !== 'box' || !L.el.parentElement) continue;
      p = L.el.parentElement;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(L);
    }
    byParent.forEach(function (list) {
      if (list.length < 2) return;
      var by = {};
      list.forEach(function (L) { var sg = elSig(L.el, 4); if (sg.length < 900) (by[sg] = by[sg] || []).push(L); });
      Object.keys(by).forEach(function (k) {
        var m = by[k];
        if (m.length < 2) return;
        var g = { tpl: m[0], members: m, dead: false };
        m.forEach(function (L) { L.cg = g; L.cgRoot = L; L.cgLayers = [L]; });
        fresh.push(g);
      });
    });
    for (i = 0; i < out.length; i++) {                             // pre-order: attach every descendant layer to its member
      L = out[i];
      if (L.parent && L.parent.cgRoot) {
        if (L.cg) { L.cg.dead = true; L.cg.members.forEach(function (M) { M.cg = null; }); }   // nested groups are not cloned
        L.cgRoot = L.parent.cgRoot; L.cgRoot.cgLayers.push(L);
      }
    }
    fresh.forEach(function (g) {
      if (g.dead || g.tpl.cgLayers.length < 3) { g.members.forEach(function (M) { M.cg = null; }); return; }   // not worth copying
      groups.push(g);
    });
  }
  function isCloneTarget(L) { var r = L.cgRoot; return !!(r && r.cg && r.cg.tpl !== r); }
  function tplReady(g) { return g.tpl.cgLayers.every(function (D) { return D.st === 2; }); }

  function dupPass() {                                             // a free agent copies a finished template onto its waiting siblings
    if (!cloneNow || !groups.length) return;
    var free = [], i, j, g, a, best, bd, d, targets;
    for (i = 0; i < agents.length; i++) if (!agents[i].L) free.push(agents[i]);
    for (i = 0; i < groups.length && free.length; i++) {
      g = groups[i];
      if (!g.tpl.cg || !tplReady(g)) continue;
      targets = g.members.filter(function (M) {
        return M !== g.tpl && M.st === 0 && M.trig && (!M.parent || M.parent.st >= 1) && M.cgLayers.every(function (D) { return D.st === 0; });
      });
      if (!targets.length) continue;
      best = 0; bd = 1e18;
      for (j = 0; j < free.length; j++) { d = Math.hypot(free[j].x - g.tpl.rl, free[j].y - g.tpl.rt); if (d < bd) { bd = d; best = j; } }
      a = free.splice(best, 1)[0];
      targets.forEach(function (M) { M.cgLayers.forEach(function (D) { D.st = 1; }); });
      a.cp = { g: g, targets: targets, ph: 'fly', ghosts: [] };
      a.L = g.tpl; a.ph = 'copy'; a.t = 0; a.lbl = null;
      a.el.classList.add('sr-on');
    }
  }
  function mkGhost(M, k) {
    var f = mkEl('div', null, 'sr-fr'), z = mkEl('b', null, 'sr-sz'), i;
    for (i = 0; i < 4; i++) f.appendChild(document.createElement('i'));
    f.appendChild(z); f.style.opacity = '0'; rootEl.appendChild(f);
    return { M: M, fr: f, sz: z, t: -k * 0.07, fl: 0, ft: 0, fw: 0, fh: 0, ml: 0, mt: 0, mw: 0, mh: 0, rd: false, done: false, szTxt: '' };
  }
  function readGhosts(a) {                                         // reads: live rect of every paste target
    if (!a.cp) return;
    for (var i = 0, g, r; i < a.cp.ghosts.length; i++) {
      g = a.cp.ghosts[i];
      if (g.done) continue;
      r = g.M.el.getBoundingClientRect(); g.ml = r.left; g.mt = r.top; g.mw = r.width; g.mh = r.height; g.rd = true;
    }
  }
  function pasteInto(M) {                                          // the whole copied subtree fills in at once
    M.cgLayers.forEach(function (D) {
      if (D.st === 2) return;
      if (D.type !== 'text') fill(D, true);
      if (D.type === 'text' || D.tx) restoreText(D);
      done(D);
    });
  }
  function finishCopy(a) {
    dropFrame(a, 250 / speed);
    a.lbl = null; a.cp = null; a.L = null; a.ph = 'free'; a.t = 0; a.wt = 0;
    a.el.classList.remove('sr-on');
  }
  function stepCopy(a, dt) {
    var c = a.cp, S = speed, f, i, g, p, alive = false, lead = null, tx, ty;
    a.t += dt;
    if (c.ph === 'fly') {                                          // go to the finished template
      tx = clamp(a.rl, 0, VW - 14); ty = clamp(a.rt, 0, VH - 20);
      f = 1 - Math.exp(-(6 + 3 * S) * dt); a.px = a.x; a.py = a.y;
      a.x += (tx - a.x) * f; a.y += (ty - a.y) * f; aim(a, dt, true);
      if (Math.hypot(tx - a.x, ty - a.y) < 3 || a.t >= 1.2 / S) {
        showFrame(a); a.lbl = 'Copy ×' + c.targets.length; setFrame(a, a.rl, a.rt, a.rw, a.rh); sfx('frame', a);
        c.ph = 'copy'; a.t = 0;
      }
    } else if (c.ph === 'copy') {                                  // "Ctrl+C": the frame holds, the cursor wiggles
      setFrame(a, a.rl, a.rt, a.rw, a.rh);
      a.px = a.x; a.py = a.y;
      a.x = clamp(a.rl + a.rw, 0, VW - 14) + Math.sin(a.t * S * 38) * 3; a.y = clamp(a.rt + a.rh, 0, VH - 20) + Math.cos(a.t * S * 49) * 3;
      if (a.t >= 0.2 / S) { c.targets.forEach(function (M, k) { c.ghosts.push(mkGhost(M, k)); }); c.ph = 'paste'; a.t = 0; sfx('fill', a); }
    } else {                                                       // "Ctrl+V": a ghost of the template flies to every target
      setFrame(a, a.rl, a.rt, a.rw, a.rh);
      for (i = 0; i < c.ghosts.length; i++) {
        g = c.ghosts[i];
        if (g.done) continue;
        alive = true; g.t += dt * S;
        if (g.t < 0 || !g.rd) continue;
        p = easeOut(clamp(g.t / 0.3, 0, 1));
        g.fl = a.rl + (g.ml - a.rl) * p; g.ft = a.rt + (g.mt - a.rt) * p; g.fw = a.rw + (g.mw - a.rw) * p; g.fh = a.rh + (g.mh - a.rh) * p;
        g.fr.style.opacity = '1';
        g.fr.style.transform = 'translate3d(' + g.fl.toFixed(1) + 'px,' + g.ft.toFixed(1) + 'px,0)';
        g.fr.style.width = Math.max(g.fw, 1).toFixed(1) + 'px'; g.fr.style.height = Math.max(g.fh, 1).toFixed(1) + 'px';
        var txt = Math.round(g.fw) + ' × ' + Math.round(g.fh);
        if (txt !== g.szTxt) { g.szTxt = txt; g.sz.textContent = txt; }
        lead = g;
        if (g.t >= 0.3) {                                          // landed: reveal the target's whole subtree
          pasteInto(g.M); g.done = true; sfx('fill', a);
          var fr = g.fr; fr.style.transitionDuration = (250 / S) + 'ms'; fr.style.opacity = '0'; later(310 / S, function () { fr.remove(); });
        }
      }
      if (lead) {                                                  // the cursor rides the leading ghost's corner
        f = 1 - Math.exp(-14 * dt); a.px = a.x; a.py = a.y;
        a.x += (clamp(lead.fl + lead.fw, 0, VW - 14) - a.x) * f; a.y += (clamp(lead.ft + lead.fh, 0, VH - 20) - a.y) * f; aim(a, dt, true);
      }
      if (!alive) finishCopy(a);
    }
  }

  function place() {
    for (var i = 0; i < agents.length; i++) agents[i].el.style.transform = 'translate3d(' + agents[i].x.toFixed(1) + 'px,' + agents[i].y.toFixed(1) + 'px,0)';
  }

  /* ───────────── 4. guides on the canvas ───────────── */
  var MONO = '9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  function drawGuides(dt, now) {
    var any = false, i, a, p, x, y, len, R = VW >= 700 ? 20 : 0, ly = VH * CFG.line;
    for (i = 0; i < agents.length; i++) if (agents[i].L) any = true;
    if (any) lastWork = now;
    guideA += (((any || now - lastWork < 1200) && phase !== 'scan' ? 1 : 0) - guideA) * (1 - Math.exp(-dt * 9));   // in while working, out 1.2s after
    if (guideA < 0.01) { guideA = 0; if (guideOn) { ctx.clearRect(0, 0, VW, VH); guideOn = false; } return; }
    guideOn = true;
    ctx.clearRect(0, 0, VW, VH);
    ctx.setLineDash([]); ctx.lineWidth = 1;
    ctx.globalAlpha = guideA;
    ctx.strokeStyle = '#FF453A'; ctx.beginPath(); ctx.moveTo(0, Math.round(ly) + 0.5); ctx.lineTo(VW, Math.round(ly) + 0.5); ctx.stroke();   // build line
    ctx.font = MONO; ctx.fillStyle = '#FF453A'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('BUILD LINE', VW - 8, ly - 4);
    ctx.globalAlpha = guideA * 0.55; ctx.strokeStyle = CFG.accent; ctx.setLineDash([2, 3]); ctx.beginPath();   // dotted lines to the rulers
    for (i = 0; i < agents.length; i++) {
      a = agents[i]; if (!a.fr) continue;
      ctx.moveTo(a.fl + 0.5, a.ft + 0.5); ctx.lineTo(R, a.ft + 0.5);
      ctx.moveTo(a.fl + 0.5, a.ft + 0.5); ctx.lineTo(a.fl + 0.5, R);
    }
    ctx.stroke(); ctx.setLineDash([]);
    if (R) {                                           // rulers in page coordinates
      ctx.globalAlpha = guideA; ctx.fillStyle = 'rgba(17,18,22,.96)'; ctx.fillRect(0, 0, VW, R); ctx.fillRect(0, 0, R, VH);
      ctx.globalAlpha = guideA * 0.3; ctx.fillStyle = CFG.accent;
      for (i = 0; i < agents.length; i++) { a = agents[i]; if (a.fr) { ctx.fillRect(a.fl, 0, a.fw, R); ctx.fillRect(0, a.ft, R, a.fh); } }
      ctx.globalAlpha = guideA; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath();
      for (p = Math.ceil((SX + R) / 10) * 10; p <= SX + VW; p += 10) {
        x = p - SX; len = p % 100 === 0 ? R : p % 50 === 0 ? 7 : 4; ctx.moveTo(x + 0.5, R); ctx.lineTo(x + 0.5, R - len);
      }
      for (p = Math.ceil((SY + R) / 10) * 10; p <= SY + VH; p += 10) {
        y = p - SY; len = p % 100 === 0 ? R : p % 50 === 0 ? 7 : 4; ctx.moveTo(R, y + 0.5); ctx.lineTo(R - len, y + 0.5);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      for (p = Math.ceil((SX + R) / 100) * 100; p <= SX + VW; p += 100) ctx.fillText(String(p), p - SX + 3, 2);
      for (p = Math.ceil((SY + R) / 100) * 100; p <= SY + VH; p += 100) {
        ctx.save(); ctx.translate(0, p - SY - 3); ctx.rotate(-Math.PI / 2); ctx.fillText(String(p), 0, 2); ctx.restore();   // rotated -90deg
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ───────────── toolbar, tour, speed ───────────── */
  var statsReady = false;
  function stats() {                                               // [data-sr-stat] live counts
    var es = document.querySelectorAll('[data-sr-stat]'), i, v, k;
    for (i = 0; i < es.length; i++) {
      k = es[i].getAttribute('data-sr-stat');
      v = !statsReady ? '—' : k === 'layers' ? counts.layers : k === 'texts' ? counts.texts : k === 'frames' ? counts.frames : k === 'agents' ? agents.length : null;
      if (v === null) continue;
      v = typeof v === 'number' ? v.toLocaleString() : v;
      if (es[i].textContent !== v) es[i].textContent = v;
    }
  }
  function setTxt(e, v) { if (e && e.textContent !== v) e.textContent = v; }
  function updHud(t) {
    var s = phase === 'scan' ? 'scan' : phase === 'build' ? 'build' : 'done', tot = layers.length, n;
    if (hudEl.className !== 'sr-s-' + s) hudEl.className = 'sr-s-' + s;
    if (s === 'scan') {
      n = collected ? Math.floor(tot * ease(clamp(t / (1.9 / speed), 0, 1))) : 0;
      setTxt(hudEls.an, ''); setTxt(hudEls.sl, 'Scanning page… ' + n.toLocaleString() + ' layers');
    } else if (s === 'build') {
      setTxt(hudEls.an, agents.length + ' agents'); setTxt(hudEls.sl, nBuilt.toLocaleString() + ' / ' + tot.toLocaleString() + ' layers');
      hudEls.fill.style.transform = 'scaleX(' + (tot ? nBuilt / tot : 1).toFixed(3) + ')';
    } else {
      setTxt(hudEls.an, '');
      setTxt(hudEls.sl, tot ? 'Rebuilt ' + tot.toLocaleString() + ' layers in ' + ((doneT - buildT0) / 1000).toFixed(1) + 's' : 'Skipped');
    }
    setTxt(hudEls.tour, s === 'done' ? 'Replay' : touring ? 'Pause' : 'Tour');
    setTxt(hudEls.spd, speed + '×');
  }
  function setSpeed(n) { n = +n; if (n === 1 || n === 2 || n === 4) speed = n; }
  function cycleSpeed() { setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1); sfx('tick'); }
  function setTour(on) { touring = !!on && phase === 'build'; if (touring) tourPos = window.pageYOffset; }
  function onTourBtn() { sfx('tick'); if (phase === 'done') replay(); else if (phase === 'build') setTour(!touring); }
  function tourStep(dt) {                                          // scroll 240px/s x speed while the swarm has little left to do
    if (!touring) return;
    if (docH && SY + VH >= docH - 1) { touring = false; return; }
    if (trigPend >= 0.6 * agents.length) return;
    if (Math.abs(SY - tourPos) > 2) tourPos = SY;
    tourPos += 240 * speed * dt;
    window.scrollTo({ left: SX, top: tourPos, behavior: 'instant' });
    needRead = true;
  }

  /* ───────────── frame loop ───────────── */
  function endScan(now) {                                          // fade the scan screen out over 0.55s, release the scroll lock
    phase = 'build'; needRead = true; buildT0 = now; sfx('boot');
    scanEl.style.transition = 'opacity .55s linear'; scanEl.style.opacity = '0'; scanEl.style.pointerEvents = 'none';
    document.documentElement.classList.remove('sr-lock');
    var s = scanEl; later(600, function () { s.remove(); if (scanEl === s) scanEl = sqEl = null; });
  }
  function goDone(now, silent) {
    if (!silent) sfx('chord');
    phase = 'done'; doneT = now; touring = false; trigPend = 0;
    stats();
  }
  function resume(now) {                                           // new layers appeared after the rebuild finished
    phase = 'build'; buildT0 = now; needRead = true;
    agentsEl.style.transition = 'none'; agentsEl.style.opacity = '1'; agentsEl.style.display = '';
  }

  function tick(now) {
    raf = 0;
    if (phase === 'idle') return;
    var dt = clamp((now - lastT) / 1000, 0.001, 0.05), i, t = (now - startT) / 1000;   // dt capped at 50ms
    lastT = now;
    if (addQ.length && collected) { SX = window.pageXOffset; SY = window.pageYOffset; scanAdded(); needRead = true; }
    // ── read phase: scroll offsets, rects
    SX = window.pageXOffset; SY = window.pageYOffset;
    VW = document.documentElement.clientWidth || window.innerWidth; VH = window.innerHeight;
    if (phase === 'scan') {
      scanMove(dt, t);
      if (collected && t >= 1.9 / speed) endScan(now);             // never before the layers are collected
    } else {
      if (phase === 'done' && pending.length) { if (dismissed || leaveT0) { pending.forEach(instant); needCompact = true; } else resume(now); }
      if (phase === 'done') {
        if (leaveT0) stepLeave(now, dt);
        else if (!dismissed) { freeMode = ms.on && now - lastScroll > 500; for (i = 0; i < agents.length; i++) stepAgent(agents[i], dt); }
      }
      if (phase === 'build') {
        if (needRead || now - lastRead >= 350) readAll();          // on scroll, resize and every 350ms
        for (i = 0; i < agents.length; i++) { readAgent(agents[i]); readGhosts(agents[i]); }
        // ── write phase
        for (i = 0; i < toFinish.length; i++) instant(toFinish[i]);
        toFinish = [];
        tourStep(dt);
        dupPass();
        pick();
        freeMode = ms.on && now - lastScroll > 500 && trigPend === 0 && !agents.some(function (a) { return a.L; });
        for (i = 0; i < agents.length; i++) stepAgent(agents[i], dt);
      }
    }
    place();
    if (ctx) drawGuides(dt, now);
    if (late.length) {
      var keep = [], due = [];
      for (i = 0; i < late.length; i++) (late[i].at <= now ? due : keep).push(late[i]);
      late = keep;
      for (i = 0; i < due.length; i++) due[i].fn();
    }
    if (needCompact) { needCompact = false; pending = pending.filter(function (L) { return L.st !== 2; }); }
    if (now - lastHud > 100) { lastHud = now; if (hudEl) updHud(t); }
    if (now - lastUi > 250) { lastUi = now; stats(); }
    if (phase === 'build' && !pending.length && !addQ.length && !agents.some(function (a) { return a.L; })) goDone(now);
    if (phase !== 'idle') raf = requestAnimationFrame(tick);
  }

  /* ───────────── elements added after load ───────────── */
  function nearest(e) { for (; e && e !== document.body; e = e.parentElement) if (layerOf.has(e)) return layerOf.get(e); return null; }
  function fixedAbove(e) {
    for (; e && e !== document.documentElement; e = e.parentElement) { var p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; }
    return false;
  }
  function onMut(recs) {
    if (phase === 'idle') return;
    var SK = '.sr-w,.sr-tn,[data-sr-skip],[data-sr-stat]';
    for (var i = 0, r, t, k, n; i < recs.length; i++) {
      r = recs[i]; t = r.target;
      if (!t || t.nodeType !== 1 || t.closest(SK)) continue;
      for (k = 0; k < r.addedNodes.length; k++) {
        n = r.addedNodes[k];
        if (n.nodeType === 1) { if (!ours(n) && !n.closest(SK)) addQ.push(n); }
        else if (n.nodeType === 3 && !mine.has(n) && /\S/.test(n.data)) addQ.push(n);
      }
    }
  }
  function scanAdded() {
    var q = addQ, out = [], i, n, p;
    addQ = [];
    for (i = 0; i < q.length; i++) {
      n = q[i]; p = n.parentElement;
      if (!n.isConnected || !p || p.closest('.sr-w')) continue;
      if (q.some(function (m) { return m !== n && m.nodeType === 1 && m.contains(n); })) continue;
      if (n.nodeType === 1) { if (!layerOf.has(n)) walk(n, nearest(p), fixedAbove(p), out); }
      else if (p.children.length) { var P = mk('tn', p, nearest(p), fixedAbove(p), false); P.node = n; out.push(P); }
      else if (!layerOf.has(p)) walk(p, nearest(p.parentElement), fixedAbove(p.parentElement), out);
    }
    if (layers.length + out.length > MAX_LAYERS) out.length = Math.max(0, MAX_LAYERS - layers.length);
    commit(out);
  }

  /* ───────────── lifecycle ───────────── */
  function on(t, ev, fn, o) { t.addEventListener(ev, fn, o); listeners.push([t, ev, fn, o]); }
  function onKey(e) {
    if (e.key === 'Escape') { if (phase !== 'done') skip(); }
    else if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End)$/.test(e.key)) touring = false;   // the visitor takes over
  }
  function onSize() {
    VW = document.documentElement.clientWidth || window.innerWidth; VH = window.innerHeight;
    if (canvas) sizeCanvas();
    needRead = true;
  }
  function onUser() { touring = false; }

  function whenReady(g, fn) {                                      // after window load and fonts (fonts waited for at most 1.2s)
    var started = false;
    function go() {
      if (started || g !== gen) return;
      started = true;
      var fin = false;
      function f() { if (!fin && g === gen) { fin = true; fn(); } }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(f, f); else f();
      setTimeout(f, 1200);
    }
    if (document.readyState === 'complete') go(); else { window.addEventListener('load', go, { once: true }); setTimeout(go, 10000); }
  }

  function collectAll() {
    swapLogo();
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    SX = SY = 0; onSize();
    var out = [];
    walkKids(document.body, null, false, out, false);
    if (out.length > MAX_LAYERS) out.length = MAX_LAYERS;
    commit(out);
    docH = document.documentElement.scrollHeight;
    mo = new MutationObserver(onMut); mo.observe(document.body, { childList: true, subtree: true });
    if (window.ResizeObserver) { ro = new ResizeObserver(onSize); ro.observe(document.body); }
    statsReady = true; needRead = true; stats();
    collected = true;
  }

  function start() {
    var g = ++gen;
    phase = 'scan'; collected = false; statsReady = false; nBuilt = 0; needCompact = false; touring = false; guideA = 0; guideOn = false;
    layers = []; pending = []; late = []; wraps = []; addQ = []; agents = []; toFinish = []; groups = []; cloneNow = false; counts = { layers: 0, texts: 0, frames: 0 };
    VW = document.documentElement.clientWidth || window.innerWidth; VH = window.innerHeight; SX = SY = 0;
    try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
    buildOverlay(); spawn(); stats();
    on(document, 'keydown', onKey); on(window, 'resize', onSize);
    on(window, 'scroll', function () { needRead = true; lastScroll = performance.now(); }, { passive: true });
    on(window, 'pointermove', onPtr, { passive: true }); on(document.documentElement, 'mouseleave', onLeave); on(window, 'blur', onLeave);
    on(window, 'wheel', onUser, { passive: true }); on(window, 'touchstart', onUser, { passive: true });
    if (document.readyState === 'loading') on(document, 'DOMContentLoaded', swapLogo);
    startT = lastT = buildT0 = performance.now(); lastUi = lastHud = 0;
    ['pointerdown', 'keydown', 'touchend', 'click'].forEach(function (ev) { on(window, ev, unlock, { passive: true, capture: true }); });
    updSnd(); sfx('scan');
    raf = requestAnimationFrame(tick);
    whenReady(g, function () { try { collectAll(); } catch (e) { if (window.console) console.warn('[swarm-rebuild] stopped:', e); destroy(); } });
  }

  function finishAllNow() {                                        // end every task and finish every layer instantly
    var h = document.documentElement, i;
    h.classList.add('sr-fin');
    for (i = 0; i < agents.length; i++) abortTask(agents[i]);
    for (i = 0; i < layers.length; i++) instant(layers[i]);
    void h.offsetHeight;                                           // flush while transitions are disabled
    h.classList.remove('sr-fin');
    guideA = 0; if (ctx) { ctx.clearRect(0, 0, VW, VH); guideOn = false; }
  }
  function skip() {                                                // x or Esc: finish everything, show the done state
    if (phase === 'idle' || phase === 'done') return;
    if (!collected) gen++;                                         // cancel a layer collection that has not happened yet
    if (scanEl) { scanEl.remove(); scanEl = sqEl = null; }
    document.documentElement.classList.remove('sr-lock');
    sfx('skip'); finishAllNow(); goDone(performance.now(), true);
  }
  function replay() {                                              // hide every layer again, jump to the top, scan again, restart
    if (phase === 'idle') { start(); return; }
    var now = performance.now(), i, a, L, ang;
    if (phase !== 'done') { if (!collected) gen++; finishAllNow(); }
    if (scanEl) { scanEl.remove(); scanEl = sqEl = null; }
    touring = false; dismissed = false; leaveT0 = 0; if (hudEl) hudEl.style.display = '';
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
    if (!collected || !layers.length) { destroy(); start(); return; }
    for (i = 0; i < layers.length; i++) {
      L = layers[i];
      if (L.w) restoreText(L);
      L.st = 0; L.ag = null; L.trig = false; hide(L);
    }
    nBuilt = 0; pending = layers.slice(); needCompact = false; toFinish = [];
    for (i = 0; i < agents.length; i++) {
      a = agents[i]; ang = Math.random() * 6.283;
      a.x = VW / 2 + Math.cos(ang) * Math.max(VW, VH) * 0.7; a.y = VH / 2 + Math.sin(ang) * Math.max(VW, VH) * 0.7; a.px = a.x; a.py = a.y; a.rot = 0;
    }
    agentsEl.style.transition = 'none'; agentsEl.style.opacity = '1'; agentsEl.style.display = '';
    phase = 'scan'; startT = lastT = buildT0 = now; guideA = 0; needRead = true; lastRead = 0;
    makeScan(); sfx('replay'); sfx('scan');
  }

  function destroy() {                                             // remove every trace, including the loose-text wrappers
    if (phase !== 'idle' && layers.length) finishAllNow();
    phase = 'idle';
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (mo) mo.disconnect(); mo = null;
    if (ro) ro.disconnect(); ro = null;
    listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners = [];
    layers.forEach(function (L) { if (L.w) restoreText(L); });
    [rootEl, scanEl, agentsEl, hudEl].forEach(function (e) { if (e) e.remove(); });
    rootEl = scanEl = agentsEl = hudEl = canvas = ctx = hudText = sqEl = null; agents = []; hudEls = {};
    void document.documentElement.offsetHeight;
    var s = document.querySelectorAll('.sr-hide-paint,.sr-hide-media,.sr-reveal,.sr-now'), i;
    for (i = 0; i < s.length; i++) ['sr-hide-paint', 'sr-hide-media', 'sr-reveal', 'sr-now'].forEach(function (c) { rmCls(s[i], c); });
    wraps.forEach(function (w) { if (w.span.parentNode) w.span.parentNode.replaceChild(w.node, w.span); });
    if (styleEl) styleEl.remove(); styleEl = null;
    document.documentElement.classList.remove('sr-lock', 'sr-fin');
    layers = []; pending = []; late = []; wraps = []; addQ = [];
    if (AC) { try { AC.close(); } catch (e) { /* ignore */ } AC = null; }
    stats();
  }

  window.SwarmRebuild = {
    __sr: 1, active: true, replay: replay, skip: skip, dismiss: dismiss, setSound: setSound, setSpeed: setSpeed, destroy: destroy, setClone: function (m) { if (/^(auto|on|off)$/.test(m)) CLONE = m; },
    tour: function (on) { if (phase === 'build') setTour(on === undefined ? !touring : on); },
    get layers() { return layers.map(function (L) { return { type: L.type, el: L.el, text: L.type === 'text' || L.tx, done: L.st === 2 }; }); }
  };
  document.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest('[data-sr-replay]')) replay(); });
  start();
})();