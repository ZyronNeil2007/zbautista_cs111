# ZBAUTISTA CS111 — Personal Memories Website

**Version:** 2.3.0<br>
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
- A movie discovery page with a rotating featured title, categorized poster rows, trailer playback, and keyboard-accessible detail dialogs.
- A clean, standardized, modular folder architecture categorizing source code and assets by file type (`pages/`, `css/`, `js/`, and `img/`).

---

## ✨ Key Features

### 📂 1. Interactive 3D Memory Folders (`js/folders.js`)
- **Fanning Divider Tabs:** Mouse hover or focus expands folder tab dividers styled with curated warm gradient pairs.
- **Dynamic Page Flipping:** Use the mouse scroll wheel, on-screen `▲` / `▼` navigation buttons, or keyboard arrow keys (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`) to cycle through memory photos inside each folder.
- **Live Search Filtering:** Real-time filter box in the top navigation bar to quickly search memory folders by keyword with smooth scrolling to matching results.
- **Touch-Device Friendly:** Optimized pointer events with single-tap preview and tap-outside dismiss for touch displays.

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

### 🎨 5. Glassmorphic UI & Design System (`css/`)
- Dark crimson backdrop gradient (`#180308` to `#3a0912`) accented with frosted glass containers (`backdrop-filter: blur(12px)`).
- Fluid typography using Google Fonts: *Lilita One*, *Poppins*, and *Space Mono*.

### 🌄 6. Scenic Portfolio
- Full-width portfolio hero and About section use custom rice-field and school backgrounds.
- The responsive About panel presents the biography, interests, activities, and technical skills in one cohesive layout.

---

## 📁 Repository Structure

```text
zbautista_cs111/
├── index.html                   # Main landing page with 3D memory folders & portfolio
├── README.md                    # Project documentation & release details
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
│   ├── my_favorite_movie.js     # Movie billboard, poster rows, and details dialog
│   └── my_song.js               # Song playlist playback and now-playing controls
│
├── img/                         # Optimized image, audio, and video assets
│   ├── backgrounds/             # Portfolio backgrounds (neil_bg.jpg, ME_LANSCAPE_AT_RICEFIELD.png, bnhschool.png)
│   ├── childhood_memories/      # Early memories photograph assets
│   ├── family_relatives/        # Family gatherings & tribute photos
│   ├── icons/                   # Letter and UI iconography
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

---

## 📝 Changelog

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
