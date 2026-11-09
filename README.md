# ZBAUTISTA CS111  Personal Memories Website

**Version:** 2.13.0<br>
**Author:** Zyron Neil A. Bautista  
**Subject:** CS111 - Introduction to Computing  
**Live Site / Portfolio:** [Personal Portfolio](https://personal-portfolio-ten-sage-56.vercel.app/)  
**GitHub Repository:** [ZyronNeil2007/zbautista_cs111](https://github.com/ZyronNeil2007/zbautista_cs111)  

---

## 📖 Project Overview

A modern, highly interactive, and responsive multi-page personal memories web application developed for **CS111 (Introduction to Computing)**.

The website serves as a digital memory vault featuring:
- An interactive **3D fan-out Memory Folders stage** on the homepage (`index.html`) allowing visitors to hover and wheel-flip through pages or click directly into each section.
- An interactive **DNA Helix Timeline** pinned to the *"My Journey"* portfolio section, rendered smoothly on HTML5 Canvas.
- A **Full-screen Lightbox Image Viewer** built with vanilla JavaScript, providing seamless full-screen image inspection and captions across all memory pages.
- Native HTML5 **video playback** for movie trailers (MP4) and a custom multi-track **music player** for favorite songs (MP3).
- A movie discovery page with muted featured-trailer previews, cast highlights, categorized poster rows, and keyboard-accessible detail dialogs.
- Accessible navigation and touch-friendly controls across the landing page and interactive memory folders.
- A homepage browse action and reading-progress indicator that make the long-form experience easier to navigate.
- A custom ZN logo shared by the homepage, memory pages, and responsive favicon.
- A clean, standardized, modular folder architecture categorizing source code and assets by file type (`pages/`, `css/`, `js/`, and `img/`).
- A standalone grayscale responsive wireframe (`wireframe.html`) outlining the desktop, tablet, and mobile homepage structure, navigation flow, and section purposes.

---

## ✨ Key Features

### 📂 1. Interactive 3D Memory Folders (`js/folders.js`)
- **Fanning Divider Tabs:** Mouse hover or focus expands folder tab dividers styled with curated warm gradient pairs.
- **Dynamic Page Flipping:** Use the mouse scroll wheel, on-screen `▲` / `▼` navigation buttons, or keyboard arrow keys (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`) to cycle through memory photos inside each folder.
- **Live Search Filtering:** Real-time filter box in the top navigation bar to quickly search memory folders by keyword with smooth scrolling to matching results.
- **Touch-Device Friendly:** Optimized pointer events with single-tap preview, tap-outside dismiss, and reliable folder switching on touch displays.
- **Keyboard Accessible:** Focus-visible folder controls and keyboard navigation for browsing and opening folders.

### 🧬 2. Canvas DNA Double Helix Timeline (`js/dna.js`)
- **Scroll-Synchronized Rotation:** Custom canvas rendering simulates a rotating double helix pinned beside the timeline cards in *"My Journey"*.
- **Biological Color-Coding:** Strands and rungs alternate matching real A–T and G–C base pair combinations.
- **Scroll Inertia & Drifting Motes:** Smooth easing with floating particle motes and reduced-motion query detection.

### 🔍 3. Fullscreen Lightbox Modal (`js/lightbox.js`)
- **High-Resolution Inspection:** Click any photo in the galleries across all memory pages to open it in a modal overlay.
- **Automatic Caption Extraction:** Captures text from parent `<figure>` `<figcaption>` elements or image `alt` attributes.
- **Keyboard & Click Dismiss:** Close via `ESC` key, backdrop click, or close button with ARIA modal accessibility standards.

### 🎬 4. Native Multimedia Players
- **Video Trailers (MP4):** Integrated `<video controls preload="metadata">` for movie trailers with responsive aspect ratios.
- **Song Playlist (MP3):** Custom playlist with playback controls, shuffle/repeat, seeking, volume, a responsive now-playing view, and Media Session controls where supported.
- **Movie Previews:** The featured billboard can autoplay muted trailer previews, show main-cast names, and expose a sound toggle; previews are disabled for reduced-motion and data-saving preferences.

### 🎨 5. Glassmorphic UI & Design System (`css/`)
- Dark crimson backdrop gradient (`#180308` to `#3a0912`) accented with frosted glass containers (`backdrop-filter: blur(12px)`).
- Fluid typography using Google Fonts: *Lilita One*, *Poppins*, and *Space Mono*.
- Custom ZN logo branding across the site, including page favicons.

### 🌄 6. Scenic Portfolio
- Full-width portfolio hero and first About page use custom rice-field and school backgrounds.
- Responsive About pages present personal details separately from activities, interests, and technical skills.

### 🐝 7. Swarm Rebuild (`js/swarm-rebuild.js`)
- Starts a self-contained, dependency-free page rebuild animation across the homepage, all memory pages, and the responsive wireframe, revealing page layers as visitors scroll.
- Animated cursor agents draw selection frames and type text; after the build, they follow mouse movement or gather in a resting ring.
- Includes a progress toolbar, scroll tour, speed and sound controls, skip, replay, responsive agent counts, and reduced-motion support.
- When repeated sibling elements create a heavy workload, agents can copy the completed animation of one sibling to similar elements.
- The animation starts on all screen sizes; the homepage Swarm button can replay it.

### 🎮 8. Interactive Memory Pages
- **Joke Time (`js/joke-time.js`):** 3D flip cards that reveal each punchline, 😂 / 😐 reactions saved in the browser, a random-joke machine with bonus jokes, and a *Guess the Punchline* quiz with scoring.
- **My Favorite Food (`js/recipe-tools.js`):** servings slider that rescales every ingredient (fractions, ranges, and plurals included), tick-off checklists that persist, and a full-screen **Cook Mode** with step-by-step navigation, per-step countdown timers (beep + vibration), and screen wake lock.
- **Childhood / Family / Friends (`js/memory-game.js`):** a *Memory Match* card game built automatically from each page's own photos, with move counter, timer, and per-page best score.
- **My Song (`js/song-visualizer.js`):** a live Web Audio visualizer (bars, wave, ring) that reacts to the music, plus reflection lines that highlight as each song plays (click a line to jump there). Falls back to a simulated animation when opened from `file://`.
- All new widgets are keyboard accessible, respect `prefers-reduced-motion`, and opt out of the Swarm Rebuild animation with `data-sr-skip`.

---

## 📁 Repository Structure

```text
zbautista_cs111/
├── index.html                   # Main landing page with 3D memory folders & portfolio
├── wireframe.html               # Responsive grayscale homepage wireframe and UX notes
├── README.md                    # Project documentation & release details
├── features.csv                 # Swarm Rebuild feature comparison
├── Swarm Rebuild Deep-Dive Reverse Engineering.md # Swarm Rebuild research notes
├── .gitignore                   # Git ignore patterns
│
├── pages/                       # Dedicated secondary memory pages
│   ├── childhood_memories.html  # 5 photo memories from childhood
│   ├── family_relatives.html    # 5 family photos, tributes, and reflections
│   ├── me_and_my_love.html      # 5 photos capturing meaningful affections & passions
│   ├── my_favorite_food.html    # 4 favorite dishes with recipes & instructions
│   ├── my_favorite_movie.html   # Movie discovery page with posters, details & MP4 trailers
│   ├── my_friends.html          # 5 photo highlights with circles of friends
│   ├── my_song.html             # 5 songs with reflections & MP3 audio players
│   └── joke_time.html           # 5 clean, witty school & programming jokes
│
├── css/                         # Clean vanilla styling and design system
│   ├── memory-game.css          # Memory Match game styling
│   ├── song-visualizer.css      # Visualizer and reflections styling
│   ├── landing.css              # Hero stage, topbar, 3D folder fan-out, and responsive grid
│   ├── portfolio.css            # Portfolio section, DNA helix layout, and design gallery
│   ├── style.css                # Shared glassmorphic design system for content pages
│   ├── childhood_memories.css   # Childhood gallery layout
│   ├── family_relatives.css     # Family gallery layout
│   ├── me_and_my_love.css       # Memories gallery layout
│   ├── my_friends.css           # Friends gallery layout
│   ├── my_favorite_food.css     # Recipe page styling
│   ├── my_favorite_movie.css    # Movie page styling
│   ├── my_song.css              # Song page styling
│   └── joke_time.css            # Joke page styling
│
├── js/                          # Client-side interactions & features
│   ├── dna.js                   # Interactive HTML5 Canvas double-helix scroll visualizer
│   ├── folders.js               # Interactive 3D folder card fan-out & page flipper
│   ├── lightbox.js              # Fullscreen image viewer modal with keyboard & touch support
│   ├── joke-time.js             # Joke flip cards, reactions, random joke, and quiz
│   ├── memory-game.js           # Photo memory-matching game for gallery pages
│   ├── my_favorite_movie.js     # Movie billboard, poster rows, and details dialog
│   ├── my_song.js               # Song playlist playback and now-playing controls
│   ├── reading-progress.js      # Homepage reading progress indicator
│   ├── recipe-tools.js          # Servings scaler, checklists, and cook mode with timers
│   ├── song-visualizer.js       # Web Audio visualizer and synced reflections
│   └── swarm-rebuild.js         # Dependency-free animated page rebuild and mouse-follow swarm
│
├── img/                         # Optimized image, audio, and video assets
│   ├── backgrounds/             # Portfolio backgrounds (neil_bg.jpg, ME_LANSCAPE_AT_RICEFIELD.png, bnhschool.png)
│   ├── repo screenshots/        # High-resolution screenshots for Selected Work showcase cards
│   ├── childhood_memories/      # Early memories photograph assets
│   ├── family_relatives/        # Family gatherings & tribute photos
│   ├── icons/                   # ZN brand logo and UI iconography
│   ├── me_and_my_love/          # Tech, companionship, and memory photos
│   ├── my_favorite_food/        # Dish photographs (Adobo, Sinigang, Tinola, Fries)
│   ├── my_favorite_movie/       # Movie posters and MP4 video trailers
│   ├── my_friends/              # Circle of friends photographs
│   └── my_song/                 # Single/album artwork and MP3 audio tracks
│
└── discard/                     # Preserved archived previous drafts (v1.0)
```

---

## 🌐 Navigation & Memory Categories

| Category | Page Path | Content Highlights |
|---|---|---|
| **Childhood Memories** | `pages/childhood_memories.html` | 5 early childhood photographs with responsive cards and lightbox preview. |
| **My Family & Relatives** | `pages/family_relatives.html` | Cherished family milestones, gatherings, and birthday tributes. |
| **My Friends** | `pages/my_friends.html` | Senior high school circle, college engineering squad, and reunions. |
| **Me & My Love** | `pages/me_and_my_love.html` | Heartfelt memories, photo dumps, inspirations, and passion for tech/computing. |
| **My Favorite Food** | `pages/my_favorite_food.html` | Filipino classics (Adobo, Sinigang, Tinola) and snack fries with ingredients and instructions. |
| **My Favorite Movie** | `pages/my_favorite_movie.html` | *Red, White & Royal Blue*, *Call Me by Your Name*, *Marry My Dead Body*, *Avengers: Infinity War*, *Doctor Strange: Multiverse of Madness*, complete with MP4 trailers. |
| **My Song** | `pages/my_song.html` | Tracks by Sufjan Stevens, Billie Eilish, Ariana Grande, Gigi Perez, with in-browser MP3 audio player. |
| **Joke Time** | `pages/joke_time.html` | 5 clean, witty school & programming jokes to brighten your day. |

Every individual page includes a `← Back to Homepage` navigation link at both top and bottom.

---

## 🛠️ Technology Stack

- **HTML5:** Semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<figure>`, `<figcaption>`, `<audio>`, `<video>`).
- **Vanilla CSS3:** Modern glassmorphism, CSS Grid, Flexbox, custom properties (CSS variables), micro-interactions, and mobile-responsive breakpoints.
- **Vanilla JavaScript (ES6+):**
  - **3D Folder Fan-out (`js/folders.js`):** Interactive page flipping, mouse hover, wheel scrolling, touch interaction, and keyboard navigation.
  - **DNA Timeline Visualizer (`js/dna.js`):** Canvas-based animated double helix responsive to scrolling and inertia.
  - **Lightbox Modal (`js/lightbox.js`):** Accessible fullscreen modal with ESC key dismiss and click-away close.
  - **Swarm Rebuild (`js/swarm-rebuild.js`):** Dependency-free layer-by-layer page reveal on every HTML page, animated agents, mouse-follow mode, and replay controls.
  - **Reading Progress (`js/reading-progress.js`):** Scroll-position feedback on the homepage.
- **Song Playlist (`js/my_song.js`):** Multi-track playback, shuffle/repeat, seek and volume controls, responsive now-playing view, and Media Session integration where supported.
- **Media Support:** Native browser `<video controls>` for MP4 trailers; MP3 playback is managed by the custom song playlist.
- **Zero Heavy Frameworks:** Pure, high-performance vanilla web standards.

---

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/ZyronNeil2007/zbautista_cs111.git
   ```
2. Navigate into the project folder:
   ```bash
   cd zbautista_cs111
   ```
3. Open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari) by double-clicking it or serving it via a local static server:
   ```bash
   # Optional: Using Node.js npx serve
   npx serve .
   ```
4. Open `wireframe.html` directly in a browser to review the responsive low-fidelity design. Use the viewport controls to preview desktop, tablet, and mobile layouts.

---

## 📝 Changelog

### [v2.13.0] — 2026-11-09
#### Added
- Added interactive Joke Time cards with saved reactions, a random-joke machine, and a punchline quiz.
- Added photo-based Memory Match games to the Childhood, Family, and Friends pages, with move and time tracking and per-page best scores.
- Added recipe serving scaling, persistent ingredient and step checklists, and Cook Mode with step timers to My Favorite Food.
- Added a music visualizer with selectable bars, wave, and ring views, plus reflections synchronized to playback on My Song.

#### Improved
- Expanded Swarm Rebuild with manual element pinning, lookahead building, instant handling for marked widgets and scroll containers, a draggable toolbar, clone-mode refinements, and reduced-frequency layout reads.
- Added Swarm Rebuild accessibility announcements, a timeout failsafe, and automatic cleanup if the script encounters a runtime error.
- The song visualizer now honors `prefers-reduced-motion` while keeping playback reflections available.

#### Bug Fixes
- Added recovery paths to prevent an interrupted or failed Swarm Rebuild from leaving page content hidden.

#### Technical Changes
- Added `js/joke-time.js`, `js/memory-game.js`, `js/recipe-tools.js`, and `js/song-visualizer.js` with their supporting stylesheets. No runtime dependencies were added.
- Persisted joke reactions, recipe checklist state, and Memory Match best scores in browser storage.

#### Documentation
- Updated the project version, feature overview, source tree, and release changelog.

#### Breaking Changes
- None.

#### Credits / Contributors
- Zyron Neil A. Bautista — project author and maintainer.

### [v2.12.0] — 2026-11-08
#### Added
- **3-Layer Design Token Architecture (`css/tokens.css`):** Established primitive, semantic, and component tokens with 4px/8px standardized spacing, typography scales, glassmorphism tokens, and motion tokens across the entire site.
- **Social Graph & Open Graph Assets (`img/og-banner.svg`):** Designed 1200×630px social preview banner and injected comprehensive Open Graph & Twitter card `<meta>` tags across `index.html`, `wireframe.html`, and all 8 memory pages.
- **Time-Synced Karaoke & Official Lyrics UX (`pages/my_song.html`):** Built structured JSON time-synced karaoke engine with token-based scrolling and implemented a safe copyright-compliant UX pattern injecting a stylish "Search Official Lyrics on Google" button for mainstream songs.

#### Improved
- **WCAG AA Contrast Ratios:** Added dark overlay gradients inside frosted glass panels (`.glass`, `.glass-panel`, `.glass-panel-inner`) guaranteeing strict 4.5:1 text contrast against dynamic photographic backdrops.
- **Keyboard Focus Management:** Implemented universal 2px solid yellow (`#f2e24f`) focus rings with 2px offset on all interactive controls, 3D memory folders, and the fullscreen Lightbox modal.
- **Reduced Motion Engine Fallback:** Added global `prefers-reduced-motion: reduce` CSS reset and optimized the DNA Canvas timeline (`js/dna.js`) and Swarm Rebuild to render stationary frames without continuous RAF loops for vestibular accessibility.
- **Brand Identity & Messaging:** Refreshed site copy, meta descriptions, and biography to present Zyron Neil Bautista as a Computer Science undergraduate at Isabela State University specializing in creative web engineering and visual storytelling.

#### Technical Changes
- Standardized SVG iconography across navigation and buttons with consistent outline stroke styling.
- Bound accessible focus trap and restoration inside the full-screen image lightbox modal (`js/lightbox.js`).

#### Breaking Changes
- None.

#### Credits / Contributors
- Zyron Neil A. Bautista — project author and maintainer.

### [v2.11.0] — 2026-11-08
#### Added
- Added muted autoplaying trailer previews to the movie billboard, with a sound toggle and cast highlights extracted from each movie's Main Cast details.
- Added an automatic clone mode to Swarm Rebuild, which copies completed animations across structurally similar sibling elements when the workload is high.

#### Improved
- Swarm Rebuild now starts on narrow screens as well as larger screens.
- Movie billboard timing and progress indicators follow trailer playback, while poster timing remains the fallback when previews are unavailable, disabled, or unsupported.

#### Bug Fixes
- No bug fixes are included in this release.

#### Technical Changes
- Trailer previews respect reduced-motion and data-saving preferences and pause when the billboard is hidden, the document is backgrounded, or the details modal is open.
- Added no runtime dependencies.

#### Documentation
- Updated the project version, movie and Swarm Rebuild feature descriptions, and this changelog.

#### Breaking Changes
- None.

#### Credits / Contributors
- Zyron Neil A. Bautista — project author and maintainer.

### [v2.10.0] — 2026-11-06
#### Added
- Added a direct **Browse memory folders** action and a page reading-progress indicator to the homepage.
- Enabled the Swarm Rebuild animation on all eight memory pages and the responsive wireframe, in addition to the homepage.

#### Improved
- Moved the desktop hero name and course tagline below the quick-memory cards and reduced their desktop-only font sizes; tablet and mobile layouts remain unchanged.
- Kept the homepage swarm from auto-starting on narrow screens while allowing visitors to launch it with the existing Swarm button.

#### Fixed
- Prevented the desktop hero title from overlapping the Childhood Memories card.

#### Technical Changes
- Added `js/reading-progress.js` and shared Swarm Rebuild script references with the correct relative paths on each HTML page.
- Preserved reduced-motion support and added no runtime dependencies.

#### Documentation
- Updated the project version, feature descriptions, source tree, and v2.10.0 changelog.
- Recorded this landing-page polish progress in [#1](https://github.com/ZyronNeil2007/zbautista_cs111/issues/1); remaining work is still tracked there.

#### Breaking Changes
- None.

#### Credits / Contributors
- Zyron Neil A. Bautista — project author and maintainer.

### [v2.9.0] — 2026-11-06
#### Improved
- Refined the landing-page hero with a layered portrait, more prominent title treatment, and improved tablet/mobile composition.
- Improved the mobile About Me layout with a contained scenic image, clearer heading card, and more legible content panel.
- Replaced the text badge with the custom ZN logo on the landing page and shared navigation, and added the matching favicon to every site page and the wireframe.
- Adjusted small-screen title sizing to keep the name within narrow viewports.

#### Technical Changes
- Added `img/icons/zn.logo.png` as the shared logo and favicon asset; no dependencies were added.
- Changed the landing background attachment to scroll for more reliable mobile rendering.

#### Documentation
- Updated the project version, logo feature description, and icon asset documentation.
- Recorded this partial landing-page polish update in [#1](https://github.com/ZyronNeil2007/zbautista_cs111/issues/1); other tracked work remains open.

#### Breaking Changes
- None.

### [v2.8.0] — 2026-11-06
#### Added
- Added high-resolution project screenshots for all Selected Work cards (`img/repo screenshots/`), replacing temporary placeholders and partially addressing [#1](https://github.com/ZyronNeil2007/zbautista_cs111/issues/1).
- Added a 6th project showcase card for **CCSICT DP Blast 2026** with live screenshot, descriptions, technology badges, and repository link.
- Added a responsive layered mobile cutout portrait (`.hero-portrait`) in `css/landing.css` positioned between the title and subtitle on small screens (≤ 820px).

#### Improved
- Redesigned the portfolio **Contact** section into a full-viewport, modern split-column card with an active collaboration status indicator, clear primary mail action, and structured social links.
- Updated `js/swarm-rebuild.js` with `data-mobile-autostart="false"` support to prevent heavy animations from autostarting on mobile devices (≤ 820px), improving mobile performance and battery usage.

#### Fixed
- Removed obsolete placeholder Visual Design Gallery markup in `index.html` referencing non-existent images, resolving 404 console errors.

#### Technical Changes
- Tracked new screenshots in `img/repo screenshots/` for ISU ID Issuance System, E-Lodging ISU, Personal Portfolio, BNHS Online Quiz, 3D Pop-Art Hand Tracking, and CCSICT DP Blast 2026.
- Refined stacking contexts, isolation, and typography across mobile landing CSS and portfolio contact styles.

#### Documentation
- Updated project version to `2.8.0` across `README.md` and `index.html`.
- Updated repository structure documentation to reflect `img/repo screenshots/`.

#### Breaking Changes
- None.

### [v2.7.0] — 2026-11-06
#### Added
- Added `wireframe.html`, a standalone grayscale wireframe with desktop, tablet, and mobile layouts, section notes, and a navigation/user-flow diagram.
- Added Swarm Rebuild reverse-engineering notes and a feature comparison in `Swarm Rebuild Deep-Dive Reverse Engineering.md` and `features.csv`.

#### Technical Changes
- Removed the obsolete GitHub Pages `CNAME` after the custom domain became unreachable.
- The wireframe is plain HTML and CSS and adds no dependencies.

#### Documentation
- Updated the project version, repository structure, feature overview, and local usage instructions.

#### Breaking Changes
- None.

### [v2.6.0] — 2026-11-06
#### Added
- Added the standalone Swarm Rebuild experience to the homepage, with scroll-triggered layers, animated cursor agents, mouse-follow behavior, Tour, speed, skip, and replay controls.
- Added reduced-motion handling, responsive agent limits, and logo/background configuration.

#### Improved
- Integrated the rebuild script directly into the homepage and made the existing Swarm button replay the animation.

#### Technical Changes
- Added `js/swarm-rebuild.js` as a dependency-free vanilla JavaScript feature; no project dependencies were added.

#### Documentation
- Updated the project version, feature overview, technology stack, and source tree.

#### Breaking Changes
- None.

### [v2.5.0] — 2026-11-05
#### Added
- Added Swarm interactive rebuild launcher control (`css/swarm-launch.css`, `js/swarm-launch.js`) with keyboard shortcut support (`Alt+Shift+S`) and navigation button integration.
- Added custom typography asset `assets/fonts/Pillar.ttf`.
- Added transparent background cutout asset `img/backgrounds/neil_bg_removed.png` for layered hero composition.

#### Improved
- Cleaned up semantic indentation and hierarchy across `index.html`.
- Standardized asset path references and module styling.

#### Technical Changes
- Tracked custom font and transparent profile imagery assets in dedicated folders.
- Integrated lazy-loading mechanism for experimental swarm animations.

#### Documentation
- Updated project version to v2.5.0 and documented newly integrated assets and launch controls.

#### Breaking Changes
- None.

### [v2.4.0] — 2026-10-31
#### Added
- Added a skip-to-content link, accessible labels, visible folder thumbnail labels, and focus-visible keyboard styling.

#### Improved
- Refined landing-page typography, contrast, control sizing, and responsive touch targets.
- Improved touch folder behavior and keyboard focus handling.
- Reworked the About section into two responsive pages and removed the scenic background from the activities and skills page.

#### Fixed
- Corrected spacing and alignment at the top of the activities and skills panel.

#### Technical Changes
- Added the small-viewport-height CSS unit where appropriate and excluded the local `discard/2.0/` archive from version control.

#### Documentation
- Updated the project version and feature descriptions.
- Tracked unfinished About Me, gallery/work imagery, Memory Folders layout, and landing-page polish in [issue #1](https://github.com/ZyronNeil2007/zbautista_cs111/issues/1).

#### Breaking Changes
- None.

### [v2.3.0] — 2026-10-29
#### Added
- Redesigned the favorite movies page with a rotating featured billboard, progress indicators, and categorized, horizontally browsable poster rows.
- Added movie detail dialogs with trailer playback, film information, previous/next navigation, keyboard controls, and focus management.
- Added responsive layouts, reduced-motion support, poster fallbacks, and a message for unavailable trailers.

#### Changed
- Updated the project version and documentation to describe the movie discovery experience.

#### Breaking Changes
- None.

### [v2.2.0] — 2026-10-27
#### Added
- Redesigned the song page as an interactive playlist with track selection, playback controls, shuffle, repeat, seek, volume, and a responsive full-screen now-playing view.
- Added Media Session integration for supported browsers and mobile devices.
- Added page-specific stylesheets for memory categories and the song page.

#### Changed
- Moved page-specific gallery, recipe, movie, and joke styling out of the shared stylesheet.
- Updated song page documentation and project version.

#### Breaking Changes
- None.

### [v2.1.0] — 2026-10-25
#### Added
- Custom rice-field and school background artwork for the portfolio hero and About section.
- GitHub Pages custom domain configuration for `neilcs11.com`.

#### Changed
- Reworked the About Me bento grid into a single responsive panel, grouping the biography, activities, interests, and skills.
- Refined the portfolio hero layout and copy.
- Updated project documentation and version information.

#### Breaking Changes
- None.

### [v2.0.0] — 2026-10-25
#### Added
- **Modular Folder Hierarchy:** Structured repository into dedicated folders (`pages/`, `css/`, `js/`, and `img/`).
- **Interactive 3D Folders (`js/folders.js`):** Interactive folder stacks featuring multi-page scroll-wheeling and dynamic photo previews.
- **Canvas DNA Double Helix (`js/dna.js`):** Real-time canvas animation responding to scroll position with inertia and drifting particles.
- **Universal Image Lightbox (`js/lightbox.js`):** Modal image viewer with keyboard navigation (`ESC`) and backdrop click-away support.
- **Integrated Multimedia:** Native MP3 playback for songs and MP4 video trailers for favorite movies.
- **Real-time Folder Search:** Instant filter input on the homepage header.

#### Changed
- Relocated all secondary HTML files into `pages/`.
- Consolidated styles into `css/landing.css`, `css/portfolio.css`, and `css/style.css`.
- Grouped asset files into `img/<category>/`.
- Preserved archived initial pure-HTML drafts in `discard/1.0/`.

#### Fixed
- Fixed all relative link paths across all pages for stylesheets, scripts, images, audio, and video tags.
- Fixed CSS background `url()` path in `landing.css`.
- Fixed HTML entity escaping in media player source links.

---

### [v1.0.0] — 2026-10-18
#### Added
- Initial project release for CS111 (Introduction to Computing).
- Semantic HTML structure across 8 memory categories.
- Homepage (`index.html`) linking to dedicated memory pages.
- Native `<audio>` and `<video>` tags and image galleries.

---

## 📄 License & Attribution

Developed by **Zyron Neil A. Bautista** for academic purposes under the **CS111 (Introduction to Computing)** curriculum. All personal photos and curated media belong to their respective owners.
