// One finisher, one year, one distance.
//
// THE ONE DECISION EVERYTHING ELSE RESTS ON: the time is stored as a NUMBER of
// seconds, never as "3:40:56". A string cannot be sorted, compared or
// minimised, so a string time forces every record to be computed by a human and
// then stored by hand, which is exactly how the live site ended up publishing
// the same 1:58:36 as both 2010 and 2011 in two different tables.
//
// Stored as seconds, the course record is `| order(timeSeconds asc)[0]`, the
// top ten is `[0...10]`, and the age-bracket records are one reduce in
// TypeScript. Nothing is hand-maintained, so nothing can disagree with itself.
// Add a year of results and every table on the site updates itself.
//
// Registered in index.ts, listed under "The Race" in structure.ts.
// Populated by scripts/import-results.mjs from the RunSignUp public API.

import { defineType, defineField } from 'sanity';

export const raceResult = defineType({
  name: 'raceResult',
  title: 'Result',
  type: 'document',
  fields: [
    defineField({
      name: 'athlete',
      title: 'Athlete',
      type: 'reference',
      to: [{ type: 'athlete' }],
      description: 'Never retype a name here. Point at the athlete document.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'distance',
      title: 'Distance',
      type: 'reference',
      to: [{ type: 'distance' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: 'timeSeconds',
      title: 'Finish time (seconds)',
      type: 'number',
      // Read the file header before changing this to a string: every record on the
      // site is derived by ordering on this number.
      description: 'Whole seconds, not a clock time. 3:40:56 is 13256.',
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'gender',
      title: 'Gender',
      type: 'string',
      description: 'As recorded by the timer. Splits the records tables.',
      options: {
        list: [
          { title: 'Men', value: 'M' },
          { title: 'Women', value: 'F' },
          { title: 'Non-binary', value: 'X' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'age',
      title: 'Age on race day',
      type: 'number',
      // Brackets are defined in code, in src/lib/age-brackets.ts, so they can be unit
      // tested rather than typed per row.
      description: "The runner's age on race day. Sorts them into a bracket on the records page.",
    }),
    defineField({
      name: 'place',
      title: 'Overall place',
      type: 'number',
    }),
    defineField({
      name: 'timeSource',
      title: 'Where the time came from',
      type: 'string',
      // RunSignUp only populates chip time from 2024 on. Earlier years carry gun time,
      // and the results table says so rather than implying a precision it does not have.
      description:
        'Whether the clock started at the gun or at the chip. Shown on the results table.',
      options: {
        list: [
          { title: 'Chip time', value: 'chip' },
          { title: 'Gun time', value: 'gun' },
        ],
        layout: 'radio',
      },
      initialValue: 'gun',
    }),
    defineField({
      name: 'trekker',
      title: 'Ran as a trekker',
      type: 'boolean',
      // Trekkers are, in the words of the race, ineligible for age group and overall
      // awards. The exclusion happens in src/lib/age-brackets.ts.
      description:
        'Tick if this runner took the optional early start. The time still shows, but it is ' +
        'left out of the records.',
      options: { canvasApp: { exclude: true } },
    }),
    defineField({
      name: 'sourceNote',
      title: 'Note on the source',
      type: 'string',
      description:
        'Only for genuine disagreements in the published source. Shown as a footnote ' +
        'marker on the results table.',
    }),
  ],
  preview: {
    select: {
      athlete: 'athlete.name',
      distance: 'distance.name',
      year: 'year',
      seconds: 'timeSeconds',
      place: 'place',
    },
    prepare: ({ athlete, distance, year, seconds, place }) => {
      const h = Math.floor((seconds ?? 0) / 3600);
      const m = Math.floor(((seconds ?? 0) % 3600) / 60);
      const s = (seconds ?? 0) % 60;
      const time = seconds
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : '';
      return {
        title: athlete ?? '(no athlete)',
        subtitle: [year, distance, time, place ? `#${place}` : null].filter(Boolean).join(' · '),
      };
    },
  },
  orderings: [
    {
      title: 'Fastest first',
      name: 'timeAsc',
      by: [{ field: 'timeSeconds', direction: 'asc' }],
    },
    {
      title: 'Newest first',
      name: 'yearDesc',
      by: [
        { field: 'year', direction: 'desc' },
        { field: 'timeSeconds', direction: 'asc' },
      ],
    },
  ],
});
