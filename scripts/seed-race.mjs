// scripts/seed-race.mjs
//
// Seeds the race's own content: the race singleton, the two distances, the
// race-day schedule, the course features, the sponsors, and the transcribed
// historical records that predate the importable results archive.
//
// Prerequisites: PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.
// Idempotent: deterministic _id values with createOrReplace.
//
// Run BEFORE scripts/import-results.mjs, which references distance-50k and
// distance-27k.
//
// ---------------------------------------------------------------------------
// PROVENANCE. Two kinds of value live in this file and they are not the same.
//
// VERIFIED means it came from the race's own RunSignUp listing or its live
// site, on 2026-09-07, and the source is named in a comment beside it. Those
// documents ship with confirmed: true.
//
// UNCONFIRMED means the race publishes it nowhere. Those ship with
// confirmed: false and NO invented value, so the page renders a visible
// "Not confirmed" marker instead of a plausible lie. The design mockup this
// site is based on invented an entire race-day schedule; that is exactly what
// the flag exists to prevent.
//
// The unconfirmed list is also the question list for the race director. It is
// short and specific on purpose: packet pickup, the pre-race briefing, awards,
// parking, drop bags, pacers, dogs, and the refund policy.
// ---------------------------------------------------------------------------

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

/** Lexical rank for @sanity/orderable-document-list. */
const rank = (n) => `a${String(n).padStart(4, '0')}`;

const docs = [];

// ── The race ─────────────────────────────────────────────────────────────
// Every field below is VERIFIED from https://runsignup.com/rest/race/15282
// (fetched 2026-09-07) or from stonesteps50k.com, except where noted.
docs.push({
  _id: 'race',
  _type: 'race',
  name: 'Stone Steps 50K',
  tagline: "Cincinnati's longest running ultra marathon.",
  editionNumber: 23, // RunSignUp race description: "back for its 23rd edition"
  raceDate: '2026-10-25T08:00:00.000Z', // RunSignUp: 10/25/2026 08:00 local
  venue: 'Mt. Airy Forest',
  startArea: 'The Oval, Area 13',
  streetAddress: '5083 Colerain Ave.', // RunSignUp address block
  city: 'Cincinnati',
  region: 'OH',
  postalCode: '45223',
  geo: { _type: 'geopoint', lat: 39.17275, lng: -84.568806 }, // RunSignUp lat/long
  registerUrl: 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50KTrailRun',
  resultsUrl: 'https://runsignup.com/Race/Results/15282',
  facebookUrl: 'https://www.facebook.com/groups/1103063513072311/',
  // gpxUrl deliberately absent. No surveyed track has been published, and the
  // elevation profile captions itself as illustrative while this is empty.
  feeTiers: [
    // RunSignUp registration_periods for event 1104726 (the 2026 50K).
    {
      _type: 'feeTier',
      _key: 'tier-early',
      label: 'Through January 31',
      amount: 35,
      processingFee: 3.5,
      endsOn: '2026-01-31',
    },
    {
      _type: 'feeTier',
      _key: 'tier-regular',
      label: 'February 1 to September 30',
      amount: 50,
      processingFee: 3.5,
      endsOn: '2026-09-30',
    },
    {
      _type: 'feeTier',
      _key: 'tier-late',
      label: 'October 1 to race day',
      amount: 60,
      processingFee: 4.6,
      endsOn: '2026-10-25',
    },
  ],
  directorName: 'David Corfman',
  directorNote: 'The 34th person to finish 100 hundred-mile ultramarathons.',
  parksDonation: '$2,000',
  confirmed: true,
});

// ── Distances ────────────────────────────────────────────────────────────
docs.push({
  _id: 'distance-50k',
  _type: 'distance',
  name: '50K',
  slug: { _type: 'slug', current: '50k' },
  kicker: 'The full ultra',
  // 5.3 and 3.2 are the race's OWN figures, not a rounding of "5+" and "3+".
  // Its 2006 to 2009 timing spreadsheets all carry the same split columns:
  // 5.3M, 8.5M, 13.8M, 17M, 22.3M, 25.5M. Four independent years agreeing is
  // what licenses the tenth of a mile. Anywhere these numbers appear on the
  // page they must appear with their source: see the loopCardSection's
  // sourceNote in scripts/seed-pages.mjs.
  loopStructure: 'Four 5.3 mile loops alternating with three 3.2 mile loops',
  blurb:
    'The original. Seven single-track loops through Mt. Airy Forest, each one returning ' +
    'you through the aid station at The Oval before sending you back out. Roots, rocks, ' +
    'ridge traverses and the occasional blow down.',
  includes: ['Tech t-shirt', 'Timing chip', 'Aid station every loop', 'USATF sanctioned'],
  startTime: '8:00 am', // RunSignUp event details
  trekkerNote: 'Trekkers may start at 7:00 am.', // RunSignUp event details
  entryCap: 120, // RunSignUp participant_cap
  runSignUpEventId: 1104726, // the 2026 50K
  featured: true,
  confirmed: true,
  orderRank: rank(1),
});

