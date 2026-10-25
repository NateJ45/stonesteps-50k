# The Studio plan: who edits, what they do, and where

Written 2026-10-19 (studio-complete). The map from the race director's real jobs to the Studio surface that serves
each one. When a job changes, change this file, then the surface, then its guide. Settings live in
`src/sanity/kit.config.ts`; the guides in `src/sanity/guides/content.ts`; the pictures in `src/sanity/guides/shots.ts`;
the tours, welcome and What's new in `src/sanity/studio-tours.ts`; the video scripts in `docs/agent/studio-videos.md`.

## Who edits

| Role       | Who                                                                            | Skill                                               | Device                                                               | View                                                                                  |
| ---------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Owner      | The race director. Did not ask for a website; edits in bursts around the race. | Comfortable with email and RunSignUp, new to a CMS. | Phone in race week (often at the park), desk computer in the winter. | Staff view: Home, Quick update, Content, Live preview, Messages, Site Guide, Checkup. |
| Helper     | The developer.                                                                 | Expert.                                             | Desk.                                                                | Everything, plus Media and the hidden panes (race days, hand-typed records).          |
| Occasional | A volunteer or sponsor shown a page before it goes live.                       | None needed.                                        | Any.                                                                 | No login: a private preview link (`share-a-preview` guide).                           |

## The race calendar

The site's year follows one race in late October. The Studio treats three seasons differently.

| Season                    | Roughly                           | What it feels like                                                         |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| Quiet months              | December to registration day      | The site looks after itself. A weekly glance at Home and Messages at most. |
| Registration and build-up | Registration day to two weeks out | A burst on registration day, then volunteers and sponsors.                 |
| Race week and after       | Ten days before to a month after  | Daily notices, the schedule, race-morning changes, results, trekkers.      |

Home's race checklist follows the calendar by itself: the race-week job ("a notice is up") only counts in the ten days
before the race, and the results job only in the month after it. Outside those windows they read as done, so the
off-season list stays short.

## Weekly jobs

| Job                                                      | Season              | Surface                                      | Guide                       | Taps on a phone          |
| -------------------------------------------------------- | ------------------- | -------------------------------------------- | --------------------------- | ------------------------ |
| Look at Home: is anything not ticked?                    | All year            | Home, race checklist                         | `home-page`, `quiet-months` | 1                        |
| Read and answer contact-form messages                    | All year            | Messages                                     | `messages`                  | 2                        |
| Put up a race-week notice (parking, bib pickup, weather) | Race week           | Quick update, `race-week`                    | `quick-update`, `race-week` | 4                        |
| Urgent change on race day                                | Race day            | Quick update, `urgent`                       | `race-week`                 | 3                        |
| Change or switch off a notice                            | Race week and after | Content, Race notices                        | `race-notices`              | 4                        |
| Check and confirm the race-day schedule                  | Race week           | Content, This year's race, Race-day schedule | `race-day-schedule`         | desk                     |
| Tell runners the results are in                          | Week after          | Quick update, `results-in`                   | `race-week`                 | 3                        |
| Mark trekkers near the front                             | Week after          | Content, Results by year                     | `mark-a-trekker`            | desk                     |
| Ask for volunteers                                       | Build-up            | Quick update, `volunteers`                   | `ask-for-volunteers`        | 4                        |
| Add a sponsor (name and website)                         | Build-up            | Quick update, `sponsor`                      | `sponsors`                  | 4 (logo later at a desk) |

## Monthly and seasonal jobs

