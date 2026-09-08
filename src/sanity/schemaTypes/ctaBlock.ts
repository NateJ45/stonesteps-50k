// Reusable object type: a CTA button + link.
// Embedded by page singletons wherever a primary/secondary CTA appears.

import { defineType, defineField } from 'sanity';

export const ctaBlock = defineType({
  name: 'ctaBlock',
  title: 'CTA Block',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Button text',
      type: 'string',
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'linkType',
      title: 'Link type',
      type: 'string',
      options: {
        list: [
          { title: 'Internal page', value: 'internal' },
          { title: 'External URL', value: 'external' },
          { title: 'Email', value: 'email' },
          { title: 'Phone', value: 'phone' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'internalLink',
      title: 'Page to link to',
      type: 'reference',
      to: [
        { type: 'homePage' },
        { type: 'aboutPage' },
        { type: 'servicesPage' },
        { type: 'processPage' },
        { type: 'faqPage' },
        { type: 'contactPage' },
        { type: 'journalPage' },
        { type: 'journalEntry' },
        { type: 'page' },
      ],
      hidden: ({ parent }) => parent?.linkType !== 'internal',
    }),
    defineField({
      name: 'internalPath',
      title: 'Or a path on this site',
      type: 'string',
      description:
        'For routes that have no page document to point at, like /results. Start with a ' +
        'slash. Use the picker above whenever the destination IS a document, because a ' +
        'reference survives a slug change and a typed path does not.',
      hidden: ({ parent }) => parent?.linkType !== 'internal',
      validation: (Rule) =>
        Rule.custom((value) =>
          !value || String(value).startsWith('/')
            ? true
            : 'A path on this site has to start with /',
        ),
    }),
    defineField({
      name: 'externalUrl',
      title: 'Full URL',
      type: 'url',
      description:
        'Includes https://. For a link to another page on this site, switch the link type to Internal page.',
      hidden: ({ parent }) => parent?.linkType !== 'external',
    }),
    defineField({
      name: 'emailAddress',
      title: 'Email address',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((value, ctx: any) => {
          if (ctx.parent?.linkType !== 'email') return true;
          if (!value) return 'Email is required';
          return /.+@.+\..+/.test(value) ? true : 'Must be a valid email';
        }),
      hidden: ({ parent }) => parent?.linkType !== 'email',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Phone number',
      type: 'string',
      hidden: ({ parent }) => parent?.linkType !== 'phone',
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in new tab',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  // An internal link with nothing to point at used to be silently legal, and
  // CtaLink falls back to `fallbackHref` when it cannot resolve one. That
  // combination does not break the page: it produces a button with a
  // PLAUSIBLE WRONG DESTINATION. Two buttons on the home page read "The full
  // course" and "All-time records" and both went to /contact for exactly this
  // reason. A wrong link is worse than a broken one, because nobody reports it.
  validation: (Rule) =>
    Rule.custom((value) => {
      const v = value as
        { linkType?: string; internalLink?: { _ref?: string }; internalPath?: string } | undefined;
      if (v?.linkType !== 'internal') return true;
      if (v.internalLink?._ref || v.internalPath) return true;
      return 'Pick a page to link to, or type a path like /results.';
    }),
  preview: {
    select: { label: 'label', linkType: 'linkType' },
    prepare: ({ label, linkType }) => ({ title: label || '(no label)', subtitle: linkType }),
  },
});