docs.push({
  _id: 'distance-27k',
  _type: 'distance',
  name: '27K',
  slug: { _type: 'slug', current: '27k' },
  kicker: 'The fun run',
  loopStructure: 'Two 5.3 mile loops alternating with two 3.2 mile loops, turning for home at 17',
  blurb:
    'Same trail, same climbs, four loops instead of seven. The way a lot of Stone Steps ' +
    'finishers start before they come back for the 50K.',
  includes: ['T-shirt', 'Timing chip', 'Aid station every loop'],
  startTime: '8:30 am',
  trekkerNote: 'Trekkers may start at 8:00 am and are ineligible for age group and overall awards.',
  entryCap: 130,
  runSignUpEventId: 1104727,
  featured: false,
  confirmed: true,
  orderRank: rank(2),
});

// ── Race-day schedule ────────────────────────────────────────────────────
// Only the four rows the race actually publishes are confirmed. The rest carry
// no time at all rather than a plausible one.
const schedule = [
  {
    id: 'packet-pickup',
    label: 'Packet pickup opens',
    detail: 'The Oval, Area 13',
    time: null,
    confirmed: false,
  },
  {
    id: 'briefing',
    label: 'Pre-race briefing',
    detail: 'Start line',
    time: null,
    confirmed: false,
  },
  {
    id: 'trek-50k',
    label: '50K trekker start',
    detail: 'Optional early start',
    time: '7:00 am',
    confirmed: true,
  },
  { id: 'start-50k', label: '50K start', detail: 'Seven loops', time: '8:00 am', confirmed: true },
  {
    id: 'trek-27k',
    label: '27K trekker start',
    detail: 'Ineligible for awards',
    time: '8:00 am',
    confirmed: true,
  },
  { id: 'start-27k', label: '27K start', detail: 'Four loops', time: '8:30 am', confirmed: true },
  { id: 'awards', label: 'Awards', detail: null, time: null, confirmed: false },
  {
    id: 'course-close',
    label: 'Course closes',
    detail: 'Approximate',
    time: '4:30 pm',
    confirmed: true,
  },
];
schedule.forEach((s, i) => {
  docs.push({
    _id: `schedule-${s.id}`,
    _type: 'scheduleItem',
    label: s.label,
    ...(s.time ? { time: s.time } : {}),
    ...(s.detail ? { detail: s.detail } : {}),
    confirmed: s.confirmed,
    orderRank: rank(i + 1),
  });
});

// ── Course features ──────────────────────────────────────────────────────
const features = [
  {
    id: 'single-track',
    title: 'Single track, start to finish',
    body:
      'Hilly trail with roots, rocks and the occasional tree blow down. Nothing about this ' +
      'course is flat, and very little of it is forgiving.',
  },
  {
    id: 'aid',
    title: 'Aid at the end of every loop',
    body:
      'Because the course is a loop stack out of The Oval, you pass through aid seven times ' +
      'on the 50K. Drop bags stay in one place all day.',
  },
  {
    id: 'forest',
    title: '1,469.9 acres of forest',
    body:
      "Mt. Airy Forest is larger than Central Park's 843 acres. Evergreens, hardwoods, " +
      'meadows, river crossings, hill climbs and ridge traverses.',
  },
  {
    id: 'gives-back',
    title: 'It gives back',
    body:
      'Every year the race donates more than $2,000 to Cincinnati Parks, the reason this ' +
      'trail stays runnable.',
  },
];
features.forEach((f, i) => {
  docs.push({
    _id: `course-feature-${f.id}`,
    _type: 'courseFeature',
    title: f.title,
    body: f.body,
    confirmed: true,
    orderRank: rank(i + 1),
  });
});

// ── Sponsors ─────────────────────────────────────────────────────────────
// Logos are uploaded separately: an image asset cannot be seeded from a path.
const sponsors = [
  { id: 'fleet-feet', name: 'Fleet Feet' },
  { id: 'cincinnati-parks', name: 'Cincinnati Parks' },
  { id: 'altra', name: 'Altra Running' },
  { id: 'usatf', name: 'USATF Sanctioned Event' },
];
sponsors.forEach((s, i) => {
  docs.push({
    _id: `sponsor-${s.id}`,
    _type: 'sponsor',
    name: s.name,
    orderRank: rank(i + 1),
  });
});

