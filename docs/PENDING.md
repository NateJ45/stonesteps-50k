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

### 1m. DONE 2026-09-18. The weather strip records its own new year

Nathan asked for the yearly weather bake to be automatic. `scripts/weather-sync.mjs`
records The Race's date as a `raceDay` document six days after the race and bakes that
year's weather; the results-import workflow runs it daily through October and November
and the deploy bakes before every build. First live run: the mornings after 2026-10-31.
If it has not produced a 2026 bar on /course by early November, run the import workflow
by hand and read its "Bake race-day weather" step.

### 1l. The numbers row can wear a label, and nobody has typed one

2026-09-17 (Tier 3). `statSection` has always had an optional `heading` field and
`SectionRenderer` threw it away, so an editor could type one and watch nothing happen.
StatsRow renders it now, as `.section-label`, the outlined display word the other content
bands wear. Nothing in the dataset sets it, so the home page's numbers row still arrives
with no label, exactly as before.

This is a content decision rather than a bug: the band sits directly under the ticker and
may well be better without one. If it wants a label, open the home page in the Studio,
find the Numbers row block and fill in its Heading. Two or three words, phrased like the
other eyebrows on the site ("The measurements", "By the numbers"), because the outlined
face is large and a sentence in it competes with the headline rather than ranking under
it. Nothing in the code has to change either way, and there is no deadline on it.

### 1k. The Google Maps screenshot is still in the contact page's block

2026-09-17. `/contact`'s "Stay downtown or near CVG" band is an `imageTextSection` whose
image in Sanity is a screenshot of Google Maps (the 1742x757 PNG). The page no longer
SHOWS it: `src/lib/local-poster.ts` swaps in `public/region-poster.*`, the still this site
bakes from its own map with The Oval, downtown and CVG pinned. That is a code rule, chosen
over a schema field precisely so the fix did not have to wait on anybody.

What is left is a content edit only Dave or Nathan can make, and it is tidiness rather
than a bug: open the block in the Studio and CLEAR its image, so the uploaded screenshot
is gone from the dataset as well as from the page. The rule in `src/lib/local-poster.ts`
STAYS after that: it is what puts the baked region poster on the page, with or without an
image on the block, so deleting it would leave the band with no map at all. (An earlier
version of this note said the rule could go once the image was cleared; that was wrong.)

Do NOT change that block's call to action while the rule is in place: "Find a hotel on
Google Maps" pointing at a Google Maps URL is what the rule matches on. Its test
(`src/lib/local-poster.test.ts`) asserts the live href, so a change there fails the unit
suite rather than silently putting the screenshot back.

### 1j. DONE 2026-09-17. The pre-2015 27K marks are off the board

Nathan's call, same day: the records show only 27K data we have evidence of, and the
older marks come off since Dave says the 27K did not exist yet. The five transcribed
`recordEntry` documents (List, Odipo, Campbell, Heffernan, Lowery) and the four athlete
documents that existed only to be referenced by them were retired by
`scripts/retire-27k-records.mjs`, with a verbatim copy in
`scripts/data/retired-27k-records.json` so the drop is reversible. The `recordEntry`
collection is now empty, so every record on /records and in the home page's record
holders band derives from a finish on file. The men's 27K record is David Riddle, 1:59:32,
2017, which is also what the old site's fastest-ten list starts with. Nothing in the seed
recreates the five: `scripts/seed-race.mjs` no longer seeds transcribed records at all.

Still open for Dave, but no longer blocking anything: if the twelve pre-2015 marks were a
predecessor event on this course, its results belong in the archive as results, under its
own label. The finding that produced the decision is kept below.

2026-09-17. Dave wrote that "the 27k came about in 2015, so you won't find a history for
that". The old site's own records page (stonesteps50k.com/all-time-records/, still live,
and the source of the transcribed `recordEntry` documents) lists 27K marks from 2010 to
2014: Brian List, Paul Odipo, Daniel Campbell, Daniel Heffernan, Charles Lowery, Jonna
Siferd (twice), Justin McIntyre, Dan Hollingshead, Graham Niemer, Ruth Kohstall and Angela
Memory. Brian List's 1:58:36 was on the home page as the men's 27K course record.

