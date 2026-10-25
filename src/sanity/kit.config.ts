// Safe to edit by hand
// =============================================================================
// The Studio kit's settings for the Stone Steps 50K (PORTS.md card 106)
// =============================================================================
// The ONE site-specific file for the kit in src/sanity/kit/ (which is PORTABLE
// and names no site). Everything the race director reads in Home, the Checkup
// and the tour that is about THIS race lives here. Detail:
// docs/agent/studio-kit.md.
//
// Who it is for: one race director who edits the site a few times a year, most
// of it in the weeks around race day, sometimes from a phone at The Oval. So
// Home leads with the race calendar (registration, race week, results), Quick
// update holds the year's phone jobs (notices for race week, registration,
// volunteers and results, a new sponsor; docs/agent/studio-plan.md), and the Checkup's race rules
// (src/sanity/raceCheckup.ts) are the ones that stop a stale date or a wrong
// record going out.
//
// Moved onto the kit on 2026-10-18: the old Welcome pane (now Home), the old
// Checkup pane (its race checks are raceCheckup.ts), the old tour (tourSteps
// below) and the Help & Guide desk list (now the Site Guide tool).
//
// The repo is public: no email addresses or other private contacts here. The
// help address comes from PUBLIC_STUDIO_HELP_EMAIL at build time (unset means
// the Ask card shows its words without an email button).
// =============================================================================

import type { KitConfig } from './kit/types';
import { genericRules } from '../lib/studio-checkup';
import { guides, GUIDE_CATEGORIES, GUIDE_FOR_FIELD, GUIDES_FOR_TYPE } from './guides/content';
import { makeGuideView } from './components/GuideView';
import { envVal } from './urls';
import { TOURS, WELCOME, WHATS_NEW } from './studio-tours';
import type { PageRules } from '../lib/page-guardrails';
import { BellIcon } from '@sanity/icons/Bell';
import { CalendarIcon } from '@sanity/icons/Calendar';
import { TagIcon } from '@sanity/icons/Tag';
import { WarningOutlineIcon } from '@sanity/icons/WarningOutline';
import { runPageCheck } from './actions/checkPage';
import { PAGE_BUILDER_TYPES } from './pageBuilderConfig';
import { raceRules } from './raceCheckup';
import { HeartIcon } from '@sanity/icons/Heart';
import { StarIcon } from '@sanity/icons/Star';
import { UsersIcon } from '@sanity/icons/Users';
import { EnterIcon } from '@sanity/icons/Enter';
import {
  buildLinkedNotice,
  buildNotice,
  buildSponsor,
  inDays,
  NOTICE_STARTERS,
  RESULTS_PATH,
} from '../lib/quick-updates';

const PUBLISHED = '!(_id in path("drafts.**"))';

/**
 * The race year's seasons for Quick update's `when` (card 137; 'MM-DD', every
 * year). The race is always in the last third of October, so these are wide
 * enough to catch it whichever Sunday it lands on. A job outside its season
 * is not gone: the same change is a few taps further in under Content, and
 * the Site Guide says where.
 */
const RACE_WEEK = { from: '10-14', to: '10-31' };
const AFTER_RACE = { from: '10-24', to: '12-15' };
const BUILD_UP = { from: '08-15', to: '10-31' };
// Registration opens in the new year; the window wraps the New Year.
const REGISTRATION = { from: '12-01', to: '07-31' };

/**
 * Page types with a Google description (seoDescription). Only the pages this
 * site serves: Home and the custom pages (Course, Records, Contact and any page
 * built later). The starter's About, Services and the rest have no route here.
 */
const SEO_TYPES = ['homePage', 'page'];

