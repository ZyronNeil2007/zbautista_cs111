/* Folder ↔ page handoff, part 2. Loaded from <head> on the homepage and on every memory page,
 * so it can act before the first paint.
 *
 *   Homepage → memory page   js/folders.js grows a crimson sheet over the whole screen and sets
 *                            "fx-arrive". Here the new page starts under the same sheet
 *                            (html.fx-arriving, see css/tokens.css), which then fades away.
 *   Memory page → homepage   the "Back to Homepage" link records which page you were on ("fx-return").
 *                            The homepage starts under a full-screen sheet (html.fx-returning) and
 *                            js/folders.js shrinks it into the matching folder.
 *
 * Nothing happens for reduced-motion visitors, stale flags (older than 10 s), or when
 * sessionStorage is blocked. */
(function () {
    'use strict';

    var root = document.documentElement;
    var FRESH = 10000;                              // ms a flag stays valid
    var store;
    try { store = window.sessionStorage; } catch (e) { return; }
    if (!store) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
        var arrive = store.getItem('fx-arrive');
        if (arrive) {
            store.removeItem('fx-arrive');
            if (!reduce && Date.now() - Number(arrive) < FRESH) root.classList.add('fx-arriving');
        }

        var home = /(^|\/)(index\.html)?$/.test(window.location.pathname);
        var back = store.getItem('fx-return');
        if (home && back && !reduce && Date.now() - Number(back.split('|')[1]) < FRESH) {
            root.classList.add('fx-returning');
        }
    } catch (e) { /* storage unavailable: no animation, normal navigation */ }

    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('.nav-back-link');
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        try { store.setItem('fx-return', window.location.pathname + '|' + Date.now()); } catch (err) { /* ignore */ }
    }, true);
})();
