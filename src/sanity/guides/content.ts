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

import type { FieldGuideMap } from '../../lib/studio-kit';

export type DiyLevel = 'self' | 'ask' | 'mixed';

/** Where a "Where in the Studio" breadcrumb can link to. */
// Mirrors StudioTarget in src/lib/studio-kit.ts, which is what
// actually turns one of these into a route. `field` opens the document ON that
// field; see the note there.
export type PathLink =
  { doc: string; type?: string; field?: string } | { pane: string } | { tool: string };

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
  | { kind: 'seealso'; items: string[] }
  // A picture of the Studio by key (./shots.ts, PORTS.md card 130); a key with
  // no capture yet draws the wireframe, so a guide never shows a hole.
  | { kind: 'shot'; key: string; caption?: string }
  // A clip by key (./videos.ts, PORTS.md card 137); a key with no clip draws nothing.
  | { kind: 'video'; key: string; caption?: string };

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
  /**
   * Optional short clip of the job being done (PORTS.md card 115). Shows under
   * "Watch how it is done" on Home and in the Site Guide; with no clips anywhere
   * the row hides itself. A file in public/ ("/guides/<slug>.mp4") or a YouTube
   * (unlisted is fine) or Vimeo link. Keep clips under two minutes.
   */
  video?: string;
}

