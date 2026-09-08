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
// Page documents a CTA can REFERENCE. A reference survives a slug change; a
// typed path does not, so prefer it wherever the destination is a document.
const PAGE_DOC_BY_PATH = {
  '/course': 'page-course',
  '/records': 'page-records',
  '/contact': 'page-contact',
};

// Build the right ctaBlock shape for a destination.
//
// This used to stamp every CTA as `linkType: 'external'` with the path in
// `externalUrl`, which produced two separate bugs: an absolute-URL validation
// error in the Studio on "/course", and internal links rendered with
// target="_blank" as though they left the site. Anything starting with "/" is
// internal, and becomes a reference when a document exists for it.
const cta = (label, href) => {
  if (!href.startsWith('/')) {
    return {
      _type: 'ctaBlock',
      label,
      linkType: 'external',
      externalUrl: href,
      openInNewTab: false,
    };
  }
  const ref = PAGE_DOC_BY_PATH[href];
  return {
    _type: 'ctaBlock',
    label,
    linkType: 'internal',
    ...(ref ? { internalLink: { _type: 'reference', _ref: ref } } : { internalPath: href }),
  };
};
const REGISTER = 'https://runsignup.com/Race/OH/Cincinnati/StoneSteps50KTrailRun';

// ── Photographs ───────────────────────────────────────────────────────────
// Uploaded by scripts/upload-images.mjs and referenced by asset id, so a
// re-seed re-attaches the SAME asset rather than orphaning it.
//
// Alt text is required by the schema and is written here rather than left to
// whoever seeds next: "describe what is happening in the photo, not the file
// name". These are the photographs the page was designed around; without them
// the hero is a topo pattern and the course sections are walls of text.
const img = (assetId, alt) => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: assetId },
  alt,
});

