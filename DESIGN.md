---
name: QUANT
description: Quiet premium savings ledger — navy, gold, and cream for goal-led money work.
colors:
  primary-dark: "#0A0F1A"
  primary-dark-alt: "#131B2E"
  primary-sheen: "#25375A"
  gold: "#D4B16D"
  gold-light: "#F4E0A5"
  gold-deep: "#A88B52"
  cream: "#F8F4EC"
  ivory: "#FBFAF7"
  taupe: "#5C574F"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.85rem, 7vw, 3.1rem)"
    fontWeight: 300
    lineHeight: 1.28
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.45rem, 4.5vw, 2rem)"
    fontWeight: 300
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 300
    lineHeight: 1.375
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 300
    lineHeight: 1.55
    letterSpacing: "0.01em"
  label:
    fontFamily: "Manrope, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.12em"
  money:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "1.5rem"
    fontWeight: 300
    lineHeight: 1.3
    letterSpacing: "0.02em"
  engraved:
    fontFamily: "Cinzel, Georgia, serif"
    fontWeight: 400
    letterSpacing: "0.16em"
rounded:
  md: "0.375rem"
  lg: "0.5rem"
  card: "0.75rem"
spacing:
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  section: "20px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-navy:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    typography: "{typography.label}"
  surface:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "20px"
  surface-navy:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "20px"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
    typography: "{typography.body}"
---

# Design System: QUANT

## Overview

**Creative North Star: "The Private Ledger"**

QUANT looks and feels like a quiet private ledger — composed navy ink on warm cream paper, with gold reserved for signal and ceremony. The system favors light serif display for titles, calm sans for reading, and tabular mono for money. Density is operational but unhurried: surfaces are white cards with soft shadow and hairline ink borders, never nested card stacks or loud fintech chrome.

Expression lives in typography pairing, gold scarcity, and navy fields — not in purple gradients, glow stacks, or pill clusters. Mobile and desktop share the same language; layout compresses, identity does not.

**Key Characteristics:**
- Navy / gold / cream as the only brand triad
- Serif for titles, sans for UI, mono for money, Cinzel for the QUANT mark
- Soft elevation + 1px ink borders (not heavy drop shadows)
- `rounded-lg` controls, `rounded-card` (12px) surfaces
- Uppercase tracked labels used sparingly as section kickers

## Colors

A restrained navy–gold–cream ledger palette. Gold is accent, not fill.

### Primary
- **Ink Navy** (`#0A0F1A`): Primary text, navy buttons, nav rail, hero metric tiles (`surface-navy`).
- **Sheen Navy** (`#131B2E` / `#25375A`): Gradients on nav and navy button sheen — depth within navy, not a second brand color.

### Secondary
- **Ledger Gold** (`#D4B16D`): Eyebrows, active nav, chart rims, primary/accent buttons, progress fills, focus rings.
- **Gold Light / Deep** (`#F4E0A5` / `#A88B52`): Hover lifts and divider metallics.

### Neutral
- **Warm Cream** (`#F8F4EC`): Page canvas.
- **Ivory** (`#FBFAF7`): Soft alternate paper.
- **Taupe** (`#5C574F`): Secondary/body muted text and field labels.
- **White** (`#FFFFFF`): Elevated surfaces and fields.

### Named Rules
**The Scarce Gold Rule.** Gold appears as signal (eyebrow, active state, chart accent, primary CTA). Do not flood backgrounds with gold.

**The Ink-on-Cream Rule.** Body text is navy on cream or cream on navy — never gray-on-color that loses the ledger warmth.

## Typography

**Display Font:** Newsreader (Georgia fallback)  
**Body Font:** Manrope (Helvetica fallback)  
**Money Font:** IBM Plex Mono (Consolas fallback)  
**Engraved Mark:** Cinzel (Georgia fallback)

**Character:** Editorial light serif for page titles; quiet geometric sans for operations copy; mono only for amounts and counts.

