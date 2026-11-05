# Swarm Rebuild: Deep-Dive Reverse Engineering

Nov 5, 2026 · @Zyron Neil

## 1. The render surface (View)

The extension draws everything inside one shadow root, and scrolling is a single CSS transform that mirrors the real page's scroll position. This pass covers the parts of `swarm-rebuild/swarm.js` that the first overview only skimmed.

The shadow root's DOM is a fixed stack, back to front:

1. `.bg`: page background color or image
2. `.layer.under`: screen-fixed items behind the scroller
3. `.port > .world`: the scrolling content
4. `.layer.over`: fixed and stuck-sticky items
5. `.intro`: favicon logo shown during the intro
6. `svg.ov`: selection boxes and overlays
7. `.badges`: the `W × H` size badges
8. `.cursors`: the cursor elements
9. `.rulers`: Figma-style rulers
10. `.hud`: status text, progress bar and buttons

How it behaves:

- **Scrolling is one transform.** `syncWorld()` sets `translate(-sx, -sy)` on `.world`. All items live in document coordinates, so the extension never fakes scrolling; it mirrors the real scroll.
- **`.port` clips `.world` for inner scrollers.** It sits over the real scroller's box. In an app-shell page, `mount()` inserts the port into the `under` / `over` stack at the scroller's own z-key (`portKey`), which keeps dialogs, headers and panels in front of or behind the scrolling content in their original order.
- **Items are persistent DOM nodes.** `makeNode` creates every node up front with `display:none`, and the engine only flips visibility and geometry. Each item has a version counter `v` and a rendered version `rv`, and `renderItem` returns early when `rv === v`. Generators call `bump(it)` to mark an item dirty. This dirty-flag scheme keeps thousands of layers affordable.
- **Twin items** (the same text at the same spot) mirror their primary's state through `renderItem`, so they cost nothing extra to animate.
- **Backdrops.** A transparent sticky header gets a synthetic `rgba(pageBg, .82)` rectangle behind it, so scrolling content doesn't show through where the original site would have added a background on scroll.
- **The intro logo** uses the largest `<link rel="icon">`, falls back to `/favicon.ico`, and then to a single-letter monogram from the page title.
- **Dark pages** (luminance below 0.4) get a lighter placeholder color (`--ph`).

## 2. Box emission (emitBox and emitPseudoBox)

`emitBox` decides whether an element draws anything at all, and `emitPseudoBox` reconstructs geometry the browser doesn't expose.

| Element state | What is emitted |
| --- | --- |
| `<hr>` | A pen line, centered vertically, 1 to 2px thick |
| Visible background (alpha above 0.01 and not the page color, or any `background-image`), shadow, or backdrop filter | A **rect** carrying all `RECT_PROPS` as inline CSS (backgrounds, borders, radii, shadow, mask, clip-path, filter) |
| No fill, 1 to 3 borders | One **pen line per side**, offset by half the stroke width so it lands on the original edge; `dashed` and `dotted` become `stroke-dasharray` |
| No fill, no border | Nothing |
| Same color as the page, no border | Skipped, since an invisible rect would only add work |

Two fields matter later. `sig` is set to the CSS string, which is how the duplicate detector decides whether two copies need a "restyle" step. `big` is true when the box covers more than 40% of the viewport, and big boxes are styled the instant they're drawn.

**Pseudo-elements are the clever part.** The browser doesn't expose `::before` and `::after` boxes, so the code derives them:

- **Absolute pseudo-elements** need a positioned host. Left, top, right and bottom are resolved against the host's padding box, then any `matrix()` translation is added.
- **In-flow pseudo-elements** are handled in two cases only: a lone icon in an otherwise empty element (centered), and chevron-style icons at either end of a flex row, positioned from the children's boxes.
- **Anything else is silently dropped**, which matches the README's note that decorative pseudo-elements are skipped when their position can't be worked out.

## 3. Cursor primitives (generators)

Every cursor performance is a generator function, and every primitive writes to an item's fields (`draw`, `shown`, `vis`, `done`) and calls `bump(it)`. The render loop reads those fields, so generators and rendering stay decoupled.