const PHOTO = {
  trailRunnersWide: 'image-d875998171580db8c002fa107bc9c6fcd486c9a8-1920x1272-jpg',
  trailDescent: 'image-afc15f9784165f632733a8c5f98c53708e6d2024-1920x1272-jpg',
  mtAiryForest: 'image-b27a7b16969285e8d9624a4f79c1d174162623bd-2560x1707-webp',
  courseMap: 'image-56ce0fcfe8fda80cdf1a6ffac247e33376b05368-1495x1112-jpg',
  runnersPortrait: 'image-c55575dc6a7a60d39a5d93c89fc8a3daa25f1aed-768x1024-webp',
};

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
      image: img(
        PHOTO.trailRunnersWide,
        'Runners on single track through Mt. Airy Forest, autumn leaf litter underfoot.',
      ),
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
      _type: 'tickerSection',
      _key: key(),
      // Every one of these is stated properly elsewhere on the page. That is
      // the condition for the strip being aria-hidden decoration.
      items: [
        '10,726 ft of climbing',
        'Seven loops',
        'Aid every loop',
        'Mt. Airy Forest',
        'Since 2003',
        'USATF sanctioned',
      ],
    },
    {
      _type: 'statSection',
      _key: key(),
      stats: [
        {
          _type: 'statItem',
          _key: key(),
          number: 10726,
          suffix: ' ft',
          label: 'Total elevation change',
        },
        { _type: 'statItem', _key: key(), number: 31.1, suffix: ' mi', label: 'Full 50K distance' },
        {
          _type: 'statItem',
          _key: key(),
          number: 7,
          suffix: ' loops',
          label: 'Alternating long and short',
        },
        { _type: 'statItem', _key: key(), number: 23, suffix: 'rd', label: 'Edition, in 2026' },
      ],
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
      image: img(
        PHOTO.trailDescent,
        'A runner dropping down a rooted descent on the Stone Steps course.',
      ),
      eyebrow: 'What to expect',
      headline: 'Roots, rocks, and one very good park',
      cta: cta('The full course', '/course'),
    },
    {
      _type: 'raceScheduleSection',
      _key: key(),
      eyebrow: 'Race day',
      headline: 'How the morning goes',
    },
    {
      // The full board lives on /records. Home gets the four callouts, which is
      // the pacing the design mockup had: a teaser here, the data there.
      _type: 'dynastiesSection',
      _key: key(),
      eyebrow: 'The fast ones',
      headline: 'The names on the board',
      cta: cta('All-time records', '/records'),
    },
    {
      _type: 'parksSection',
      _key: key(),
      image: img(
        PHOTO.mtAiryForest,
        'Mature woodland in Mt. Airy Forest, the park the race runs through.',
      ),
      eyebrow: 'Why it exists',
      headline: 'to Cincinnati Parks',
      body:
        'Mt. Airy Forest is 1,469.9 acres, larger than Central Park. The race has run here ' +
        'without a break for over twenty years, and every entry helps keep the trail ' +
        'runnable for everyone who uses it the rest of the year.',
      caption: 'Mt. Airy Forest, Cincinnati',
      showDirector: true,
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
      _type: 'pageHeaderSection',
      _key: key(),
      eyebrow: 'The course',
      headline: 'Seven loops',
      headlineSecondLine: 'out of The Oval.',
      lede:
        'Single track through Mt. Airy Forest, 1,469.9 acres of it, with an aid station ' +
        'every time you come back through the start.',
    },
    {
      _type: 'loopCardSection',
      _key: key(),
      eyebrow: 'The course',
      headline: 'Seven loops out of The Oval',
      legend: 'The 27K punches the first four and finishes. The 50K punches all seven.',
      aside: [
        {
          _type: 'loopNote',
          _key: key(),
          title: 'The 27K',
          body:
            'Two 5.3 mile loops alternating with two 3.2 mile loops, on exactly the same ' +
            'trail. You turn for home at 17 miles. Same climbs, four loops instead of seven.',
          confirmed: true,
        },
        {
          _type: 'loopNote',
          _key: key(),
          title: 'Aid',
          body:
            'At the end of every loop, because the course is a stack out of The Oval. On ' +
            'the 50K you pass through it seven times, and drop bags stay in one place all ' +
            'day.',
          confirmed: true,
        },
        {
          _type: 'loopNote',
          _key: key(),
          title: 'Start and finish',
          body:
            'The Oval, Area 13, inside Mt. Airy Forest. Both distances start and finish in ' +
            'the same place. The 50K goes at 8:00 am, the 27K at 8:30.',
          confirmed: true,
        },
        {
          _type: 'loopNote',
          _key: key(),
          title: 'Cutoff',
          body:
            'The course closes at about 4:30 pm. How that is enforced loop by loop is not ' +
            'published anywhere.',
          confirmed: false,
        },
      ],
      // The loop distances are the race's own, recovered from the split
      // columns on its 2006 to 2009 timing spreadsheets. All four years carry
      // the same marks. See the sourceNote below, which ships on the page.
      sourceNote:
        'Loop distances come from the split columns on the timing sheets the race kept for ' +
        '2006 through 2009, which all read 5.3M, 8.5M, 13.8M, 17M, 22.3M and 25.5M. Its ' +
        'current copy rounds these to "5+" and "3+".',
      loops: [
        {
          _type: 'loop',
          _key: key(),
          kind: 'long',
          miles: '5.3',
          throughMiles: '5.3',
          inShortDistance: true,
        },
        {
          _type: 'loop',
          _key: key(),
          kind: 'short',
          miles: '3.2',
          throughMiles: '8.5',
          inShortDistance: true,
        },
        {
          _type: 'loop',
          _key: key(),
          kind: 'long',
          miles: '5.3',
          throughMiles: '13.8',
          inShortDistance: true,
        },
        {
          _type: 'loop',
          _key: key(),
          kind: 'short',
          miles: '3.2',
          throughMiles: '17',
          inShortDistance: true,
        },
        {
          _type: 'loop',
          _key: key(),
          kind: 'long',
          miles: '5.3',
          throughMiles: '22.3',
          inShortDistance: false,
        },
        {
          _type: 'loop',
          _key: key(),
          kind: 'short',
          miles: '3.2',
          throughMiles: '25.5',
          inShortDistance: false,
        },
        {
          _type: 'loop',
          _key: key(),
          kind: 'long',
          miles: '5.3',
          throughMiles: '50K',
          inShortDistance: false,
        },
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
      image: img(PHOTO.courseMap, 'The Stone Steps course map, showing the loops out of The Oval.'),
      eyebrow: 'The terrain',
      headline: 'What you are running on',
    },
    {
      _type: 'gearSection',
      _key: key(),
      eyebrow: 'Kit',
      headline: 'What to bring',
      items: [
        {
          _type: 'gearItem',
          _key: key(),
          title: 'Trail shoes with real lugs',
          body:
            'Roots, rocks and wet leaves in late October. Road shoes will get you round ' +
            'and will not enjoy it.',
        },
        {
          _type: 'gearItem',
          _key: key(),
          title: 'A handheld or a vest',
          body: 'Aid is only at The Oval, so a long loop is five plus miles between refills.',
        },
        {
          _type: 'gearItem',
          _key: key(),
          title: 'One drop bag',
          body:
            'It stays at The Oval all day and you pass it every loop, so it does the work ' +
            'a crew would.',
        },
        {
          _type: 'gearItem',
          _key: key(),
          title: 'Layers you can shed',
          body: 'An October morning in Cincinnati starts cold and rarely stays that way.',
        },
      ],
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
      _type: 'pageHeaderSection',
      _key: key(),
      eyebrow: 'All-time records',
      headline: 'Twenty years',
      headlineSecondLine: 'of fast days.',
      lede:
        'Course records, age-group records and the fastest finishes on file, for both ' +
        'distances.',
    },
    {
      _type: 'dynastiesSection',
      _key: key(),
      eyebrow: 'Course records',
      headline: 'The names on the board',
    },
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

// ── Contact ───────────────────────────────────────────────────────────────
// The mockup's most useful page, and the reason is the second half of the FAQ:
// the list of things the race publishes no answer to anywhere. Every line is a
// question runners actually email about, so the list doubles as the brief for
// the race director and as free content the race is currently missing.
docs.push({
  _id: 'page-contact',
  _type: 'page',
  title: 'Contact',
  slug: { _type: 'slug', current: 'contact' },
  seoTitle: 'Contact | Stone Steps 50K',
  seoDescription:
    'Questions about the Stone Steps 50K and 27K? Reach race director David Corfman directly.',
  pageBuilder: [
    {
      _type: 'pageHeaderSection',
      _key: key(),
      eyebrow: 'Get in touch',
      headline: 'Ask the',
      headlineSecondLine: 'race director.',
      lede:
        'Whatever you need answered, you get an answer. Course questions, entry transfers, ' +
        'volunteering, or whether your shoes are aggressive enough.',
    },
    {
      _type: 'contactSection',
      _key: key(),
      eyebrow: 'Send a message',
      headline: 'Write to the race',
      subjects: [
        'Course or race day question',
        'Registration or transfer',
        'Volunteering',
        'Sponsorship',
        'Results correction',
        'Something else',
      ],
      communityNote:
        'The Facebook group is where course conditions, carpools and last-minute changes ' +
        'actually get posted.',
    },
    {
      _type: 'faqKioskSection',
      _key: key(),
      eyebrow: 'Before you write',
      headline: 'Answered already',
      // Every answer below is drawn from what the race actually publishes, on
      // RunSignUp or its own site. Nothing here is inferred.
      items: [
        {
          _type: 'faqCard',
          _key: key(),
          question: 'What does my entry include?',
          answer:
            'A race t-shirt and a timing chip, plus aid at the end of every loop. The 50K ' +
            'shirt is a tech tee. Entries also fund the annual donation to Cincinnati Parks.',
        },
        {
          _type: 'faqCard',
          _key: key(),
          question: 'What time does it start?',
          answer:
            'The 50K starts at 8:00 am and the 27K at 8:30 am. Trekkers may start an hour ' +
            'earlier in each case, and 27K trekkers are not eligible for age group or ' +
            'overall awards. The course closes at about 4:30 pm.',
        },
        {
          _type: 'faqCard',
          _key: key(),
          question: 'Where does the race start?',
          answer:
            'The Oval, Area 13, inside Mt. Airy Forest in Cincinnati. Both distances start ' +
            'and finish in the same place, and you pass back through it at the end of ' +
            'every loop.',
        },
        {
          _type: 'faqCard',
          _key: key(),
          question: 'What is the course actually like?',
          answer:
            'Hilly single track with roots, rocks and the occasional tree blow down. The ' +
            '50K is four 5.3 mile loops alternating with three 3.2 mile loops, for 10,726 ' +
            'feet of elevation change. Nothing about it is flat.',
        },
        {
          _type: 'faqCard',
          _key: key(),
          question: 'How much is it, and when do prices go up?',
          answer:
            'Entry is $35 through January 31, $50 from February 1 through September 30, ' +
            'and $60 from October 1 to race day, plus a processing fee. The 50K is capped ' +
            'at 120 entries and the 27K at 130.',
        },
        {
          _type: 'faqCard',
          _key: key(),
          question: 'Where do I find past results?',
          answer:
            'The records page carries course and age-group records for both distances, ' +
            'calculated from the finishing times themselves. The complete archive, ' +
            'including years this site does not hold, lives on RunSignUp.',
        },
      ],
      unansweredHeading: 'Still to confirm with the race director',
      unansweredNote:
        'The race publishes no answer to these anywhere. They are the highest-value ' +
        'content to add, and every one of them is a question runners email to ask.',
      unanswered: [
        'Packet pickup: when it opens and where',
        'Pre-race briefing time',
        'Awards categories and when they are handed out',
        'Parking and spectator access',
        'Drop bag, crew and pacer policy',
        'Whether dogs are allowed on course',
        'Refund, transfer and deferral policy',
      ],
    },
    {
      _type: 'imageTextSection',
      _key: key(),
      image: img(PHOTO.runnersPortrait, 'Two runners at the finish at The Oval.'),
      eyebrow: 'Coming from out of town',
      headline: 'Stay downtown or near CVG',
      body: [
        {
          _type: 'block',
          _key: key(),
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: key(),
              marks: [],
              text:
                'Mt. Airy Forest sits close to both downtown Cincinnati and the airport ' +
                'area, so either works as a base. It is a couple of miles from I-75 and ' +
                'I-74 off Colerain Avenue.',
            },
          ],
        },
      ],
      imageSide: 'right',
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
    { _type: 'navLink', _key: key(), label: 'Results', linkType: 'internal', href: '/results' },
    // The RunSignUp link used to sit here too, also labelled "Results", which
    // put the word in the header twice, side by side. The archive at /results is
    // the better destination and RunSignUp is still one click away in the
    // footer's "Elsewhere" column.
  ],
  headerCta: {
    show: true,
    label: 'Register',
    link: { _type: 'navLink', label: 'Register', linkType: 'external', externalUrl: REGISTER },
  },
  // Sits under the footer's centred logo. One line, no adjectives doing work.
  tagline: "Cincinnati's longest running ultramarathon, on the same trail since 2003.",
  footerColumns: [
    {
      _type: 'footerColumn',
      _key: key(),
      title: 'The race',
      links: [
        { _type: 'footerLink', _key: key(), label: 'The Race', href: '/' },
        { _type: 'footerLink', _key: key(), label: 'Course', href: '/course' },
        { _type: 'footerLink', _key: key(), label: 'Records', href: '/records' },
        { _type: 'footerLink', _key: key(), label: 'Results archive', href: '/results' },
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
