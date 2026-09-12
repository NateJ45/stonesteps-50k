// Page-builder blocks specific to the race.
//
// These sit alongside the starter's general library in sections.ts, and follow
// the same contract. Read that file's conventions before adding to this one.
//
// TWO RULES THAT BITE.
//
// 1. NO block here may declare a field named tone, surface, background, accent
//    or bandColor. Surface cadence is owned by src/lib/sectionCadence.ts, which
//    alternates automatically, and src/lib/section-fields.test.ts fails the
//    build on a naive substring match for those names. Giving a block its own
//    colour field would trade the automatic cadence for a convenience.
//
// 2. Every ENUM added here must also be added to NON_STEGA_FIELDS in
//    src/lib/cms-preview.ts, in the same commit. Stega hides about a kilobyte
//    of invisible markers inside every string it touches, so an encoded value
//    never equals the literal it is compared against, and the block silently
//    renders the wrong branch IN THE PREVIEW ONLY. That is the hardest class of
//    bug to notice, because the live site is fine.
//
// MOST OF THESE BLOCKS ARE SELF-FILLING. A records board or a sponsor row
// takes almost no fields: it queries the collections. The editor chooses where
// the section sits and what it is called, not what is in it, because the
// contents are derived and must not be retyped. See src/lib/queries.ts.

import { defineType, defineField, defineArrayMember } from 'sanity';
import {
  ActivityIcon,
  ArrowRightIcon,
  BlockElementIcon,
  EnvelopeIcon,
  HelpCircleIcon,
  CalendarIcon,
  ClockIcon,
  ComponentIcon,
  HeartIcon,
  SunIcon,
  ImageIcon,
  PinIcon,
  StarFilledIcon,
  TrendUpwardIcon,
} from '@sanity/icons';

/* ---------- Hero ---------------------------------------------------------- */

export const raceHeroSection = defineType({
  name: 'raceHeroSection',
  title: 'Race hero',
  type: 'object',
  icon: ActivityIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow (optional)',
      type: 'string',
      description: 'The small label above the headline. Example: "Sunday, October 25, 2026".',
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      description:
        'Set in the condensed display face, which is CAPS ONLY. Keep it short: this is ' +
        'the biggest type on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subhead',
      title: 'Subhead',
      type: 'text',
      rows: 3,
      options: {
        canvasApp: {
          purpose: 'Two plain sentences about what the race is. No adjectives doing the work.',
        },
      },
    }),
    // THE HERO IS A SLIDESHOW, and the cap is the point of the field rather
    // than a limitation of it. Every photograph here loads on the first paint,
    // because a CSS cross-fade has no way to fetch the next one on demand; four
    // large images is already most of the page's weight. The old WordPress site
    // solved the same wish with a 20-second 720p video, which cost far more and
    // showed no more of the race.
    //
    // ONE PHOTOGRAPH IS A COMPLETE ANSWER. Leave a single image here and the
    // hero renders it still, with no animation and nothing to cross-fade to.
    defineField({
      name: 'images',
      title: 'Hero photographs',
      description:
        'One photograph, or up to four to cross-fade slowly between. Tall shots ' +
        'work best: on a wide screen this is a full-height column down the right ' +
        'of the page. The first one is what most people see, so make it the good one.',
      type: 'array',
      validation: (Rule) => Rule.max(4),
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description:
                'Describe what is happening in the photo, not the file name. Only ' +
                'the first photograph is announced to a screen reader: the rest are ' +
                'the same subject again and reading all four would be noise.',
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
    }),
    // The single-image field this replaced. Kept OUT of the Studio but still
    // read by the query, so a document written before the slideshow existed
    // renders its photograph instead of going blank. Nothing writes it now.
    defineField({
      name: 'image',
      title: 'Hero photograph (replaced by the list above)',
      type: 'image',
      hidden: true,
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    defineField({
      name: 'showCountdown',
      title: 'Show the race clock countdown',
      type: 'boolean',
      initialValue: true,
      description: 'Counts down to the race date set on The Race.',
      options: { canvasApp: { exclude: true } },
    }),
    defineField({ name: 'primaryCta', title: 'Primary button', type: 'ctaBlock' }),
    defineField({ name: 'secondaryCta', title: 'Secondary button', type: 'ctaBlock' }),
  ],
  preview: {
    select: { title: 'headline', subtitle: 'eyebrow', media: 'image' },
    prepare: ({ title, subtitle, media }) => ({
      title: title || 'Race hero',
      subtitle: subtitle || 'Race hero',
      media: media || ActivityIcon,
    }),
  },
});

