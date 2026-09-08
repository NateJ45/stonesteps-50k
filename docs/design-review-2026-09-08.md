# Design review, 2026-09-08

A browser pass over the built site in both themes, measurements of the things that
looked wrong, and a comparison against the best-regarded sites in the sport. Written
as a plan, not a changelog: nothing here is done yet.

---

## 1. The finding that explains most of the others

The brand's whole visual language is **a high-contrast object sitting on a ground**:
a cream ticket, a cream punch card, a cream clipboard, dropped onto dark bark. That
relationship is what makes the design distinctive.

Measured separation between the object and the ground it sits on:

|                           | page vs plate |
| ------------------------- | ------------- |
| Dark mode                 | **15.19 : 1** |
| Light mode                | **1.09 : 1**  |
| Light mode, band vs plate | **1.01 : 1**  |

In dark mode the objects read as physical things on a surface. In light mode they are
the _same value as the page_, so nothing separates them but a border and a shadow, and
the metaphor collapses into a flat cream field.

**This is why the shadows are heavy, and the heavy shadows are why the text is muddy.**
With no value difference to do the work, the drop shadow became the only separator, so
it had to be strong: `--lift-sm: 2px 3px 0 #00000080`, a hard black offset. Behind
_cream_ text on bark that is a correct drop shadow. Behind _dark_ text on cream it is
dark-on-dark, which thickens the letterforms and reads as misregistered printing. It is
most obvious on the 27K ticket heading, and on every `.display` heading in light mode.

Note that the one element that looks genuinely good on the light page is the **50K
ticket**: forest green with gold text. It is the only object that kept a real
figure/ground relationship.

### Why "just lighten the page" does not work

I tested it. You cannot build a 15:1 figure/ground relationship out of two light
colours:

| Page ground            | vs cream plate |
| ---------------------- | -------------- |
| `#FBF6EA` (today)      | 1.09           |
| `#EADFC4`              | 1.13           |
| `#E3D6B8`              | 1.22           |
| `#D3C199` (deep putty) | 1.51           |

White plates on a tinted ground top out at 1.44. Structurally there is nowhere to go.

### The proposal: invert the objects in light mode

Keep the language, flip which side is dark. Cream objects on bark becomes **bark and
forest objects on cream**.

| Light-mode plate        | vs cream page | text on it     |
| ----------------------- | ------------- | -------------- |
| Forest `#2E5738`        | **7.68**      | cream at 7.04  |
| Warm charcoal `#3A3128` | **11.80**     | cream at 10.82 |
| Bark `#1A1712`          | **16.57**     | cream at 15.19 |

That restores the drama, and it fixes the shadow problem for free: dark plates carry
light text, so the hard offset shadow becomes correct again rather than muddy. The 50K
ticket already proves the treatment works on this page.

**Recommendation.** Forest and warm charcoal as the light-mode plate stocks, cream page.
Light mode stops being a washed-out dark mode and becomes its own thing: a trail map on
kraft paper with painted signs on it.

---

## 2. The shadow rule, stated properly

Whatever we do with grounds, the shadow needs a rule it does not have:

> An offset drop shadow is only ever correct when the text is **lighter** than the
> surface behind it.

Implement it the way the heading-colour fix was implemented: a `--display-shadow` token
that defaults to `none`, with dark surfaces opting back in. The precedent exists already
(`.ticket .display` carries a softened `1px 2px 0 rgb(0 0 0 / 0.13)`), it just was never
generalised. Surfaces that should opt in: the dark page ground in dark mode, the featured
ticket, the ticker strip, the parks band, and any future dark band.

---

## 3. Type is too small in places, and it is fixed-size

Measured on the live home page. These are `rem` literals, so a phone gets the same
pixel size as a desktop:

