/* My Favorite Movies — Netflix-style behaviour
   - Billboard with an autoplaying trailer backdrop (built from the tile data in the HTML)
   - "Starring" cast line pulled from each movie's Main Cast
   - Details modal with prev/next, focus trap and keyboard support
   - Row scroll arrows with disabled states
   - Image / video fallbacks */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var $ = function (id) { return document.getElementById(id); };

    /* ───────── Settings you can tweak ───────── */
    var PREVIEW_SECONDS = 30;   // how long each trailer plays in the billboard before the next movie
    var IMAGE_SECONDS = 7;      // how long a movie stays when there is no trailer (fallback)
    var LOAD_TIMEOUT = 6000;    // ms to wait for a trailer to start before falling back to the poster

    var tiles = [].slice.call(document.querySelectorAll('.tile'));

    /* ───────── Movie data, read from the HTML so content lives in one place ───────── */
    function castOf(tile) {
        var heads = [].slice.call(tile.querySelectorAll('.tile-details h3'));
        for (var i = 0; i < heads.length; i++) {
            if (heads[i].textContent.trim().toLowerCase() === 'main cast') {
                var p = heads[i].nextElementSibling;
                if (!p) { return []; }
                // "Taylor Zakhar Perez (Alex), Nicholas Galitzine (Prince Henry)." -> names only
                return p.textContent
                    .replace(/\([^)]*\)/g, '')
                    .split(',')
                    .map(function (n) { return n.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim(); })
                    .filter(Boolean);
            }
        }
        return [];
    }

    var movies = tiles.map(function (t) {
        var img = t.querySelector('.poster img');
        var syn = t.querySelector('.tile-details .detail-grid p');
        var source = t.querySelector('.tile-details video source');
        var text = syn ? syn.textContent.replace(/\s+/g, ' ').trim() : '';
        if (text.length > 200) { text = text.slice(0, 200).replace(/\s+\S*$/, '') + '\u2026'; }
        return {
            title: t.querySelector('.tile-overlay h3').textContent.trim(),
            meta: t.querySelector('.detail-meta').innerHTML,
            desc: text,
            src: img.getAttribute('src'),
            video: source ? source.getAttribute('src') : '',
            cast: castOf(t)
        };
    });

    /* ───────── Modal references (declared early; the billboard needs to know if the modal is open) ───────── */
    var modal = $('movieModal');
    var box = modal.querySelector('.modal-box');
    var body = $('modalBody');
    var count = $('modalCount');
    var openIndex = 0;
    var lastFocus = null;

    /* ───────── Billboard ───────── */
    var bb = $('billboard');
    var bbBg = $('bbBg');
    var bbVideo = $('bbVideo');
    var bbSound = $('bbSound');
    var bbPoster = $('bbPoster');
    var bbTitle = $('bbTitle');
    var bbMeta = $('bbMeta');
    var bbDesc = $('bbDesc');
    var bbCast = $('bbCast');
    var bbCount = $('bbCount');
    var bbDots = $('bbDots');

    var current = 0;
    var swapTimer;
    var loadTimer;
    var slideToken = 0;      // guards against late events from a previous movie's trailer
    var offscreen = false;
    var useVideo = !!bbVideo && !reduceMotion && !saveData;

    // mode: 'swap'    -> transitioning between movies
    //       'loading' -> waiting for the trailer to start
    //       'video'   -> trailer playing, the video is the clock
    //       'image'   -> no trailer, a simple timer is the clock
    var mode = 'image';
    var elapsed = 0;
    var limit = IMAGE_SECONDS;

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
            d.style.setProperty('--p', 0);
            if (i < current) { d.classList.add('done'); }
        });
        dots[current].classList.add('active');
        dots[current].setAttribute('aria-current', 'true');
    }

    function renderProgress() {
        var ratio = limit > 0 ? Math.min(1, elapsed / limit) : 0;
        dots[current].style.setProperty('--p', ratio.toFixed(3));
    }

    function setCast(names) {
        bbCast.textContent = '';
        if (!names.length) { return; }
        var label = document.createElement('span');
        label.className = 'cast-label';
        label.textContent = 'Starring:';
        bbCast.appendChild(label);
        bbCast.appendChild(document.createTextNode(' ' + names.join(', ')));
    }

    /* ----- trailer control ----- */
    function updateSound() {
        var muted = bbVideo.muted;
        bbSound.classList.toggle('is-on', !muted);
        bbSound.setAttribute('aria-pressed', String(!muted));
        bbSound.setAttribute('aria-label', muted ? 'Unmute trailer' : 'Mute trailer');
    }

    function toImage() {
        clearTimeout(loadTimer);
        mode = 'image';
        elapsed = 0;
        limit = IMAGE_SECONDS;
        if (bbVideo) { bbVideo.pause(); }
        bb.classList.remove('has-video');
        renderProgress();
    }

    function tryPlay(token) {
        var p = bbVideo.play();
        if (p && p.catch) {
            p.catch(function (err) {
                if (token !== slideToken || (err && err.name === 'AbortError')) { return; }
                // browsers can refuse sound-on autoplay: retry muted before giving up on the trailer
                if (!bbVideo.muted) { bbVideo.muted = true; updateSound(); tryPlay(token); return; }
                toImage();
            });
        }
    }

    function startTrailer(m) {
        var token = ++slideToken;
        clearTimeout(loadTimer);
        elapsed = 0;
        limit = IMAGE_SECONDS;
        bb.classList.remove('has-video');

        if (useVideo && m.video) {
            mode = 'loading';
            bbVideo.src = m.video;
            tryPlay(token);
            loadTimer = setTimeout(function () {
                if (token === slideToken && mode === 'loading') { toImage(); }
            }, LOAD_TIMEOUT);
        } else {
            mode = 'image';
            if (bbVideo) { bbVideo.pause(); }
        }
        renderProgress();
    }

    function advance() {
        showBillboard((current + 1) % movies.length);
    }

    if (bbVideo) {
        bbVideo.addEventListener('playing', function () {
            if (mode !== 'loading') { return; }
            clearTimeout(loadTimer);
            mode = 'video';
            var d = bbVideo.duration;
            limit = (isFinite(d) && d > 0) ? Math.min(d, PREVIEW_SECONDS) : PREVIEW_SECONDS;
            bb.classList.add('has-video');
            syncVideo();
        });

        bbVideo.addEventListener('timeupdate', function () {
            if (mode !== 'video') { return; }
            elapsed = bbVideo.currentTime;
            renderProgress();
            if (elapsed >= limit) { advance(); }
        });

        bbVideo.addEventListener('ended', function () {
            if (mode === 'video') { advance(); }
        });

        bbVideo.addEventListener('error', function () {
            if (mode === 'loading' || mode === 'video') { toImage(); }
        });

        bbSound.addEventListener('click', function () {
            bbVideo.muted = !bbVideo.muted;
            updateSound();
        });
        updateSound();
    }

    // Pause the trailer when it can't be seen or heard properly (modal open, tab hidden, scrolled away)
    function syncVideo() {
        if (!bbVideo || (mode !== 'video' && mode !== 'loading')) { return; }
        if (document.hidden || offscreen || !modal.hidden) {
            bbVideo.pause();
        } else {
            var p = bbVideo.play();
            if (p && p.catch) { p.catch(function () { }); }
        }
    }
    document.addEventListener('visibilitychange', syncVideo);

    // Fallback clock for movies without a playing trailer
    function imageHold() {
        return reduceMotion || document.hidden || offscreen || !modal.hidden ||
            bb.matches(':hover') || !!bb.querySelector(':focus-visible');
    }
    setInterval(function () {
        if (mode !== 'image' || imageHold()) { return; }
        elapsed += 0.1;
        renderProgress();
        if (elapsed >= limit) { advance(); }
    }, 100);

    function showBillboard(i, instant) {
        current = i;
        var m = movies[i];

        function apply() {
            bbBg.style.backgroundImage = 'url("' + m.src.replace(/"/g, '%22') + '")';
            bbPoster.src = m.src;
            bbTitle.textContent = m.title;
            bbMeta.innerHTML = m.meta;
            bbDesc.textContent = m.desc;
            setCast(m.cast);
            bbCount.textContent = 'Pick #' + (i + 1) + ' of ' + movies.length;
            updateDots();
            startTrailer(m);
            syncVideo();
        }

        clearTimeout(swapTimer);
        mode = 'swap'; // stops the old trailer from advancing again while we transition
        if (instant || reduceMotion) { apply(); return; }
        bb.classList.add('is-swapping');
        swapTimer = setTimeout(function () {
            apply();
            bb.classList.remove('is-swapping');
        }, 280);
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            offscreen = !entries[0].isIntersecting;
            bb.classList.toggle('is-offscreen', offscreen);
            syncVideo();
        }, { threshold: 0.25 }).observe(bb);
    }

    $('bbPlay').addEventListener('click', function () { openMovie(current, true); });
    $('bbInfo').addEventListener('click', function () { openMovie(current, false); });
    bbPoster.addEventListener('click', function () { openMovie(current, false); });

    showBillboard(0, true);

    /* ───────── Modal ───────── */
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
        syncVideo(); // silence the billboard trailer while the modal is open

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
        syncVideo(); // bring the billboard trailer back
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