| Job                                                           | When                   | Surface                                                     | Guide                                               |
| ------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Registration opens: Register link, date, prices, caps, notice | Once, registration day | Content (race, distances), Quick update `registration-open` | `registration-opens`                                |
| Set next year's date and edition                              | Once, winter           | Home quick action, race document                            | `change-the-race-date`                              |
| Price ladder and caps                                         | Once, registration day | Home quick action, Distances                                | `entry-fees`                                        |
| Start a new race year                                         | Once, winter           | Content, Start a new race year                              | `yearly-checklist`, `quiet-months`                  |
| Sponsor logos, order                                          | Build-up               | Content, Sponsors                                           | `sponsors`                                          |
| Course features and "Not confirmed" markers                   | Build-up               | Content, This year's race                                   | `the-not-confirmed-marker`                          |
| Change a photo, a page's words                                | Any                    | Live preview, Content, Pages                                | `edit-a-page`, `change-a-photo`                     |
| A volunteer page or a race recap                              | Build-up, after        | Pages, page templates                                       | `page-templates`, `ask-for-volunteers`              |
| Fix a runner's name, remove a runner                          | Rare                   | Content, Runners                                            | `fix-a-runners-name`, `a-runner-asks-to-be-removed` |
| Undo something from earlier in the week                       | Rare                   | Earlier versions, Trash, ask the helper                     | `undo-earlier`                                      |

Results are never typed: `scripts/import-results.mjs` brings them in nightly through October and November and weekly
otherwise, and keeps a trekker tick that was made by hand.

## Quick update (what it covers now)

Eleven forms, each published straight away. Each shows only in its season (`when`, card 137, `MM-DD` every year; the
windows are constants at the top of `kitConfig`); a job out of season is still done in Content, and its guide says
where. Notice builders are in `src/lib/quick-updates.ts` (tested); the edit, pick and link jobs are kit job types.

| Form                                                                                                 | Season           | Kind                     |
| ---------------------------------------------------------------------------------------------------- | ---------------- | ------------------------ |
| Put up a race-week notice (message, last day, optional link)                                         | 14 Oct to 31 Oct | create                   |
| Urgent: a change on race day (one box; red; down after two days)                                     | 14 Oct to 31 Oct | create                   |
| Change the start time or parking (race day and time, start area, parking; starts from what is there) | 14 Oct to 31 Oct | edit the race document   |
| Tell runners the results are in (words pre-written; links to `/results/`; two weeks)                 | 24 Oct to 15 Dec | create                   |
| Mark a trekker (pick this year's finisher, tick the box)                                             | 24 Oct to 15 Dec | edit with a pick list    |
| Look at the results                                                                                  | 24 Oct to 15 Dec | link to the results pane |
| Registration is open (words pre-written; Register link from the race page)                           | 1 Dec to 31 Jul  | create                   |
| Ask for volunteers (words pre-written; sign-up link; three weeks)                                    | 15 Aug to 31 Oct | create                   |
| Add a sponsor (name and website; end of the drag-to-order list; logo later)                          | all year         | create                   |
| Read your messages                                                                                   | all year         | link to Messages         |

Only one notice shows on the site at a time (red, then highlight, then soonest to end), so the long season notices are
plain: a short race-week notice always takes the top of the page while it runs.

### Still not a Quick update job

- A sponsor's logo from the phone (an `image` field exists in the kit; a sponsor needs alt text too, so it stays a
  desk job for now).
- Price steps and caps (`feeTiers` is an array of objects the form kinds cannot draw): Home's quick action opens them.
- RSVPs: this site has no RSVP form.

## Other improvements made here

- Home's race checklist gained three season-aware jobs (Register link set, race-week notice, results in).
- Guide text now uses the fields' real labels (`Race day`, `Which edition is this?`, `Register (RunSignUp)`).
- "How to" chips (card 134) on the fields that get typed wrong: race day, edition, Register link, fee tiers, entry cap,
  "Confirmed", trekker, a notice's show-from and hide-after, alt text.
- "Help for this page" lists the new guides on the race, notices, results, schedule and sponsors.

## Bigger ideas (not built)

- A daily rebuild while any notice has a start or end date in the next day, so `Show from` and `Hide after` happen on
  the day rather than at the next publish. Today the guides say so plainly instead.
- A volunteer sign-up address on the race document (like `registerUrl`), so the volunteer notice and a volunteer page
  share one link.
- Home's quick actions could swap with the season (registration jobs in spring, race-week jobs in October) once the kit
  can decide a card by a query.
- A "race morning" mode on Home: the urgent form, the live status and the schedule on one screen.
