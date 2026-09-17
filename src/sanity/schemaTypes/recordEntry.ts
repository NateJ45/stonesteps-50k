// A historical record the results archive cannot reach.
//
// WHY THIS EXISTS ALONGSIDE raceResult. The derived-records system is honest
// only as far back as the results go. When this type was created, RunSignUp's
// public API reached back to 2017 while the all-time records ran back to 2007,
// so the outright course records predated anything that could be computed.
// Those rows were carried as TRANSCRIBED history from the live site's own
// tables. The records page merges them with the derived ones and takes
// whichever is faster, so a future finisher can beat an old mark and the table
// updates itself, while the old mark stays visible until someone does.
//
// CURRENTLY EMPTY, AND THAT IS THE CORRECT STATE (2026-09-17). The 2003 to
// 2016 archive import put a result behind every 50K record, so those
// transcriptions became hand copies and were removed (audit-studio.mjs check 7
// keeps them out). The five that remained were 27K marks dated 2010 to 2014,
// and the 27K began in 2015: Dave said so, and none of the five matches any
// result on file. They were retired by scripts/retire-27k-records.mjs, with a
// verbatim copy in scripts/data/retired-27k-records.json.
//
// So a document of this type should only ever be created for a record with
// evidence behind it and no result the archive can hold. If Dave ever confirms
// a pre-2015 predecessor event and supplies its results, they belong in the
// archive as results, not here.
//
// Registered in index.ts, listed under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';

export const recordEntry = defineType({
  name: 'recordEntry',
  title: 'Historical record',
  type: 'document',
  fields: [
    defineField({
      name: 'athlete',
      title: 'Athlete',
      type: 'reference',
      to: [{ type: 'athlete' }],
      description:
        'Still a reference, not a typed name. This is the exact split that produced ' +
        '"Brain List" and "Brian List" on the live site.',
    }),
    defineField({
      name: 'distance',
      title: 'Distance',
      type: 'reference',
      to: [{ type: 'distance' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'gender',
      title: 'Gender',
      type: 'string',
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
      name: 'bracket',
      title: 'Age bracket',
      type: 'string',
      description:
        'Must match a bracket id from src/lib/age-brackets.ts so it can merge with the ' +
        'derived records. There is deliberately no "Course" bracket: the outright record ' +
        'is computed as the fastest row, never stored, because storing it as a duplicate ' +
        'of an age row is what let the live tables file one time under two different years.',
      options: {
        list: [
          { title: 'Under 30', value: 'u30' },
          { title: '30 to 39', value: '30s' },
          { title: '40 to 49', value: '40s' },
          { title: '50 to 59', value: '50s' },
          { title: '60 to 69', value: '60s' },
          { title: 'Over 70', value: '70plus' },
        ],
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'timeSeconds',
      title: 'Time (seconds)',
      type: 'number',
      description: 'Same units as a result, so the two sets can be compared directly.',
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'Leave blank only where the published source gives none.',
    }),
    defineField({
      name: 'sourceNote',
      title: 'Note on the source',
      type: 'string',
      description:
        'Used where the published tables genuinely disagree with themselves. Two such ' +
        'conflicts exist and are carried as data, with a footnote marker on the page, ' +
        'rather than quietly picking a side.',
    }),
  ],
  preview: {
    select: {
      athlete: 'athlete.name',
      distance: 'distance.name',
      bracket: 'bracket',
      gender: 'gender',
      year: 'year',
    },
    prepare: ({ athlete, distance, bracket, gender, year }) => ({
      title: athlete ?? '(unclaimed)',
      subtitle: [distance, gender, bracket, year].filter(Boolean).join(' · '),
    }),
  },
});
