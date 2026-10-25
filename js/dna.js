/* ════════════════════════════════════════════════════════════
   DNA timeline — a double helix pinned to the centre of "My Journey".
   • rotates with your scroll (eased, with a little inertia + slow idle spin)
   • base pairs are colour-coded like real A–T / G–C pairs
   • a glowing node + ripple marks every year card that has appeared
   • the card nearest the middle of the screen becomes "active"
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var wrap = document.getElementById('dna');
    if (!wrap) return;
    var box = wrap.querySelector('.pf-helix');
    var canvas = box.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var items = Array.prototype.slice.call(wrap.querySelectorAll('.pf-dna-list > li'));
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W = 0, H = 0, dpr = 1, onScreen = true;
    var spinNow = 0, spinTarget = 0, idle = 0, lastScroll = 0, vel = 0;
    var activeEl = null;

    // strand colours
    var CREAM = '246,231,193', YELLOW = '242,226,79', PEACH = '244,199,165', RED = '214,60,80';
    // base-pair colours (left end / right end) — cycles like A-T, G-C, T-A, C-G
    var PAIRS = [[YELLOW, RED], [CREAM, PEACH], [RED, YELLOW], [PEACH, CREAM]];

    // drifting motes
    var motes = [];
    for (var m = 0; m < 26; m++) {
        motes.push({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 1.8, s: 0.15 + Math.random() * 0.5, o: Math.random() * 6.28 });
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = box.clientWidth;
        H = box.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function mix(a, b, t) {
        var x = a.split(','), y = b.split(',');
        return Math.round(+x[0] + (y[0] - x[0]) * t) + ',' + Math.round(+x[1] + (y[1] - x[1]) * t) + ',' + Math.round(+x[2] + (y[2] - x[2]) * t);
    }

    function pickActive() {
        var mid = window.innerHeight * 0.5, best = null, bd = 1e9;
        items.forEach(function (li) {
            if (!li.classList.contains('in')) return;
            var r = li.getBoundingClientRect();
            var d = Math.abs(r.top + r.height / 2 - mid);
            if (d < bd) { bd = d; best = li; }
        });
        if (best !== activeEl) {
            if (activeEl) activeEl.classList.remove('is-active');
            if (best) best.classList.add('is-active');
            activeEl = best;
        }
    }

    function draw(time) {
        if (!W || !H) return;
        ctx.clearRect(0, 0, W, H);

        // ----- eased rotation tied to scroll -----
        var wrapRect = wrap.getBoundingClientRect();
        spinTarget = reduce ? 0 : -wrapRect.top * 0.0056;
        spinNow += (spinTarget - spinNow) * 0.09;
        idle += reduce ? 0 : 0.0045;
        var spin = spinNow + idle;

        var cx = W / 2;
        var amp = Math.min(86, W * 0.34);
        var step = 10;
        var freq = W < 120 ? 0.04 : 0.029;
        var boxTop = box.getBoundingClientRect().top;

        // node positions (y inside the canvas) for every revealed card
        var nodes = [];
        items.forEach(function (li, k) {
            if (!li.classList.contains('in')) return;
            var lr = li.getBoundingClientRect();
            var ny = lr.top + lr.height / 2 - boxTop;
            if (ny > -40 && ny < H + 40) nodes.push({ y: ny, k: k, active: li === activeEl });
        });
        function lit(y) {                       // 0..1 brightness near a revealed node
            var v = 0;
            for (var q = 0; q < nodes.length; q++) {
                var d = (y - nodes[q].y) / 70;
                v = Math.max(v, Math.exp(-d * d));
            }
            return v;
        }

        // ----- background motes (parallax with scroll) -----
        for (var i = 0; i < motes.length; i++) {
            var mo = motes[i];
            var my = ((mo.y * H - wrapRect.top * mo.s * 0.25 - time * 0.01 * mo.s) % H + H) % H;
            var mx = mo.x * W + Math.sin(time * 0.0007 + mo.o) * 8;
            ctx.fillStyle = 'rgba(246,231,193,' + (0.14 + 0.12 * Math.sin(time * 0.002 + mo.o)) + ')';
            ctx.beginPath(); ctx.arc(mx, my, mo.r, 0, 6.283); ctx.fill();
        }

        // ----- sample the helix -----
        var n = Math.ceil(H / step) + 2, pts = [];
        for (i = 0; i < n; i++) {
            var y = i * step, ph = y * freq + spin;
            pts.push({ y: y, x1: cx + Math.sin(ph) * amp, x2: cx - Math.sin(ph) * amp, z: Math.cos(ph), L: lit(y) });
        }

        ctx.lineCap = 'round';
        // 1) back halves of both strands
        for (i = 1; i < n; i++) strandSeg(pts[i - 1], pts[i], i / n, false);
        // 2) base pairs
        for (i = 0; i < n; i += 2) rung(pts[i], i / 2);
        // 3) front halves
        for (i = 1; i < n; i++) strandSeg(pts[i - 1], pts[i], i / n, true);

        // 4) glowing nodes + ripples
        for (var k2 = 0; k2 < nodes.length; k2++) {
            var nd = nodes[k2];
            var pulse = 1 + 0.1 * Math.sin(time / 380 + nd.k);
            var R = (nd.active ? 44 : 30) * pulse;
            var g = ctx.createRadialGradient(cx, nd.y, 0, cx, nd.y, R);
            g.addColorStop(0, 'rgba(242,226,79,' + (nd.active ? 0.75 : 0.5) + ')');
            g.addColorStop(1, 'rgba(242,226,79,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, nd.y, R, 0, 6.283); ctx.fill();
            if (nd.active && !reduce) {
                var rp = ((time / 1400) + nd.k * 0.13) % 1;
                ctx.strokeStyle = 'rgba(246,231,193,' + (0.55 * (1 - rp)) + ')';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, nd.y, 12 + rp * 40, 0, 6.283); ctx.stroke();
            }
            ctx.fillStyle = nd.active ? '#f2e24f' : '#f6e7c1';
            ctx.beginPath(); ctx.arc(cx, nd.y, nd.active ? 11 : 9, 0, 6.283); ctx.fill();
            ctx.strokeStyle = '#7a1626'; ctx.lineWidth = 4; ctx.stroke();
        }
    }

    function strandSeg(p, q, t, front) {
        var zA = (p.z + q.z) / 2, zB = -zA, L = (p.L + q.L) / 2;
        if ((zA >= 0) === front) tube(p.x1, p.y, q.x1, q.y, CREAM, YELLOW, t, zA, L);
        if ((zB >= 0) === front) tube(p.x2, p.y, q.x2, q.y, PEACH, RED, t, zB, L);
    }

    // a segment drawn as a shaded tube: soft glow → body → highlight
    function tube(x1, y1, x2, y2, c1, c2, t, z, L) {
        var d = (z + 1) / 2;                                 // 0 back … 1 front
        var col = mix(c1, c2, t);
        var w = 2.4 + 4.6 * d;
        if (d > 0.45) {
            ctx.strokeStyle = 'rgba(' + col + ',' + (0.10 + 0.22 * L) + ')';
            ctx.lineWidth = w + 8 + 6 * L;
            line(x1, y1, x2, y2);
        }
        ctx.strokeStyle = 'rgba(' + col + ',' + (0.30 + 0.70 * d) + ')';
        ctx.lineWidth = w;
        line(x1, y1, x2, y2);
        if (d > 0.55) {                                      // specular highlight
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.38 * d) + ')';
            ctx.lineWidth = Math.max(1, w * 0.28);
            line(x1 - w * 0.18, y1, x2 - w * 0.18, y2);
        }
    }

    function line(x1, y1, x2, y2) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function rung(r, idx) {
        var pair = PAIRS[idx % 4];
        var side = Math.abs(Math.sin(Math.acos(Math.max(-1, Math.min(1, r.z)))));   // 1 = face-on
        var a = (0.14 + 0.52 * side) + 0.38 * r.L;
        var mid = (r.x1 + r.x2) / 2;
        var gap = 3;
        var dirOK = Math.abs(r.x2 - r.x1) > 6;
        if (dirOK) {
            var g1 = ctx.createLinearGradient(r.x1, 0, mid, 0);
            g1.addColorStop(0, 'rgba(' + pair[0] + ',' + a + ')');
            g1.addColorStop(1, 'rgba(' + pair[0] + ',' + a * 0.35 + ')');
            var g2 = ctx.createLinearGradient(mid, 0, r.x2, 0);
            g2.addColorStop(0, 'rgba(' + pair[1] + ',' + a * 0.35 + ')');
            g2.addColorStop(1, 'rgba(' + pair[1] + ',' + a + ')');
            ctx.lineWidth = 2.4 + 1.2 * r.L;
            ctx.strokeStyle = g1; line(r.x1, r.y, mid - gap, r.y);
            ctx.strokeStyle = g2; line(mid + gap, r.y, r.x2, r.y);
            // hydrogen-bond dots in the middle
            ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.55) + ')';
            ctx.beginPath(); ctx.arc(mid, r.y, 1.4, 0, 6.283); ctx.fill();
        }
        // nucleotide nodes on the strands
        var dA = (r.z + 1) / 2, dB = (1 - r.z) / 2;
        node(r.x1, r.y, 2.4 + 3.2 * dA, pair[0], 0.45 + 0.5 * dA, r.L);
        node(r.x2, r.y, 2.4 + 3.2 * dB, pair[1], 0.45 + 0.5 * dB, r.L);
    }

    function node(x, y, rad, c, a, L) {
        if (L > 0.2) {
            ctx.fillStyle = 'rgba(' + c + ',' + (0.18 * L) + ')';
            ctx.beginPath(); ctx.arc(x, y, rad + 5 * L, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = 'rgba(' + c + ',' + a + ')';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.5) + ')';
        ctx.beginPath(); ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.35, 0, 6.283); ctx.fill();
    }

    function loop(t) {
        if (onScreen) { pickActive(); draw(t || 0); }
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; },
            { rootMargin: '200px 0px' }).observe(wrap);
    }
    resize();
    requestAnimationFrame(loop);
})();