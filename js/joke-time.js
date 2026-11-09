/* Joke Time — card flip, reactions, random joke machine, guess-the-punchline quiz.
   Vanilla JS, no dependencies. Reactions are saved in this browser only (localStorage). */
(function () {
    'use strict';

    var STORE_KEY = 'jt-reactions-v1';
    var cards = Array.prototype.slice.call(document.querySelectorAll('.joke-flip'));
    if (!cards.length) return;

    /* ───── tiny helpers ───── */
    function load() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
    }
    function save(data) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
    }
    function shuffle(arr) {
        var a = arr.slice(), i, j, t;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }
    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    var reactions = load(); // { "1": "laugh" | "meh" }

    /* ───── flip cards ───── */
    function setFlipped(card, flipped) {
        card.classList.toggle('is-flipped', flipped);
        var front = card.querySelector('.joke-front');
        var back = card.querySelector('.joke-back');
        front.inert = flipped;
        back.inert = !flipped;
        // move focus to the new face's first control so keyboard users don't get lost
        var target = flipped ? back.querySelector('button') : front.querySelector('button');
        if (target && document.activeElement && card.contains(document.activeElement)) target.focus({ preventScroll: true });
    }

    function updateSummary() {
        var out = document.getElementById('laugh-summary');
        if (!out) return;
        var laughs = 0, rated = 0;
        Object.keys(reactions).forEach(function (k) {
            rated++;
            if (reactions[k] === 'laugh') laughs++;
        });
        out.textContent = rated
            ? 'You laughed at ' + laughs + ' of ' + cards.length + ' jokes (' + rated + ' rated)'
            : 'No ratings yet — flip a card and tell me what you think!';
    }

    cards.forEach(function (card) {
        var id = card.dataset.joke;
        card.querySelector('.joke-reveal').addEventListener('click', function () { setFlipped(card, true); });
        card.querySelector('.joke-unflip').addEventListener('click', function () { setFlipped(card, false); });

        var buttons = Array.prototype.slice.call(card.querySelectorAll('.joke-react'));
        function paint() {
            buttons.forEach(function (b) {
                b.setAttribute('aria-pressed', String(reactions[id] === b.dataset.react));
            });
        }
        buttons.forEach(function (b) {
            b.addEventListener('click', function () {
                if (reactions[id] === b.dataset.react) delete reactions[id]; // tap again to undo
                else reactions[id] = b.dataset.react;
                save(reactions);
                paint();
                updateSummary();
                if (reactions[id] === 'laugh') {
                    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
                }
            });
        });
        paint();
    });
    updateSummary();

    var flipAll = document.getElementById('flip-all-btn');
    if (flipAll) {
        flipAll.addEventListener('click', function () {
            var anyClosed = cards.some(function (c) { return !c.classList.contains('is-flipped'); });
            cards.forEach(function (c) { setFlipped(c, anyClosed); });
            flipAll.textContent = anyClosed ? 'Flip all back' : 'Flip all cards';
        });
    }

    /* ───── random joke machine (page jokes + a few bonus ones) ───── */
    var pool = cards.map(function (c) {
        return {
            setup: c.querySelector('.joke-setup').textContent,
            punch: c.querySelector('.joke-punch').textContent
        };
    }).concat([
        { setup: 'Why did the developer go broke?', punch: 'Because he used up all his cache!' },
        { setup: 'Why was the JavaScript developer sad?', punch: "Because he didn't Node how to Express himself!" },
        { setup: 'A SQL query walks into a bar, walks up to two tables, and asks…', punch: '“Can I join you?”' },
        { setup: 'Why do programmers always mix up Halloween and Christmas?', punch: 'Because Oct 31 == Dec 25!' },
        { setup: 'Why did the computer show up late to work?', punch: 'It had a hard drive!' }
    ]);

    var box = document.getElementById('random-joke');
    var randBtn = document.getElementById('random-joke-btn');
    var last = -1;
    if (box && randBtn) {
        var setupEl = box.querySelector('.joke-random-setup');
        var punchEl = box.querySelector('.joke-random-punch');
        var revealBtn = box.querySelector('.joke-random-reveal');

        randBtn.addEventListener('click', function () {
            var n;
            do { n = Math.floor(Math.random() * pool.length); } while (n === last && pool.length > 1);
            last = n;
            setupEl.textContent = pool[n].setup;
            punchEl.textContent = pool[n].punch;
            punchEl.hidden = true;
            revealBtn.hidden = false;
            box.hidden = false;
            randBtn.textContent = '🎲 Another one';
        });
        revealBtn.addEventListener('click', function () {
            punchEl.hidden = false;
            revealBtn.hidden = true;
        });
    }

    /* ───── guess-the-punchline quiz ───── */
    var quizBody = document.getElementById('quiz-body');
    if (quizBody) {
        var questions = cards.map(function (c) {
            var correct = c.querySelector('.joke-punch').textContent;
            var wrong = (c.dataset.wrong || '').split('|').filter(Boolean);
            return {
                setup: c.querySelector('.joke-setup').textContent,
                correct: correct,
                options: shuffle([correct].concat(wrong))
            };
        });
        var qi = 0, score = 0, answered = false;

        function renderQuestion() {
            var q = questions[qi];
            answered = false;
            quizBody.innerHTML = '';

            quizBody.appendChild(el('p', 'quiz-progress', 'Question ' + (qi + 1) + ' of ' + questions.length + ' · Score: ' + score));
            quizBody.appendChild(el('p', 'quiz-setup', q.setup));

            var list = el('div', 'quiz-options');
            list.setAttribute('role', 'group');
            list.setAttribute('aria-label', 'Choose the punchline');
            var feedback = el('p', 'quiz-feedback');
            feedback.setAttribute('aria-live', 'polite');
            var nextBtn = el('button', 'joke-btn', qi === questions.length - 1 ? 'See my score' : 'Next question');
            nextBtn.type = 'button';
            nextBtn.hidden = true;

            q.options.forEach(function (opt) {
                var b = el('button', 'quiz-option', opt);
                b.type = 'button';
                b.addEventListener('click', function () {
                    if (answered) return;
                    answered = true;
                    var ok = opt === q.correct;
                    if (ok) score++;
                    Array.prototype.forEach.call(list.children, function (child) {
                        child.disabled = true;
                        if (child.textContent === q.correct) child.classList.add('is-correct');
                    });
                    if (!ok) b.classList.add('is-wrong');
                    feedback.textContent = ok ? 'Correct! 🎉' : 'Not quite — the right punchline is highlighted.';
                    nextBtn.hidden = false;
                    nextBtn.focus();
                });
                list.appendChild(b);
            });

            nextBtn.addEventListener('click', function () {
                qi++;
                if (qi < questions.length) renderQuestion(); else renderResult();
            });

            quizBody.appendChild(list);
            quizBody.appendChild(feedback);
            quizBody.appendChild(nextBtn);
        }

        function renderResult() {
            quizBody.innerHTML = '';
            var msg = score === questions.length ? 'Perfect! You’re a certified joke master. 🏆'
                : score >= 3 ? 'Nice work — you’ve got a good sense of humor!'
                : 'Good try! Flip the cards above and give it another go.';
            quizBody.appendChild(el('p', 'quiz-result', 'You scored ' + score + ' / ' + questions.length));
            quizBody.appendChild(el('p', 'quiz-setup', msg));
            var again = el('button', 'joke-btn', 'Play again');
            again.type = 'button';
            again.addEventListener('click', function () {
                qi = 0; score = 0;
                questions.forEach(function (q) { q.options = shuffle(q.options); });
                renderQuestion();
            });
            quizBody.appendChild(again);
            again.focus({ preventScroll: true });
        }

        renderQuestion();
    }
})();
