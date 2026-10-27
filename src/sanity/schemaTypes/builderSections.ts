// Safe to edit by hand
// =============================================================================
// The builder kit: smaller blocks the race director stacks into a page (PORTS.md card 173)
// =============================================================================
// The race's own blocks (raceSections.ts) draw themselves from the race data;
// the general library (sections.ts) covers a hero, text, a photo beside text
// and a gallery. These are the smaller pieces in between, so a volunteer page,
// a packet-pickup page or a note from the race director can be put together
// without a developer:
//
//   Text in columns, a row of buttons or link cards, tabs, a timeline, a
//   letter, event details (dates, times, place, "Add to my calendar",
//   directions), a schedule and cards with photos.
//
// Eight of the starter's twelve. Left out on purpose (2026-10-26), because the
// site already does the job: the wide photo (the Photograph band), the fold-out
// questions (the FAQ kiosk and the FAQ docs), the countdown (the race clock in
// the hero and the footer counts down from the race's own date, rule 15) and the
// dated notice (Race notices, the site-wide banner with its own dates).
//
// Spread into pageSectionSchemas (sections.ts), so every page builder offers
// them, and grouped in the "+ Add item" menu by BUILDER_INSERT_GROUPS below
// (merged in by withSiteGroups() in sections.ts). Each renders through
// src/components/builder-blocks/ (BuilderBlock.astro picks the component), and
// each has a fixture on /styleguide/sections/ and a picture in
// public/section-thumbnails/ (authoring.test.ts checks both). Logic,
// unit-tested: src/lib/builder-blocks.ts.
//
// THE RULES THESE FOLLOW:
//   - Rule 9: no colour, surface, tone or background field, and (unlike the
//     starter) no `look` either: this site has no looks, the cadence alone
//     picks each band's ground. section-fields.test.ts reads this file.
//   - Rule 15: nothing computable is typed. Which event dates have passed, the
//     calendar file, the directions link and the number of card columns are
//     worked out at build time. For race day itself the Race-day schedule
//     block fills itself from Schedule items; the schedule here is for
//     everything else (packet pickup, volunteer shifts, a training run).
//   - Rule 8b: the dropdowns that drive logic (`layout`, `startTime`,
//     `endTime`) are in NON_STEGA_FIELDS.
//   - Rule 13: a field description is an instruction for the box, under about
//     140 characters.
//   - Card 196 adds Opening hours and Map and directions: self-filling from
//     Business info (src/lib/business-facts.ts), so they hold no facts at all.
//   - Words: plain American English for a non-technical editor. No "CTA" or
//     "slug", no em-dashes in anything a visitor reads.
// =============================================================================

import { defineArrayMember, defineField, defineType } from 'sanity';
import { BellIcon } from '@sanity/icons/Bell';
import { ChartUpwardIcon } from '@sanity/icons/ChartUpward';
import { MobileDeviceIcon } from '@sanity/icons/MobileDevice';
import { SyncIcon } from '@sanity/icons/Sync';
import { ThLargeIcon } from '@sanity/icons/ThLarge';
import { ThListIcon } from '@sanity/icons/ThList';
import { UsersIcon } from '@sanity/icons/Users';
import { CalendarIcon } from '@sanity/icons/Calendar';
import { ClockIcon } from '@sanity/icons/Clock';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { ImagesIcon } from '@sanity/icons/Images';
import { LinkIcon } from '@sanity/icons/Link';
import { MenuIcon } from '@sanity/icons/Menu';
import { PinIcon } from '@sanity/icons/Pin';
import { SplitVerticalIcon } from '@sanity/icons/SplitVertical';
import { TimelineIcon } from '@sanity/icons/Timeline';
import { TIME_OPTIONS } from '../../lib/builder-blocks';
import { BLOCK_ICONS } from '../../lib/block-icons';
import type { InsertGroup } from '../../lib/insert-groups';

// ── Shared fields ────────────────────────────────────────────────────────────

const headingField = () =>
  defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' });

const introField = () =>
  defineField({
    name: 'intro',
    title: 'A sentence or two under the heading (optional)',
    type: 'text',
    rows: 2,
  });

