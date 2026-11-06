// Safe to edit by hand
// =============================================================================
// board.ts - the Stone Steps 50K Report (the Studio tool, PORTS.md card 218)
// =============================================================================
// NOT PORTABLE: this is the race's own report, in the race director's words. The
// shared half (src/lib/studio-board.ts, src/sanity/kit/board/, the route
// /api/studio/board/) reads this and nothing else.
//
// The tool appears when PUBLIC_BOARD_REPORT is "true" at build time (the
// repository variable, passed by deploy.yml). The numbers come through the
// SITE_DATA binding from studio-status, whose src/site-series-config.ts lists
// the events it counts for this site (key `stonesteps`). An `event:` measure
// here must be there too.
//
// MEASURES: visitors, visits, pageViews, newVisitors, searchClicks,
// searchAppearances, event:<name>; lists for charts: topContent (prefix keeps
// those addresses), channels, places, countries, searchQueries, searchPages.
//
// WHAT EACH EVENT IS, AND WHAT SENDS IT:
//   registration_click  src/lib/ga-events-listener.js (inline), a click or
//                       middle-click on a RunSignUp link
//   generate_lead       src/lib/ga-events.ts, called by RaceContactForm.tsx
//   contact_click, directions_click, watch_click, sponsor_click
//                       the shared layer (SiteEvents.astro) with src/config/events.ts
//
// DATES: Google Analytics has page views from 2026-09-05, so September 2026 is a
// part month. Our own test runs on localhost (347 sessions that month) are not
// counted: the Worker's `hosts` setting keeps only this site's hostnames. Clicks began on 2026-10-05; the four new link events begin
// on NEW_LINK_EVENTS_SINCE, which is the day the shared layer was deployed
// (update it if that is not the right day). Google's search numbers begin on
// 2026-09-15, when the site first shows in Search Console.
//
// WORDS: plain, no em-dashes, no "sessions". How a number is counted goes in
// `explain`, behind the "i" button. Clicks are clicks, not entries.
// =============================================================================

import type { BoardConfig } from '../lib/studio-board';
import { site } from '../data/site';

/** The day the shared link events (contact, directions, watch, sponsor) began to be counted. */
const NEW_LINK_EVENTS_SINCE = '2026-11-06';

const REGISTER =
  'Each time someone clicked a link through to RunSignUp, where runners sign up. These are clicks, not entries: the website cannot see whether the person then finished signing up. RunSignUp has the true entry count.';
const CONTACT_SENT =
  'Each time a message was sent from the contact form. It counts a message that went through, never what it said or who sent it.';
const GOOGLE =
  'Times someone chose the race website in a Google search. From Google Search Console, which runs about three days behind.';
const VISITORS =
  'People who came to the website. Someone who comes back in the same period is counted once. Counting began on September 5, 2026, on the old website; the new one started on September 18.';
const RESULTS_PAGES = ['/results', '/runners', '/records', '/all-time-records'];