export const guides: Guide[] = [
  // ---------------------------------------------------------------- start here
  {
    slug: 'start-here',
    category: 'Start here',
    title: 'Start here: how this all works',
    icon: 'home',
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
      { kind: 'h', text: 'There are two ways in, and they are the same content' },
      {
        kind: 'p',
        text: 'Along the very top you will see **Home**, **Content** and **Live preview**. Home opens first and tells you what needs doing. Content is the filing cabinet. Live preview shows you the real website and lets you click the words on it. Content and Live preview edit the same thing, so use whichever suits the job. There is a whole guide on it below if you want the detail.',
      },
      { kind: 'h', text: 'What is in the left menu' },
      {
        kind: 'bullets',
        items: [
          '**This year’s race**: the date, the start times, the schedule, the entry fees, the sponsors. The things that change every year.',
          '**Results and records**: every finisher, every year. They import themselves from RunSignUp; this is where to look, and where to mark a trekker.',
          '**Pages**: the actual pages of the website and the blocks they are built from.',
          '**Race notices**: the short line across the top of every page, for race week news like parking or the weather.',
          '**Site setup**: the menus, the footer, the settings. Rarely touched.',
          '**Trash**: anything you moved to the Trash, ready to bring back.',
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
      {
        kind: 'seealso',
        items: [
          'Content and Live preview: two ways in',
          'What the Home page shows you',
          'Change the race date for next year',
          'What happens after race day',
        ],
      },
    ],
  },

  {
    slug: 'structure-and-presentation',
    category: 'Start here',
    title: 'Content and Live preview: two ways in',
    icon: 'arrow',
    lead: 'The tabs along the top are two doors into the same content. Here is which one to use when.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'The tabs along the top' },
      {
        kind: 'p',
        text: 'Across the very top of the Studio there is a row of words: **Home**, **Quick update**, **Content**, **Live preview**, **Messages**, **Site Guide**, **Checkup** and **Media**. They are not sections of the website. Most are helpers; the two you edit in are **Content** and **Live preview**, and they are two ways of looking at the same thing.',
      },
      {
        kind: 'bullets',
        items: [
          '**Content** is the filing cabinet. Everything the website knows, listed in the menu down the left.',
          '**Live preview** is the website itself, with the words switched on so you can click them.',
          '**Media** is every photograph that has ever been uploaded, in one place.',
        ],
      },
      { kind: 'h', text: 'Content: when you know what you are looking for' },
      {
        kind: 'p',
        text: 'The menu on the left of Content is a filing cabinet: `This year’s race`, `Results and records`, `Pages`, `Race notices`, `Site setup`. You open a drawer, you open the thing inside it, you edit the boxes, you publish.',
      },
      {
        kind: 'p',
        text: 'Use it when you already know the name of the thing you want. The race date, the entry fees, a sponsor, the schedule. It is also the only place some things exist at all, because they are not on any one page: results, runners, records and the site settings all live here and nowhere else.',
      },
      { kind: 'h', text: 'Live preview: when you can see the thing you want to change' },
      {
        kind: 'p',
        text: 'Live preview shows you the real website in the middle of the screen, the list of pages down the left, and the boxes for whatever you have selected down the right. It is the one to reach for when you can picture the sentence you want to fix but could not say what it is called.',
      },
      {
        kind: 'steps',
        items: [
          'Click `Live preview` at the top.',
          'Pick a page from the list on the left.',
          'Make sure the `Edit` switch in the toolbar is on. It is on by default.',
          'Click the words on the page you want to change. The boxes for them open on the right.',
          'Type. The page redraws as you go.',
          'Publish, the same as anywhere else.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The Edit switch changes what a click does.',
        text: 'With `Edit` **on**, clicking something on the page selects it so you can edit it. With `Edit` **off**, the page behaves like the real website: links work and you can walk around it. Flick it off when you want to check that a button goes where it should.',
      },
      { kind: 'h', text: 'They are the same content' },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'You cannot get them out of step.',
        text: 'There is one copy of everything. A change you make in Live preview is already made in Content, and the other way round. Publish means the same thing in both. Pick whichever one suits the job in front of you and switch between them as often as you like.',
      },
      { kind: 'h', text: 'Two things that catch people out' },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Live preview shows your draft, not the live website.',
        text: 'The yellow strip at the top of the frame says `Draft preview` for a reason. What you are looking at includes your unpublished changes, so it is what the website WILL look like, not what a runner sees right now. To see the real thing, use the small open-in-a-new-tab button at the right of the toolbar.',
      },
      {
        kind: 'callout',
        tone: 'default',
        title: 'The page list only lists pages.',
        text: 'Results, runners, sponsors, the schedule and the settings are not pages, so they are not in that list. If you cannot find something in Live preview, it is almost certainly in Content instead.',
      },
      {
        kind: 'seealso',
        items: ['Start here: how this all works', 'Change the words on a page'],
      },
    ],
  },

  {
    slug: 'the-not-confirmed-marker',
    category: 'Start here',
    title: 'The "Not confirmed" marker',
    icon: 'check',
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
    icon: 'calendar',
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
          'Set `Race day` to the new date and start time.',
          'Put the edition number up by one in `Which edition is this?`. 2026 is the 23rd running, so 2027 is the 24th.',
          'Publish.',
        ],
      },
      { kind: 'shot', key: 'race-date-field' },
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
    icon: 'clock',
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
    icon: 'tag',
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
      { kind: 'shot', key: 'distance-fees' },
      { kind: 'h', text: 'When a price goes up' },
      {
        kind: 'p',
        text: 'Nothing to do on the day. The ticket prints the whole ladder, every step with its dates, so runners can see the next price coming. Set the steps once, when registration opens, and change RunSignUp to match.',
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
    icon: 'heart',
    lead: 'The row of patches near the bottom of the home page.',
    diy: 'self',
    video: 'add-a-sponsor',
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
      { kind: 'shot', key: 'sponsors-list' },
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
    icon: 'list',
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
    icon: 'edit',
    lead: 'Change it in one place and every year they ran changes with it.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['Results and records', 'Runners'],
        link: { pane: 'results-and-records;athlete' },
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
    icon: 'user',
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
    icon: 'document',
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
          'Click `Live preview` in the bar at the top of the Studio.',
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
        text: 'What you see in Live preview is your unpublished draft, not the live site. That is the point: you can see the change before anyone else does.',
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
    icon: 'image',
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
    icon: 'calendar',
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
        title: 'One thing is still missing from the archive.',
        text: 'The 27K before 2015 was timed by a company that no longer exists, and no copy has turned up. If one ever does, on a hard drive or in an old email, it can go straight in. (2020 and the 2021 27K were found on RunSignUp in September 2026, in a corner its data feed does not reach, and are in.) The website says what is missing on the results page rather than pretending those years did not happen.',
      },
    ],
  },
];

