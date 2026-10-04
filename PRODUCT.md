# Product

Strategic context for design work on the Stone Steps 50K site. Derived from the repo's own docs and seed copy (`brand/brand.config.json`, `scripts/seed-race.mjs`, `docs/design-review-2026-09-08.md`, `docs/agent/changelog.md`) on 2026-10-03. The judgement calls that used to be open `TODO(Nathan)` lines now carry proposed answers. Every answer tagged **Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong.** is a draft that Nathan has NOT confirmed: treat it as the working assumption, cite the evidence beside it, and replace it when Nathan says otherwise. Where nothing is measured the text says so. Visual decisions live in `DESIGN.md`.

## Register

brand

## Users

People who care about this one race, as the site's own pages address them (home with the race clock, distances and tickets, course and map, weather, results archive, runners, records, contact, privacy):

- **A runner deciding whether to enter or preparing to run** the 50K (seven loops) or the 27K (four loops): distances, fee tiers by date, start times, course, elevation, race-day weather history.
- **A returning runner or a researcher** looking up results (2003 to 2025, every finisher, per-runner history pages) and records. The design review calls the archive the site's strongest asset.
- **Crew and spectators** on race day (a crew and spectator guide is on the course page; the directions link and parking note came from the race director).
- **Sponsors and partners** (sponsor patches), and the Parks/Mt. Airy Forest context.

**Audience ranking when two compete on the home page.** _Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._

1. **First-time or deciding entrant.** The site's stated job (Product Purpose below) is to get a runner to register for the right distance, the fee tiers step up on fixed dates (35, 50, 60 dollars for the 50K) and the fields are capped (120 for the 50K, 130 for the 27K in `scripts/seed-race.mjs`), so this reader is the one with a deadline.
2. **Veteran or returning runner and researcher.** The design review calls the archive the strongest asset and says it was "buried behind a nav link", so this reader is served by one clear route into results and records from the home page, not by owning the hero.
3. **Crew and spectators.** Their content lives on the course page (the crew and spectator guide, the directions link and parking note from Dave) and is race-week, not year-round.
4. **Sponsors and partners.** Patches and the Parks donation line; they are recognised, not courted.

When the first two compete for the same pixels, the entrant wins the hero and the veteran gets the second band.

**Phone share: not measured.** Nothing in the repo records it. Working assumption, taken from the design review ("trail runners checking a date on a phone, often on poor signal"): design phone-first and treat desktop as the enhancement. The repo already enforces this with a 320px reflow suite and a `webkit-iphone` Playwright project. The real figure is a one-query read of device category in GA4 (property 552910285); record it here when someone pulls it.

## Product Purpose

The public site for the Stone Steps 50K / 27K, "Cincinnati's longest running ultra marathon" (Mt. Airy Forest, 5083 Colerain Ave, Cincinnati, OH 45223), run by David Corfman ("Dave"). It replaced a WordPress site and went live on stonesteps50k.com on 2026-09-18. Its job is to get a runner to register for the right distance (the Register buttons go out to RunSignUp), answer the practical questions plainly, and carry the race's history. Success is a clear path to registration and a results archive that keeps itself current (a nightly workflow imports new results and bakes race-day weather). It is not an event-management system: registration and timing live elsewhere.

## Brand Personality

A trail race with a hand-made, earthy character, built from the logo's own moves: a hard offset shadow, a badge-like rounded plate leaning forward, mud, topographic contours, boot prints. Cream paper and bark, rust as the action colour, forest as the second. Objects on a ground: tickets, a punch card, a clipboard, a painted trail sign, record boards. The voice is warm, conversational and plain, and says what a thing costs and when it starts. Copy rules: no em-dashes in site copy, no AI-tell vocabulary (`.claude/rules/copy-and-voice.md`); unconfirmed facts are flagged on the page by a "not confirmed" marker driven by a `confirmed` field, never silently stated.

**Tone sentence and do/not pairs** now live in `docs/brand/voice.md`, written from the site's seeded copy (`scripts/seed-race.mjs`) and the copy decisions in `docs/agent/changelog.md`. _Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._ The tone sentence: a plain-spoken race director talking to a runner at the start line, warm and a little dry, exact about cost, start time and how hard the trail is.

## Anti-references

Recorded decisions only:

- **Starter defaults showing through.** The 2026-09-17 audit found the gap was generic-starter leftovers (three heading systems, a bronze pill button), not a shortage of objects. Anything that reads as the NCS starter's neutral Slate/Ink/Paper look is wrong here.
- **A clip-art race t-shirt.** The reason the hero mud is baked and used on the home hero only (`MudField.astro` comment).
- **Mud and texture that look generated**, and flat, washed-out light mode (the 2026-09-08 review: cream objects on a cream page collapsed to 1.09:1).
- **Soft blurred shadows.** The logo's shadow is hard-offset, down and right, one direction.
- **Decorative noise that costs the page**: home LCP and the stylesheet size are defended with measurements (PR #32).

### Reference sites

_Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._

- **Broken Arrow Skyrace, Cocodona 250 (Aravaipa) and UTMB Mont-Blanc** are the comparators the 2026-09-08 design review actually measured the site against (`docs/design-review-2026-09-08.md`, section 4). Compare against them for content and function: an aid station and cutoff table, a course map with a GPX download, a crew guide, large confident photography, volunteer signup, race-week logistics, history. Do not copy their look; the art direction is analogue and theirs is not.
- **cloudimperiumgames.com:** the review file does not mention it, and the three things Nathan asked for from it are not recorded anywhere in the repo. Unrecorded, so nothing is claimed here. When Nathan names the three, list them in this bullet.

### Must not look like

_Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._ No evidence in the repo names another client as something to avoid, so none is named. The working assumption, from the 2026-09-17 audit finding that starter defaults showing through were the gap, is that this site must not look like any sibling site built from the same NCS starter (for example First Baptist Muncie or Crestview). The pairs below come from the review and the changelog:

| Must not look like                                                           | Should look like                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The starter's neutral Slate/Ink/Paper site with a logo dropped on it         | The logo's own moves: hard offset shadow, leaning plate, contours, boot prints |
| A clip-art race t-shirt (mud or prints used twice)                           | One baked mud moment on the home hero, then restraint                          |
| Light mode as a washed-out dark mode (cream objects on a cream page, 1.09:1) | A trail map on kraft paper with charcoal and forest plates (11.80:1)           |
| A glossy, volumetric WebGL race promo (declined in the review)               | Painted signs, perforated tickets, a punch card, record boards                 |
| A stock-photo brochure                                                       | Real photographs run large and treated into the bark and cream palette         |

### Palette status

_Decision recorded 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._ **Rust, forest and rust-deep are NOT final. They wait on Dave's logo files.** The evidence is the comment in `src/styles/globals.css`: cream and gold were sampled from the mark, but "no asset published on stonesteps50k.com contains a single red or green pixel", so rust (`#A83C26`), rust deep (`#8F3323`) and forest (`#2E5738`, deep `#24462D`) were eyeballed and "must be replaced from a real brand file when one exists". The vault note lists the logo as still owed by Dave. So the `PROVISIONAL` markers stay in `globals.css`, and this is a tracked dependency, not a guess: when Dave supplies a brand file, sample the red and green from it, update `globals.css` and `brand/brand.config.json` together, re-run the contrast gates (`theme-tokens`, `layout-variants`, the axe sweep), then drop the markers.

## Design Principles

1. **A high-contrast object on a ground.** Tickets, plates, boards and signs are the language; light mode inverts the plates to charcoal and forest so they still read on cream.
2. **One grammar.** One heading system (outlined display label on content bands, trail blaze on self-contained objects), one button family (the leaning sign plate), one ground.
3. **Derive, don't retype.** Records, stats, distances and the edition figure come from the results archive and fields, so the site cannot hold a second opinion.
4. **Say what is not confirmed.** Unknown facts wear the "not confirmed" marker until Dave confirms them.
5. **Texture earns its place.** Mud on the home hero only; contours, grain and prints are baked or cheap, and measured against LCP.

## Accessibility & Inclusion

WCAG AA is enforced by gates, not intent: `theme-tokens`, `layout-variants` and `section-fields` unit tests, an axe sweep, and a 320px reflow suite. Contrast failures here have repeatedly come from correct colours diluted by opacity utilities, so secondary inks are solid tokens (`--plate-ink-soft`, `--gold-on-forest`). The display face is a single weight and is never bolded. Reduced motion is honoured through a global reset (transitions of 0s, not 0.01ms, which WebKit strands). Both light and dark themes ship and both are checked on every UI change. Tap targets are at least 44px. Detail: `docs/agent/accessibility.md`.
