# My Library - Reader App

A responsive single-page eBook reader inspired by the Google Play Books experience (all-original code, icons, and styles).

Tech stack: React + Vite + Tailwind CSS, ePub.js, PDF.js, idb-keyval, Service Worker.

## Install & Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Features

- Card-based library with 3:4 covers, rounded corners (8px), soft shadows, hover scale 1.02
- Top app bar with search, overflow menu; FAB for uploads
- Upload EPUB, PDF, TXT; stored in IndexedDB with per-book progress
- Reader view with Light/Sepia/Dark themes, adjustable typography and margins
- Swipe left/right for page transitions; slide/fade animations
- TOC panel (left) and Notes/Bookmarks panel (right)
- Offline: service worker caches the app shell

## Color & Typography Reference

Primary Palette (original, safe alternatives)

- Background Light: #F8F5E7
- Background Sepia: #F3E6D0
- Background Dark: #0E0F12
- Text Primary Light: #262626
- Text Primary Sepia: #2B2B2B
- Text Primary Dark: #E6E6E6
- Text Secondary: #666666
- Accent: #3B82F6 (hover: #2563EB)
- Card Background: #FFFFFF (dark card: #1A1A1A)
- Progress Filled: #3B82F6 / #2563EB / #60A5FA
- Progress Empty: #E5E7EB / #D1D5DB / #374151
- Highlights: Yellow #FFF59D; Green #A7F3D0; Pink #FBCFE8

Spacing & Layout

- Card radius 8px; shadow 0 2px 6px rgba(0,0,0,0.12); hover scale 1.02
- FAB 56x56, bottom-right 16px
- App bar 56px mobile, 64px desktop
- Grid gutter 16px desktop, 8px mobile

Typography

- Titles: Noto Sans, 16–18px
- Body: Noto Serif, 18–20px
- Secondary: Noto Sans, 14px

Animations

- Page slide: 300ms ease-in-out
- Panel slide: 250ms ease
- Hover scale: 150ms ease-out
- Toolbar fade: 200ms ease-in-out

## Notes

- EPUB and PDF rendering are integrated at a basic level. Additional pagination, TOC syncing, bookmarks, and highlights can be layered on top of the provided skeleton.
- All user data (books, progress) is local via IndexedDB.
