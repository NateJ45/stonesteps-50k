// One line on race-day's schedule.
//
// Almost every row here starts life UNCONFIRMED, and that is the point. The
// race publishes start times and the course close on RunSignUp, but nothing
// about packet pickup, the pre-race briefing or awards exists anywhere public.
// The mockup invented all of it; this schema makes the gap visible instead,
// via the shared `confirmed` flag, so an unconfirmed row renders behind a "Not
// confirmed" marker until the race director says otherwise.
//
// Registered in index.ts, drag-orderable under "The Race" in structure.ts.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';
import { confirmedField } from './_confirmedField';

export const scheduleItem = defineType({
  name: 'scheduleItem',
  title: 'Schedule item',
  type: 'document',
  fields: [
    defineField({
      name: 'label',
      title: 'What happens',
      type: 'string',
      description: 'Example: "50K start", "Packet pickup opens".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'time',
      title: 'Time',
      type: 'string',
      description:
        'As it should read, for example "8:00 am". Leave blank while unknown: a blank ' +
        'time with the confirmed box unticked reads as "to be confirmed" rather than ' +
        'inventing a plausible hour.',
    }),
    defineField({
      name: 'detail',
      title: 'Detail',
      type: 'string',
      description: 'Optional half-line. Example: "The Oval, Area 13".',
    }),
    confirmedField('Tick once the race director has given this time.'),
    orderRankField({ type: 'scheduleItem' }),
  ],
  preview: {
    select: { title: 'label', time: 'time', confirmed: 'confirmed' },
    prepare: ({ title, time, confirmed }) => ({
      title: title ?? '(no label)',
      subtitle: [time || 'no time yet', confirmed ? null : 'NOT CONFIRMED']
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