| Size            | Where                                                        |
| --------------- | ------------------------------------------------------------ |
| **8.8px**       | countdown labels ("days", "hrs", "min", "sec")               |
| **9.6px**       | the "Not confirmed" badge                                    |
| **9.9px**       | stat labels, ticket kickers, parks label, the distance chips |
| **10.9–11.5px** | every `blaze` eyebrow, the hero date                         |
| **12px**        | the announcement bar, and **the Register button**            |

Tiny letterspaced mono labels are a legitimate editorial device and part of why the site
looks considered. But 8.8px is below what anyone should have to read, several of these
sit at `text-foreground/80`, and the primary call to action being 12px is hard to defend.

**Proposal.** A floor: nothing below **11px**, eyebrows at **12px**, the Register button
at **14px**. Keep the tracking, which is what makes small caps legible. Consider making
the eyebrow scale fluid so it grows a step on desktop.

---

## 4. What the best sites in the sport have that we do not

Compared against Broken Arrow Skyrace, Cocodona 250 (Aravaipa) and UTMB Mont-Blanc.

**Where Stone Steps is already ahead of most of them.** The results archive is
genuinely better than what these sites offer: 22 editions, every finisher, per-runner
history pages, and records derived from the times rather than typed. Cocodona sends you
to a third-party lookup. That is the strongest thing on the site and it is currently
buried behind a nav link.

**The gaps, in the order they would matter to a runner:**

1. **An aid station / cutoff table.** Every serious race has one. Ours says "aid every
   loop" and the cutoff is marked unconfirmed. Blocked on Corfman.
2. **A course map and a GPX download.** Cocodona ships CalTopo and COROS links plus a
   GPX. We have a synthetic elevation profile that says it is synthetic. One watch file
   fixes both. Blocked on Corfman or the Facebook group.
3. **A crew and spectator guide.** Where to stand, where to park, what a loop course
   means for watching. This is a _writing_ job, not a data job, and it is the single
   biggest content gap we could close without anyone else's help.
4. **Photography.** All three comparators are carried by large, confident images. We
   have five photographs and use them small. This is the biggest lever on perceived
   quality per unit of effort.
5. **Volunteer signup.** Broken Arrow and Cocodona both make it a primary nav item. A
   race this size runs on volunteers.
6. **Race-week logistics**: packet pickup, parking, drop bags, the briefing. All
   unconfirmed. Blocked on Corfman.
7. **Editorial / history.** UTMB and Cocodona both lean on story. We recovered a 2011
   race report and twenty years of results; there is a genuine "since 2003" piece here
   nobody else can write.
8. Lower priority: merch, lodging page, live tracking, sustainability and inclusivity
   statements. All present on the comparators; none essential for a 250-entry local race.

---

## 5. Making it a portfolio piece

The site already has things most agency work does not: a real derived data model, a
recovered twenty-year archive, 100s on Lighthouse, a Studio built for one named
non-technical person, and an art direction that is actually distinctive rather than a
template with a logo dropped in.

What would lift it from "good build" to "premium piece":

1. **Fix light mode properly** (section 1). A portfolio reviewer will toggle the theme.
   Right now one of the two themes is clearly the designed one.
2. **Photography.** Commission or source four or five strong images and let them run
   large: a full-bleed hero, a wide course band, faces at the finish. This is the
   difference between "designed" and "photographed", and it is what carries every site
   in section 4.
3. **Motion with restraint.** Reveal-on-scroll exists. Worth adding: the elevation
   profile drawing itself once, the punch card holes punching in sequence, the ticker
   easing rather than starting at full speed. Small, tasteful, and it makes a static
   screenshot into a memorable interaction.
4. **One signature moment.** The site needs a thing people remember. Candidates: the
   punch card, if the holes animate as you scroll the loops; or the records board, if
   the course record row gets a proper moment rather than a table row.
5. **Write the case study**, and make the archive recovery the spine of it. "The race
   deleted twenty years of its own results in a redesign; we recovered 929 of them from
   the Wayback Machine and its own timing spreadsheets, validated them against the
   published records, and rebuilt the site so the records can never disagree with the
   results again." That is a better story than most agency case studies have.