export const kitConfig: KitConfig = {
  siteName: 'the race website',

  helper: {
    name: 'Nathan',
    email: envVal('PUBLIC_STUDIO_HELP_EMAIL'),
  },

  // Sanity user ids of the people who get the staff view (sanity.io/manage,
  // Members). Ids, not emails: the repo is public. Add the race director's id
  // once he has accepted the invitation. Until the list has an entry, anyone
  // who is not a Sanity administrator gets the staff view.
  staff: [],

  staffTools: [
    'home',
    'quick-update',
    'structure',
    'presentation',
    'messages',
    'site-guide',
    'checkup',
  ],
  toolOrder: [
    'home',
    'quick-update',
    'structure',
    'presentation',
    'messages',
    'site-guide',
    'checkup',
    'media',
  ],
  toolTitles: { structure: 'Content', presentation: 'Live preview' },

  // Desk items only a developer needs (ids from src/sanity/structure.ts). The
  // race days list is the weather strip's raw dates, written by a script. The
  // records the results cannot prove are empty on purpose: every record on the
  // site comes from a finish on file (PENDING 1j), so typing one in is not a
  // job for the Studio.
  staffHiddenPanes: ['race-days', 'record-entries'],

  // Everyday lists whose Delete becomes "Move to Trash". Not distances, results
  // or runners: results point at those, and results and runners are written by
  // the nightly import, so a deleted one would come straight back.
  trashTypes: {
    announcement: 'Race notice',
    sponsor: 'Sponsor',
    scheduleItem: 'Schedule line',
    courseFeature: 'Course feature',
  },

  weekStartsOn: 1,
  // The race checklist (card 111). It is on Home all year, so every job is one
  // that is true or false whatever the month: the date is next year's, the
  // prices are current, nothing is unconfirmed, the results from the last race
  // are in. The RunSignUp job is ticked by hand, because the website cannot see
  // inside RunSignUp. Hand ticks start fresh every Monday.
  thisWeekTitle: 'Race checklist',
  thisWeek: [
    {
      id: 'race-date',
      title: 'The next race date is on the website',
      detail: 'The countdown, the footer and Google all read this one date.',
      query: `count(*[_type == "race" && ${PUBLISHED} && dateTime(raceDate) > dateTime($now)])`,
      target: { doc: 'race', field: 'raceDate' },
      targetLabel: 'Set the date',
    },
    {
      id: 'confirmed',
      title: 'Every race detail is confirmed',
      detail: 'Nothing on the schedule, the distances or the course still says "Not confirmed".',
      query: `count(*[_type in ["race", "scheduleItem", "courseFeature", "distance"] && ${PUBLISHED} && confirmed != true]) == 0`,
      target: { pane: 'this-years-race' },
      targetLabel: "Open this year's race",
    },
    {
      id: 'notices',
      title: 'Old race notices are switched off',
      detail: 'A notice whose last day has gone should not still be switched on.',
      query: `count(*[_type == "announcement" && ${PUBLISHED} && enabled == true && defined(endDate) && endDate < $now]) == 0`,
      target: { pane: 'announcement' },
      targetLabel: 'Open the notices',
    },
    // Season-aware jobs (studio-complete, 2026-10-19). Each one counts as done
    // outside its own season, so the off-season list stays short and race
    // week and the weeks after it bring their own jobs up by themselves.
    {
      id: 'register-link',
      title: 'The Register link is on the website',
      detail: 'Every Register button reads this one address. Paste the RunSignUp sign-up page in.',
      query: `defined(*[_type == "race" && ${PUBLISHED}][0].registerUrl)`,
      target: { doc: 'race', field: 'registerUrl' },
      targetLabel: 'Set the link',
    },
    {
      id: 'race-week-notice',
      title: 'Race week: a notice is up',
      detail:
        'Only counts in the ten days before the race. Parking, bib pickup and the weather are what runners ask.',
      query: `count(*[_type == "race" && ${PUBLISHED} && dateTime(raceDate) > dateTime($now) && dateTime(raceDate) < dateTime($now) + 60*60*24*10]) == 0 || count(*[_type == "announcement" && ${PUBLISHED} && enabled == true && (!defined(endDate) || endDate >= $now)]) > 0`,
      target: { tool: 'quick-update' },
      targetLabel: 'Put one up',
    },
    {
      id: 'results-in',
      title: 'After the race: the results are in',
      detail:
        'Only counts in the month after the race. They import themselves overnight from RunSignUp; ask if a week goes by with nothing.',
      query: `count(*[_type == "race" && ${PUBLISHED} && dateTime(raceDate) < dateTime($now) && dateTime(raceDate) > dateTime($now) - 60*60*24*30 && count(*[_type == "raceResult" && _createdAt > ^.raceDate]) == 0]) == 0`,
      target: { pane: 'results-and-records;results' },
      targetLabel: 'See the results',
    },
    {
      id: 'runsignup',
      title: 'RunSignUp matches the website',
      detail:
        'The prices, the entry caps and the start times on RunSignUp say the same as the website. Tick this once you have looked.',
      manual: true,
    },
    {
      id: 'checkup',
      title: 'Checkup is clear',
      detail: 'Nothing in the Checkup marked "Needs doing".',
      check: 'checkup',
      target: { tool: 'checkup' },
      targetLabel: 'Open the Checkup',
    },
  ],

  // Quick update (card 111): race-week jobs small enough for a phone. Each
  // form publishes straight away, so the builders in src/lib/quick-updates.ts
  // return whole, valid notices (tested in quick-updates.test.ts).
  quickUpdate: [
    {
      id: 'race-week',
      when: RACE_WEEK,
      title: 'Put up a race-week notice',
      // Card 131: the tile wears the race's megaphone plate (brandIconArt.tsx).
      meaning: 'notice',
      detail:
        'Parking, bib pickup, the weather, a course change. A line across the top of every page.',
      icon: BellIcon,
      fields: [
        {
          name: 'message',
          title: 'The notice',
          kind: 'text',
          required: true,
          max: 160,
          description:
            'One or two short sentences, like "Bib pickup moves to the Oval shelter, 6:00 to 6:45 AM."',
        },
        {
          name: 'lastDay',
          title: 'Last day to show it',
          kind: 'date',
          required: true,
          initial: (now) => inDays(now, 7),
        },
        {
          name: 'link',
          title: 'A link for more',
          kind: 'url',
          description: 'Optional. A full web address starting with https://',
        },
      ],
      build: (v) =>
        buildNotice({ message: v.message, lastDay: v.lastDay, link: v.link || undefined }),
      doneMessage:
        'The notice will be on the website in a few minutes. It comes down at the first website update after the day you picked.',
    },
    {
      id: 'urgent',
      when: RACE_WEEK,
      title: 'Urgent: a change on race day',
      detail: 'A notice in red, for a delayed start, a closed trail or bad weather.',
      icon: WarningOutlineIcon,
      // The race-day stopwatch plate: this one is for the day itself.
      meaning: 'times',
      fields: [
        {
          name: 'message',
          title: 'What has changed',
          kind: 'text',
          required: true,
          max: 160,
          description: 'Like "The 50K start is delayed 30 minutes because of the storm."',
        },
      ],
      build: (v, { now }) => buildNotice({ message: v.message, lastDay: inDays(now, 2) }, 'urgent'),
      doneMessage:
        'The red notice will be on the website in a few minutes. It comes down by itself two days from now. Switch it off sooner under Race notices.',
    },
    // Race morning (card 137 "edit"): change what is already on the race
    // document instead of making a new one. The form starts from what is
    // there, so only the box that changed is touched. The date box moves the
    // countdown, the footer and the date Google shows (one date, read everywhere).
    {
      id: 'race-morning',
      when: RACE_WEEK,
      title: 'Change the start time or parking',
      detail:
        'The race day and start time, the start area and the parking words. Already filled in.',
      icon: CalendarIcon,
      meaning: 'place',
      submitLabel: 'Save the change',
      job: { kind: 'edit', doc: 'race' },
      fields: [
        {
          name: 'raceDate',
          title: 'Race day and start time',
          kind: 'datetime',
          required: true,
          description: 'Local time. Moving it moves the countdown and the date Google shows.',
        },
        {
          name: 'startArea',
          title: 'Start and finish area',
          kind: 'string',
          max: 120,
        },
        {
          name: 'parkingNote',
          title: 'Parking',
          kind: 'text',
          max: 240,
          description: 'One or two sentences. Shown beside the start line and under the schedule.',
        },
      ],
      doneTitle: 'The race page is updated',
      doneMessage:
        'The change will be on the website in a few minutes. If runners need to know right away, put up a race-week notice too.',
    },
    // The rest of the year's phone jobs (docs/agent/studio-plan.md). The words
    // start filled in, so most of these are "check it, press the button". Only
    // one notice shows at a time: these long ones are plain, so a short
    // race-week notice that ends sooner still takes the top of the page.
    {
      id: 'registration-open',
      when: REGISTRATION,
      title: 'Registration is open',
      detail: 'The day sign-ups open: a line on every page with the Register link.',
      icon: EnterIcon,
      // The race ticket plate.
      meaning: 'service',
      fields: [
        {
          name: 'message',
          title: 'The notice',
          kind: 'text',
          required: true,
          max: 160,
          initial: () => NOTICE_STARTERS.registration,
        },
        {
          name: 'lastDay',
          title: 'Last day to show it',
          kind: 'date',
          required: true,
          initial: (now) => inDays(now, 30),
        },
        {
          name: 'link',
          title: 'Sign-up link (optional)',
          kind: 'url',
          description: 'Leave it empty to use the Register link already on the website.',
        },
      ],
      // No link typed: the race's own Register address, so the notice and the
      // Register buttons can never point at two different places.
      build: async (v, { client }) => {
        const saved = v.link
          ? v.link
          : await client.fetch<string | null>(`*[_type == "race" && ${PUBLISHED}][0].registerUrl`);
        return buildLinkedNotice({
          message: v.message,
          lastDay: v.lastDay,
          url: saved || undefined,
          label: 'Register',
        });
      },
      doneMessage:
        'The notice will be on the website in a few minutes, with a Register link. It comes down at the first website update after the day you picked.',
    },
    {
      id: 'volunteers',
      when: BUILD_UP,
      title: 'Ask for volunteers',
      detail: 'Aid stations, the course, bib pickup. A line on every page with the sign-up link.',
      icon: UsersIcon,
      meaning: 'people',
      fields: [
        {
          name: 'message',
          title: 'The notice',
          kind: 'text',
          required: true,
          max: 160,
          initial: () => NOTICE_STARTERS.volunteers,
        },
        {
          name: 'lastDay',
          title: 'Last day to show it',
          kind: 'date',
          required: true,
          initial: (now) => inDays(now, 21),
        },
        {
          name: 'link',
          title: 'Volunteer sign-up link',
          kind: 'url',
          description: 'The RunSignUp volunteer page, or any https:// address. Optional.',
        },
      ],
      build: (v) =>
        buildLinkedNotice({
          message: v.message,
          lastDay: v.lastDay,
          url: v.link || undefined,
          label: 'Volunteer',
        }),
      doneMessage:
        'The volunteer call will be on the website in a few minutes. It comes down at the first website update after the day you picked.',
    },
    {
      id: 'results-in',
      when: AFTER_RACE,
      title: 'Tell runners the results are in',
      detail: 'The results import themselves overnight. This points runners at them.',
      icon: StarIcon,
      meaning: 'value',
      fields: [
        {
          name: 'message',
          title: 'The notice',
          kind: 'text',
          required: true,
          max: 160,
          initial: () => NOTICE_STARTERS.results,
        },
        {
          name: 'lastDay',
          title: 'Last day to show it',
          kind: 'date',
          required: true,
          initial: (now) => inDays(now, 14),
        },
      ],
      build: (v) =>
        buildLinkedNotice({
          message: v.message,
          lastDay: v.lastDay,
          url: RESULTS_PATH,
          label: 'See the results',
        }),
      doneMessage:
        'The notice will be on the website in a few minutes, linking to the results. If this year is not there yet, give the overnight import another night.',
    },
    // The weeks after the race: results come in by themselves; the director
    // only checks them and ticks any early starter (trekker) who finished near
    // the front. Edit-with-pick lists this year's finishers, fastest first.
    {
      id: 'mark-trekker',
      when: AFTER_RACE,
      title: 'Mark a trekker',
      detail:
        'An early starter who finished near the front. Their time stays; the records leave them out.',
      icon: StarIcon,
      meaning: 'value',
      submitLabel: 'Save',
      job: {
        kind: 'edit',
        pick: {
          type: 'raceResult',
          filter: 'year == math::max(*[_type == "raceResult"].year)',
          order: 'place asc',
          titleField: 'athlete->name + ", place " + string(place) + " (" + distance->name + ")"',
          label: 'Which runner?',
        },
      },
      fields: [
        {
          name: 'trekker',
          title: 'Ran as a trekker',
          kind: 'boolean',
          description: 'Tick if they took the optional early start.',
        },
      ],
      doneMessage:
        'Saved. The records recalculate when the website next updates, in a few minutes.',
    },
    {
      id: 'see-results',
      when: AFTER_RACE,
      title: 'Look at the results',
      detail: 'They import themselves overnight from RunSignUp. See what has come in.',
      meaning: 'overview',
      icon: StarIcon,
      job: { kind: 'link', target: { pane: 'results-and-records;results' } },
    },
    {
      id: 'messages',
      title: 'Read your messages',
      detail: 'What runners sent through the contact form.',
      meaning: 'message',
      icon: EnterIcon,
      job: { kind: 'link', target: { tool: 'messages' } },
    },
    {
      id: 'sponsor',
      title: 'Add a sponsor',
      detail: 'Their name and website now. The logo can follow in the full editor.',
      icon: HeartIcon,
      meaning: 'give',
      submitLabel: 'Add the sponsor',
      fields: [
        {
          name: 'name',
          title: 'Sponsor name',
          kind: 'string',
          required: true,
          max: 80,
          description: 'Their real name, as on their sign. A screen reader reads it out.',
        },
        {
          name: 'url',
          title: 'Their website',
          kind: 'url',
          description: 'Optional. A full web address starting with https://',
        },
      ],
      // The end of the drag-to-order list, so a new sponsor never jumps ahead
      // of the ones already thanked.
      build: async (v, { client }) => {
        const last = await client.fetch<string | null>(
          `*[_type == "sponsor" && defined(orderRank)] | order(orderRank desc)[0].orderRank`,
        );
        return buildSponsor({ name: v.name, url: v.url || undefined }, last);
      },
      doneMessage:
        'The sponsor will be on the website in a few minutes, as a name patch at the end of the row. Open it in the full editor to add their logo.',
    },
  ],

  checkup: {
    rules: [
      ...genericRules({
        seoTypes: SEO_TYPES,
        // A sponsor's logo sits beside the sponsor's name, so it needs no words.
        altExemptFields: ['logo', 'favicon', 'icon', 'logoImage', 'seoImage'],
      }),
      // The race's own checks: the date, the prices, "Not confirmed", the
      // results, the trekkers, sponsors' logos, the elevation chart.
      ...raceRules,
    ],
    // Not athletes: results point at them, and the broken-link rule would then
    // flag every result. Race days are the weather script's own bookkeeping.
    ignoreTypes: ['sectionPreset', 'redirect', 'raceDay'],
  },

  // Home's Recent edits and Pick up skip the results the nightly import writes
  // (card 129): dozens of identical rows a night that are not Dave's work. The
  // Checkup still checks them.
  recentIgnoreTypes: ['raceResult'],

  guide: {
    guides,
    categories: GUIDE_CATEGORIES,
    view: makeGuideView,
    // "Help for this page" (card 110): which guides each document type shows.
    forType: GUIDES_FOR_TYPE,
    // The quiet "How to" chip after a field's description (card 134).
    forField: GUIDE_FOR_FIELD,
  },

  // Home's "Your pages" card (card 115): every page and list the race director
  // changes, in the menu's own words, one click each. Course, Records and
  // Contact are custom pages (type 'page', ids from the seed). Results and
  // runners are listed so he can find them, not to type into: the nightly
  // import writes them. Desk ids are load-bearing (structure.ts).
  pages: [
    {
      title: 'The pages',
      links: [
        { title: 'Home', target: { doc: 'homePage' } },
        { title: 'The course', target: { doc: 'page-course', type: 'page' } },
        { title: 'Records', target: { doc: 'page-records', type: 'page' } },
        { title: 'Contact', target: { doc: 'page-contact', type: 'page' } },
      ],
    },
    { title: 'Pages you built', listType: 'page' },
    {
      title: "This year's race",
      links: [
        { title: 'Race day (date, venue, links)', target: { doc: 'race' } },
        {
          title: 'Distances, fees and caps',
          target: { pane: 'this-years-race;orderable-distance' },
        },
        { title: 'Race-day schedule', target: { pane: 'this-years-race;orderable-scheduleItem' } },
        { title: 'Course features', target: { pane: 'this-years-race;orderable-courseFeature' } },
        { title: 'Sponsors', target: { pane: 'this-years-race;orderable-sponsor' } },
        { title: 'Race notices', target: { pane: 'announcement' } },
        { title: 'Start a new race year', target: { pane: 'race-year' } },
      ],
    },
    {
      title: 'Results and records',
      detail: 'They import themselves from RunSignUp. Look here; mark trekkers here.',
      links: [
        { title: 'Results by year', target: { pane: 'results-and-records;results' } },
        { title: 'Runners (fix a name)', target: { pane: 'results-and-records;athlete' } },
      ],
    },
    {
      title: 'Site-wide',
      links: [
        { title: 'Menus', target: { doc: 'siteSettings', field: 'navItems' } },
        { title: 'Footer', target: { doc: 'siteSettings', field: 'footerColumns' } },
        { title: 'Site setup', target: { doc: 'siteSettings' } },
      ],
    },
  ],

  // Home's big buttons (card 110): the race director's most common jobs, in
  // the order the year brings them. Keep it to four.
  quickActions: [
    {
      title: 'Change the race date',
      detail: "Next year's date. It moves the countdown, the footer and Google.",
      target: { doc: 'race', field: 'raceDate' },
      icon: CalendarIcon,
    },
    {
      title: 'Entry fees and caps',
      detail: 'The prices on the 50K and 27K tickets, and how many places each has.',
      target: { pane: 'this-years-race;orderable-distance' },
      icon: TagIcon,
    },
    {
      title: 'Put up a race notice',
      detail: 'Parking, bib pickup, the weather. Across the top of every page.',
      target: { tool: 'quick-update' },
      icon: BellIcon,
    },
    {
      title: 'Start a new race year',
      detail: 'The once-a-year list, with what is already done ticked off.',
      target: { pane: 'race-year' },
      icon: CalendarIcon,
    },
  ],

  // The page check inside "Help for this page" (card 110): the same three
  // checks as the "Check this page..." action, on the page-builder types.
  pageCheck: { types: [...PAGE_BUILDER_TYPES], run: (doc, client) => runPageCheck(client, doc) },

  // Card 137: the spotlight tours, welcome and What's new are data in studio-tours.ts.
  tourSteps: [], // the old single tour; `tours` below replaces it
  tours: TOURS,
  welcome: WELCOME,
  whatsNew: WHATS_NEW,

  liveSlowAfterMinutes: 15,

  // Home's banner (card 118): the welcome on the forest green top bar. The
  // race's mark is the stone steps on their bark plate (public/favicon.svg),
  // which carries its own dark ground, so it is drawn bare. The strip along the
  // foot is the 50K's own elevation profile, seven loops of Mt. Airy Forest
  // out of The Oval over the site's topo contours, on the course poster's mile
  // rule (npm run gen:studio-banner draws it from scripts/data/course-profile.json),
  // and the editor's name is in the gold the site uses for labels on forest.
  // Dave's new logo is still to come; when it does, it replaces the mark here.
  homeBanner: {
    markOnDark: '/favicon.svg',
    motif: '/studio-banner/course-profile.svg',
    motifNarrow: '/studio-banner/course-profile-phone.svg',
    accent: '#FED89B',
    // The 50K in the site's display face, gold as on the distance ticket. The
    // echo, the outlined K, the eyebrow, the stamp and the plate button are
    // `style` below (card 135); no site CSS touches Home's banner.
    lettering: {
      text: '50K',
      family: 'Staatliches',
      src: '/fonts/staatliches-400.woff2',
      colors: ['#FED89B'],
    },
    style: {
      eyebrow: {
        font: "'JetBrains Mono Variable', ui-monospace, monospace",
        size: '0.75rem',
        weight: 600,
        tracking: '0.22em',
        case: 'upper',
        color: '#fed89b',
        mark: { kind: 'dot', color: '#fed89b' },
      },
      title: {
        font: "'Staatliches', 'Arial Narrow', system-ui, sans-serif",
        weight: 400,
        size: 'clamp(2.6rem, 2.2rem + 2.6vw, 4.6rem)',
        leading: 0.92,
        tracking: '0.01em',
        case: 'upper',
        color: '#ffebbb',
        echo: { color: '#a83c26' },
        lastLetterOutline: '#fed89b',
      },
      chip: {
        shape: 'plate',
        bg: '#a83c26',
        fg: '#ffebbb',
        hoverBg: '#8f3323',
        edge: '#000000',
        ring: '#fed89b',
        font: "'Staatliches', 'Arial Narrow', system-ui, sans-serif",
        size: '1.2rem',
        weight: 400,
        tracking: '0.08em',
        case: 'upper',
      },
      // The brand tagline, without its full stop.
      stamp: {
        text: "Cincinnati's longest running ultra marathon",
        color: '#fed89b',
        font: "'Staatliches', 'Arial Narrow', system-ui, sans-serif",
      },
    },
  },

  features: {
    home: true,
    guide: true,
    checkup: true,
    tour: true,
    trash: true,
    publishNote: true,
    // Card 115: Cloudflare Web Analytics through /api/studio/visitors/. The
    // route says "not set up yet" until the Worker has CF_ANALYTICS_TOKEN,
    // CF_ACCOUNT_ID and CF_WEB_ANALYTICS_SITE_TAG (OPERATIONS.md, "Visitor numbers").
    visitors: true,
    // Card 110: the status line under the top bar, and the help panel.
    navbarStatus: true,
    helpPanel: true,
  },
};

/**
 * The race's page-builder rules (the authoring kit, PORTS.md card 109). Each
 * one shows as a yellow WARNING beside a page's sections, never an error, so
 * nothing here can stop Publish or break a page that is already live. The
 * built-in warnings (empty sections, leftover template example text, a synced
 * section with nothing picked) apply everywhere whatever this says. Logic and
 * tests: src/lib/page-guardrails.ts.
 *
 * Every page on this site opens with its page heading (Course, Records and
 * Contact all start with one), and has one. Home is left out: it opens with
 * the race banner and is shaped by hand.
 */
export const pageRules: PageRules = {
  appliesTo: ['page'],
  mustStartWith: ['pageHeaderSection', 'raceHeroSection', 'heroSection'],
  atMostOnce: ['pageHeaderSection', 'raceHeroSection', 'heroSection'],
  maxSections: 20,
};
