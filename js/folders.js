/* ════════════════════════════════════════════════════════════
   Interactive folders — hover to fan out the divider tabs,
   scroll (or use ▲ ▼ / arrow keys) to flip through the pages,
   click to open the full memory page.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // Pages that pop out of each folder (real files from your project folders)
    var DATA = {
        childhood: {
            unit: 'photos', tab: 'Photo',
            items: [
                { t: 'Sweet Early Memories', img: 'img/childhood_memories/Picture1.jpg' },
                { t: 'Growing Up Fast', img: 'img/childhood_memories/Picture2.png' },
                { t: 'Carefree Days', img: 'img/childhood_memories/Picture3.png' },
                { t: 'Special Milestone', img: 'img/childhood_memories/Picture4.jpg' },
                { t: 'Cherished Times', img: 'img/childhood_memories/Picture5.jpg' }
            ]
        },
        family: {
            unit: 'photos', tab: 'Photo',
            items: [
                { t: 'Family Togetherness', img: 'img/family_relatives/20251207_111840_Redmi-Note-13-LTE.jpg' },
                { t: 'Beautiful Family Memories', img: 'img/family_relatives/tabuk.jpg' },
                { t: 'Special Celebrations', img: 'img/family_relatives/MVIMG_20260510_113511.jpg' },
                { t: 'Mother Earth', img: 'img/family_relatives/received_1688029061383906.jpeg' },
                { t: "Mother's Birthday", img: 'img/family_relatives/Zyron_20250505_123014_x.MP.jpg' }
            ]
        },
        friends: {
            unit: 'photos', tab: 'Photo',
            items: [
                { t: 'Senior High Circle', img: 'img/my_friends/senior_high_circle.jpg' },
                { t: 'Engineering Solid Circle', img: 'img/my_friends/engineering_solid_circle.jpeg' },
                { t: 'The Legends Crew', img: 'img/my_friends/erreg_legends.JPG' },
                { t: 'Chill Night & Fellowship', img: 'img/my_friends/inuman.jpg' },
                { t: 'The Fun & Lively Gang', img: 'img/my_friends/backstab_group.jpg' }
            ]
        },
        love: {
            unit: 'photos', tab: 'Photo',
            items: [
                { t: 'Me and Mark', img: 'img/me_and_my_love/me and mark dump.jpg' },
                { t: 'Sweet Inspiration', img: 'img/me_and_my_love/me and my crush maxell.jpg' },
                { t: 'Me and Plagg', img: 'img/me_and_my_love/me and plagg.jpg' },
                { t: 'Passion for Tech', img: 'img/me_and_my_love/me and my computer.jpg' },
                { t: 'The Fun Imperfections', img: 'img/me_and_my_love/error.jpg' }
            ]
        },
        food: {
            unit: 'dishes', tab: 'Dish',
            items: [
                { t: 'Classic Filipino Adobo', img: 'img/my_favorite_food/adobo.webp' },
                { t: 'Sinigang', img: 'img/my_favorite_food/sinigang.webp' },
                { t: 'Chicken Tinola', img: 'img/my_favorite_food/chicken-tinola-7.jpg' },
                { t: 'Crispy French Fries', img: 'img/my_favorite_food/fries.jpg' }
            ]
        },
        movie: {
            unit: 'films', tab: 'Film',
            items: [
                { t: 'Red, White & Royal Blue', img: 'img/my_favorite_movie/rwrb.jpg' },
                { t: 'Call Me by Your Name', img: 'img/my_favorite_movie/callmebyyourname_movie.jpg' },
                { t: 'Marry My Dead Body', img: 'img/my_favorite_movie/merry over my dead body.jpg' },
                { t: 'Avengers: Infinity War', img: 'img/my_favorite_movie/infinity war.jpg' },
                { t: 'Doctor Strange: Multiverse of Madness', img: 'img/my_favorite_movie/multiverse of madness.jpg' }
            ]
        },
        song: {
            unit: 'songs', tab: 'Song',
            items: [
                { t: 'Mystery of Love', img: 'img/my_song/mistery_of_love.jpg' },
                { t: 'BLUE', img: 'img/my_song/blue by billie eilish song poster.jpg' },
                { t: "we can't be friends", img: 'img/my_song/we cant be friend poster.jpg' },
                { t: 'Sailor Song', img: 'img/my_song/sailor song poster.jpg' },
                { t: 'Earrings', img: 'img/my_song/earrings song poster.jpg' }
            ]
        },
        joke: {
            unit: 'jokes', tab: 'Joke',
            items: [
                { t: "The Programmer's Glasses", q: 'Why do programmers prefer wearing glasses?' },
                { t: "The Math Book's Dilemma", q: 'Why was the math book always looking so sad?' },
                { t: 'Cold Computer', q: "Why was the student's laptop shivering in the lecture?" },
                { t: 'The Lost Pencil', q: 'What did one pencil say to the other after a long exam?' },
                { t: 'The Binary Secret', q: 'There are only 10 types of people in the world...' }
            ]
        }
    };

    // Divider colours (gradient pairs) — warm crimson-friendly, with a few cool accents
    var PAL = [
        ['#f6e7c1', '#f4c7a5'], ['#f2e24f', '#ffb347'], ['#ff8a5c', '#ff4d6d'],
        ['#ff9ec7', '#b983ff'], ['#7fd6e8', '#4aa3df'], ['#ffd166', '#ef476f'],
        ['#c9f27a', '#3fbf7f'], ['#f4a6a6', '#c9343f']
    ];

    var coarse = window.matchMedia('(hover: none)').matches;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    /* ── Folder ↔ page handoff ────────────────────────────────────────────────
       Click: the folder's front flap swings open, the page you are on rises out, and that sheet
       grows until it fills the screen. The memory page starts under the same crimson sheet and
       fades it away (js/page-arrive.js, css/tokens.css). "Back to Homepage" runs it in reverse: a
       full-screen sheet shrinks into the folder it came from. Reduced motion: plain navigation. */
    var Morph = (function () {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
        var LIFT = 480;                                 // ms for the flap to swing open and the page to rise
        var GROW = 720;                                 // ms for the sheet to fill the screen
        var SHRINK = 640;                               // ms for the sheet to settle back into the folder
        var EASE = 'cubic-bezier(.65, 0, .2, 1)';
        var FRESH = 10000;                              // ms a "return" flag stays valid

        function frame(r) { return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }; }
        function screen() {
            return { left: '0px', top: '0px', width: document.documentElement.clientWidth + 'px', height: window.innerHeight + 'px' };
        }
        function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
        function titleOf(card) { var h = card.querySelector('.fx-label h3'); return h ? h.textContent : ''; }

        // A sheet of paper above the page. `face` is the folder page it starts as; `bg` is the crimson page it becomes.
        function makeSheet(f, title, face, faceBg) {
            var sheet = el('div', 'fx-paper');
            sheet.setAttribute('aria-hidden', 'true');
            sheet.style.left = f.left;
            sheet.style.top = f.top;
            sheet.style.width = f.width;
            sheet.style.height = f.height;
            if (faceBg) sheet.style.backgroundImage = faceBg;
            var faceEl = el('div', 'fx-paper-face');
            if (face) faceEl.appendChild(face);
            var bg = el('div', 'fx-paper-bg');
            var t = el('span', 'fx-paper-title', title);
            bg.appendChild(t);
            sheet.appendChild(faceEl);
            sheet.appendChild(bg);
            document.body.appendChild(sheet);
            return { sheet: sheet, face: faceEl, bg: bg, title: t };
        }

        // The raised page leaves the folder and grows to fill the screen, then the browser navigates.
        function fly(card, href) {
            var raised = card.querySelector('.fx-sheet.is-active');
            var from = (raised || card.querySelector('.fx-scene')).getBoundingClientRect();
            var page = raised && raised.querySelector('.fx-page');
            var p = makeSheet(frame(from), titleOf(card), page ? page.cloneNode(true) : null,
                raised ? window.getComputedStyle(raised).backgroundImage : null);
            if (raised) raised.style.visibility = 'hidden';

            var go = function () {
                try { window.sessionStorage.setItem('fx-arrive', String(Date.now())); } catch (e) { /* ignore */ }
                window.location.href = href;
            };
            if (!p.sheet.animate) { go(); return; }

            var grow = p.sheet.animate([
                mix(frame(from), { borderRadius: '10px' }),
                mix(screen(), { borderRadius: '0px' })
            ], { duration: GROW, easing: EASE, fill: 'forwards' });
            p.face.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 220, fill: 'forwards' });
            p.bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 180, fill: 'forwards' });
            p.title.animate([
                { opacity: 0, transform: 'translateY(18px) scale(.94)' },
                { opacity: 1, transform: 'none' }
            ], { duration: 420, delay: 300, easing: 'ease-out', fill: 'both' });
            p.title.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: GROW - 160, fill: 'forwards' });
            grow.onfinish = go;
            grow.oncancel = go;
        }

        // Coming home: a full-screen sheet shrinks into the folder the visitor came from.
        function land(card, peek) {
            var scene = card.querySelector('.fx-scene');
            scene.scrollIntoView({ block: 'center', behavior: 'instant' });
            var to = scene.getBoundingClientRect();
            var p = makeSheet(screen(), titleOf(card), null, null);
            p.sheet.style.borderRadius = '0';
            p.bg.style.opacity = '1';
            document.documentElement.classList.remove('fx-returning');   // the real sheet takes over, same frame
            peek(true);
            card.classList.add('is-returning');

            var end = { left: (to.left + to.width * 0.07) + 'px', top: (to.top + 6) + 'px', width: (to.width * 0.86) + 'px', height: (to.height * 0.5) + 'px' };
            if (!p.sheet.animate) { p.sheet.remove(); card.classList.remove('is-returning'); peek(false); return; }
            var shrink = p.sheet.animate([
                mix(screen(), { borderRadius: '0px' }),
                mix(end, { borderRadius: '10px' })
            ], { duration: SHRINK, easing: EASE, fill: 'forwards' });
            p.title.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
            p.sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: SHRINK - 160, fill: 'forwards' });
            window.setTimeout(function () { card.classList.remove('is-returning'); peek(false); }, SHRINK - 220);
            shrink.onfinish = function () { p.sheet.remove(); };
        }

        function clearSheets() {
            Array.prototype.forEach.call(document.querySelectorAll('.fx-paper'), function (n) { n.remove(); });
            document.documentElement.classList.remove('fx-returning');
        }

        return { reduce: reduce, LIFT: LIFT, FRESH: FRESH, fly: fly, land: land, clearSheets: clearSheets };
    })();

    var cards = Array.prototype.slice.call(document.querySelectorAll('.fx-card'));

    cards.forEach(function (card, ci) {
        var data = DATA[card.getAttribute('data-key')];
        if (!data) return;

        var scene = card.querySelector('.fx-scene');
        var stack = card.querySelector('.fx-stack');
        stack.setAttribute('aria-hidden', 'true');
        var btnUp = card.querySelector('.fx-up');
        var btnDown = card.querySelector('.fx-down');
        var pos = card.querySelector('.fx-pos');
        var status = card.querySelector('.fx-status');
        var href = card.getAttribute('data-href');
        var n = data.items.length;
        var idx = -1;           // -1 = fanned out, 0..n-1 = that page lifted out
        var open = false;
        var loaded = false;

        card.querySelector('.fx-count').textContent = n;
        card.querySelector('.fx-unit').textContent = data.unit;

        // Build one divider + page per item
        var sheets = data.items.map(function (it, i) {
            var pal = PAL[(i + ci * 2) % PAL.length];
            var s = el('div', 'fx-sheet');
            s.style.setProperty('--i', i);
            s.style.setProperty('--col', i % 3);
            s.style.setProperty('--c1', pal[0]);
            s.style.setProperty('--c2', pal[1]);

            s.appendChild(el('span', 'fx-tab', data.tab + ' ' + pad(i + 1)));

            var page = el('div', 'fx-page');
            var media;
            if (it.img) {
                media = document.createElement('img');
                media.alt = it.t;
                media.decoding = 'async';
                media.setAttribute('data-src', encodeURI(it.img));
                media.className = 'fx-media';
                // if a file is missing, show a tidy placeholder instead of a broken icon
                media.addEventListener('error', function () {
                    var ph = el('div', 'fx-media fx-q', it.t);
                    media.replaceWith(ph);
                });
            } else {
                media = el('div', 'fx-media fx-q', it.q);
            }
            page.appendChild(media);

            var cap = el('div', 'fx-cap');
            cap.appendChild(el('b', null, pad(i + 1)));
            cap.appendChild(el('span', null, it.t));
            page.appendChild(cap);

            s.appendChild(page);
            stack.appendChild(s);
            return s;
        });

        function loadImages() {
            if (loaded) return;
            loaded = true;
            sheets.forEach(function (s) {
                var im = s.querySelector('img[data-src]');
                if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }
            });
        }

        function render() {
            card.classList.toggle('is-open', open);
            sheets.forEach(function (s, i) {
                s.classList.toggle('is-active', open && i === idx);
                s.classList.toggle('is-passed', open && i < idx);
            });
            btnUp.disabled = !open || idx <= -1;
            btnDown.disabled = !open || idx >= n - 1;
            pos.textContent = idx < 0 ? '' : (idx + 1) + ' / ' + n;
            status.textContent = idx < 0 ? '' : 'Page ' + (idx + 1) + ' of ' + n + ': ' + data.items[idx].t;
        }

        function go(next) {
            next = Math.max(-1, Math.min(n - 1, next));
            if (next === idx) return false;
            idx = next;
            render();
            return true;
        }

        var launching = false;

        function setOpen(v) {
            if (v === open) return;
            if (!v && launching) return;           // keep the folder open while it morphs into the page
            open = v;
            if (open) loadImages(); else idx = -1;
            render();
        }

        // Hover (mouse) / focus (keyboard)
        card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setOpen(true); });
        card.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setOpen(false); });
        scene.addEventListener('focusin', function (e) {
            // Keyboard focus opens the folder. A tap/click also focuses it, and that must NOT count as
            // "open": otherwise the first tap on a phone is treated as a second tap and navigates away.
            var kb = true;
            try { kb = e.target.matches(':focus-visible'); } catch (err) { /* very old browser: keep old behaviour */ }
            if (kb) setOpen(true);
        });
        scene.addEventListener('focusout', function (e) {
            if (!scene.contains(e.relatedTarget)) setOpen(false);
        });

        // Scroll wheel flips pages while the pointer is over the folder.
        // At either end the wheel falls through so the page can still scroll.
        var lock = 0;
        scene.addEventListener('wheel', function (e) {
            if (!open) return;
            var dir = e.deltaY > 0 ? 1 : (e.deltaY < 0 ? -1 : 0);
            if (!dir) return;
            var next = idx + dir;
            if (next < -1 || next > n - 1) return;
            e.preventDefault();
            var now = Date.now();
            if (now - lock < 320) return;
            lock = now;
            go(next);
        }, { passive: false });

        // Keyboard
        scene.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { if (go(idx + 1)) e.preventDefault(); }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { if (go(idx - 1)) e.preventDefault(); }
        });

        // ▲ ▼ buttons
        btnUp.addEventListener('click', function (e) { e.stopPropagation(); go(idx - 1); });
        btnDown.addEventListener('click', function (e) { e.stopPropagation(); go(idx + 1); });

        // Click / tap
        scene.addEventListener('click', function (e) {
            if (e.target.closest('.fx-nav')) return;
            if (coarse && !open) {                           // first tap opens on touch screens
                cards.forEach(function (c) { if (c !== card && c._fxClose) c._fxClose(); });
                setOpen(true);
                return;
            }
            launch();
        });

        // Open the flap, raise a page, then let that page grow into the memory page.
        function launch() {
            if (launching) return;
            launching = true;
            if (Morph.reduce.matches) { window.location.href = href; return; }
            if (!open) setOpen(true);
            if (idx < 0) go(0);
            card.classList.add('is-launching');
            window.setTimeout(function () { Morph.fly(card, href); }, Morph.LIFT);
        }

        // The label link below the folder gets the same animation (modified clicks keep their default).
        var label = card.querySelector('.fx-label');
        if (label) {
            label.addEventListener('click', function (e) {
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                launch();
            });
        }

        card._fxClose = function () { setOpen(false); };
        card._fxReset = function () {
            launching = false;
            card.classList.remove('is-launching', 'is-returning');
            sheets.forEach(function (s) { s.style.visibility = ''; });
            setOpen(false);
        };
        // Used when the visitor comes back from the memory page: open on the first page, then close again.
        card._fxPeek = function (v) { if (v) { setOpen(true); go(0); } else { setOpen(false); } };
        render();
    });

    // Coming back from a memory page: a full-screen sheet shrinks into the folder it came from.
    (function () {
        var raw = null, card = null;
        try { raw = window.sessionStorage.getItem('fx-return'); window.sessionStorage.removeItem('fx-return'); } catch (e) { /* ignore */ }
        var parts = raw ? raw.split('|') : [];
        if (parts.length === 2 && Date.now() - Number(parts[1]) < Morph.FRESH &&
            !Morph.reduce.matches && !document.documentElement.classList.contains('sr-lock')) {
            cards.forEach(function (c) {
                var h = c.getAttribute('data-href');
                try { if (h && new URL(h, window.location.href).pathname === parts[0]) card = c; } catch (e) { /* ignore */ }
            });
        }
        if (card && !card.classList.contains('hidden') && card._fxPeek) Morph.land(card, card._fxPeek);
        else document.documentElement.classList.remove('fx-returning');
    })();

    // Back/forward cache: undo any leftover handoff state when the page is shown again.
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        Morph.clearSheets();
        cards.forEach(function (c) { if (c._fxReset) c._fxReset(); });
    });

    // Touch screens: tapping elsewhere closes any open folder
    if (coarse) {
        document.addEventListener('click', function (e) {
            if (e.target.closest('.fx-card')) return;
            cards.forEach(function (c) { if (c._fxClose) c._fxClose(); });
        });
    }
})();
