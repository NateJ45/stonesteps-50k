// A distance the race offers: the 50K and the 27K.
//
// Each one owns its own RunSignUp event id, which is what makes a per-distance
// Register button possible instead of dumping everyone on the generic race page.
// Verified from the RunSignUp event chain: 944330 is the 50K and 944331 the 27K.
//
// Registered in index.ts, drag-orderable under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';
import { confirmedField } from './_confirmedField';

export const distance = defineType({
  name: 'distance',
  title: 'Distance',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'As the race writes it. Examples: "50K", "27K".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Lowercase identifier used in results queries. Examples: "50k", "27k".',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kicker',
      title: 'Kicker',
      type: 'string',
      description: 'The half-line above the name on the entry ticket. Example: "The full ultra".',
    }),
    defineField({
      name: 'loopStructure',
      title: 'Loop structure',
      type: 'string',
      description:
        'In the race\'s own words. It publishes "five plus" and "three plus" mile loops ' +
        'rather than exact per-loop mileages, so do not invent precise figures here.',
    }),
    // A DISTANCE HAS A LENGTH AND A LOOP COUNT, and until now those facts only
    // existed inside the loopStructure sentence, where nothing could read them.
    // Same reasoning as storing a finish time in seconds rather than as
    // "3:40:56": a number can be shown, compared and checked; a sentence cannot.
    defineField({
      name: 'totalMiles',
      title: 'Total distance (miles)',
      type: 'number',
      description:
        'The loops for this distance added up, taken from the 2006 to 2009 timing ' +
        'sheets: 30.8 for the 50K (four 5.3s and three 3.2s) and 17.0 for the 27K. ' +
        'Shown on the ticket because "50K" alone tells a US trail runner very little. ' +
        'Leave empty rather than rounding to a nicer number.',
    }),
    defineField({
      name: 'loopCount',
      title: 'Number of loops',
      type: 'number',
      description: 'Seven for the 50K, four for the 27K.',
    }),
    defineField({
      name: 'blurb',
      title: 'Description',
      type: 'text',
      rows: 4,
      options: {
        canvasApp: {
          purpose:
            'Plain description of what running this distance is actually like. Concrete ' +
            'terrain details beat adjectives. No em-dashes.',
        },
      },
    }),
    defineField({
      name: 'includes',
      title: 'What entry includes',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'One line each. Shown on the tear-off stub of the entry ticket.',
    }),
    defineField({
      name: 'startTime',
      title: 'Start time',
      type: 'string',
      description:
        'Verified from the RunSignUp event details: the 50K starts at 8:00 am and the ' +
        '27K at 8:30 am.',
    }),
    defineField({
      name: 'trekkerNote',
      title: 'Early (trekker) start',
      type: 'string',
      description:
        'Verified: 50K trekkers may start at 7:00 am, 27K trekkers at 8:00 am and are ' +
        'ineligible for age group and overall awards.',
    }),
    defineField({
      name: 'entryCap',
      title: 'Entry cap',
      type: 'number',
      description: 'Verified from RunSignUp: 120 for the 50K, 130 for the 27K.',
    }),
    defineField({
      name: 'runSignUpEventId',
      title: 'RunSignUp event id (current year)',
      type: 'number',
      description:
        'Makes the Register button link straight to this distance. 2026: 1104726 is the ' +
        '50K, 1104727 the 27K.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description: 'The featured distance gets the corner flag on its ticket.',
      options: { canvasApp: { exclude: true } },
    }),
    confirmedField("Tick once this distance's times and cap are confirmed for this edition."),
    orderRankField({ type: 'distance' }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'kicker', confirmed: 'confirmed' },
    prepare: ({ title, subtitle, confirmed }) => ({
      title: title ?? '(no name)',
      subtitle: [subtitle, confirmed ? null : 'NOT CONFIRMED'].filter(Boolean).join(' · '),
    }),
  },
});
