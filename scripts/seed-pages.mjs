// scripts/seed-pages.mjs
//
// Builds the four race pages as pageBuilder arrays: home, course, records and
// contact. Run after seed-race.mjs and import-results.mjs.
//
// EVERY PAGE IS A BUILDER ARRAY, not a bespoke route. That was a deliberate
// choice: the race director can reorder, remove or add a section without a
// developer, and every page gets the live draft preview for free. The sections
// that carry structured data (records, tickets, schedule, sponsors) fill
// themselves from the collections, so making them editable in place would only
// create a second copy of the truth.
//
// Idempotent: deterministic _id values with createOrReplace.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.log('PUBLIC_SANITY_PROJECT_ID is not set. Configure your .env and re-run.');
  process.exit(0);
}
if (!token) {
  console.log('SANITY_API_WRITE_TOKEN is not set. A write token is required to seed content.');
  process.exit(0);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2026-05-01', useCdn: false });

let n = 0;
const key = () => `seed-${(n += 1)}`;
const cta = (label, href) => ({
  _type: 'ctaBlock',
  label,
  linkType: 'external',
  externalUrl: href,
  openInNewTab: false,
});
const REGISTER = 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50KTrailRun';

const docs = [];

// ── Home ──────────────────────────────────────────────────────────────────
docs.push({
  _id: 'homePage',
  _type: 'homePage',
  seoTitle: 'Stone Steps 50K and 27K Trail Run | Mt. Airy Forest, Cincinnati',
  seoDescription:
    "Cincinnati's longest running ultra marathon. Seven single-track loops through Mt. Airy " +
    'Forest, 10,726 feet of climbing, Sunday 25 October 2026.',
  pageBuilder: [
    {
      _type: 'raceHeroSection',
      _key: key(),
      eyebrow: 'Sunday, October 25, 2026',
      headline: 'Stone Steps 50k',
      subhead:
        "Cincinnati's longest running ultra marathon, in its 23rd year. Seven single-track " +
        'loops through Mt. Airy Forest, 10,726 feet of climbing, and an aid station every ' +
        'time you come back through The Oval.',
      showCountdown: true,
      primaryCta: cta('Register', REGISTER),
      secondaryCta: cta('See the course', '/course'),
    },
    {
      _type: 'distanceTicketsSection',
      _key: key(),
      eyebrow: 'Two distances',
      headline: 'Pick your day',
      note: 'Prices step up on February 1 and again on October 1.',
    },
    {
      _type: 'elevationSection',
      _key: key(),
      eyebrow: 'The climbing',
      headline: 'Ten thousand feet of it',
      intro:
        'Every loop climbs out of The Oval and drops back into it, so the profile is a stack ' +
        'of saw teeth rather than one long haul. Nothing about this course is flat.',
      totalGain: '10,726 ft',
    },
    {
      _type: 'courseFeaturesSection',
      _key: key(),
      eyebrow: 'What to expect',
      headline: 'Roots, rocks, and one very good park',
      cta: {
        _type: 'ctaBlock',
        label: 'The full course',
        linkType: 'internal',
        externalUrl: '/course',
      },
    },
    {
      _type: 'raceScheduleSection',
      _key: key(),
      eyebrow: 'Race day',
      headline: 'How the morning goes',
    },
    {
      _type: 'recordsBoardSection',
      _key: key(),
      eyebrow: 'The fast ones',
      headline: 'All-time records',
      intro:
        'Course records, age-group records and the fastest finishes on file. These are ' +
        'calculated from the results themselves, so they update the day new results land.',
    },
    {
      _type: 'sponsorPatchesSection',
      _key: key(),
      eyebrow: 'Support',
      headline: 'With thanks',
    },
  ],
});

// ── Course ────────────────────────────────────────────────────────────────
docs.push({
  _id: 'page-course',
  _type: 'page',
  title: 'The Course',
  slug: { _type: 'slug', current: 'course' },
  seoTitle: 'The Course | Stone Steps 50K',
  seoDescription:
    'Seven single-track loops out of The Oval in Mt. Airy Forest, with 10,726 feet of ' +
    'elevation change and an aid station at the end of every loop.',
  pageBuilder: [
    {
      _type: 'loopCardSection',
      _key: key(),
      eyebrow: 'The course',
      headline: 'Seven loops out of The Oval',
      legend: 'The 27K punches the first four and finishes. The 50K punches all seven.',
      loops: [
        { _type: 'loop', _key: key(), kind: 'long', miles: '5+', inShortDistance: true },
        { _type: 'loop', _key: key(), kind: 'short', miles: '3+', inShortDistance: true },
        { _type: 'loop', _key: key(), kind: 'long', miles: '5+', inShortDistance: true },
        { _type: 'loop', _key: key(), kind: 'short', miles: '3+', inShortDistance: true },
        { _type: 'loop', _key: key(), kind: 'long', miles: '5+', inShortDistance: false },
        { _type: 'loop', _key: key(), kind: 'short', miles: '3+', inShortDistance: false },
        { _type: 'loop', _key: key(), kind: 'long', miles: '5+', inShortDistance: false },
      ],
    },
    {
      _type: 'elevationSection',
      _key: key(),
      eyebrow: 'Elevation',
      headline: 'A stack of saw teeth',
      intro:
        'Each loop returns you through the aid station at The Oval before sending you back ' +
        'out, so drop bags stay in one place all day.',
      totalGain: '10,726 ft',
    },
    {
      _type: 'courseFeaturesSection',
      _key: key(),
      eyebrow: 'The terrain',
      headline: 'What you are running on',
    },
    {
      _type: 'distanceTicketsSection',
      _key: key(),
      eyebrow: 'Ready?',
      headline: 'Two distances',
    },
  ],
});

// ── Records ───────────────────────────────────────────────────────────────
docs.push({
  _id: 'page-records',
  _type: 'page',
  title: 'All-Time Records',
  slug: { _type: 'slug', current: 'records' },
  seoTitle: 'All-Time Records | Stone Steps 50K',
  seoDescription:
    'Course records, age-group records and the fastest finishes at the Stone Steps 50K and ' +
    '27K in Mt. Airy Forest, Cincinnati.',
  pageBuilder: [
    {
      _type: 'recordsBoardSection',
      _key: key(),
      eyebrow: 'All-time',
      headline: 'The records',
      intro:
        'Every figure on this page is calculated from the finishing times themselves rather ' +
        'than kept by hand, so the course record and the age-group tables can never disagree ' +
        'with each other.',
    },
  ],
});

// ── Site settings: the header, the footer, the identity ──────────────────
// The starter ships a service-business menu (About / Services / FAQ / Journal
// and a "Book a consultation" button). None of that applies to a trail race,
// and an unreplaced default menu is the most visible way a fork announces
// itself as a template.
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  navItems: [
    { _type: 'navLink', _key: key(), label: 'The Race', linkType: 'internal', href: '/' },
    { _type: 'navLink', _key: key(), label: 'Course', linkType: 'internal', href: '/course' },
    { _type: 'navLink', _key: key(), label: 'Records', linkType: 'internal', href: '/records' },
    {
      _type: 'navLink',
      _key: key(),
      label: 'Results',
      linkType: 'external',
      externalUrl: 'https://runsignup.com/Race/Results/15282',
    },
  ],
  headerCta: {
    show: true,
    label: 'Register',
    link: { _type: 'navLink', label: 'Register', linkType: 'external', externalUrl: REGISTER },
  },
  footerColumns: [
    {
      _type: 'footerColumn',
      _key: key(),
      title: 'The race',
      links: [
        { _type: 'footerLink', _key: key(), label: 'The Race', href: '/' },
        { _type: 'footerLink', _key: key(), label: 'Course', href: '/course' },
        { _type: 'footerLink', _key: key(), label: 'Records', href: '/records' },
      ],
    },
    {
      _type: 'footerColumn',
      _key: key(),
      title: 'Elsewhere',
      links: [
        { _type: 'footerLink', _key: key(), label: 'Register', href: REGISTER },
        {
          _type: 'footerLink',
          _key: key(),
          label: 'Full results',
          href: 'https://runsignup.com/Race/Results/15282',
        },
        {
          _type: 'footerLink',
          _key: key(),
          label: 'Facebook group',
          href: 'https://www.facebook.com/groups/1103063513072311/',
        },
      ],
    },
    {
      _type: 'footerColumn',
      _key: key(),
      title: 'Where',
      links: [
        { _type: 'footerLink', _key: key(), label: 'Mt. Airy Forest', href: '/course' },
        { _type: 'footerLink', _key: key(), label: 'The Oval, Area 13', href: '/course' },
        { _type: 'footerLink', _key: key(), label: 'Cincinnati, Ohio', href: '/course' },
      ],
    },
  ],
  footerCredit: 'Nixon Creative Studio',
  footerCreditUrl: 'https://nixoncreativestudio.com',
});

async function seed() {
  console.log(`Seeding ${docs.length} pages to ${projectId}/${dataset}...`);
  for (const doc of docs) {
    await client.createOrReplace(doc);
    console.log(`  ${doc._type.padEnd(10)} ${doc._id}`);
  }
  console.log('Done.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
