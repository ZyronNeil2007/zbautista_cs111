/* Folder → page morph: view-transition hooks for the homepage.
 *
 * Loaded from <head> (with <link rel="expect" href="#no-results" blocking="render">) so these
 * listeners exist before the browser's first render of the page. It only touches the DOM when an
 * event fires, so it needs nothing from js/folders.js.
 *
 *   leaving   the folder that leads to the opened memory page becomes the shared element
 *   arriving  coming back from a memory page, the page header shrinks into the folder it came from
 *
 * Each memory page names its header "folder-morph" in css/tokens.css. Browsers without cross-document
 * view transitions, and file:// previews, use the overlay fallback in js/folders.js instead. */
(function () {
    'use strict';

    if (!('onpageswap' in window) || window.location.protocol === 'file:') return;

    var NAME = 'folder-morph';

    function scenes() {
        return Array.prototype.slice.call(document.querySelectorAll('.fx-card'));
    }

    function cardForUrl(url) {
        var path;
        try { path = new URL(url, window.location.href).pathname; } catch (err) { return null; }
        var list = scenes();
        for (var i = 0; i < list.length; i++) {
            var h = list[i].getAttribute('data-href');
            if (h && new URL(h, window.location.href).pathname === path) return list[i];
        }
        return null;
    }

    function inView(node) {
        var r = node.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }

    function nameScene(card) {
        var s = card && card.querySelector('.fx-scene');
        if (!s || !inView(s)) return null;
        s.style.setProperty('view-transition-name', NAME);
        return s;
    }

    function clearNames() {
        scenes().forEach(function (c) {
            var s = c.querySelector('.fx-scene');
            if (s) s.style.removeProperty('view-transition-name');
        });
    }

    window.addEventListener('pageswap', function (e) {
        if (!e.viewTransition || !e.activation || !e.activation.entry) return;
        if (nameScene(cardForUrl(e.activation.entry.url))) {
            e.viewTransition.finished.then(clearNames, clearNames);
        }
    });

    window.addEventListener('pagereveal', function (e) {
        if (!e.viewTransition) return;
        var act = window.navigation && window.navigation.activation;
        var from = act && act.from && act.from.url;
        var card = from && cardForUrl(from);
        if (!card || document.documentElement.classList.contains('sr-lock')) return;   // the Swarm intro owns the screen
        var scene = card.querySelector('.fx-scene');
        if (act.navigationType !== 'traverse' && !inView(scene)) {
            scene.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
        if (nameScene(card)) e.viewTransition.finished.then(clearNames, clearNames);
    });

    // Back/forward cache: drop any leftover name when the page is shown again.
    window.addEventListener('pageshow', function (e) { if (e.persisted) clearNames(); });
})();
