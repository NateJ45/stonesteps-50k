// Safe to edit by hand
// =============================================================================
// Section patterns for the race year: groups of sections, ready to insert
// =============================================================================
// A PAGE TEMPLATE (pageTemplates.ts) starts a new page. A PATTERN is one or a
// few sections that go together, dropped into a page that already exists:
// "Registration is open" on the home page in January, "Race week" in late
// October, "The results are up" the week after. They follow the race year
// (2026-10-18): registration, the price step, the waitlist, volunteers, race
// week, the weather, a course change, results, records, photos, sponsors and
// next year's date.
//
// WHERE THEY LIVE. The page builder's "Insert a saved section" button reads
// saved sections (`sectionPreset` documents) from the dataset, so a pattern has
// to exist there to be offered. This file is the source of truth for their
// words; scripts/seed-section-patterns.mjs copies them into the dataset as
// DRAFT saved sections (dry by default, rule 16). Drafts on purpose: a copy can
// be added from a draft, but a synced section can only show a published one, so
// example text can never go live through a synced section by accident. The
// script never overwrites one that exists, so the race director's own edits
// are safe if it runs again.
//
// Every line the race must supply starts "Example:", and the page builder
// warns about it once the copy is on a page. src/lib/authoring.test.ts checks
// every pattern the same way as a template.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// =============================================================================

import { freshKeys } from '../lib/authoring.ts';
import {
  band,
  button,
  daysFromNow,
  eventDate,
  eventDetails,
  example,
  letter,
  outLink,
  raceBlock,
  schedule,
  scheduleDay,
  slot,
  text,
} from './templateBlocks.ts';

type Rec = Record<string, unknown>;

export interface SectionPattern {
  /** Stable id. The saved section is stored as `pattern-<id>`. */
  id: string;
  /** The saved section's name, as the "Insert a saved section" list shows it. */
  title: string;
  /** One line under the name: when it fits and what to change. */
  note: string;
  /** The sections, with fresh keys every call. */
  sections: () => Rec[];
}

const pattern = (p: Omit<SectionPattern, 'sections'> & { build: () => Rec[] }): SectionPattern => ({
  id: p.id,
  title: p.title,
  note: p.note,
  sections: () => freshKeys(p.build()),
});