/** A photo with its description for people who cannot see it. */
const photoField = (
  name: string,
  title: string,
  opts: { required?: boolean; description?: string } = {},
) =>
  defineField({
    name,
    title,
    type: 'image',
    description: opts.description,
    options: { hotspot: true },
    validation: opts.required ? (R) => R.required() : undefined,
    fields: [
      defineField({
        name: 'alt',
        title: 'Describe the photo',
        type: 'string',
        description: 'A few words for people who cannot see it, and for search engines.',
        validation: (R) => R.required(),
      }),
    ],
  });

const linkField = (title = 'Button (optional)') =>
  defineField({ name: 'link', title, type: 'ctaBlock' });

/** Short formatted text: paragraphs, bold, italic, lists and links. */
const simpleText = (name = 'body', title = 'Text') =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [{ title: 'Normal', value: 'normal' }],
        lists: [
          { title: 'Bullet list', value: 'bullet' },
          { title: 'Numbered list', value: 'number' },
        ],
        marks: {
          decorators: [
            { title: 'Bold', value: 'strong' },
            { title: 'Italic', value: 'em' },
          ],
          annotations: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
              fields: [
                defineField({
                  name: 'href',
                  title: 'Web address',
                  type: 'url',
                  description: 'A page on this site (starting with /) or a full https:// address.',
                  validation: (R) =>
                    R.uri({ allowRelative: true, scheme: ['https', 'http', 'mailto', 'tel'] }),
                }),
              ],
            },
          ],
        },
      }),
    ],
  });

const timeField = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description, options: { list: TIME_OPTIONS } });