Nathan asked whether the years were typos. Tested against every result we hold (2,188
rows, 2003 to 2025, both distances), by name and by exact time:

- **Every 27K entry on that page dated 2015 or later matches our results exactly** on name,
  time and year: Gleason 2015, Weiter 2015, Riddle 2017, Beeman 2019, Casaletto 2020, Kash
  2021, Ruhlman 2021.
- **Every entry dated before 2015 matches nothing.** Not the name in any year, not the time
  in any year, 27K or 50K. A typo in the year would leave the name and time findable under
  another year; these twelve are absent altogether.
- The page is unreliable about years even so: Brian List's identical 1:58:36 is dated 2011
  in the course-record row and 2010 in the under-30 row, and Katie Ruhlman's 2:28:40 is
  dated 2021 in one row and 2010 in another (2021 is right; our results have it).
- Two of the twelve ran the 50K in other years, and their "27K" times are 0.51 of their own
  50K times: Ruth Kohstall 3:00:20 (2012) against 6:00:21 (2010, 50K); Charles Lowery
  3:04:15 (2010) against 6:01:31 (2009, 50K). Half the 50K on this course is four loops,
  which is what the 27K is. So the pre-2015 marks look like a real event of about the 27K's
  length, run on this course, whose results were never posted, under a name that was not
  "27K" or a start year Dave is misremembering. His "you won't find a history" is literally
  true of the results; the records page kept the marks anyway.

The question for Dave stays precise: was there a shorter race on the course before 2015,
four loops or close to it, and were these its records? If yes, the marks can come back as
results under that event's own label, with years from him, because the year column on that
page cannot be trusted for the pre-2015 rows.

### 1i. DONE 2026-09-16. The course-map poster is on the home page

Added to the Home Page document straight after the elevation band, so the page
answers "how hilly" and then "where does it go". Nothing else was needed: the
block carries its own copy and the picture is generated by `npm run map-poster`.

### 1h. DONE 2026-09-16. The two climbing figures are one set of figures

2026-09-16. The course copy in Sanity said "Over 6,000 ft" of climbing, and the
elevation chart underneath it still captions itself "10,726 ft total elevation
change". Both appear on the home page and on /course. Neither is wrong on its
own terms, but together they read as a contradiction, and one of them is not
supported by the track Dave sent.

What the track measures (see entry 11, and `scripts/build-elevation.mjs`):

| Counted as                 | Off USGS LiDAR | Off the file's own barometer |
| -------------------------- | -------------- | ---------------------------- |
| Climbing, one way          | 4,673 ft       | 5,075 ft                     |
| Total change, up plus down | 9,356 ft       | 10,125 ft                    |

So 10,726 ft is a total-change figure, and it holds up: the barometric
both-ways sum is 10,125 ft over a route about three quarters of a mile shorter
than the real one. "Over 6,000 feet of climbing" is above every one-way figure
here, and no way of counting this track reaches it.

RESOLVED by Nathan the same day: the copy matches the track. Climbing reads
about 4,700 ft, elevation change reads 9,356 ft, and the contact FAQ gives both
and names which is which. The measured profile is written to the race document,
so the chart is Dave's track rather than the synthetic saw teeth.

ONE THING TO PUT TO DAVE, because it is his race's number and runners have
compared notes about it for twenty years: 10,726 ft no longer appears on the
site. It was never wrong, it is a both-ways figure and the barometric both-ways
sum off his own file is 10,125 ft over a slightly shorter route. If he wants it
back, it belongs on the lines that say "elevation change", not the ones that say
"climbing".

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

### 0d. The home page's map still is baked narrower than the band now renders it

2026-09-18 (the one-column pass). `CoursePosterBand` used to set its own 72rem box, so
the picture rendered 1104px wide at 1280; it now sits on the site's content column and
renders 1232, and above 1320 it renders 1272. The poster's 1x rung is still the 933px
`npm run map-poster` baked from a capture whose CSS width was the OLD number, so a
display at DPR 1 now upscales it by about a third instead of a fifth. Compared side by
side at 1280 the difference is small (the contour labels are still legible and the route
is unaffected), which is why this is a gap rather than a bug, and a display at 1.5x or
above already gets the 1400px rung and is unaffected either way.

