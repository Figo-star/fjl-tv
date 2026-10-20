# FramexTV Reference Audit & Technical Reverse Engineering Report

## Executive Summary
This document records the reverse engineering audit of **[FramexTV](https://framextv.cc/)** conducted via network inspection, AST/bundle decomposition, and endpoint probing. The audit distinguishes directly verified observations from implementation assumptions and provides the architectural blueprint for **FJL TV**.

---

## 1. Environment & Architecture Analysis

### Frontend Architecture
- **Framework**: Vite + React single-page application (SPA), styled with Tailwind CSS, Lucide icons, and React Router.
- **Color Palette & Design Language**: 
  - Obsidian/Zinc dark theme (`#09090b` theme color, `bg-zinc-950`).
  - Dark glassmorphism (`backdrop-blur-md`, subtle border highlights `border-white/10`).
  - High-contrast typography with clear hierarchy (Hero spotlight, discovery horizontal carousels, responsive grid).
- **Core Route Structure**:
  - `/`: Home discovery page with hero spotlight, Continue Watching rail, and curated category rails.
  - `/movies`: Filterable movies catalog (Popular, Top Rated, Now Playing, Upcoming).
  - `/tv`: TV series catalog with season and episode browsing.
  - `/anime`: Dedicated anime catalog with ongoing and popular Japanese animation.
  - `/movie/:id` & `/tv/:id` & `/anime/:id`: Detail view with backdrop header, metadata, synopsis, cast, recommendations, and episode picker.
  - `/watch/:id`, `/watch/:id/:season/:episode`: Cinematic player route with server selection, subtitle customizer, and playback tracking.
  - `/search`: Instant multi-category search with debouncing and genre filtering.
  - `/history` & `/my-list`: Local storage persistence for watch progress, resume points, and favorites.

---

## 2. API & Playback Provider Analysis

### Upstream Backend & APIs
- **Backend Host Configuration**: 
  - Identified endpoints in `config.js`: `https://api.framextv.tech`, `https://api.framextv.xyz`, `https://api.framextv.cc`.
  - When queried directly, these endpoints return Go backend metadata (`{"status":"ok","name":"FrameX TV Go Backend","version":"1.0.0"}`).
- **Data Source Verification**:
  - The catalog structure conforms directly to standard TMDB (The Movie Database) metadata formats (IDs, poster paths, backdrops, episode numbering).
- **Player & Streaming Architecture**:
  - Third-party embed networks (e.g., VidLink, Videasy) are used for ad-supported on-demand content.
  - FramexTV's internal player leverages standard HLS (`.m3u8`) video elements with custom overlay controls (Cast, Subtitles, Quality switcher, Speed).

---

## 3. Playback Compliance & FJL TV Principles

1. **Separation of Content Metadata & Playback**:
   - FJL TV uses a decoupled provider interface (`MediaProvider`), keeping metadata independent from streaming backends.
2. **Authorized & Demo Streams**:
   - Complies strictly with copyright and stream authorization rules.
   - Includes verified, authorized public test streams (Apple HLS test streams, Big Buck Bunny, Tears of Steel, Sintel, Elephant's Dream) featuring multiple adaptive bitrates (1080p, 720p, 480p, 360p) and clear error handling.
3. **Robust Fallbacks & State Resilience**:
   - Gracefully handles offline sources, format rejections, network errors, and mobile autoplay restrictions.
4. **Local State Hygiene**:
   - Bookmarks ("My List") and progress ("Continue Watching") are stored in client-side `localStorage` without requiring tracking cookies or server-side DB bloat.

---

## 4. Inaccessible Features & Deliberate Exclusions
- **Private Backend Go Binaries**: FramexTV's proprietary scraping/proxying Go backend is closed-source; FJL TV implements an original, lightweight TypeScript API and media provider layer.
- **Adware/Popups**: FramexTV embeds contain third-party popups. FJL TV eliminates all aggressive adware, popups, and tracker scripts in favor of a clean, cinematic experience.
