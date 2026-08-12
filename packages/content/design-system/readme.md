# Sports Force — Tech&Boost Design System

A design system reconstructed from the **Tech&Boost** marketing site by **Acial Design**
(株式会社Acial). Tech&Boost is the IT/DX-talent service under the **Sports Force** brand:
it takes **競技人材** (people with competitive-sports backgrounds) and develops them into
**PM型エンジニア** (project-manager-type engineers), pairing human "遂行力" (execution power)
with IT/DX skills to support client companies' growth.

> **Tagline (hero):** 競技力 ×IT/DXスキルで、唯一無二の遂行力を
> **Sub:** 競技人材をPM型エンジニアに育成し、企業の成長を支援

## Sources
- **Reference site:** https://tb.acial.co.jp/ — the only source provided.
- **Screenshot:** `uploads/screenshots-1782803514795.png` (mobile hero + results band). All
  colors and type treatments below were sampled/inferred from this single capture.
- **No codebase, Figma, or font files were provided.** Everything visual is reconstructed
  from the screenshot and is flagged where guessed.

## ⚠️ Substitutions & guesses to confirm (PLEASE REVIEW)
- **Fonts are substituted.** The site's licensed faces were not provided. We ship
  **Noto Sans JP** (headings/body) and **Figtree** (Latin numerals/eyebrows) from Google
  Fonts as the closest free matches. The "Sports Force" italic wordmark is **not** recreated
  as a webfont — we ship a cropped PNG of the logo instead (`assets/logo-sportsforce.png`).
- **Logo is a screenshot crop**, not the official vector. It has a faint grey background
  fringe and is for placeholder use only. Please send the real `logo_tb.svg`.
- **Gradient stops** were eyedropper-sampled from a compressed JPEG; treat the hexes as
  very close but not pixel-canonical.
- I only had the **hero + results** section. Other sections (service detail, flow, company,
  footer, full contact form) were not seen — components for those are reasonable extensions
  of the observed system, not copies of unseen screens.

---

## CONTENT FUNDAMENTALS
**Language:** Japanese-primary, with English used decoratively. Built bilingual (JP primary).

- **Voice:** confident, outcome-focused, B2B. Speaks about capability and results
  ("唯一無二の遂行力", "企業の成長を支援"), not features.
- **English as eyebrow / decoration.** Section labels appear as wide-tracked uppercase
  English *above* the real Japanese title — e.g. `RESULTS & CASE STUDIES` over `実績・事例`,
  rendered very faint (near-invisible watermark grey). English is a texture, not the message.
- **Japanese headings are short and punchy**, often with a key term in katakana/Latin
  (`PM型エンジニア`, `IT/DX`). Heavy weight carries the emphasis, not color.
- **Numbers are heroes.** Results are stated as large figures with a unit and a JP caption:
  `300+ / 導入企業数`, `94点 / 顧客満足度`. The numeral takes the gradient.
- **Casing:** English eyebrows are ALL CAPS, wide tracking. Buttons are JP sentences
  ("お問い合わせはこちら", "資料請求はこちら") — full phrases, polite form, often ending in こちら.
- **Punctuation:** JP uses ・ to join paired nouns (実績・事例), × to express combination
  (競技力 ×IT/DX). No exclamation marks; tone is composed, not hyped.
- **No emoji.** None observed; do not introduce them. Iconography is line-style glyphs only.
- **Person:** addresses the client company in implied second person ("企業の成長を支援");
  speaks of its talent in third person ("競技人材を…育成し"). Avoid "私たち" chest-beating.

---

## VISUAL FOUNDATIONS
The system is **near-monochrome (white + ink) with one explosive signature**: a horizontal
**blue → magenta → red gradient**. The gradient is the brand; everything else gets out of its way.

- **Color:** white page, near-black ink (`#0E0E10`) text, grey secondary text. The only
  chromatic element on most views is the gradient (`--sf-gradient`,
  `#0A33FF → #8330C7 → #E62F9A → #FF2C61 → #FF2E0D`). Solo accent when a flat color is needed
  is the magenta midpoint `#E62F9A`. Status colors exist but are utilitarian.
- **Gradient usage:** (1) the primary CTA pill fill, (2) clipped into big numerals/stats,
  (3) a short underline bar under section titles, (4) the on-state of toggles, (5) a 4px
  top strip on highlight cards. Direction is ~90° (horizontal) for bars/text, 135° for fills.
- **Type:** heavy Japanese gothic (900 for display/H2, 700 for sub-heads), tight leading
  (~1.1). Body is Noto Sans JP ~16px, line-height 1.8, letter-spacing slightly open (0.02em)
  for JP legibility. Latin eyebrows are 13px, 0.22em tracking, uppercase, faint grey.
