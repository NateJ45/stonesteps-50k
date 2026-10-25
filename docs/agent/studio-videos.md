# Guide video scripts (Stone Steps)

Written 2026-10-19 for the tutorial-video pipeline (starter card 137). Each script is recorded with Playwright against
the LOCAL Studio holding the sample data below, never the live dataset and never a real runner, sponsor or volunteer.
Captions are the words shown on screen, one per shot, in the guides' voice (plain, no em-dashes). Target length under
90 seconds; phone scripts at 390 x 844, desk scripts at 1280 x 800. When recorded (`node tools/tutorial-videos/record.mjs tools/tutorial-videos/scripts/<slug>.json`, music from
`_assets/video-music`, never committed), the clip lands in `public/guide-videos/`, gets an entry in
`src/sanity/guides/videos.ts`, and its guide's `video` field (`src/sanity/guides/content.ts`) names that key.

## Status

- Recorded: script 1 as `tools/tutorial-videos/scripts/race-week-notice.json` (390 x 844, about 20 seconds, the guide
  `quick-update`), and script 2 as `urgent-change.json` (390 x 844, 17 seconds, the guide `race-week`). Each guide has its
  own clip; two guides must never name the same key.
- To record, one at a time under the build lock: scripts 3 to 6 below, each written as a JSON script beside the first.
  Script 3 is a desk clip (1280 x 800) and needs the race document open at the Links tab.

## Sample data (all invented)

- Race: race day `2027-10-23 07:30`, edition 24, Register address `https://example.org/register`.
- Notices: "Bib pickup moves to the Oval shelter, 6:00 to 6:45 AM." (info, ends race day).
- Sponsor: "Hilltop Trail Supply", `https://example.org/hilltop`, logo a plain placeholder mark.
- Result: runner "Sample Runner", 50K, 2027, 5:12:40, place 3.
- Volunteer link: `https://example.org/volunteer`.

## 1. A race-week notice from your phone (`quick-update`, phone)

| #   | Shot                                                           | Caption                                          |
| --- | -------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Studio Home on a phone, top bar visible.                       | Race week. Open the Studio on your phone.        |
| 2   | Tap the menu, then `Quick update`.                             | Quick update has the jobs you do on the move.    |
| 3   | Tap `Put up a race-week notice`.                               | Pick the race-week notice.                       |
| 4   | Type the bib pickup sample notice.                             | Say it in one or two short sentences.            |
| 5   | The last-day box, already a week ahead; change it to race day. | Pick the last day to show it.                    |
| 6   | Tap the button; the done message.                              | Press the button. It is published straight away. |
| 7   | The website home page with the notice across the top.          | A few minutes later, it is on every page.        |

## 2. An urgent change on race day (`race-week`, phone)

| #   | Shot                                                             | Caption                                 |
| --- | ---------------------------------------------------------------- | --------------------------------------- |
| 1   | Quick update tiles.                                              | Something changed on race morning?      |
| 2   | Tap `Urgent: a change on race day`.                              | Pick the urgent one.                    |
| 3   | Type "The 50K start is delayed 30 minutes because of the storm." | One box: what has changed.              |
| 4   | Tap the button; the done message.                                | It goes up in red, on every page.       |
| 5   | The website with the red notice.                                 | It comes down by itself two days later. |

## 3. The day registration opens (`registration-opens`, desk)

| #   | Shot                                                    | Caption                                                      |
| --- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Content, This year's race, Race day, Links tab.         | Open registration on RunSignUp first. Then this.             |
| 2   | Paste the sample address into `Register (RunSignUp)`.   | Paste the sign-up page here. Every Register button reads it. |
| 3   | Basics tab: `Race day` and `Which edition is this?`.    | Check the date and the edition are next year's.              |
| 4   | Press Publish.                                          | Publish.                                                     |
| 5   | Distances, the 50K, `Entry fee tiers` and `Entry cap`.  | Make the prices and the cap match RunSignUp.                 |
| 6   | Quick update, `Registration is open`, words pre-filled. | Then tell people. The words are written for you.             |
| 7   | The website with the notice and its Register link.      | Done. Sign-ups are open on the website too.                  |

## 4. Add a sponsor, then the logo (`sponsors`, phone then desk)

| #   | Shot                                                      | Caption                                         |
| --- | --------------------------------------------------------- | ----------------------------------------------- |
| 1   | Quick update, `Add a sponsor`.                            | A new sponsor? Add them from your phone.        |
| 2   | Type "Hilltop Trail Supply" and the sample website.       | Their real name, and their website.             |
| 3   | Tap `Add the sponsor`; done message.                      | They go on the end of the sponsor row.          |
| 4   | Desk: Content, This year's race, Sponsors, the new row.   | Later, at a desk, open them in the full editor. |
| 5   | Drop the placeholder logo into `Logo`, type the alt text. | Drop the logo in and say whose it is.           |
| 6   | Drag the row up the list; Publish.                        | Drag to change the order. Publish.              |

## 5. Mark a trekker (`mark-a-trekker`, desk)

| #   | Shot                                                               | Caption                                                  |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| 1   | Content, Results and records, Results, Results by year, 2027, 50K. | After the race, the results are already here.            |
| 2   | Click "Sample Runner", third place.                                | An early starter finished near the front.                |
| 3   | Tick `Ran as a trekker` (the How to chip beside it).               | Tick this. Their time stays, the records leave them out. |
| 4   | Publish; the line under the top bar shows the update.              | Publish. The records recalculate on their own.           |

## 6. Change or switch off a race notice (`race-notices`, desk)

| #   | Shot                                     | Caption                                     |
| --- | ---------------------------------------- | ------------------------------------------- |
| 1   | Content, Race notices list.              | Every notice you have put up is here.       |
| 2   | Open the bib pickup sample.              | Click one to change it.                     |
| 3   | Switch `Enabled` off.                    | To take it down, switch it off.             |
| 4   | Publish; the website without the notice. | Publish, and it is gone at the next update. |

## Frame checks

For each recording: every caption frame readable at 390 wide, no account avatar or real name on screen, no live-dataset
document visible (the URL shows the local dev server), and the final frame shows the result on the website.

## Recording from a worktree

A fresh worktree has no `.env`, so the Studio shows Sanity's connection dialog over the page and every click times out
("intercepts pointer events"). Pass the public project and dataset as environment variables to `record.mjs`
(`PUBLIC_SANITY_PROJECT_ID`, `SANITY_STUDIO_PROJECT_ID`, and the two `..._DATASET` ones). The recorder refuses all writes.
