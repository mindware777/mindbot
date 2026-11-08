---
version: alpha
name: Mindbot — Hanji & Dancheong
description: A robotics community combining white hanji, deep ink, vivid dancheong colors, and subtle clay keycap depth.
colors:
  primary: "#59B69A"
  teal: "#318F83"
  coral: "#D78079"
  yellow: "#D8B94F"
  indigo: "#5269A1"
  lilac: "#B2A1BF"
  paper: "#FFFFFF"
  ink: "#272A28"
  light-surface: "#FAFAFA"
  light-muted: "#686D69"
  light-divider: "#E2E5E2"
  dark-background: "#1E211F"
  dark-surface: "#292D2A"
  dark-raised: "#333834"
  dark-text: "#F2F4F1"
  dark-muted: "#B0B6B1"
  dark-divider: "#424A44"
typography:
  headline:
    fontFamily: Noto Sans KR
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: -0.03em
  headline-mobile:
    fontFamily: Noto Sans KR
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: -0.03em
  article-title:
    fontFamily: Noto Sans KR
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.02em
  body:
    fontFamily: Noto Sans KR
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: Noto Sans KR
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: Noto Sans KR
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 6px
  keycap: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  section: 64px
components:
  page-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  page-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body}"
  keycap-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.keycap}"
  keycap-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.keycap}"
  keycap-dark-hover:
    backgroundColor: "{colors.dark-raised}"
    textColor: "{colors.dark-text}"
  selected-category:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.keycap}"
    height: 44px
  metadata-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.light-muted}"
  metadata-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-muted}"
  divider-light:
    backgroundColor: "{colors.light-divider}"
    height: 1px
  divider-dark:
    backgroundColor: "{colors.dark-divider}"
    height: 1px
  accent-marker-teal:
    backgroundColor: "{colors.teal}"
  accent-marker-coral:
    backgroundColor: "{colors.coral}"
  accent-marker-yellow:
    backgroundColor: "{colors.yellow}"
  accent-marker-indigo:
    backgroundColor: "{colors.indigo}"
  accent-marker-lilac:
    backgroundColor: "{colors.lilac}"
---

# Mindbot Design

## Overview

Mindbot is a minimal space for reading and sharing robotics news and stories.
Its identity combines **white hanji paper, deep muk ink, vivid dancheong colors, and subtle clay keycap depth**.
Place distinct color accents on generous neutral backgrounds that make reading comfortable.

Light mode and dark mode are two expressions of the same design, like the light and dark versions of the dancheong keyboard.
Preserve the layout, typography, and color identity across modes while adapting background and text brightness.

References:

- [MU:DS Dancheong Wired Keyboard — light and dark versions](https://muds.kr/products/dancheong-wired-keyboard)
- [Dark keyboard: ink keycaps, jade keys, and a dancheong spacebar](https://muds.kr/cdn/shop/files/5_d5539c11-f61c-46b5-9b70-60b1227edf1a.jpg?crop=center&height=420&v=1776838736&width=420)
- Local `white.jpg` and `white2.jpg`: references for hanji whiteness and paper fibers. The actual file extension is `.jpg`.

## Colors

### Foundations for both modes

| Role | Light mode | Dark mode |
| --- | --- | --- |
| Page background | White hanji `#FFFFFF` | Deep ink `#1E211F` |
| Raised surface | Neutral white `#FAFAFA` | Ink keycap `#292D2A` |
| Elevated surface | Subtle highlight and shallow shadow | Lighter ink `#333834` |
| Primary text | Ink `#272A28` | Soft white `#F2F4F1` |
| Secondary text | Gray `#686D69` | Light gray `#B0B6B1` |
| Divider | `#E2E5E2` | `#424A44` |

**Light mode:** Use the clean white hanji of `white.jpg`, with very little yellow cast.
Do not tint the entire background ivory or beige. Do not use a warm off-white such as `#F5F3ED` as the default background.
Layer the original paper fibers over white using normal blending at approximately 0.32 opacity.
The texture should read as subtle material detail, without distracting stains or visible tiling seams.
The current public asset `/hanji.jpg` is a copy of `white.jpg`.

**Dark mode:** Use the dark keyboard's matte ink keycaps as the reference.
Surface elevation must remain visible against the dark background.
Keep dark material grain extremely low in contrast; do not overlay white paper so that it becomes a gray haze.
Theme the surfaces and text individually. Do not invert photographs or dancheong colors with a global filter.

### Shared dancheong accents

These HEX values are web design tokens interpreting the color relationships in the reference photograph, not exact pixel samples.

| Color | Token | HEX | Main role |
| --- | --- | --- | --- |
| Bright jade | primary | `#59B69A` | Primary selected state and key accents |
| Teal | teal | `#318F83` | Secondary markers and icons |
| Coral red | coral | `#D78079` | Red accents within the dancheong palette |
| Yellow | yellow | `#D8B94F` | Small highlights and markers |
| Indigo | indigo | `#5269A1` | Calm secondary accents |
| Lilac | lilac | `#B2A1BF` | Soft intermediate accents |

Preserve the relationship between jade, teal, coral, yellow, indigo, and lilac in both modes.
Do not reduce them all to gray or muddy earth tones in dark mode.
Maintain minimalism by **controlling the area occupied by color**.
Neutral surfaces dominate the screen; multiple dancheong accents appear in small selected keys, markers, and icons.
Do not force every color into every view or fill large areas with a rainbow palette.

Keep body text and headlines in the mode's primary text color.
For small category labels, place a colored marker beside readable neutral text.
Check label contrast on colored buttons; do not apply white text to every accent background.
Communicate selection, focus, and status through surfaces, outlines, and labels as well as color.

## Typography

Use **Noto Sans KR** throughout, supporting both English and explicitly requested Korean localization.
Project-authored copy is English by default, following `AGENTS.md`. Use `lang="en"` for English pages and `lang="ko"` for explicitly localized Korean pages.
Serve the font through Next.js `next/font`. Use weight 400 for body text, 500–600 for titles, and 700 for the wordmark.

- Introductory headline: 32px on desktop, 28px on mobile, with a 1.5 line height.
- Article titles: 20px with a 1.5 line height. Allow long titles to wrap naturally.
- Body text and summaries: 16px with a 1.75 line height. Do not shrink reading text to fit more content.
- Buttons and categories: approximately 13px. Dates and supporting metadata: approximately 12px.
- Preserve word boundaries when wrapping text, including Korean localization. Break long URLs and unbroken strings to prevent horizontal overflow.
- Headline letter spacing: approximately -0.02em to -0.03em. Avoid excessively tight body text.

## Layout

The homepage uses one column: a small header, a short introduction, categories, an article list, and a small footer.
Do not add photographs, oversized banners, sidebars, or statistics widgets by default.

- Maximum content width: 960px. Horizontal padding: 40px on desktop and 24px on mobile.
- Use an 8px spacing rhythm, with 4px increments for small alignment adjustments.
- Leave approximately 40–64px between sections and 24–32px of vertical padding within article rows.
- Order each article's content as category, title, and short summary. Separate rows with thin dividers.
- Preserve readable type sizes and touch targets on mobile; allow additional line wrapping.
- Preserve content positions, list order, spacing, and information hierarchy when switching modes.

## Elevation & Depth

Express clay through the shallow height and soft edges of a keycap.
Concentrate depth on the logo symbol and category buttons. Keep article rows on the page without wrapping every row in a raised card.

- Light comes from the upper left. Pair a subtle top highlight with a short, soft shadow below.
- Light-mode shadow baseline: `2px 3px 8px rgba(39, 42, 40, 0.10)`.
- Dark-mode shadow baseline: `2px 3px 8px rgba(0, 0, 0, 0.28)`.
- Reinforce dark-mode depth with lighter surfaces and thin top highlights. Avoid white gloss and neon halos.
- Express a press with approximately 1px of movement or a reduced shadow. Keep transitions subtle, around 120–180ms.
- Reduce movement and transitions for `prefers-reduced-motion`.

## Shapes

Use a consistent 12px corner radius for keycaps and the logo symbol.
Small markers use soft corners of 6px or less.
Surfaces are matte, with a quiet, tactile density.
Avoid inflated balloon shapes, glossy plastic, and glass effects.

## Components

- **Header:** A small robot symbol and the `mindbot` wordmark. The symbol's surface follows the mode's keycap colors.
- **Categories:** All / Robotics / Physical AI / Open Source. Use a jade keycap with readable ink text for the selected state. Minimum touch height: 44px.
- **Color markers:** A category's dancheong color retains its meaning across modes. Treat label color and marker color separately.
- **Article list:** Text sits naturally on the background, separated by thin dividers. Identify sample content clearly so it cannot be mistaken for published reporting.
- **Focus:** Provide a visible outline with sufficient offset in both modes. Selection must be identifiable and operable with a keyboard.
- **Mode switch:** Offer explicit light and dark choices. Prefer a saved choice; otherwise follow the system preference. Persist the choice in the browser.

## Do's and Don'ts

- Keep multiple dancheong accents alive against the contrast between white hanji and dark ink.
- Use generous neutral areas and small but distinct color accents.
- Do not reduce the keyboard reference to a single terracotta accent and a muted green.
- Do not interpret white hanji as yellowish beige.
- Keep paper grain and clay shadows subtle enough to protect readability.
- Do not add neon colors, metal textures, or science-fiction decoration merely because this is a robotics community.
- Check a minimum 4.5:1 contrast ratio for normal text, including on the actual composited textures and gradients.
- Keep theme switching client-side; it must not require a server API or authentication.
- Check readability, horizontal overflow, focus, and selected states in both modes at 1440px desktop and 390px/360px mobile widths.

Validate this document with:

```sh
bunx @google/design.md lint DESIGN.md
```