---

---

## 6. Texture: the craft says letterpress, the race says mud

There is already a texture layer, and reading it explains the gap exactly. The body grain
is `feTurbulence` at **4% opacity** on a 220px tile, and the comment above it calls it
"reading-room paper grain… quiet enough not to read as a pattern". The topo contours are
hairlines. The vocabulary is **stationery**: fine paper, contour maps, ticket stock,
rubber stamps.

That is a beautifully made print object. It is not roots, wet leaf litter, mud and late
October in Mt. Airy Forest. The craft says letterpress studio; the race says you will
finish filthy.

**The moves, in order of how much they actually deliver.**

1. **Photography is the primary texture.** Real grit in a website comes from photographs
   far more than from patterns. Full-bleed bands rather than bordered boxes: leaf litter,
   mud, and the stone steps the race is named after. Section 4 reached the same conclusion
   from the competitive direction, which is a good sign.
2. **Treat the photography into the palette.** A bark-and-cream duotone makes an image
   read as part of the design rather than as stock, and lets a photograph sit _behind_
   type at low opacity as texture rather than as a picture. There is already a hint of
   this: `filter: saturate(0.82) contrast(1.06)` on the course photo.
3. **Make the grain earthy rather than papery.** Lower the turbulence frequency so the
   grain coarsens, raise the opacity, and add a second very slow mottle layer: large soft
   irregular patches, like damp ground rather than uniform noise.
4. **Stop the edges being clean.** Every object has a crisp 2px border and a tidy radius.
   Grit is irregularity: deckled edges on the plates via an SVG mask, section dividers as
   a ragged tear rather than a straight rule, eyebrows and badges with a slight
   rubber-stamp bleed and a degree of rotation. The ticket perforation already does this,
   and it is the one element that feels handled rather than drawn.
5. **A boot spatter on the hero.** Requested, and worth doing on one condition: **once**.
   Drawn properly as an SVG, placed on the home hero only, low opacity, in bark or rust,
   sitting behind the headline rather than decorating it. Used twice it becomes a clip-art
   race t-shirt, which is the fastest way to make a premium piece look cheap.

---

## 7. Motion: more, but no WebGL

Existing: Lenis smooth scroll, scroll reveal, a ken-burns hero, the marquee ticker,
count-up stats, reading progress. Seven keyframe animations with **twelve
`prefers-reduced-motion` guards**, which is unusually disciplined. Lighthouse is
100/100/100/100.

**WebGL is declined, and the reasons are worth recording.** The art direction is
analogue: painted signs, perforated tickets, punch cards, kraft paper. WebGL's native
look is glossy, volumetric and digital, so it would fight the one thing that makes this
site distinctive rather than a template with a logo on it. The audience is trail runners
checking a date on a phone, often on poor signal. Three.js is ~150KB gzipped before
anything is drawn, and "100s across the board with this much movement" is a stronger
claim than a WebGL hero that costs the Performance score. And the site has to keep
working for years with nobody maintaining it.

WebGL earns its place when the 3D **is** the content. A terrain flythrough of the actual
course would qualify, and is worth revisiting if a GPX ever arrives.

**What to build instead, motion that comes from the content:**

- **The punch card punches itself** as you scroll the loop list, each hole stamping in
  with a slight overshoot. This is the signature moment: the site's best metaphor, and
  currently completely static.
- **The elevation profile draws itself** via `stroke-dashoffset`, with the aid-station
  markers pulsing once as the line passes each return to The Oval.
- Countdown digits that flip rather than swap.
- Stats that read as mechanical odometers rather than a plain number tween.
- The ticker easing in instead of starting at full speed.
- A slow parallax on the topo background. It is already an SVG, so this is nearly free.
- A tear-and-peel on the ticket stub on hover.
- The course-record row on `/records` getting a proper arrival rather than being one of
  forty table rows.

---

## 8. The contrast gate has to grow first