export const boardConfig: BoardConfig = {
  siteName: site.name,
  firstMonth: '2026-09',
  timeZone: 'America/New_York',
  // Visits are counted from September 5. Clicks on RunSignUp links and messages sent were
  // counted from October 5. The four link events below begin when the shared layer went out.
  since: {
    all: '2026-10-05',
    visitors: '2026-09-05',
    visits: '2026-09-05',
    pageViews: '2026-09-05',
    newVisitors: '2026-09-05',
    searchClicks: '2026-09-15',
    searchAppearances: '2026-09-15',
    'event:contact_click': NEW_LINK_EVENTS_SINCE,
    'event:directions_click': NEW_LINK_EVENTS_SINCE,
    'event:watch_click': NEW_LINK_EVENTS_SINCE,
    'event:sponsor_click': NEW_LINK_EVENTS_SINCE,
  },
  gaps: [],

  overview: {
    tiles: [
      { measure: 'visitors', label: 'Visitors', explain: VISITORS },
      {
        measure: 'event:registration_click',
        label: 'Clicks to sign up on RunSignUp',
        explain: REGISTER,
      },
      {
        measure: 'event:generate_lead',
        label: 'Contact messages sent',
        explain: CONTACT_SENT,
      },
      { measure: 'searchClicks', label: 'Clicks from Google', explain: GOOGLE },
    ],
    charts: [
      { measure: 'event:registration_click', title: 'Clicks to sign up, by month' },
      { measure: 'visitors', title: 'Visitors by month' },
      {
        measure: 'topContent',
        title: 'Most viewed results pages',
        prefix: RESULTS_PAGES,
        note: 'Results, runner, record and all-time record pages.',
      },
      { measure: 'channels', title: 'How runners found the website' },
    ],
  },

  parts: [
    {
      id: 'race-season',
      title: 'Race season',
      explain: REGISTER,
      tiles: [
        { measure: 'event:registration_click', label: 'Clicks to sign up on RunSignUp' },
        { measure: 'newVisitors', label: 'First-time visitors' },
      ],
      charts: [
        {
          measure: 'event:registration_click',
          title: 'Clicks to sign up, by month',
          note: 'Each bar is one month, so a year reads from one race to the next. These are clicks, not entries.',
        },
        { measure: 'visitors', title: 'Visitors by month' },
      ],
      more: [
        { measure: 'newVisitors', title: 'First-time visitors by month' },
        { measure: 'pageViews', title: 'Pages viewed by month' },
      ],
    },
    {
      id: 'results-archive',
      title: 'Results archive',
      explain:
        'Runners looking themselves up, past results, runner pages and the records. The list counts pages opened, so it shows what people looked for, not how many people looked.',
      charts: [
        {
          measure: 'topContent',
          title: 'Most viewed pages in the archive',
          prefix: RESULTS_PAGES,
          limit: 10,
        },
      ],
    },
    {
      id: 'course',
      title: 'Course and maps',
      explain:
        'The course page and the map. A click for directions is someone choosing a link to Google or Apple Maps; the website cannot see who then came.',
      tiles: [
        {
          measure: 'event:directions_click',
          label: 'Clicks for directions',
          explain:
            'Clicks on a link to Google or Apple Maps. The website cannot see who then came.',
        },
      ],
      charts: [
        { measure: 'topContent', title: 'Course page', prefix: ['/course'] },
        { measure: 'event:directions_click', title: 'Clicks for directions, by month' },
      ],
    },
    {
      id: 'sponsors',
      title: 'Sponsors',
      explain:
        'Clicks on a sponsor logo on the website that lead to the sponsor’s own site. It counts the click, not a visit to the sponsor.',
      tiles: [{ measure: 'event:sponsor_click', label: 'Clicks on sponsors' }],
      charts: [{ measure: 'event:sponsor_click', title: 'Clicks on sponsors, by month' }],
    },
    {
      id: 'contact',
      title: 'Contact',
      explain:
        'Messages sent from the contact form, and clicks on the race email address or a phone number. A message counts when it went through, never for what it said.',
      tiles: [
        { measure: 'event:generate_lead', label: 'Contact messages sent', explain: CONTACT_SENT },
        {
          measure: 'event:contact_click',
          label: 'Email and phone clicks',
          explain: 'Clicks on an email address or phone number on the website.',
        },
      ],
      charts: [
        { measure: 'event:generate_lead', title: 'Contact messages sent, by month' },
        { measure: 'topContent', title: 'Contact page', prefix: ['/contact'] },
      ],
      more: [{ measure: 'event:contact_click', title: 'Email and phone clicks, by month' }],
    },
    {
      id: 'found',
      title: 'How runners found the website',
      explain:
        'Where visitors came from. A click from Google is someone choosing the race in a search; an appearance is the race being listed, chosen or not. Places come from Google Analytics and are by state.',
      tiles: [
        { measure: 'searchClicks', label: 'Clicks from Google', explain: GOOGLE },
        { measure: 'searchAppearances', label: 'Times it appeared on Google', up: 'flat' },
      ],
      charts: [
        { measure: 'channels', title: 'How runners found the website' },
        { measure: 'searchQueries', title: 'Searches that found the race' },
        { measure: 'places', title: 'Where visitors were, by state' },
      ],
      more: [
        { measure: 'searchPages', title: 'Pages Google sent people to' },
        { measure: 'countries', title: 'Countries' },
        { measure: 'event:watch_click', title: 'Video link clicks, by month' },
      ],
    },
  ],
};
