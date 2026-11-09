/* Favorite Food — servings scaler, tick-off checklists and a step-by-step cook mode with timers.
   Vanilla JS, no dependencies. Recipes are written for BASE_SERVINGS people in the HTML. */
(function () {
    'use strict';

    var BASE_SERVINGS = 4;
    var MAX_SERVINGS = 12;
    var STORE_KEY = 'rt-checks-v1';

    var cards = Array.prototype.slice.call(document.querySelectorAll('.recipe-card'));
    if (!cards.length) return;

    /* ───── storage ───── */
    function loadChecks() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
    }
    function saveChecks(data) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
    }
    var checks = loadChecks(); // { "0": ["i0","s2"], ... }

    /* ───── quantity parsing / formatting ───── */
    var NUM = '(\\d+\\s+\\d\\/\\d|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)';
    var LEAD_RE = new RegExp('^\\s*' + NUM + '(?:\\s*(?:to|-)\\s*' + NUM + ')?\\s+(.*)$');
    var PAREN_RE = /\((\d+(?:\.\d+)?)(\s?(?:g|kg|ml|l))\)/;

    var PLURALS = {
        head: 'heads', packet: 'packets', bunch: 'bunches', clove: 'cloves',
        inch: 'inches', cup: 'cups', teaspoon: 'teaspoons', tablespoon: 'tablespoons'
    };
    var SINGULARS = {};
    Object.keys(PLURALS).forEach(function (k) { SINGULARS[PLURALS[k]] = k; });

    function parseNum(s) {
        s = s.trim();
        var m = s.match(/^(\d+)\s+(\d)\/(\d)$/);
        if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
        m = s.match(/^(\d+)\/(\d+)$/);
        if (m) return Number(m[1]) / Number(m[2]);
        return Number(s);
    }

    var FRACTIONS = [[0, ''], [1 / 8, '\u215B'], [1 / 4, '\u00BC'], [1 / 3, '\u2153'], [1 / 2, '\u00BD'],
                     [2 / 3, '\u2154'], [3 / 4, '\u00BE'], [1, '']];

    function fmt(x) {
        if (x >= 10) return String(Math.round(x));
        var whole = Math.floor(x + 1e-9);
        var frac = x - whole;
        var best = FRACTIONS[0], d = Infinity, i, diff;
        for (i = 0; i < FRACTIONS.length; i++) {
            diff = Math.abs(frac - FRACTIONS[i][0]);
            if (diff < d) { d = diff; best = FRACTIONS[i]; }
        }
        if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
        if (!best[1]) return String(whole || 1);
        return whole ? whole + best[1] : best[1];
    }

    function scaleText(base, factor) {
        var m = base.match(LEAD_RE);
        if (!m) return base; // "Salt to taste", "Cold water and ice cubes", etc.
        var a = parseNum(m[1]) * factor;
        var b = m[2] ? parseNum(m[2]) * factor : null;
        var shown = b != null ? fmt(a) + ' to ' + fmt(b) : fmt(a);
        var rest = m[3];
        var biggest = b != null ? b : a;

        var first = rest.split(/\s+/)[0];
        var key = first.toLowerCase();
        var unitBase = SINGULARS[key] || (PLURALS[key] ? key : null);
        if (unitBase) {
            var word = biggest <= 1 + 1e-9 ? unitBase : PLURALS[unitBase];
            rest = word + rest.slice(first.length);
        }
        rest = rest.replace(PAREN_RE, function (_, n, unit) {
            var v = Number(n) * factor;
            return '(' + (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + unit + ')';
        });
        return shown + ' ' + rest;
    }

    function stepMinutes(text) {
        var m = text.match(/(\d+)(?:\s*(?:to|-)\s*(\d+))?\s*minutes?/i);
        if (!m) return 0;
        return Number(m[2] || m[1]);
    }

    /* ───── audio beep for timers (created on a user gesture) ───── */
    var audioCtx = null;
    function warmAudio() {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!audioCtx && AC) audioCtx = new AC();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { /* no audio */ }
    }
    function beep() {
        if (!audioCtx) return;
        [0, 0.28, 0.56].forEach(function (delay) {
            var o = audioCtx.createOscillator();
            var g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
            g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.22);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(audioCtx.currentTime + delay);
            o.stop(audioCtx.currentTime + delay + 0.25);
        });
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }

    function mmss(sec) {
        sec = Math.max(0, Math.ceil(sec));
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    /* ───── per-recipe setup ───── */
    cards.forEach(function (card, r) {
        var ul = card.querySelector('ul');
        var ol = card.querySelector('ol');
        var ingHeading = Array.prototype.filter.call(card.querySelectorAll('h3'), function (h) {
            return /ingredients/i.test(h.textContent);
        })[0];
        if (!ul || !ol || !ingHeading) return;

        var title = card.querySelector('h2').textContent.replace(/^\d+\.\s*/, '');
        var servings = BASE_SERVINGS;
        var saved = new Set(checks[r] || []);

        /* checklist wrapping: <li> → <li><label><input><span>text</span></label></li> */
        function wrap(list, prefix) {
            var items = [];
            Array.prototype.forEach.call(list.children, function (li, i) {
                var id = prefix + i;
                var text = li.textContent.replace(/\s+/g, ' ').trim();
                var label = document.createElement('label');
                label.className = 'check';
                var box = document.createElement('input');
                box.type = 'checkbox';
                box.checked = saved.has(id);
                var span = document.createElement('span');
                span.className = 'check-text';
                span.textContent = text;
                label.appendChild(box);
                label.appendChild(span);
                li.textContent = '';
                li.appendChild(label);
                li.classList.toggle('is-done', box.checked);
                box.addEventListener('change', function () {
                    if (box.checked) saved.add(id); else saved.delete(id);
                    li.classList.toggle('is-done', box.checked);
                    checks[r] = Array.from(saved);
                    saveChecks(checks);
                    updateProgress();
                });
                items.push({ li: li, box: box, span: span, base: text, id: id });
            });
            list.classList.add('has-checks');
            return items;
        }
        var ingredients = wrap(ul, 'i');
        var steps = wrap(ol, 's');

        /* toolbar */
        var bar = document.createElement('div');
        bar.className = 'recipe-toolbar';
        bar.setAttribute('data-sr-skip', '');
        var sliderId = 'servings-' + r;
        bar.innerHTML =
            '<div class="rt-servings">' +
            '<label for="' + sliderId + '">Servings: <strong class="rt-count">' + BASE_SERVINGS + '</strong></label>' +
            '<input type="range" id="' + sliderId + '" min="1" max="' + MAX_SERVINGS + '" step="1" value="' + BASE_SERVINGS + '">' +
            '</div>' +
            '<div class="rt-actions">' +
            '<button type="button" class="rt-btn rt-cook">👩‍🍳 Cook mode</button>' +
            '<button type="button" class="rt-btn rt-ghost rt-reset">Clear ticks</button>' +
            '</div>' +
            '<p class="rt-progress" aria-live="polite"></p>';
        ingHeading.parentNode.insertBefore(bar, ingHeading);

        var slider = bar.querySelector('input');
        var countEl = bar.querySelector('.rt-count');
        var progressEl = bar.querySelector('.rt-progress');

        function updateProgress() {
            var total = ingredients.length + steps.length;
            progressEl.textContent = saved.size
                ? saved.size + ' of ' + total + ' items checked off'
                : 'Tip: tick ingredients and steps off as you go.';
        }

        function rescale() {
            var factor = servings / BASE_SERVINGS;
            countEl.textContent = servings + (servings === BASE_SERVINGS ? ' (original)' : '');
            ingredients.forEach(function (it) { it.span.textContent = scaleText(it.base, factor); });
        }

        slider.addEventListener('input', function () {
            servings = Number(slider.value);
            rescale();
        });

        bar.querySelector('.rt-reset').addEventListener('click', function () {
            saved.clear();
            checks[r] = [];
            saveChecks(checks);
            ingredients.concat(steps).forEach(function (it) {
                it.box.checked = false;
                it.li.classList.remove('is-done');
            });
            updateProgress();
        });

        bar.querySelector('.rt-cook').addEventListener('click', function () {
            openCookMode(title, steps.map(function (s) { return s.base; }), function () {
                return ingredients.map(function (it) { return it.span.textContent; });
            }, servings);
        });

        updateProgress();
        rescale();
    });

    /* ───── cook mode (one shared <dialog>) ───── */
    var dlg = null;
    var els = {};
    var state = null;
    var tickId = null;
    var wakeLock = null;

    function buildDialog() {
        dlg = document.createElement('dialog');
        dlg.className = 'cook-dialog';
        dlg.setAttribute('data-sr-skip', ''); // keep the Swarm Rebuild animation off the live dialog
        dlg.setAttribute('aria-labelledby', 'cook-title');
        dlg.innerHTML =
            '<div class="cook-head">' +
            '<div><p class="cook-kicker">Cook mode</p><h2 id="cook-title" class="cook-title"></h2></div>' +
            '<button type="button" class="cook-close" aria-label="Close cook mode">✕</button>' +
            '</div>' +
            '<div class="cook-progress"><span class="cook-bar"></span></div>' +
            '<p class="cook-count" aria-live="polite"></p>' +
            '<p class="cook-step"></p>' +
            '<div class="cook-timer" hidden>' +
            '<span class="cook-time" role="timer" aria-live="off"></span>' +
            '<button type="button" class="rt-btn cook-start">Start timer</button>' +
            '<button type="button" class="rt-btn rt-ghost cook-reset">Reset</button>' +
            '</div>' +
            '<p class="cook-alert" role="status" aria-live="assertive"></p>' +
            '<details class="cook-ings"><summary>Ingredients for <span class="cook-servings"></span></summary><ul></ul></details>' +
            '<div class="cook-nav">' +
            '<button type="button" class="rt-btn rt-ghost cook-prev">← Back</button>' +
            '<button type="button" class="rt-btn cook-next">Next →</button>' +
            '</div>';
        document.body.appendChild(dlg);

        els.title = dlg.querySelector('.cook-title');
        els.bar = dlg.querySelector('.cook-bar');
        els.count = dlg.querySelector('.cook-count');
        els.step = dlg.querySelector('.cook-step');
        els.timer = dlg.querySelector('.cook-timer');
        els.time = dlg.querySelector('.cook-time');
        els.start = dlg.querySelector('.cook-start');
        els.reset = dlg.querySelector('.cook-reset');
        els.alert = dlg.querySelector('.cook-alert');
        els.ings = dlg.querySelector('.cook-ings ul');
        els.prev = dlg.querySelector('.cook-prev');
        els.next = dlg.querySelector('.cook-next');

        dlg.querySelector('.cook-close').addEventListener('click', function () { dlg.close(); });
        els.prev.addEventListener('click', function () { go(-1); });
        els.next.addEventListener('click', function () {
            if (state.i === state.steps.length - 1) dlg.close(); else go(1);
        });
        els.start.addEventListener('click', toggleTimer);
        els.reset.addEventListener('click', resetTimer);

        dlg.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); els.next.click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // backdrop click
        dlg.addEventListener('close', function () {
            clearInterval(tickId); tickId = null;
            if (wakeLock) { try { wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
            state = null;
        });
    }

    function openCookMode(title, steps, getIngredients, servings) {
        if (!dlg) buildDialog();
        state = {
            i: 0,
            steps: steps,
            timers: steps.map(function (s) {
                var mins = stepMinutes(s);
                return { total: mins * 60, left: mins * 60, endAt: 0, running: false };
            })
        };
        els.title.textContent = title;
        var items = getIngredients();
        els.ings.innerHTML = '';
        items.forEach(function (t) {
            var li = document.createElement('li');
            li.textContent = t;
            els.ings.appendChild(li);
        });
        dlg.querySelector('.cook-servings').textContent = servings + (servings === 1 ? ' serving' : ' servings');
        render();
        dlg.showModal();
        if (navigator.wakeLock && navigator.wakeLock.request) {
            navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () { });
        }
        tickId = setInterval(tick, 250);
    }

    function go(delta) {
        var n = state.i + delta;
        if (n < 0 || n >= state.steps.length) return;
        state.i = n;
        els.alert.textContent = '';
        render();
    }

    function render() {
        var i = state.i, n = state.steps.length, t = state.timers[i];
        els.count.textContent = 'Step ' + (i + 1) + ' of ' + n;
        els.bar.style.width = ((i + 1) / n * 100) + '%';
        els.step.textContent = state.steps[i];
        els.prev.disabled = i === 0;
        els.next.textContent = i === n - 1 ? 'Done ✓' : 'Next →';
        els.timer.hidden = !t.total;
        if (t.total) paintTimer();
    }

    function paintTimer() {
        var t = state.timers[state.i];
        els.time.textContent = mmss(t.left);
        els.start.textContent = t.running ? 'Pause' : (t.left < t.total && t.left > 0 ? 'Resume' : (t.left === 0 ? 'Restart' : 'Start timer'));
        els.timer.classList.toggle('is-running', t.running);
    }

    function toggleTimer() {
        warmAudio();
        var t = state.timers[state.i];
        if (t.running) {
            t.left = Math.max(0, (t.endAt - Date.now()) / 1000);
            t.running = false;
        } else {
            if (t.left <= 0) t.left = t.total;
            t.endAt = Date.now() + t.left * 1000;
            t.running = true;
            els.alert.textContent = '';
        }
        paintTimer();
    }

    function resetTimer() {
        var t = state.timers[state.i];
        t.running = false;
        t.left = t.total;
        els.alert.textContent = '';
        paintTimer();
    }

    function tick() {
        if (!state) return;
        state.timers.forEach(function (t, idx) {
            if (!t.running) return;
            t.left = (t.endAt - Date.now()) / 1000;
            if (t.left <= 0) {
                t.left = 0;
                t.running = false;
                beep();
                els.alert.textContent = '⏰ Timer finished for step ' + (idx + 1) + '!';
            }
        });
        if (state.timers[state.i].total) paintTimer();
    }
})();
