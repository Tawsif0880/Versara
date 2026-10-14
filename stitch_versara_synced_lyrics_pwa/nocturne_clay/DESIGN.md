---
name: Nocturne Clay
colors:
  surface: '#13121e'
  surface-dim: '#13121e'
  surface-bright: '#393845'
  surface-container-lowest: '#0e0d19'
  surface-container-low: '#1b1a26'
  surface-container: '#1f1e2b'
  surface-container-high: '#2a2935'
  surface-container-highest: '#353341'
  on-surface: '#e4e0f2'
  on-surface-variant: '#ccc3d2'
  inverse-surface: '#e4e0f2'
  inverse-on-surface: '#302f3c'
  outline: '#958e9b'
  outline-variant: '#4a4550'
  surface-tint: '#d6baff'
  primary: '#dfc9ff'
  on-primary: '#3d1d6d'
  primary-container: '#c9a7ff'
  on-primary-container: '#563786'
  inverse-primary: '#6d4e9f'
  secondary: '#ebbda6'
  on-secondary: '#46291a'
  secondary-container: '#603f2e'
  on-secondary-container: '#d8ac96'
  tertiary: '#d5cef1'
  on-tertiary: '#312d48'
  tertiary-container: '#b9b3d5'
  on-tertiary-container: '#494461'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ecdcff'
  primary-fixed-dim: '#d6baff'
  on-primary-fixed: '#270057'
  on-primary-fixed-variant: '#553685'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ebbda6'
  on-secondary-fixed: '#2e1507'
  on-secondary-fixed-variant: '#603f2e'
  tertiary-fixed: '#e5deff'
  tertiary-fixed-dim: '#c9c2e5'
  on-tertiary-fixed: '#1c1832'
  on-tertiary-fixed-variant: '#484360'
  background: '#13121e'
  on-background: '#e4e0f2'
  surface-variant: '#353341'
  surface-base: '#151420'
  surface-card: '#222033'
  surface-raised: '#302C47'
  surface-border: '#49445F'
  text-primary: '#F8F6FF'
  text-secondary: '#B3ADC7'
  text-muted: '#868099'
  feedback-success: '#9EE4C1'
  feedback-danger: '#FF9C9C'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '650'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '650'
    lineHeight: 28px
    letterSpacing: -0.01em
  lyric-active:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '650'
    lineHeight: 34px
    letterSpacing: -0.01em
  lyric-active-mobile:
    fontFamily: Inter
    fontSize: 21px
    fontWeight: '650'
    lineHeight: 30px
    letterSpacing: -0.01em
  lyric-sub:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  lyric-inactive:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system crafts an intimate, tactile audio companion dedicated to real-time translated lyrical discovery. The design language marries minimal functionalism with dark claymorphism—eschewing cold tech utility in favor of cozy, molded, matte physical surfaces that feel quiet and grounded.

### Personality & Tone
- **Calm & Atmospheric:** Midnight plum depths provide rest for the eyes during extended listening sessions, eliminating harsh luminance while preserving contrast.
- **Warm & Empathetic:** Gentle clay highlights, matte finishes, and subtle peach accents bring human warmth to an AI-powered experience.
- **Unobtrusive Elegance:** The interface recedes; typography and synchronized lyrical content stand as the absolute focus.

### Visual Style
- **Dark Claymorphism:** Thick, soft surfaces created through stacked tinted drop shadows and soft inset specular rims. Surfaces look pressed and molded rather than extruded or glossy.
- **Anti-Glassmorphism:** Strictly no blurred backdrops, glowing neon auras, or iridescent gradients. Surfaces are opaque, deep, and velvet-matte.

## Colors

The palette establishes an introspective nocturnal atmosphere anchored by deep plum foundations and restrained, high-legibility accents.

### Application Hierarchy
- **Canvas Base (`#151420`):** Full-bleed canvas background simulating a dark velvet room.
- **Clay Surfaces (`#222033` & `#302C47`):** Molded panel backdrops, YouTube player frames, and lyric scroll viewports. Raised variants denote floating modules and active segmented controls.
- **Primary Accent (`#C9A7FF`):** Reserved strictly for focal interactions—the single active primary action, active synchronized lyric text, keyboard focus rings, and active segment tabs.
- **Secondary Accent (`#FFCFB8`):** Used sparingly for ambient highlights, playback progress timestamps, and micro-badges. Never applied to extensive blocks of lyrics.
- **Text Hierarchy:** Near-white (`#F8F6FF`) ensures pristine readability against dark clay; secondary lilac-gray (`#B3ADC7`) handles original non-translated text and metadata; muted slate (`#868099`) dims past and future lyric lines without sacrificing scanability.

## Typography

Typography prioritizes continuous readability and multilingual legibility across dynamic musical tempos.

### Font Family & Script Support
- **Core Font:** Inter is utilized across all tiers for its uniform vertical metrics and neutral, humanist-grotesque legibility.
- **Script Fallbacks:** Global lyrics necessitate automatic font cascading (e.g., Noto Sans CJK, Noto Sans Devanagari, Noto Sans Arabic) to preserve identical line-height stability across diverse scripts.