export const SECTION_PATTERNS: SectionPattern[] = [
  pattern({
    id: 'registration-open',
    title: 'Registration is open',
    note: 'January: on the home page, with the two tickets. Put the RunSignUp link on the button.',
    build: () => [
      band(
        'Registration is open',
        'The 50K and the 27K are on RunSignUp. Places are capped.',
        outLink(example('Register on RunSignUp')),
      ),
      raceBlock('distanceTicketsSection', 'Pick your distance', 'The 50K and the 27K'),
    ],
  }),
  pattern({
    id: 'price-going-up',
    title: 'The price goes up soon',
    note: 'A week before an entry fee step ends. Say the date.',
    build: () => [
      band(
        'The price goes up on Friday',
        'Register by the end of the week to get this price.',
        outLink(example('Register on RunSignUp')),
      ),
    ],
  }),
  pattern({
    id: 'race-full',
    title: 'The race is full: waitlist',
    note: 'When a distance sells out. Put the waitlist link on the button.',
    build: () => [
      band(
        'The 50K is full',
        'Join the waitlist on RunSignUp. Places open up as runners drop.',
        outLink(example('Join the waitlist')),
      ),
    ],
  }),
  pattern({
    id: 'volunteers-wanted',
    title: 'Volunteers wanted',
    note: 'From late summer: aid stations, the course and the finish. Put the sign-up link on the button.',
    build: () => [
      text(
        'Volunteers wanted',
        'The race runs on volunteers: aid stations, course marshals, bib pickup and the finish.',
      ),
      band(
        'Pick a job and a shift',
        'Sign up on RunSignUp. It takes two minutes.',
        outLink(example('Volunteer on RunSignUp')),
      ),
    ],
  }),
  pattern({
    id: 'race-week',
    title: 'Race week: what to know',
    note: 'The week before the race: bib pickup, parking and the schedule.',
    build: () => [
      text(
        'Race week: what to know',
        'Bib pickup: where and when, and bring photo ID.',
        'Parking: where to leave the car in Mt. Airy Forest, and the walk to the start.',
      ),
      raceBlock('raceScheduleSection', 'Race day', 'The schedule'),
    ],
  }),
  pattern({
    id: 'weather-watch',
    title: 'Weather watch',
    note: 'Race week, when the forecast is in: what to wear and what to expect underfoot.',
    build: () => [
      raceBlock('raceWeatherSection', 'The weather', 'What Saturday looks like'),
      text('Dress for the trail', 'A line on the forecast, the mud and what to wear.'),
    ],
  }),
  pattern({
    id: 'course-change',
    title: 'Course change this year',
    note: 'When a trail is closed or rerouted. Say where, and what it changes.',
    build: () => [
      text(
        'A change to the course',
        'Which part of the loop has changed this year, and why.',
        'What it means for runners: the distance, the climbs, the aid stations.',
      ),
    ],
  }),
  pattern({
    id: 'results-up',
    title: 'The results are up',
    note: 'The days after the race. The button goes to the results.',
    build: () => [
      band(
        'The results are up',
        'Every finish from this year, and every year back to 2003.',
        button(example('See the results'), '/results/'),
      ),
    ],
  }),
  pattern({
    id: 'new-records',
    title: 'New course records',
    note: 'After a record falls. The board below fills itself from the results.',
    build: () => [
      text('New course records', 'Who broke which record, and by how much.'),
      raceBlock('recordsBoardSection', 'The records', 'All-time bests'),
    ],
  }),
  pattern({
    id: 'photos-up',
    title: 'Race photos are up',
    note: 'When the photographer shares the album. Put the album link on the button.',
    build: () => [
      band(
        'The race photos are up',
        'Find yourself on the trail.',
        outLink(example('See the photos')),
      ),
    ],
  }),
  pattern({
    id: 'sponsor-thanks',
    title: 'Thank you, sponsors',
    note: 'After the race, or any time: the logos fill themselves from Sponsors.',
    build: () => [
      raceBlock('sponsorPatchesSection', 'With thanks', 'This year’s sponsors'),
      text('Thank you', 'A line on what the sponsors made possible this year.'),
    ],
  }),
  pattern({
    id: 'save-the-date',
    title: 'Save the date for next year',
    note: 'Once next year’s date is set. The tickets show the new prices.',
    build: () => [
      band(
        'Save the date',
        'The next Stone Steps is on its way. Here is the date.',
        outLink(example('Register on RunSignUp')),
      ),
      raceBlock('distanceTicketsSection', 'Next year', 'The 50K and the 27K'),
    ],
  }),
  // The builder kit (PORTS.md card 173, 2026-10-26): the race-week pieces the
  // race's own data does not hold.
  pattern({
    id: 'packet-pickup',
    title: 'Packet pickup: where and when',
    note: 'Race week: put in the real date, times and place. Calendar and directions are made for you.',
    build: () => [
      eventDetails({
        eyebrow: example('Before the race'),
        title: example('Packet pickup'),
        dates: [eventDate(daysFromNow(14), { label: example('Add the real date and times') })],
        place: `${example('Name of the place')}\nStreet address`,
        note: example('Bring photo ID. Say whether someone else can collect a bib.'),
      }),
    ],
  }),
  pattern({
    id: 'volunteer-shifts',
    title: 'Volunteer shifts',
    note: 'With the volunteer call: one row per shift. Add the times once they are set.',
    build: () => [
      schedule(example('The shifts'), [
        scheduleDay('', [
          slot('', example('Course marking'), example('Add the time and where to meet')),
          slot('', example('Aid stations'), example('Add the time and where to meet')),
          slot('', example('The finish'), example('Add the time and where to meet')),
        ]),
      ]),
    ],
  }),
  pattern({
    id: 'director-note',
    title: 'A note from the race director',
    note: 'Any time: a short signed letter. Race week, after the race, or with next year’s date.',
    build: () => [
      letter({
        eyebrow: example('A note from the race director'),
        body: [example('A few short paragraphs, in your own words.')],
        name: example('Your name'),
        role: 'Race director',
      }),
    ],
  }),
];