// ── The Studio kit's own guides (PORTS.md cards 110, 111, 115, 117) ─────────
// Appended rather than written into the list above: they describe the Studio's
// helpers (Home, the status line, the help panel, Quick update, preview links,
// Messages), not the race. Words from the starter, in this race's terms.
guides.push(
  {
    slug: 'home-page',
    category: 'Start here',
    title: 'What the Home page shows you',
    icon: 'home',
    lead: 'Home opens first every time. Here is what each card is for, top to bottom.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Home is a dashboard: it changes nothing by itself. Every card points somewhere, and the buttons take you straight there.',
      },
      {
        kind: 'bullets',
        items: [
          '**The big buttons**: the jobs that come round every year. The race date, the entry fees, a race notice, and the once-a-year list.',
          '**Race checklist**: the things that should be true whenever a runner looks. Most tick themselves when the website can see they are done; the RunSignUp one you tick yourself, because the website cannot see inside RunSignUp. Ticks start fresh every Monday.',
          '**Coming up**: pages set to publish by themselves, soonest first, with the time in plain words.',
          '**Fix-it list**: the things the Checkup found, by name, like a schedule line still marked "Not confirmed" or a picture with no description. `Edit` opens it at the right spot. `See the whole list` opens the Checkup.',
          '**Visitors**: how many people visited in the last 7 days against the week before, a small chart of the last four weeks, the most-read pages and how people found the website.',
          '**Your pages**: every page and list you can change, in groups, one click each. Pages you build yourself are added to it automatically.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Visitors says "not set up yet"?',
        text:
          'The numbers come from Cloudflare, which counts visits without cookies. ' +
          SITE.contactName +
          ' switches it on once, and after that it fills in by itself.',
      },
      { kind: 'seealso', items: ['The line under the top bar', 'Start here: how this all works'] },
    ],
  },
  {
    slug: 'website-status',
    category: 'Start here',
    title: 'The line under the top bar',
    icon: 'activity',
    lead: 'A quiet answer to "is my change on the website yet?", wherever you are in the Studio.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Under the top bar there is a thin line that says how the website is doing. It reads the same thing as the **Is it live?** card on Home, so the two always agree.',
      },
      {
        kind: 'bullets',
        items: [
          '**Website up to date**: everything you have published is on the website.',
          '**Updating the website, about 3 minutes**: you published something and the website is rebuilding. The minutes count down. You do not need to wait for it.',
          '**The website update is taking longer than usual**: it has been a while. Nothing is lost, your change is safe and published. Click `Details`, and if it still says this an hour later, ask ' +
            SITE.contactName +
            '.',
          "**The last update didn't go through**, in red: the website tried to update and something stopped it, so it is still showing the older version. " +
            SITE.contactName +
            ' gets an email about it straight away. Your published changes are safe. Press `Try again` once; if it comes back red, leave it with ' +
            SITE.contactName +
            '.',
        ],
      },
      { kind: 'seealso', items: ['Start here: how this all works'] },
    ],
  },
  {
    slug: 'help-panel',
    category: 'Start here',
    title: 'Help for this page',
    icon: 'bulb',
    lead: 'Help beside whatever you are editing, without leaving it.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'When something is open for editing, click `Help for this page` at the top of it (it can also sit in the menu with three dots). A panel opens beside the boxes you are typing in.',
      },
      {
        kind: 'bullets',
        items: [
          '**Worth a look** lists photos with no description, empty sections and links that go nowhere, and anything the Checkup found on this page. It updates as you type. None of it stops you publishing.',
          '**How to** shows the Site Guide steps for this kind of page, so you can follow them while you work.',
        ],
      },
      { kind: 'seealso', items: ['Change the words on a page'] },
    ],
  },
  {
    slug: 'quick-update',
    category: 'Start here',
    title: 'Race week from your phone',
    icon: 'bolt',
    lead: 'The jobs of the race year, each a few taps on a phone.',
    diy: 'self',
    video: 'race-week-notice',
    body: [
      {
        kind: 'p',
        text: 'Open the Studio on your phone, tap the menu at the top and choose `Quick update` (on Home it is also a button). The tiles follow the race year: each job only shows in its own season, so the screen stays short. Race week shows:',
      },
      {
        kind: 'bullets',
        items: [
          '**Put up a race-week notice**: parking, bib pickup, the weather, a course change. A short line across the top of every page, until the last day you pick.',
          '**Urgent: a change on race day**: the same line in red, for a delayed start or a closed trail. It comes down by itself two days later.',
          '**Change the start time or parking**: changes what is already on the race page, so the boxes start with today’s words. Fix the one that moved and save.',
          '**Read your messages**: opens what runners sent through the contact form.',
        ],
      },
      {
        kind: 'p',
        text: 'The rest of the year the other jobs take their turn: **Registration is open** (winter and spring; the words are written for you and it links to the Register page you set), **Ask for volunteers** (late summer to race week), and after the race **Tell runners the results are in**, **Mark a trekker** (pick the early starter who finished near the front and tick the box) and **Look at the results**. **Add a sponsor** is there all year: their name and website now, the logo later in the full editor.',
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'A job you cannot see is out of season.',
        text: 'Every one of them can still be done in `Content`; the guide for each job says where. Quick update just keeps the screen to what matters this month.',
      },
      { kind: 'shot', key: 'quick-update-tiles' },
      {
        kind: 'p',
        text: 'Fill in the boxes and press the button. It is published straight away and the website updates in a few minutes. To change or switch off a notice later, open `Race notices` in `Content`.',
      },
      { kind: 'shot', key: 'quick-update-form' },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'It comes down at the next update.',
        text: 'The website is rebuilt when something is published, so a notice disappears at the first update after its last day, not on the stroke of midnight. If it matters that it goes at once, switch it off under Race notices and publish.',
      },
    ],
  },
  {
    slug: 'undo-earlier',
    category: 'Start here',
    title: 'Undo a change from earlier in the week',
    icon: 'restore',
    lead: 'Put a page back the way it was on a day you remember.',
    diy: 'ask',
    body: [
      {
        kind: 'p',
        text: 'For something you changed in the last few minutes, use Undo at the top of the page, or `Discard changes` if you have not published yet.',
      },
      {
        kind: 'p',
        text:
          'For anything older, the website is copied every night, and ' +
          SITE.contactName +
          ' can take one page or list entry out of a copy and put it back for you.',
      },
      {
        kind: 'steps',
        items: [
          'Tell ' +
            SITE.contactName +
            ' which page or entry it is (its name as you see it in the Studio, like "The Course" or "Race-day schedule: Awards"), and roughly which day it was still right.',
          'He puts that copy back as an unpublished change. Nothing on the website moves yet.',
          'Open it, check it reads the way you remember, and press `Publish`. If it is not what you wanted, press `Discard changes` and nothing has happened.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Ask within two weeks if you can.',
        text: 'The nightly copies are kept for fourteen days, and a weekly copy for longer, so the sooner you ask, the more there is to choose from.',
      },
    ],
  },
  {
    slug: 'share-a-preview',
    category: 'Words and pictures',
    title: 'Show someone a page before it goes live',
    icon: 'arrow',
    lead: 'A private link to your draft that works for a few days, no login needed.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Sometimes you want a second pair of eyes on a page before you publish it: a sponsor checking their thank-you, a volunteer checking the course notes. **Share a preview** makes a private link that shows your unpublished changes to that one page. The person opening it does not need a Studio login.',
      },
      {
        kind: 'steps',
        items: [
          'Open the page you are working on.',
          'Open the menu next to `Publish` and choose `Share a preview`.',
          'Pick how long the link should work: 1, 3, 7 or 14 days.',
          'Click `Make the link`, then `Copy`, and paste it into an email or a message.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The link is shown once.',
        text: 'Copy it straight away. If you lose it, make a new one; the old one keeps working until its date unless you stop it.',
      },
      { kind: 'h', text: 'Stop a link early' },
      {
        kind: 'p',
        text: 'Open `Share a preview` on the same page. Under **Links for this page that still work**, click `Stop this link`. Anyone who opens it after that sees the published page instead.',
      },
      { kind: 'seealso', items: ['Change the words on a page'] },
    ],
  },
  {
    slug: 'messages',
    category: 'Start here',
    title: 'Read messages from the website',
    icon: 'envelope',
    lead: 'Everything runners send through the contact form, in one list.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Click `Messages` in the top bar. Every message from the contact form lands here as well as in the race inbox, newest first. Click a name to read it.',
      },
      {
        kind: 'bullets',
        items: [
          '**New**: nobody has dealt with it yet.',
          '**Needs a person**: someone has to answer it. A message whose email did not go out starts here, because nobody has seen it anywhere else.',
          '**Replied**: answered. Mark it so nobody answers twice.',
          '**Spam**: junk. Leave it there.',
        ],
      },
      {
        kind: 'p',
        text: 'If the page says **Forms are not set up yet**, ask ' + SITE.contactName + '.',
      },
    ],
  },
);

