/* ════════════════════════════════════════════════════════════
   Swarm launcher — starts the "Swarm Rebuild" animation on this page.
   • The swarm engine (js/swarm.js) is loaded the first time you click the button.
   • swarm.js starts itself when it loads; after that, the button toggles it.
   • Alt+Shift+S does the same thing as the button (same shortcut as the extension).
   • Esc, ✕, or "Go live" inside the swarm closes it.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var btn = document.getElementById('swarm-launch');
    if (!btn) return;

    var SRC = 'js/swarm.js';
    var loading = false;

    function setBusy(on) {
        loading = on;
        btn.setAttribute('aria-busy', String(on));
    }

    function launch() {
        if (loading) return;

        // Already loaded once: swarm.js exposes a toggle on window.__swarmRebuild
        if (window.__swarmRebuild) {
            window.__swarmRebuild.toggle();
            return;
        }

        // First click: load the engine. It starts itself as soon as it runs.
        setBusy(true);
        var s = document.createElement('script');
        s.src = SRC;
        s.onload = function () { setBusy(false); };
        s.onerror = function () {
            setBusy(false);
            console.error('[swarm-launch] could not load ' + SRC);
        };
        document.body.appendChild(s);
    }

    btn.addEventListener('click', launch);

    document.addEventListener('keydown', function (e) {
        if (e.altKey && e.shiftKey && e.code === 'KeyS') {
            e.preventDefault();
            launch();
        }
    });
})();
