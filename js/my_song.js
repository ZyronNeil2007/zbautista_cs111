(function () {
    'use strict';

    var player = document.getElementById('player');
    var tracks = Array.prototype.slice.call(document.querySelectorAll('#trackList .track'));
    var abouts = Array.prototype.slice.call(document.querySelectorAll('.about'));

    var playBtn = document.getElementById('playBtn');
    var playAll = document.getElementById('playAll');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var shuffleBtn = document.getElementById('shuffleBtn');
    var seek = document.getElementById('seek');
    var volume = document.getElementById('volume');
    var curTime = document.getElementById('curTime');
    var durTime = document.getElementById('durTime');
    var npCover = document.getElementById('npCover');
    var npTitle = document.getElementById('npTitle');
    var npArtist = document.getElementById('npArtist');
    var heroCover = document.getElementById('heroCover');
    var mobileProgress = document.getElementById('npProgressMobile');

    var current = -1;
    var shuffle = false;

    function fmt(s) {
        if (!isFinite(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function setFill(el, pct) {
        el.style.setProperty('--fill', pct + '%');
    }

    /* Fill in each row's duration from the audio file metadata */
    tracks.forEach(function (row) {
        var a = new Audio();
        a.preload = 'metadata';
        a.src = row.dataset.src;
        a.addEventListener('loadedmetadata', function () {
            row.querySelector('.c-time').textContent = fmt(a.duration);
        });
    });

    function showAbout(i) {
        abouts.forEach(function (el) {
            el.hidden = Number(el.dataset.for) !== i;
        });
    }

    function load(i) {
        var row = tracks[i];
        current = i;
        player.src = row.dataset.src;
        npCover.src = row.dataset.cover;
        npTitle.textContent = row.dataset.title;
        npArtist.textContent = row.dataset.artist;
        heroCover.src = row.dataset.cover;
        tracks.forEach(function (r, idx) {
            r.classList.toggle('active', idx === i);
        });
        showAbout(i);
        syncFull(i);
        Lyrics.load(i);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: row.dataset.title,
                artist: row.dataset.artist,
                artwork: [{ src: row.dataset.cover }]
            });
        }
    }

    function playIndex(i) {
        load(i);
        player.play().catch(function () { });
    }

    function toggle() {
        if (current === -1) {
            playIndex(0);
            return;
        }
        if (player.paused) player.play().catch(function () { });
        else player.pause();
    }

    function next() {
        if (current === -1) return playIndex(0);
        var n;
        if (shuffle && tracks.length > 1) {
            do { n = Math.floor(Math.random() * tracks.length); } while (n === current);
        } else {
            n = (current + 1) % tracks.length;
        }
        playIndex(n);
    }

    function prev() {
        if (current === -1) return playIndex(0);
        if (player.currentTime > 3) {
            player.currentTime = 0;
            return;
        }
        playIndex((current - 1 + tracks.length) % tracks.length);
    }

    /* Row interaction */
    tracks.forEach(function (row, i) {
        row.addEventListener('click', function () {
            if (i === current) toggle();
            else playIndex(i);
        });
        row.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                row.click();
            }
        });
    });

    playBtn.addEventListener('click', toggle);
    playAll.addEventListener('click', toggle);
    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', prev);

    shuffleBtn.addEventListener('click', function () {
        shuffle = !shuffle;
        shuffleBtn.setAttribute('aria-pressed', String(shuffle));
    });

    /* Player state → UI */
    function setPlaying(on) {
        document.body.classList.toggle('is-playing', on);
        playBtn.classList.toggle('is-playing', on);
        playAll.classList.toggle('is-playing', on);
        playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
        playAll.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }

    player.addEventListener('play', function () { setPlaying(true); });
    player.addEventListener('pause', function () { setPlaying(false); });
    var repeat = false;
    player.addEventListener('ended', function () {
        if (repeat) {
            player.currentTime = 0;
            player.play().catch(function () { });
        } else {
            next();
        }
    });

    player.addEventListener('loadedmetadata', function () {
        durTime.textContent = fmt(player.duration);
    });

    player.addEventListener('timeupdate', function () {
        var pct = player.duration ? (player.currentTime / player.duration) * 100 : 0;
        curTime.textContent = fmt(player.currentTime);
        seek.value = pct;
        setFill(seek, pct);
        mobileProgress.style.width = pct + '%';
    });

    seek.addEventListener('input', function () {
        if (!player.duration) return;
        player.currentTime = (seek.value / 100) * player.duration;
        setFill(seek, seek.value);
    });

    volume.addEventListener('input', function () {
        player.volume = Number(volume.value);
        setFill(volume, volume.value * 100);
    });
    setFill(volume, 100);

    /* Keyboard: space toggles play (unless typing in a control) */
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            toggle();
        }
    });

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', toggle);
        navigator.mediaSession.setActionHandler('pause', toggle);
        navigator.mediaSession.setActionHandler('nexttrack', next);
        navigator.mediaSession.setActionHandler('previoustrack', prev);
    }

    /* ───────── Full-screen Now Playing (phones) ───────── */
    var full = document.getElementById('npFull');
    var nfCover = document.getElementById('nfCover');
    var nfTitle = document.getElementById('nfTitle');
    var nfArtist = document.getElementById('nfArtist');
    var nfSeek = document.getElementById('nfSeek');
    var nfCur = document.getElementById('nfCur');
    var nfDur = document.getElementById('nfDur');
    var nfPlay = document.getElementById('nfPlay');
    var nfShuffle = document.getElementById('nfShuffle');
    var nfRepeat = document.getElementById('nfRepeat');
    var nfAbout = document.getElementById('nfAbout');
    var npBar = document.getElementById('npBar');
    var mobileMQ = window.matchMedia('(max-width: 860px)');

    function syncFull(i) {
        var row = tracks[i];
        nfCover.src = row.dataset.cover;
        nfTitle.textContent = row.dataset.title;
        nfArtist.textContent = row.dataset.artist;
        var p = document.querySelector('.about[data-for="' + i + '"] p');
        var meaning = p ? p.textContent.replace(/\s+/g, ' ').trim() : '';
        document.getElementById('nfMeaning').textContent = meaning;
        var list = document.querySelector('.about[data-for="' + i + '"] .about-list');
        var genreLi = list ? Array.prototype.filter.call(list.children, function (li) { return /^Genre:/.test(li.textContent.trim()); })[0] : null;
        var genre = genreLi ? genreLi.textContent.replace(/^Genre:\s*/, '').trim() : '';
        nfAbout.textContent = '\u201C' + row.dataset.title + '\u201D by ' + row.dataset.artist +
            ' is track ' + (i + 1) + ' of ' + tracks.length + ' in this playlist.' +
            (genre ? ' Genre: ' + genre + '.' : '');
        var items = '<li><strong>Title:</strong> ' + row.dataset.title + '</li>' +
            '<li><strong>Artist:</strong> ' + row.dataset.artist + '</li>' +
            (list ? list.innerHTML : '');
        document.getElementById('nfDetails').innerHTML = items;
    }

    function openFull() {
        full.classList.add('open');
        full.setAttribute('aria-hidden', 'false');
        document.body.classList.add('nf-open');
        document.documentElement.classList.add('nf-open');
        full.scrollTop = 0;
        Lyrics.recenter();
    }

    /* browser fullscreen (Fullscreen API) */
    var fsBtn = document.getElementById('fsBtn');
    var nfFs = document.getElementById('nfFs');
    var fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    var openedViaFsBtn = false;

    function inBrowserFs() { return document.fullscreenElement || document.webkitFullscreenElement; }

    function enterBrowserFs() {
        var el = document.documentElement;
        var f = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!f) return;
        var r = f.call(el);
        if (r && r.catch) r.catch(function () { });
    }

    function exitBrowserFs() {
        var f = document.exitFullscreen || document.webkitExitFullscreen;
        if (!f || !inBrowserFs()) return;
        var r = f.call(document);
        if (r && r.catch) r.catch(function () { });
    }

    function closeFull() {
        if (openedViaFsBtn) { openedViaFsBtn = false; exitBrowserFs(); }
        full.classList.remove('open');
        full.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('nf-open');
        document.documentElement.classList.remove('nf-open');
    }

    npBar.addEventListener('click', function (e) {
        if (e.target.closest('button')) return; // let play/pause behave normally
        if (mobileMQ.matches) openFull();
    });

    document.getElementById('nfClose').addEventListener('click', closeFull);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeFull();
    });

    /* desktop button: open the big player and go fullscreen */
    fsBtn.addEventListener('click', function () {
        if (full.classList.contains('open')) { closeFull(); return; }
        openFull();
        if (fsSupported) { openedViaFsBtn = true; enterBrowserFs(); }
    });

    /* in-player button: toggle browser fullscreen */
    if (!fsSupported) nfFs.style.display = 'none';
    nfFs.addEventListener('click', function () {
        if (inBrowserFs()) { openedViaFsBtn = false; exitBrowserFs(); }
        else enterBrowserFs();
    });

    function onFsChange() {
        var on = !!inBrowserFs();
        nfFs.setAttribute('aria-pressed', String(on));
        if (!on && openedViaFsBtn) { openedViaFsBtn = false; closeFull(); }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    /* keyboard: ← previous, → next */
    document.addEventListener('keydown', function (e) {
        if (e.target !== document.body) return;
        if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
    });

    nfPlay.addEventListener('click', toggle);
    document.getElementById('nfNext').addEventListener('click', next);
    document.getElementById('nfPrev').addEventListener('click', prev);

    nfShuffle.addEventListener('click', function () {
        shuffleBtn.click();
        nfShuffle.setAttribute('aria-pressed', String(shuffle));
    });

    nfRepeat.addEventListener('click', function () {
        repeat = !repeat;
        nfRepeat.setAttribute('aria-pressed', String(repeat));
    });

    document.getElementById('nfQueue').addEventListener('click', function () {
        closeFull();
        document.getElementById('trackList').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('nfShare').addEventListener('click', function () {
        var row = tracks[current === -1 ? 0 : current];
        var text = row.dataset.title + ' — ' + row.dataset.artist;
        if (navigator.share) {
            navigator.share({ title: text, text: text, url: location.href }).catch(function () { });
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text + ' ' + location.href).catch(function () { });
        }
    });

    nfSeek.addEventListener('input', function () {
        if (!player.duration) return;
        player.currentTime = (nfSeek.value / 100) * player.duration;
        setFill(nfSeek, nfSeek.value);
    });

    player.addEventListener('timeupdate', function () {
        var pct = player.duration ? (player.currentTime / player.duration) * 100 : 0;
        nfCur.textContent = fmt(player.currentTime);
        nfSeek.value = pct;
        setFill(nfSeek, pct);
    });

    player.addEventListener('loadedmetadata', function () {
        nfDur.textContent = fmt(player.duration);
    });

    player.addEventListener('play', function () { nfPlay.classList.add('is-playing'); nfPlay.setAttribute('aria-label', 'Pause'); });
    player.addEventListener('pause', function () { nfPlay.classList.remove('is-playing'); nfPlay.setAttribute('aria-label', 'Play'); });

    /* ═══════════════════════════════════════════════════════════════
       TIME-SYNCED KARAOKE & OFFICIAL LYRICS SEARCH SYSTEM
       ═══════════════════════════════════════════════════════════════ */
    var Lyrics = (function () {
        var pageSong = document.getElementById('lyPageSong');
        var scrollBoxes = Array.prototype.slice.call(document.querySelectorAll('.lyrics-scroll-box, #lyrics-scroll-box'));
        var activeIndex = -1;
        var currentLyricsData = null;

        /* 1. Structure the Time-Synced Data (JSON format for royalty-free / demo tracks) */
        var royaltyFreeLyrics = [
            { time: 0, text: "♪ (Instrumental Intro) ♪" },
            { time: 8.5, text: "First line of the melody" },
            { time: 14.0, text: "Second line continues the rhythm" },
            { time: 20.5, text: "Harmonies build as the chorus arrives" },
            { time: 28.0, text: "Melody flows through the acoustic chords" },
            { time: 35.0, text: "♪ (Instrumental Outro) ♪" }
        ];

        /* 4. Sync the UI with the Audio API (timeupdate) */
        player.addEventListener('timeupdate', function () {
            if (!currentLyricsData || !currentLyricsData.length) return;
            var currentTime = player.currentTime;

            // Find current line based on timestamp
            var newIndex = -1;
            for (var k = 0; k < currentLyricsData.length; k++) {
                var nextLine = currentLyricsData[k + 1];
                if (currentTime >= currentLyricsData[k].time && (!nextLine || currentTime < nextLine.time)) {
                    newIndex = k;
                    break;
                }
            }

            if (newIndex !== -1 && newIndex !== activeIndex) {
                scrollBoxes.forEach(function (box) {
                    if (activeIndex !== -1 && box.children[activeIndex]) {
                        box.children[activeIndex].classList.remove('active');
                    }
                    var activeElement = box.children[newIndex];
                    if (activeElement) {
                        activeElement.classList.add('active');
                        // Smoothly scroll container so active line stays centered
                        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
                activeIndex = newIndex;
            }
        });

        function renderKaraokeLines(lyricsArray) {
            currentLyricsData = lyricsArray;
            activeIndex = -1;

            scrollBoxes.forEach(function (box) {
                box.innerHTML = '';
                lyricsArray.forEach(function (item, idx) {
                    var p = document.createElement('p');
                    p.className = 'lyric-line' + (idx === 0 ? ' active' : '');
                    p.textContent = item.text;
                    p.addEventListener('click', function () {
                        player.currentTime = item.time;
                        if (player.paused) player.play().catch(function () { });
                    });
                    box.appendChild(p);
                });
                box.scrollTop = 0;
            });
        }

        /* Safe Fallback for Mainstream Songs: Search Official Lyrics on Google */
        function renderOfficialLyricsFallback(title, artist) {
            currentLyricsData = null;
            activeIndex = -1;

            var query = 'lyrics ' + artist + ' ' + title;
            var searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);

            var html = [
                '<div class="official-lyrics-card">',
                '  <p class="official-lyrics-tag">🎵 Official Verified Lyrics</p>',
                '  <h4 class="official-lyrics-title">' + escapeHTML(title) + '</h4>',
                '  <p class="official-lyrics-artist">by ' + escapeHTML(artist) + '</p>',
                '  <p class="official-lyrics-notice">To respect artist copyright, full lyrics are opened securely via official search.</p>',
                '  <a href="' + searchUrl + '" target="_blank" rel="noopener noreferrer" class="official-lyrics-btn glass">',
                '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
                '    Search Official Lyrics on Google',
                '  </a>',
                '</div>'
            ].join('\n');

            scrollBoxes.forEach(function (box) {
                box.innerHTML = html;
            });
        }

        function escapeHTML(str) {
            return (str || '').replace(/[&<>'"]/g, function (tag) {
                return ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag] || tag);
            });
        }

        function load(i) {
            var row = tracks[i];
            if (!row) return;

            var title = row.dataset.title || '';
            var artist = row.dataset.artist || '';

            if (pageSong) {
                pageSong.textContent = title + ' \u00B7 ' + artist;
            }

            // If track has explicit time-synced data
            if (row.dataset.hasTimeSync === 'true') {
                renderKaraokeLines(royaltyFreeLyrics);
            } else {
                // Safe Fallback for mainstream songs
                renderOfficialLyricsFallback(title, artist);
            }
        }

        return {
            load: load,
            recenter: function () {
                if (currentLyricsData && activeIndex >= 0) {
                    scrollBoxes.forEach(function (box) {
                        var activeElement = box.children[activeIndex];
                        if (activeElement) {
                            activeElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                        }
                    });
                }
            }
        };
    })();

    var lyricsBtn = document.getElementById('lyricsBtn');
    lyricsBtn.addEventListener('click', function () {
        var target = full.classList.contains('open')
            ? document.querySelector('.nf-lyrics')
            : document.getElementById('lyricsSection');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* Start with song 1 loaded (not playing) so the bar and About panel are filled */
    load(0);
})();