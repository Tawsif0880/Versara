---
version: alpha
name: Versara
description: Minimal dark claymorphism design system for an installable AI-synced translated-lyrics music companion.
colors:
  background: "#151420"
  surface: "#222033"
  surfaceRaised: "#302C47"
  border: "#49445F"
  primary: "#C9A7FF"
  primaryText: "#151420"
  secondaryAccent: "#FFCFB8"
  textPrimary: "#F8F6FF"
  textSecondary: "#B3ADC7"
  textMuted: "#868099"
  success: "#9EE4C1"
  danger: "#FF9C9C"
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
  heading:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.25
  lyricActive:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
rounded:
  sm: 12px
  md: 18px
  lg: 24px
  xl: 30px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# Versara Design System

## Overview

Versara is a **minimal dark claymorphism** music companion. Its tone is calm, emotional, cozy and premium, not childish. Surfaces should seem delicately molded from matte soft clay: generous curves, soft raised cards, tinted outer shadows and subtle inset top-edge highlights. Keep the interface lightweight and simple. The *lyrics*, not the decoration, are the star.

**Product signature:** Music video + one prominent English translation that changes with the singer. A highly readable experience matters more than decorative 3D.

**Style request interpretation:** The user called this style “clamorphism”; use the established visual direction **claymorphism**, adapted to a dark music interface.

## Colors

- Background `#151420`: deep midnight plum throughout app.
- Surface `#222033`: panels, player container, lyric container.
- Raised surface `#302C47`: selected control, emphasized elevated card.
- Lavender `#C9A7FF`: primary button, active lyric detail, focus ring, selection.
- Peach `#FFCFB8`: sparse, warm supporting accents (never entire large lyric paragraphs).
- Primary text `#F8F6FF`; secondary text `#B3ADC7`; muted inactive lines `#868099`.
- Borders `#49445F`, used sparingly for focus and segmentation.
- Success `#9EE4C1`, danger `#FF9C9C`.

Keep accent usage disciplined. Do not introduce vivid rainbow gradients, saturated neon blues or multiple competing CTA colors.

## Typography

- Font: Inter (system fallback); include an appropriate multilingual Unicode font fallback, e.g. Noto Sans for scripts the chosen font cannot display well.
- Versara wordmark: calm, semibold, simple; no complex logo illustrations.
- Active translated lyric: **24 px desktop, 21–22 px mobile**, weight ~650, line height 1.4; maximum comfortable line width.
- Original text under active English translation: 15–17 px and secondary color.
- Inactive lyrics: 15–18 px muted; preserve enough contrast to read.
- Regular interface body: 15–16 px; small metadata 12–14 px.
- Never apply all-caps styling to lyrical content.

## Layout

- Mobile-first widths: 360, 390, 430 px. Main padding 16 px; 12–20 px gaps. Respect safe-area insets.
- Desktop reference: 1440×900 with centered 1200 px maximum content.
- Desktop listening: 40% player/details column and 60% lyrics column (approximately); gap 24–28 px.
- Header: Versara mark left, Settings right; URL input centered on home and compact on desktop listening.
- Video uses a visible official YouTube iframe with a 16:9 region and its own player controls.
- Mobile listening order: header → video → title/artist → translation mode → large lyrics card → timing controls.
- Desktop listening order: header/top URL → video/details/offset left → translated lyrics panel right.
- No left nav bar, no social feed, no playlists, no mini analytics panels.

## Elevation & Depth

Apply restrained clay depth to **primary URL card**, **video outer card**, **lyric container**, and **primary CTA** only.

- Example dark-clay card shadow: `0 12px 28px rgba(7,5,17,0.38), inset 2px 2px 3px rgba(255,255,255,0.07), inset -3px -4px 8px rgba(6,5,16,0.22)`.
- Selected pill: small outer shadow and subtle raised look. Unselected segments stay simple and flat.
- Avoid blurred backgrounds and layered glass overlays that compete with lyric text.
- On press, a button can move down 1–2 px and its shadow can reduce. Respect reduced-motion preferences.

## Shapes

- Card radius 24–30 px.
- Inputs radius 18 px.
- Buttons radius 18–20 px; lightweight secondary actions can use pill shapes.
- Segmented control: one soft, contained pill with a clear selected state.
- Iconography: simple thin/medium-stroke line icons; don't use illustrative 3D icons in every row.
- Any album/video thumbnail must keep correct aspect ratio and visual hierarchy.

## Components

### Header
Simple Versara wordmark with small optional musical note mark. Settings gear at top right. On mobile, provide Back within listening view.

### URL input
Large, readable input with link icon, placeholder “Paste a YouTube song link”, keyboard Enter submission, clear action, and immediately adjacent primary **Open song** CTA.

### Primary CTA
Lavender fill, dark text, rounded 18–20 px, gentle inflated clay depth, one clear action label. Disabled/loading states must be visibly different.

### YouTube player card
Rounded clay outer frame around a straightforward 16:9 video iframe. Never place opaque UI over player controls. The video itself must remain visible.

### Song heading
Single strong title and subdued artist. Small linked metadata actions such as **Edit match** or **Choose lyrics**.

### Lyrics card
The main screen hero. English active line is largest and most prominent. Original active line below it in smaller muted type. Show previous/next lyrics above/below. Display mode segmented control at top: `Both | English | Original` (default Both). Optional `↓ Follow` button floats in the card footer when the user scrolls away.

### Sync adjustment
Small unobtrusive row: `Sync  [−0.5]  +0.0s  [+0.5]  Reset`. Must be discoverable but secondary to reading lyrics.

### Install card
Soft compact utility prompt: “Add Versara to your home screen” with **Install** action or platform-specific instructions, not a full-page onboarding wizard.

### Errors and skeletons
Use small inline messages, gentle borders/accents, and one recovery button. Stage translation progress without forcing the user to stop playing.

## Do's and Don'ts

**Do**
- Keep 1 primary CTA per screen.
- Make the active translation immediately identifiable.
- Use soft depth with restraint.
- Preserve natural visibility and touch usability of the embedded video.
- Provide focus indicators, readable text contrast, and touch targets of at least 44×44 px.
- Keep installation easy to discover but optional.

**Don't**
- Design a full YouTube Music clone with recommendation feeds or playlists.
- Add an enormous navigation sidebar, fake charts, fake media controls, or many settings toggles.
- Use glassmorphism, strong neon glow, busy animations or excessive soft 3D layers.
- Put translations in floating popovers covering the video.
- Shrink lyric fonts to fit too many lines at once.
- Use decorative sample text that resembles a real copyrighted song in handoff mockups; use neutral placeholder lines.

## Screen Inventory

1. Home — desktop and mobile.
2. Song loading/progress — mobile; responsive desktop adaptation.
3. Listening/player with synced English lyrics — desktop and mobile.
4. Match-picker / edit-track bottom sheet.
5. Plain-lyrics/no-lyrics/translation-error state.
6. Settings and install guidance.

**Primary references:** `Versara_PRD.md` UX blueprint and `STITCH_PROMPT.md` screen-by-screen instructions.