/* ---------- Entry tickets ------------------------------------------------- */

export const distanceTicketsSection = defineType({
  name: 'distanceTicketsSection',
  title: 'Entry tickets (both distances)',
  type: 'object',
  icon: ComponentIcon,
  // SELF-FILLING: pulls every `distance` document in their drag order. There is
  // no picker, because the distances are the distances.
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'note',
      title: 'Pricing note (optional)',
      type: 'string',
      description:
        'One line under the tickets. The fee tiers themselves come from The Race, so do ' +
        'not retype prices here.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Entry tickets', subtitle: 'Fills itself from Distances' }),
  },
});

/* ---------- Records ------------------------------------------------------- */

export const recordsBoardSection = defineType({
  name: 'recordsBoardSection',
  title: 'All-time records',
  type: 'object',
  icon: StarFilledIcon,
  // SELF-FILLING and, more than that, SELF-DERIVING. Course records, top tens
  // and age brackets are all computed from the results archive merged with the
  // transcribed historical rows. Nothing about this table is typed by hand,
  // which is the entire point: see src/lib/age-brackets.ts.
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'intro',
      title: 'Intro (optional)',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    prepare: () => ({
      title: 'All-time records',
      subtitle: 'Derived from Results. Not editable here, on purpose',
    }),
  },
});

/* ---------- Race-day schedule --------------------------------------------- */

export const raceScheduleSection = defineType({
  name: 'raceScheduleSection',
  title: 'Race-day schedule',
  type: 'object',
  icon: ClockIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
  ],
  preview: {
    prepare: () => ({ title: 'Race-day schedule', subtitle: 'Fills itself from Schedule items' }),
  },
});

/* ---------- Course features ----------------------------------------------- */

export const courseFeaturesSection = defineType({
  name: 'courseFeaturesSection',
  title: 'Course features',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'cta', title: 'Link button (optional)', type: 'ctaBlock' }),
    defineField({
      name: 'image',
      title: 'Photograph (optional)',
      type: 'image',
      options: { hotspot: true },
      description:
        'Sits beside the list and stays put while the features scroll past it. Use a tall ' +
        'crop: it is held in view for the length of the section.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'caption',
          title: 'Photo caption (optional)',
          type: 'string',
          description: 'One line under the photograph: what the trail is like, who is pictured.',
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'headline', media: 'image' },
    prepare: ({ title, media }) => ({
      title: title || 'Course features',
      subtitle: 'Fills itself from Course features',
      media: media || PinIcon,
    }),
  },
});

/* ---------- The loop punch card ------------------------------------------- */