/**
 * Which guides "Help for this page" shows for each document type (kit.config.ts
 * guide.forType, PORTS.md card 110). '*' is the fallback for anything unlisted.
 */
export const GUIDES_FOR_TYPE: Record<string, string[]> = {
  '*': ['edit-a-page', 'help-panel', 'undo-earlier'],
  homePage: ['edit-a-page', 'change-a-photo', 'share-a-preview'],
  page: ['edit-a-page', 'change-a-photo', 'share-a-preview'],
  race: ['change-the-race-date', 'the-not-confirmed-marker', 'yearly-checklist'],
  distance: ['entry-fees', 'the-not-confirmed-marker'],
  scheduleItem: ['race-day-schedule', 'the-not-confirmed-marker'],
  courseFeature: ['the-not-confirmed-marker', 'edit-a-page'],
  sponsor: ['sponsors'],
  announcement: ['quick-update', 'undo-earlier'],
  raceResult: ['results-after-race-day', 'fix-a-runners-name'],
  athlete: ['fix-a-runners-name', 'a-runner-asks-to-be-removed'],
  recordEntry: ['results-after-race-day'],
  siteSettings: ['website-status', 'edit-a-page'],
};

// ── Building pages yourself (the authoring kit, PORTS.md card 109) ─────────
guides.push(
  {
    slug: 'page-templates',
    category: 'Words and pictures',
    title: 'Start a page from a template',
    icon: 'blocks',
    lead: 'A new page can start with its sections already in place.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['Pages', 'Pages (course, records, contact)'],
        link: { pane: 'pages;page' },
      },
      {
        kind: 'p',
        text: 'Press `+` on the pages list and the Studio asks where to start. A **template** is a page already laid out for one of the race year’s jobs, with example text in every box, so you are filling in rather than starting from nothing.',
      },
      {
        kind: 'bullets',
        items: [
          '`Race week: what to know`: bib pickup, parking, the schedule and the weather.',
          '`Volunteer call`: what volunteers do, a photo and the sign-up button.',
          '`Course notes and aid stations`: the course, the aid stations and the cutoffs.',
          '`Race recap and photos`: the day in numbers, a big photo, a gallery and the results.',
          '`Sponsor thank-you`: a thank-you and every sponsor’s logo.',
          '`Save the date`: next year’s date, the two tickets and the register button.',
          '`Simple page` and `Blank page`: a heading and text, or nothing at all.',
        ],
      },
      {
        kind: 'p',
        text: 'The schedule, the tickets, the sponsors and the weather fill themselves from This year’s race, so they show the real times and prices straight away.',
      },
      { kind: 'h', text: 'Replace every line that starts "Example:"' },
      {
        kind: 'p',
        text: 'Every piece of example text starts with the word **Example:**, so it is easy to spot. Type over it with your own words. Any section that still has some shows a small yellow warning beside it, so nothing example-shaped goes live by accident.',
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Give the page a place in the menu.',
        text: 'A new page is on the website once it is published, but nobody finds it until it is linked: add it to the menu in Site setup, or point a button on the home page at it.',
      },
      { kind: 'seealso', items: ['Reuse a section on other pages', 'Change the words on a page'] },
    ],
  },
  {
    slug: 'reuse-sections',
    category: 'Words and pictures',
    title: 'Reuse a section on other pages',
    icon: 'copy',
    lead: 'Drop a ready-made section onto any page: Registration is open, Race week, The results are up.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'A **saved section** is a section (or a few that belong together) kept so you can add it again. They live under `Pages`, then `Saved sections`. There is one for each moment in the race year, ready to fill in: registration opening, the price going up, the race being full, volunteers wanted, race week, the weather, a course change, the results, new records, the photos, the sponsors and next year’s date.',
      },
      { kind: 'h', text: 'Add one to a page' },
      {
        kind: 'steps',
        items: [
          'Open the page (the home page, usually) and scroll to its sections.',
          'Click `Insert a saved section` under the list.',
          'Pick one and click `Add a copy`. It goes at the bottom of the page; drag it where you want it.',
          'Replace the "Example:" lines and publish.',
        ],
      },
      { kind: 'h', text: 'Save one of your own' },
      {
        kind: 'steps',
        items: [
          'Open the page that has the section you like.',
          'Open the menu next to `Publish` and choose `Save a section as preset...`.',
          'Pick the section, give it a name you will recognise, and save.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'A copy is yours to change.',
        text: 'Changing a copied section on one page never changes the saved section or any other page. If you want one section that stays the same everywhere, use a synced section instead.',
      },
      {
        kind: 'p',
        text: '_The `+ Add item` menu opens on pictures of every kind of section. Type in its search box to find one by name, or switch it to a plain list with the buttons at the top._',
      },
      { kind: 'seealso', items: ['Keep a section the same on every page'] },
    ],
  },
  {
    slug: 'synced-sections',
    category: 'Words and pictures',
    title: 'Keep a section the same on every page',
    icon: 'sync',
    lead: 'Edit it once and every page that uses it changes.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'A **synced section** shows a saved section, live. It holds no words of its own: the words live in the saved section. Change the saved section, publish it, and every page using it changes together. Good for a band that must say the same thing everywhere, like "Registration is open" on the home page and the course page at once.',
      },
      { kind: 'h', text: 'Add one' },
      {
        kind: 'steps',
        items: [
          'Fill in the saved section and publish it first: a synced section only shows a published one.',
          'Open a page and click `Insert a saved section` under its sections.',
          'Pick the saved section and click `Add synced`.',
          'In the sections list it shows as **Synced:** and the saved section name.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'Changing it changes it everywhere.',
        text: 'That is the point, but check which pages use it before you rewrite it. If one page needs different words, remove the synced section from that page and add a copy instead.',
      },
      { kind: 'seealso', items: ['Reuse a section on other pages'] },
    ],
  },
);

