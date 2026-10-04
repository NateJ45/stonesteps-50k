# Brand Voice

This file defines the client-specific voice for this project. It layers on top
of the always-on baseline in `.claude/rules/copy-and-voice.md` Communication style section: that
section's rules (warm conversational tone, no AI-tells, no filler openers, stop
when done) apply to everything. Fill in the blanks below for the specifics of
this client.

Any AI agent writing or editing site copy for this project reads this file
alongside `CLAUDE.md`.

---

## Tone statement

_One sentence. What does this brand sound like? Who is the reader and what do
they feel after reading a page?_

_Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._

> A plain-spoken race director talking to a runner at the start line: warm, a little dry, and exact about what it costs, when it starts and how hard the trail is, so the reader knows what they are signing up for and feels ready, not sold to.

---

## Do this, not that

_Five pairs. Each pair is a specific, actionable contrast, not a vague
preference._

_Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong._ The examples are the site's real seeded copy in `scripts/seed-race.mjs` and the copy fixes in `docs/agent/changelog.md`.

1. **Do:** State cost, date and time as numbers. "Through January 31" at $35, start at 8:00 am, course closes about 4:30 pm. / **Not:** Soften them. "Affordable early-bird rates" or "register soon to save" with no figure.
2. **Do:** Say how hard it is, bluntly. "Nothing about this course is flat, and very little of it is forgiving." / **Not:** Sell it as a journey. "A challenging yet rewarding experience for every runner."
3. **Do:** Name the place and the thing. Aid at The Oval, Area 13, seven times on the 50K; drop bags stay in one place all day. / **Not:** Reach for scenery adjectives. "A breathtaking, world-class course."
4. **Do:** Flag what Dave has not confirmed. Awards and packet pickup carry no time and wear the "not confirmed" marker. / **Not:** Fill the gap with a plausible guess, or state an unconfirmed fact as settled.
5. **Do:** Give the source or the dates the data covers, then stop. Rain fell in 2021 and 2023 (2022 was dry); the 5.3 and 3.2 mile loops are the race's own figures. / **Not:** Round up or generalise ("it often rains"), or add a closing line that restates the point.

---

## Banned vocabulary

These words are banned from site copy. When writing or editing, flag any of
these and replace them with plain language.

### Generic AI-tells (banned by default across all projects)

- delve
- leverage
- robust
- seamless
- elevate
- tapestry
- realm
- landscape
- testament to
- ever-evolving
- crucial
- pivotal
- meticulous
- navigate (as a verb for non-navigation contexts)
- transformative
- curated experience
- investment in your space
- elevated living
- tailored solutions

### Client-specific banned words

_Add words or phrases that are specific to this client or industry and should
never appear in their copy:_

- journey, breathtaking, world-class (the "Not" examples above; no client-specific banned list was ever recorded, so this is a proposal, Proposed 2026-10-03, drafted by Claude on Nathan's delegation from repo evidence; edit if wrong)

---

## Punctuation rule

No em-dashes in site copy: the text visitors read on the live site, including
page copy, component text, and Sanity-authored content. If a sentence needs an
em-dash to work, restructure it, split it into two sentences, or use a colon.

This rule is scoped to site copy only. Code comments, commit messages, plans,
specs, and internal docs may use em-dashes.

---

## Stop when you are done

End the paragraph. Do not add a closing sentence that restates the point. Do
not end with "Feel free to reach out" or any variation of it. The last word of
a section should be the last word that earns its place.
