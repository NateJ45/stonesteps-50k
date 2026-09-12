// =============================================================================
// Help & Guide content — plain-language walkthroughs for the race director
// =============================================================================
// This is DATA, not code: each guide is a list of typed blocks. It lives in the
// repo (not editable in the Studio) so it can never be accidentally deleted,
// and so whoever runs this race next inherits it with the site.
//
// Ported from west-chester-preschool, where the pattern was worked out with a
// volunteer who had never used a CMS. Editing conventions:
//   - **double asterisks** for a concept worth emphasis.
//   - `backticks` for a THING YOU CLICK (a button, a tab, a menu entry).
//     Renders as a small button-look chip so a step can be skimmed for the
//     clickable part.
//   - _underscores_ for a light aside.
//   - No em-dashes. Commas, or "and".
//   - Define any jargon in plain words the first time it appears.
//
// WHO THIS IS WRITTEN FOR: David Corfman, who directs the race and did not ask
// for a website. Every guide answers a question he would actually have, in the
// order he would have it, and none of them assume he knows what a CMS, a
// singleton or a deploy is.
// =============================================================================

export type DiyLevel = 'self' | 'ask' | 'mixed';

/** Where a "Where in the Studio" breadcrumb can link to. */
export type PathLink = { doc: string; type?: string } | { pane: string } | { tool: string };

export type GuideBlock =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'path'; items: string[]; link?: PathLink }
  | {
      kind: 'callout';
      tone?: 'primary' | 'positive' | 'caution' | 'critical' | 'default';
      title?: string;
      text: string;
    }
  | { kind: 'seealso'; items: string[] };

/** Site-specific names, kept in one place so the prose never hardcodes them. */
export const SITE = {
  contactName: 'Nathan',
  raceName: 'Stone Steps 50K',
};

// The Help list groups guides under these headings, in THIS order. A guide must
// pick one; the union type makes a typo a compile error.
export const GUIDE_CATEGORIES = [
  'Start here',
  'The race itself',
  'Results and records',
  'Words and pictures',
  'Once a year',
] as const;
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

export interface Guide {
  slug: string;
  category: GuideCategory;
  title: string;
  icon: string;
  lead: string;
  diy: DiyLevel;
  body: GuideBlock[];
}

