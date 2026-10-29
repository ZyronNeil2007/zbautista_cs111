/* My Favorite Movies — Netflix-style behaviour
   - Rotating billboard (built from the tile data in the HTML)
   - Details modal with prev/next, focus trap and keyboard support
   - Row scroll arrows with disabled states
   - Image / video fallbacks */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (id) { return document.getElementById(id); };

    var tiles = [].slice.call(document.querySelectorAll('.tile'));

    /* ───────── Movie data, read from the HTML so content lives in one place ───────── */
    var movies = tiles.map(function (t) {
        var img = t.querySelector('.poster img');
        var syn = t.querySelector('.tile-details .detail-grid p');
        var text = syn ? syn.textContent.replace(/\s+/g, ' ').trim() : '';
        if (text.length > 200) { text = text.slice(0, 200).replace(/\s+\S*$/, '') + '\u2026'; }
        return {
            title: t.querySelector('.tile-overlay h3').textContent.trim(),
            meta: t.querySelector('.detail-meta').innerHTML,
            desc: text,
            src: img.getAttribute('src')
        };
    });

    /* ───────── Billboard ───────── */
    var bb = $('billboard');
    var bbBg = $('bbBg');
    var bbPoster = $('bbPoster');
    var bbTitle = $('bbTitle');
    var bbMeta = $('bbMeta');
    var bbDesc = $('bbDesc');
    var bbCount = $('bbCount');
    var bbDots = $('bbDots');
    var current = 0;
    var swapTimer;

    var dots = movies.map(function (m, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dot';
        b.setAttribute('aria-label', 'Show ' + m.title);
        b.addEventListener('click', function () { showBillboard(i); });
        bbDots.appendChild(b);
        return b;
    });

    function updateDots() {
        dots.forEach(function (d, i) {
            d.classList.remove('active', 'done');
            d.removeAttribute('aria-current');
            if (i < current) { d.classList.add('done'); }
        });
        void dots[current].offsetWidth; // restart the progress animation
        dots[current].classList.add('active');
        dots[current].setAttribute('aria-current', 'true');
    }

    function showBillboard(i, instant) {
        current = i;
        var m = movies[i];

        function apply() {
            bbBg.style.backgroundImage = 'url("' + m.src.replace(/"/g, '%22') + '")';
            bbPoster.src = m.src;
            bbTitle.textContent = m.title;
            bbMeta.innerHTML = m.meta;
            bbDesc.textContent = m.desc;
            bbCount.textContent = 'Pick #' + (i + 1) + ' of ' + movies.length;
            updateDots();
        }

        clearTimeout(swapTimer);
        if (instant || reduceMotion) { apply(); return; }
        bb.classList.add('is-swapping');
        swapTimer = setTimeout(function () {
            apply();
            bb.classList.remove('is-swapping');
        }, 280);
    }

    // The progress bar of the active dot drives auto-advance (CSS pauses it on hover/focus/modal/offscreen)
    bbDots.addEventListener('animationend', function (e) {
        if (e.target.classList.contains('active')) {
            showBillboard((current + 1) % movies.length);
        }
    });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            bb.classList.toggle('is-offscreen', !entries[0].isIntersecting);
        }, { threshold: 0.25 }).observe(bb);
    }

    $('bbPlay').addEventListener('click', function () { openMovie(current, true); });
    $('bbInfo').addEventListener('click', function () { openMovie(current, false); });
    bbPoster.addEventListener('click', function () { openMovie(current, false); });

    showBillboard(0, true);

    /* ───────── Modal ───────── */
    var modal = $('movieModal');
    var box = modal.querySelector('.modal-box');
    var body = $('modalBody');
    var count = $('modalCount');
    var openIndex = 0;
    var lastFocus = null;

    function openMovie(index, autoplay) {
        var tile = tiles[index];
        if (!tile) { return; }
        var wasOpen = !modal.hidden;
        if (!wasOpen) { lastFocus = document.activeElement; }

        openIndex = index;
        body.innerHTML = tile.querySelector('.tile-details').innerHTML;
        count.textContent = (index + 1) + ' / ' + tiles.length;
        modal.hidden = false;
        document.body.classList.add('modal-open');
        modal.scrollTop = 0;

        if (!wasOpen) { modal.querySelector('.modal-close').focus(); }
        if (autoplay) {
            var v = body.querySelector('video');
            if (v) { v.play().catch(function () { }); }
        }
    }

    function closeMovie() {
        var v = body.querySelector('video');
        if (v) { v.pause(); }
        body.innerHTML = '';
        modal.hidden = true;
        document.body.classList.remove('modal-open');
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    function stepMovie(dir) {
        openMovie((openIndex + dir + tiles.length) % tiles.length, false);
    }

    tiles.forEach(function (t, i) {
        t.addEventListener('click', function () { openMovie(i, false); });
        t.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMovie(i, false); }
        });
    });

    modal.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-close')) { closeMovie(); }
        var nav = e.target.closest('[data-nav]');
        if (nav) { stepMovie(parseInt(nav.getAttribute('data-nav'), 10)); }
    });

    function focusables() {
        return [].slice.call(box.querySelectorAll('button, video[controls], a[href]')).filter(function (el) {
            return !el.disabled && el.offsetParent !== null;
        });
    }

    document.addEventListener('keydown', function (e) {
        if (modal.hidden) { return; }

        if (e.key === 'Escape') { closeMovie(); return; }

        if (e.key === 'Tab') { // keep focus inside the dialog
            var f = focusables();
            if (!f.length) { return; }
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            return;
        }

        // Arrow keys switch movie, except while the video has focus (it uses them to seek)
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.tagName !== 'VIDEO') {
            stepMovie(e.key === 'ArrowLeft' ? -1 : 1);
        }
    });

    // Friendly message if a trailer file is missing
    body.addEventListener('error', function (e) {
        if (e.target.tagName !== 'SOURCE') { return; }
        var wrap = e.target.closest('.media-player-wrapper');
        if (wrap && !wrap.querySelector('.video-error')) {
            var msg = document.createElement('p');
            msg.className = 'video-error';
            msg.textContent = 'Trailer unavailable. The video file could not be loaded.';
            wrap.appendChild(msg);
        }
    }, true);

    /* ───────── Rows ───────── */
    document.querySelectorAll('.row-wrap').forEach(function (wrap) {
        var scroller = wrap.querySelector('.row-scroller');
        var left = wrap.querySelector('.row-arrow.left');
        var right = wrap.querySelector('.row-arrow.right');

        function update() {
            left.disabled = scroller.scrollLeft <= 4;
            right.disabled = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
        }

        left.addEventListener('click', function () {
            scroller.scrollBy({ left: -scroller.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        right.addEventListener('click', function () {
            scroller.scrollBy({ left: scroller.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        scroller.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    });

    /* ───────── Poster fallback ───────── */
    tiles.forEach(function (t) {
        var img = t.querySelector('.poster img');
        var poster = t.querySelector('.poster');
        function missing() { poster.classList.add('is-missing'); }
        img.addEventListener('error', missing);
        if (img.complete && img.naturalWidth === 0) { missing(); }
    });
})();
