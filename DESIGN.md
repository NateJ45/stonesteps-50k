---
name: Stone Steps 50K
description: A trail-race poster system: high-contrast plates, tickets and boards on a warm paper and bark ground, with a hard offset shadow, mud and contours.
colors:
  paper: "#FBF6EA"
  paper-soft: "#F4EBD6"
  divider: "#E3D6B8"
  bark: "#1A1712"
  bark-deep: "#0F0D0A"
  stone: "#8A7F66"
  cream-stock: "#FFEBBB"
  rust: "#A83C26"
  rust-deep: "#8F3323"
  forest: "#2E5738"
  forest-deep: "#24462D"
  gold-on-forest: "#FED89B"
  charcoal-plate: "#3A3128"
  plate-ink-soft: "#D3C6AA"
  plate-accent: "#F2AD8C"
  ink-muted: "#5C513B"
typography:
  display:
    fontFamily: "Staatliches, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "-0.015em"
  section-label:
    fontFamily: "Staatliches, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5.5vw, 4.25rem)"
    lineHeight: 0.9
    letterSpacing: "0.005em"
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, Consolas, monospace"
rounded:
  base: "0.75rem"
  plate: "12px"
spacing:
  section-md: "clamp(3rem, 6vw, 5rem)"
  section-lg: "clamp(4rem, 8vw, 7rem)"
components:
  button-plate:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.cream-stock}"
    typography: "{typography.display}"
    rounded: "{rounded.plate}"
    padding: "clamp(0.85rem, 0.7rem + 0.75vw, 1.15rem) clamp(1.35rem, 0.85rem + 2.5vw, 2.4rem)"
    height: "44px"
  button-plate-cream:
    backgroundColor: "{colors.cream-stock}"
    textColor: "{colors.bark}"
  ticket-50k:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.gold-on-forest}"
---

# Design System: Stone Steps 50K

Tokens live in `src/styles/globals.css` (`@theme`, `:root`, `.dark`) and are mirrored in `brand/brand.config.json`; the CSS wins if this file and the code disagree. Strategy is in `PRODUCT.md`. The reasoning behind the plate and shadow rules is in `docs/design-review-2026-09-08.md` and `docs/agent/changelog.md` (entries of 2026-09-08 and 2026-09-17).

## 1. Overview

**Creative North Star: objects on a ground.** The identity is high-contrast things sitting on a surface: a ticket, a punch card, a clipboard, a record board, a painted trail sign with the mark nailed to a plate. The logo supplies the moves (hard offset shadow, leaning rounded plate) and the course supplies the texture (contours, mud, boot prints). Display type is a single-weight condensed caps face; every time value is monospace so results read like a timing clock.

- **Two themes, both first-class.** Dark is bark with cream objects; light is a cream "kraft paper" ground where the plates INVERT to charcoal and forest (cream objects on a cream page measured 1.09:1 and collapsed). Both are checked on every UI change.
- **One grammar** (changelog 2026-09-17): one heading system, one button family, one ground.
- **Texture is spent carefully.** Mud is home-hero only; contours, grain and prints are baked or cheap and measured against LCP and the stylesheet size.
- The palette is final as of 2026-10-03: the hexes are the ones the live site serves (see "Palette status" in `PRODUCT.md`), and the `PROVISIONAL` markers are removed from the CSS. Revisit only if Dave's logo files differ.

## 2. Colors

- **Ground.** Paper `#FBF6EA`, soft paper `#F4EBD6` (alternating band), divider `#E3D6B8`. Dark: bark `#1A1712`, deep bark `#0F0D0A` for the fixed ink band.
- **Ink.** Bark `#1A1712` on paper; cream stock `#FFEBBB` on bark. Muted text `#5C513B` on paper. Links: `#8F3323` on paper, `#FED89B` on bark.
- **Rust** `#A83C26`: the action colour, the button ground (carries cream at 5.35:1), the display echo. Rust deep `#8F3323` for anchor text.
- **Forest** `#2E5738` (deep `#24462D`): second colour and the 50K ticket stock. Small labels on forest use gold `#FED89B` (6.11:1) via `--gold-on-forest`.
- **Plate stock flips with the theme.** `--plate-face` is cream `#FFEBBB` with bark lettering on bark, and warm charcoal `#3A3128` with cream lettering on paper (11.80:1 against the page). Secondary ink on a plate is a solid token (`--plate-ink-soft`), and the accent on a plate is `--plate-accent` (rust on cream stock, clay `#F2AD8C` on charcoal).
- **Never dilute with opacity.** Every recent contrast failure was a correct colour thinned by an opacity utility (bark at 50% on cream measures 3.26:1). Use the solid tokens. Mud on paper is bark at about 26%, on bark it is cream at about 19%.
- Status colours (info, success, warning, error) exist per theme in `brand.config.json`.

## 3. Typography