export const loopCardSection = defineType({
  name: 'loopCardSection',
  title: 'Loop order (punch card)',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'loops',
      title: 'The loops, in order',
      type: 'array',
      description:
        'The 50K runs all of these; the 27K runs the ones marked as included. The card ' +
        'punches a hole for every loop the 27K covers, so the graphic carries the ' +
        'difference between the distances rather than just decorating it.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'loop',
          fields: [
            defineField({
              name: 'kind',
              title: 'Long or short',
              type: 'string',
              // ENUM: also listed in NON_STEGA_FIELDS.
              options: {
                list: [
                  { title: 'Long', value: 'long' },
                  { title: 'Short', value: 'short' },
                ],
                layout: 'radio',
              },
              initialValue: 'long',
            }),
            defineField({
              name: 'miles',
              title: 'Loop distance',
              type: 'string',
              description:
                'What the race itself measured: 5.3 for a long loop, 3.2 for a short one. ' +
                'Its public copy still says "5+" and "3+", but its timing sheets for 2006 ' +
                'through 2009 all carry the same split marks, so these are the numbers the ' +
                'race itself ran the clock against. See the note field below.',
            }),
            defineField({
              name: 'throughMiles',
              title: 'Total miles at the end of this loop',
              type: 'string',
              description:
                'What the mile counter reads when you come back through The Oval. Taken ' +
                'from the same split columns: 5.3, 8.5, 13.8, 17, 22.3, 25.5, then the ' +
                'finish. This is the column a runner actually uses on the day.',
            }),
            defineField({
              name: 'inShortDistance',
              title: 'Included in the 27K',
              type: 'boolean',
              initialValue: false,
            }),
          ],
          preview: {
            select: {
              kind: 'kind',
              miles: 'miles',
              through: 'throughMiles',
              inShort: 'inShortDistance',
            },
            prepare: ({ kind, miles, through, inShort }) => ({
              title:
                `${kind === 'short' ? 'Short' : 'Long'} ${miles ?? ''}`.trim() +
                (through ? ` (through ${through})` : ''),
              subtitle: inShort ? 'Both distances' : '50K only',
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'aside',
      title: 'Notes beside the card',
      type: 'array',
      description:
        'Short answers that belong next to the loop order: what the 27K is, where aid is, ' +
        'where the start and finish are, and the cutoff. Anything unconfirmed should say so ' +
        'rather than being left off the page.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'loopNote',
          fields: [
            defineField({
              name: 'title',
              title: 'Heading',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'body', title: 'Body', type: 'text', rows: 3 }),
            defineField({
              name: 'confirmed',
              title: 'Confirmed by the race director',
              type: 'boolean',
              initialValue: true,
              description:
                'Untick to show the "Not confirmed" marker under this note. The cutoff is ' +
                'the one that usually needs it.',
              options: { canvasApp: { exclude: true } },
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'body' } },
        }),
      ],
    }),
    defineField({
      name: 'legend',
      title: 'Legend',
      type: 'string',
      description:
        'States the punch metaphor in words, for anyone who does not read it from the ' +
        'graphic. Not optional in practice: the holes carry meaning.',
    }),
    defineField({
      name: 'sourceNote',
      title: 'Where the mileages came from',
      type: 'text',
      rows: 3,
      description:
        'The loop distances are more exact than anything the race publishes today, so the ' +
        'page has to say where they came from. Without this line the numbers read as ' +
        'invented, which is worse than saying "5+".',
    }),
  ],
  preview: {
    select: { title: 'headline', loops: 'loops' },
    prepare: ({ title, loops }) => ({
      title: title || 'Loop order',
      subtitle: `${Array.isArray(loops) ? loops.length : 0} loops`,
    }),
  },
});

/* ---------- Elevation ----------------------------------------------------- */

export const elevationSection = defineType({
  name: 'elevationSection',
  title: 'Elevation profile',
  type: 'object',
  icon: TrendUpwardIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'intro', title: 'Intro (optional)', type: 'text', rows: 3 }),
    defineField({
      name: 'totalGain',
      title: 'Total elevation change',
      type: 'string',
      description: 'Verified: 10,726 ft.',
    }),
  ],
  preview: {
    select: { title: 'headline', gain: 'totalGain' },
    prepare: ({ title, gain }) => ({
      title: title || 'Elevation profile',
      subtitle: gain ? `${gain} total` : 'Elevation profile',
    }),
  },
});

/* ---------- Sponsors ------------------------------------------------------ */

export const sponsorPatchesSection = defineType({
  name: 'sponsorPatchesSection',
  title: 'Sponsors (patches)',
  type: 'object',
  icon: HeartIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
  ],
  preview: {
    prepare: () => ({ title: 'Sponsors', subtitle: 'Fills itself from Sponsors' }),
  },
});

/* ---------- Page header ---------------------------------------------------- */

export const pageHeaderSection = defineType({
  name: 'pageHeaderSection',
  title: 'Page header',
  type: 'object',
  icon: BlockElementIcon,
  // The band at the top of an inner page: eyebrow, big display title, a lede,
  // and optionally a photograph beside it.
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Title',
      type: 'string',
      description:
        'Set in the condensed display face, which is CAPS ONLY. Use the second-line field ' +
        'below rather than typing HTML: the mockup allowed a raw line-break tag here, and ' +
        'that becomes an injection surface the moment the value comes from the CMS.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'headlineSecondLine',
      title: 'Second line of the title (optional)',
      type: 'string',
      description: 'Breaks the title onto two lines at a point you choose, safely.',
    }),
    defineField({ name: 'lede', title: 'Lede', type: 'text', rows: 3 }),
    defineField({
      name: 'image',
      title: 'Photograph (optional)',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe what is in the picture, not the file name.',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'headline', subtitle: 'eyebrow', media: 'image' },
    prepare: ({ title, subtitle, media }) => ({
      title: title || 'Page header',
      subtitle: subtitle || 'Page header',
      media: media || BlockElementIcon,
    }),
  },
});

