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

## 6. Suggested order

1. Light-mode inversion and the shadow rule (sections 1 and 2). Biggest visual return,
   and it is a genuine design decision rather than a tweak.
2. The type floor (section 3). Cheap, and it removes an easy criticism.
3. Photography (section 5.2). The largest perceived-quality lever available.
4. The crew and spectator guide (section 4.3). The best content we can write unaided.
5. Motion and a signature moment (5.3, 5.4).
6. Everything blocked on Corfman, whenever he answers.

Verification for each: both themes, both viewports, the contrast gate
(`tests/contrast.spec.ts`), and a refreshed visual baseline in the same change.
