// A historical record the results archive cannot reach.
//
// WHY THIS EXISTS ALONGSIDE raceResult. The derived-records system is honest
// only as far back as the results go. RunSignUp's public API carries this race
// from 2017, and not every year even then: 2020, 2016 and 2015 have no result
// set, nor does the 2021 27K. But the all-time records run back to 2007, so the
// outright course records (David Riddle 2011, Kim Martin 2007, Ruth Kohstall
// 2008) predate anything that can be computed.
//
// Those rows are therefore carried as TRANSCRIBED history, sourced from the
// live site's own tables and marked as such. The records page merges them with
// the derived ones and takes whichever is faster, so a future finisher can beat
// a 2007 record and the table updates itself, while the 2007 mark stays visible
// until someone does.
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