// ── Text in columns ──────────────────────────────────────────────────────────
export const columnsSection = defineType({
  name: 'columnsSection',
  title: 'Text in columns',
  type: 'object',
  icon: SplitVerticalIcon,
  description: 'Two or three columns of text side by side. On a phone they stack.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'textColumns',
      title: 'Columns',
      type: 'array',
      validation: (R) => R.min(2).max(3),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'textColumn',
          title: 'Column',
          fields: [
            defineField({ name: 'heading', title: 'Column heading (optional)', type: 'string' }),
            simpleText('body', 'Text'),
          ],
          preview: {
            select: { title: 'heading' },
            prepare: ({ title }) => ({ title: title || 'Column' }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', columns: 'textColumns' },
    prepare: ({ title, columns }) => ({
      title: title || 'Text in columns',
      subtitle: `${Array.isArray(columns) ? columns.length : 0} columns`,
    }),
  },
});

// ── Row of buttons or link cards ─────────────────────────────────────────────
export const buttonRowSection = defineType({
  name: 'buttonRowSection',
  title: 'Row of buttons or link cards',
  type: 'object',
  icon: LinkIcon,
  description: 'Two to six links side by side, as buttons or as cards with a line of text.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'layout',
      title: 'Show them as',
      type: 'string',
      options: {
        list: [
          { title: 'Buttons', value: 'buttons' },
          { title: 'Cards with a line of text', value: 'cards' },
        ],
        layout: 'radio',
      },
      initialValue: 'buttons',
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      validation: (R) => R.min(2).max(6),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'quickLink',
          title: 'Link',
          fields: [
            defineField({ name: 'link', title: 'Button', type: 'ctaBlock' }),
            defineField({
              name: 'note',
              title: 'Line of text (cards only)',
              type: 'string',
              validation: (R) => R.max(120),
            }),
          ],
          preview: {
            select: { title: 'link.label', subtitle: 'note' },
            prepare: ({ title, subtitle }) => ({ title: title || 'Link', subtitle }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', links: 'links' },
    prepare: ({ title, links }) => ({
      title: title || 'Buttons',
      subtitle: `Links${Array.isArray(links) ? ` (${links.length})` : ''}`,
    }),
  },
});

// ── Tabs ─────────────────────────────────────────────────────────────────────
export const tabsSection = defineType({
  name: 'tabsSection',
  title: 'Tabs',
  type: 'object',
  icon: MenuIcon,
  description:
    'Two to five labeled tabs, each with its own text. Good for the 50K and the 27K side by side.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'tabs',
      title: 'Tabs',
      type: 'array',
      validation: (R) => R.min(2).max(5),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tabPanel',
          title: 'Tab',
          fields: [
            defineField({
              name: 'label',
              title: 'Tab label',
              type: 'string',
              description: 'One or two words.',
              validation: (R) => R.required().max(30),
            }),
            simpleText('body', 'Text in this tab'),
          ],
          preview: { select: { title: 'label' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', tabs: 'tabs' },
    prepare: ({ title, tabs }) => ({
      title: title || 'Tabs',
      subtitle: Array.isArray(tabs)
        ? `Tabs: ${tabs.map((t: { label?: string }) => t?.label ?? '').join(', ')}`
        : 'Tabs',
    }),
  },
});

// ── Timeline ─────────────────────────────────────────────────────────────────
export const timelineSection = defineType({
  name: 'timelineSection',
  title: 'Timeline (the race, year by year)',
  type: 'object',
  icon: TimelineIcon,
  description:
    'Moments in order: a year, what happened, a few words and a photo. For times on one day, use a schedule.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'entries',
      title: 'Moments',
      type: 'array',
      validation: (R) => R.min(1).max(30),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'timelineEntry',
          title: 'Moment',
          fields: [
            defineField({
              name: 'year',
              title: 'Year',
              type: 'string',
              description: 'Like "2014", or "1990s" when you are not sure of the exact year.',
              validation: (R) => R.required().max(12),
            }),
            defineField({
              name: 'title',
              title: 'What happened',
              type: 'string',
              validation: (R) => R.required().max(100),
            }),
            defineField({
              name: 'text',
              title: 'A few sentences (optional)',
              type: 'text',
              rows: 3,
            }),
            photoField('image', 'Photo (optional)'),
          ],
          preview: { select: { title: 'title', subtitle: 'year', media: 'image' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', entries: 'entries' },
    prepare: ({ title, entries }) => ({
      title: title || 'Timeline',
      subtitle: `Timeline${Array.isArray(entries) ? ` (${entries.length} moments)` : ''}`,
    }),
  },
});

// ── A letter ─────────────────────────────────────────────────────────────────
export const letterSection = defineType({
  name: 'letterSection',
  title: 'A letter (a note from the race director)',
  type: 'object',
  icon: EnvelopeIcon,
  description:
    'A short letter on a card: a greeting, a few paragraphs, a sign-off, the name and role, and a signature if you have one.',
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Small line above the letter (optional)',
      type: 'string',
      description: 'Like "A note from the race director".',
      validation: (R) => R.max(60),
    }),
    defineField({
      name: 'greeting',
      title: 'Greeting',
      type: 'string',
      initialValue: 'Dear runners,',
      validation: (R) => R.required().max(80),
    }),
    defineField({
      name: 'body',
      title: 'The letter',
      type: 'array',
      validation: (R) => R.required(),
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
    }),
    defineField({
      name: 'signOff',
      title: 'Sign-off',
      type: 'string',
      initialValue: 'See you on the trail,',
    }),
    photoField('signature', 'Signature (optional)', {
      description:
        'A scan of the signature in dark ink on white paper. Without one, the name is set in the heading font.',
    }),
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (R) => R.required() }),
    defineField({
      name: 'role',
      title: 'Role (optional)',
      type: 'string',
      description: 'Like "Race director".',
    }),
    linkField(),
  ],
  preview: {
    select: { title: 'greeting', name: 'name' },
    prepare: ({ title, name }) => ({
      title: title || 'A letter',
      subtitle: name ? `A letter from ${name}` : 'A letter',
    }),
  },
});

