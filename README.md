# ZBAUTISTA CS111 — Personal Memories Website

**Version:** 2.0.0  
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
- Native HTML5 **Audio and Video media players** showcasing favorite music tracks (MP3) and movie trailers (MP4).
- A clean, standardized, modular folder architecture categorizing source code and assets by file type (`pages/`, `css/`, `js/`, and `img/`).

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
│   ├── my_favorite_movie.html   # 5 favorite films with posters, synopses & MP4 trailers
│   ├── my_friends.html          # 5 photo highlights with circles of friends
│   ├── my_song.html             # 5 songs with reflections & MP3 audio players
│   └── joke_time.html           # 5 clean, witty school & programming jokes
│
├── css/                         # Clean vanilla styling and design system
│   ├── landing.css              # Hero stage, topbar, 3D folder fan-out, and responsive grid
│   ├── portfolio.css            # Portfolio section, DNA helix layout, and design gallery
│   └── style.css                # Universal glassmorphic design system for content pages
│
├── js/                          # Client-side interactions & features
│   ├── dna.js                   # Interactive HTML5 Canvas double-helix scroll visualizer
│   ├── folders.js               # Interactive 3D folder card fan-out & page flipper
│   └── lightbox.js              # Fullscreen image viewer modal with keyboard & touch support
│
├── img/                         # Optimized image, audio, and video assets
│   ├── backgrounds/             # Hero background artwork (neil_bg.jpg)
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
- **Media Support:** Native browser `<audio controls>` for MP3 tracks and `<video controls>` for MP4 trailers.
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

## 📄 License & Attribution

Developed by **Zyron Neil A. Bautista** for academic purposes under the **CS111 (Introduction to Computing)** curriculum. All personal photos and curated media belong to their respective owners.
