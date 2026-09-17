# Change history

> Running change log, moved out of CLAUDE.md so it does not load on every task.

> **Scope note (2026-08-27).** This file stays **narrative**: what changed here, in
> sequence, in prose. The **machine-checkable** record of what is shared across the site
> family now lives in `PORTS.md` at the repo root: an applied-to matrix (improvement by
> repo), one dated port card per improvement, and `scripts/sync-check.mjs` to prove a
> site's canonical copies have not drifted. Something that needs to be _checked_ belongs
> in PORTS.md; something that needs to be _understood in sequence_ belongs here. Entries
> below may reference a card number.

_2026-09-17 — Material and typography on the five bands that were still template._

Tier 3 of the design pass, and the brief for it was light touches: **no new objects**.
The site already has as many as it can carry (GearBand's note has the count argument), so
nothing here becomes a thing from the race's world that was not one already. What changed
is stock, size and ink on the five places that still read as a starter kit with a good
palette dropped over it.

**The numbers row.** Four figures under the ticker, and the one band on the home page
that still looked like a widget: rust numerals in a row over a black hairline, with the
unit in the forest green, a hue that does no other typographic work anywhere on this site.
The numeral is the page ink now, set three steps larger and carrying `.display` rather
than `font-display`, which is the difference that matters: the class hands it
`--display-shadow`, so it takes no echo on the cream page (dark lettering, where an offset
thickens the letterforms) and the hard offset on bark (cream lettering, where the offset
is a real shadow). Same call the archive year on /results made this morning, from the same
token. The rust moves to the unit, where the second ink does what it does everywhere else:
rank a small mark under a big one. And the rule above each figure is the tickets' dashed
tear line instead of 2px of `--plate-edge`, which was a black hairline on a near-black
page in dark mode and therefore not there at all.

`statSection` has carried an optional `heading` field since it was written and
`SectionRenderer` threw it away; it is rendered as `.section-label` now, the outlined
display word the other content bands wear. No schema change, and a band with nothing typed
renders exactly as it did.

**The two plain lists stay plain, and now they match.** CourseFeatures keeps its numbered
list, and the numerals move from 14px, where they ranked under the body copy beneath them,
to a size that reads as a marker. GearBand's four labels go from `text-h5` to the
features' `text-h4`: the two lists sit five hundred pixels apart on /course, do the same
job, and were set at two different sizes for no recorded reason. The course photograph
takes `--lift-ground-lg` instead of `--lift-lg`: it sits on the page, not on a plate, so
its black offset had been invisible on bark while the plate button below it kept a shadow.

**The weather strip gets stocks.** A dry year was `--foreground` at 62%, which resolves on
the cream page to a flat neutral grey, the one colour nowhere else in this palette, two
dozen times in a row. Dry years are bark now and wet ones rust, both under the paper
grain, which meant lifting the body's noise tile into a `--paper-grain` token so there is
still exactly one grain on the site and no new asset. Two forks the file explains: the dry
stock flips with the theme (bark on bark is a hole), and the grain has to be INVERTED on
the cream page, because the tile is black noise and screening black is a no-op. The axis
and the year labels go to 13px from 48rem, which is the width where the columns have room
for it; the phone keeps 11px and its every-other-year rule. And a rain year's label is set
in the second ink, so "which years did it rain" is answerable from the label row instead
of from a 6px foot you have to have read the key to decode.

**The records board gets a frame and nothing else.** The tables are exactly as plain as
the file's header promises, because the argument there is still right: forty rows of times
have to stay scannable. What changed is what they sit on. Each distance's panel goes on
the FAQ's recessed kiosk, the same `.kiosk` stock and the same inset shadow, so the page
called The records is finally on a board rather than floating on the band.

Reusing that object has one trap, and it was worth the second pass to find it.
`.kiosk :is(h1-h6)` paints every heading inside a kiosk in `--plate-ink`, and it is right
to, because on the FAQ every heading sits on an index CARD and a card is a plate. Nothing
on this board is a plate, so "Men 50K" came out cream on cream in the light theme and
near-black on bark in the dark one: the exact failure that rule was written to stop,
arriving from the other side. `.kiosk--records` takes its headings back to the page ink.

The big faint time moved onto the board with the rows, and per distance. It used to be one
mark for the whole section, derived from the 50K board alone, so the 27K tab printed a 50K
record behind a table headed Women 27K. An opaque board would have hidden it outright,
which forced the question early; each panel now prints its own record on its own board.
The ghost photograph stays on the band and still bleeds past the board's edge.

Nothing was added to the strike-in reveal Tier 2 gave the record board, on purpose: one
entrance animation of that weight per site.

---

_2026-09-17 — The names go on a board, results become the timing sheet, and the
contact page stops showing somebody else's map._

Tier 2 of the design pass. Three places on the site were doing a job an object would do
better, and one image on the site was not ours.

**The record board.** `src/components/race/RecordBoard.astro` is the one new object in
this tier, and everything it is made of already existed: the bark stock the footer and the
phone menu are cut from, the same Topo contours, the same `walk` field of prints, the
header sign's nail heads, and the hero wordmark's press re-timed. It is rows of
`{label, name, slug, time, year}` and nothing else; every caller derives its own rows from
the results archive, so the board cannot become a second opinion about who holds a record.
`Dynasties.astro` (the home page and the top of /records) was four text callouts under a
headline promising a board; it is the board now. A year page's winners were the same
information in a different costume, and they are on the same board.

It KEEPS ITS OWN STOCK IN BOTH THEMES, which is the one place it parts company with the
two boards it is made from. The menu and the footer follow the theme because they are
chrome and run the full width of the window; this sits inside a band, the way a ticket, a
punch card and a clipboard do, and DistanceTickets already settled what those do. On the
dark page the stock steps one value lighter rather than darker, because a hard offset
shadow only reads when the object is lighter than the shadow. The accent is re-pointed to
the gold on the board in both themes: `--heading-accent` is chosen against the PAGE, and
the rust measured 2.0:1 on bark, which would have set the times, the one thing anybody
reads a record board for, as dark red on dark brown.

The names are struck on one row after another as the board enters the viewport, on the
mobile menu's stagger. It cannot leave a row invisible: the resting state with no
animation is the finished row, the BaseLayout observer fires on sight and falls back to
showing everything where there is no IntersectionObserver, and the first frame of the
press is the name itself, ghosted and oversized, rather than nothing.

**The results pages.** A year page's title is a numeral, so it is struck on at poster size
(`headlineStamp` on PageHeader, the hero's press and its second pass of rust ink). The two
winners of each race went on the board. The age-group leaders and the full field went onto
the race-day clipboard, which is what a timing sheet was written on. The clipboard's sheet
is the page's own paper rather than the plate stock, deliberately: `.clip__sheet` inverts
with the theme, and inverting it here would have set the entire archive in cream on
charcoal and forced every link, age and place number on it to be re-coloured. Below the
small breakpoint the clipboard reaches into the page's gutter, because the board, the clip
and the sheet each take padding and stacked they cost the Name column 75px and started
wrapping names.

On the archive index the row stopped being one big link. A link cannot contain a link, so
while the whole row went to `/results/<year>` the two winners printed on it could not go
anywhere: it was the only page on the site that names a finisher and will not take you to
them. The year carries the destination now, and the names are links.

**The contact page's map.** The "coming from out of town" band showed a screenshot of
Google Maps uploaded to the CMS. `npm run map-region` bakes the same view from this site's
own map instead: `scripts/capture-region-poster.mjs` is a thin wrapper round the existing
poster pipeline, and the composition lives in CourseMapLibre's poster block beside the
course poster's. Flat, topographic, with The Oval, downtown and CVG pinned in the map's own
marker style; The Oval's pin is the first point of the recorded course rather than a
coordinate typed in. It renders in the home poster's ridge-cut frame.

Getting the page to USE it without a Sanity write is `src/lib/local-poster.ts`: a block
whose call to action sends the reader to Google Maps is a block about where things are, so
it shows this site's map. A rule about what the block says, not about which block it is,
so it survives a re-seed and stops applying by itself the day the CTA changes. A schema
field would have been cleaner in the abstract and would have shipped dark until somebody
ticked it. See PENDING for the content edit that retires the rule.

One wrinkle Tier 1 accepted came off with it: the outlined label in a half-width column is
now sized by its container rather than by the window, so a long eyebrow holds one line.

Two things cost time and are written down where they will be found again. The map is built
with `maxBounds` as a leash, and MapLibre enforces that by silently CLAMPING a camera
wider than the leash, so the first region capture asked for zoom 10.75 over three cities
and was handed 11.75 over the park with no error anywhere; `window.__poster.cam()` now
prints what the camera actually settled at. And a media query carries no extra
specificity, so the board's wide-screen row rules had to move BELOW the base rules they
override.

_2026-09-17 — One grammar: one heading system, one button family, one ground._

An audit of the live site found three heading systems running at once and one button style
left over from the generic starter this repo was forked from. All three came from the same
place: a starter default that nothing had to opt into, so it leaked onto every band that
did not explicitly opt out.

**Headings.** `SectionHeading.astro` shipped small tracked caps over a short rust hairline
as its DEFAULT, with the outlined display label behind a `labelDisplay` flag. The flag is
gone and the label is the default; the starter's branch is removed from the component
rather than left dormant. The rule now is the one the rest of the site is built on:
a SELF_CONTAINED band is an object and wears the trail blaze (a ticket rail, a schedule
clipboard, a page header, the sign at the finish); a CONTENT band is a stretch of the page
and wears the outlined label. `ImageText`, `ContactBand` and `CoursePosterBand` each drew
their own eyebrow, which is how a page ends up with four of them without anyone deciding
to add one; all three now draw `.section-label`, the same rule the others use.
`ContactBand`'s headline came up from text-h3 to text-h2 with it, because under a label set
at display scale a 32px line read as a caption to its own eyebrow. Editors' eyebrow text is
untouched everywhere.

`CommunityBand` keeps its own label on purpose. That eyebrow sits INSIDE the pinned notice
card rather than at the top of the band, so it belongs to the object, like the "Race
director" label inside the parks band.

**Buttons.** `CtaLink.astro` resolved a Sanity link to a bronze pill or an outlined bronze
link. Every button this site draws is a sign plate, and most callers had already worked
around the mismatch by passing `class="btn-plate"`, which won because `.btn-plate` is
unlayered and Tailwind's utilities are not. The two callers that had not — the "Ask a
question" buttons on /course and /contact — were the only outlined buttons left anywhere.
The variants now map onto the plates: primary is the rust plate, secondary the cream one.
There is no third, un-plated variant, so an outlined button cannot render. The base class
list lost the padding, radius, size and weight utilities it was carrying, because the plate
overrode every one of them; what is left is the 44px tap target, the focus ring and the
press easing.

**Ground.** The results archive, the year pages and the runner pages were the only stretch
of the site that could have belonged to someone else's build: a bare eyebrow and a title on
flat background, a smaller headline than /course or /records, no walk of prints, no rule
under the band. All three now open with `PageHeader`, the same object every other inner
page opens with, so they cannot drift from it again. `PageHeader` gained one prop,
`eyebrowHref`, because a year page's eyebrow is also the way back up to the archive.
Nothing was added below the band: the tables are the job of those pages and they stay
plain, the same reason the records boards sit on plain surface.

Verified in both themes at 1280 and on a Pixel 7 profile, on /, /course, /records, /results,
/results/2025, /contact, /404, /styleguide and a runner page through `wrangler dev`. Every
parity baseline was re-captured: the inlined stylesheet changed on all 31 routes because
four utilities are no longer generated, so no page could have passed unchanged.

_2026-09-17 — The records board shows only what a finish can prove._

The five transcribed 27K records dated 2010 to 2014 came off the board. Dave wrote that the 27K began in 2015, and none of the five (Brian List, Paul Odipo, Daniel Campbell, Daniel Heffernan, Charles Lowery) matched any result on file by name or by time, in any year or either distance (PENDING 1j had the full test). `scripts/retire-27k-records.mjs` backed them up to `scripts/data/retired-27k-records.json` and deleted them, along with the four athlete documents that existed only to be referenced by them; Charles Lowery stays because he has a 50K finish. The `recordEntry` collection is now empty, so every row on /records and every holder in the home page's records band derives from a result. The men's 27K record is David Riddle, 1:59:32, 2017. The merge logic that carries a transcribed record is unchanged and documented as dormant: the type remains for a record with evidence and no result, which none of these were. The seed no longer creates transcribed records at all.

_2026-09-13 — A Studio publish reaches the live site._

The publish webhook had been configured since 2026-09-08 and had never delivered once. The cause was one missing word: the `Authorization` header carried the GitHub token on its own, with no `Bearer ` in front of it, so GitHub answered 401 every time. Everything else about the hook was already right. Fixed in the Sanity manage UI and proven with a forced revision, which produced `repository_dispatch` runs in seconds and deployed.

The reason it took five days to find is worth keeping. The 2026-09-08 test wrote a document's existing value back to itself and concluded from the silence that nothing was being delivered. Sanity does not bump `_updatedAt` for a patch that changes nothing, so that test could never have fired the hook whatever the header said. A test that cannot fail for the reason you are testing is worse than no test: it produced a confident, wrong diagnosis that sat in `docs/PENDING.md` as fact. Closes PENDING 1f.

_2026-09-06 — The starter catches up: Sanity phase 1, the family test standard, and two workflows harvested from the retiring church starter._

The starter had become the odd one out. It is structurally the canonical source (57 files carry the `PORTABLE` marker, PORTS.md has 44 cards, every client repo's `scripts/sync-check.mjs` diffs against it), but its stack and its gates were older than the sites it governs.

**A — Sanity phase 1** (PORTS card 10). `sanity` 6.4.0 to 6.9.1, `@sanity/vision` to 6.9.1, `@sanity/ui` 3.3.5 to 3.5.4, `@sanity/client` 7.23.0 to 7.26.2, `@sanity/visual-editing` 5.4.5 to 5.7.3 in both `dependencies` and `overrides` (npm refuses the whole install with EOVERRIDE otherwise), `@sanity/preview-url-secret` 4.0.8 to 4.1.5 (5.7.3 and 6.9.1 both want ^4.1.2, and 4.0.8 would nest a second copy). Stops at 6.9.1 deliberately: 6.9.2 is a PATCH release that crosses to `@sanity/ui` 4, which is a real migration. `@sanity/icons` stays on 3.x hoisted and the `sanity-plugin-utils` 2.0.6 override stays pinned. The same set is already human-verified in a signed-in Studio on presacademy, reid-design-site and mas-monograms. Verified here: exactly one `@sanity/ui` and one `styled-components` on disk and in the lockfile, one `errors.md#` bundle, typegen byte-stable, parity 10/10 after re-capture (the Studio's vendor CSS chunks moved; no page content did).

**B — The family test standard** (new PORTS card 35). The repo had `ci.yml`, `deploy-staging.yml` and `publish-due.yml`, no Playwright, no Lighthouse, and a CI job that ran typegen, build and the unit tests only. It now runs the family's whole gate: `astro check`, eslint, `prettier --check`, unit tests, `check:links`, the four Playwright suites on chromium and a WebKit iPhone profile, and a separate `lighthouse.yml` with an explicit url list and accessibility as a hard gate at 1.0.

Turning gates on for the first time is where the value was. `astro check` reported **222 errors**, and 163 of them were one bug: `sanityFetch(query, {}, null)` let TypeScript infer `T` from the empty fallback, so every page helper resolved to `Promise<null>` and every property read downstream was "does not exist on type 'never'". Two overloads on `sanityFetch` name what an untyped GROQ projection actually returns. The rest: `modules/` was being type checked in place when it is staged by design; nine components each redeclared a narrower image type than the projection returns (one shared `SanityImageObject` now); four hand-authored "U7" projected block types had drifted from the generated ones, which was a TODO the type check closed; a patch-builder interface that made `.setIfMissing(...).commit()` uncompilable; a spacer-divider branch testing for a variant the schema has never offered.

`check:links` found **135 broken internal links across ten pages**, all one cause: the nine opt-in module routes were treated as visible-unless-switched-off, like core sections, so a fresh clone rendered a footer and a nav full of links to routes it never builds. `getSectionVisibility` now has two rules, one per kind of route.

The Playwright suites found three real bugs on their first run: two region landmarks with the same accessible name on `/privacy`; `text-foreground/60` under 4.5:1 in two places; and every `<select>` on `/contact` with no focus indicator at all on Safari and iOS, because a Tailwind `focus:ring` is a box-shadow and WebKit drops box-shadow on native form controls. Chromium showed nothing wrong for that last one, which is the argument for running the sweep on both engines.

The format pass was verified with `npm run parity`, not by eye. A prettier pass can silently eat a meaningful space in an Astro template, and the one apparent text difference turned out to be React's `<!-- -->` separator moving where the parity normalizer collapses whitespace; the real `dist/client` HTML still reads "How did you hear about us? (optional)".

**C — Harvested from `ncs-church-starter`** before it is retired as a second library of record: `sanity-backup.yml` and `uptime.yml`, in the church starter's template stance (gated, schedule commented out, project id and origin read from repo variables) with the fixes the client repos had already earned folded in, encrypt-before-upload and the `--project-id` flag. The church-specific schema types were deliberately not taken; that is a separate decision.

---

_2026-08-28 — The Squarespace-grade editor: Astro 7, Sanity 6.4, embedded single-package Studio, live preview, in-canvas section controls._

The template takes the whole modern stack its descendant presacademy pioneered, so every future site is born with it. Four phases, each gated before the next.

**A — Framework upgrade.** Astro 6.3 to 7.2, `@astrojs/cloudflare` 13.5.5 to **14.2.4 exact** (the last release whose wrangler peer range fits the pin below), `@astrojs/react` 6, `@astrojs/mdx` 7, `wrangler` pinned `~4.110.0` (PORTS card 14), react/react-dom/react-is pinned **exact** 19.2.7 (card 13), and the `overrides: { vite: "^7" }` pin removed (it broke Astro 7's prerender step). `scripts/with-workerd.mjs` is now wired into `npm run build` (card 1), so the Windows prerender crash is handled rather than merely documented. Plus `session: false` in `astro.config.mjs`, `nodejs_compat` in `wrangler.jsonc`, `assets.not_found_handling` removed, and deploy switched to `wrangler deploy -c dist/server/wrangler.json`. Adapter 14 splits the output: `dist/client` is the static site, `dist/server` the SSR bundle.

Parity baselines were re-captured. Every diff across all nine routes was categorized first, and all of them fell into four framework-caused classes with nothing structural left over: the `<meta name="generator">` version string; `<astro-island uid="...">` (a generated identity, same family as the `prefix` the harness already normalizes); inline `<script>` and `<style>` bodies (esbuild and lightningcss changed their output); and whitespace inside text nodes (the Astro 7 compiler trims it). No class, id, aria, href, JSON-LD or text changed anywhere.

**B — Sanity 6.4 pin set and the studio fold.** The nested `studio/` package is **gone**. Schemas, structure and components moved to `src/sanity/`, the configs to the repo root (`sanity.config.ts`, `sanity.cli.ts`): one `package.json`, one `node_modules`. That is the real fix for the dual-module-tree crash that took presacademy's production Studio down on 2026-08-26 (card 10); `resolve.dedupe` is kept anyway as cheap insurance against a fork reintroducing a second resolution root. The Studio is now **embedded at `/studio`** through `@sanity/astro` and rebuilds with every deploy, so there is no hosted Studio to drift and no `studio:deploy` step; `sanity.cli.ts` deliberately omits `studioHost`/`deployment` so a stray `sanity deploy` cannot recreate the split. `buildLegacyTheme` (light-only, which left the Studio's dark mode all-white) gave way to `@sanity/ui`'s `buildTheme`; `apply-brand` now rewrites the Studio's two font stacks instead of a dozen legacy colour variables, and `brand.config.json`'s `studio.themeProps` became `studio.fonts`. `sanity-plugin-iframe-pane` retired in favour of the Presentation tool. CI lost its studio-prefix steps. Verified: exactly one `@sanity/ui` on disk, exactly one `errors.md#` chunk in the build, typegen byte-stable, standalone `npx sanity build .studio-dist` green, and the embedded Studio mounting in a real browser.

One markup change arrived with the refreshed lockfile and is unrelated to the fold: a newer react-aria inside `sonner` adds `data-react-aria-top-layer="true"` to the toaster region. After masking the framework-caused classes above, that attribute was the **only** residual difference on any page, which is what proved the fold itself render-neutral. Baselines re-captured a second time to absorb it.

**C — The preview stack** (cards 10 and 11). `src/lib/cms-preview.ts` (a second, runtime, draft-and-stega Sanity client, with this template's own enum fields seeded into `NON_STEGA_FIELDS`), `src/lib/preview-auth.ts` (a token fingerprint in the preview cookie, not the package's forgeable `'true'`), `/api/draft-mode/enable` and `/disable`, `/preview/live` (an SSE proxy over Sanity's listen API, never a poll), `/preview/[...slug]`, `PreviewLayout.astro` (chrome-less, forced motion end-states, the embedded-frame exit-button fix, and the click interceptor carrying this template's route map), `VisualEditingOverlay.tsx`, plus `src/sanity/resolve.ts` and a `PreviewNavigator` page list wired into `presentationTool`.

Because this template is page-builder-first, the four builder pages and every custom `page` doc preview in **full fidelity** through the same `SectionRenderer` the live page uses. The five bespoke pages (faq, contact, journal, privacy, 404) preview as their editable surface with a note saying so. No page-builder conversion was attempted: that is card 12 and a separate job.

Everything **fails closed** without `SANITY_TOKEN`, and legibly. The preview entry points answer 503 naming the missing pieces rather than throwing a Sanity client error, because a fresh clone hitting `/preview` should read as "not set up yet", not as a bug in the template.

**D — In-canvas section controls** (card 17). `src/lib/preview-edit-attr.ts` plus a preview-only wrapper in `SectionRenderer`: with `editDoc` absent the wrapper is a `<Fragment>` and renders nothing at all, which is why the static build stayed byte-identical and `npm run parity compare` passes 10/10 with the feature installed. The `pageBuilder` arrays gained a shared grouped, searchable insert menu (`SECTION_INSERT_MENU` in `sections.ts`), which is the menu that opens **in the canvas** when an editor inserts a section. The seeded in-Studio guide gained a Preview map row, two how-tos and a tip covering all of it.

---

_2026-05-30 — Forked from the Reid Design build; genericized to the ncs-astro-sanity-starter (core foundation + opt-in module library + bootstrap docs). Future projects start their own history from this entry._

---

_2026-06-12 — Audit-driven hardening + UI component stack + CI (U1-U10)._

- **Structured data genericization.** Replaced client-specific nouns in JSON-LD, OG, and page copy with generic tokens. `businessType` field on `siteSettings` drives the schema.org `@type` value.
- **Robots + RSS endpoints.** `src/pages/robots.txt.ts` generates allow-all + correct sitemap reference at build time; `src/pages/journal/rss.xml.ts` wires `@astrojs/rss` for the journal feed.
- **Accessibility fixes.** Skip-link, aria labels, color contrast, heading hierarchy, and keyboard-nav passes across all section components.
- **Module query fixes.** Co-located query files for all 13 modules audited and corrected; module routes verified against `siteSettings.sectionVisibility` toggles.
- **apply-brand hardening.** `--check` flag (dry-run diff mode), `brand.config.schema.json` validation, `--radius` knob for border-radius token, `workerName`/`domain` field coverage, print footer rewrite. `docs/brand/` is current.
- **CI + lint + 79 tests.** `.github/workflows/ci.yml` mirrors the local gate (`npm run check`): typegen, site build, Studio build, all tests. `npm run check` is the canonical one-command pre-commit gate. New scripts: `lint`, `lint:fix`, `format`. Test suite expanded to 79 tests across 6 files in `src/lib/` (adds `scriptAccent`, `slugify`, `sectionVisibility`, `utils`).
- **UI component stack.** `src/components/starwind/` (Astro-native accordion, dialog, dropdown, tabs primitives). `src/components/primereact/` (PrimeReact escape hatch with `PrimeIsland.tsx` wrapper). Magic UI token audit applied. `docs/agent/component-sources.md` added (shadcn, Radix, Vega, Starwind, Magic UI, PrimeReact sourcing guide + token-remap cheat sheet).
- **Four new page-builder blocks.** `faqSection` (inline FAQ accordion, SELF_CONTAINED, references `faqItem` docs), `logoStripSection` (client/partner logo row or grid, SELF_CONTAINED), `embedSection` (sandboxed iframe/URL embed for Calendly/Tally/etc., SELF_CONTAINED), `teamSection` (inline team member grid, SELF_CONTAINED). Block library grows from 17 to 21 total (11 general + 10 rich).
- **Schema flexibility.** `businessInfo` gains `businessModel` (`'in-person'`/`'remote'`) and `additionalLocations`. `siteSettings` gains `socialLinks` structured array (supersedes legacy flat social fields). `faqCategory` document type added; `faqItem` gains `categoryRef` reference field.
- **Three new modules + virtual-services rename.** `events`, `donations`, `team` modules added (routes: `/events`, `/donate`, `/team`). `e-design` module renamed to `virtual-services` (route: `/virtual-services`). Total modules: 13.

---

_2026-06-12 — Page-builder-first upgrade (A through D)._

**A -- Page-builder core.** `studio/schemaTypes/sections.ts` defines 9 general block types (heroSection, richTextSection, imageTextSection, gallerySection, quoteSection, statSection, ctaBandSection, videoSection, spacerSection), a `SECTION_TYPES` constant as the single source of truth, and `additionalSectionsField` as an append zone any page can import. `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic extracted to `src/lib/sectionCadence.ts`, unit-tested; blocks carry no color field). A custom `page` document type gives editors free-form pages served by `src/pages/[slug].astro`. Reserved-slug guard lives inside `getStaticPaths` (Astro isolated-scope requirement); shared list at `src/lib/reservedSlugs.ts`, unit-tested. `businessInfo` singleton split out of `siteSettings` (service areas, travel, availability, geo); `getSiteSettings()` merges them back under flat names. GROQ `sectionsProjection()`, `getPage`, `getAllPageSlugs`, and `getNavPages` added to `src/lib/queries.ts`.

**B -- Section-driven core pages.** `studio/schemaTypes/richSections.ts` defines 8 rich section types (founderSection, servicesGridSection, testimonialsSection, storySection, valuesSection, processSection, serviceAreaSection, guaranteeSection) and per-page curated lists. The home, about, services, and process pages now hold a `pageBuilder` array (their old structured fields are hidden + readOnly for rollback); all four routes render via `<SectionRenderer>`. `src/data/defaultSections.ts` holds code-defined default section arrays so a fresh clone with no Sanity project still renders non-blank. The process page graduated from a module into core. `scripts/seed-core.mjs` seeds the `pageBuilder` arrays.

**C -- Modules (lean).** The 9 feature modules (portfolio, shop, e-design, gift-certificates, press, resources, lead-magnets, style-quiz, budget-calculator) ship built and OFF under `modules/`. Enabling is now copy-a-folder: each module's query functions live at `modules/<name>/src/lib/<name>Queries.ts`, so there is no hand-pasting into core `queries.ts`. `siteSettings.sectionVisibility` toggles each. Offering pages (e-design, gift, press, resources) stay fixed-order by choice.

**D -- Brand reskin system.** `brand/brand.config.json` is the single source of truth (identity + palette + fonts + logo paths). `npm run apply-brand` (`scripts/apply-brand.mjs`) deterministically and idempotently rewrites `globals.css` tokens, `src/data/site.ts`, `studio/sanity.config.ts`, OG inputs, and font imports, then regenerates the OG image. The `/reskin` Claude skill (`.claude/skills/reskin/SKILL.md`) orchestrates the full rebrand: interview, font package install, apply-brand, WCAG AA contrast check, visual check via defaultSections, copy retone, and human checklist.

**Verification baseline after this upgrade:** `npm run build`, `npm run typegen`, `npm test` (22 node --test unit tests for sectionCadence + reservedSlugs), `npm --prefix studio run build`. Live Playwright screenshots and actual seed runs require a connected Sanity project.*

---

_2026-08-27: This starter becomes the library of record for the site family._

Six canonical files were installed at their natural paths, each carrying a first-line
`PORTABLE:` marker naming this repo as the library of record: `scripts/with-workerd.mjs`
(Windows workerd wrapper, a no-op until the Astro 7 / adapter 14 upgrade),
`scripts/free-dist.mjs` (releases a stale dev server's handle on `dist/`, genericized so
a copy needs no edit in any repo), `scripts/page-parity.mjs` (rendered-HTML parity
harness, parameterized to auto-detect `dist/client` versus `dist` and to auto-discover
its routes), `scripts/lib/sanity-lib.mjs` (seed/patch plumbing: dry-run-by-default apply
gate, Portable Text builders, idempotent asset uploader, reconciled onto the existing
`scripts/lib/loadEnv.mjs` rather than carrying a second env parser), `src/lib/contrast.ts`
(WCAG contrast math), and the new `scripts/sync-check.mjs` (the drift check itself).

`src/lib/theme-tokens.test.ts` applies contrast.ts to this repo's own `@theme` palette,
so a reskin that pushes body text under 4.5:1 fails `npm test` instead of shipping.
`.github/workflows/ci.yml` gained the stale-types guard: CI regenerates the Sanity types
and fails if the committed `src/lib/sanity.types.ts` differs. New npm scripts: `parity`,
`sync-check`, `free-dist`. Parity baselines for the nine built routes are committed in
`scripts/.parity/`, proven by a build, capture, rebuild, compare cycle at 9/9 PASS.

`PORTS.md` was created with fifteen port cards and the applied-to matrix. See the
[Library of record](../../CLAUDE.md) section of CLAUDE.md for the working rules, above
all the docs-in-sync clause: an improvement that generalizes gets a card in the same
commit that generalizes it.