Two ways to close it, in order of preference. Re-run `npm run map-poster` (build first),
which re-captures at the band's real width and rewrites `public/course-poster*.{avif,webp}`
plus `scripts/data/course-poster.json`; the camera is unchanged, so the picture should be
the same picture, but it goes through live map tiles and the output is committed, so it
wants a deliberate look rather than a drive-by re-run. Or switch the `<source>` elements
from `1x`/`1.5x` descriptors to `w` descriptors with a `sizes` attribute, which would make
a DPR-1 desktop pick the existing 1400px file at a cost of about 43KB on a lazy,
below-the-fold image. Nothing is broken until somebody does either.

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

### 0b. DONE 2026-09-16. The dev server's React instances are one again

2026-09-16. Fixed, and the earlier diagnosis in this entry was wrong in a way worth
recording: nothing was arriving "raw". Measured this time by making the candidate files
THROW on evaluation rather than reading stack traces, because the traces are source-mapped
back to `node_modules/react/cjs/react.development.js` and read as a raw require when the
module actually came from `deps_ssr`. A `console.log` from inside the workerd runner never
reaches the log either, so the first two probes both returned false negatives.

The real cause is a MID-REQUEST OPTIMIZER RELOAD. `astro/app/manifest` and
`astro/logger/json` are discovered by Vite's dep scanner during the first render rather
than at startup, the optimizer re-bundles and reloads the module graph mid-flight, and
`react-dom/server` is left holding a React instance from the previous pass whose hook
dispatcher is null. Every island then fails to server-render. That is
withastro/astro#17834, fixed upstream in `@astrojs/cloudflare` by pre-bundling
`astro/logger/json`; we cannot take that release while the adapter is pinned at 14.2.4
(entry 4 below), so the same deps are listed in `vite.environments.ssr.optimizeDeps.include`
in `astro.config.mjs` and bundled at startup instead.

Also learned: the environment that RENDERS in dev is `ssr`, not `astro`. The previous fix
was aimed at `astro`, which is why it never fully worked. Verified with a
`configEnvironment` probe, and by A/B: removing the `ssr` block puts the failure back
(3 reloads, 27 warnings, 10 TypeErrors on one cold request), removing the `astro` block
changes nothing measurable.

What remains is benign and is NOT the old bug: React prints its dev-only "Invalid hook
call" warning about twice per render, with no error after it, from `@astrojs/mdx`'s
`check()` calling each island's component function outside a React render to work out
which renderer owns it. Renderer detection, not a second React.

Closed by pre-bundling the two deps; the map, and every other island, now hydrate under
`npm run dev`. Remove the workaround when the adapter pin moves and re-measure.

### 0a. DONE 2026-09-17. The five early race dates came from Dave

2003-10-26, 2004-10-24, 2005-10-23, 2011-10-23 and 2012-10-28, from the race director
on 2026-09-17. He looked 2004 up; the other four are his reconstruction from the race's
fourth-Sunday-of-October formula, and `scripts/data/race-days.json` records each source
in those words rather than presenting a reconstruction as a record. All five are Sundays
(checked in the script that added them). `npm run` of `scripts/build-weather.mjs` now
writes 23 race days and the strip runs from 2003 with no gaps.

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
against a real `wrangler dev` and a real deploy. There is now a second reason to: a newer
adapter carries the upstream fix for withastro/astro#17834, which would let the dep
pre-bundling workaround in `vite.environments.ssr` come back out (entry 0b).

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

### 9. DONE 2026-09-13. The stega whitespace lesson is in the starter

Written into the starter's CLAUDE.md next to the existing "never compare a
stega-encoded string" rule, as its companion: **never MEASURE one either, and
clean a display string before any `split`, `length`, `slice`, truncation or word
count.** U+FEFF is part of the payload and matches `\s`, so splitting a headline
on whitespace shatters it into fake words; here that turned a three-word wordmark
into 157 and grew the hero band from 1032px to 1879px, in the preview only.