GUIDES_FOR_TYPE.page = [
  'edit-a-page',
  'page-templates',
  'reuse-sections',
  'synced-sections',
  'share-a-preview',
];
GUIDES_FOR_TYPE.homePage = ['edit-a-page', 'reuse-sections', 'synced-sections', 'change-a-photo'];
GUIDES_FOR_TYPE.sectionPreset = ['reuse-sections', 'synced-sections'];

/**
 * The quiet "How to" chip after a field's description (kit.config.ts
 * guide.forField, PORTS.md card 134). Empty for now: a field gets its chip by
 * name (`fields`) or by schema type (`types`) once a guide section explains it.
 * src/lib/studio-guides.test.ts checks every link names a real guide and heading.
 */
export const GUIDE_FOR_FIELD: FieldGuideMap = {
  fields: {
    raceDate: { guide: 'change-the-race-date', section: 'What to change' },
    editionNumber: { guide: 'change-the-race-date', section: 'What to change' },
    registerUrl: { guide: 'registration-opens', section: 'The Register link' },
    feeTiers: { guide: 'entry-fees', section: 'The prices' },
    entryCap: { guide: 'entry-fees', section: 'The entry caps' },
    confirmed: { guide: 'the-not-confirmed-marker', section: 'How to clear it' },
    trekker: { guide: 'mark-a-trekker' },
    startDate: { guide: 'race-notices', section: 'Showing it later' },
    endDate: { guide: 'race-notices', section: 'When it comes down' },
    alt: { guide: 'change-a-photo', section: 'What alt text is' },
  },
  types: {},
};

