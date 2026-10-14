# Codex Implementation Brief — Versara

You are a senior full-stack TypeScript developer building a personal installable PWA named **Versara**.

**Read before coding:**
1. `Versara_PRD.md` — source of truth for requirements, state machine, data contracts, errors and acceptance tests.
2. `DESIGN.md` — source of truth for brand, layout, colors, typography, claymorphism and responsive behavior.
3. `STITCH_PROMPT.md` — screen inventory and interaction requirements.
4. Any exported Google Stitch screen images, HTML/CSS or design assets provided with this handoff. Match them as closely as possible without sacrificing functionality.

## Goal
Build a **fully functioning** responsive PWA, not just a design-only landing page. User pastes a YouTube music link; Versara identifies the song, fetches LRCLIB timed lyrics, generates English translations that preserve lyrical meaning, and highlights lyrics in synchronization with the official embedded YouTube player's current position. The app must be installable from supported mobile home screens and desktop browsers.

## Strict technical scope
- Next.js App Router + TypeScript + Tailwind CSS, single repository.
- Keep design minimal and mobile-first, using the `DESIGN.md` soft dark claymorphism tokens.
- YouTube IFrame Player API for actual playback timing; no mocked video playback in production.
- YouTube Data API v3 for metadata when `YOUTUBE_API_KEY` is provided; graceful metadata fallback and editable song+artist if unavailable.
- LRCLIB documented API with `/api/get`, `/api/search`, proper query parameters, rate-limit handling, and match picker.
- LRC parser with sorted timestamped segments and unit tests. No fake synchronization for plain lyrics.
- Translation via server-side configurable LLM provider; include example environment variables in `.env.example`, never leak secret API keys into browser code.
- LLM must preserve line IDs, never rewrite timestamps; schema-validate and retry malformed responses once.
- Implement `effectiveLyricsTime = YouTubeCurrentTime - offsetSeconds` and active line selection using a simple efficient algorithm.
- Both / English / Original toggle, lyric-click seek, Follow mode, per-song offset, loading/error states and local caching.
- PWA manifest, 192/512 icons, Apple touch icon, display standalone, lightweight offline shell, install affordance and iOS A2HS instructions.
- Use local IndexedDB to cache recent song IDs, selected lyrics, translations and timing offsets; do not require a database or login.
- Respect mobile safe areas, keyboard navigation, reduced motion, and responsive breakpoints.

## Build sequence

1. Scaffold project, styling, layout shell, tokens, starter PWA manifest and valid icon placeholders/assets.
2. Build Home and Listening screens, matching the exported Stitch designs; keep screens functional with empty/loading states.
3. Implement YouTube URL parser and player hook with robust cleanup on song changes.
4. Implement song metadata normalization and editable title/artist fields.
5. Implement LRCLIB client, matching, record picker and LRC parser.
6. Implement translated lyric schema + server API + cache.
7. Wire synchronization and offset controls to actual player time.
8. Implement installation guidance and PWA service-worker/offline-shell behavior.
9. Add tests and error cases, audit responsive layout and accessibility, verify production build.

## Testing to include

- URL parsing accepts watch, youtu.be and music.youtube.com URLs, rejects unrelated domains.
- Parser handles `[mm:ss.xx]`, empty lines and repeated timestamps.
- Active line selection correct at boundaries, with positive and negative offsets, after seeking and on pause.
- Translation line mapping rejects duplicates, missing IDs and timestamp changes.
- LRCLIB search ranks an exact synced record above poor partial matches; user can override.
- UI degrades gracefully for plain lyrics only, no lyrics, failed translation and unavailable video.
- Desktop and mobile layouts do not horizontally overflow.
- Manifest is valid, production build passes and service worker does not cache remote music files.

## Completion requirements

- Run lint, type checking, unit tests and a production build; fix issues.
- Provide a short README: setup, `npm install`, `.env.local` from `.env.example`, `npm run dev`, testing commands, deployment with HTTPS, PWA install steps for Android and iPhone.
- Avoid speculative features not listed in v1: accounts, playlists, social features, analytics, audio downloads or giant UI frameworks.
- If any external API key is missing, implement a graceful runtime notice or setup instructions; do not fabricate success or hardcode real credentials.

**Do not only create static mockups. The acceptance tests in `Versara_PRD.md` determine completion.**