// ── Historical records ───────────────────────────────────────────────────
// Transcribed from https://stonesteps50k.com/all-time-records/ (verified
// 2026-09-07). These are the marks the importable results archive cannot
// reach: it starts at 2017, and these run back to 2007.
//
// There is deliberately NO "Course" row here. The live site stores the course
// record as a hand-copied duplicate of whichever age row holds it, and the two
// copies now disagree about the year in two separate places. The outright
// record is computed from these rows instead. See src/lib/age-brackets.ts.
//
// The two genuine conflicts in the published source are carried as sourceNote
// data rather than silently resolved.
const hhmmss = (t) => {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

const historical = [
  // 50K men
  ['50k', 'M', 'u30', 'David Riddle', 2010, '3:44:39'],
  ['50k', 'M', '30s', 'David Riddle', 2011, '3:40:56'],
  ['50k', 'M', '40s', 'Jay Smithberger', 2009, '4:16:17'],
  ['50k', 'M', '50s', 'Craig Wheeler', 2011, '4:48:35'],
  ['50k', 'M', '60s', 'Mark Calcatera', 2011, '6:19:49'],
  ['50k', 'M', '70plus', 'Richard Barton', 2023, '7:52:30'],
  // 50K women
  ['50k', 'F', 'u30', 'Katie Ruhlman', 2018, '4:41:09'],
  ['50k', 'F', '30s', 'Katie Ruhlman', 2020, '4:27:23'],
  ['50k', 'F', '40s', 'Kim Martin', 2007, '5:12:48'],
  ['50k', 'F', '50s', 'Ruth Kohstall', 2008, '5:51:28'],
  ['50k', 'F', '60s', 'Ruth Kohstall', 2018, '7:06:30'],
  // 50K women 70+ is Unclaimed on the live site, so no document exists for it.
  // The records table renders every bracket and shows an empty one as
  // "Unclaimed", so absence here is the correct representation.

  // 27K men
  [
    '27k',
    'M',
    'u30',
    'Brian List',
    2010,
    '1:58:36',
    'The live site publishes this time as 2010 in the age row and 2011 in the course row. ' +
      'It also spells the name "Brain List" in one of its two tables.',
  ],
  ['27k', 'M', '30s', 'Paul Odipo', 2013, '2:08:14'],
  ['27k', 'M', '40s', 'Daniel Campbell', 2011, '2:17:27'],
  ['27k', 'M', '50s', 'Daniel Heffernan', 2014, '2:34:36'],
  ['27k', 'M', '60s', 'Charles Lowery', 2010, '3:04:15'],
  // 27K women
  [
    '27k',
    'F',
    '30s',
    'Katie Ruhlman',
    2010,
    '2:28:40',
    'The live site publishes this time as 2010 in the age row and 2021 in the course row.',
  ],
  ['27k', 'F', 'u30', 'Lizzie Gleason', 2015, '2:44:12'],
];

const athleteIds = new Map();
function athleteRef(name) {
  const slug = name
    .toLocaleLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const id = `athlete-${slug}`;
  if (!athleteIds.has(id)) {
    athleteIds.set(id, { _id: id, _type: 'athlete', name, slug: { _type: 'slug', current: slug } });
  }
  return { _type: 'reference', _ref: id };
}

historical.forEach(([dist, gender, bracket, name, year, time, note]) => {
  docs.push({
    _id: `record-${dist}-${gender}-${bracket}`,
    _type: 'recordEntry',
    athlete: athleteRef(name),
    distance: { _type: 'reference', _ref: `distance-${dist}` },
    gender,
    bracket,
    timeSeconds: hhmmss(time),
    year,
    ...(note ? { sourceNote: note } : {}),
  });
});

// Athletes referenced by the historical records must exist. The results import
// will createOrReplace the same ids later, which is fine: same identity, and
// the importer carries city and state the records tables do not have.
for (const a of athleteIds.values()) docs.unshift(a);

// ── Write ────────────────────────────────────────────────────────────────
async function seed() {
  console.log(`Seeding ${docs.length} race documents to ${projectId}/${dataset}...`);
  let created = 0;
  let replaced = 0;
  for (const doc of docs) {
    try {
      const existing = await client.fetch('*[_id == $id][0]._id', { id: doc._id });
      await client.createOrReplace(doc);
      if (existing) replaced += 1;
      else created += 1;
    } catch (err) {
      console.error(`  ERROR on ${doc._id}: ${err.message}`);
    }
  }
  console.log(`Done. ${created} created, ${replaced} replaced.`);
  console.log('');
  console.log('Unconfirmed and still needing the race director:');
  console.log('  packet pickup time and location, pre-race briefing time, awards structure');
  console.log('  and time, parking, drop-bag policy, pacers, dogs, refund policy.');
  console.log('Those render behind a "Not confirmed" marker until someone ticks the box.');
}

seed();