Nothing needed porting in code: `splitStega()` already lives in the PORTABLE
`src/lib/preview-stega.ts`, and `src/lib/display-words.ts` is site-specific
because the wordmark is this site's. Vault note:
`_vault/gotchas/stega-run-contains-whitespace.md`.

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

2026-09-18: FOUND, AND MOSTLY FIXED. Blocking one resource class at a time in Lighthouse
showed what the model was actually charging against the wordmark on the phone profile,
and it was not the stylesheet. Removing the mud masks took the modelled LCP from 3.99s
to 3.08s; removing the React islands took it to 3.24s and FCP to 1.88s; the hero photo
was worth 0.3s and the fonts 0.2s. The mechanism: Lantern's pessimistic LCP graph
holds every request that STARTS before the observed paint, and on a fast local trace
that is everything, including the two later hero slides (lazy did nothing, a stacked
slide is in the viewport), the below-fold mud masks and the React runtime, which
client:only pulled in at 135ms. PR #32 acts on all of it: the masks are 64-entry
palettes and the phone hero mask is written at 560px (138KB to 48KB), the hero photo
is AVIF q45 (164KB to 99KB), the later slides arrive a second after load, and the menu
hydrates on idle. Three local runs: FCP 1.88s, LCP 3.22 to 3.25s, performance 0.91 to
0.92, against 2.2s / 3.98s / 0.85 before. The CI runner sits about 0.65s behind this
machine, so the 4.5s gate now has roughly a second of margin instead of none.

2026-09-17 addendum. The gate flapped again on PR #29 (Tier 3 of the identity pass): home
LCP median 4632ms from runs of 4097, 4632 and 4705 against the 4500 budget, performance
0.81. Nothing in that PR touches the home page above the fold, and three local runs of the
merged build on the compressed harness gave 3980, 3977 and 4054ms at 0.85, the same as
before the PR. The LCP element is still the wordmark (span.stamp-word), the display font is
already preloaded, and the phase breakdown is TTFB 450ms plus 3.5s of render delay, which
is the Lantern model charging the inlined stylesheet as described below. So: the CI runner
straddles the budget, the site did not move, and the lever remains the one in this item.
Merged on that reading.

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

**2026-09-13, a second report, and the question of images settled.** Score 86.
TBT 0ms and CLS 0 (both perfect), FCP 1.7s, SI 1.7s, LCP 4.1s. The report's
"Improve image delivery, est savings of 232KiB" is the headline most people
would act on. It is not the lever, and the proof is in the same report:

- THE LCP ELEMENT IS TEXT. `span.stamp-word`, and its breakdown is TTFB 70ms
  plus element render delay 190ms. There is no resource load delay and no
  resource load duration, because nothing about the largest paint waits on an
  image. No amount of image compression can move an LCP that is not an image.
- HALF THE 232KiB IS THE AUDIT IGNORING DPR. It says the hero is "larger than
  it needs to be (800x746) for its displayed dimensions (412x781)". Lighthouse's
  own mobile emulation is 412 CSS px at DPR 1.75, which is 721 device pixels, so
  800 is the correct rung to pick out of a ladder of 400/600/700/800/900/1200/ 1400. The nearest smaller rung is 700, a 3% linear shortfall, worth about 30KB.
- THE OTHER HALF IS AN OPTIMISTIC RE-ENCODE ESTIMATE against a file that is
  ALREADY AVIF. `w=800&q=62&auto=format` returns image/avif at 164,404 bytes,
  which matches the 160.6KiB the report attributes to it.

DO NOT LOWER THE QUALITY PARAMETER TO CHASE THIS. Measured on the CDN, the same
image at the same width: q=62 is AVIF at 164KB, q=50 is WebP at 277KB, q=40 is
WebP at 246KB, q=80 is WebP at 417KB. Lowering q made the file bigger every
time. The reason is cache state, not a quality curve: a variant Sanity has not
generated yet is served as WebP immediately and becomes AVIF once built. Probed
q=55, 60, 65 and 70 three times each; 60 and 70 flipped to AVIF on the second
request, 55 and 65 on the third, and each flip roughly halved the bytes. So any
change to a width or a quality anywhere in the site cold-starts every variant it
touches, and the first visitors get WebP at about twice the size until the CDN
catches up. Worth knowing before a "quick compression win" is attempted.

