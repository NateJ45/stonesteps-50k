// A day the race was run, kept for the weather strip.
//
// WHY A DOCUMENT AND NOT A LIST IN THE REPO. The weather strip on the course
// page needs the date of every running. The historical ones are a committed
// file (scripts/data/race-days.json, recovered from RunSignUp and the Wayback
// Machine). Each NEW year's date is already on The Race document months
// ahead, but The Race only holds the next date: when Dave moves it on to the
// following year, this year's would be gone. scripts/weather-sync.mjs records
// it here, automatically, once the day has passed and the weather archive has
// caught up. The strip then bakes from the file plus these documents, and
// nobody has to remember the weather in November.
//
// Editors can add one by hand for a year the automation missed. The year and
// date are all the strip needs.
//
// Registered in index.ts, listed under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';

export const raceDay = defineType({
  name: 'raceDay',
  title: 'Race day',
  type: 'document',
  fields: [
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(2003),
      description: 'The running this date belongs to, as a four-digit year.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
      description: 'The day the race was run. Feeds the race-day weather strip on the course page.',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description:
        'Where the date came from, for the record. Filled in automatically when the site records it.',
    }),
  ],
  preview: {
    select: { year: 'year', date: 'date', source: 'source' },
    prepare: ({ year, date, source }) => ({
      title: `${year ?? '?'}: ${date ?? 'no date'}`,
      subtitle: source,
    }),
  },
});
