# PENDING.md - open loops in this repo

Created 2026-08-28 (PORTS.md card 15). This is a **registry, not a narrative**: every
entry is a live open loop with its blocker, and it is edited in the same commit as the
thing it tracks. When an item closes, delete it and note the closure in
`docs/agent/changelog.md`, which is the prose ledger.

Read this early in a session. The point is that a new session inherits the queue instead
of rediscovering it.

Related registries: `PORTS.md` (what is shared with the rest of the site family, plus the
applied-to matrix and `npm run sync-check`), `docs/agent/changelog.md` (what happened, in
sequence).

---

## Waiting on a human

### 1. Verify the live preview against a real Sanity project

**Blocker: this template has no Sanity project, by design.**

The 2026-08-28 upgrade installed the whole preview stack, but a template cannot prove the
half that needs credentials. What WAS verified here: the build, the embedded Studio
mounting in a real browser, `/preview/live` returning 403 without the Studio cookie, and
every preview entry point failing closed with a 503 that names the missing configuration.

What is still unproven, and what a fork should check on its first real project:

- `/preview` renders a draft page (a builder page in full fidelity, a bespoke page as its
  editable surface with the note).
- `/api/draft-mode/enable` returns **401** on a bad secret and sets the cookie on a good
  one. (With no project configured it cannot get that far and returns 503 instead.)
- Click-to-edit opens the right field, and no enum-driven block takes the wrong branch
  (that would mean a missing name in `NON_STEGA_FIELDS`).
- The in-canvas section controls appear on hover: insert before/after through the grouped
  menu, duplicate, remove, drag to reorder.
- An edit in another tab reaches the preview through `/preview/live` without a reload.
- **The floating controls from PORTS.md card 28** (added 2026-08-28). These are the least
  provable part of the stack, because every one of them needs a resolver context the host
  only builds against a real schema:
  - clicking a heading on a text block, CTA band, services grid, testimonials or FAQ
    section shows "Accent a word", and clicking a word in the card sets `headingAccent`
    in the draft (the Studio's unpublished-changes badge should move);
  - clicking the same word again clears it;
  - clicking a subhead on any of the six twin-carrying sections shows "Edit here", the box
    is seeded with the plain string, and the B / I buttons store `strong` / `em`;
  - pasting a styled paragraph out of a word processor into that box keeps only bold and
    italic and drops fonts, colours and tables;
  - the card survives the pointer travelling to it (see the own-open-state rule on the
    card) and closes on Escape, on Save, and on a click outside;
  - Ctrl+Z in the Studio undoes what the card wrote (card 27).

Whoever does this first should report back so PORTS.md cards 10 and 28's starter cells
carry a verified-in-anger note rather than an installed-and-gated one.

---

### 1a. Sign in to a Studio built on the phase-1 Sanity set

**Blocker: no agent can do this, and this template has no Sanity project.**

2026-09-06 moved this repo onto the family's phase-1 Sanity set (`sanity` 6.9.1,
`@sanity/ui` 3.5.4, `@sanity/client` 7.26.2, `@sanity/visual-editing` 5.7.3). Every
automated gate is green and the single-instance invariant holds on disk and in the
lockfile, but the login screen is core code and renders fine even when the
styled-components theme context is broken. The set is already human-verified on
presacademy, reid-design-site and mas-monograms, so the risk here is low; what is
unverified is this repo's own custom Studio panes and the in-canvas overlay against it.
Whoever forks this next should sign in, open the desk, and drive the Presentation tool
until an in-canvas control draws and writes back, then note it here.

Do NOT take `sanity` 6.9.2: that PATCH release crosses to `@sanity/ui` 4, which is a real
migration (PORTS.md card 10, phase 2).

---

### 1b. DONE 2026-09-07. CI deploys, and the results import is live

