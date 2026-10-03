# Product

Strategic context for design work on the Stone Steps 50K site. Derived from the repo's own docs and seed copy (`brand/brand.config.json`, `scripts/seed-race.mjs`, `docs/design-review-2026-09-08.md`, `docs/agent/changelog.md`) on 2026-10-03. Anything marked `TODO(Nathan)` is a judgement call that is not recorded anywhere yet; do not fill it in by guessing. Visual decisions live in `DESIGN.md`.

## Register

brand

## Users

People who care about this one race, as the site's own pages address them (home with the race clock, distances and tickets, course and map, weather, results archive, runners, records, contact, privacy):

- **A runner deciding whether to enter or preparing to run** the 50K (seven loops) or the 27K (four loops): distances, fee tiers by date, start times, course, elevation, race-day weather history.
- **A returning runner or a researcher** looking up results (2003 to 2025, every finisher, per-runner history pages) and records. The design review calls the archive the site's strongest asset.
- **Crew and spectators** on race day (a crew and spectator guide is on the course page; the directions link and parking note came from the race director).
- **Sponsors and partners** (sponsor patches), and the Parks/Mt. Airy Forest context.

TODO(Nathan): rank these. Which audience wins when two compete on the home page (first-time entrant, veteran returning, spectator), and what is the real phone share? Nothing in the repo records it.

## Product Purpose

The public site for the Stone Steps 50K / 27K, "Cincinnati's longest running ultra marathon" (Mt. Airy Forest, 5083 Colerain Ave, Cincinnati, OH 45223), run by David Corfman ("Dave"). It replaced a WordPress site and went live on stonesteps50k.com on 2026-09-18. Its job is to get a runner to register for the right distance (the Register buttons go out to RunSignUp), answer the practical questions plainly, and carry the race's history. Success is a clear path to registration and a results archive that keeps itself current (a nightly workflow imports new results and bakes race-day weather). It is not an event-management system: registration and timing live elsewhere.

## Brand Personality

A trail race with a hand-made, earthy character, built from the logo's own moves: a hard offset shadow, a badge-like rounded plate leaning forward, mud, topographic contours, boot prints. Cream paper and bark, rust as the action colour, forest as the second. Objects on a ground: tickets, a punch card, a clipboard, a painted trail sign, record boards. The voice is warm, conversational and plain, and says what a thing costs and when it starts. Copy rules: no em-dashes in site copy, no AI-tell vocabulary (`.claude/rules/copy-and-voice.md`); unconfirmed facts are flagged on the page by a "not confirmed" marker driven by a `confirmed` field, never silently stated.

TODO(Nathan): `docs/brand/voice.md` is an unfilled template. Give the tone sentence and the five do/not pairs, or point to where they live.

## Anti-references

Recorded decisions only:

- **Starter defaults showing through.** The 2026-09-17 audit found the gap was generic-starter leftovers (three heading systems, a bronze pill button), not a shortage of objects. Anything that reads as the NCS starter's neutral Slate/Ink/Paper look is wrong here.
- **A clip-art race t-shirt.** The reason the hero mud is baked and used on the home hero only (`MudField.astro` comment).
- **Mud and texture that look generated**, and flat, washed-out light mode (the 2026-09-08 review: cream objects on a cream page collapsed to 1.09:1).
- **Soft blurred shadows.** The logo's shadow is hard-offset, down and right, one direction.
- **Decorative noise that costs the page**: home LCP and the stylesheet size are defended with measurements (PR #32).

TODO(Nathan): name the reference sites to be compared against (the 2026-09-08 review looked at Broken Arrow Skyrace, Cocodona 250 and UTMB Mont-Blanc, and Nathan asked for three things from cloudimperiumgames.com), and say whether anything is a "must not look like <other client>" (for example First Baptist Muncie or Crestview).

TODO(Nathan): the palette's rust, forest and rust-deep are marked PROVISIONAL in `globals.css`. Confirm they are final, or say they wait on the logo files from Dave.

## Design Principles

1. **A high-contrast object on a ground.** Tickets, plates, boards and signs are the language; light mode inverts the plates to charcoal and forest so they still read on cream.
2. **One grammar.** One heading system (outlined display label on content bands, trail blaze on self-contained objects), one button family (the leaning sign plate), one ground.
3. **Derive, don't retype.** Records, stats, distances and the edition figure come from the results archive and fields, so the site cannot hold a second opinion.
4. **Say what is not confirmed.** Unknown facts wear the "not confirmed" marker until Dave confirms them.
5. **Texture earns its place.** Mud on the home hero only; contours, grain and prints are baked or cheap, and measured against LCP.

## Accessibility & Inclusion

WCAG AA is enforced by gates, not intent: `theme-tokens`, `layout-variants` and `section-fields` unit tests, an axe sweep, and a 320px reflow suite. Contrast failures here have repeatedly come from correct colours diluted by opacity utilities, so secondary inks are solid tokens (`--plate-ink-soft`, `--gold-on-forest`). The display face is a single weight and is never bolded. Reduced motion is honoured through a global reset (transitions of 0s, not 0.01ms, which WebKit strands). Both light and dark themes ship and both are checked on every UI change. Tap targets are at least 44px. Detail: `docs/agent/accessibility.md`.
