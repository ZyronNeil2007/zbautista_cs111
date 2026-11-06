(function () {
    var progress = document.getElementById("reading-progress");
    if (!progress) return;

    var frame = 0;

    function update() {
        var root = document.documentElement;
        var maxScroll = root.scrollHeight - root.clientHeight;
        var percentage = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
        progress.value = Math.max(0, Math.min(100, percentage));
        frame = 0;
    }

    function scheduleUpdate() {
        if (!frame) frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("pageshow", scheduleUpdate);
    update();

    if ("ResizeObserver" in window) {
        new ResizeObserver(scheduleUpdate).observe(document.body);
    }
})();
