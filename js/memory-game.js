/* Memory Match — a card-matching game built from the photos already on the page.
   Works on any page with `.gallery-grid .photo-card img` (childhood, family, friends).
   Vanilla JS, no dependencies. Best score is saved per page in localStorage. */
(function () {
    'use strict';

    var grid = document.querySelector('.gallery-grid');
    if (!grid) return;

    var photos = Array.prototype.slice.call(grid.querySelectorAll('.photo-card img')).map(function (img) {
        return { src: img.getAttribute('src'), alt: img.getAttribute('alt') || 'Memory photo' };
    });
    if (photos.length < 2) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var MISMATCH_MS = reduceMotion ? 500 : 900;
    var BEST_KEY = 'mg-best-' + location.pathname.split('/').pop();
    var BACK_LOGO = '../img/icons/zn.logo.png';

    /* ───── build the panel ───── */
    var section = document.createElement('section');
    section.className = 'glass-panel memory-game';
    section.setAttribute('data-sr-skip', '');
    section.setAttribute('aria-labelledby', 'mg-heading');
    section.innerHTML =
        '<h2 class="section-title" id="mg-heading">Memory Match</h2>' +
        '<p class="content-intro">Flip two cards at a time and find every matching pair of photos. Fewer moves means a better score!</p>' +
        '<div class="mg-stats" aria-live="off">' +
        '<span>Moves: <strong class="mg-moves">0</strong></span>' +
        '<span>Time: <strong class="mg-time">0:00</strong></span>' +
        '<span>Pairs: <strong class="mg-pairs">0</strong> / ' + photos.length + '</span>' +
        '<span>Best: <strong class="mg-best">—</strong></span>' +
        '<button type="button" class="mg-new">New game</button>' +
        '</div>' +
        '<div class="mg-board" role="group" aria-label="Memory match cards"></div>' +
        '<p class="mg-status" role="status" aria-live="polite"></p>';
    grid.parentNode.insertBefore(section, grid.nextSibling);

    var board = section.querySelector('.mg-board');
    var movesEl = section.querySelector('.mg-moves');
    var timeEl = section.querySelector('.mg-time');
    var pairsEl = section.querySelector('.mg-pairs');
    var bestEl = section.querySelector('.mg-best');
    var statusEl = section.querySelector('.mg-status');

    var first = null, lock = false, moves = 0, matched = 0, startedAt = 0, timerId = null;

    function shuffle(a) {
        var i, j, t;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function mmss(ms) {
        var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
        s = s % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getBest() {
        try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
    }
    function setBest(n) {
        try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* private mode */ }
    }
    function paintBest() {
        var b = getBest();
        bestEl.textContent = b ? b + ' moves' : '—';
    }

    function setLabel(card) {
        var n = Number(card.dataset.n);
        var alt = card.dataset.alt;
        if (card.classList.contains('is-matched')) card.setAttribute('aria-label', 'Card ' + n + ': ' + alt + ' (matched)');
        else if (card.classList.contains('is-flipped')) card.setAttribute('aria-label', 'Card ' + n + ': ' + alt);
        else card.setAttribute('aria-label', 'Card ' + n + ', face down');
    }

    function stopTimer() {
        if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function startTimer() {
        startedAt = Date.now();
        timerId = setInterval(function () { timeEl.textContent = mmss(Date.now() - startedAt); }, 500);
    }

    function flip(card, up) {
        card.classList.toggle('is-flipped', up);
        card.setAttribute('aria-pressed', String(up));
        setLabel(card);
    }

    function onCard(card) {
        if (lock || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return;
        if (!timerId && !matched && !startedAt) startTimer();
        flip(card, true);

        if (!first) { first = card; return; }

        moves++;
        movesEl.textContent = moves;
        var second = card;

        if (first.dataset.key === second.dataset.key) {
            [first, second].forEach(function (c) {
                c.classList.add('is-matched');
                setLabel(c);
            });
            matched++;
            pairsEl.textContent = matched;
            first = null;
            if (matched === photos.length) win();
        } else {
            lock = true;
            var a = first, b = second;
            first = null;
            setTimeout(function () {
                flip(a, false);
                flip(b, false);
                lock = false;
            }, MISMATCH_MS);
        }
    }

    function win() {
        stopTimer();
        var elapsed = mmss(Date.now() - startedAt);
        var best = getBest();
        var record = !best || moves < best;
        if (record) { setBest(moves); paintBest(); }
        statusEl.textContent = '🎉 You matched all ' + photos.length + ' pairs in ' + moves + ' moves (' + elapsed + ')' +
            (record ? ' — a new best!' : '.');
        statusEl.classList.add('is-win');
    }

    function newGame() {
        stopTimer();
        first = null; lock = false; moves = 0; matched = 0; startedAt = 0;
        movesEl.textContent = '0';
        timeEl.textContent = '0:00';
        pairsEl.textContent = '0';
        statusEl.textContent = '';
        statusEl.classList.remove('is-win');
        board.innerHTML = '';

        var deck = [];
        photos.forEach(function (p, i) {
            deck.push({ key: i, p: p });
            deck.push({ key: i, p: p });
        });
        shuffle(deck).forEach(function (d, idx) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'mg-card';
            card.dataset.key = d.key;
            card.dataset.n = idx + 1;
            card.dataset.alt = d.p.alt;
            card.setAttribute('aria-pressed', 'false');

            var inner = document.createElement('span');
            inner.className = 'mg-inner';

            var back = document.createElement('span');
            back.className = 'mg-face mg-back';
            var logo = document.createElement('img');
            logo.src = BACK_LOGO;
            logo.alt = '';
            logo.setAttribute('aria-hidden', 'true');
            back.appendChild(logo);

            var front = document.createElement('span');
            front.className = 'mg-face mg-front';
            var img = document.createElement('img');
            img.src = d.p.src;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            img.draggable = false;
            front.appendChild(img);

            inner.appendChild(back);
            inner.appendChild(front);
            card.appendChild(inner);
            setLabel(card);
            card.addEventListener('click', function () { onCard(card); });
            board.appendChild(card);
        });
    }

    section.querySelector('.mg-new').addEventListener('click', newGame);
    paintBest();
    newGame();
})();