- **Staatliches** (display, single weight 400, caps): headings, plates, tickets, labels. Never set a heavier weight (faux bold smears it). Line-height 0.84, tracking `-0.015em`. Metric-matched fallbacks are declared so the font swap does not move the hero.
- **Archivo Variable** (body).
- **JetBrains Mono Variable**: every time value (results, records, splits, the countdown), tabular figures.
- **Scale.** `--text-h1` clamp(2.5rem, 6vw, 5rem), h2 clamp(2rem, 4vw, 3rem), h3 clamp(1.5rem, 2.5vw, 2rem), down to h6 1rem. Floor: nothing below 11px (enforced on the countdown labels, map captions, scale bars, blockquote cites and footnote flags since 2026-10-03), eyebrows 12px, the Register button 14px or more (design review section 3).
- **Headings.** Content bands wear the outlined section label (`.section-label`: transparent fill, 1.5px stroke at 42% foreground, display scale). Self-contained objects (a ticket rail, clipboard, page header, finish sign) wear the trail blaze (`.blaze`: a small tilted rust bar with a hairline running off to the right).
- **The logo's lowercase k.** Display type is uppercase, so a trailing distance token (50k, 27k) outlines its k (`.k-outline`). Real text stays in a screen-reader copy.

## 4. Elevation

Flat, with ONE exception: the hard offset shadow, down and right only, no blur.

- Tokens `--lift-sm` (2px 3px), `--lift` (3px 4px), `--lift-lg` (5px 7px), black at 50 to 55% on paper. On bark a black shadow is invisible, so `--lift-ground-*` carry the page ground toward cream stock instead (`color-mix` of background and `#ffebbb`).
- **The shadow rule:** an offset shadow is only correct when the object's lettering is LIGHTER than what is behind it. `--display-shadow` therefore defaults to `none` and dark surfaces opt in; the display echo (`.display-echo`, a second ink offset 0.055em in rust) is the heading's version of the same move.
- Objects have a 2px near-black edge (`--plate-edge`) and a 12px radius.

## 5. Components

- **Buttons (`CtaLink.astro`, `.btn-plate`).** One family: the sign plate, leaning forward by `--plate-skew: -7deg`, display face, 0.08em tracking, 2px edge, hard shadow, fluid padding so the longest label ("Register for the 50K") fits 320px. `primary` is the rust plate, `secondary` is the cream plate; there is no un-plated variant. The arrow counter-skews and nudges 4px on hover. 44px minimum tap target.
- **Header and footer.** The header is a painted trail sign with the logo nailed to a plate; the footer is the trail sign at the finish: contours and a walk of prints behind it, the race date at poster size, links as rows in the display face, the mark on the header's plate, a small reference rail beside it.
- **Hero (`RaceHero.astro`).** Topographic backdrop, the display wordmark split per letter so `.hand` can rotate each a fraction of a degree, the race clock, a claim stamp, a cross-fading photo slideshow, and the baked mud field (`MudField.astro`, alpha-mask PNGs painted with `currentcolor`, so one asset serves both themes). Home hero only.
- **Objects.** Distance tickets (`DistanceTickets`; the 50K ticket is forest with gold lettering, notches punched through the card using `--ground`), the punch card, the schedule clipboard, the record board (`RecordBoard`: bark stock, contours, prints, nail heads, rows of label, name, time, year), sponsor patches (two to a row on a phone, a centred row from `sm` up), the ticker strip, the parks band, the FAQ kiosk.
- **Band boundaries.** Every band draws a contour ridge above itself (`--ridge-mask`, one token shared with the photograph band).
- **Course map.** MapLibre course map, a drawn region plate on /contact (three pins on cream stock), an elevation profile that draws itself, and a gradient key (`docs/agent/course-map-sources.md`).
- **Unconfirmed values.** `Provisional.astro` shows a "not confirmed" tag driven by a `confirmed` field.

## 6. Do's and Don'ts

Motion: default interaction easing is `cubic-bezier(0.16, 1, 0.3, 1)` at 440ms; plates use 0.16s on transform and shadow. Kinetic moments are the hero slideshow, the headline's arrival, the elevation profile and punch card drawing themselves, and the course route draw-on (it ends on any interaction). Scrolling is native (no smooth-scroll library; rule 5). A global reset zeroes transitions under `prefers-reduced-motion`.

**Do**

- Put a light object on a dark ground or a dark object on a light one, then add the hard shadow.
- Use solid colour tokens for secondary ink; measure with the contrast gates in both themes.
- Derive numbers and rows from the archive and fields.
- Keep display sizes fluid (`clamp`) and check 320px.

**Don't**

- Don't bold Staatliches, soften the shadow, or add a blur.
- Don't use opacity utilities to dim text.
- Don't spread mud past the home hero.
- Don't add a third button style, a second heading system, or any starter-default (Slate, bronze pill) leftover.
- Don't write an em-dash in site copy.
