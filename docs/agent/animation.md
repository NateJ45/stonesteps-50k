# Animation layer

> Native smooth scroll, scroll reset on navigation, Motion integration, scroll-triggered reveals, hero entry stagger, Ken Burns slideshow, view-transition cross-fade, and the opt-in script accent.

Non-animation polish (brand stripe, card-lift, surface-warm, reading-progress, sticky-header, paper-grain, print stylesheet) is covered in `polish-layer.md`.

> **The flow layer, motion 'fade' (2026-10-27, starter card 192).** `layout.motion` is `fade`: below the first screen every block arrives with one 200ms, 8px fade, and the older reveals rest. See [The flow layer](#the-flow-layer-motion-fade-starter-card-192).

## The flow layer (motion 'fade', starter card 192)

Taken from the starter on 2026-10-27. `brand/brand.config.json` `layout.motion` is `"fade"` (`src/data/layout.ts` follows it through `apply-brand`; `site-layout.test.ts` fails if they differ). `<html>` carries `data-motion="fade"` and BaseLayout renders `src/components/FlowMotion.astro`, which loads `src/scripts/flow.ts` on every `astro:page-load`.

**Why `fade` and not `flow`.** The race's motion is already its own and physical: the RaceHero entrance and race clock on the first screen, the elevation line drawing itself, the record board's strike, the ticker, the sign plates leaning on hover. `flow` would add Auburn's softer layer on Home (headings rising line by line, photos settling from a zoom, pages lifting between clicks), which reads gentle and ceremonial next to a trail race's plates and torn edges, and would compete with those pieces. `fade` is one quick, plain arrival (8px, 200ms) that keeps the site's own moves as the character, and it keeps the results and records tables calm.

| `layout.motion`    | What moves                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reveal`           | The older reveals below and the plain cross-fade between pages. No flow script.                                                                                                                                                                                                       |
| `fade` (this site) | Every unit below the first screen (`h1` to `h4`, `p`, `li`, `dl`, `blockquote`, `figure`, `form`, `iframe`, `table`, pictures, video) fades up 8px over 200ms as it arrives, 40ms apart when several arrive together. Nothing is split or zoomed. The cross-fade between pages stays. |
| `flow`             | Auburn's fuller motion on pages passing `flow="full"`; not used here.                                                                                                                                                                                                                 |
| `none`             | Nothing moves; the head script never adds `html.motion`.                                                                                                                                                                                                                              |

**Files.** `src/scripts/flow.ts`, `src/styles/flow.css` (imported by `globals.css`), `src/lib/flow-split.ts` (+ test), `src/components/FlowMotion.astro` and `tests/flow-motion.spec.ts` are PORTABLE, byte-identical to the starter. The timings are the `--motion-*` tokens at the end of the one scale in `globals.css` (`docs/agent/design-tokens.md`).

**What stays the race's own.** Once the layer arms a page (`html.flow-armed`), `flow.css` rests `[data-reveal]` boxes, `[data-stagger-grid]` children and `.img-curtain`; the observer still adds `.is-visible`, so the elevation line, the record strike and the weather icons that key on it still draw. The RaceHero is the first screen, which the layer never touches. The ticker carries `data-flow="off"`: its copies sit off to the right and arrive by the marquee, not by scrolling, so a unit armed there would never land (found in testing: 17 to 22 invisible ticker items before the opt-out). A new marquee, carousel or anything that moves content in sideways needs the same `data-flow="off"`.

**Safety rules (from the starter).** The first screen shows as it is at every width, so LCP does not move. Hidden states are the first frames of paused animations on classes the script adds: JavaScript off, a failed script or reduced motion leaves everything visible. Only opacity and `translate` move (CLS 0 from the layer). Units shed their classes once landed. Keyboard focus lands a unit at once. Native scroll only (rule 5). Live preview never splits. Printing drops `html.motion`.

**The motion wall.** `/styleguide/motion/full/` and `/styleguide/motion/fade/` (`src/pages/styleguide/motion/[level].astro`, noindex, out of the sitemap, `styleguide` a reserved slug) override the motion for themselves so `tests/flow-motion.spec.ts` can drive both levels on any build.

**Measured** (Playwright, local build over the CI snapshot, three cold loads each walking the whole page; LCP ms, CLS). Before (motion `reveal`): Home 375 LCP 128-184 CLS 0.0038-0.0046; Home 1280 LCP 172-184 CLS 0.0036-0.0046; `/course/` 375 LCP 128-648 CLS 0-0.2416; `/course/` 1280 LCP 204-648 CLS 0.0024-0.129. After (`fade`): Home 375 LCP 128-136 CLS 0.0041-0.0046; Home 1280 LCP 168 CLS 0.0036-0.0038; `/course/` 375 LCP 208-224 CLS 0-0.0406; `/course/` 1280 LCP 224-248 CLS 0.0024-0.129. No unit left armed on any route at 375 or 1280. The `/course/` 0.127 shift is older than the layer (it shows on the live site under `reveal` and comes from a band below the map growing mid-scroll); PENDING 1w.

## Smooth scroll (native; Lenis removed 2026-10-04)

Lenis was removed on 2026-10-04 (Nathan's call). Scrolling is the browser's own, and so is its feel. Programmatic scrolls (home hero scroll cue, case-study TOC) use native `scrollTo({ behavior: 'smooth' })` / `scrollIntoView`, which honor `scroll-mt-*` on heading targets, so TOC targets clear the sticky header without a manual offset (don't add one, it double-applies). The global `prefers-reduced-motion` reset in `globals.css` already forces `scroll-behavior: auto`, and the TOC picks `behavior: 'auto'` itself.

### Scroll reset on navigation

Astro's ClientRouter resets to the top on forward navigations and restores position on back/forward, natively. There is no custom reset code any more (it only existed to cancel Lenis momentum). If a page ever opens partway down after a link click, look at the router, not at a scroll library.

**Caveat for testing:** Astro dev full-reloads on back/forward, so the traverse (restore-position) behavior can only be verified against the production build via `npm run preview`, not `npm run dev`.

---

## Motion integration

[Motion](https://motion.dev) (formerly Framer Motion) provides the animation primitives for React islands. Use `motion` components for enter/exit transitions on interactive UI (drawers, modals, toast regions). For scroll-triggered reveals on static content, prefer the lightweight `[data-reveal]` IntersectionObserver approach below -- it doesn't require hydrating a React island just to fade in a static section.

---

## Scroll-triggered reveals

### `[data-reveal]`

Once JavaScript runs, any element marked `data-reveal` starts at `opacity: 0; translate: 0 0.75rem`. An IntersectionObserver in BaseLayout adds `.is-visible` when the element crosses the viewport edge, transitioning to opacity 1 + no translate. The hidden start is scoped to `html.motion`, a class the inline theme bootstrap in `<head>` adds before first paint (and re-adds after every view-transition swap). With JavaScript off or blocked the class never appears and the page renders finished; `[data-stagger-grid]` children and `.img-curtain` follow the same rule (PORTS.md card 107). Reduced-motion users never get the class, and the global reset forces the end state as a backstop. A new hidden-until-JS state goes under `html.motion` too.

Apply selectively to section blocks. Don't add `data-reveal` to above-the-fold content -- it defeats the purpose and hides content from users with slow connections before the observer fires.

### Grid stagger entrance (`[data-stagger-grid]` / `.is-staggered`)

Card grids fade their children up in sequence as the grid crosses the viewport. Add `data-stagger-grid` to a grid container; the BaseLayout observer adds `.is-staggered` on intersection, and per-`nth-child` `transition-delay`s (0 / 100 / 200 / 300ms, capped at 400ms for item 5+) sequence the reveal.

Reduced-motion users get every child visible instantly.

**Filter caveat:** if a `[data-stagger-grid]` container also has filtered children (`.is-filtered-out`), the filter's hide state must be re-asserted at matching specificity (`[data-stagger-grid] > .is-filtered-out`, with `!important`) so the stagger rules don't override the filter's hide state.

### Image curtain reveal (`.img-curtain` / `.is-revealed`)

A surface-colored panel (`color: var(--background)`) scales away from the top edge to reveal an image, reading as materialization rather than a sliding panel. Wrap the image in a `relative overflow-hidden` div and drop `<div class="img-curtain" aria-hidden="true">` in as the last child; the BaseLayout observer adds `.is-revealed` on intersection (`scaleY` 1 to 0, 900ms). The curtain sits at `z-index: 10` so it covers any in-wrapper overlays during the reveal. Reduced-motion users never see the curtain (`display: none`).

---

## Hero entry stagger (`.hero-entry-stagger`)

The hero's content column wraps in `<div class="hero-entry-stagger">`. Each direct child fades up with a 120ms staggered delay on first paint (eyebrow -> decorative hairline -> h1 -> subhead -> CTAs). Animation lives in `globals.css`. Reduced-motion users get the final composition instantly via the global media-query reset.

Don't apply this class to other components -- the per-child delays are tuned for the hero's specific 4-5-element composition.

---

## Home hero slideshow (`HeroBackground.astro`)

The home hero can be a single static image (default) or a slow cross-fading slideshow with a subtle Ken Burns zoom. `homePage.heroImages` in Sanity controls this: one image renders the static hero, two or more render the slideshow.

`HeroBackground.astro` owns the background markup (single `SanityImage` for 0-1 images, or stacked `.hero-slide` images for 2+) plus the readability overlays.

**Why the slide CSS lives in `globals.css` (not a scoped component style):** the slides are rendered by the child `SanityImage` component and would not inherit a scoped style. Same reasoning as `.img-zoom` and `.hero-entry-stagger`.

Each slide is `position: absolute`, `opacity: 0` with a `1.5s` opacity transition; the active slide is `opacity: 1` and all slides run a gentle continuous Ken Burns (`scale(1)` to `scale(1.07)`, alternating origin and duration). A small `<script is:inline>` in HeroBackground advances the active slide every 4500ms (3s hold + 1.5s fade):

- Uses a single `window`-scoped timer that is cleared on every re-init.
- Pauses while the tab is hidden (`visibilitychange`).
- Re-registers once on `astro:page-load` (guarded by a `window.__heroSlideshowBound` flag).
- Never starts under `prefers-reduced-motion`.

The first slide stays the eager `fetchpriority="high"` LCP image; the rest lazy-load. The first slide carries its descriptive alt; the additional slides use empty alt so they are decorative.

---

## Photo hero video (`HeroVideo.astro`, PORTS.md card 189)

An opening banner whose **Style** is "Photo behind the words" (`heroSection.heroStyle = 'photo'`,
drawn by `PhotoHero.astro`) can play a short silent clip over its background photo: Studio > the
page > the opening banner > **Background video**, and **Phone video** under it. From FBC Auburn's
Home hero (2026-10-25). The rules, in `src/lib/hero-video.ts` (unit tested):

- The photo is drawn first and stays the LCP (eager, `fetchpriority="high"`). `HeroVideo.astro`
  is rendered only when the block has a clip, and its script waits for the `load` event, then
  builds a `<video muted playsinline loop preload="none">` with the photo's `currentSrc` as the
  poster, puts it over the photo and under `.ph-photo__shade` (so the words keep their contrast),
  starts it with `play()` (no `autoplay`, so the Pause choice and the off-screen pause win) and
  fades it in on `playing`. It carries `aria-hidden`, `tabindex=-1`, no controls and
  `pointer-events: none`.
- `heroVideoAllowed()` says no for reduced motion, Save-Data, an `effectiveType` of slow-2g, 2g or
  3g, a measured `downlink` under 1 Mbps (0 counts as unknown) and print: then there is no
  `<video>` at all and nothing downloads. Switching reduced motion on while the page is open
  removes it; CSS hides it under reduced motion and in print as a second guard.
- A Pause / Play button (`[data-hero-video-toggle]`, `aria-pressed`) at the top right (WCAG
  2.2.2). The choice is kept in `localStorage` (`hero-video-paused`). The clip pauses while the
  hero is off screen, and starts again when a tab opened in the background comes to the front.
- It plays at `opacity: 0.99`, never 1: Chrome on Windows promotes a fully opaque video to a
  hardware overlay plane drawn outside the page, and the shade vanished on screen mid-scroll. That
  never shows in a browser screenshot, only by eye.
- **Phone video.** Sanity serves a file as uploaded and does not transcode, so the small copy is a
  second upload (`backgroundVideoPhone`). Under 768px (`HERO_PHONE_QUERY`) `heroVideoPick()`
  chooses it before the `<video>` is built, so a phone fetches only the small copy; with none,
  phones play the main clip. On Auburn this cut a phone's video download from 1,000 KB to 267 KB
  with LCP unchanged.
- **Fast start.** The browser streams the clip with range requests (Sanity's CDN answers
  `206`), which only works when the .mp4's index (`moov`) comes before the data (`mdat`). The
  Studio reads the first 64 KB of an .mp4 upload (`checkFastStart()` / `mp4FastStart()`) and warns
  when it does not; a failed request raises nothing. It also warns over 3 MB (1 MB for the phone
  copy) and refuses anything but .mp4 or .webm.
- Exporting: 1280x720, H.264, no audio, 15 to 30 seconds, under 3 MB, "Web optimized" (HandBrake)
  or "Fast start" (Premiere, CapCut, Shotcut). With ffmpeg:
  `ffmpeg -i in.mov -an -vf scale=1280:-2 -c:v libx264 -preset slow -crf 26 -movflags +faststart out.mp4`.
  The phone copy: the same at `scale=640:-2`, under 1 MB. An existing mp4 is fixed without
  re-encoding by `ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`.
- `tests/photo-hero.spec.ts` drives `/styleguide/photo-hero/home/` (fixed data; the CDN is
  answered with `tests/visual/fixtures/hero-clip.mp4`). Playback itself is not asserted.

The words' contrast over any photo is a separate promise: the shade tokens on `.ph-hero`
(`--photo-scrim`, `--photo-scrim-text`, `-deep`, `-clear`) are checked by
`src/lib/photo-hero.test.ts` against a pure white photo (see `docs/agent/design-tokens.md`).

---

## View-transition cross-fade

`<main id="main">` carries `view-transition-name: main-content` and cross-fades on every navigation (`vt-fade-out` 150ms -> `vt-fade-in` 200ms). The header and footer are named (`site-header` / `site-footer`) and pinned with `animation: none` so they stay put through the swap instead of flashing. Astro respects `prefers-reduced-motion` automatically -- reduced-motion users get an instant cut. Pure CSS, no JS.

---

## Script accent font (opt-in)

The `@utility font-script` declaration and `--font-script` CSS custom property exist in `globals.css`, but no script font file is loaded by default. This is intentional: a calligraphic accent is project-specific and adds a font request for every visitor, so it should only be enabled when the design calls for it.

### How to enable the script accent

1. **Choose a script typeface** and install its `@fontsource` package, for example:

   ```
   npm install @fontsource/dancing-script
   ```

2. **Add the import** near the top of `src/styles/globals.css`, after the other `@fontsource` imports:

   ```css
   @import '@fontsource/dancing-script/400.css';
   ```

3. **Point `--font-script` at the family** in the `@theme` block in `globals.css`:
   ```css
   @theme {
     --font-script: 'Dancing Script', cursive;
   }
   ```

Once this is done, any element with the `font-script` Tailwind utility class will render in the script typeface.

### Usage discipline

The `font-script` utility is for a single-word editorial accent on hero headlines and section headings -- not for body text, buttons, or repeated decorative elements.

The shared logic lives in `src/lib/heading-accent.ts` (`splitHeadingAccent(heading, accent)`), which splits a headline string around the matching accent word and returns the before/after fragments for the template to wrap in `<span class="font-script">`. If the accent word is not found in the current headline, the heading renders plain -- editors can update copy without breaking anything. The same function serves the colour accent; only the class on the span differs. It had a second, weaker copy of its own (`src/lib/scriptAccent.ts`) until 2026-09-18, when that copy was retired (PORTS.md card 53).

**Discipline:** use at most one script accent per heading. Over-use dilutes the effect. The accent word must match the headline text exactly (case-sensitive). Think of it as an editorial signature, not decoration.

---

Cross-reference: `polish-layer.md` covers the non-animation visual layer (brand stripe, card-lift, surface-warm, reading-progress, sticky-header, paper-grain, print stylesheet).
