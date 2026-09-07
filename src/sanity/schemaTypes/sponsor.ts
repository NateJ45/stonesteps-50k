// A race sponsor or partner.
//
// Rendered as an embroidered patch, in full colour. The mockup is explicit that
// the greyscale-logos-at-70%-opacity strip was dropped on purpose: patches are
// colourful, and a sponsor who paid deserves their actual mark.
//
// Registered in index.ts, drag-orderable under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const sponsor = defineType({
  name: 'sponsor',
  title: 'Sponsor',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'Describe the mark, not the file. A sponsor logo usually just needs the ' +
            'organisation name.',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'url',
      title: 'Website',
      type: 'url',
    }),
    orderRankField({ type: 'sponsor' }),
  ],
  preview: {
    select: { title: 'name', media: 'logo' },
    prepare: ({ title, media }) => ({ title: title ?? '(no name)', media }),
  },
});