### Hierarchy
- **Display / page-title** (300, clamp ~1.85–3.1rem): Primary page headlines.
- **Headline / section-title** (300, clamp ~1.45–2rem): Major in-page sections.
- **Title / card-title** (300, ~1.25rem): Card headers.
- **Body** (300, 15px / 1.55): Default reading text; lede uses taupe.
- **Label / eyebrow** (400, 12px, uppercase, tracking 0.12–0.16em): Section kickers and field labels — gold for eyebrows, taupe for field labels.
- **Money** (300, tabular nums): All currency and portfolio figures.

### Named Rules
**The Money Mono Rule.** Currency and numeric KPIs use IBM Plex Mono; do not costume body UI in monospace.

## Layout

Operate mode: 12-column style grids (`lg:grid-cols-12`) with `gap-4` / `space-y-5` section rhythm. Page shell uses cream canvas; content sits in white `surface` / `stat-tile` cards. Page headers pair eyebrow + page-title + page-lede, with optional actions right-aligned on `md+`. Mobile stacks; desktop splits metrics / charts / activity.

## Elevation & Depth

Tonal layering first: white on cream, navy islands for emphasis. Shadows are soft and offset (`shadow-soft`, `shadow-lift`) — ambient paper lift, not neon glow.

### Shadow Vocabulary
- **Soft surface** (`0 1px 1px rgba(10,15,26,0.04), 0 8px 28px rgba(10,15,26,0.06)`): Default cards.
- **Lift** (`0 12px 32px rgba(10,15,26,0.08)`): Modals.
- **Hairline border** (`1px solid rgba(10,15,26,0.06–0.10)`): Always paired with soft shadow on surfaces.

### Named Rules
**The Flat-Paper Rule.** No zero-offset colored halos. Depth = soft offset shadow + ink hairline.

## Shapes

Gently curved ledger corners: controls and chips use ~8px (`rounded-lg` / `rounded-md`); cards and modals use 12px (`rounded-card`). Avoid full pills on primary actions.

## Components

### Buttons
- **Shape:** Gently rounded (8px / `rounded-lg`)
- **Primary / accent:** Gold fill, navy text, uppercase tracked label
- **Navy:** Navy gradient sheen, cream/white text, thin gold-tinted border — primary operational CTA
- **Ghost:** Transparent with ink border; hover softens fill
- **Hover / active:** 200ms `ease-out-expo`; slight scale on press

### Cards / Containers
- **Corner Style:** 12px card radius
- **Background:** White (or navy for hero metrics)
- **Border:** 1px ink at ~8% opacity
- **Internal Padding:** Typically 20px (`p-5`)

### Inputs / Fields
- **Style:** White fill, ink border ~12%, 8px radius
- **Focus:** Gold border + soft gold ring (`0 0 0 2px rgba(212,177,109,0.2)`)
- **Label:** Uppercase taupe tracked micro-label

### Navigation
- Fixed navy gradient rail on large screens; gold inset bar + gold text for active item; collapsed icon mode supported. Mobile uses bottom/tab-style items with the same navy/gold language.

### Charts (signature)
- Histogram bars: multi-color QUANT palette with soft vertical gradient + solid top rim
- Line/area: gold stroke with soft gold fill; navy tooltips with cream/gold type

## Do's and Don'ts

### Do:
- **Do** use eyebrow + serif title + taupe lede for page headers.
- **Do** put money in IBM Plex Mono with light weight.
- **Do** keep gold scarce — accents, active states, primary emphasis.
- **Do** use `rounded-lg` on buttons/selects to match Log Expense / navy CTAs.
- **Do** design for phone and desktop with the same identity.

### Don't:
- **Don't** introduce Inter, purple gradients, or generic SaaS card grids as the page structure.
- **Don't** nest cards inside cards or wrap every metric in a competing chrome frame.
- **Don't** use `rounded-full` pills for primary filters/actions when the system uses `rounded-lg`.
- **Don't** invent social proof, testimonials, or brand claims not in PRODUCT.md.
- **Don't** replace navy/gold/cream without an explicit redesign request.