export const guides: Guide[] = [
  // ---------------------------------------------------------------- start here
  {
    slug: 'start-here',
    category: 'Start here',
    title: 'Start here: how this all works',
    icon: '👋',
    lead: 'Two minutes that make everything else make sense.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'The Studio and the website are two different things' },
      {
        kind: 'p',
        text: 'What you are looking at now is the **Studio**. It is your control room, and it is private. The **website** is what runners see. You make changes here, and they show up on the website a few minutes later.',
      },
      { kind: 'h', text: 'You cannot break the website by editing' },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Nothing is live until you press Publish.',
        text: 'While you type you are editing a private **draft**. The public website does not change at all until you click `Publish`. So open things, click around, and only publish when it looks right. If you make a mess and have not published, you can close the tab and walk away.',
      },
      { kind: 'h', text: 'How a change reaches the website' },
      {
        kind: 'steps',
        items: [
          'Open the thing you want to change from the menu on the left.',
          'Edit the boxes. Your typing saves itself as a draft as you go.',
          'When it looks right, click the `Publish` button at the bottom right.',
          'Wait two or three minutes. The website rebuilds itself and your change appears.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Give it a couple of minutes.',
        text:
          'The website does not change the instant you publish. It rebuilds in the background. Publish, go and do something else, then refresh the page you changed. If it has been ten minutes and nothing has happened, tell ' +
          SITE.contactName +
          '.',
      },
      { kind: 'h', text: 'What is in the left menu' },
      {
        kind: 'bullets',
        items: [
          '**Help & Guide**: these pages. You are in it.',
          '**This year’s race**: the date, the start times, the schedule, the entry fees. The things that change every year.',
          '**Pages**: the actual pages of the website and the blocks they are built from.',
          '**Results and runners**: every finisher, every year. Mostly looks after itself.',
          '**Site setup**: the menus, the footer, the settings. Rarely touched.',
        ],
      },
      { kind: 'h', text: 'If you get stuck' },
      {
        kind: 'p',
        text:
          'Nothing in here is urgent enough to risk guessing. If a guide does not cover it, leave it alone and ask ' +
          SITE.contactName +
          '. A question costs nothing; an unpicked change to the wrong thing can take a while to find.',
      },
      { kind: 'seealso', items: ['Change the race date', 'What happens after race day'] },
    ],
  },

  {
    slug: 'the-not-confirmed-marker',
    category: 'Start here',
    title: 'The "Not confirmed" marker',
    icon: '⚠️',
    lead: 'Why some things on the website say they are not confirmed, and how to clear it.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'What it is' },
      {
        kind: 'p',
        text: 'Some details on the website were written from the best information available and have never been checked by you. Rather than state them as fact, the site prints a small **Not confirmed** marker next to them, so a runner knows to ask rather than to rely on it.',
      },
      {
        kind: 'p',
        text: 'The cutoff time is the usual one. Packet pickup, parking, the awards, drop bags and the refund policy are the others: the race has never published them anywhere, so the site says so instead of inventing an answer.',
      },
      { kind: 'h', text: 'How to clear it' },
      {
        kind: 'steps',
        items: [
          'Open the thing that carries the marker, for example a row in the race-day schedule.',
          'Read what it says. If it is right, tick `Confirmed by the race director`.',
          'If it is wrong, fix the wording FIRST, then tick the box.',
          'Publish.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Only tick it if you actually know.',
        text: 'The whole point of the marker is that a runner can trust everything without one. Ticking the box on something you are not sure about is worse than leaving the marker in place, because it turns "we are not sure" into "the race says so".',
      },
    ],
  },

  // ------------------------------------------------------------ the race itself
  {
    slug: 'change-the-race-date',
    category: 'The race itself',
    title: 'Change the race date for next year',
    icon: '📅',
    lead: 'One field. It updates the countdown, the footer and the search listing.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['This year’s race', 'Race day'],
        link: { doc: 'race', field: 'raceDate' },
      },
      { kind: 'h', text: 'What to change' },
      {
        kind: 'steps',
        items: [
          'Set `Race date` to the new date and start time.',
          'Put the edition number up by one in `Edition number`. 2026 is the 23rd running, so 2027 is the 24th.',
          'Publish.',
        ],
      },
      { kind: 'h', text: 'What that one change moves' },
      {
        kind: 'bullets',
        items: [
          'The countdown clock on the home page.',
          'The "Next running" band at the bottom of every page, including the Register button.',
          'The date Google shows when someone searches for the race.',
          'The "23rd edition" figure in the row of numbers on the home page.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'You do not have to hunt these down.',
        text: 'They all read the same field. That is deliberate: the old website had the date typed into several places, which is how a site ends up disagreeing with itself.',
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The footer band hides itself.',
        text: 'Once the date has passed, the "Next running" band disappears rather than advertising a race that has already happened. Put the new date in and it comes back.',
      },
    ],
  },

  {
    slug: 'race-day-schedule',
    category: 'The race itself',
    title: 'Edit the race-day schedule',
    icon: '⏱️',
    lead: 'The times on the home page: when each distance goes, when the course closes.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['This year’s race', 'Race-day schedule'],
        link: { pane: 'this-years-race;orderable-scheduleItem' },
      },
      { kind: 'h', text: 'Editing a row' },
      {
        kind: 'steps',
        items: [
          'Click the row you want to change.',
          'Edit the time and the label.',
          'If this is something the race genuinely publishes, tick `Confirmed by the race director`.',
          'Publish.',
        ],
      },
      { kind: 'h', text: 'Adding or removing a row' },
      {
        kind: 'p',
        text: 'Use the `+` at the top of the list to add one, and the `...` menu on a row to remove it. Rows show in the order they are listed, and you can drag them to reorder.',
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Four rows are real, the rest are best guesses.',
        text: 'The two start times, the two trekker starts and the course close came from the race’s own registration page. Anything else in this list is carrying a **Not confirmed** marker until you check it.',
      },
      { kind: 'seealso', items: ['The "Not confirmed" marker'] },
    ],
  },

  {
    slug: 'entry-fees',
    category: 'The race itself',
    title: 'Change the entry fees or the entry cap',
    icon: '💵',
    lead: 'The prices under the two tickets, and the caps printed on them.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        // THE PRICES ARE ON EACH DISTANCE. This guide sent the reader to the
        // race document, where there is a fee list nothing on the site reads
        // any more: the ladder printed on a ticket is that distance's own.
        // Same error the Checkup and the rollover checklist carried
        // (2026-09-12).
        items: ['This year’s race', 'Distances'],
        link: { pane: 'this-years-race;orderable-distance' },
      },
      { kind: 'h', text: 'The prices' },
      {
        kind: 'p',
        text: 'The 50K and the 27K each carry their own price ladder, so both need changing. Open **This year’s race**, then **Distances**, then the 50K or the 27K, and edit `Entry fee tiers`. Each row has a label, an amount and the date it stops applying, and the rows print as the ladder on that distance’s ticket.',
      },
      { kind: 'h', text: 'The entry caps' },
      {
        kind: 'p',
        text: 'The cap is on the same screen. Open the distance and change `Entry cap`. It prints on the ticket beside the start time.',
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'This does not change what RunSignUp charges.',
        text: 'These fields change what the website SAYS. The actual price a runner pays is whatever RunSignUp is set to. If you change one, change both, or the website will be advertising a price the checkout does not honour.',
      },
    ],
  },

  {
    slug: 'sponsors',
    category: 'The race itself',
    title: 'Add or remove a sponsor',
    icon: '🤝',
    lead: 'The row of patches near the bottom of the home page.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['This year’s race', 'Sponsors'],
        link: { pane: 'this-years-race;orderable-sponsor' },
      },
      {
        kind: 'steps',
        items: [
          'Click `+` to add a sponsor, or click an existing one to edit it.',
          'Give it a name. That is what a screen reader announces, so use the real one.',
          'Drop the logo into `Logo`. A PNG with a transparent background looks best.',
          'Drag the rows to change the order they appear in.',
          'Publish.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'A sponsor with no logo still shows.',
        text: 'It renders as a name-only patch, which looks deliberate rather than broken. So it is safe to add a sponsor before you have their logo.',
      },
    ],
  },

  // ------------------------------------------------------- results and records
  {
    slug: 'results-after-race-day',
    category: 'Results and records',
    title: 'What happens after race day',
    icon: '🏁',
    lead: 'Short answer: nothing, for you. The results arrive on their own.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'You do not upload the results' },
      {
        kind: 'p',
        text: 'The race is timed on RunSignUp, so the results are already public there the day your timer posts them. The website checks RunSignUp every day through October and November, pulls in anything new, and rebuilds itself. You do not have to do anything at all.',
      },
      { kind: 'h', text: 'What appears by itself' },
      {
        kind: 'bullets',
        items: [
          'The new year in the **Results archive**, with the full field for both distances.',
          'Every finisher’s own page, showing their whole history at this race.',
          'The records tables, if anybody was fast enough to change them.',
          'The course record, the age group records and the top tens, all recalculated.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'The records cannot disagree with the results any more.',
        text: 'Every record on the site is worked out from the finishing times themselves rather than typed in by hand. The old website had the same time listed under two different years, because somebody copied it twice. That cannot happen here.',
      },
      { kind: 'h', text: 'The one thing worth checking' },
      {
        kind: 'p',
        text: 'The early starters. Trekkers are not eligible for awards, and the site leaves them out of every record, but RunSignUp does not tell the website who they were. If a trekker finished near the front, open their result and tick `Ran as a trekker`, or they could take a record they were not eligible to win.',
      },
      { kind: 'seealso', items: ['Fix a runner’s name'] },
    ],
  },

  {
    slug: 'fix-a-runners-name',
    category: 'Results and records',
    title: 'Fix a runner’s name',
    icon: '✏️',
    lead: 'Change it in one place and every year they ran changes with it.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['Results and runners', 'Runners'],
        link: { pane: 'this-years-race;athlete' },
      },
      { kind: 'h', text: 'Why there is only one place to fix' },
      {
        kind: 'p',
        text: 'Each runner is one record in the system, and every finish they have ever had points at it. So a misspelling is fixed once, not once per year. Search for them, correct the name, publish.',
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'If the same person shows up twice, do not just rename one.',
        text:
          'Two entries for one runner means their history is split in half, and renaming one leaves you with two people who share a name. That needs joining up properly. Send the two names to ' +
          SITE.contactName +
          '.',
      },
      {
        kind: 'p',
        text: '_This has already happened four times in the archive: the old results pages printed "Rob Apple" some years and "Robert Apple" others, and a runner’s six straight years showed as four. They are joined up now._',
      },
    ],
  },

  {
    slug: 'a-runner-asks-to-be-removed',
    category: 'Results and records',
    title: 'A runner asks to be taken off the site',
    icon: '🙋',
    lead: 'It happens. Here is what to do and what to expect.',
    diy: 'ask',
    body: [
      {
        kind: 'p',
        text: 'Every name on the site came from results the race itself published, and RunSignUp still publishes them. Even so, a runner is entitled to ask, and the answer should be yes.',
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Deleting them here is not enough on its own.',
        text:
          'The results are re-imported from RunSignUp automatically, so a runner deleted today would reappear at the next import. Removing somebody properly means excluding them from the import as well, which is a change to the code. Forward the request to ' +
          SITE.contactName +
          '.',
      },
      {
        kind: 'p',
        text: 'Their own page at /runners is already kept out of Google on purpose, so in most cases the thing they are worried about is not actually happening. Worth checking what they have seen before doing anything.',
      },
    ],
  },

  // ------------------------------------------------------- words and pictures
  {
    slug: 'edit-a-page',
    category: 'Words and pictures',
    title: 'Change the words on a page',
    icon: '📄',
    lead: 'Every page is a stack of blocks. You edit the blocks.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['Pages'],
        link: { pane: 'pages' },
      },
      { kind: 'h', text: 'How a page is built' },
      {
        kind: 'p',
        text: 'A page is a stack of **blocks**, one on top of the other: a heading band, a row of numbers, the two tickets, the elevation chart, and so on. You edit what is inside a block. You do not have to think about colours or spacing, because the design decides those from the block’s position on the page.',
      },
      { kind: 'h', text: 'Seeing it as you type' },
      {
        kind: 'steps',
        items: [
          'Click `Presentation` in the bar at the top of the Studio.',
          'Pick the page on the left. The real page appears beside it.',
          'Click any words on the page to jump to the box that holds them.',
          'Type. The page updates as you go.',
          'Publish when it reads right.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The preview shows your draft.',
        text: 'What you see in Presentation is your unpublished draft, not the live site. That is the point: you can see the change before anyone else does.',
      },
      { kind: 'h', text: 'One rule about the words themselves' },
      {
        kind: 'p',
        text: 'No dashes in the middle of a sentence. Use a comma, or start a new sentence. It is the one style rule the site sticks to and it is easy to undo by accident when pasting from an email.',
      },
    ],
  },

  {
    slug: 'change-a-photo',
    category: 'Words and pictures',
    title: 'Change a photograph',
    icon: '📷',
    lead: 'Swap a picture, and write the line that describes it.',
    diy: 'self',
    body: [
      {
        kind: 'steps',
        items: [
          'Open the page and find the block holding the photo.',
          'Click the picture, then `Replace`, and pick a new one.',
          'Fill in `Alt text`. This is required and it matters, see below.',
          'Publish.',
        ],
      },
      { kind: 'h', text: 'What alt text is' },
      {
        kind: 'p',
        text: 'One plain sentence describing what is happening in the photo, for somebody who cannot see it. "Runners on single track through Mt. Airy Forest" is right. "IMG_4471" or "trail photo" is not. It is read aloud by screen readers and shown if the picture fails to load, and Google reads it too.',
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Do not worry about the file size.',
        text: 'Upload the biggest version you have. The site resizes every picture itself and serves the right size to each visitor, so a large photo from a camera is better than one you shrank first.',
      },
    ],
  },

  // -------------------------------------------------------------- once a year
  {
    slug: 'yearly-checklist',
    category: 'Once a year',
    title: 'The once-a-year list',
    icon: '🗓️',
    lead: 'Everything that needs a human, in the order it comes up.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'When registration opens' },
      {
        kind: 'bullets',
        items: [
          'Put in the new **race date** and the new **edition number**.',
          'Check the **entry fees** against what RunSignUp is actually charging.',
          'Check the **entry caps** on both distances.',
          'Update the **race-day schedule** if any times have moved.',
        ],
      },
      { kind: 'h', text: 'Before race day' },
      {
        kind: 'bullets',
        items: [
          'Read anything still carrying a **Not confirmed** marker and either confirm it or correct it.',
          'Add or remove **sponsors** for this year.',
          'Swap in a photograph or two from last year’s race, if you have good ones.',
        ],
      },
      { kind: 'h', text: 'After race day' },
      {
        kind: 'bullets',
        items: [
          'Nothing, for the results. They arrive on their own.',
          'Check whether any **trekkers** finished near the front, and tick their box.',
          'Have a look at the records page and enjoy it.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Two things are still missing from the archive.',
        text: 'The 2020 results are lost, and so is the 27K before 2015. If a copy ever turns up, on a hard drive or in an old email, it can go straight in. The website says so on the results page rather than pretending those years did not happen.',
      },
    ],
  },
];