`.github/workflows/results-import.yml` is active. All three secrets are set
(`SANITY_API_WRITE_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), and
a forced run proved the whole chain end to end on 2026-09-07: gate passed, the
importer reached RunSignUp and reported 1961 before and 1961 after (idempotent,
as designed), typegen and build ran, and wrangler deployed the `stonesteps-50k`
Worker. The deployed site was then re-checked and serves real content, which is
the thing that could have gone wrong: a CI build with no Sanity env would have
shipped a green, empty site over a good one.

This was also the first deploy of this project that did not come from a laptop.
A content edit published in the Studio still needs a rebuild to go live, and
nothing yet triggers one on publish. A Sanity webhook pointed at a
`repository_dispatch` is the obvious next step if that becomes annoying.

Still not set, and unrelated to the above: `sanity-backup.yml` wants
`SANITY_AUTH_TOKEN` and `BACKUP_PASSPHRASE`, and its schedule is still
commented out.

### 1d2. DONE 2026-09-08. The six WCP tools are verified signed in

Ported 2026-09-07: Welcome, Checkup, Start a new race year, the first-visit
tour, plus visual regression and link health outside the Studio. The two CI
pieces are verified green in CI. The four Studio panes compile and the bundle
loads clean, but panes only render after login. Worth a click-through:

- Welcome lists seven task cards, and each one navigates rather than 404s.
- Checkup runs and reports (it should currently flag the unmarked trekkers and
  the synthetic elevation profile).
- Start a new race year shows a live status per step.
- The tour appears on a first visit in a fresh browser profile, and the Welcome
  pane's "Show the welcome tour again" reopens it.

### 1d. DONE 2026-09-08. The desk is verified signed in

The Help & Guide handbook replaced the starter's Start Here panes on
2026-09-07. The Studio bundle loads with zero console errors, which proves the
new module parses, but the desk itself only builds after login and the Chrome
connection dropped before it could be walked. Open /studio and check: Help &
Guide lists five category headings with twelve guides under them, a guide opens
and renders its blocks, and the "Where in the Studio" cards navigate rather than 404. A structure error shows as a broken pane, not a build failure.

### 1e. DONE 2026-09-08. The dead starter panes are gone

Three deleted with their schema types (studioGuide, studioNotes,
studioPlaybook): BusinessOverview, StudioGuide and StudioPlaybook were all
written for a design studio and none had a document in this dataset.

BrandKit was kept and rewritten. It is genuinely useful for a race, a flyer or a
Facebook post needs the right colours, but it shipped carrying the STARTER'S
slate-and-ink palette. It was never wired into the desk, which is the only
reason nobody was ever handed those as "the Stone Steps brand". It now carries
the real values and sits in the menu. All nine of its swatch pairings were
checked at 4.5:1 or better before shipping, and the two combinations it warns
against measure 1.15 and 1.09, which are the two contrast bugs that actually
shipped on 2026-09-07.

### 1g. Design review: light mode needs a real decision

`docs/design-review-2026-09-08.md` is the full write-up. The headline: the brand's
language is a high-contrast object on a ground, and it measures 15.19:1 in dark
mode against 1.09:1 in light, so in light mode the objects vanish into the page.
The heavy drop shadows exist to compensate, which is what makes dark text look
muddy. Lightening the page cannot fix it (two light colours top out around
1.5:1); inverting the objects to forest and charcoal on cream restores 7.7 to
11.8:1 and makes the shadow correct again. Ordered plan is in section 6.

### 1f. DONE 2026-09-13. The Studio publish webhook delivers

The cause was the first row of the table this entry used to carry: the
`Authorization` header held the token on its own, with no `Bearer ` in front of
it, so GitHub answered 401 and Sanity had nothing to report beyond a failed
attempt. Everything else was already correct: POST, the dispatches URL, the
`production` dataset, create/update/delete ticked, the `!(_id in
path("drafts.**"))` filter and a projection of exactly
`{"event_type": "sanity-publish"}`, which matches `types: [sanity-publish]` in
deploy.yml.

Fixed by prefixing the header value in the Sanity manage UI. Proven rather than
assumed: a forced revision on `siteSettings` produced `repository_dispatch`
runs within seconds, they deployed, and the deployed site was re-checked
afterwards.

TWO THINGS LEARNED WHILE TESTING, both worth knowing before anyone tests it
again.

1. **A no-op patch does not fire it.** Writing a field's existing value back
   leaves `_updatedAt` untouched, which is why the 2026-09-08 test concluded
   nothing was being delivered when the header was the whole story. A real test
   needs a real revision: change a value and change it back.
2. **Queued dispatches collapse.** deploy.yml uses a `deploy-production`
   concurrency group with `cancel-in-progress: false`, so runs queue rather than
   abort, but GitHub keeps only the newest PENDING run and cancels the ones
   behind it. Three dispatches produced two successes and one cancellation, and
   that cancellation is the concurrency group working, not a failure.

### 1c. Nobody knows who the trekkers are after 2016

Trekkers take the optional early start and the race makes them ineligible for
age group and overall awards, so `src/lib/age-brackets.ts` excludes them from
every derived record. Only 2004 to 2007 carry the flag, because those years came
from spreadsheets with a Trekkers column. RunSignUp does not tell the importer
who they are, so of 1,032 results from 2017 on, none are marked.

An unflagged trekker can therefore take a record they were not eligible to win.
Ask David Corfman, or the timer, how the early start is recorded in RunSignUp.
If it is a bib range or a separate event, `scripts/import-results.mjs` can read
it and this closes itself. If it lives only in his head, someone has to tick the
box in the Studio each year.

## Known gaps, deliberately open

### 0c. A field-level "Take me there" focuses the field but does not scroll to it

**Cosmetic, Sanity's own behaviour, low priority.**

A guide link can name a field (`{ doc: 'race', field: 'raceDate' }` in
`src/sanity/components/studioLink.ts`), which becomes Sanity's `path=` intent
parameter. Verified in the deployed Studio on 2026-09-12: it opens the right
document, selects the right field group tab, and puts the cursor in the field.
It does NOT scroll the field into view, so on the race document the focused
Race day input sits below the fold and the reader still has to scroll, just not
hunt. Sanity's own focus handling owns that scroll; nothing in this repo passes
it a scroll option. Worth a look if the Studio is upgraded, or if it turns out
an in-Studio click (rather than a pasted URL, which is how this was tested)
already scrolls.

### 0b. `npm run dev` logs "Invalid hook call" on every island render

**Blocker: the second React instance is inside the workerd dev runtime, past the config knobs.**

Under the Cloudflare adapter the dev SSR environment is named `astro` and runs through
workerd's module runner. Diagnosed 2026-09-11: `react-dom/server` and the islands' `react`
were arriving by different paths (raw `node_modules` vs Vite's transform), so `react` was
evaluated twice and `ThemeToggle` / `StatsCounter` threw `Cannot read properties of null
(reading 'useRef')` during SSR; Astro fell back and the page still rendered. Pre-bundling the
React family for that environment (`vite.environments.astro.optimizeDeps.include` in
`astro.config.mjs`) fixed the throw: renders now succeed and the SSR HTML is complete. React
still prints its dev-only "Invalid hook call" warning once per island per render, which means
it can still see two module instances somewhere in that runtime. Production builds do not run
the optimizer and are unaffected (CI smoke and Lighthouse render the islands fine). Tried and
rejected: `optimizeDeps.include: ['react/compiler-runtime']` (made it worse). Next things to
try: `resolve.noExternal: ['react', 'react-dom']` on the `astro` environment, or a newer
`@astrojs/cloudflare` that names or handles the environment itself.

### 0a. Five race dates are unknown, so the weather strip starts in 2006 with gaps

**Blocker: no captured page from those years names the date.**

The course page's race-day weather strip (`raceWeatherSection`, added 2026-09-11) reads
`scripts/data/race-days.json`, one `{ year, date }` per edition, and `scripts/build-weather.mjs`
turns that into `src/data/raceDayWeather.json` from Open-Meteo's ERA5 archive. A year with
no confirmed date is simply absent from the strip; nothing is guessed.

Confirmed: 2006 (Oct 22), 2007 (Oct 21), 2008 (Oct 19), 2009 (Oct 25), 2010 (Oct 24),
2013 (Oct 27) and 2014 (Oct 26, from a single capture) from Wayback captures of the old
site, and 2015 through 2026 from RunSignUp's past events.
**Unknown: 2003, 2004, 2005, 2011, 2012.** The archived results pages carry no dates, the
race did not run on a fixed Sunday (2017 was the fifth Sunday of October, 2024 the third),
and two Wayback sweeps (strict and relaxed date patterns, up to 16 pages per year) found
nothing for those five; 2003 and 2004 have no autumn captures at all. Likely sources still untried: the race director's own records,
the 2009 and 2010 entry-form PDFs (Wayback has them; text extraction was not attempted), and
Ultrarunning Magazine's results archive. Add a date to `race-days.json` with its source,
re-run `node scripts/build-weather.mjs`, commit the JSON.

### 0. One archive gap is left, and the results pages say so

/results renders every edition from 2003 to 2025. Two of the gaps this entry
used to list are closed (2026-09-12): 2020, both distances, and the 2021 27K
were on RunSignUp all along, published through custom results pages that the
REST API cannot reach, and `scripts/import-results-html.mjs` reads them from
the HTML. The 27K before 2015 is missing for a different reason: it was timed
on runningtime.net, which no longer exists. That gap is stated on the page
rather than hidden by skipping the year.

One thing would close it, and it is not code: ask David Corfman whether a copy
of the pre-2015 27K survives anywhere.

### 0a. Two near-duplicate athletes were examined and NOT merged

`REJECTED_ALIASES` in `src/lib/athlete-aliases.ts` carries Garry/Gary Blair and
Jerry Swartzel/Swatzel. Both look like one person spelled two ways and neither
carries an age on both sides to prove it. If a source ever turns up that settles
one, move it into `ATHLETE_ALIASES`, run `node scripts/repair-athletes.mjs`, then
re-run both importers. Do not merge on the strength of the names alone: merging
two people states someone else's finishing times as fact under a real name.

### 2. `npm run parity compare` is not a CI step

The baselines in `scripts/.parity/` are captured on a developer machine, and nobody in
this family has yet proved a Linux CI build reproduces them byte for byte. Parity is a
local gate today; `.github/workflows/ci.yml` carries the reason inline. To close this:
capture on CI once, diff against the committed baselines, and wire the step in if they
match.

### 3. `@astrojs/mdx` is installed but unused

No `.mdx` file exists in `src/` or `modules/`. It is kept because a project may want MDX
for long-form content, and removing it from a template is harder to undo than leaving it.
Drop it during a slop sweep (card 16) if it is still unused then.

### 4. The adapter and wrangler pins are tighter than the bug requires

`@astrojs/cloudflare` is pinned exact at 14.2.4 and `wrangler` at `~4.110.0`. Verified
2026-08-28 that 14.2.4 does **not** emit `legacy_env` into the generated config, so card
14's original failure does not reproduce here; the pin holds the pair together because
14.2.5 peers `wrangler ^4.125.0`, one minor from the version that rejects the field.
Revisit when a newer adapter's peer range and emitted config are both checked by hand
against a real `wrangler dev` and a real deploy.

### 5. Seven eslint warnings, all unused bindings

`npm run lint` is a CI step now (2026-09-06) and exits clean, but it still prints seven
`@typescript-eslint/no-unused-vars` warnings: unused imports in `Footer.astro`,
`BusinessOverview.tsx`, the journal index and a couple of others, plus one unused
`SHOW_THRESHOLD` in `BaseLayout.astro`. Warnings do not fail the run. Triage them in a
slop sweep (card 16); each is either a dead import to delete or a binding that was meant
to be used and is not, which is the more interesting kind.

### 7. Two PORTABLE scripts are excluded from prettier

`scripts/sync-check.mjs` and `scripts/page-parity.mjs` are the only marked files whose
quoting `prettier --write` would rewrite, and reid-design-site, mas-monograms and
presacademy carry them byte-exact. Formatting them here would put four repos into DRIFT
the moment anyone runs `npm run sync-check`. They are in `.prettierignore` with that
reason inline. To close: format them in ONE pass that lands in every repo in the family
at the same time.

### 8. The sibling repos will report DRIFT on the new test files

The family test standard's six canonical files were written here on 2026-09-06
(`playwright.config.ts` and five of the six files in `tests/`). The client repos got the
same standard the same day, but their copies were written against their own sites and
carry different comments and, in `a11y-dark.spec.ts`, an inline `FORM_ROUTES` that has
been moved out to `routes.ts` here. So the first `npm run sync-check <repo>` after this
lands will report DRIFT on those files. That is the library of record working as
designed, not a bug: the next sync session pushes this repo's copies out. Do the sync
before treating any drift report from those paths as meaningful.

### 6. `docs/agent/` deep-dives still carry client-specific nouns

Flagged in CLAUDE.md's topic index since the fork. The 2026-08-28 pass corrected every
stale `studio/` path and every `studio:deploy` instruction in the live docs, but the
examples inside them were not retoned. Trust the patterns; fix nouns when you touch a
file.

### 9. The `\s` stega lesson is not in the starter or the sibling repos

2026-09-12. A stega payload is written in U+200B, U+200C, U+200D and U+FEFF, and U+FEFF
matches `\s`, so splitting a preview display string on whitespace shatters the payload
into fake words. Here it turned the home hero's three-word wordmark into 157 words and
grew the hero band from 1032px to 1879px, in the preview only. Fixed here by
`src/lib/display-words.ts` (+ test), which is site-specific: the wordmark is this site's.

The LESSON is family-wide and is not written down anywhere the other repos will see it.
`splitStega` already lives in the PORTABLE `src/lib/preview-stega.ts`, so nothing needs
porting, only saying: **clean a display string before any `split`, `length`, `slice`,
truncation or word count.** To close: add it to the starter's preview section in
CLAUDE.md next to the existing "never compare a stega-encoded string" rule, and note it
on the preview PORTS card. Vault note: `_vault/gotchas/stega-run-contains-whitespace.md`.

### 10. Lighthouse performance sits at 88, and the last lever is the stylesheet

2026-09-12. Nathan asked for performance over 90. It was a median of 80 across
five runs of the deployed home page; the cause was real and is fixed (the
wordmark's stamp keyframe started at `opacity: 0`, so the largest element on
the page did not count as painted until its press had landed, and Lighthouse
put LCP at 4.7s). Median is 88 now, runs ranging 80 to 89 on identical code.

WHAT IS LEFT IS THE MODEL, NOT THE SITE. Measured on a real throttled mobile
profile (4x CPU, 1.6Mbps, 150ms RTT, five loads, PerformanceObserver rather
than Lighthouse's simulation) the home page paints at **FCP 0.93s and LCP
1.06s**. Lighthouse's Lantern engine reports 2.1s and 3.6s for the same page
because it charges the two render-blocking stylesheets 763ms and 463ms.

Things that were measured and are NOT the problem, so nobody repeats them:

- The mud masks, the paper grain and the topo SVG each cost nothing measurable
  at first paint. An early A/B seemed to show the mud costing ~1s; that was an
  artefact of the test server not gzipping, which made the 236KB raw stylesheet
  the gate in every variant. Always compress in a local perf harness.
- `content-visibility: auto` on off-screen sections: no measurable change.
- Dead hand-written CSS: only 19 of 117 class selectors in globals.css appear
  nowhere in the built output, and several of those are used by the SSR-only
  preview routes, which are not in `dist/client`. There is no bulk win here.
- Tailwind is tree-shaking correctly: no staged-module utilities reach the
  bundle.

To actually close it, one of these, and the first is a design trade Dave and
Nathan should make rather than an optimisation:

- Cut the stylesheet. 43KB gzipped is the site's own design language, not
  waste, so this means dropping features.
- Art-direct the hero photograph for phones. It is a 1081x2048 portrait shown
  as a ~384px band, so Lighthouse reports ~96KB wasted. A phone crop would help
  the model and real users both, but which part of the runner survives the crop
  is a design call.

The CI gate asserts performance at 0.85 as a warning and passes.

### 11. The modern trail map: what is possible, and the one input missing

2026-09-12. Nathan asked whether the Stone Steps course could be printed onto
Cincinnati Parks' current trail map instead of the 1998 scan the course page
carries today. Investigated properly; the answer is yes, but not from the two
maps alone.

WHAT IS ESTABLISHED, so nobody re-derives it:

- Parks publishes two PDFs. The "printable trail map" is a raster-heavy poster
  (7.2MB, 67 embedded images). The "East Section" map is CLEAN VECTOR: 1,992
  paths, and every named trail is separable by stroke colour and dash pattern
  (Colerain dark green 2pt [2 2], Ponderosa brown 1.5pt [2 2], Beechwood yellow
  2pt [1 2], Furnas light green 1.5pt [3 4], Arboretum orange 1.5pt [3 4], and
  so on). A route drawn from those paths would be real geometry, not a tracing.
- The race's own 1998 map extracts cleanly too: thresholding its red and blue
  gives two continuous, unbroken loop polylines plus the direction arrows.
- The site knows the loops are 5.3 and 3.2 miles out of The Oval. It does NOT
  record which trails they use, and no named trail is either length, so each
  loop is several trails plus connectors.
- The two maps are in DIFFERENT ORIENTATIONS. An affine fitted to three
  landmarks (Arboretum Center, Oak Ridge Lodge, the disc golf course) comes out
  at roughly 55 degrees of rotation and 0.91 scale, and lands the Stone Steps
  about 90 map-points from where the 2017 map labels them. On a map where
  neighbouring trails are 30 to 60 points apart, that is not close enough to
  say which trail a line is on.
- Neither RunSignUp nor the current WordPress site holds a GPX, a KML or any
  course file. RunSignUp's race page links only to Google and Apple directions.

WHAT WOULD CLOSE IT: a GPX from any recent running, Dave's watch or any
finisher's. With real coordinates the route goes onto the modern base directly,
no tracing and no georeferencing, and the result is accurate rather than
transcribed. That is a short job once the file exists. Failing that, Dave
marking up a printout of the East Section map would do: the alignment only has
to be good enough to name the trails, and he knows them.

ONE THING TO SETTLE BEFORE PUBLISHING EITHER WAY: the base map is Cincinnati
Parks' copyrighted artwork. Ask them before republishing a modified version.
The race already partners with them and gives them $2,000 a year, so this is a
conversation rather than an obstacle, but it should happen first.
