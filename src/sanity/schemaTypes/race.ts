// Race singleton. The one document holding this year's edition: date, venue,
// the RunSignUp links, the race director, and the entry-fee tiers.
//
// Foundation, edit with care. Registered in index.ts, pinned as a singleton in
// structure.ts and in the SINGLETON_TYPES set in sanity.config.ts.
//
// PROVENANCE: every field below that has a verified source names it in its own
// description, so an editor can see at a glance which values came from the
// race's RunSignUp listing and which someone typed. Anything the race does not
// publish anywhere carries the shared `confirmed` flag instead (see
// _confirmedField.ts) and renders behind a visible "Not confirmed" marker until
// a human ticks the box.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { confirmedField } from './_confirmedField';

export const race = defineType({
  name: 'race',
  title: 'The Race',
  type: 'document',
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'where', title: 'Where' },
    { name: 'links', title: 'Links' },
    { name: 'entry', title: 'Entry fees' },
    { name: 'people', title: 'People' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Race name',
      type: 'string',
      group: 'basics',
      initialValue: 'Stone Steps 50K',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: 'basics',
      description: 'One line, used in the hero and as the fallback meta description.',
      options: {
        canvasApp: { purpose: 'A short, plain claim about the race. No marketing adjectives.' },
      },
    }),
    defineField({
      name: 'editionNumber',
      title: 'Which edition is this?',
      type: 'number',
      group: 'basics',
      description: "The 2026 race is the 23rd edition, per the race's own RunSignUp listing.",
    }),
    defineField({
      name: 'raceDate',
      title: 'Race day',
      type: 'datetime',
      group: 'basics',
      description:
        'Start of the first event, in local time. Drives the countdown clock and the ' +
        'schema.org SportsEvent startDate. Verified from RunSignUp: 25 October 2026, 8:00 am.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      group: 'where',
      initialValue: 'Mt. Airy Forest',
    }),
    defineField({
      name: 'startArea',
      title: 'Start and finish area',
      type: 'string',
      group: 'where',
      description: 'Verified: The Oval, Area 13.',
    }),
    defineField({
      name: 'streetAddress',
      title: 'Street address',
      type: 'string',
      group: 'where',
      description: 'Verified from RunSignUp: 5083 Colerain Ave.',
    }),
    defineField({ name: 'city', title: 'City', type: 'string', group: 'where' }),
    defineField({ name: 'region', title: 'State', type: 'string', group: 'where' }),
    defineField({ name: 'postalCode', title: 'ZIP', type: 'string', group: 'where' }),
    defineField({
      name: 'geo',
      title: 'Coordinates',
      type: 'geopoint',
      group: 'where',
      description: 'Drives the JSON-LD location. Verified from RunSignUp: 39.17275, -84.568806.',
    }),
    defineField({
      name: 'registerUrl',
      title: 'Register (RunSignUp)',
      type: 'url',
      group: 'links',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'resultsUrl',
      title: 'Full results archive (RunSignUp)',
      type: 'url',
      group: 'links',
      description:
        'The complete archive, including the years this site does not carry. Every ' +
        'results page links out to it.',
    }),
    defineField({
      name: 'facebookUrl',
      title: 'Facebook group',
      type: 'url',
      group: 'links',
    }),
    defineField({
      name: 'gpxUrl',
      title: 'Course GPX file',
      type: 'url',
      group: 'links',
      description:
        'A real surveyed GPX track, offered to entrants as a download. Leave blank ' +
        'until one exists: the elevation profile says out loud that its shape is ' +
        'illustrative whenever this is empty.',
    }),
    defineField({
      name: 'elevationProfile',
      title: 'Elevation profile (measured)',
      type: 'object',
      group: 'links',
      description:
        'Written by scripts/build-elevation.mjs from a real GPS track, not typed by hand. ' +
        'While this is empty the site draws a SYNTHETIC profile that says so in its own ' +
        'caption. Filling it in is what makes the profile a measurement.',
      options: { collapsible: true, collapsed: true, canvasApp: { exclude: true } },
      fields: [
        defineField({ name: 'source', title: 'Where the data came from', type: 'string' }),
        defineField({ name: 'sampledAt', title: 'Sampled at', type: 'datetime' }),
        defineField({ name: 'miles', title: 'Length (miles)', type: 'number' }),
        defineField({ name: 'gainFt', title: 'Gain (ft)', type: 'number' }),
        defineField({ name: 'lowFt', title: 'Lowest point (ft)', type: 'number' }),
        defineField({ name: 'highFt', title: 'Highest point (ft)', type: 'number' }),
        defineField({
          name: 'points',
          title: 'Profile points',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'elevPoint',
              fields: [
                defineField({ name: 'mile', title: 'Mile', type: 'number' }),
                defineField({ name: 'ft', title: 'Elevation (ft)', type: 'number' }),
              ],
              preview: {
                select: { mile: 'mile', ft: 'ft' },
                prepare: ({ mile, ft }) => ({ title: `mile ${mile}`, subtitle: `${ft} ft` }),
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'feeTiers',
      title: 'Entry fee tiers',
      type: 'array',
      group: 'entry',
      description:
        'In date order. Verified from the RunSignUp registration periods: $35 through ' +
        'Jan 31, $50 through Sep 30, $60 to race day. Also feeds the JSON-LD offers.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'feeTier',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string' }),
            defineField({ name: 'amount', title: 'Amount (USD)', type: 'number' }),
            defineField({ name: 'processingFee', title: 'Processing fee (USD)', type: 'number' }),
            defineField({ name: 'endsOn', title: 'Available until', type: 'date' }),
          ],
          preview: {
            select: { label: 'label', amount: 'amount' },
            prepare: ({ label, amount }) => ({
              title: amount != null ? `$${amount}` : '(no amount)',
              subtitle: label,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'directorName',
      title: 'Race director',
      type: 'string',
      group: 'people',
    }),
    defineField({
      name: 'directorNote',
      title: 'A line about the director',
      type: 'string',
      group: 'people',
      options: {
        canvasApp: { purpose: 'One concrete fact, not a bio. Specifics beat credentials.' },
      },
    }),
    defineField({
      name: 'parksDonation',
      title: 'Annual donation to Cincinnati Parks',
      type: 'string',
      group: 'people',
      description: 'Written as it should read, for example "$2,000".',
    }),
    confirmedField(
      'Tick this once the race director has confirmed the date, start area and fees for this edition.',
    ),
  ],
  preview: {
    select: { title: 'name', date: 'raceDate', confirmed: 'confirmed' },
    prepare: ({ title, date, confirmed }) => ({
      title: title ?? 'The Race',
      subtitle: [
        date ? new Date(date).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'No date set',
        confirmed ? null : 'NOT CONFIRMED',
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