// ── Event details ────────────────────────────────────────────────────────────
export const eventDetailsSection = defineType({
  name: 'eventDetailsSection',
  title: 'Event details (date, time, place)',
  type: 'object',
  icon: CalendarIcon,
  description:
    'When and where, with "Add to my calendar" and directions made for you. Past dates drop off on their own.',
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Small line above the name (optional)',
      type: 'string',
      description: 'A few words, like "Race week".',
      validation: (R) => R.max(40),
    }),
    defineField({
      name: 'title',
      title: 'Name of the event',
      type: 'string',
      description: 'Like "Packet pickup" or "Volunteer briefing".',
      validation: (R) => R.required().max(80),
    }),
    defineField({
      name: 'occurrences',
      title: 'Dates and times',
      type: 'array',
      description:
        'One line per date. Two sessions on one day? Add the date twice, each with its own time and a label.',
      validation: (R) => R.required().min(1).max(12),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'eventDate',
          title: 'Date',
          fields: [
            defineField({
              name: 'date',
              title: 'Date',
              type: 'date',
              validation: (R) => R.required(),
            }),
            timeField('startTime', 'Starts at (optional)', 'Leave empty for an all-day event.'),
            timeField(
              'endTime',
              'Ends at (optional)',
              'Used for the calendar link. Without it the calendar holds an hour.',
            ),
            defineField({
              name: 'label',
              title: 'Label (optional)',
              type: 'string',
              description: 'Like "Friday evening".',
              validation: (R) => R.max(60),
            }),
          ],
          preview: {
            select: { date: 'date', start: 'startTime', label: 'label' },
            prepare: ({ date, start, label }) => ({
              title: [date, start].filter(Boolean).join(' at ') || 'Date',
              subtitle: label,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'place',
      title: 'Where',
      type: 'text',
      rows: 2,
      description:
        'The place on the first line, the street address on the second. Directions are worked out from it.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'note',
      title: 'A few words about it (optional)',
      type: 'text',
      rows: 3,
      description: 'What it is, who it is for, what to bring. Two or three sentences read best.',
    }),
    photoField('image', 'Photo (optional)', {
      description: 'Shown beside the details on a computer, above them on a phone.',
    }),
    defineField({
      name: 'button',
      title: 'Main button (optional)',
      type: 'ctaBlock',
      description:
        'Register, sign up or read more. "Add to my calendar" and "Directions" are added for you.',
    }),
    defineField({
      name: 'showCalendar',
      title: 'Show "Add to my calendar"',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'title', occ: 'occurrences', media: 'image' },
    prepare: ({ title, occ, media }) => ({
      title: title || 'Event details',
      subtitle: `Event details${Array.isArray(occ) && occ[0]?.date ? `, ${occ[0].date}` : ''}`,
      media,
    }),
  },
});

// ── Schedule ─────────────────────────────────────────────────────────────────
export const scheduleSection = defineType({
  name: 'scheduleSection',
  title: 'Schedule (times and what happens)',
  type: 'object',
  icon: ClockIcon,
  description:
    'Times and what happens at each. Race morning fills itself: use the Race-day schedule block for that.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'days',
      title: 'Days',
      type: 'array',
      description:
        'One day is plenty for a single event (leave its name empty). Add more for race weekend.',
      validation: (R) => R.required().min(1).max(6),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'scheduleDay',
          title: 'Day',
          fields: [
            defineField({
              name: 'title',
              title: 'Name of the day (optional)',
              type: 'string',
              description: 'Like "Friday" or "Saturday".',
              validation: (R) => R.max(50),
            }),
            defineField({
              name: 'items',
              title: 'What happens',
              type: 'array',
              validation: (R) => R.required().min(1).max(20),
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'scheduleRow',
                  title: 'Time',
                  fields: [
                    timeField(
                      'startTime',
                      'Time (optional)',
                      'Leave empty for something with no set time.',
                    ),
                    defineField({
                      name: 'title',
                      title: 'What happens',
                      type: 'string',
                      description: 'Like "Packet pickup opens".',
                      validation: (R) => R.required().max(80),
                    }),
                    defineField({
                      name: 'note',
                      title: 'Short note (optional)',
                      type: 'string',
                      description: 'Like "At the shelter".',
                      validation: (R) => R.max(140),
                    }),
                  ],
                  preview: {
                    select: { title: 'title', time: 'startTime', note: 'note' },
                    prepare: ({ title, time, note }) => ({
                      title: [time, title].filter(Boolean).join('  ') || 'Time',
                      subtitle: note,
                    }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'title', items: 'items' },
            prepare: ({ title, items }) => ({
              title: title || 'Day',
              subtitle: `${Array.isArray(items) ? items.length : 0} times`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', days: 'days' },
    prepare: ({ title, days }) => ({
      title: title || 'Schedule',
      subtitle: `Schedule${Array.isArray(days) && days.length > 1 ? `, ${days.length} days` : ''}`,
    }),
  },
});

// ── Cards with photos ────────────────────────────────────────────────────────
export const photoCardsSection = defineType({
  name: 'photoCardsSection',
  title: 'Cards with photos',
  type: 'object',
  icon: ImagesIcon,
  description:
    'Two to six cards, each a photo, a title and a few words, with an optional link. They line up on their own.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      validation: (R) => R.required().min(2).max(6),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'photoCard',
          title: 'Card',
          fields: [
            photoField('image', 'Photo', { required: true }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (R) => R.required().max(60),
            }),
            defineField({
              name: 'body',
              title: 'A few words (optional)',
              type: 'text',
              rows: 3,
              validation: (R) => R.max(240),
            }),
            defineField({
              name: 'link',
              title: 'Link (optional)',
              type: 'ctaBlock',
              description:
                'With a link the whole card can be tapped. The button words show under the text.',
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'body', media: 'image' },
            prepare: ({ title, subtitle, media }) => ({ title: title || 'Card', subtitle, media }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', cards: 'cards' },
    prepare: ({ title, cards }) => ({
      title: title || 'Cards with photos',
      subtitle: `Cards with photos${Array.isArray(cards) ? ` (${cards.length})` : ''}`,
    }),
  },
});

// ── Card 193 blocks (from FBC Auburn): contact card, progress, newsletter, calendar subscribe,
// icon cards, a steps rail and a hub. Same rules as above: no colour field, derived values
// worked out in src/lib/builder-blocks.ts, dropdowns in NON_STEGA_FIELDS.

/** A picker for one icon of the block icon set. Always named `icon` (on NON_STEGA_FIELDS). */
const iconField = (title = 'Icon (optional)', description?: string) =>
  defineField({
    name: 'icon',
    title,
    type: 'string',
    description,
    options: { list: BLOCK_ICONS.map((i) => ({ title: i.title, value: i.value })) },
  });

const bodyField = (title = 'A few sentences (optional)') =>
  defineField({ name: 'body', title, type: 'text', rows: 3, validation: (R) => R.max(280) });

// ── Contact details ──────────────────────────────────────────────────────────
export const contactCardSection = defineType({
  name: 'contactCardSection',
  title: 'Contact details',
  type: 'object',
  icon: MobileDeviceIcon,
  description:
    'Phone, email, address and opening hours on one card, with big Call and Email buttons if you want them. Everything fills itself from Site settings and Business info; type something here only for a different one.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading (optional)',
      type: 'string',
      initialValue: 'Get in touch',
    }),
    introField(),
    defineField({
      name: 'callButtons',
      title: 'Lead with big Call and Email buttons',
      type: 'boolean',
      description:
        'Two big buttons above the details. Good for a page where getting in touch is the point.',
      initialValue: false,
    }),
    defineField({
      name: 'phone',
      title: 'Phone (optional)',
      type: 'string',
      description: 'Leave empty to use the phone number in Site settings.',
    }),
    defineField({
      name: 'email',
      title: 'Email (optional)',
      type: 'string',
      description: 'Leave empty to use the public email in Site settings.',
      validation: (R) =>
        R.regex(/^\S+@\S+\.\S+$/, { name: 'email' }).warning(
          'That does not look like an email address.',
        ),
    }),
    defineField({
      name: 'address',
      title: 'Address (optional)',
      type: 'text',
      rows: 3,
      description:
        'Leave empty to use the address in Business info. Otherwise one line each for the street and the town; a "Get directions" link is made from it.',
    }),
    defineField({
      name: 'hours',
      title: 'Opening hours (optional)',
      type: 'text',
      rows: 4,
      description:
        'Leave empty to use the opening hours in Business info, with today\'s status. Otherwise one line for each, like "Monday to Friday, 9 am to 5 pm".',
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Contact details', subtitle: 'Contact details' }),
  },
});

// ── Progress toward a goal ───────────────────────────────────────────────────
export const progressSection = defineType({
  name: 'progressSection',
  title: 'Progress toward a goal',
  type: 'object',
  icon: ChartUpwardIcon,
  description:
    'A bar that fills toward a goal: a fundraiser, a campaign, a target. You type two numbers; the bar, the percent and "to go" work themselves out.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'unit',
      title: 'What are you counting?',
      type: 'string',
      options: {
        list: [
          { title: 'Dollars', value: 'dollars' },
          { title: 'A plain number (people, meals, signatures)', value: 'number' },
        ],
        layout: 'radio',
      },
      initialValue: 'dollars',
    }),
    defineField({
      name: 'goal',
      title: 'Goal',
      type: 'number',
      description: 'Numbers only, like 50000.',
      validation: (R) => R.required().positive(),
    }),
    defineField({
      name: 'raised',
      title: 'So far',
      type: 'number',
      validation: (R) => R.required().min(0),
    }),
    defineField({
      name: 'asOf',
      title: 'As of (optional)',
      type: 'date',
      description:
        'Shows "As of October 18, 2026" under the bar, so nobody wonders how old the number is.',
    }),
    linkField(),
  ],
  preview: {
    select: { title: 'heading', goal: 'goal', raised: 'raised' },
    prepare: ({ title, goal, raised }) => ({
      title: title || 'Progress toward a goal',
      subtitle: typeof goal === 'number' ? `${raised ?? 0} of ${goal}` : 'Progress',
    }),
  },
});

// ── Add our calendar ─────────────────────────────────────────────────────────
export const calendarSubscribeSection = defineType({
  name: 'calendarSubscribeSection',
  title: 'Add our calendar to your phone',
  type: 'object',
  icon: SyncIcon,
  description:
    'Buttons that add your calendar to Google, Apple or Outlook, so new dates show up on visitors’ phones by themselves.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading (optional)',
      type: 'string',
      initialValue: 'Never miss a date',
    }),
    introField(),
    defineField({
      name: 'feed',
      title: 'Calendar feed address',
      type: 'string',
      description:
        'The address of a calendar feed (it ends in .ics, or starts with webcal://): from Google Calendar, your booking tool, or a file this site publishes (a path starting with /, like /calendar/events.ics).',
      validation: (R) =>
        R.required().custom((v) =>
          !v || /^(https:\/\/|webcal:\/\/|\/(?!\/))/i.test(String(v).trim())
            ? true
            : 'Start with https://, webcal:// or a /',
        ),
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({ title: title || 'Calendar buttons', subtitle: 'Add our calendar' }),
  },
});

// ── Cards with icons ─────────────────────────────────────────────────────────
export const iconCardsSection = defineType({
  name: 'iconCardsSection',
  title: 'Cards with icons',
  type: 'object',
  icon: ThLargeIcon,
  description:
    'Two to twelve open cards, each with a big icon (or a photo), a title and a few sentences. Three across on a computer, one on a phone.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      validation: (R) => R.required().min(2).max(12),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'iconCard',
          title: 'Card',
          fields: [
            iconField(),
            photoField('image', 'Photo (optional)', {
              description: 'With a photo the card shows the photo instead of the icon.',
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (R) => R.required().max(60),
            }),
            bodyField(),
            defineField({
              name: 'note',
              title: 'Small note (optional)',
              type: 'string',
              description: 'A day, a reference, a size: shown small under the text.',
              validation: (R) => R.max(80),
            }),
            linkField('Link (optional)'),
          ],
          preview: {
            select: { title: 'title', subtitle: 'note', media: 'image' },
            prepare: ({ title, subtitle, media }) => ({ title: title || 'Card', subtitle, media }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', cards: 'cards' },
    prepare: ({ title, cards }) => ({
      title: title || 'Cards with icons',
      subtitle: `Cards with icons${Array.isArray(cards) ? ` (${cards.length})` : ''}`,
    }),
  },
});

// ── Steps on a path ──────────────────────────────────────────────────────────
// The inline sibling of processSection: that one draws the shared Process steps from their own
// collection (the Process page); this one holds its steps in the block, so any page can show a
// short path ("how it works", "what happens on the day") without a collection to keep.
export const stepsRailSection = defineType({
  name: 'stepsRailSection',
  title: 'Steps on a path',
  type: 'object',
  icon: ThListIcon,
  description:
    'Numbered steps down a line, each with an icon. For "how it works" or "what to expect". The numbers and the line are drawn for you.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'steps',
      title: 'Steps',
      type: 'array',
      validation: (R) => R.required().min(2).max(8),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'railStep',
          title: 'Step',
          fields: [
            iconField(),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (R) => R.required().max(80),
            }),
            bodyField('A sentence or two (optional)'),
            linkField('Link (optional)'),
          ],
          preview: {
            select: { title: 'title', subtitle: 'body' },
            prepare: ({ title, subtitle }) => ({ title: title || 'Step', subtitle }),
          },
        }),
      ],
    }),
    defineField({
      name: 'firstStepCard',
      title: 'Set the first step apart on a card',
      type: 'boolean',
      description: 'Good when step one is the one that matters most.',
      initialValue: false,
    }),
    defineField({
      name: 'endHeading',
      title: 'Closing line (optional)',
      type: 'string',
      description: 'A line after the last step, like "Ready when you are."',
    }),
    linkField('Closing button (optional)'),
  ],
  preview: {
    select: { title: 'heading', steps: 'steps' },
    prepare: ({ title, steps }) => ({
      title: title || 'Steps on a path',
      subtitle: `Steps${Array.isArray(steps) ? ` (${steps.length})` : ''}`,
    }),
  },
});

