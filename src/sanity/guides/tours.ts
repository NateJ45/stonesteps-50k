// Safe to edit by hand
// =============================================================================
// The Studio's spotlight tours for the race, written as DATA (studio-complete)
// =============================================================================
// Starter card 137 brings spotlight tours (a popover pinned to a real piece of
// the Studio, one step at a time) and welcome / what's-new modals. Until it
// lands nothing reads this file; once it does, kit.config.ts hands these to the
// kit and the anchors below are mapped to the kit's own anchor names.
//
// ANCHORS are written as "<surface>:<thing>" in plain terms, so they can be
// matched to whatever the kit exposes:
//   tool:<id>          a tool's button in the top bar (ids as in kit.config.ts)
//   home:<card>        a card on Home (banner, checklist, live, fix-it, pages, visitors, ask)
//   pane:<id>          a desk pane by its structure.ts id ('this-years-race;orderable-sponsor')
//   doc:<field>        a field in the open document, or doc:publish for the Publish button
//   qu:<form id>       a tile on the Quick update tool (ids as in kit.config.ts)
//
// ROLE: 'owner' is the race director (the staff view), 'helper' is a
// developer or administrator, 'all' is both. WHEN: 'first-run' plays once on
// first sign-in, 'on-demand' plays from the Site Guide's "Show me around".
//
// Words: plain, warm, no em-dashes, one idea per step, under ~40 words a body.
// The repo is public: no names, emails or private details.
// =============================================================================

export type TourRole = 'owner' | 'helper' | 'all';
export type TourWhen = 'first-run' | 'on-demand';

export interface TourStepData {
  anchor: string;
  title: string;
  body: string;
}

export interface TourData {
  id: string;
  title: string;
  /** One line under the title in the tour picker. */
  detail: string;
  role: TourRole;
  when: TourWhen;
  steps: TourStepData[];
}

export interface ModalData {
  id: string;
  title: string;
  body: string[];
  /** The main button's words, and the tour it starts (a TourData id) if any. */
  primary: { label: string; tour?: string };
  secondary?: string;
}

/** Shown once, the first time the race director signs in. */
export const WELCOME_MODAL: ModalData = {
  id: 'welcome',
  title: 'Welcome to the race website’s Studio',
  body: [
    'This is where the website is kept up to date: the race date, the prices, the notices across the top of the page, the sponsors.',
    'Nothing you do here is public until you press Publish, and there is an Undo for almost everything.',
    'Most weeks it needs nothing. Race week, it needs a few taps from your phone.',
  ],
  primary: { label: 'Show me around (two minutes)', tour: 'first-visit' },
  secondary: 'Not now. It is in the Site Guide any time.',
};

/** Shown once after this release, to anyone who has already seen the welcome. */
export const WHATS_NEW_MODAL: ModalData = {
  id: 'whats-new-2026-10',
  title: 'New in Quick update',
  body: [
    'Quick update now does the whole race year from your phone, not just race week.',
    'Registration is open, Ask for volunteers, Tell runners the results are in, and Add a sponsor sit beside the race-week notices.',
    'The race checklist on Home now follows the calendar: race-week and after-the-race jobs only show up when they matter.',
  ],
  primary: { label: 'Show me Quick update', tour: 'quick-update' },
  secondary: 'Got it',
};

