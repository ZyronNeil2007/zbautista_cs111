/* My Song — live audio visualizer (Web Audio API) + reflections that follow playback.
   Hooks into the existing <audio id="player"> and #trackList from my_song.js; changes nothing there.
   Reflections are short personal notes, not song lyrics. Edit REFLECTIONS below to make them your own. */
(function () {
    'use strict';

    var player = document.getElementById('player');
    var canvas = document.getElementById('vizCanvas');
    var section = document.getElementById('vizSection');
    var tracks = Array.prototype.slice.call(document.querySelectorAll('#trackList .track'));
    if (!player || !canvas || !section || !tracks.length) return;

    /* ───────── reflections (edit freely) ───────── */
    var REFLECTIONS = [
        { match: /mystery of love/i, lines: [
            'Soft fingerpicking, and suddenly everything slows down.',
            'This is what first love feels like: wonder with a little fear in it.',
            'It takes me back to quiet summer afternoons and feelings I could not name yet.',
            'Some things are meant to be felt, not solved.',
            'Love as a mystery that leaves you a little different afterward.'
        ] },
        { match: /^blue$/i, lines: [
            'It opens cold and distant, like a room after someone has left.',
            'Nostalgia creeps in, quietly.',
            'Then the sound swells, bigger and more haunting than I expected.',
            'Letting go of someone you could not save is its own kind of grief.',
            'I always sit still until the very last note.'
        ] },
        { match: /can.t be friends/i, lines: [
            'A beat that makes you want to dance while your heart breaks.',
            'Two people who still care but cannot stay together.',
            'Choosing yourself does not mean the love was not real.',
            'Hope for another lifetime, self-respect in this one.',
            'Bittersweet, shimmering, and impossible to skip.'
        ] },
        { match: /sailor song/i, lines: [
            'Just a guitar and a voice that holds nothing back.',
            'Devotion that stays through stormy water.',
            'Loyalty that outlasts the hard seasons.',
            'The kind of song that feels like a hand held tight.',
            'Raw, honest, and gentle all at once.'
        ] },
        { match: /earrings/i, lines: [
            'A small keepsake can carry a whole person’s memory.',
            'Little objects become proof that a moment really happened.',
            'Gentle and a bit wistful, like finding something in an old drawer.',
            'Some people stay with us in the tiniest things.',
            'Nostalgia, in the best possible way.'
        ] }
    ];
    var FALLBACK = ['Press play and let the music set the mood.'];

    /* ───────── elements ───────── */
    var ctx2d = canvas.getContext('2d');
    var modeBtns = Array.prototype.slice.call(section.querySelectorAll('[data-mode]'));
    var hint = section.querySelector('.viz-hint');
    var songEl = section.querySelector('.reflect-song');
    var listEl = section.querySelector('.reflect-lines');

    var mode = 'bars';
    var BARS = 48;

    /* ───────── audio graph (created on first play = a user gesture) ───────── */
    var ac = null, analyser = null, freq = null, wave = null;
    var graphTried = false;
    var simulated = location.protocol === 'file:'; // MediaElementSource is silenced for file:// audio, so fake it
    var silentFrames = 0;

    function ensureGraph() {
        if (graphTried) { if (ac && ac.state === 'suspended') ac.resume(); return; }
        graphTried = true;
        if (simulated) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) { simulated = true; return; }
            ac = new AC();
            var src = ac.createMediaElementSource(player);
            analyser = ac.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.78;
            src.connect(analyser);
            analyser.connect(ac.destination);
            freq = new Uint8Array(analyser.frequencyBinCount);
            wave = new Uint8Array(analyser.fftSize);
            if (ac.state === 'suspended') ac.resume();
        } catch (e) {
            simulated = true;
            ac = analyser = null;
        }
    }

    /* ───────── data per frame ───────── */
    var bars = new Float32Array(BARS);   // 0..1, smoothed
    var waveOut = new Float32Array(128); // -1..1
    var bass = 0;
    var t0 = performance.now();

    function sample() {
        var playing = !player.paused && !player.ended;
        var target = new Float32Array(BARS);
        var i;

        if (playing && analyser && !simulated) {
            analyser.getByteFrequencyData(freq);
            analyser.getByteTimeDomainData(wave);
            var sum = 0;
            var usable = Math.floor(freq.length * 0.72);
            for (i = 0; i < BARS; i++) {
                // log-ish mapping so bass gets more bars
                var a = Math.floor(Math.pow(i / BARS, 1.7) * usable);
                var b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / BARS, 1.7) * usable));
                var m = 0, k;
                for (k = a; k < b; k++) m = Math.max(m, freq[k]);
                target[i] = m / 255;
                sum += m;
            }
            for (i = 0; i < waveOut.length; i++) waveOut[i] = (wave[Math.floor(i * wave.length / waveOut.length)] - 128) / 128;
            silentFrames = sum === 0 ? silentFrames + 1 : 0;
            if (silentFrames > 90) simulated = true; // audio isn't reaching the analyser (e.g. cross-origin), fall back
        } else if (playing && simulated) {
            var t = (performance.now() - t0) / 1000;
            for (i = 0; i < BARS; i++) {
                var env = 1 - (i / BARS) * 0.65;
                target[i] = Math.max(0, env * (0.45 + 0.35 * Math.sin(t * 2.1 + i * 0.5) + 0.2 * Math.sin(t * 5.3 + i * 1.3)));
            }
            for (i = 0; i < waveOut.length; i++) waveOut[i] = 0.5 * Math.sin(t * 6 + i * 0.22) * Math.sin(t * 1.3 + i * 0.05);
        } else {
            for (i = 0; i < waveOut.length; i++) waveOut[i] *= 0.9;
        }

        for (i = 0; i < BARS; i++) {
            var rate = target[i] > bars[i] ? 0.5 : 0.12; // fast attack, slow release
            bars[i] += (target[i] - bars[i]) * rate;
        }
        var bsum = 0;
        for (i = 0; i < 5; i++) bsum += bars[i];
        bass = bsum / 5;
        section.style.setProperty('--bass', bass.toFixed(3));
    }

    /* ───────── drawing ───────── */
    var W = 0, H = 0, dpr = 1, colors = { a: '#c9343f', b: '#f2e24f' };

    function readColors() {
        var cs = getComputedStyle(document.documentElement);
        colors.a = (cs.getPropertyValue('--red') || '#c9343f').trim() || '#c9343f';
        colors.b = (cs.getPropertyValue('--yellow') || '#f2e24f').trim() || '#f2e24f';
    }

    function resize() {
        var rect = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, Math.round(rect.width));
        H = Math.max(1, Math.round(rect.height));
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function gradient(x0, y0, x1, y1) {
        var g = ctx2d.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, colors.a);
        g.addColorStop(1, colors.b);
        return g;
    }

    function roundRect(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx2d.beginPath();
        ctx2d.moveTo(x + r, y);
        ctx2d.arcTo(x + w, y, x + w, y + h, r);
        ctx2d.arcTo(x + w, y + h, x, y + h, r);
        ctx2d.arcTo(x, y + h, x, y, r);
        ctx2d.arcTo(x, y, x + w, y, r);
        ctx2d.closePath();
    }

    function drawBars() {
        var gap = Math.max(2, W / BARS * 0.28);
        var bw = (W - gap * (BARS - 1)) / BARS;
        ctx2d.fillStyle = gradient(0, H, 0, 0);
        for (var i = 0; i < BARS; i++) {
            var h = Math.max(3, bars[i] * (H - 8));
            roundRect(i * (bw + gap), H - h, bw, h, bw / 2);
            ctx2d.fill();
        }
    }

    function drawWave() {
        ctx2d.lineWidth = 3;
        ctx2d.lineJoin = 'round';
        ctx2d.strokeStyle = gradient(0, 0, W, 0);
        ctx2d.beginPath();
        for (var i = 0; i < waveOut.length; i++) {
            var x = i / (waveOut.length - 1) * W;
            var y = H / 2 + waveOut[i] * (H * 0.42);
            if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
    }

    function drawRing() {
        var cx = W / 2, cy = H / 2;
        var base = Math.min(W, H) * 0.24 * (1 + bass * 0.12);
        var maxLen = Math.min(W, H) * 0.24;
        var n = BARS * 2;
        ctx2d.lineCap = 'round';
        ctx2d.lineWidth = Math.max(2, base * 0.07);
        ctx2d.strokeStyle = gradient(cx - base, cy - base, cx + base, cy + base);
        for (var i = 0; i < n; i++) {
            var v = bars[i < BARS ? i : n - 1 - i];
            var ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            var len = 4 + v * maxLen;
            ctx2d.beginPath();
            ctx2d.moveTo(cx + Math.cos(ang) * base, cy + Math.sin(ang) * base);
            ctx2d.lineTo(cx + Math.cos(ang) * (base + len), cy + Math.sin(ang) * (base + len));
            ctx2d.stroke();
        }
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, base * 0.55 * (1 + bass * 0.2), 0, Math.PI * 2);
        ctx2d.fillStyle = gradient(cx - base, cy - base, cx + base, cy + base);
        ctx2d.globalAlpha = 0.35;
        ctx2d.fill();
        ctx2d.globalAlpha = 1;
    }

    var raf = 0, visible = true;

    function frame() {
        raf = 0;
        if (!visible || document.hidden) return;
        sample();
        ctx2d.clearRect(0, 0, W, H);
        if (mode === 'wave') drawWave();
        else if (mode === 'ring') drawRing();
        else drawBars();
        // keep animating while playing or while the bars are still settling
        var settling = bass > 0.004 || bars[BARS >> 1] > 0.004;
        if (!player.paused || settling) raf = requestAnimationFrame(frame);
    }

    function kick() {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    /* ───────── reflections ───────── */
    var activeTrack = -1, activeLine = -1;

    function currentTrackIndex() {
        for (var i = 0; i < tracks.length; i++) if (tracks[i].classList.contains('active')) return i;
        return 0;
    }

    function linesFor(title) {
        for (var i = 0; i < REFLECTIONS.length; i++) if (REFLECTIONS[i].match.test(title)) return REFLECTIONS[i].lines;
        return FALLBACK;
    }

    function renderReflections() {
        var idx = currentTrackIndex();
        if (idx === activeTrack) return;
        activeTrack = idx;
        activeLine = -1;
        var row = tracks[idx];
        var title = row.dataset.title || '';
        songEl.textContent = title + ' · ' + (row.dataset.artist || '');
        var lines = linesFor(title);
        listEl.innerHTML = '';
        lines.forEach(function (text, i) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'reflect-line';
            btn.textContent = text;
            btn.addEventListener('click', function () {
                if (!player.duration) return;
                player.currentTime = (i / lines.length) * player.duration;
                if (player.paused) player.play().catch(function () { });
            });
            li.appendChild(btn);
            listEl.appendChild(li);
        });
        setActiveLine(0);
    }

    function setActiveLine(i) {
        if (i === activeLine) return;
        var items = listEl.children;
        if (items[activeLine]) items[activeLine].firstChild.classList.remove('is-active');
        if (items[i]) items[i].firstChild.classList.add('is-active');
        activeLine = i;
    }

    function syncReflection() {
        renderReflections();
        var n = listEl.children.length;
        if (!n || !player.duration) return setActiveLine(0);
        var i = Math.min(n - 1, Math.floor(player.currentTime / player.duration * n));
        setActiveLine(i);
    }

    /* ───────── wiring ───────── */
    modeBtns.forEach(function (b) {
        b.addEventListener('click', function () {
            mode = b.dataset.mode;
            modeBtns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
            kick();
        });
    });

    player.addEventListener('play', function () {
        ensureGraph();
        if (hint) hint.hidden = true;
        section.classList.add('is-live');
        syncReflection();
        kick();
    });
    player.addEventListener('pause', function () { section.classList.remove('is-live'); kick(); });
    player.addEventListener('ended', function () { section.classList.remove('is-live'); kick(); });
    player.addEventListener('loadstart', function () { setTimeout(syncReflection, 0); });
    player.addEventListener('loadedmetadata', syncReflection);
    player.addEventListener('timeupdate', syncReflection);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) kick();
        }, { threshold: 0.05 }).observe(section);
    }
    document.addEventListener('visibilitychange', kick);

    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); kick(); }).observe(canvas);
    else window.addEventListener('resize', function () { resize(); kick(); });

    readColors();
    resize();
    renderReflections();
    kick();
})();