/* ---------- Contact -------------------------------------------------------- */

export const contactSection = defineType({
  name: 'contactSection',
  title: 'Contact form and details',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'subjects',
      title: 'What is this about? (the dropdown)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'One option per line. Sent with the message so it can be triaged.',
    }),
    defineField({
      name: 'communityNote',
      title: 'A line about the Facebook group',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    prepare: () => ({
      title: 'Contact form and details',
      subtitle: 'Director, community and start line come from The Race',
    }),
  },
});

/* ---------- The FAQ kiosk -------------------------------------------------- */

export const faqKioskSection = defineType({
  name: 'faqKioskSection',
  title: 'FAQ (trailhead kiosk)',
  type: 'object',
  icon: HelpCircleIcon,
  // A recessed noticeboard holding pinned index cards. The recess is an INSET
  // shadow rather than a raised one, which is what makes it read as a board you
  // look into rather than a card sitting on the page.
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faqCard',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              rows: 4,
              options: {
                canvasApp: {
                  purpose:
                    'Answer the question directly in the first sentence. No preamble. Say ' +
                    'plainly if the answer is not known yet rather than hedging.',
                },
              },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'question' } },
        }),
      ],
    }),
    defineField({
      name: 'unansweredHeading',
      title: 'Heading for the open questions',
      type: 'string',
      description: 'For example: "Still to confirm with the race director".',
    }),
    defineField({
      name: 'unansweredNote',
      title: 'Why they are open',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'unanswered',
      title: 'The open questions',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Questions the race publishes no answer to. Listing them is not an admission, it ' +
        'is the most useful thing on the page: every one is something a runner emails to ' +
        'ask, and answering them is free content the race is currently missing. Delete a ' +
        'line as it gets answered.',
    }),
  ],
  preview: {
    select: { title: 'headline', items: 'items', open: 'unanswered' },
    prepare: ({ title, items, open }) => ({
      title: title || 'FAQ',
      subtitle: `${Array.isArray(items) ? items.length : 0} answered, ${
        Array.isArray(open) ? open.length : 0
      } still open`,
    }),
  },
});

/* ---------- The ticker ----------------------------------------------------- */

export const tickerSection = defineType({
  name: 'tickerSection',
  title: 'Ticker (scrolling strip)',
  type: 'object',
  icon: ArrowRightIcon,
  fields: [
    defineField({
      name: 'items',
      title: 'Phrases',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Short facts, three to eight of them. They scroll past on a loop, so each one has to ' +
        'read on its own: nobody reads a ticker from the start.',
      validation: (Rule) => Rule.min(3).max(10),
    }),
  ],
  preview: {
    select: { items: 'items' },
    prepare: ({ items }) => ({
      title: 'Ticker',
      subtitle: Array.isArray(items) ? items.slice(0, 2).join(' | ') : undefined,
    }),
  },
});

/* ---------- Giving back ---------------------------------------------------- */

export const parksSection = defineType({
  name: 'parksSection',
  title: 'Giving back (parks band)',
  type: 'object',
  icon: HeartIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      description:
        'The donation figure itself lives on The Race, so it is not retyped here. Write the ' +
        'line around it.',
    }),
    defineField({ name: 'body', title: 'Body', type: 'text', rows: 4 }),
    defineField({
      name: 'image',
      title: 'Photograph',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({ name: 'caption', title: 'Photo caption (optional)', type: 'string' }),
    defineField({
      name: 'showDirector',
      title: 'Show the race director byline',
      type: 'boolean',
      initialValue: true,
      description: 'Reads the name and the note from The Race.',
      options: { canvasApp: { exclude: true } },
    }),
  ],
  preview: {
    select: { title: 'headline', media: 'image' },
    prepare: ({ title, media }) => ({
      title: title || 'Giving back',
      subtitle: 'Donation figure comes from The Race',
      media: media || HeartIcon,
    }),
  },
});

/* ---------- Race-day weather ---------------------------------------------- */