| Primitive | Behavior |
| --- | --- |
| `moveTo` | Duration is `clamp(0.12 + √dist × 0.021, 0.14, 0.9)` divided by `speed`. The path is an eased curve with a sideways sine bend of up to about 14% of the distance (capped at 600px). Drag moves use ease-in-out, plain moves ease-out. The target can be a function, so a move can chase a moving point. |
| `wait`, `click` | `wait` advances by `dt × tempo`, so the whole performance speeds up or slows down together. `click` sets `press = 1`, plays the press sound and waits 70ms. |
| `type` | Per-character delay is random between 12 and 40ms, plus extra for spaces and newlines and a 2.5% chance of a human-looking hesitation. A compression factor `k = clamp(70/N, 0.06, 1)` makes long strings type fast. |
| `idle`, `leave` | Idle cursors wander the middle 60% of the viewport. Leaving cursors exit left or right depending on which half they are in. |
| `drawBox` | Cross cursor, drag from the top-left with a live `W × H` selection ghost, then the real styling replaces the placeholder after a short random delay. Huge boxes are not dragged to full size (`dragEnd`): the cursor stops near the screen edge and the box eases the rest of the way. |
| `drawLine` | Pen-add cursor, click each anchor with a slight bend between clicks, nudge away, mark done. |
| `drawText` | A click for short single-line text, otherwise a drag to define the box with a size ghost. Then an I-beam cursor and typing. With a snap guide, the text starts offset 28 to 64px right (or 18 to 34px above or below), so the snap looks deliberate. |

## 4. Sound engine

All audio is synthesized with Web Audio; the repo contains no audio files. The `Sound` class runs at 104 BPM and plays a pentatonic melody in E from finished boxes, with percussive typing and clicks underneath.

Signal flow:

1. Each voice gets its own `bus`: a gain, a stereo panner and a reverb send.
2. All buses feed the master gain.
3. Master goes through a compressor (threshold -18 dB, ratio 5:1).
4. The compressor feeds the output gain, then the destination.
5. The reverb is a convolver whose impulse is 3.2s of low-passed noise with a decaying envelope and a closing filter, fed from each bus's send.

Voices and events:

- **Glass piano (`piano`).** Five sine partials at ratios 1, 2, 3, 2.756 and 5.4. The 2.756 partial is inharmonic, which gives the glass quality. Each partial has its own exponential decay and a slight detune, plus a bandpass-noise hammer tick. Voices are capped at 28, and high notes decay 35% faster.
- **Percussion (`tick`, `clack`, `press`).** Short bandpass noise bursts. A key click stacks a high click (3.6 to 5.6 kHz) over a lower thock (850 to 1500 Hz, or 380 to 560 Hz for the space bar). A mouse press is three ticks: press, thump and release.
- **Melody (`place`).** Only boxes, images, duplicates, guides and restyles make notes; text and lines stay percussive. Pitch is `E2 + octave × 12 + PENTA[degree]`. The octave comes from box area (larger boxes are lower) and the scale degree from horizontal position, in five buckets from left to right. Only one note is allowed per grid slot, and off-screen events play at 45% volume. Images add a second harmony note, and duplicates add a quiet octave-plus-fifth.
- **Set pieces.** `intro` is a rising filtered-noise swell over a low open-fifth pad. `start` is a five-note arpeggio panned left to right. `finale` is a 10-note strummed E major add9 chord with a 5.5-second ring. `release` is a falling noise sweep.
- **Determinism hook.** Every event is logged to `window.__swarmSfxLog` if that array exists, and the engine can run off an explicit `fakeNow` clock. That makes an offline render of the soundtrack possible, which fits the demo video with sound in the README.

The README says the melody sits on an eighth-note grid and a code comment says sixteenth. In the code, melody uses `grid(2)` (eighths) and the start arpeggio uses `grid(4)` (sixteenths).

## 5. Notes for modifying the fork

Most easy changes live in a handful of constants and one class, while pseudo-element handling is the most fragile area.

- **Hard caps** are plain constants: `MAX_ITEMS` (4000), `MAX_WORLD_H` (40000) and the agent counts. Raising them directly increases DOM size, so test on long pages.
- **Pseudo-elements** are the likely source of visual differences on modern sites, since only a few layouts are reconstructed.
- **Cursor names and colors** are the `NAMES` and `COLORS` arrays, so re-theming the cursors is a one-line change.
- **The sound palette is isolated in `Sound`.** Swapping the scale (`PENTA`), root (`E2`), tempo (`bpm`) or timbre is easy and contained.
- **Build speed** is driven by one number, `engine.tempo`, so retuning pacing is simple.
- **License.** The upstream README says there is no license and that the code adapts Joel Califa's unlicensed Swarm site, so a fork keeps that status. Keep derivative work personal, or get his permission before publishing.

Source: [DhvanilPatel/swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors), files `swarm-rebuild/swarm.js`, `background.js` and `manifest.json`, read from a local clone on 2026-11-05.