// ── Hub: groups of cards with a sticky index ─────────────────────────────────
export const hubSection = defineType({
  name: 'hubSection',
  title: 'Groups of cards with an index',
  type: 'object',
  icon: UsersIcon,
  description:
    'A page of cards in named groups ("For families", "For businesses"), with an index that follows the scroll and jumps to a group. Every group shows at once. Good for a long list of services, programs or offers.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading (optional)',
      type: 'string',
      description: 'Leave it empty when the page title already says it.',
    }),
    introField(),
    defineField({
      name: 'groups',
      title: 'Groups',
      type: 'array',
      description: 'Each group gets a place in the index. Keep the names short.',
      validation: (R) => R.required().min(1).max(8),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'hubGroup',
          title: 'Group',
          fields: [
            defineField({
              name: 'title',
              title: 'Group name',
              type: 'string',
              validation: (R) => R.required().max(24),
            }),
            defineField({
              name: 'line',
              title: 'One line about the group (optional)',
              type: 'string',
              validation: (R) => R.max(140),
            }),
            defineField({
              name: 'cards',
              title: 'Cards',
              type: 'array',
              validation: (R) => R.required().min(1).max(12),
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'hubCard',
                  title: 'Card',
                  fields: [
                    photoField('image', 'Photo (optional)', {
                      description: 'Without a photo the card shows its icon.',
                    }),
                    iconField('Icon (shown when there is no photo)'),
                    defineField({
                      name: 'title',
                      title: 'Title',
                      type: 'string',
                      validation: (R) => R.required().max(60),
                    }),
                    defineField({
                      name: 'label',
                      title: 'Who it is for (optional)',
                      type: 'string',
                      description: 'A few words, like "Families" or "Everyone".',
                      validation: (R) => R.max(40),
                    }),
                    defineField({
                      name: 'when',
                      title: 'When (optional)',
                      type: 'string',
                      description: 'Like "Saturdays, 10 am".',
                      validation: (R) => R.max(60),
                    }),
                    defineField({
                      name: 'place',
                      title: 'Where (optional)',
                      type: 'string',
                      validation: (R) => R.max(60),
                    }),
                    bodyField('A sentence or two (optional)'),
                    linkField('Link (optional)'),
                  ],
                  preview: {
                    select: { title: 'title', label: 'label', when: 'when', media: 'image' },
                    prepare: ({ title, label, when, media }) => ({
                      title: title || 'Card',
                      subtitle: [label, when].filter(Boolean).join(' · '),
                      media,
                    }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'title', cards: 'cards' },
            prepare: ({ title, cards }) => ({
              title: title || 'Group',
              subtitle: `Cards${Array.isArray(cards) ? ` (${cards.length})` : ''}`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', groups: 'groups' },
    prepare: ({ title, groups }) => ({
      title: title || 'Groups of cards',
      subtitle: `Groups${Array.isArray(groups) ? ` (${groups.length})` : ''}`,
    }),
  },
});

// ── Opening hours (card 196) ─────────────────────────────────────────────────
// Self-filling: the hours, the dated changes and the address come from
// Business info (src/lib/business-facts.ts), never typed here (rule 15). With
// no hours set the block draws nothing.
export const hoursSection = defineType({
  name: 'hoursSection',
  title: 'Opening hours',
  type: 'object',
  icon: ClockIcon,
  description:
    'Your hours from Business info, with "Open now" or when you next open, and any holiday changes coming up. Change the hours once in Business info and every place updates.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading (optional)',
      type: 'string',
      initialValue: 'Opening hours',
    }),
    introField(),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          { title: 'Today beside the week', value: 'card' },
          { title: 'One slim band', value: 'band' },
        ],
        layout: 'radio',
      },
      initialValue: 'card',
    }),
    defineField({
      name: 'showAddress',
      title: 'Show the address and directions',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'showChanges',
      title: 'Show holiday and closure changes coming up',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { heading: 'heading', layout: 'layout' },
    prepare: ({ heading, layout }) => ({
      title: heading || 'Opening hours',
      subtitle: layout === 'band' ? 'Opening hours, one slim band' : 'Opening hours',
    }),
  },
});

