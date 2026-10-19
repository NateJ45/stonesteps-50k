// Foundation, edit with care
// Site-wide announcement banner collection.
//
// Editors can queue several notices ahead of time (a sale, a closure, a
// seasonal promotion) and let them switch on and off by date. The active
// announcement shows at the top of every page above the header. BaseLayout
// picks the most urgent entry that is currently within its date window.
//
// "Active" = enabled AND (no startDate or startDate has passed) AND
//            (no endDate or endDate is still in the future).
//
// Build-time note: date-window logic is evaluated at BUILD TIME. This is a
// static site -- a banner only appears or disappears after a rebuild. Set up a
// Cloudflare deploy hook on a daily schedule (docs/agent/deployment.md) if you
// need banners to auto-expire without a manual publish.
//
// Style tokens map to existing semantic color tokens -- no new tokens are
// introduced here:
//   info      -> bg-muted (calm, informational)
//   highlight -> bg-primary / text-primary-foreground (brand accent, good news)
//   urgent    -> bg-destructive / text-destructive-foreground (red, closures)

import { defineType, defineField } from 'sanity';
import { BellIcon } from '@sanity/icons/Bell';

export const announcement = defineType({
  name: 'announcement',
  title: 'Race notice',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'internalTitle',
      title: 'Internal name',
      type: 'string',
      description: 'For you only, never shown on the site. Like "Bib pickup moved".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'string',
      description:
        'The line across the top of every page. Under 160 characters, like "Bib pickup moves to the Oval shelter, 6:00 to 6:45 AM."',
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      description:
        'Info for everyday news, Highlight for good news like registration opening, Urgent (red) for a delay or a closed trail.',
      options: {
        list: [
          { title: 'Info (parking, bib pickup, the schedule)', value: 'info' },
          { title: 'Highlight (registration is open, results are up)', value: 'highlight' },
          { title: 'Urgent, in red (a delay, a closed trail, the weather)', value: 'urgent' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
    }),
    defineField({
      name: 'link',
      title: 'Link (optional)',
      type: 'object',
      description: 'Optional. A link at the end of the notice, to a page here or RunSignUp.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'label',
          title: 'Link label',
          type: 'string',
          description: 'The words to click, like "See the race-day schedule".',
        }),
        defineField({
          name: 'url',
          title: 'URL',
          type: 'string',
          description: 'A page on this site like /course/, or a full https:// address.',
        }),
      ],
    }),
    defineField({
      name: 'startDate',
      title: 'Show from (optional)',
      type: 'datetime',
      description:
        'Leave blank to show it as soon as it is published. It appears at the first website update after this time.',
    }),
    defineField({
      name: 'endDate',
      title: 'Hide after (optional)',
      type: 'datetime',
      description:
        'Leave blank to show it until you switch it off. It comes down at the first website update after this time.',
    }),
    defineField({
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      description: 'Switch it off and the notice never shows, whatever the dates say.',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      message: 'message',
      style: 'style',
      enabled: 'enabled',
      start: 'startDate',
      end: 'endDate',
    },
    prepare: ({ message, style, enabled, start, end }) => {
      const window = [
        start ? new Date(start).toLocaleDateString() : null,
        end ? new Date(end).toLocaleDateString() : null,
      ]
        .filter(Boolean)
        .join(' to ');
      return {
        title: message || 'Race notice',
        subtitle: `${enabled ? '' : 'OFF: '}${style ?? 'info'}${window ? ` (${window})` : ''}`,
      };
    },
  },
  orderings: [
    { title: 'Soonest to end', name: 'endAsc', by: [{ field: 'endDate', direction: 'asc' }] },
    { title: 'Newest', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
  ],
});