`tests/contrast.spec.ts` deliberately **skips elements sitting on a background image**,
because a single colour is not an honest answer there. That exemption is fine today and
becomes a hole the moment we put type over photographs and texture, which is exactly what
sections 6 and 7 propose.

Before the texture work lands, the gate should sample the **actual rendered pixels**
behind the text rather than skipping. That is what makes ambitious backgrounds safe
instead of a gamble, and it is the difference between adding grit and undoing a day spent
fixing contrast.

---

## 9. The phased plan

Each phase ends green on: `npm run check`, `npm run test:unit`, `npm test` (including the
contrast gate), both themes, both viewports, and a refreshed visual baseline in the same
commit when the pixels are meant to move.

**Phase 1 — Light mode, and the shadow rule.** The gate on all the visual work, because
texture and motion both sit on surfaces this phase changes. Invert the plates to forest
and warm charcoal on the cream page. Introduce `--display-shadow`, default `none`, with
dark surfaces opting back in. Section 1 and 2.

**Phase 2 — The type floor.** Nothing below 11px, eyebrows 12px, the Register button
14px, keeping the tracking. Cheap, and it removes an easy criticism. Section 3.

**Phase 3 — The contrast gate upgrade.** Sample real pixels behind text so phase 4 is
safe. Section 8.

**Phase 4 — Texture. DONE, 2026-09-08.** Landed in three commits: an earthy
grain plus a slow mottle layer under it, one deterministic arc of mud on the home
hero, torn edges between every band, and a shared photograph grade.

Two items on this list were dropped after looking at them properly, and the
reasons matter more than the items.

- **Deckled edges on the plates.** A ticket is die-cut stock and already carries
  a torn perforation, which is the one element on the page that reads as handled
  rather than drawn. Roughening its outline too would have meant masking an
  element that also carries a 2px border and a lift shadow, both of which a mask
  clips, so the cost was a real risk of a broken-looking object for a second
  helping of an idea the band edges now carry across the whole site.
- **Rubber-stamp bleed on the eyebrows.** The trail blaze is already the hand-made
  mark: off-square corners, three degrees of rotation. A second irregularity
  treatment on the same 9px object reads as fuss, not as craft.

**Phase 5 — Motion. DONE, 2026-09-08.** The two pieces that come from the
content landed first, as planned: the elevation profile draws itself left to
right, and the punch card punches its holes in loop order. Then the LED clock
re-strikes on a roll-over, the topo contours drift as their band passes, and the
ticker eases in instead of starting at speed.

Three items on the list came off it, each for a reason:

- **Countdown digits that flip.** A flip is a split-flap, and that component is
  explicitly an LED race clock drawn to rhyme with the clock in the hero
  photograph. It re-strikes its segments instead, which is what the real object
  does.
- **An arrival on the course-record row.** A scroll-driven wipe cannot work
  there: the row is inside the table's `overflow-x-auto` wrapper, which is a
  scroll container, so `view()` resolves the timeline against that box and the
  progress never moves. Driving it from the reveal observer is worse, since that
  starts elements at opacity 0 and this is record data that must not need
  JavaScript to be visible. The reasoning is written into globals.css beside the
  rule so it is not retried blindly.
- **The stats odometer and the ticket stub tear-peel.** Both are decoration
  rather than meaning, and the page already gained five moving parts today. They
  are cheap to add later if the site feels static, which it no longer does.

Two techniques are worth reusing. `pathLength="1"` makes a draw-on animation
JS-free and immune to a geometry change, and `animation-timeline: view()` gives
a scroll-driven effect with no listener at all, degrading to the static design
where it is unsupported. Both are inside `prefers-reduced-motion: no-preference`,
so the resting state is always the finished object.

**Phase 6 — Content, unblocked parts only.** The crew and spectator guide, and using the
photography large. Everything else in section 4 waits on Corfman.

**Not in scope, deliberately:** WebGL, merch, live tracking, and the aid-station and
cutoff table, which cannot be written honestly until the race answers.
