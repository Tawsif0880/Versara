# Google Stitch — Versara UI Design Prompt

Copy/paste the content below into Google Stitch. If Stitch accepts a design system file, use the accompanying `DESIGN.md` to keep all screens visually consistent.

---

Design a complete responsive interface for **Versara** — a personal Progressive Web App that lets a user paste a YouTube song URL, plays the music video in a visible embedded YouTube player, and displays natural English translations of the song's lyrics synchronized to the exact currently sung line.

**Brand:** Versara  
**Tagline:** Feel the music. Understand every word.  
**Design style:** Minimal **dark claymorphism** (soft rounded clay-like surfaces, muted tactile 3D depth, subtle inset highlights, soft elevated shadows). It should feel like a premium, calm, friendly music app. Not childish, not overly vibrant, not glassmorphism, not neumorphism, not an analytics dashboard.

**Color palette:** Midnight plum background `#151420`; dark plum panels `#222033`; elevated panel `#302C47`; lavender primary `#C9A7FF`; peach supporting accent `#FFCFB8`; near-white text `#F8F6FF`; secondary text `#B3ADC7`; muted text `#868099`. Very limited use of accent color. Inter typography with multilingual-safe fallback. Cards 24–30px rounded; inputs 18px rounded; restrained soft tinted shadows.

**Design the following screens:**

1. **Mobile Home (390×844):** Top small Versara logo/wordmark and Settings gear. Spacious centered tagline. A prominent large URL input with link icon and placeholder “Paste a YouTube song link”. Rounded lavender “Open song” button. Below, a compact “Recent listens” song card area (can show one or two sample entries) and subtle “Install Versara” entry. No music discovery feed.

2. **Mobile Listening (390×844):** Header with back, Versara, settings. Visible 16:9 YouTube embedded video placeholder with realistic player aspect and space for native playback controls. Song title and artist. One large calm rounded lyric surface with `Both | English | Original` segmented control at its top; faded preceding lyric, large highlighted active English translation, smaller original-language line below it, and faded upcoming lyric. The active lyric must dominate. Small “Follow” chip only if needed. Under lyric card, slim timing-offset row `Sync  [−0.5]  +0.0s  [+0.5]  Reset`. Entire layout must be scrollable and accessible on small screens.

3. **Desktop Home (1440×900):** Centered content in a generous uncluttered frame. Same header, prominent paste-link input, lavender CTA, minimal recent songs. No sidebar.

4. **Desktop Listening (1440×900):** Top Versara header and compact paste-another-link field. Two-column centered layout. Left ~40%: YouTube iframe placeholder with native control space, title and artist, source language status and sync adjustment. Right ~60%: large, comfortable lyrics-reading panel with the original/English/both segmented control; one large active English line with smaller original script; adjacent previous and next lines faded. No overlapping UI elements.

5. **Loading / Processing:** Keep player shell visible and use a compact progress area indicating “Recognizing song”, “Finding synced lyrics”, then “Translating meaning” (with one step active). The user should feel the app is preparing the lyrics rather than performing a complicated workflow.

6. **Choose Lyrics / Edit Match:** Small mobile bottom sheet and desktop dialog with editable song/artist fields, a brief list of plausible LRCLIB matches with duration and a “Synced lyrics” indicator, and one confirm button.

7. **No Lyrics / Error / Install instructions:** Create a state of the same player screen with “Synced lyrics unavailable” and one recovery action, and a minimal settings sheet that includes PWA installation instructions (Android add/install from browser, iPhone Share → Add to Home Screen, desktop install).

**Important behavior annotations for developer handoff:**
- Tapping a translated lyric should seek to its timestamp (where timed lyrics exist).
- English lyrics highlight according to actual YouTube player time; show pause/seek correctly.
- Original/English/Both control is interactive, default Both.
- Manual scroll disengages lyric auto-follow until the user taps Follow.
- Auto-highlight/scroll should be subtle rather than dramatic.
- Input URL, match selection, timing correction and settings controls must look genuinely usable.
- Make app installable from a home-screen icon; emphasize an app-like layout and mobile safe areas.
- The YouTube iframe is a real embedded player in implementation, not a full-screen album-art illustration and not audio-only.

**Output expected:** A consistent responsive screen family, clear component states and design tokens suitable for React + Tailwind implementation. Use placeholders for sample lyrics, not song excerpts. Preserve a simple UI with one main action per screen. All screens must use the same brand system.