- **Backgrounds:** predominantly flat white. The hero uses a **full-bleed photo** (athletes
  / sport) under a dark scrim (`--scrim-photo`) with white text. No decorative gradients on
  background fills, no patterns/textures, no noise. Light page-tint `#F7F7F9` separates
  stacked white sections.
- **Imagery:** real photography — sport, training, people — warm-leaning, cinematic, with a
  dark gradient scrim so white type and the gradient CTA pop. Not illustrated, not b&w.
- **Corners & shape:** actions are **full pills** (`--radius-pill`); the nav "お問い合わせ"
  button and hero CTA are both fully rounded. Cards use 16px radius. Inputs 12px.
- **Cards:** white surface, 1px hairline border (`--border-subtle`), soft *neutral* shadow
  (`--shadow-md`), generous 24px padding. Optional gradient top-strip for emphasis. No
  colored left-borders, no heavy drop shadows.
- **Shadows:** soft, low-opacity, neutral (black at 6–14%). The one colored shadow is the
  **brand glow** under gradient CTAs (`--glow-brand`, magenta + blue ambient).
- **Borders:** hairline 1–1.5px in `--ink-200/300`. Focus state thickens to 1.5px magenta
  plus a soft magenta ring (`--focus-ring`).
- **Hover:** buttons lift 1px + brighten slightly (gradient) / fill with tint (ghost/outline);
  cards lift 3px with a deeper shadow. **Press:** translate down 1px + scale 0.99.
- **Motion:** quick and clean. `--dur-base` 200ms on `--ease-out` (decelerate). Fades and
  small translates; no bounces, no infinite loops on content. Respect reduced-motion.
- **Transparency/blur:** used for photo scrims and an optional glass nav (`--blur-glass`).
  Not used decoratively elsewhere.
- **Layout:** centered container, max ~1120px, 24px gutters. Section headers are
  center-aligned (eyebrow + title + underline). Vertical rhythm is generous (96px desktop).

---

## ICONOGRAPHY
- **Observed:** a single line-style **chat/message bubble** glyph inside the hero CTA
  ("お問い合わせはこちら") and a hamburger menu in the nav. Both are thin-stroke monoline icons.
- **No icon font or sprite was available** from the site (no codebase access). For mocks and
  components, use **Lucide** (https://lucide.dev) — monoline, ~1.75px stroke, rounded caps —
  which matches the observed glyph weight. This is a **substitution**; flag it if exactness
  matters. Load from CDN: `https://unpkg.com/lucide@latest` or inline SVGs.
- **Stroke style:** thin (1.5–1.75px), rounded line-caps/joins, no fills, currentColor.
  On the gradient CTA the icon is white; on light surfaces it inherits ink/grey.
- **No emoji, no unicode-glyph icons.** Keep iconography monoline and restrained.
- **Logo asset:** `assets/logo-sportsforce.png` — "Sports Force" italic wordmark + magenta
  asterisk-star + "Tech & Boost". Reference crop only; request the vector.

---

## INDEX — what's in this system
**Root**
- `styles.css` — global entry (consumers link this). `@import`s only.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skill front-matter wrapper.

**`tokens/`** (all `@import`ed by `styles.css`)
- `colors.css` — gradient anchors, the signature gradient, ink scale, surfaces, status,
  semantic aliases.
- `fonts.css` — Google Fonts import (Noto Sans JP + Figtree). **Substituted — see flags.**
- `typography.css` — families, weights, scale, line-heights, tracking, eyebrow tokens.
- `spacing.css` — 4px scale, section rhythm, radii (incl. `--radius-pill`).
- `effects.css` — shadows, brand glow, focus ring, motion, scrims, `.sf-gradient-text` helper.

**`components/`** (React primitives — `window.SportsForceTechBoostDesignSystem_381be8`)
- `core/` — **Button** (gradient pill), **Badge**, **Card**.
- `forms/` — **Input**, **Switch**.
- `brand/` — **SectionHeading** (eyebrow + JP title + gradient underline), **Stat** (gradient
  numeral metric). These two encode the site's signature patterns.

**`cards/`** — foundation specimen cards (Colors, Type, Spacing, Brand) for the Design System tab.

**`assets/`**
- `logo-sportsforce.png` — logo reference crop (flagged).

---

## Using the gradient (cheat-sheet)
```css
/* fill */        background: var(--sf-gradient);
/* diagonal fill*/background: var(--sf-gradient-135);
/* text */        class="sf-gradient-text"   /* or clip manually */
/* glow */        box-shadow: var(--glow-brand);
```
Rule of thumb: **one gradient moment per view.** If two elements compete for it, demote one
to flat ink or the magenta accent.
