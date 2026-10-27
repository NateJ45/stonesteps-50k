// Safe to edit by hand
// =============================================================================
// Page templates for the Stone Steps 50K: the starting points for a new page
// =============================================================================
// When the race director clicks "+" on Pages, the Studio asks which of these to
// start from (PORTS.md card 109). Each one fills the page with the race's own
// blocks and clearly marked example text, so nobody faces an empty page, and
// nothing example-shaped can go live unnoticed: every example line starts
// "Example:", and the page builder warns on any section that still has one
// (src/lib/page-guardrails.ts).
//
// THE RACE YEAR. The templates follow the jobs the year brings (2026-10-18):
// race week (bib pickup, parking, the weather), a volunteer call, the course
// and its aid stations, the recap and photos, the sponsor thank-you, and the
// save-the-date for next year. The blocks that fill themselves (the schedule,
// the distances, the sponsors, the weather) read the race's own data, so a page
// made from a template shows the real times and prices from the first save.
//
// GROUPS (the builder kit, PORTS.md card 173, 2026-10-26). The new-page menu has
// no headings, so sanity.config.ts shows each template as "<group>: <title>"
// (templateMenuTitle) and this list is kept in group order (TEMPLATE_GROUPS);
// the test checks the order. The kit's blocks (event details, a schedule, tabs,
// cards with photos, a letter, a timeline) carry the parts the race's own data
// does not hold: where packet pickup is, the volunteer shifts, the aid stations
// per distance, a note from the race director, the race's history. Dates come
// from daysFromNow() so an event block opens with dates still to come; times are
// left empty, because a template never guesses a race-day time.
//
// Keep to block types a custom page accepts (sections.ts, raceSections.ts and
// builderSections.ts); src/lib/authoring.test.ts fails if a template names one
// that does not exist, leaves an array member without a `_key`, forgets the
// example marker, breaks a copy rule or a schema limit, or would warn about
// anything but example text. `sections` is a FUNCTION run through freshKeys(),
// so two pages made from one template never share a `_key`.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// sanity.config.ts turns the list into Studio templates.
// =============================================================================

import { freshKeys } from '../lib/authoring.ts';
import {
  band,
  button,
  buttonRow,
  daysFromNow,
  eventDate,
  eventDetails,
  example,
  header,
  letter,
  link,
  moment,
  outLink,
  photoCard,
  photoCards,
  schedule,
  scheduleDay,
  slot,
  tab,
  tabs,
  text,
  timeline,
} from './templateBlocks.ts';

/** The menu's groups, in the order they appear. */
export const TEMPLATE_GROUPS = ['Basics', 'Race day', 'People', 'The race year'] as const;
export type TemplateGroup = (typeof TEMPLATE_GROUPS)[number];

export interface PageTemplate {
  /** Stable id. Changing it only changes the menu; pages already made keep their content. */
  id: string;
  /** Which group of the menu it sits in. */
  group: TemplateGroup;
  /** What the "new page" menu says (after the group). */
  title: string;
  /** One line under the title, in the menu. */
  description: string;
  /** The sections a new page starts with. */
  sections: () => Record<string, unknown>[];
}

/** "Race day: Race week", what the new-page menu shows. */
export const templateMenuTitle = (t: PageTemplate): string => `${t.group}: ${t.title}`;

/** Build a list and give every array member a fresh key. */
const page = (...sections: Record<string, unknown>[]) => freshKeys(sections);

/** The two lines of an event's place, both for the race director to fill in. */
const examplePlace = () => `${example('Name of the place')}\nStreet address`;

// ── The templates, in menu order ─────────────────────────────────────────────