### Lyrical Typographic Rules
- **No All-Caps:** Lyrical lines must never use uppercase transforms to maintain comfortable cadence and visual serenity.
- **Active Translated Hierarchy:** The translated English lyric receives primary optical dominance (`lyric-active`), followed immediately by the native source lyric (`lyric-sub`) set in secondary color at smaller scale.
- **Visual Rhythm:** Inactive lines retain enough luminance for predictive scanning without competing against the active sung line.

## Layout & Spacing

The layout employs a responsive two-track fluid architecture centered within a maximum container width of 1200px.

### Responsive Structure
- **Desktop (1024px+):** Asymmetric split pane. The left column (40% width) hosts the video player container, song heading, and sync calibration controls. The right column (60% width) houses the continuous scrollable translated lyrics canvas.
- **Mobile (<768px):** Single-column stacked vertical progression: Minimal Header → 16:9 Video Embed → Song Metadata & Translation Pill Bar → Full-Height Scrollable Lyrics Canvas → Fixed Bottom Sync Shelf.
- **Grid Gutters & Section Padding:** 24px desktop gutters allow substantial breathing room between the video anchor and lyrical output, compressing down to 16px on mobile viewports.

## Elevation & Depth

Tactile clay surfaces are sculpted using soft multi-layer box shadows combined with fine inset lighting. Surfaces appear opaque, soft-pressed, and non-reflective.

### Clay Elevation Levels

- **Base Canvas (Level 0):** Flat background (`#151420`), zero shadows.
- **Clay Cards & Video Frame (Level 1):** 
  - Outer Shadow: `0 12px 28px rgba(7, 5, 17, 0.45)`
  - Top Inset Highlight: `inset 2px 2px 3px rgba(255, 255, 255, 0.07)`
  - Bottom Inset Shadow: `inset -3px -4px 8px rgba(6, 5, 16, 0.25)`
  - Background: `#222033`
- **Raised Interactive Modules & Active Pills (Level 2):**
  - Outer Shadow: `0 8px 16px rgba(7, 5, 17, 0.35)`
  - Top Inset Highlight: `inset 1px 1px 2px rgba(255, 255, 255, 0.12)`
  - Bottom Inset Shadow: `inset -2px -2px 6px rgba(0, 0, 0, 0.3)`
  - Background: `#302C47`
- **Primary Action (Active Lavender Clay):**
  - Outer Shadow: `0 10px 24px rgba(201, 167, 255, 0.22)`
  - Top Inset Highlight: `inset 2px 2px 3px rgba(255, 255, 255, 0.4)`
  - Bottom Inset Shadow: `inset -2px -3px 6px rgba(89, 58, 140, 0.35)`
  - Background: `#C9A7FF`

### State Transitions
- **Hover:** Elevation expands subtly (`translateY(-1px)`).
- **Active / Pressed:** Physical displacement (`translateY(1.5px)`), with outer blur collapsing inward by 40%.

## Shapes

The geometric identity relies on generous, organic radii that communicate softness without drifting into toy-like or cartoonish forms.

### Radii Tokens
- **Containers & Major Panels:** 24px to 30px (`rounded-xl` to custom clay containers) to evoke smoothly rolled edges.
- **Inputs & Standard Cards:** 18px (`rounded-lg`) for compact yet cushioned bounds.
- **Interactive Buttons & Segment Controls:** 18px to 20px, transitioning to continuous capsules (`rounded-pill` / 999px) for mode selectors and sync micro-steppers.
- **Embedded Media:** YouTube frame wrapper matches surrounding card curvature (24px outer wrapper with 16px inner iframe overflow-clip).

## Components

### Buttons
- **Primary CTA:** Matte lavender (`#C9A7FF`) background, dark plum (`#151420`) bold label. Features top-left specular highlight inset and lavender ambient drop shadow.
- **Secondary CTA:** Surface-raised (`#302C47`) background, primary text (`#F8F6FF`), subtle border (`#49445F`).
- **Icon Buttons (Settings, Sync Steps):** Circular or soft-square 44×44px touch targets with embedded centered monochrome line icons (1.5px stroke).

### URL Import Bar
- Wide input field styled with an inset depression shadow simulating a clay trough: `inset 2px 2px 4px rgba(0,0,0,0.4)`. Accompanied by an internal link icon and an integrated primary "Open song" button docked right.

### Segmented Controls (Translation Mode)
- Encapsulated clay trough housing sliding pills for `Both | English | Original`. Inactive items sit flush with secondary text; the active mode raises into a Level 2 clay chip with crisp white-lilac text.

### Synced Lyrics Canvas
- **Active Lyric Card:** Soft elevated highlight container framing the active lyric. Contains the primary English translation in `lyric-active` scale and the native lyric in `lyric-sub`.
- **Follow Anchor:** A floating pill button (`↓ Follow`) emerges anchored at the bottom-right of the lyric pane when manual scrolling decouples from playback timecode.

### Sync Calibration Shelf
- Discreet inline micro-stepper: `Sync [ -0.5s ]  +0.0s  [ +0.5s ]  Reset`. Provides tactile feedback with low visual competition against the lyrics card.

### Inputs & Form Fields
- Dark plum fill (`#151420`), subtle outer boundary (`#49445F`), placeholder text styled in `#868099`. Focus state applies a 2px lavender glow ring (`#C9A7FF`).