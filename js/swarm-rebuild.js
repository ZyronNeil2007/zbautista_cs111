/* Swarm Rebuild: self-contained page scanning and cursor animation. */
(function () {
  "use strict";

  var script = document.currentScript;
  var colors = [
    "#FF5C8A", "#FFC233", "#A970FF", "#2DD4BF", "#4ADE80", "#FF8A3D",
    "#38BDF8", "#F43F5E", "#C084FC", "#FACC15", "#34D399", "#60A5FA",
    "#FB7185", "#F97316", "#22D3EE", "#A3E635"
  ];
  var names = ["Ada", "Bo", "Cyd", "Dex", "Eli", "Fen", "Gus", "Hal",
    "Ivy", "Jun", "Kai", "Lux", "Mo", "Nia", "Oz", "Pip"];
  var mediaTags = {
    IMG: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, PICTURE: 1,
    INPUT: 1, TEXTAREA: 1, SELECT: 1, IFRAME: 1, HR: 1, PROGRESS: 1,
    METER: 1, OBJECT: 1, EMBED: 1
  };
  var skippedTags = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, META: 1, BR: 1 };
  var noOp = function () {};
  var api = {
    replay: noOp,
    skip: noOp,
    setSpeed: noOp,
    tour: noOp,
    layers: []
  };
  window.SwarmRebuild = api;

  if (!script || (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;

  function readConfig() {
    var data = script.dataset || {};
    var count = parseInt(data.agents, 10);
    if (!Number.isFinite(count) || count < 1) count = 14;
    if (window.innerWidth < 640) count = Math.min(count, 8);
    var speed = Number(data.speed);
    if ([1, 2, 4].indexOf(speed) < 0) speed = 1;
    var line = Number(data.line);
    if (!Number.isFinite(line) || line <= 0 || line > 1) line = 0.88;
    var bg = validColor(data.bg, "#000");
    var accent = validColor(data.accent, "#3D8BFF");
    return { agents: count, speed: speed, line: line, bg: bg, accent: accent };
  }
  function validColor(value, fallback) {
    if (!value || !window.CSS || !window.CSS.supports ||
        !window.CSS.supports("color", value)) return fallback;
    return value;
  }

  var config = readConfig();
  var styleElement = null;
  var state = null;
  var frameId = 0;
  var replayClick = function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest("[data-sr-replay]") : null;
    if (!target) return;
    event.preventDefault();
    replay();
  };
  document.addEventListener("click", replayClick);

  function cssText() {
    return [
      "html.sr-lock{overflow:hidden!important}",
      "html.sr-lock.sr-gutter{scrollbar-gutter:stable}",
      "#sr-root,#sr-scan,#sr-agents{position:fixed;inset:0;width:100%;height:100%;max-width:100vw;overflow:hidden;box-sizing:border-box}",
      "#sr-root{z-index:2147483000;pointer-events:none}",
      "#sr-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}",
      "#sr-scan{z-index:2147483001;background:var(--sr-bg);display:grid;place-items:center;opacity:1;pointer-events:none;transition:opacity .55s ease}",
      "#sr-scan.sr-fading{opacity:0}",
      ".sr-scan-card{width:64px;height:64px;border:1px solid #ffffff36;border-radius:17px;background:#ffffff16;box-shadow:0 12px 42px #0005,inset 0 1px #ffffff38;display:grid;place-items:center;backdrop-filter:blur(12px);animation:sr-pulse 1.1s ease-in-out infinite}",
      ".sr-scan-card>*{max-width:42px!important;max-height:42px!important;object-fit:contain}",
      ".sr-scan-star{width:34px;height:34px;fill:var(--sr-accent);filter:drop-shadow(0 0 9px color-mix(in srgb,var(--sr-accent) 70%,transparent))}",
      "@keyframes sr-pulse{0%,100%{transform:scale(.94);box-shadow:0 12px 42px #0005,inset 0 1px #ffffff38}50%{transform:scale(1.04);box-shadow:0 12px 48px #0008,0 0 25px #ffffff1c,inset 0 1px #ffffff55}}",
      "#sr-agents{z-index:2147483002;pointer-events:none}",
      ".sr-agent{position:absolute;left:0;top:0;will-change:transform;color:var(--sr-color);transform-origin:0 0}",
      ".sr-cursor,.sr-ibeam{display:block;width:16px;height:21px;overflow:visible;filter:drop-shadow(0 1px 2px #0009)}",
      ".sr-cursor path{fill:var(--sr-color);stroke:#fff;stroke-width:1.5;stroke-linejoin:round}",
      ".sr-ibeam{display:none;position:absolute;left:0;top:0}",
      ".sr-ibeam path{fill:none;stroke:var(--sr-color);stroke-width:1.8;stroke-linecap:round}",
      ".sr-agent.sr-typing .sr-cursor{display:none}",
      ".sr-agent.sr-typing .sr-ibeam{display:block}",
      ".sr-name{display:none;position:absolute;left:15px;top:14px;padding:3px 7px;border-radius:999px;background:var(--sr-color);color:#17131a;font:600 10.5px/1.2 Arial,sans-serif;white-space:nowrap;box-shadow:0 2px 6px #0007}",
      ".sr-agent.sr-working .sr-name{display:block}",
      ".sr-frame{position:absolute;left:0;top:0;border:1px solid var(--sr-accent);background:transparent;opacity:0;will-change:transform,opacity}",
      ".sr-frame.sr-text-frame{border-color:color-mix(in srgb,var(--sr-accent) 75%,transparent)}",
      ".sr-handle{position:absolute;width:7px;height:7px;border:1px solid var(--sr-accent);background:#fff;box-sizing:border-box}",
      ".sr-handle:nth-child(1){left:-4px;top:-4px}.sr-handle:nth-child(2){right:-4px;top:-4px}",
      ".sr-handle:nth-child(3){left:-4px;bottom:-4px}.sr-handle:nth-child(4){right:-4px;bottom:-4px}",
      ".sr-size{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);padding:3px 6px;border-radius:4px;background:var(--sr-accent);color:#fff;font:10px/1.1 Consolas,monospace;white-space:nowrap}",
      ".sr-reveal{transition:background-color .45s,border-color .45s,box-shadow .6s,opacity .45s}",
      ".sr-wiggle{animation:sr-wiggle var(--sr-wiggle-duration,.32s) ease-in-out}",
      "@keyframes sr-wiggle{0%,100%{translate:0 0}25%{translate:-2px -1px}75%{translate:2px 1px}}",
      "#sr-hud{position:fixed;z-index:2147483003;inset:auto 0 calc(18px + env(safe-area-inset-bottom)) 0;width:max-content;height:auto;max-width:calc(100vw - 20px);margin:0 auto;overflow:visible;pointer-events:none}",
      ".sr-toolbar{display:flex;align-items:center;gap:11px;padding:8px 10px;border:1px solid #ffffff20;border-radius:999px;background:rgba(22,23,27,.9);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#f5f6f7;box-shadow:0 6px 24px #0007;font:12px/1.2 Arial,sans-serif;pointer-events:auto}",
      ".sr-avatars{display:flex;align-items:center;padding-left:4px}",
      ".sr-avatar{display:grid;place-items:center;width:22px;height:22px;margin-left:-4px;border:1px solid #17181c;border-radius:50%;background:var(--sr-color);color:#17131a;font:700 9px/1 Arial,sans-serif}",
      ".sr-status{white-space:nowrap;font-variant-numeric:tabular-nums}",
      ".sr-progress{width:64px;height:4px;overflow:hidden;border-radius:9px;background:#ffffff28}",
      ".sr-progress-fill{height:100%;width:0;border-radius:inherit;background:var(--sr-accent);transition:width .12s linear}",
      ".sr-button{padding:5px 8px;border:0;border-radius:999px;background:#ffffff13;color:inherit;white-space:nowrap;font:inherit;cursor:pointer}",
      ".sr-button:hover{background:#ffffff27}",
      ".sr-close{width:24px;height:24px;padding:0;border:0;border-radius:50%;background:#ffffff13;color:inherit;cursor:pointer;font:20px/1 Arial,sans-serif}",
      "@media(max-width:559px){.sr-avatars,.sr-progress,.sr-agent-count{display:none!important}.sr-toolbar{gap:7px;padding:7px 8px}.sr-status{font-size:11px}}",
      ".sr-hide-paint[data-sr-paint-hidden]{background-color:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important;outline-color:transparent!important}",
      ".sr-hide-media[data-sr-media-hidden]{opacity:0!important}",
      ".sr-w{display:inline;white-space:inherit}",
      ".sr-typed,.sr-rest{white-space:inherit;overflow-wrap:inherit;word-break:inherit}",
      ".sr-rest{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}",
      ".sr-typed{position:relative;color:inherit;-webkit-text-fill-color:currentColor}",
      ".sr-caret{position:absolute;width:2px;height:1em;background:var(--sr-color);pointer-events:none;will-change:transform}",
      ".sr-tn{display:inline}"
    ].join("");
  }

  function addStyle() {
    if (styleElement) return;
    styleElement = document.createElement("style");
    styleElement.textContent = cssText();
    styleElement.setAttribute("data-sr-owned", "");
    (document.head || document.documentElement).appendChild(styleElement);
  }

  function makeSvg(viewBox, pathData, className) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", className);
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    return svg;
  }

  function makeAgent(index) {
    var element = document.createElement("div");
    element.className = "sr-agent";
    element.setAttribute("data-sr-owned", "");
    element.style.setProperty("--sr-color", colors[index % colors.length]);
    var cursor = makeSvg("0 0 16 21",
      "M0 0V16.5L4.6 12.4L7.6 19L10.4 17.8L7.5 11.3H13.4Z", "sr-cursor");
    var beam = makeSvg("0 0 12 21", "M2 2H10M6 2V19M2 19H10", "sr-ibeam");
    var label = document.createElement("span");
    label.className = "sr-name";
    label.textContent = names[index % names.length];
    element.appendChild(cursor);
    element.appendChild(beam);
    element.appendChild(label);
    return {
      element: element,
      x: -40,
      y: -40,
      tx: -40,
      ty: -40,
      lastX: -40,
      lastY: -40,
      angle: 0,
      job: null,
      index: index
    };
  }

  function makeScanCard() {
    var card = document.createElement("div");
    card.className = "sr-scan-card";
    card.setAttribute("data-sr-owned", "");
    return card;
  }

  function populateScanCard(current) {
    var card = current.scanCard;
    while (card.firstChild) card.removeChild(card.firstChild);
    var logo = document.querySelector("[data-sr-logo]");
    if (logo) {
      var clone = logo.cloneNode(true);
      if (clone.removeAttribute) clone.removeAttribute("id");
      if (clone.querySelectorAll) {
        Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (node) {
          node.removeAttribute("id");
        });
      }
      card.appendChild(clone);
    } else {
      card.appendChild(makeSvg("0 0 40 40", "M20 1L25 15L39 20L25 25L20 39L15 25L1 20L15 15Z", "sr-scan-star"));
    }
  }

  function createOverlays(current) {
    addStyle();
    var root = document.createElement("div");
    root.id = "sr-root";
    root.setAttribute("data-sr-owned", "");
    root.style.setProperty("--sr-accent", config.accent);
    root.style.setProperty("--sr-bg", config.bg);
    var canvas = document.createElement("canvas");
    canvas.id = "sr-canvas";
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);

    var agentsLayer = document.createElement("div");
    agentsLayer.id = "sr-agents";
    agentsLayer.setAttribute("data-sr-owned", "");
    var scan = document.createElement("div");
    scan.id = "sr-scan";
    scan.style.setProperty("--sr-accent", config.accent);
    scan.style.setProperty("--sr-bg", config.bg);
    current.scanCard = makeScanCard();
    current.scanCard.style.animationDuration = (1100 / config.speed) + "ms";
    scan.appendChild(current.scanCard);
    var hud = document.createElement("div");
    hud.id = "sr-hud";
    hud.setAttribute("data-sr-owned", "");
    var toolbar = document.createElement("div");
    toolbar.className = "sr-toolbar";
    var avatars = document.createElement("div");
    avatars.className = "sr-avatars";
    for (var avatarIndex = 0; avatarIndex < Math.min(5, config.agents); avatarIndex++) {
      var avatar = document.createElement("span");
      avatar.className = "sr-avatar";
      avatar.style.setProperty("--sr-color", colors[avatarIndex % colors.length]);
      avatar.textContent = names[avatarIndex].charAt(0);
      avatars.appendChild(avatar);
    }
    var status = document.createElement("span");
    status.className = "sr-status";
    status.textContent = "Scanning page\u2026 0 layers";
    var agentCount = document.createElement("span");
    agentCount.className = "sr-agent-count";
    var progress = document.createElement("div");
    progress.className = "sr-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Rebuild progress");
    var progressFill = document.createElement("div");
    progressFill.className = "sr-progress-fill";
    progress.appendChild(progressFill);
    var tourButton = document.createElement("button");
    tourButton.type = "button";
    tourButton.className = "sr-button";
    tourButton.textContent = "Tour";
    tourButton.addEventListener("click", function () {
      if (current.touring) stopTour(current);
      else startTour(current);
    });
    var speedButton = document.createElement("button");
    speedButton.type = "button";
    speedButton.className = "sr-button";
    speedButton.textContent = config.speed + "\u00d7";
    speedButton.addEventListener("click", function () {
      var nextSpeed = config.speed === 1 ? 2 : config.speed === 2 ? 4 : 1;
      setSpeed(nextSpeed);
    });
    var close = document.createElement("button");
    close.type = "button";
    close.className = "sr-close";
    close.setAttribute("aria-label", "Finish rebuild");
    close.textContent = "\u00d7";
    close.addEventListener("click", function () {
      if (current.phase === "done") dismissSwarm(current);
      else finish();
    });
    toolbar.appendChild(avatars);
    toolbar.appendChild(status);
    toolbar.appendChild(agentCount);
    toolbar.appendChild(progress);
    toolbar.appendChild(tourButton);
    toolbar.appendChild(speedButton);
    toolbar.appendChild(close);
    hud.appendChild(toolbar);

    for (var i = 0; i < config.agents; i++) {
      current.agents.push(makeAgent(i));
      agentsLayer.appendChild(current.agents[i].element);
    }
    var parent = document.documentElement;
    parent.appendChild(root);
    parent.appendChild(scan);
    parent.appendChild(agentsLayer);
    parent.appendChild(hud);
    current.root = root;
    current.canvas = canvas;
    resizeCanvas(canvas);
    current.scan = scan;
    current.agentsLayer = agentsLayer;
    current.hud = hud;
    current.statusElement = status;
    current.agentCountElement = agentCount;
    current.progressElement = progress;
    current.progressFill = progressFill;
    current.tourButton = tourButton;
    current.speedButton = speedButton;
    current.avatarLayer = avatars;
  }

  function addClass(element, name) {
    if (element.classList.contains(name)) return false;
    element.classList.add(name);
    return true;
  }

  function visibleColor(value) {
    if (!value || value === "transparent") return false;
    var match = value.match(/^(rgba?|hsla?)\((.*)\)$/i);
    if (!match) return true;
    var body = match[2];
    var alpha = body.indexOf("/") >= 0
      ? body.slice(body.lastIndexOf("/") + 1).trim()
      : (body.indexOf(",") >= 0 ? body.split(",").pop().trim() : "");
    if (!alpha || match[1].toLowerCase().indexOf("a") < 0 &&
        body.indexOf("/") < 0 && body.split(",").length < 4) return true;
    var amount = parseFloat(alpha);
    return !Number.isFinite(amount) || amount > 0;
  }

  function hasPaintedBox(style) {
    if (visibleColor(style.backgroundColor) ||
        style.backgroundImage && style.backgroundImage !== "none" ||
        style.boxShadow && style.boxShadow !== "none") return true;
    var sides = ["Top", "Right", "Bottom", "Left"];
    for (var i = 0; i < sides.length; i++) {
      var side = sides[i];
      if (parseFloat(style["border" + side + "Width"]) > 0 &&
          style["border" + side + "Style"] !== "none" &&
          visibleColor(style["border" + side + "Color"])) return true;
    }
    return false;
  }

  function makeTextDisplay(container, text) {
    var wrapper = document.createElement("span");
    wrapper.className = "sr-w";
    wrapper.setAttribute("data-sr-owned", "");
    var typed = document.createElement("span");
    typed.className = "sr-typed";
    typed.setAttribute("data-sr-owned", "");
    var rest = document.createElement("span");
    rest.className = "sr-rest";
    rest.setAttribute("data-sr-owned", "");
    [wrapper, typed, rest].forEach(function (element) {
      element.style.setProperty("all", "unset", "important");
      element.style.setProperty("display", "inline", "important");
    });
    rest.style.setProperty("color", "transparent", "important");
    rest.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    rest.style.setProperty("text-shadow", "none", "important");
    rest.style.setProperty("text-decoration-color", "transparent", "important");
    typed.style.setProperty("-webkit-text-fill-color", "currentColor", "important");
    rest.textContent = text;
    wrapper.appendChild(typed);
    wrapper.appendChild(rest);
    container.appendChild(wrapper);
    return { wrapper: wrapper, typed: typed, rest: rest, text: text };
  }

  function makeLayer(element, kind, current) {
    var layer = {
      element: element,
      kind: kind,
      status: "pending",
      parent: null,
      sequence: current.layers.length,
      originalNodes: null,
      originalTextNode: null,
      originalText: null,
      hidesPaint: false,
      hidesMedia: false,
      ownsReveal: false,
      text: null,
      typed: null,
      rest: null,
      textCounted: false,
      frame: null,
      animation: null,
      rect: null
    };
    current.layers.push(layer);
    current.layerByElement.set(element, layer);
    current.stats.layers++;
    if (kind === "box" || kind === "media") current.stats.frames++;
    return layer;
  }

  function addTextToLayer(layer, text, count, current) {
    if (!text || !text.trim()) return;
    var display = makeTextDisplay(layer.textContainer, text);
    layer.text = text;
    layer.originalText = text;
    layer.glyphs = Array.from(text);
    layer.typed = display.typed;
    layer.rest = display.rest;
    if (count && !layer.textCounted) {
      current.stats.texts++;
      layer.textCounted = true;
    }
  }

  function prepareLeafText(element, layer, current) {
    var text = element.textContent;
    if (!text || !text.trim()) return false;
    var fragment = document.createDocumentFragment();
    while (element.firstChild) fragment.appendChild(element.firstChild);
    layer.originalNodes = fragment;
    layer.textContainer = element;
    addTextToLayer(layer, text, true, current);
    return true;
  }

  function prepareTextNode(node, parentElement, current) {
    var value = node.nodeValue;
    if (!value || !value.trim()) return;
    var wrapper = document.createElement("span");
    wrapper.className = "sr-tn";
    wrapper.setAttribute("data-sr-owned", "");
    node.parentNode.replaceChild(wrapper, node);
    var layer = makeLayer(wrapper, "text", current);
    layer.originalTextNode = node;
    layer.textContainer = wrapper;
    addTextToLayer(layer, value, true, current);
  }

  function skipElement(element) {
    if (!element || element.nodeType !== 1) return true;
    if (element.hasAttribute("data-sr-owned") ||
        element.hasAttribute("data-sr-skip") ||
        element.hasAttribute("data-sr-stat") ||
        skippedTags[element.tagName]) return true;
    return false;
  }

  function collectElement(element, current) {
    if (skipElement(element) || element.closest("[data-sr-skip]")) return;
    var style = window.getComputedStyle(element);
    if (style.display === "none") return;
    var existing = current.layerByElement.get(element);
    var children = Array.prototype.slice.call(element.children);
    var isMedia = !!mediaTags[element.tagName];
    if (isMedia) {
      if (!existing) {
        var mediaLayer = makeLayer(element, "media", current);
        mediaLayer.hidesMedia = addClass(element, "sr-hide-media");
        if (mediaLayer.hidesMedia) element.setAttribute("data-sr-media-hidden", "");
      }
      return;
    }

    var box = hasPaintedBox(style);
    var text = element.textContent;
    var hasText = !!(text && text.trim());
    var layer = existing;
    if (!layer && (box || !children.length && hasText)) {
      layer = makeLayer(element, box ? "box" : "text", current);
      if (box) {
        layer.hidesPaint = addClass(element, "sr-hide-paint");
        if (layer.hidesPaint) element.setAttribute("data-sr-paint-hidden", "");
      }
      if (!children.length && hasText) {
        prepareLeafText(element, layer, current);
      }
    }

    if (!children.length) return;
    var childNodes = Array.prototype.slice.call(element.childNodes);
    childNodes.forEach(function (node) {
      if (node.nodeType === 3) prepareTextNode(node, element, current);
      else if (node.nodeType === 1) collectElement(node, current);
    });
  }

  function collect(current, roots) {
    roots.forEach(function (root) {
      if (root.nodeType === 1) {
        collectElement(root, current);
      }
    });

    current.layers.forEach(function (layer) {
      var parent = layer.element.parentElement;
      while (parent) {
        var ancestor = current.layerByElement.get(parent);
        if (ancestor) {
          layer.parent = ancestor;
          break;
        }
        parent = parent.parentElement;
      }
    });
  }

  function statText(value) {
    return Number(value).toLocaleString();
  }

  function updateStats(current) {
    var values = {
      layers: current.stats.layers,
      texts: current.stats.texts,
      frames: current.stats.frames,
      agents: current.agents.length
    };
    document.querySelectorAll("[data-sr-stat]").forEach(function (element) {
      var key = element.getAttribute("data-sr-stat");
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        element.textContent = statText(values[key]);
      }
    });
  }

  function resetStats() {
    document.querySelectorAll("[data-sr-stat]").forEach(function (element) {
      element.textContent = "\u2014";
    });
  }

  function waitForLoadAndFonts() {
    return new Promise(function (resolve) {
      var done = false;
      var timer = window.setTimeout(complete, 1200);
      var loadReady = document.readyState === "complete"
        ? Promise.resolve()
        : new Promise(function (loadResolve) {
          window.addEventListener("load", loadResolve, { once: true });
        });
      var fontsReady = document.fonts && document.fonts.ready
        ? Promise.resolve(document.fonts.ready).catch(noOp)
        : Promise.resolve();
      Promise.all([loadReady, fontsReady]).then(complete);
      function complete() {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve();
      }
    });
  }

  function setLock(current, locked) {
    if (locked) {
      current.oldScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      current.addedLock = !document.documentElement.classList.contains("sr-lock");
      if (current.addedLock) document.documentElement.classList.add("sr-lock");
      current.addedGutter = window.innerWidth > document.documentElement.clientWidth &&
        !document.documentElement.classList.contains("sr-gutter");
      if (current.addedGutter) document.documentElement.classList.add("sr-gutter");
      current.locked = true;
    } else if (current.locked) {
      if (current.addedLock) document.documentElement.classList.remove("sr-lock");
      if (current.addedGutter) document.documentElement.classList.remove("sr-gutter");
      if (current.oldScrollRestoration) {
        window.history.scrollRestoration = current.oldScrollRestoration;
      }
      current.locked = false;
    }
  }

  function scan(current, now) {
    var elapsed = (now - current.scanStarted) * config.speed;
    var duration = 1900;
    var progress = Math.min(1, elapsed / duration);
    var width = window.innerWidth;
    var height = window.innerHeight;
    var rx = Math.min(width * 0.32, 230);
    var ry = Math.min(height * 0.28, 170);
    var cx = width / 2;
    var cy = height / 2;
    var dt = Math.min(0.05, Math.max(0.001,
      (now - current.lastScanTick) / 1000));
    current.lastScanTick = now;
    current.agents.forEach(function (agent, index) {
      var flock = index % 3;
      var flockDirection = flock === 1 ? -1 : 1;
      var phase = Math.floor(index / 3) * 0.43 + flock * (Math.PI * 2 / 3);
      var theta = elapsed * 0.0031 * flockDirection + phase;
      var wobbleX = Math.sin(elapsed * 0.009 + index * 1.7) * 10;
      var wobbleY = Math.cos(elapsed * 0.008 + index * 1.3) * 10;
      agent.tx = cx + Math.cos(theta) * rx + wobbleX;
      agent.ty = cy + Math.sin(theta) * ry + wobbleY;
      moveAgent(agent, dt, 9);
      var vx = agent.x - agent.lastX;
      var vy = agent.y - agent.lastY;
      if (Math.abs(vx) + Math.abs(vy) > 0.05) {
        agent.angle = Math.atan2(vy, vx) * 180 / Math.PI + 116.6;
      }
      agent.lastX = agent.x;
      agent.lastY = agent.y;
      writeAgent(agent);
    });
    updateHud(current, now);
    if (progress >= 1 && current.phase === "scan") {
      current.phase = "scan-fade";
      current.scanFadeStarted = now;
      current.scan.style.transition = "opacity " + (550 / config.speed) + "ms ease";
      current.scan.classList.add("sr-fading");
    }
  }

  function moveAgent(agent, dt, k) {
    var amount = 1 - Math.exp(-k * dt);
    agent.x += (agent.tx - agent.x) * amount;
    agent.y += (agent.ty - agent.y) * amount;
  }

  function writeAgent(agent) {
    agent.element.style.transform = "translate3d(" + agent.x + "px," +
      agent.y + "px,0) rotate(" + agent.angle + "deg)";
  }

  function rectOf(element) {
    var rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  }

  function frameFor(layer, rect, current) {
    var frame = document.createElement("div");
    frame.className = "sr-frame" + (layer.kind === "text" ? " sr-text-frame" : "");
    frame.setAttribute("data-sr-owned", "");
    if (layer.kind !== "text") {
      for (var i = 0; i < 4; i++) {
        var handle = document.createElement("span");
        handle.className = "sr-handle";
        frame.appendChild(handle);
      }
    }
    var label = document.createElement("span");
    label.className = "sr-size";
    label.textContent = Math.round(rect.width) + " \u00d7 " + Math.round(rect.height);
    frame.appendChild(label);
    current.root.appendChild(frame);
    frame.style.width = Math.max(0, rect.width) + "px";
    frame.style.height = Math.max(0, rect.height) + "px";
    frame.style.transform = "translate3d(" + rect.left + "px," + rect.top + "px,0)";
    return frame;
  }

  function revealElement(layer, now) {
    if (!layer.previousTransition) {
      layer.previousTransition = {
        value: layer.element.style.getPropertyValue("transition"),
        priority: layer.element.style.getPropertyPriority("transition")
      };
    }
    layer.element.style.setProperty("transition",
      "background-color " + (450 / config.speed) + "ms, border-color " +
      (450 / config.speed) + "ms, box-shadow " + (600 / config.speed) +
      "ms, opacity " + (450 / config.speed) + "ms");
    if (!layer.element.classList.contains("sr-reveal")) {
      layer.element.classList.add("sr-reveal");
      layer.ownsReveal = true;
    }
    if (layer.kind === "box" && layer.hidesPaint) {
      layer.element.classList.remove("sr-hide-paint");
      layer.element.removeAttribute("data-sr-paint-hidden");
      layer.hidesPaint = false;
    }
    if (layer.kind === "media" && layer.hidesMedia) {
      layer.element.classList.remove("sr-hide-media");
      layer.element.removeAttribute("data-sr-media-hidden");
      layer.hidesMedia = false;
    }
    layer.revealUntil = now + 800 / config.speed;
  }

  function restoreTransition(layer) {
    if (!layer.previousTransition) return;
    if (layer.previousTransition.value) {
      layer.element.style.setProperty("transition", layer.previousTransition.value,
        layer.previousTransition.priority);
    } else {
      layer.element.style.removeProperty("transition");
    }
    layer.previousTransition = null;
  }

  function startWiggle(agent) {
    agent.wiggleStyle = {
      value: agent.element.style.getPropertyValue("--sr-wiggle-duration"),
      priority: agent.element.style.getPropertyPriority("--sr-wiggle-duration")
    };
    agent.element.style.setProperty("--sr-wiggle-duration", (320 / config.speed) + "ms");
    agent.element.classList.add("sr-wiggle");
  }

  function restoreWiggle(agent) {
    if (!agent.wiggleStyle) return;
    if (agent.wiggleStyle.value) {
      agent.element.style.setProperty("--sr-wiggle-duration", agent.wiggleStyle.value,
        agent.wiggleStyle.priority);
    } else {
      agent.element.style.removeProperty("--sr-wiggle-duration");
    }
    agent.wiggleStyle = null;
  }

  function startLayer(agent, layer, rect, now, current) {
    agent.job = {
      layer: layer,
      started: now,
      phase: "travel",
      tx: rect.left,
      ty: rect.top,
      frame: frameFor(layer, rect, current),
      typedCount: 0,
      progress: 0,
      lastRect: rect,
      phaseStarted: now,
      caret: null
    };
    layer.rect = rect;
    layer.status = "started";
    layer.startedAt = now;
    agent.element.classList.add("sr-working");
  }

  function collectRects(current) {
    var limit = window.innerHeight * config.line;
    var now = performance.now();
    var measurePending = current.measurePending || now - current.lastMeasure >= 350;
    current.layers.forEach(function (layer) {
      if (layer.status === "built" ||
          layer.status === "pending" && !measurePending) return;
      layer.readRect = rectOf(layer.element);
    });
    current.agents.forEach(function (agent) {
      if (!agent.job || !agent.job.layer.typed) return;
      var layer = agent.job.layer;
      var typedRects = layer.typed.getClientRects();
      var restRects = layer.rest ? layer.rest.getClientRects() : [];
      agent.job.caretRect = typedRects.length
        ? typedRects[typedRects.length - 1]
        : restRects.length ? restRects[0] : layer.readRect;
    });
    current.layers.forEach(function (layer) {
      if (!layer.readRect || layer.status === "built") return;
      var rect = layer.readRect;
      if (rect.bottom < -60 || rect.top <= limit &&
          (rect.width <= 0 || rect.height <= 0 ||
           rect.right <= 0 || rect.left >= window.innerWidth)) {
        finishLayerInstant(layer, current);
        return;
      }
      if (layer.status === "pending") layer.triggered = rect.top <= limit;
    });
    current.measurePending = false;
    if (measurePending) current.lastMeasure = now;
  }

  function pump(current, now) {
    current.agents.forEach(function (agent) {
      if (agent.job) return;
      var candidates = current.layers.filter(function (layer) {
        return layer.status === "pending" && layer.triggered &&
          (!layer.parent || layer.parent.status !== "pending");
      }).map(function (layer) {
        var rect = layer.readRect;
        var distance = Math.sqrt(Math.pow(agent.x - rect.left, 2) +
          Math.pow(agent.y - rect.top, 2));
        return { layer: layer, rect: rect, score: rect.top + 0.3 * distance };
      }).sort(function (a, b) { return a.score - b.score; });
      if (candidates.length) {
        startLayer(agent, candidates[0].layer, candidates[0].rect, now, current);
      }
    });
  }

  function isDone(layer) {
    return layer.status === "built";
  }

  function restoreText(layer) {
    if (layer.originalNodes) {
      while (layer.element.firstChild) layer.element.removeChild(layer.element.firstChild);
      layer.element.appendChild(layer.originalNodes);
      layer.originalNodes = null;
    } else if (layer.originalTextNode && layer.element.parentNode) {
      layer.originalTextNode.nodeValue = layer.originalText;
      layer.element.parentNode.replaceChild(layer.originalTextNode, layer.element);
      layer.originalTextNode = null;
    }
  }

  function finishLayerInstant(layer, current) {
    if (layer.status === "built") return;
    if (current) {
      var agent = current.agents.find(function (item) {
        return item.job && item.job.layer === layer;
      });
      if (agent) {
        if (agent.job.frame) agent.job.frame.remove();
        agent.job = null;
        agent.element.classList.remove("sr-working", "sr-typing", "sr-wiggle");
        restoreWiggle(agent);
      }
    }
    layer.status = "built";
    if (layer.hidesPaint) {
      layer.element.classList.remove("sr-hide-paint");
      layer.element.removeAttribute("data-sr-paint-hidden");
      layer.hidesPaint = false;
    }
    if (layer.hidesMedia) {
      layer.element.classList.remove("sr-hide-media");
      layer.element.removeAttribute("data-sr-media-hidden");
      layer.hidesMedia = false;
    }
    if (layer.ownsReveal) {
      layer.element.classList.remove("sr-reveal");
      layer.ownsReveal = false;
    }
    restoreTransition(layer);
    restoreText(layer);
  }

  function completeJob(agent, current) {
    var job = agent.job;
    var layer = job.layer;
    if (job.frame) job.frame.remove();
    layer.status = "built";
    if (layer.ownsReveal) {
      layer.element.classList.remove("sr-reveal");
      layer.ownsReveal = false;
    }
    restoreTransition(layer);
    layer.revealUntil = 0;
    restoreText(layer);
    agent.job = null;
    agent.element.classList.remove("sr-working", "sr-typing", "sr-wiggle");
    restoreWiggle(agent);
    current.pumpPending = true;
    current.lastWorkTime = performance.now();
    if (current.layers.every(isDone)) {
      showDone(current);
    }
  }

  function updateJob(agent, now, dt, current) {
    var job = agent.job;
    var layer = job.layer;
    var rect = layer.readRect || job.lastRect;
    job.lastRect = rect;
    job.tx = rect.left;
    job.ty = rect.top;
    if (job.frame) {
      job.frame.style.transform = "translate3d(" + rect.left + "px," + rect.top + "px,0)";
      if (job.phase !== "draw") {
        job.frame.style.width = rect.width + "px";
        job.frame.style.height = rect.height + "px";
      }
    }
    if (job.phase === "travel") {
      agent.tx = job.tx;
      agent.ty = job.ty;
      var distance = Math.hypot(agent.x - agent.tx, agent.y - agent.ty);
      if (distance <= 1 || now - job.phaseStarted >= 1200 / config.speed) {
        job.phase = layer.kind === "box" || layer.kind === "media" ? "draw" :
          layer.text ? "type" : "hold";
        job.phaseStarted = now;
        if (job.frame) job.frame.style.opacity = "1";
        if (job.frame) {
          var isDrawing = job.phase === "draw";
          job.frame.style.width = (isDrawing ? 0 : rect.width) + "px";
          job.frame.style.height = (isDrawing ? 0 : rect.height) + "px";
          var sizeLabel = job.frame.querySelector(".sr-size");
          if (isDrawing && sizeLabel) sizeLabel.textContent = "0 \u00d7 0";
        }
        if (job.phase === "type") agent.element.classList.add("sr-typing");
        if (job.phase === "type" && job.frame && !job.caret) {
          job.caret = document.createElement("span");
          job.caret.className = "sr-caret";
          job.caret.style.setProperty("--sr-color",
            agent.element.style.getPropertyValue("--sr-color"));
          job.frame.appendChild(job.caret);
        }
      }
    } else if (job.phase === "draw") {
      var drawDuration = (220 + Math.min(340, Math.sqrt(rect.width * rect.height) / 1.6)) /
        config.speed;
      var drawProgress = Math.min(1, (now - job.phaseStarted) / drawDuration);
      var drawEase = 1 - Math.pow(1 - drawProgress, 3);
      var width = rect.width * drawEase;
      var height = rect.height * drawEase;
      if (job.frame) {
        job.frame.style.width = width + "px";
        job.frame.style.height = height + "px";
        job.frame.style.transform = "translate3d(" + rect.left + "px," + rect.top + "px,0)";
        var label = job.frame.querySelector(".sr-size");
        if (label) label.textContent = Math.round(width) + " \u00d7 " + Math.round(height);
      }
      agent.tx = rect.left + width;
      agent.ty = rect.top + height;
      if (drawProgress >= 1) {
        job.phase = "fill";
        job.phaseStarted = now;
        revealElement(layer, now);
        startWiggle(agent);
        job.wiggleUntil = now + 320 / config.speed;
        job.phase = layer.text ? "fill-text" : "fill-only";
      }
    } else if (job.phase === "fill-only" || job.phase === "fill-text") {
      if (job.frame) {
        job.frame.style.width = rect.width + "px";
        job.frame.style.height = rect.height + "px";
        job.frame.style.transform = "translate3d(" + rect.left + "px," + rect.top + "px,0)";
      }
      agent.tx = rect.left + rect.width;
      agent.ty = rect.top + rect.height;
      if (layer.text && now >= job.wiggleUntil) {
        job.phase = "type";
        job.phaseStarted = now;
        agent.element.classList.add("sr-typing");
      } else if (!layer.text && now - job.phaseStarted >= 320 / config.speed) {
        job.phase = "hold";
        job.phaseStarted = now;
      }
    } else if (job.phase === "type") {
      if (!job.caret && job.frame) {
        job.caret = document.createElement("span");
        job.caret.className = "sr-caret";
        job.caret.style.setProperty("--sr-color",
          agent.element.style.getPropertyValue("--sr-color"));
        job.frame.appendChild(job.caret);
      }
      var typeDuration = Math.min(1300, Math.max(250, layer.glyphs.length * 18)) /
        config.speed;
      var typeProgress = Math.min(1, (now - job.phaseStarted) / typeDuration);
      var typed = Math.min(layer.glyphs.length,
        Math.floor(layer.glyphs.length * typeProgress));
      var textRect = job.caretRect || rect;
      var caretX = textRect.right;
      var caretY = textRect.top;
      if (typed !== job.typedCount) {
        layer.typed.textContent = layer.glyphs.slice(0, typed).join("");
        layer.rest.textContent = layer.glyphs.slice(typed).join("");
        job.typedCount = typed;
      }
      agent.tx = caretX;
      agent.ty = caretY;
      if (job.caret) job.caret.style.transform = "translate3d(" +
        (caretX - rect.left) + "px," + (caretY - rect.top) + "px,0)";
      if (typeProgress >= 1) {
        job.phase = "hold";
        job.phaseStarted = now;
      }
    } else if (job.phase === "hold") {
      if (now - job.phaseStarted >= 160 / config.speed) {
        job.phase = "fade";
        job.phaseStarted = now;
      }
    } else if (job.phase === "fade") {
      var fade = Math.max(0, 1 - (now - job.phaseStarted) / (250 / config.speed));
      if (job.frame) job.frame.style.opacity = String(fade);
      if (fade <= 0) completeJob(agent, current);
    }
    if (layer.revealUntil && now >= layer.revealUntil) {
      if (layer.ownsReveal) {
        layer.element.classList.remove("sr-reveal");
        layer.ownsReveal = false;
      }
      restoreTransition(layer);
      layer.revealUntil = 0;
    }
  }

  function updateHud(current, now) {
    var total = current.layers.length;
    var built = current.layers.filter(isDone).length;
    if (current.phase === "scan" || current.phase === "scan-fade") {
      var progress = current.phase === "scan-fade" ? 1 :
        Math.min(1, (now - current.scanStarted) * config.speed / 1900);
      current.statusElement.textContent = "Scanning page\u2026 " +
        statText(Math.floor(total * progress)) + " layers";
      return;
    }
    if (current.phase === "done") {
      current.statusElement.textContent = "Rebuilt " + statText(total) +
        " layers in " + ((current.doneAt - current.scanStarted) / 1000).toFixed(1) + "s";
      current.tourButton.textContent = "Replay";
      current.progressElement.style.display = "none";
      current.agentCountElement.style.display = "none";
      return;
    }
    current.agentCountElement.textContent = config.agents + " agents";
    current.statusElement.textContent = statText(built) + " / " + statText(total) + " layers";
    current.progressFill.style.width = (total ? built / total * 100 : 100) + "%";
    current.progressElement.setAttribute("aria-valuenow", String(built));
    current.progressElement.setAttribute("aria-valuemax", String(total));
    current.tourButton.textContent = current.touring ? "Pause" : "Tour";
  }

  function startTour(current) {
    if (current.phase === "done") {
      replay();
      return;
    }
    if (current.phase !== "build") return;
    current.touring = true;
    current.tourButton.textContent = "Pause";
  }

  function stopTour(current) {
    current.touring = false;
    if (current.tourButton && current.phase !== "done") {
      current.tourButton.textContent = "Tour";
    }
  }

  function setSpeed(value) {
    if ([1, 2, 4].indexOf(Number(value)) < 0) return;
    config.speed = Number(value);
    if (state && state.speedButton) {
      state.speedButton.textContent = config.speed + "\u00d7";
      if (state.scanCard) state.scanCard.style.animationDuration =
        (1100 / config.speed) + "ms";
    }
  }

  function updateTour(current, dt) {
    if (!current.touring) return;
    if (current.scrollY + window.innerHeight >= current.pageHeight - 1) {
      stopTour(current);
      return;
    }
    var pending = current.layers.filter(function (layer) {
      return layer.status === "pending" && layer.triggered;
    }).length;
    if (pending >= current.agents.length * 0.6) return;
    window.scrollTo({
      top: current.scrollY + 240 * config.speed * dt,
      left: current.scrollX,
      behavior: "instant"
    });
    current.measurePending = true;
    current.pumpPending = true;
  }

  function drawGuides(current, dt, now) {
    var context = current.canvas.getContext("2d");
    if (!context) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var width = window.innerWidth;
    var height = window.innerHeight;
    var working = current.agents.some(function (agent) { return !!agent.job; });
    if (working) {
      current.guideAlpha += (1 - current.guideAlpha) *
        (1 - Math.exp(-dt / (0.18 / config.speed)));
    } else if (current.lastWorkTime) {
      current.guideAlpha = Math.max(0, 1 -
        (now - current.lastWorkTime) / (1200 / config.speed));
    } else {
      current.guideAlpha = 0;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (current.guideAlpha < 0.01) return;
    context.globalAlpha = current.guideAlpha;
    context.font = "9px Consolas,monospace";
    context.lineWidth = 1;
    var lineY = height * config.line;
    context.strokeStyle = "#FF453A";
    context.beginPath();
    context.moveTo(0, lineY + 0.5);
    context.lineTo(width, lineY + 0.5);
    context.stroke();
    context.fillStyle = "#FF453A";
    context.fillText("BUILD LINE", Math.max(4, width - 72), lineY - 5);

    var ruler = width >= 700 ? 20 : 0;
    if (ruler) {
      context.fillStyle = "rgba(17,18,22,.96)";
      context.fillRect(0, 0, width, ruler);
      context.fillRect(0, 0, ruler, height);
      var scrollX = current.scrollX || 0;
      var scrollY = current.scrollY || 0;
      var firstX = Math.floor(scrollX / 10) * 10;
      for (var x = firstX; x <= scrollX + width; x += 10) {
        var sx = x - scrollX;
        var modX = x % 100 === 0 ? 100 : x % 50 === 0 ? 50 : 10;
        var tickX = modX === 100 ? 20 : modX === 50 ? 7 : 4;
        context.strokeStyle = "#ffffff82";
        context.beginPath();
        context.moveTo(sx + 0.5, 0);
        context.lineTo(sx + 0.5, tickX);
        context.stroke();
        if (modX === 100) {
          context.fillStyle = "#d8d9dc";
          context.fillText(String(x), sx + 2, 17);
        }
      }
      var firstY = Math.floor(scrollY / 10) * 10;
      for (var y = firstY; y <= scrollY + height; y += 10) {
        var sy = y - scrollY;
        var modY = y % 100 === 0 ? 100 : y % 50 === 0 ? 50 : 10;
        var tickY = modY === 100 ? 20 : modY === 50 ? 7 : 4;
        context.strokeStyle = "#ffffff82";
        context.beginPath();
        context.moveTo(0, sy + 0.5);
        context.lineTo(tickY, sy + 0.5);
        context.stroke();
        if (modY === 100) {
          context.save();
          context.translate(16, sy + 1);
          context.rotate(-Math.PI / 2);
          context.fillStyle = "#d8d9dc";
          context.fillText(String(y), 2, 0);
          context.restore();
        }
      }
      context.fillStyle = config.accent;
      context.globalAlpha = current.guideAlpha * 0.3;
      current.agents.forEach(function (agent) {
        if (!agent.job || !agent.job.layer.readRect) return;
        var rect = agent.job.layer.readRect;
        context.fillRect(rect.left, 0, rect.width, ruler);
        context.fillRect(0, rect.top, ruler, rect.height);
      });
      context.globalAlpha = current.guideAlpha;
    }

    current.agents.forEach(function (agent) {
      if (!agent.job || !agent.job.layer.readRect) return;
      var rect = agent.job.layer.readRect;
      context.strokeStyle = config.accent;
      context.globalAlpha = current.guideAlpha * 0.55;
      context.setLineDash([2, 3]);
      context.beginPath();
      context.moveTo(rect.left, rect.top);
      context.lineTo(0, rect.top);
      context.moveTo(rect.left, rect.top);
      context.lineTo(rect.left, 0);
      context.stroke();
    });
    context.setLineDash([]);
    context.globalAlpha = 1;
  }

  function showDone(current) {
    if (current.phase === "done") return;
    current.phase = "done";
    current.doneAt = performance.now();
    if (current.observer) current.observer.disconnect();
    window.removeEventListener("wheel", current.onInterruptTour);
    window.removeEventListener("touchstart", current.onInterruptTour);
    if (current.root) current.root.remove();
    if (current.scan) current.scan.remove();
    setLock(current, false);
    updateHud(current, current.doneAt);
    scheduleTick();
  }

  function scheduleTick() {
    if (!frameId && state && !state.disposed) {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  function dismissSwarm(current) {
    if (current.phase !== "done" || current.dismissStarted || current.swarmHidden) return;
    current.dismissStarted = performance.now();
    var x = current.mouseX;
    var y = current.mouseY;
    var distances = [
      { side: "left", distance: x },
      { side: "right", distance: window.innerWidth - x },
      { side: "top", distance: y },
      { side: "bottom", distance: window.innerHeight - y }
    ];
    distances.sort(function (a, b) { return a.distance - b.distance; });
    current.dismissSide = distances[0].side;
    current.agents.forEach(function (agent) {
      agent.element.classList.remove("sr-working", "sr-typing", "sr-wiggle");
      restoreWiggle(agent);
    });
    scheduleTick();
  }

  function followMouse(agent, index, current, now, dt) {
    if (now - current.lastScroll < 500 ||
        current.agents.some(function (item) { return !!item.job; }) ||
        current.layers.some(function (layer) {
          return layer.status === "pending" && layer.triggered;
        })) return false;

    var dx;
    var dy;
    var moving = now - current.lastMouseMoveAt < 350;
    var k;
    if (moving) {
      var lag = 34 + (index % 5) * 11;
      var spread = (((index * 37) % 60) - 30) * 0.9;
      dx = -current.mouseDirY;
      dy = current.mouseDirX;
      agent.tx = current.mouseX - current.mouseDirX * lag + dx * spread;
      agent.ty = current.mouseY - current.mouseDirY * lag + dy * spread;
      k = 3.2 + (index % 4) * 0.9;
    } else {
      var angle = Math.PI * 2 * index / current.agents.length +
        (now - current.mouseRestStarted) / 1000 * 0.35;
      var radius = Math.max(46, current.agents.length * 4.4);
      agent.tx = current.mouseX + Math.cos(angle) * radius;
      agent.ty = current.mouseY + Math.sin(angle) * radius;
      k = 5;
    }

    var previousX = agent.x;
    var previousY = agent.y;
    moveAgent(agent, dt, k);
    var vx = agent.x - previousX;
    var vy = agent.y - previousY;
    if (moving && Math.abs(vx) + Math.abs(vy) > 0.01) {
      agent.angle = Math.atan2(vy, vx) * 180 / Math.PI + 116.6;
    } else {
      agent.angle = Math.atan2(current.mouseY - agent.y,
        current.mouseX - agent.x) * 180 / Math.PI + 116.6;
    }
    return true;
  }

  function tick(now) {
    if (!state || state.disposed) return;
    frameId = 0;
    var current = state;
    var dt = Math.min(0.05, Math.max(0, (now - current.lastTick) / 1000));
    current.lastTick = now;
    if (current.phase === "scan") {
      scan(current, now);
      scheduleTick();
      return;
    }
    if (current.phase === "scan-fade") {
      scan(current, now);
      if (now - current.scanFadeStarted >= 550 / config.speed) {
        current.scan.remove();
        setLock(current, false);
        current.phase = "build";
        current.measurePending = true;
        current.lastMeasure = 0;
        if (!current.layers.length) {
          showDone(current);
          return;
        }
      }
      scheduleTick();
      return;
    }
    if (current.phase === "done") {
      if (current.dismissStarted) {
        var dismissProgress = Math.min(1, (now - current.dismissStarted) / 1800);
        current.agents.forEach(function (agent, index) {
          var offset = (index - (current.agents.length - 1) / 2) * 18;
          if (current.dismissSide === "left" || current.dismissSide === "right") {
            agent.tx = current.dismissSide === "left" ? -40 - offset :
              window.innerWidth + 40 + offset;
            agent.ty = agent.y;
          } else {
            agent.tx = agent.x;
            agent.ty = current.dismissSide === "top" ? -40 - offset :
              window.innerHeight + 40 + offset;
          }
          moveAgent(agent, dt, 3.5);
          agent.angle += (0 - agent.angle) * (1 - Math.exp(-5 * dt));
          writeAgent(agent);
        });
        if (dismissProgress >= 1) {
          current.agentsLayer.style.visibility = "hidden";
          current.hud.style.visibility = "hidden";
          current.swarmHidden = true;
          return;
        }
      } else {
        var free = current.mouseOnPage &&
          now - current.lastScroll >= 500 &&
          !current.agents.some(function (agent) { return !!agent.job; }) &&
          !current.layers.some(function (layer) {
            return layer.status === "pending" && layer.triggered;
          });
        if (free) {
          current.agents.forEach(function (agent, index) {
            followMouse(agent, index, current, now, dt);
            writeAgent(agent);
          });
        } else {
          current.agents.forEach(function (agent) {
            if (!agent.wanderAt || now >= agent.wanderAt) {
              agent.tx = Math.random() * window.innerWidth;
              agent.ty = Math.random() * window.innerHeight * 0.88;
              agent.wanderAt = now + (1200 + Math.random() * 2000) / config.speed;
            }
            moveAgent(agent, dt, 1.4);
            agent.angle += (0 - agent.angle) * (1 - Math.exp(-9 * dt));
            writeAgent(agent);
          });
        }
      }
      scheduleTick();
      return;
    }
    if (current.phase !== "build") return;
    current.scrollX = window.scrollX || 0;
    current.scrollY = window.scrollY || 0;
    current.pageHeight = document.documentElement.scrollHeight;
    collectRects(current);
    current.pumpPending = false;
    pump(current, now);
    current.agents.forEach(function (agent) {
      if (agent.job) {
        updateJob(agent, now, dt, current);
      } else {
        var free = current.mouseOnPage &&
          now - current.lastScroll >= 500 &&
          !current.agents.some(function (item) { return !!item.job; }) &&
          !current.layers.some(function (layer) {
            return layer.status === "pending" && layer.triggered;
          });
        if (!free || !followMouse(agent, agent.index, current, now, dt)) {
          if (!agent.wanderAt || now >= agent.wanderAt) {
            agent.tx = Math.random() * window.innerWidth;
            agent.ty = Math.random() * window.innerHeight * 0.88;
            agent.wanderAt = now + (1200 + Math.random() * 2000) / config.speed;
          }
          moveAgent(agent, dt, 1.4);
          agent.angle += (0 - agent.angle) * (1 - Math.exp(-9 * dt));
        }
      }
      if (agent.job) {
        var previousX = agent.x;
        var previousY = agent.y;
        moveAgent(agent, dt, 6 + 3 * config.speed);
        var vx = agent.x - previousX;
        var vy = agent.y - previousY;
        if (Math.abs(vx) + Math.abs(vy) > 0.01) {
          agent.angle = Math.atan2(vy, vx) * 180 / Math.PI + 116.6;
        }
      }
      agent.lastX = agent.x;
      agent.lastY = agent.y;
      writeAgent(agent);
    });
    updateTour(current, dt);
    drawGuides(current, dt, now);
    updateHud(current, now);
    if (current.layers.every(isDone)) {
      showDone(current);
      return;
    }
    if (current.phase === "build") scheduleTick();
  }

  function restoreLayer(layer) {
    if (layer.element.classList && layer.hidesPaint) {
      layer.element.classList.remove("sr-hide-paint");
      layer.element.removeAttribute("data-sr-paint-hidden");
    }
    if (layer.element.classList && layer.hidesMedia) {
      layer.element.classList.remove("sr-hide-media");
      layer.element.removeAttribute("data-sr-media-hidden");
    }
    if (layer.animation) {
      layer.animation.cancel();
      layer.animation = null;
    }
    if (layer.ownsReveal) {
      layer.element.classList.remove("sr-reveal");
      layer.ownsReveal = false;
    }
    restoreTransition(layer);
    if (layer.originalNodes) {
      while (layer.element.firstChild) layer.element.removeChild(layer.element.firstChild);
      layer.element.appendChild(layer.originalNodes);
      layer.originalNodes = null;
    } else if (layer.originalTextNode && layer.element.parentNode) {
      layer.element.parentNode.replaceChild(layer.originalTextNode, layer.element);
      layer.originalTextNode = null;
    }
  }

  function cleanup(current) {
    if (!current || current.disposed) return;
    current.disposed = true;
    if (frameId) window.cancelAnimationFrame(frameId);
    if (current.observer) current.observer.disconnect();
    window.removeEventListener("scroll", current.onScroll);
    window.removeEventListener("resize", current.onResize);
    window.removeEventListener("pointermove", current.onMouse);
    document.documentElement.removeEventListener("mouseleave", current.onMouseLeave);
    window.removeEventListener("blur", current.onBlur);
    window.removeEventListener("wheel", current.onInterruptTour);
    window.removeEventListener("touchstart", current.onInterruptTour);
    document.removeEventListener("keydown", current.onKey);
    current.layers.forEach(restoreLayer);
    current.agents.forEach(function (agent) {
      if (agent.job && agent.job.frame) agent.job.frame.remove();
    });
    if (current.root) current.root.remove();
    if (current.scan) current.scan.remove();
    if (current.agentsLayer) current.agentsLayer.remove();
    if (current.hud) current.hud.remove();
    setLock(current, false);
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
    if (state === current) state = null;
  }

  function finish() {
    if (!state) return;
    if (state.phase === "done") return;
    state.layers.forEach(function (layer) { finishLayerInstant(layer, state); });
    state.agents.forEach(function (agent) {
      if (agent.job && agent.job.frame) agent.job.frame.remove();
      agent.job = null;
      agent.element.classList.remove("sr-working", "sr-typing", "sr-wiggle");
      restoreWiggle(agent);
    });
    showDone(state);
  }

  function attachEvents(current) {
    current.onScroll = function () {
      current.lastScroll = performance.now();
      current.pumpPending = true;
      current.measurePending = true;
    };
    current.onResize = function () {
      var requested = parseInt(script.dataset.agents, 10);
      if (!Number.isFinite(requested) || requested < 1) requested = 14;
      var desired = window.innerWidth < 640 ? Math.min(requested, 8) : requested;
      config.agents = desired;
      while (current.agents.length > desired) {
        var removed = current.agents.pop();
        if (removed.job) {
          if (removed.job.frame) removed.job.frame.remove();
          var interruptedLayer = removed.job.layer;
          removed.job = null;
          finishLayerInstant(interruptedLayer, current);
        }
        removed.element.remove();
      }
      while (current.agents.length < desired) {
        var added = makeAgent(current.agents.length);
        added.x = window.innerWidth / 2;
        added.y = window.innerHeight / 2;
        added.tx = added.x;
        added.ty = added.y;
        current.agents.push(added);
        current.agentsLayer.appendChild(added.element);
      }
      while (current.avatarLayer.firstChild) current.avatarLayer.removeChild(current.avatarLayer.firstChild);
      for (var avatarIndex = 0; avatarIndex < Math.min(5, desired); avatarIndex++) {
        var avatar = document.createElement("span");
        avatar.className = "sr-avatar";
        avatar.style.setProperty("--sr-color", colors[avatarIndex % colors.length]);
        avatar.textContent = names[avatarIndex].charAt(0);
        current.avatarLayer.appendChild(avatar);
      }
      updateStats(current);
      resizeCanvas(current.canvas);
      current.measurePending = true;
      current.pumpPending = true;
    };
    current.onMouse = function (event) {
      if (event.pointerType !== "mouse") return;
      var deltaX = event.clientX - current.mouseX;
      var deltaY = event.clientY - current.mouseY;
      var distance = Math.hypot(deltaX, deltaY);
      if (distance <= 2) return;
      var directionX = deltaX / distance;
      var directionY = deltaY / distance;
      var blend = Math.min(1, distance / 40);
      var mixedX = current.mouseDirX * (1 - blend) + directionX * blend;
      var mixedY = current.mouseDirY * (1 - blend) + directionY * blend;
      var mixedLength = Math.hypot(mixedX, mixedY);
      if (mixedLength > 0) {
        current.mouseDirX = mixedX / mixedLength;
        current.mouseDirY = mixedY / mixedLength;
      }
      current.mouseX = event.clientX;
      current.mouseY = event.clientY;
      current.lastMouseMoveAt = performance.now();
      current.mouseOnPage = true;
      current.mouseRestStarted = current.lastMouseMoveAt;
    };
    current.onMouseLeave = function () { current.mouseOnPage = false; };
    current.onBlur = function () { current.mouseOnPage = false; };
    current.onKey = function (event) {
      if (event.key === "Escape") finish();
      else if (current.touring &&
          ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]
            .indexOf(event.key) >= 0) stopTour(current);
    };
    current.onInterruptTour = function () { stopTour(current); };
    window.addEventListener("scroll", current.onScroll, { passive: true });
    window.addEventListener("resize", current.onResize, { passive: true });
    window.addEventListener("pointermove", current.onMouse, { passive: true });
    document.documentElement.addEventListener("mouseleave", current.onMouseLeave);
    window.addEventListener("blur", current.onBlur);
    window.addEventListener("wheel", current.onInterruptTour, { passive: true });
    window.addEventListener("touchstart", current.onInterruptTour, { passive: true });
    document.addEventListener("keydown", current.onKey);
  }

  function watchAddedLayers(current) {
    if (!window.MutationObserver) return;
    current.observer = new MutationObserver(function (records) {
      var roots = [];
      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (node) {
          if (node.nodeType === 1 && !node.hasAttribute("data-sr-owned")) roots.push(node);
          else if (node.nodeType === 3 && record.target.nodeType === 1 &&
              !current.layerByElement.has(record.target) &&
              !record.target.hasAttribute("data-sr-owned")) roots.push(record.target);
        });
      });
      if (!roots.length || current.disposed) return;
      current.observer.disconnect();
      collect(current, roots);
      current.observer.observe(document.body, { childList: true, subtree: true });
      updateStats(current);
      current.pumpPending = true;
    });
    current.observer.observe(document.body, { childList: true, subtree: true });
  }

  function makeState() {
    var current = {
      layers: [],
      layerByElement: new WeakMap(),
      stats: { layers: 0, texts: 0, frames: 0 },
      agents: [],
      phase: "waiting",
      scanStarted: performance.now(),
      lastTick: performance.now(),
      lastScroll: performance.now(),
      mouseX: window.innerWidth / 2,
      mouseY: window.innerHeight / 2,
      mouseDirX: 0,
      mouseDirY: 0,
      lastMouseMoveAt: 0,
      mouseRestStarted: performance.now(),
      mouseOnPage: false,
      pumpPending: false,
      measurePending: true,
      lastMeasure: 0,
      guideAlpha: 0,
      lastWorkTime: 0,
      touring: false,
      observer: null,
      disposed: false,
      locked: false,
      oldScrollRestoration: null,
      addedLock: false,
      lastScanTick: 0
    };
    createOverlays(current);
    setLock(current, true);
    attachEvents(current);
    return current;
  }

  function resizeCanvas(canvas) {
    if (!canvas) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
  }

  async function begin() {
    if (state) cleanup(state);
    resetStats();
    config = readConfig();
    var current = makeState();
    state = current;
    await waitForLoadAndFonts();
    if (current.disposed || current.phase === "done" || state !== current) return;
    populateScanCard(current);
    collect(current, [document.body]);
    updateStats(current);
    api.layers = current.layers;
    watchAddedLayers(current);
    current.scanStarted = performance.now();
    current.lastScanTick = current.scanStarted;
    current.phase = "scan";
    current.lastTick = current.scanStarted;
    current.measurePending = true;
    current.lastMeasure = 0;
    frameId = window.requestAnimationFrame(tick);
  }

  function replay() {
    if (state) cleanup(state);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    begin();
  }

  api.skip = finish;
  api.replay = replay;
  api.setSpeed = setSpeed;
  api.tour = function () {
    if (!state) return;
    if (state.touring) stopTour(state);
    else startTour(state);
  };

  begin();
}());