export const TOURS: TourData[] = [
  {
    id: 'first-visit',
    title: 'Your first visit',
    detail: 'Home, where to edit, Publish and help. Two minutes.',
    role: 'owner',
    when: 'first-run',
    steps: [
      {
        anchor: 'home:banner',
        title: 'This is Home',
        body: 'The Studio opens here every time. It shows what needs doing for the race, and whether your last change is on the website yet.',
      },
      {
        anchor: 'home:checklist',
        title: 'The race checklist',
        body: 'It ticks itself as things get done, and race-week jobs only appear in race week. All ticked means there is nothing to do.',
      },
      {
        anchor: 'tool:quick-update',
        title: 'Quick update',
        body: 'The jobs you do from your phone: a race-week notice, an urgent change, registration, volunteers, results, a new sponsor.',
      },
      {
        anchor: 'tool:structure',
        title: 'Content',
        body: 'Everything else. This year’s race holds the date, the distances, the schedule and the sponsors. Pages holds the pages.',
      },
      {
        anchor: 'tool:presentation',
        title: 'Live preview',
        body: 'The website as runners see it, with your unpublished changes in place. Click any words to edit them right there.',
      },
      {
        anchor: 'tool:site-guide',
        title: 'Help, any time',
        body: 'The Site Guide has a page for every job, with pictures. A "How to" beside a field opens the part that explains it.',
      },
    ],
  },
  {
    id: 'quick-update',
    title: 'Quick update',
    detail: 'The year’s phone jobs, one tile each.',
    role: 'owner',
    when: 'on-demand',
    steps: [
      {
        anchor: 'qu:race-week',
        title: 'A race-week notice',
        body: 'Parking, bib pickup, the weather. One line across the top of every page until the last day you pick.',
      },
      {
        anchor: 'qu:urgent',
        title: 'Something changed on race day',
        body: 'The same line in red. It takes itself down two days later, so there is nothing to remember.',
      },
      {
        anchor: 'qu:registration-open',
        title: 'Registration is open',
        body: 'The words are already written, and it links to the Register page you have set. Press the button the morning sign-ups open.',
      },
      {
        anchor: 'qu:volunteers',
        title: 'Ask for volunteers',
        body: 'A call for help with your sign-up link. It shows for three weeks unless you pick another day.',
      },
      {
        anchor: 'qu:results-in',
        title: 'The results are in',
        body: 'Results import themselves overnight. Once this year is there, this points runners at it.',
      },
      {
        anchor: 'qu:sponsor',
        title: 'Add a sponsor',
        body: 'Their name and website from your phone. Add the logo later in the full editor.',
      },
    ],
  },
  {
    id: 'publish',
    title: 'Editing and publishing',
    detail: 'Drafts, Publish, and how long the website takes.',
    role: 'all',
    when: 'on-demand',
    steps: [
      {
        anchor: 'doc:form',
        title: 'Your changes are a draft',
        body: 'Every change saves itself as you type, privately. Nobody sees it yet.',
      },
      {
        anchor: 'doc:publish',
        title: 'Publish puts it on the website',
        body: 'Press Publish when you are happy. The website rebuilds itself in a few minutes.',
      },
      {
        anchor: 'navbar:status',
        title: 'Is it live yet?',
        body: 'The line under the top bar says when your change is on the website. No need to keep refreshing.',
      },
      {
        anchor: 'doc:history',
        title: 'Changed your mind?',
        body: 'Undo works for the last few changes. Earlier versions are in the document’s menu, and the Trash brings back anything deleted.',
      },
    ],
  },
  {
    id: 'race-year',
    title: 'Starting a new race year',
    detail: 'The once-a-year jobs, in the order they come up.',
    role: 'owner',
    when: 'on-demand',
    steps: [
      {
        anchor: 'pane:this-years-race',
        title: 'This year’s race',
        body: 'Everything that changes from one running to the next is in here, in one place.',
      },
      {
        anchor: 'doc:raceDate',
        title: 'The date first',
        body: 'Race day moves the countdown, the footer and the date Google shows. It is the one field everything else reads.',
      },
      {
        anchor: 'pane:this-years-race;orderable-distance',
        title: 'Prices and caps',
        body: 'Each distance has its own price ladder and cap. Make them match RunSignUp to the dollar.',
      },
      {
        anchor: 'pane:race-year',
        title: 'The checklist for the year',
        body: 'Start a new race year lists the rest, with what is already done ticked off.',
      },
    ],
  },
  {
    id: 'results',
    title: 'After the race',
    detail: 'Results, trekkers and fixing a name.',
    role: 'owner',
    when: 'on-demand',
    steps: [
      {
        anchor: 'pane:results-and-records',
        title: 'Results arrive by themselves',
        body: 'They import from RunSignUp every night after the race, and the records recalculate. Nothing to upload.',
      },
      {
        anchor: 'doc:trekker',
        title: 'Mark a trekker',
        body: 'Tick this on an early starter who finished near the front, so they stay out of the records.',
      },
      {
        anchor: 'pane:results-and-records;athlete',
        title: 'Fix a name once',
        body: 'A runner’s name lives in one place. Fix it here and every year of their results follows.',
      },
    ],
  },
  {
    id: 'helper-tour',
    title: 'For the developer',
    detail: 'The parts of the Studio the race director does not see.',
    role: 'helper',
    when: 'on-demand',
    steps: [
      {
        anchor: 'tool:checkup',
        title: 'Checkup',
        body: 'The race rules (date, prices, records, trekkers) and the generic ones, with a link to each fix.',
      },
      {
        anchor: 'pane:results-and-records',
        title: 'Hidden panes',
        body: 'Race days and the hand-typed records list are hidden from the staff view. The weather script and the results own them.',
      },
      {
        anchor: 'tool:media',
        title: 'Media',
        body: 'Every uploaded image. Not in the staff view, so nobody deletes a picture a page still uses.',
      },
    ],
  },
];