The conclusion is unchanged from the entry above: the remaining gap is Lantern's
model of two render-blocking stylesheets, and the only two levers are cutting
the stylesheet or art-directing a phone crop of the hero. Both are design
trades, not optimisations.

The CI gate asserts performance at 0.85 as a warning and passes.

**2026-09-16, the stylesheet lever was pulled, and it was worth 11 points.**
The two entries above named cutting the stylesheet or art-directing the hero as
the only levers left. There was a third and it was free: stop making the
stylesheet a REQUEST. `build.inlineStylesheets: 'always'` in `astro.config.mjs`.

Measured on a harness built for this and not on `npm run serve:dist` as it
then was, because `http-server` does not compress and the entry above records
what that costs. (`serve:dist` now runs `scripts/serve-dist.mjs`, which does.)
The harness gzips text, sets immutable cache headers on `/_astro/*` and delays
every response by 50ms, so it models a network rather than a memory bus. Three
Lighthouse mobile runs per variant, medians:

| Home page     | before   | after |
| ------------- | -------- | ----- |
| Performance   | 88       | 99    |
| First paint   | 2.00s    | 1.56s |
| Largest paint | 2.47s    | 1.56s |
| Speed index   | 2.65s    | 2.12s |
| Blocking time | 332ms    | 55ms  |
| Layout shift  | 0.000004 | 0.053 |

Per-run performance went 85 / 88 / 89 to 98 / 99 / 99, so the flap is gone too.
The other five gated pages: /course 90 to 99, /contact 95 to 98, /records 96 to
95 (one run, noise), /results and /results/2025 at 100.

IT IS NOT ONLY THE MODEL. Driven in a real Chrome at 4x CPU, 1.6Mbps and 150ms
RTT with a PerformanceObserver: FCP 856ms to 640ms, LCP 944ms to 844ms. The
waterfall says why. Before, the stylesheets were requested at 191ms and the
242KB one landed at 776ms, and first paint followed it at 856ms; 585ms of an
856ms first paint was one file downloading.

THE LCP ELEMENT'S FONT WAS ALREADY HANDLED, and this is worth writing down so
nobody spends a morning on it: `span.stamp-word` is set in Staatliches, and
BaseLayout.astro already preloads the exact hashed woff2 with `crossorigin`.
The probe shows it requested at 190ms and complete at 619ms, in the first wave,
before first paint. The font was never the delay.

WHAT IT COSTS. The home page's HTML goes 35KB to 94KB gzipped and the CSS is no
longer shared between pages, so a three-page visit moves from about 155KB to
about 275KB. The parity baselines in `scripts/.parity/` grow with it, from
2.1MB to 9.6MB, because they are the rendered HTML and the rendered HTML now
contains the stylesheet.

THE ONE REGRESSION, stated plainly. Home CLS goes from 0.000004 to 0.053
against a hard CI gate of 0.1, and only the home page moves; every other gated
page stays under 0.007. Half of it was a real bug and is fixed: `size-adjust`
matched the fallback's WIDTH and left its line box 27% short (Staatliches has
an ascent of 95 and a descent of 30 at 100px, Arial Narrow under `size-adjust:
80.8%` had 74 and 17), so the headline's line box grew when the webfont landed.
`ascent-override`, `descent-override` and `line-gap-override` now pin it, and
the trap there is that the spec scales the overrides by `size-adjust` too, so
the numbers written are 95 / 0.808 and 30 / 0.808.

The other half cannot be fixed with metrics: matching a total width does not
match each glyph's advance, so the letters of a 160px wordmark re-space when
the face swaps. It measures ZERO on any throttled connection, because there the
remaining 90KB of HTML outlasts the 16KB font; it appears on a zero-latency
static server, which is exactly how Lighthouse CI collects. Two cures exist and
both are trades somebody should choose rather than an agent:

