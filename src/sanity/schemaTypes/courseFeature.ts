// One thing worth knowing about the course.
//
// Registered in index.ts, drag-orderable under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';
import { confirmedField } from './_confirmedField';

export const courseFeature = defineType({
  name: 'courseFeature',
  title: 'Course feature',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Example: "Aid at the end of every loop".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 4,
      options: {
        canvasApp: {
          purpose:
            'Concrete detail about the terrain or the logistics. Say the specific thing. ' +
            'No em-dashes, no adjectives doing the work of facts.',
        },
      },
    }),
    confirmedField('Tick once this is verified against the course.'),
    orderRankField({ type: 'courseFeature' }),
  ],
  preview: {
    select: { title: 'title', confirmed: 'confirmed' },
    prepare: ({ title, confirmed }) => ({
      title: title ?? '(no title)',
      subtitle: confirmed ? undefined : 'NOT CONFIRMED',
    }),
  },
});
