// A distance the race offers: the 50K and the 27K.
//
// Each one owns its own RunSignUp event id, which is what makes a per-distance
// Register button possible instead of dumping everyone on the generic race page.
// Verified from the RunSignUp event chain: 944330 is the 50K and 944331 the 27K.
//
// Registered in index.ts, drag-orderable under "The Race" in structure.ts.

import { defineType, defineArrayMember, defineField } from 'sanity';
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
      // The race publishes "five plus" and "three plus" mile loops rather than exact
      // per-loop mileages, so precise figures here would be invented.
      description:
        'How the loops are structured, in the words the race uses. Example: "four five-plus ' +
        'mile loops". Do not invent exact per-loop mileages.',
    }),
    // A DISTANCE HAS A LENGTH AND A LOOP COUNT, and until now those facts only
    // existed inside the loopStructure sentence, where nothing could read them.
    // Same reasoning as storing a finish time in seconds rather than as
    // "3:40:56": a number can be shown, compared and checked; a sentence cannot.
    defineField({
      name: 'totalMiles',
      title: 'Total distance (miles)',
      type: 'number',
      // From the 2006 to 2009 timing sheets: 30.8 miles for the 50K (four 5.3s and
      // three 3.2s) and 17.0 for the 27K. It is on the ticket because "50K" alone
      // tells a US trail runner very little.
      description:
        'The loops for this distance added up, in miles. Shown on the entry ticket. Leave ' +
        'empty rather than rounding to a nicer number.',
    }),
    defineField({
      name: 'loopCount',
      title: 'Number of loops',
      type: 'number',
      // Seven loops for the 50K, four for the 27K.
      description: 'How many loops make up this distance, as a number.',
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
      // Verified from the RunSignUp event details: the 50K starts at 8:00 am, the
      // 27K at 8:30 am.
      description: 'When this distance starts, written as it should read. Example: "8:00 am".',
    }),
    defineField({
      name: 'trekkerNote',
      title: 'Early (trekker) start',
      type: 'string',
      // Verified: 50K trekkers may start at 7:00 am, 27K trekkers at 8:00 am, and are
      // ineligible for age group and overall awards.
      description: 'One line about the early start for this distance. Leave blank if it has none.',
    }),
    defineField({
      name: 'entryCap',
      title: 'Entry cap',
      type: 'number',
      // NO YEAR'S NUMBERS IN THE DESCRIPTION. It used to read "120 for the
      // 50K, 130 for the 27K (re-checked 2026-09-11)", which is a fact about
      // 2026 sitting in the permanent help text for a field that changes every
      // year. Rehearsing 2027 in the Studio, it read as instruction rather than
      // history (2026-09-12). It says where to LOOK instead, which stays true.
      description:
        'How many places this distance takes. Copy the number from the participant cap on ' +
        'RunSignUp. Leave it empty rather than guessing.',
    }),
    defineField({
      name: 'runSignUpEventId',
      title: 'RunSignUp event id (current year)',
      type: 'number',
      // Also no year's numbers: see the note on Entry cap. This one matters
      // more, because a stale id sends a runner to a closed event and the
      // description used to name the ids for one particular year.
      // A wrong id sends an entrant to a closed event, so re-check it every rollover.
      description:
        'Sends the Register button straight to this distance. A new number every year: ' +
        "take the eventId from the address bar of this year's RunSignUp event.",
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description: 'The featured distance gets the corner flag on its ticket.',
      options: { canvasApp: { exclude: true } },
    }),
    defineField({
      name: 'feeTiers',
      title: 'Entry fee tiers',
      type: 'array',
      // The ladder lives here, not on The Race, because the two distances are priced
      // differently at every stage. The race-level tiers still exist for the JSON-LD
      // offers and the Studio checkup.
      description:
        'Entry prices for this distance, in date order, cheapest first. Each needs a label, ' +
        'an amount and the date it ends.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'distanceFeeTier',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string' }),
            defineField({ name: 'amount', title: 'Amount (USD)', type: 'number' }),
            defineField({ name: 'endsOn', title: 'Available until', type: 'date' }),
          ],
          // THE ROW SHOWS ITS END DATE. Rehearsing the 2027 rollover in the
          // Studio (2026-09-12), the checklist said "1 of 6 price tiers ended
          // in the past" and the list above showed "$35 / Through January 31"
          // with no year anywhere: the only way to find the stale one was to
          // open all six. The date is the whole reason a tier expires, so it
          // belongs on the row.
          preview: {
            select: { label: 'label', amount: 'amount', endsOn: 'endsOn' },
            prepare: ({ label, amount, endsOn }) => ({
              title: amount != null ? `$${amount}` : '(no amount)',
              subtitle: [label, endsOn ? `ends ${endsOn}` : 'no end date']
                .filter(Boolean)
                .join('  ·  '),
            }),
          },
        }),
      ],
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