- Inline the display woff2 as a data URI. Costs 16KB gzipped on EVERY page and
  gives up the font's immutable cross-page cache, but the swap stops existing.
- `font-display: optional` on Staatliches. Costs nothing and guarantees zero
  shift, but a first-time visitor whose font misses the ~100ms block window
  reads the whole page in Arial Narrow. That is the brand's face, so it is
  Nathan's call and not a performance decision.

The hero phone crop from the entry above was NOT taken. It is still a design
decision Dave and Nathan have not made, and the numbers no longer need it.

**2026-09-17, later: CI was measuring an uncompressed site, and had been all
along.** After the inlining landed, the Lighthouse job's home LCP did not move:
4.2 to 4.9s before and after, on the same 4.5s gate, still flapping. The reason
is in `lighthouserc.json`: `staticDistDir` uses lhci's own static server, which
sends every byte raw. The home HTML is 435KB raw and 84KB gzipped, and at the
mobile throttle the raw file alone is about two seconds of download before any
CSS can run. Production is Cloudflare and compresses everything, so CI was
penalising the exact change that helped every reader. Measured on one machine,
Lighthouse mobile, three runs each: through `http-server`, LCP 10,447 /
10,476 / 10,435ms and performance 59; through `scripts/serve-dist.mjs`
(brotli/gzip, the deploy's cache headers), LCP 3,829 / 3,827 / 3,826ms and
performance 87. lhci now starts that server (`startServerCommand`) and audits
through it. Two consequences: the LCP gate now describes delivery rather than
the runner's disk, and every earlier CI Lighthouse number in this entry was
taken uncompressed and is not comparable with numbers from here on.

### 11a. DONE 2026-09-17. The climbing figure is LiDAR on the proper course

Nathan's call: "go with the most accurate number." The site now says about 5,200 ft of
climbing and 10,344 ft of total elevation change, from USGS 1 m LiDAR sampled along
Dave's proper-course track ("Stone Steps 50k #14"), banked at 10 ft. `race.elevationProfile`
is written, and the eight typed copies of the old figures (hero, ticker, two elevation
headlines and captions, two meta descriptions, the FAQ) were updated in the same pass.

WHAT WAS TESTED BEFORE CHOOSING, so nobody repeats it:

- **Snapping the track to the OSM trail centreline before sampling is WRONG.** The idea
  was that GPS wobble across a sidehill adds phantom climb and the drawn trail does not.
  Point-by-point snapping made it worse: 88% of points moved a median 17.9 ft, the track
  got 0.85 miles LONGER (29.95 to 30.80) from sideways jogs wherever consecutive points
  landed on different ways or one snapped and the next did not, and gain rose to 5,416.
  That the total (10,834) landed near 10,726 and the length on exactly 30.8 is coincidence
  from the jitter, not confirmation. Proper map-matching needs a continuity model and is
  a project, not a script.
- **Lateral smoothing shows the wobble is small.** A 5-point (about 40 ft) moving average
  moved gain from 5,167 to 5,145; an 11-point (about 90 ft) one to 5,054 while shortening
  the track to 29.30 miles, which is cutting real switchbacks. So GPS noise inflates the
  LiDAR climb by under 3%: 5,167 is robust to about plus or minus 100 ft.
- Dave's file reports about 4,600 ft, which is Strava's own elevation model and
  smoothing over a route export, coarser than 1 m LiDAR. The rerouted year's track gave
  4,673 off LiDAR and 5,075 off its barometer, so the two sources have no consistent
  bias between them; the LiDAR figure is the one whose method the caption can state.

The number the race's own site publishes, 10,726 ft of total change, now sits 3.6% from
the measured 10,344.

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

THE GPX ARRIVED ON 2026-09-16. Dave sent a Strava track of the 50K, flagging
that its small loop is a slightly different route carrying the COVID reroute, so
it is close rather than exact. It is enough to close the mapping question: with
real coordinates the route goes onto the modern base directly, no tracing and no
georeferencing. What it measures, from `node scripts/build-elevation.mjs`:

- 30.11 miles raw, in seven laps out of The Oval at 5.05 / 3.26 / 5.12 / 3.22 /
  5.12 / 3.25 / 5.06 miles. That is the L S L S L S L the site already
  describes, with a long loop of about 5.1 rather than the 5.3 on the punch
  card.
- 4,673 ft of climb and 4,683 ft of descent off USGS 1 m LiDAR, so 9,356 ft of
  total change. The file's own barometric column, summed the way a watch does
  it, gives 5,075 up and 5,049 down, so 10,125 ft of total change.

THE MAP IS DRAWN AS OF 2026-09-16, and not the way this entry assumed. Dave
granted permission for the Parks artwork, and it still cannot be used as a
basemap: registering the 2017 PDF against the track fails at 112 ft median and
453 ft at the 90th percentile, tried three ways, with the scale parameter
drifting to the edge of its search range. Everything above about the 1998 map
applies to the 2017 one for the same reason.

OpenStreetMap needs no registration and the track sits 13.7 ft from the nearest
way with no fitting at all, so the basemap is rendered from OSM plus 3DEP in the
site's own colours. It is live on /course as a `courseMapSection`. The full
argument is in the header of `scripts/build-course-map.mjs` and in
`docs/superpowers/specs/2026-09-16-course-map-design.md`.

The Parks permission is still what makes the trail NAMES safe to print, and the
official map stays on the page as the printable version.

THE MAP IS MAPLIBRE GL JS as of 2026-09-16, not a renderer of ours. It carries
USGS orthoimagery, terrain from the AWS Terrarium DEM at 1.5x exaggeration, and
the course as GeoJSON, with no API key and no tile bill. Three things about it
should survive edits.

- `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` and the `setWorkerUrl`
  call next to it are LOAD-BEARING. MapLibre v6 resolves its worker against
  `import.meta.url`, Astro's bundling breaks that, and the failure is silent:
  raster tiles still draw, every GeoJSON source stays un-loaded forever, `load`
  never fires and nothing logs an error. The symptom is a perfect satellite map
  with no route on it.
- The stylesheet must be imported STATICALLY. Through a dynamic import Vite
  routes it via the preload helper, and Astro's client and server passes hash
  the same file differently, so the browser requests a name the build never
  wrote.
- The vertical scale is exaggerated and the caption says so, for the same reason
  the elevation profile captions itself.

WHAT WAS DELETED GETTING HERE, so nobody rebuilds it: a hand-drawn SVG basemap
with zoom tiers, marching-squares contours, a 256x256 heightfield, a committed
orthophotograph and a three.js orbit scene. All of it worked; all of it was
reimplementing a map engine, and the page is 28KB gzipped now against 97KB then.

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

THE GPX ARRIVED ON 2026-09-16. Dave sent a Strava track of the 50K, flagging
that its small loop is a slightly different route carrying the COVID reroute, so
it is close rather than exact. It is enough to close the mapping question: with
real coordinates the route goes onto the modern base directly, no tracing and no
georeferencing. What it measures, from `node scripts/build-elevation.mjs`:

- 30.11 miles raw, in seven laps out of The Oval at 5.05 / 3.26 / 5.12 / 3.22 /
  5.12 / 3.25 / 5.06 miles. That is the L S L S L S L the site already
  describes, with a long loop of about 5.1 rather than the 5.3 on the punch
  card.
- 4,673 ft of climb and 4,683 ft of descent off USGS 1 m LiDAR, so 9,356 ft of
  total change. The file's own barometric column, summed the way a watch does
  it, gives 5,075 up and 5,049 down, so 10,125 ft of total change.

THE MAP IS DRAWN AS OF 2026-09-16, and not the way this entry assumed. Dave
granted permission for the Parks artwork, and it still cannot be used as a
basemap: registering the 2017 PDF against the track fails at 112 ft median and
453 ft at the 90th percentile, tried three ways, with the scale parameter
drifting to the edge of its search range. Everything above about the 1998 map
applies to the 2017 one for the same reason.

OpenStreetMap needs no registration and the track sits 13.7 ft from the nearest
way with no fitting at all, so the basemap is rendered from OSM plus 3DEP in the
site's own colours. It is live on /course as a `courseMapSection`. The full
argument is in the header of `scripts/build-course-map.mjs` and in
`docs/superpowers/specs/2026-09-16-course-map-design.md`.

The Parks permission is still what makes the trail NAMES safe to print, and the
official map stays on the page as the printable version.

A 3D orbit view sits under the flat map, behind a control that loads three.js
only when pressed. Two things about it are deliberate and should survive edits.
The vertical scale is EXAGGERATED and the view says so on itself: Mt. Airy's
relief is under 5% of the course's width and at true proportions the model reads
as a plate. And nothing may import `src/components/race/courseScene.ts` at the
top level; a static import pulls three.js into /course's own bundle and the only
symptom is a performance score nobody checks that week.

WHAT IS STILL OPEN ON IT: whether the file may be republished as the course
download. It is somebody's Strava export, and that is a permission to ask for
rather than infer. Until it is granted, `race.gpxUrl` stays empty and the
caption offers no download.

ONE THING TO SETTLE BEFORE PUBLISHING EITHER WAY: the base map is Cincinnati
Parks' copyrighted artwork. Ask them before republishing a modified version.
The race already partners with them and gives them $2,000 a year, so this is a
conversation rather than an obstacle, but it should happen first.

### 12. An untracked `design/` folder is in Tailwind's scan path

**Nathan's call: one line in `.gitignore` closes it.**

2026-09-17. Found while fixing the parity feedback loop (entry 13). Tailwind 4
scans the whole project for candidate class names and skips only what git
ignores, so the untracked `design/` folder in the repo root is read as source.
Measured on the home page, same commit, same lockfile: 287,773 bytes of inline
stylesheet with it moved out of the tree, 351,502 with it back. That is **63,729
bytes added to every page**, and because the stylesheet is inlined it is 62KB of
HTML per page rather than 62KB of one shared file. `text-tertiary` alone appears
75 times in `design/` and nowhere in `src/`.

IT NEVER REACHES ANYBODY. `design/` is not committed, so CI checks out a tree
without it and what deploys is the 287KB build. This is a local-build effect
only, which is exactly why it is easy to leave in place for months.

It does have one real consequence today: `npm run parity` is unstable on a
machine where `design/` exists, because the stylesheet it inlines into all 31
baselines differs from the one CI would produce. The baselines committed on
2026-09-17 were captured from a build with `design/` held out. Anyone
recapturing should do the same, or gitignore the folder and stop thinking about
it.

### 13. DONE 2026-09-17. The parity baselines are out of Tailwind's scan path

`scripts/.parity/*.html` is committed on purpose and was therefore being read as
Tailwind source. Harmless while a baseline was markup; not harmless once
`build.inlineStylesheets: 'always'` (entry 10) put the compiled stylesheet
inside every baseline and took the directory from 2.1MB to 9.6MB. The scanner
then harvested candidates out of Tailwind's own selectors: `.top-5\.5` yields
`top-5`, `.bg-foreground\/30` yields `bg-foreground`. Worth 26,455 bytes of dead
utilities on every page, and it made the parity gate unwinnable, because each
capture changed the next build's CSS and the CSS is in all 31 pages.

Closed with `@source not '../../scripts/.parity'` in `globals.css`, which
carries the full argument. Capture, rebuild, compare is a fixed point now.

`docs/` IS EXCLUDED TOO, AND THIS ENTRY IS WHY. Markdown is scanned, so the
first draft of these two paragraphs named two of the harvested utilities as
examples and the next build emitted both of them and broke parity on all 31
pages again. A registry that cannot describe a CSS bug without reproducing it is
a trap laid for whoever documents the next one. Excluding `docs/` also dropped
45 rules that were only ever prose in the first place, the starter's generic
`bg-gray-50` and `bg-indigo-600` examples among them, for another 4,350 bytes a
page. Verified by rendered HTML rather than by reasoning: markup byte-identical
on every page, and none of the 45 appears in a class attribute anywhere in the
build.