// ── The race calendar, job by job (studio-complete, 2026-10-19) ─────────────
// One guide for every job in docs/agent/studio-plan.md that had none: the day
// registration opens, the volunteer call, race week, the notices themselves,
// trekkers, and what the quiet months ask of you. `shot` blocks name a capture
// in ./shots.ts; a key with no capture yet draws the wireframe.
guides.push(
  {
    slug: 'registration-opens',
    category: 'The race itself',
    title: 'The day registration opens',
    icon: 'service',
    lead: 'Four things, about ten minutes, and the website is ready for sign-ups.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Open registration on RunSignUp first. Then make the website say the same thing, in this order.',
      },
      { kind: 'h', text: 'The Register link' },
      {
        kind: 'path',
        items: ['This year’s race', 'Race day', 'Links'],
        link: { doc: 'race', field: 'registerUrl' },
      },
      {
        kind: 'steps',
        items: [
          'Paste the RunSignUp sign-up page into `Register (RunSignUp)`. Every Register button on the website reads this one address.',
          'Check `Race day` and `Which edition is this?` are next year’s.',
          'Publish.',
        ],
      },
      { kind: 'shot', key: 'race-links' },
      { kind: 'h', text: 'The prices and the caps' },
      {
        kind: 'p',
        text: 'Open **Distances** and check the 50K and the 27K: the price ladder in `Entry fee tiers` and the `Entry cap`. They should match RunSignUp to the dollar.',
      },
      { kind: 'h', text: 'Tell people' },
      {
        kind: 'steps',
        items: [
          'Open `Quick update` (on your phone is fine) and press `Registration is open`.',
          'The words are already written. Change them if you like, pick the last day to show it, and leave the link empty: it uses the Register link you just saved.',
          'Press the button. The notice is across the top of every page in a few minutes.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'The Home checklist keeps score.',
        text: 'The race checklist on Home ticks **The Register link is on the website** and **The next race date is on the website** by itself once they are done. The RunSignUp line you tick by hand after you have compared the two.',
      },
      {
        kind: 'seealso',
        items: ['Change the entry fees or the entry cap', 'Change the race date for next year'],
      },
    ],
  },
  {
    slug: 'ask-for-volunteers',
    category: 'The race itself',
    title: 'Ask for volunteers',
    icon: 'people',
    lead: 'A line on every page for a few weeks, and a page of its own if you want one.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'The quick way: a notice' },
      {
        kind: 'steps',
        items: [
          'Open `Quick update` and press `Ask for volunteers`.',
          'The words are written for you. Paste the volunteer sign-up page (RunSignUp has one) into `Volunteer sign-up link`.',
          'Pick the last day to show it. Three weeks is the starting choice.',
          'Press the button.',
        ],
      },
      { kind: 'h', text: 'The fuller way: a volunteer page' },
      {
        kind: 'steps',
        items: [
          'In `Content`, open `Pages`, then `Pages (course, records, contact)`, and press `+`.',
          'Choose the **Volunteer call** template. It has the words, a place for a photo and the sign-up button.',
          'Replace every line that starts "Example:", put your sign-up link on the button, and publish.',
          'Point the notice at the new page: its address is the page name, like `/volunteers/`.',
        ],
      },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'Only one notice shows at a time.',
        text: 'If a race-week notice is also up, the one that ends sooner shows first, and a red one beats both. The volunteer call comes back when the shorter one ends.',
      },
      {
        kind: 'seealso',
        items: ['Start a page from a template', 'Change or switch off a race notice'],
      },
    ],
  },
  {
    slug: 'race-week',
    category: 'The race itself',
    title: 'Race week, day by day',
    icon: 'times',
    lead: 'What runners ask that week, and the button that answers each one.',
    diy: 'self',
    video: 'race-week-notice',
    body: [
      {
        kind: 'p',
        text: 'Race week is when the website earns its keep. Everything here can be done from your phone with `Quick update`, and each change is on the website in a few minutes.',
      },
      { kind: 'h', text: 'A week out' },
      {
        kind: 'bullets',
        items: [
          'Put up a **race-week notice** with the thing people ask most: bib pickup, or parking at The Oval.',
          'Open **Race-day schedule** and check every time. Tick `Confirmed by the race director` on each one you know is right.',
          'Look at Home. The race checklist shows **Race week: a notice is up** until there is one.',
        ],
      },
      { kind: 'h', text: 'The day before' },
      {
        kind: 'bullets',
        items: [
          'Change the notice if anything has moved: put up a new one, and it takes over because it ends sooner.',
          'Glance at `Messages` for questions that came through the contact form.',
        ],
      },
      { kind: 'h', text: 'Race morning' },
      {
        kind: 'bullets',
        items: [
          'Something changed? `Quick update`, then `Urgent: a change on race day`. One box, a red line on every page, and it takes itself down two days later.',
          'The start time or the parking moved? `Quick update`, then `Change the start time or parking`. It changes the race page itself, so the countdown and the date Google shows follow.',
        ],
      },
      { kind: 'video', key: 'race-day-change' },
      { kind: 'shot', key: 'quick-update-form' },
      { kind: 'h', text: 'The week after' },
      {
        kind: 'bullets',
        items: [
          'The results import themselves overnight from RunSignUp. Once you can see this year under **Results by year**, press `Tell runners the results are in`.',
          '`Quick update`, then `Mark a trekker`, for any early starter who finished near the front. Pick them from the list and tick the box.',
          'Switch off anything left over under **Race notices**.',
        ],
      },
      {
        kind: 'callout',
        tone: 'caution',
        title: 'A few minutes, not a few seconds.',
        text: 'The website rebuilds itself after each publish. The line under the top bar says when your change is live, so there is no need to keep refreshing the website.',
      },
      { kind: 'seealso', items: ['Race week from your phone', 'Mark a trekker'] },
    ],
  },
  {
    slug: 'race-notices',
    category: 'The race itself',
    title: 'Change or switch off a race notice',
    icon: 'notice',
    lead: 'The line across the top of every page, and how it decides when to show.',
    diy: 'self',
    body: [
      {
        kind: 'path',
        items: ['Content', 'Race notices'],
        link: { pane: 'announcement' },
      },
      {
        kind: 'steps',
        items: [
          'Open `Race notices` and click the notice.',
          'Change the words, or switch `Enabled` off to take it down.',
          'Publish.',
        ],
      },
      { kind: 'shot', key: 'notices-list' },
      { kind: 'h', text: 'Only one shows at a time' },
      {
        kind: 'p',
        text: 'If several notices are switched on, the website shows the red (urgent) one first, then a highlighted one, then whichever ends soonest. That is why a short race-week notice can sit on top of a month-long registration notice, and the longer one comes back afterwards.',
      },
      { kind: 'h', text: 'When it comes down' },
      {
        kind: 'p',
        text: 'The website is rebuilt when something is published, not every minute. A notice whose `Hide after` time has passed disappears at the next rebuild. If it must go now, switch `Enabled` off and publish: that is a rebuild.',
      },
      { kind: 'h', text: 'Showing it later' },
      {
        kind: 'p',
        text: '`Show from` holds a notice back until a time you choose, but it only appears at the first rebuild after that time. For the day registration opens, it is simpler to put the notice up that morning with `Quick update`.',
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Old notices can stay in the list.',
        text: 'A notice that has ended is harmless. The race checklist on Home only asks you to switch off one that is still on after its last day. Move the rest to the Trash whenever the list gets long.',
      },
    ],
  },
  {
    slug: 'mark-a-trekker',
    category: 'Results and records',
    title: 'Mark a trekker',
    icon: 'value',
    lead: 'An early starter keeps their time, and stays out of the records.',
    diy: 'self',
    body: [
      {
        kind: 'p',
        text: 'Trekkers take the optional early start, so they are not eligible for awards. RunSignUp does not tell the website who they were, so after each race the website needs telling, once, for anyone who finished near the front.',
      },
      {
        kind: 'path',
        items: ['Content', 'Results and records', 'Results', 'Results by year'],
        link: { pane: 'results-and-records;results' },
      },
      {
        kind: 'steps',
        items: [
          'Open the year, then the distance. Results are listed fastest first.',
          'Click the runner’s result.',
          'Switch on `Ran as a trekker`.',
          'Publish. The records, the top tens and the age groups recalculate at the next rebuild.',
        ],
      },
      { kind: 'shot', key: 'trekker-tick' },
      {
        kind: 'callout',
        tone: 'primary',
        title: 'The overnight import leaves your tick alone.',
        text: 'Results come in from RunSignUp every night after the race, but a tick you have made is kept.',
      },
      { kind: 'seealso', items: ['What happens after race day'] },
    ],
  },
  {
    slug: 'quiet-months',
    category: 'Once a year',
    title: 'The quiet months',
    icon: 'event',
    lead: 'From December to registration day the website mostly looks after itself.',
    diy: 'self',
    body: [
      { kind: 'h', text: 'Once a week, if you like' },
      {
        kind: 'bullets',
        items: [
          'Open the Studio and look at Home. If the race checklist is all ticked, there is nothing to do.',
          'Read anything new in `Messages` and mark it **Replied** once you have answered.',
        ],
      },
      { kind: 'shot', key: 'home-checklist' },
      { kind: 'h', text: 'Once in the winter' },
      {
        kind: 'bullets',
        items: [
          'Run **Start a new race year** under This year’s race. It lists what changes for the next running, with what is already done ticked off.',
          'Swap in a photograph or two from the last race.',
          'Thank the sponsors: add any new ones with `Quick update`, `Add a sponsor`, and the logo afterwards in the full editor.',
        ],
      },
      {
        kind: 'callout',
        tone: 'positive',
        title: 'Results keep checking themselves.',
        text: 'The import runs every Monday all year, in case RunSignUp posts a late correction. You will see it on Home as an update you did not make, and that is normal.',
      },
      { kind: 'seealso', items: ['The once-a-year list', 'Read messages from the website'] },
    ],
  },
);

GUIDES_FOR_TYPE.race = [
  'change-the-race-date',
  'registration-opens',
  'the-not-confirmed-marker',
  'yearly-checklist',
];
GUIDES_FOR_TYPE.announcement = ['race-notices', 'quick-update', 'race-week'];
GUIDES_FOR_TYPE.raceResult = ['mark-a-trekker', 'results-after-race-day', 'fix-a-runners-name'];
GUIDES_FOR_TYPE.scheduleItem = ['race-day-schedule', 'race-week', 'the-not-confirmed-marker'];
GUIDES_FOR_TYPE.sponsor = ['sponsors', 'quiet-months'];