// ── Map and directions (card 196) ────────────────────────────────────────────
// A drawn map card from the stored address: nothing loads from a map service
// and nothing tracks a visitor until they choose a directions button. Draws
// nothing without a street address in Business info.
export const mapSection = defineType({
  name: 'mapSection',
  title: 'Map and directions',
  type: 'object',
  icon: PinIcon,
  description:
    'Your address from Business info with Directions and Apple Maps buttons. Change the address once in Business info and every place updates.',
  fields: [
    headingField(),
    introField(),
    defineField({
      name: 'showHours',
      title: "Show today's hours under the address",
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { heading: 'heading' },
    prepare: ({ heading }) => ({ title: heading || 'Map and directions', subtitle: 'Map' }),
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

export const builderSectionSchemas = [
  columnsSection,
  buttonRowSection,
  tabsSection,
  timelineSection,
  letterSection,
  eventDetailsSection,
  scheduleSection,
  photoCardsSection,
  contactCardSection,
  progressSection,
  calendarSubscribeSection,
  iconCardsSection,
  stepsRailSection,
  hubSection,
  hoursSection,
  mapSection,
];

/**
 * Where these blocks sit in the "+ Add item" menu. withSiteGroups() in
 * sections.ts merges these into the base groups by name: a group that exists
 * gains the types, a new one is added at the end.
 */
export const BUILDER_INSERT_GROUPS: InsertGroup[] = [
  {
    name: 'basics',
    title: 'Words and pictures',
    of: [
      'columnsSection',
      'buttonRowSection',
      'photoCardsSection',
      'tabsSection',
      'letterSection',
      'iconCardsSection',
      'stepsRailSection',
      'hubSection',
    ],
  },
  {
    name: 'contact',
    title: 'Contact and updates',
    of: ['contactCardSection', 'calendarSubscribeSection'],
  },
  {
    name: 'dates',
    title: 'Events and dates',
    of: ['eventDetailsSection', 'scheduleSection', 'timelineSection', 'progressSection'],
  },
  // Card 196: self-filling from Business info. The race has an address and no opening hours, so
  // the map leads; the hours block draws nothing until hours are typed.
  { name: 'visit', title: 'Location and hours', of: ['mapSection', 'hoursSection'] },
];