export const raceWeatherSection = defineType({
  name: 'raceWeatherSection',
  title: 'Race-day weather since 2003',
  type: 'object',
  icon: SunIcon,
  description:
    'The weather on every race day we have a date for: a temperature strip, one bar per ' +
    'year, and a sentence computed from it. The data is a committed file ' +
    '(src/data/raceDayWeather.json, built by scripts/build-weather.mjs), not a field here.',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string' }),
    defineField({
      name: 'intro',
      title: 'Intro (optional)',
      type: 'text',
      rows: 3,
      description: 'Leave empty to use the sentence computed from the data.',
    }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({
      title: title || 'Race-day weather',
      subtitle: 'Data from src/data/raceDayWeather.json',
      media: SunIcon,
    }),
  },
});

/* ---------- The names on the board ---------------------------------------- */

export const dynastiesSection = defineType({
  name: 'dynastiesSection',
  title: 'Record holders (callouts)',
  type: 'object',
  icon: StarFilledIcon,
  // SELF-DERIVING, like the records board. The mockup hardcoded two names and
  // two times, which is the same hand-maintained duplication the records system
  // exists to remove: a course record that changed would leave this band quietly
  // wrong while looking authoritative. These are computed from the same merged
  // set the records tables use.
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'cta', title: 'Link button (optional)', type: 'ctaBlock' }),
  ],
  preview: {
    prepare: () => ({
      title: 'Record holders',
      subtitle: 'Derived from Results. Not editable here, on purpose',
    }),
  },
});

/* ---------- Gear ----------------------------------------------------------- */

export const gearSection = defineType({
  name: 'gearSection',
  title: 'What to bring (gear)',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'gearItem',
          fields: [
            defineField({
              name: 'title',
              title: 'Item',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Why',
              type: 'text',
              rows: 3,
              options: {
                canvasApp: {
                  purpose:
                    'Say why it matters on THIS course specifically. Generic trail-running ' +
                    'advice is not worth the space.',
                },
              },
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'body' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'headline', items: 'items' },
    prepare: ({ title, items }) => ({
      title: title || 'What to bring',
      subtitle: (Array.isArray(items) ? items.length : 0) + ' items',
    }),
  },
});

/**
 * A band that is nothing but a photograph, edge to edge.
 *
 * WHY A BLOCK AND NOT A SETTING ON ANOTHER ONE. Its job is to be a BREAK: the
 * page runs dense band, dense band, dense band, and the eye needs somewhere to
 * rest that is not more paper. That makes it a thing an editor places between
 * two sections, which is exactly what a page-builder block is for.
 *
 * It carries no heading and no copy on purpose. The moment type goes on top of
 * it, it needs a scrim and a measured contrast ratio, and it stops being a
 * breath and becomes another content section with a photographic background.
 * There is already a component for that.
 */
export const photoBandSection = defineType({
  name: 'photoBandSection',
  title: 'Photograph band',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Photograph',
      type: 'image',
      options: { hotspot: true },
      description:
        'Runs the full width of the page. Use the hotspot to say what must stay ' +
        'in frame: this band is cropped hard on a phone.',
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'Describe what is happening in the photo. This one is NOT decoration: ' +
            'it is the only thing in its band, so a reader who cannot see it should ' +
            'be told what it shows.',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'caption',
      title: 'Caption (optional)',
      type: 'string',
      description:
        'A short line set into the corner. Good for a credit or a place. Leave it ' +
        'empty and the band is only the photograph.',
    }),
    defineField({
      name: 'height',
      title: 'Height',
      type: 'string',
      initialValue: 'standard',
      options: {
        list: [
          { title: 'Standard', value: 'standard' },
          { title: 'Tall', value: 'tall' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { media: 'image', subtitle: 'caption' },
    prepare: ({ media, subtitle }) => ({ title: 'Photograph band', subtitle, media }),
  },
});

/** Every race block, in the order they appear in the insert menu. */
export const raceSectionSchemas = [
  raceHeroSection,
  pageHeaderSection,
  contactSection,
  faqKioskSection,
  distanceTicketsSection,
  recordsBoardSection,
  raceScheduleSection,
  courseFeaturesSection,
  loopCardSection,
  elevationSection,
  sponsorPatchesSection,
  tickerSection,
  parksSection,
  raceWeatherSection,
  dynastiesSection,
  gearSection,
  photoBandSection,
];

export const RACE_SECTION_TYPES = raceSectionSchemas.map((s) => ({ type: s.name }));
