# Versara

An installable, personal music companion: open a YouTube song, match its lyrics on LRCLIB, and follow the original words alongside contextual English translations. Built from `CODEX_BUILD_PROMPT.md`, `Versara_PRD.md`, `DESIGN.md`, and the included Stitch exports.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. In Windows PowerShell, use `Copy-Item .env.example .env.local`. If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm` in these commands; changing your execution policy is unnecessary.

Edit `.env.local` and restart the server:

| Variable               | Purpose                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY`         | Groq API key for AI song identification and English translation. Without it, playback and manual title searches still work.           |
| `TRANSLATION_API_KEY`  | Optional legacy alias for the provider key. `GROQ_API_KEY` takes precedence.                                                          |
| `TRANSLATION_BASE_URL` | Provider API root. Defaults to `https://api.groq.com/openai/v1`; the server appends `/chat/completions`.                              |
| `TRANSLATION_MODEL`    | Defaults to `qwen/qwen3.8-27b`, used for both identification and translation.                                                         |
| `YOUTUBE_API_KEY`      | Optional YouTube Data API v3 key for video metadata. Without it, the app tries public oEmbed metadata and supports manual correction. |
| `LRCLIB_USER_AGENT`    | Optional public client identifier/contact for LRCLIB requests.                                                                        |

Secrets are used only in server routes. Do not prefix them with `NEXT_PUBLIC_`. There is no account system, hosted database, or analytics.

Groq configuration:

```dotenv
GROQ_API_KEY=your_groq_key
TRANSLATION_BASE_URL=https://api.groq.com/openai/v1
TRANSLATION_MODEL=qwen/qwen3.8-27b
```

Qwen receives public YouTube video metadata (title, uploader, and description when available) and extracts the actual song name regardless of title/artist ordering. It does not listen to the video. LRCLIB first searches using **song title and artist**, and candidate ranking favors the detected artist. If that search finds nothing, it falls back to the song title alone, then a broad title query. Leave the artist blank in **Edit match** to search without it. Ambiguous recordings remain selectable. If AI identification fails, enter the song title in **Edit match**. Old sessions are identified again once, and sessions without lyrics retry identification when reopened.

Groq's [Qwen 3.8 reference](https://console.groq.com/docs/model/qwen/qwen3.8-27b) documents the model ID. Groq requests use JSON mode with hidden reasoning and instruct mode to keep responses parseable.

## Use

1. Paste a YouTube watch, `youtu.be`, or `music.youtube.com` link and choose **Open song**.
2. Press **Play** in Versara. The compact listening screen shows the song thumbnail, original and translated current line, next line, seek bar, play/pause, 10-second skip, mute, and volume controls. The underlying YouTube player stays mounted and supplies the actual playback clock; the video is hidden by default.
3. Check **Edit match** if title detection is imperfect or there are multiple recording versions. Choose a candidate to override matching.
4. Switch **Both / English / Original** without interrupting playback. Click a timed lyric to seek to that moment.
5. Adjust **Lyrics sync** in 0.5-second steps between −30 and +30 seconds. A **+12 s** offset means lyrics appear 12 seconds later, accounting for an extra video intro.
6. **All lyrics** opens the full scrollable timeline; scrolling pauses automatic following, and **Follow** returns to the current lyric. **Focus view** returns to the compact layout. **Sync** opens timing adjustments in Settings, along with translation regeneration and local-data clearing.

**Show video** reveals the same player without restarting playback. If a browser blocks scripted playback, Versara automatically reveals it and asks for a native Play tap. Mobile browsers can restrict programmatic volume; use the phone's hardware volume buttons if the in-app slider has no effect. Hidden playback and custom controls do not guarantee background or lock-screen audio.

Only actual timed lyrics receive playback highlighting. Plain lyrics show **Timing unavailable** and cannot seek the player. Original words remain available if translation fails. YouTube restrictions and missing lyric matches have recovery controls.

The last 20 sessions are kept in IndexedDB, including selected lyrics, translations, and offsets. Translation mappings are also cached by recording ID, target language, version, and an exact original-line signature, so different videos of the same recording can reuse them. Offsets are stored separately per video and recording. Storage failures do not prevent listening.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser suite runs the production build, starts and stops a local server on port **3107** independently of your development server, and uses installed **Google Chrome**. Install Chrome first, or change `channel` in `playwright.config.ts` to your installed browser. If using Playwright's bundled Chromium instead, remove `channel` and run `npx playwright install chromium`. For a non-Windows machine, change the config's web-server command from `npm.cmd run start -- --port 3107` to `npm run start -- --port 3107`.

Tests cover URL validation, metadata normalization, LRC parsing, timestamps and offsets, pause/seek calculations, translation ID validation and retry, API rate limits, match selection, plain/no-lyrics/error states, view modes, follow, history, PWA assets, offline shell, and horizontal overflow at 360, 390, 430, 1024, and 1440 pixels. Browser fixtures use a controlled YouTube clock and synthetic lyrics; they do not stream music or spend translation credits. Screenshots are written to `test-results/`.

Live provider translation and actual YouTube playback require a separate manual smoke test with internet access and your provider key. Home-screen installation should also be checked on your actual Android/iPhone devices; desktop browser automation cannot certify native mobile installation.

## Production and installation

```sh
npm run build
npm run start
```

Deploy to a Node.js host supporting Next.js App Router and server routes (for example, Vercel or a Node server behind an HTTPS reverse proxy). Configure environment variables in the host's secret settings. Static-only hosting cannot run the metadata, lyrics, and translation routes. Allow outbound HTTPS to YouTube/Google, LRCLIB, and your translation provider. Keep the default referrer behavior so YouTube can identify the embed origin.

The production service worker caches the first-party shell and static assets. It does **not** cache API responses, YouTube requests, or remote music files. Saved text remains in IndexedDB. Playback and new lyrics/translations require internet. Service-worker registration is disabled in development to avoid stale development assets. After changing its caching strategy, increment `CACHE` in `public/sw.js`; use DevTools → Application → Service Workers to unregister a worker while troubleshooting.

- **Android / Chrome:** Choose **Install app** in Versara when the native prompt is available, or browser menu → Install app / Add to Home screen.
- **iPhone / iPad / Safari:** Share → Add to Home Screen → Add. Versara includes these instructions because iOS does not expose Chromium's install prompt.
- **Desktop / Chrome or Edge:** Use the address-bar install icon, the app's install entry, or the browser install menu.

Production installation requires HTTPS; localhost is supported for development. The manifest includes standalone display, 192/512 icons, a maskable icon, and an Apple touch icon. Recreate icons with `npm run icons`.

## Project map

- `src/components/versara-app.tsx`: home, listening, match picker, settings, and installation UI.
- `src/components/youtube-player.tsx`: official IFrame API lifecycle and player-time sampling (180 ms while playing or paused to detect native seeks; 500 ms in other states).
- `src/components/playback-controls.tsx`: accessible play/pause, seek, skip, mute, volume, and video visibility controls.
- `src/lib/lyrics.ts`: parser, binary-search timeline, and match ranking.
- `src/lib/cache.ts`: bounded IndexedDB history and recording resources.
- `src/app/api/`: metadata, LRCLIB, validated translation, and capability endpoints.
- `public/sw.js`: first-party offline shell; `src/app/manifest.ts`: PWA manifest.

API reference sources: [LRCLIB](https://lrclib.net/docs), [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [YouTube video metadata](https://developers.google.com/youtube/v3/docs/videos/list), and [Next.js App Router](https://nextjs.org/docs/app). The original brief and design exports are preserved.
