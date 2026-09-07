// One runner, once.
//
// WHY A SEPARATE DOCUMENT. The live WordPress site stores each finisher's name
// as a string inside four hand-maintained tables, and it has already drifted:
// the 27K top-ten table spells him "Brain List" while the records table spells
// the same performance "Brian List". A reference cannot do that. Every result
// points at one athlete document, so a name is spelled once and correcting it
// corrects it everywhere.
//
// Identity is the slug, not the display name. The importer normalises casing
// before slugging, because older RunSignUp years shout ("TED BROSS") while
// recent ones do not, and the same runner must not become two people.
//
// Registered in index.ts, listed under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';

export const athlete = defineType({
  name: 'athlete',
  title: 'Athlete',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'As it should be displayed. Correcting it here corrects every result.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'The identity key. The results importer matches on this, so changing it can ' +
        'split one runner into two. Change the name instead.',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      description: 'Most recent city on record. Informational only.',
    }),
    defineField({ name: 'region', title: 'State', type: 'string' }),
  ],
  preview: {
    select: { title: 'name', city: 'city', region: 'region' },
    prepare: ({ title, city, region }) => ({
      title: title ?? '(no name)',
      subtitle: [city, region].filter(Boolean).join(', ') || undefined,
    }),
  },
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
});