export const PAGE_TEMPLATES: PageTemplate[] = [
  // ── Basics ──
  {
    id: 'page-simple',
    group: 'Basics',
    title: 'Simple page',
    description: 'The page heading, then text. Good for most pages.',
    sections: () =>
      page(
        header('Stone Steps 50K', 'Page title', 'One sentence that says what this page is for.'),
        text(
          'A section heading',
          'Write the main text of the page here. Short paragraphs read best on a phone.',
          'Add a second paragraph, or delete this one.',
        ),
      ),
  },
  {
    id: 'page-blank',
    group: 'Basics',
    title: 'Blank page',
    description: 'No sections. Add your own with "+ Add item".',
    sections: () => [],
  },

  // ── Race day ──
  {
    id: 'page-race-week',
    group: 'Race day',
    title: 'Race week: what to know',
    description: 'Packet pickup, parking, the schedule and the weather, for the week before.',
    sections: () =>
      page(
        header(
          'Race week',
          'Everything you need for Saturday',
          'Bib pickup, parking and the start, in one place. Check back: this page changes as race day gets closer.',
        ),
        // Where and when bibs are handed out, with "Add to my calendar" and
        // directions made for the runner.
        eventDetails({
          eyebrow: example('Before the race'),
          title: example('Packet pickup'),
          dates: [eventDate(daysFromNow(14), { label: example('Add the real date and times') })],
          place: examplePlace(),
          note: example('Bring photo ID. Can someone collect your bib for you? Say so here.'),
        }),
        text(
          'Parking and getting to the start',
          'Where to park in Mt. Airy Forest, and how long the walk is to the start.',
        ),
        // The real times from This year's race, Race-day schedule.
        {
          _type: 'raceScheduleSection',
          eyebrow: example('Race day'),
          headline: example('The schedule'),
        },
        // Race-day weather from the archive and the forecast, drawn by the site.
        {
          _type: 'raceWeatherSection',
          eyebrow: example('The weather'),
          headline: example('What to expect'),
        },
        band(
          'Questions before Saturday?',
          'Send the race a note. Answers usually come within a day.',
          button(example('Contact the race'), '/contact/'),
        ),
      ),
  },
  {
    id: 'page-course-notes',
    group: 'Race day',
    title: 'Course notes and aid stations',
    description: 'The course features, aid stations for each distance, cutoffs and the schedule.',
    sections: () =>
      page(
        header(
          'The course',
          'Aid stations and cutoffs',
          'Where to find water and food on each loop, and the times to beat.',
        ),
        // The course features from This year's race, Course features.
        {
          _type: 'courseFeaturesSection',
          eyebrow: example('On the trail'),
          headline: example('What the course is like'),
        },
        // One tab per distance, so a 27K runner never reads the 50K's notes.
        tabs(example('Aid stations'), [
          tab(
            '50K',
            example('Where each aid station is on the loop, and what it has.'),
            example('Can runners leave a drop bag? Say where.'),
          ),
          tab('27K', example('The aid stations the 27K passes, and what each one has.')),
        ]),
        text(
          'Cutoffs',
          'The time a runner must leave each loop by, and what happens if they miss it.',
        ),
        {
          _type: 'raceScheduleSection',
          eyebrow: example('Race day'),
          headline: example('Start times and course close'),
        },
      ),
  },

  // ── People ──
  {
    id: 'page-volunteers',
    group: 'People',
    title: 'Volunteer call',
    description: 'The jobs, the shifts and the sign-up button.',
    sections: () =>
      page(
        header(
          'Volunteers',
          'Help run the Stone Steps',
          'The race runs on volunteers: aid stations, the course, bib pickup and the finish.',
        ),
        photoCards(example('Pick a job'), [
          photoCard(
            example('Aid stations'),
            example('Fill bottles, hand out food, cheer every runner through.'),
          ),
          photoCard(example('Course marshal'), example('Stand at a junction and point the way.')),
          photoCard(
            example('Bib pickup and the finish'),
            example('Check names, hand out bibs, record times.'),
          ),
        ]),
        schedule(
          example('The shifts'),
          [
            scheduleDay('', [
              slot('', example('Course marking'), example('Add the time and where to meet')),
              slot('', example('Aid stations'), example('Add the time and where to meet')),
              slot('', example('The finish'), example('Add the time and where to meet')),
            ]),
          ],
          example('Times go in once they are set. Each row is one shift.'),
        ),
        text(
          'What you get',
          'A shirt, a meal at the finish and the best view of the race. Say what this year brings.',
        ),
        band(
          'Sign up to volunteer',
          'Pick a job and a shift on RunSignUp. It takes two minutes.',
          outLink(example('Volunteer on RunSignUp')),
        ),
      ),
  },
  {
    id: 'page-director-note',
    group: 'People',
    title: 'A note from the race director',
    description: 'A short letter, signed, then links to where runners go next.',
    sections: () =>
      page(
        header('From the race director', 'A note before the race', 'One line on what this is.'),
        letter({
          eyebrow: example('A note from the race director'),
          body: [
            example('A few short paragraphs, in your own words. What this year is about.'),
            example('A thank-you, and anything runners should know before they arrive.'),
          ],
          name: example('Your name'),
          role: 'Race director',
        }),
        buttonRow(example('Where next'), [
          link(button(example('See the course'), '/course/')),
          link(button(example('Ask a question'), '/contact/')),
        ]),
      ),
  },
  {
    id: 'page-sponsors',
    group: 'People',
    title: 'Sponsor thank-you',
    description: 'A thank-you, the sponsors’ logos, and a way to become one.',
    sections: () =>
      page(
        header(
          'Our sponsors',
          'Thank you',
          'The race happens because these people and businesses back it.',
        ),
        text(
          'What they make possible',
          'A sentence or two on what sponsorship pays for: the aid stations, the shirts, the parks donation.',
        ),
        // The logos from This year's race, Sponsors.
        {
          _type: 'sponsorPatchesSection',
          eyebrow: example('This year'),
          headline: example('With thanks to'),
        },
        band(
          'Sponsor the race',
          'Your name in front of every runner, and a thank-you on this page.',
          button(example('Get in touch'), '/contact/'),
        ),
      ),
  },

  // ── The race year ──
  {
    id: 'page-recap',
    group: 'The race year',
    title: 'Race recap and photos',
    description: 'The day in numbers, a big photo, a gallery, a runner’s words and the results.',
    sections: () =>
      page(
        header(
          'Race recap',
          'How the day went',
          'A few lines on the race: the weather, the trail, the finishes worth remembering.',
        ),
        {
          _type: 'statSection',
          heading: example('The day in numbers'),
          stats: [
            { _type: 'statItem', source: 'manual', number: 300, label: example('runners started') },
            { _type: 'statItem', source: 'manual', number: 2, label: example('course records') },
            { _type: 'statItem', source: 'manual', number: 60, label: example('volunteers') },
          ],
        },
        { _type: 'photoBandSection', caption: example('A caption for the big photo') },
        {
          _type: 'gallerySection',
          heading: example('Photos from the trail'),
        },
        {
          _type: 'quoteSection',
          quote: example('A few words from a runner about the day.'),
          attribution: example('Their name, 50K'),
        },
        band(
          'See every finish',
          'The results are up, with every time back to 2003.',
          button(example('See the results'), '/results/'),
        ),
      ),
  },
  {
    id: 'page-history',
    group: 'The race year',
    title: 'Race history',
    description: 'The race year by year: how it started, the moments since, and where it is now.',
    sections: () =>
      page(
        header('Our story', 'How the Stone Steps began', 'One line on where the race came from.'),
        timeline(example('Year by year'), [
          moment(
            'First race',
            example('Where it began'),
            example('Put the real year in the box above. A few words on the first race.'),
          ),
          moment(
            'A milestone',
            example('A year worth remembering'),
            example('A new course, a record, a sellout. One moment per line.'),
          ),
          moment('This year', example('Where the race is now'), example('A few words on today.')),
        ]),
        {
          _type: 'quoteSection',
          quote: example('A few words from someone who ran the first one.'),
          attribution: example('Their name'),
        },
      ),
  },
  {
    id: 'page-save-the-date',
    group: 'The race year',
    title: 'Save the date',
    description: 'Next year’s date, the two distances and the register button.',
    sections: () =>
      page(
        header(
          'Next year',
          'Save the date',
          'The next Stone Steps is on its way. Here is when, and how to get in early.',
        ),
        // The 50K and 27K tickets, with this year's prices and caps.
        {
          _type: 'distanceTicketsSection',
          eyebrow: example('Pick your distance'),
          headline: example('The 50K and the 27K'),
        },
        band(
          'Registration is open',
          'Places are capped, and they go. Sign up on RunSignUp.',
          outLink(example('Register on RunSignUp')),
        ),
      ),
  },
];
