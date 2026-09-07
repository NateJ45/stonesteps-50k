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
  CalendarIcon,
  ClockIcon,
  ComponentIcon,
  HeartIcon,
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
    defineField({
      name: 'image',
      title: 'Hero photograph',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe what is happening in the photo, not the file name.',
          validation: (Rule) => Rule.required(),
        }),
      ],
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
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({
      title: title || 'Course features',
      subtitle: 'Fills itself from Course features',
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
              title: 'Distance label',
              type: 'string',
              description:
                'The race publishes "5+" and "3+" rather than exact per-loop mileages. ' +
                'Do not sharpen that into a precision the race does not claim.',
            }),
            defineField({
              name: 'inShortDistance',
              title: 'Included in the 27K',
              type: 'boolean',
              initialValue: false,
            }),
          ],
          preview: {
            select: { kind: 'kind', miles: 'miles', inShort: 'inShortDistance' },
            prepare: ({ kind, miles, inShort }) => ({
              title: `${kind === 'short' ? 'Short' : 'Long'} ${miles ?? ''}`.trim(),
              subtitle: inShort ? 'Both distances' : '50K only',
            }),
          },
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

/** Every race block, in the order they appear in the insert menu. */
export const raceSectionSchemas = [
  raceHeroSection,
  distanceTicketsSection,
  recordsBoardSection,
  raceScheduleSection,
  courseFeaturesSection,
  loopCardSection,
  elevationSection,
  sponsorPatchesSection,
];

export const RACE_SECTION_TYPES = raceSectionSchemas.map((s) => ({ type: s.name }));
