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
// Keep to block types a custom page accepts (sections.ts and raceSections.ts);
// src/lib/authoring.test.ts fails if a template names one that does not exist,
// leaves an array member without a `_key`, or forgets the example marker.
// `sections` is a FUNCTION run through freshKeys(), so two pages made from one
// template never share a `_key`.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// sanity.config.ts turns the list into Studio templates.
// =============================================================================

import { freshKeys } from '../lib/authoring.ts';
import { band, button, example, header, outLink, para, text } from './templateBlocks.ts';

export interface PageTemplate {
  /** Stable id. Changing it only changes the menu; pages already made keep their content. */
  id: string;
  /** What the "new page" menu says. */
  title: string;
  /** One line under the title, in the menu. */
  description: string;
  /** The sections a new page starts with. */
  sections: () => Record<string, unknown>[];
}

/** Build a list and give every array member a fresh key. */
const page = (...sections: Record<string, unknown>[]) => freshKeys(sections);

// ── The templates, in menu order ─────────────────────────────────────────────

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'page-simple',
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
    id: 'page-race-week',
    title: 'Race week: what to know',
    description: 'Bib pickup, parking, the schedule and the weather, for the week before the race.',
    sections: () =>
      page(
        header(
          'Race week',
          'Everything you need for Saturday',
          'Bib pickup, parking and the start, in one place. Check back: this page changes as race day gets closer.',
        ),
        text(
          'Bib pickup',
          'Where and when to collect your bib. Bring photo ID.',
          'Can someone collect it for you? Say so here.',
        ),
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
    id: 'page-volunteers',
    title: 'Volunteer call',
    description: 'What volunteers do, a photo, and the sign-up button.',
    sections: () =>
      page(
        header(
          'Volunteers',
          'Help run the Stone Steps',
          'The race runs on volunteers: aid stations, the course, bib pickup and the finish.',
        ),
        {
          _type: 'imageTextSection',
          imageSide: 'right',
          heading: example('What volunteers do'),
          body: [
            para(example('Aid stations: fill bottles, hand out food, cheer every runner through.')),
            para(example('Course marshals: stand at a junction and point the way.')),
            para(example('Bib pickup and the finish: check names, hand out bibs, record times.')),
          ],
        },
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
    id: 'page-course-notes',
    title: 'Course notes and aid stations',
    description: 'The course features, the aid stations and cutoffs, and the race-day schedule.',
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
        text(
          'Aid stations',
          'Where each aid station is on the loop, and what it has: water, sports drink, food.',
          'Can runners leave a drop bag? Say where.',
        ),
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
  {
    id: 'page-recap',
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
    id: 'page-sponsors',
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
  {
    id: 'page-save-the-date',
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
  {
    id: 'page-blank',
    title: 'Blank page',
    description: 'No sections. Add your own with "+ Add item".',
    sections: () => [],
  },
];
