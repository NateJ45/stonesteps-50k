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
// update is a race-week notice in three boxes, and the Checkup's race rules
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
import { guides, GUIDE_CATEGORIES, GUIDES_FOR_TYPE } from './guides/content';
import { makeGuideView } from './components/GuideView';
import { envVal } from './urls';
import type { PageRules } from '../lib/page-guardrails';
import { BellIcon } from '@sanity/icons/Bell';
import { CalendarIcon } from '@sanity/icons/Calendar';
import { TagIcon } from '@sanity/icons/Tag';
import { WarningOutlineIcon } from '@sanity/icons/WarningOutline';
import { runPageCheck } from './actions/checkPage';
import { PAGE_BUILDER_TYPES } from './pageBuilderConfig';
import { raceRules } from './raceCheckup';
import { buildNotice, inDays } from '../lib/quick-updates';

const PUBLISHED = '!(_id in path("drafts.**"))';

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
      title: 'Put up a race-week notice',
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
      title: 'Urgent: a change on race day',
      detail: 'A notice in red, for a delayed start, a closed trail or bad weather.',
      icon: WarningOutlineIcon,
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

  guide: {
    guides,
    categories: GUIDE_CATEGORIES,
    view: makeGuideView,
    // "Help for this page" (card 110): which guides each document type shows.
    forType: GUIDES_FOR_TYPE,
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

  tourSteps: [
    {
      title: 'This is Home',
      body: 'Home opens first every time. It shows the race checklist, whether your last change is on the website yet, and anything that needs fixing.',
    },
    {
      title: 'Content is where you edit',
      body: "Click Content in the top bar. This year's race holds the date, the distances, the schedule and the sponsors; Pages holds the pages; Results and records holds every finisher since 2003.",
    },
    {
      title: 'Live preview shows the real page',
      body: 'Live preview shows the website as runners will see it, with your unpublished changes in place. Click any words on it to edit them right there.',
    },
    {
      title: 'Nothing is public until you press Publish',
      body: 'Your changes are private until you press the green Publish button. After that the website updates itself in a few minutes. Changed your mind? Use Undo, or move a thing to the Trash and bring it back later.',
    },
    {
      title: 'Race week from your phone',
      body: 'Quick update in the top bar puts up a race-week notice in three boxes: parking, bib pickup, the weather, a course change.',
    },
    {
      title: 'Help is always one click away',
      body: 'Site Guide in the top bar has step-by-step help for every job, and you can print any of it. Stuck? Home has a card for asking Nathan.',
    },
  ],

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
