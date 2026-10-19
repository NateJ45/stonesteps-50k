// Safe to edit by hand
// =============================================================================
// This site's Studio tours, welcome and "What's new" (PORTS.md card 137)
// =============================================================================
// Plain data, kept out of kit.config.ts so src/lib/studio-tour.test.ts can read
// it in bare Node and catch a typo (a welcome naming a tour that is not there,
// an em-dash, a date that is not a date). kit.config.ts passes these on as
// `tours`, `welcome` and `whatsNew`. Anchors and shapes: docs/agent/studio-kit.md,
// "Spotlight tours". The plan behind the jobs: docs/agent/studio-plan.md.
//
// Words: plain, warm, no em-dashes, one idea per step, under ~40 words a body.
// The repo is public: no names, emails or private details.
// =============================================================================

import type { TourDef, WelcomeConfig, WhatsNewEntry } from '../lib/studio-tour.ts';

export const TOURS: TourDef[] = [
  {
    id: 'first-visit',
    title: 'Your first visit',
    role: 'staff',
    firstRun: true,
    steps: [
      {
        anchor: 'home-banner',
        title: 'This is Home',
        short: 'Home',
        meaning: 'home',
        body: 'The Studio opens here every time. It shows what needs doing for the race, and whether your last change is on the website yet.',
      },
      {
        anchor: 'home-this-week',
        title: 'The race checklist',
        short: 'Checklist',
        meaning: 'step',
        body: 'It ticks itself as things get done, and race-week jobs only appear in race week. All ticked means there is nothing to do.',
      },
      {
        anchor: 'tool:quick-update',
        title: 'Quick update',
        short: 'Quick update',
        meaning: 'notice',
        body: 'The jobs you do from your phone, laid out for the time of year: a race-week notice, a change on race morning, the results, a sponsor.',
      },
      {
        anchor: 'tool:structure',
        title: 'Content',
        short: 'Content',
        meaning: 'content',
        body: 'Everything else. This year’s race holds the date, the distances, the schedule and the sponsors. Pages holds the pages.',
      },
      {
        anchor: 'tool:presentation',
        title: 'Live preview',
        short: 'Preview',
        meaning: 'preview',
        body: 'The website as runners see it, with your unpublished changes in place. Click any words to edit them right there.',
      },
      {
        anchor: 'home-help',
        title: 'Help, any time',
        short: 'Help',
        meaning: 'help',
        body: 'The Site Guide has a page for every job, with pictures and short videos. A "How to" beside a field opens the part that explains it.',
      },
    ],
  },
  {
    id: 'helper-start',
    title: 'For the developer',
    role: 'editor',
    firstRun: true,
    steps: [
      {
        anchor: 'home-banner',
        title: 'This is Home',
        short: 'Home',
        meaning: 'home',
        body: 'The race director’s starting point. Checklist, live status and the jobs by season.',
      },
      {
        anchor: 'tool:checkup',
        title: 'Checkup',
        short: 'Checkup',
        meaning: 'checkup',
        body: 'The race rules (date, prices, records, trekkers) and the generic ones, each with a link to the fix.',
      },
      {
        anchor: 'tool:media',
        title: 'Media',
        short: 'Media',
        meaning: 'image',
        body: 'Every uploaded image. Not in the race director’s view, so nobody deletes a picture a page still uses.',
      },
      {
        anchor: 'tool:structure',
        title: 'Hidden panes',
        short: 'Content',
        meaning: 'content',
        body: 'Race days and the hand-typed records list are hidden from the staff view. The weather script and the results import own them.',
      },
    ],
  },
  {
    id: 'quick-update',
    title: 'How this screen works',
    tool: 'quick-update',
    steps: [
      {
        anchor: 'quick-list',
        title: 'The jobs for this time of year',
        short: 'Jobs',
        meaning: 'quickUpdate',
        body: 'Each tile is one job, and it only shows in its season. Race week brings the notices; the weeks after bring the results.',
      },
      {
        anchor: 'quick:race-week',
        title: 'A race-week notice',
        short: 'Notice',
        meaning: 'notice',
        body: 'Parking, bib pickup, the weather. One line across the top of every page until the last day you pick.',
      },
      {
        anchor: 'quick:urgent',
        title: 'Something changed on race day',
        short: 'Urgent',
        meaning: 'times',
        body: 'The same line in red. It takes itself down two days later, so there is nothing to remember.',
      },
      {
        anchor: 'quick:race-morning',
        title: 'The start time or parking moved',
        short: 'Change',
        meaning: 'place',
        body: 'This one changes what is already on the race page, so it starts with today’s words. Fix the box that changed and save.',
      },
      {
        anchor: 'quick:results-in',
        title: 'The results are in',
        short: 'Results',
        meaning: 'value',
        body: 'Results import themselves overnight. Once this year is there, this points runners at it.',
      },
      {
        anchor: 'quick:mark-trekker',
        title: 'Mark a trekker',
        short: 'Trekker',
        meaning: 'value',
        body: 'Pick the early starter who finished near the front and tick the box. Their time stays; the records leave them out.',
      },
    ],
  },
  {
    id: 'publish',
    title: 'Editing and publishing',
    steps: [
      {
        anchor: 'tool:structure',
        title: 'Open anything to change it',
        short: 'Open',
        meaning: 'content',
        body: 'Pick a page or a list in Content. Every change saves itself as you type, privately. Nobody sees it yet.',
      },
      {
        goTo: { doc: 'race', type: 'race' },
        anchor: 'publish',
        title: 'Publish puts it on the website',
        short: 'Publish',
        meaning: 'publishing',
        body: 'Press Publish when you are happy. The website rebuilds itself in a few minutes.',
      },
      {
        anchor: 'navbar-status',
        title: 'Is it live yet?',
        short: 'Live?',
        meaning: 'preview',
        body: 'The line under the top bar says when your change is on the website. No need to keep refreshing.',
      },
      {
        anchor: 'document-menu',
        title: 'Changed your mind?',
        short: 'Undo',
        meaning: 'restore',
        body: 'Undo works for the last few changes. Earlier versions are in the document’s menu, and the Trash brings back anything deleted.',
      },
    ],
  },
  {
    id: 'race-year',
    title: 'Starting a new race year',
    steps: [
      {
        goTo: { pane: 'this-years-race' },
        anchor: 'pane:list',
        title: 'This year’s race',
        short: 'Race',
        meaning: 'event',
        body: 'Everything that changes from one running to the next is in here, in one place: the date, the distances, the schedule, the sponsors.',
      },
      {
        goTo: { doc: 'race', type: 'race', field: 'raceDate' },
        anchor: 'field:raceDate',
        title: 'The date first',
        short: 'Date',
        meaning: 'times',
        body: 'Race day moves the countdown, the footer and the date Google shows. It is the one field everything else reads.',
      },
      {
        goTo: { pane: 'race-year' },
        anchor: 'pane:list',
        title: 'The checklist for the year',
        short: 'Checklist',
        meaning: 'step',
        body: 'Start a new race year lists the rest, in order, with what is already done ticked off.',
      },
    ],
  },
];

export const WELCOME: WelcomeConfig = {
  title: 'Welcome to the race website’s Studio',
  body: 'This is where the website is kept up to date: the race date, the prices, the notices across the top of the page, the sponsors.',
  points: [
    'Nothing you do here is public until you press Publish.',
    'There is an Undo for almost everything.',
    'Most weeks it needs nothing. Race week, it needs a few taps from your phone.',
  ],
  tour: 'first-visit',
};

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    date: '2026-10-19',
    title: 'Quick update follows the race year',
    items: [
      'Race week: put up a notice, or change the start time or the parking, from your phone.',
      'After the race: look at the results, tell runners they are in, and mark a trekker.',
      'Each job only shows in its season, so the screen stays short.',
      'The checklist on Home now follows the calendar too.',
    ],
    tour: 'quick-update',
  },
];
