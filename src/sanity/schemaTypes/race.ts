// Race singleton. The one document holding this year's edition: date, venue,
// the RunSignUp links, the race director, and the entry-fee tiers.
//
// Foundation, edit with care. Registered in index.ts, pinned as a singleton in
// structure.ts and in the SINGLETON_TYPES set in sanity.config.ts.
//
// PROVENANCE: where a value has a verified source, the source is recorded in a
// `//` comment above the field, for maintainers. Field descriptions are for the
// editor typing into the box, so they stay instructional and carry no dates,
// names or sourcing. Anything the race does not publish anywhere carries the
// shared `confirmed` flag instead (see _confirmedField.ts) and renders behind a
// visible "Not confirmed" marker until a human ticks the box.

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
    // The 2026 race is the 24th running, confirmed by David Corfman. Count it off
    // the archive rather than the RunSignUp blurb: /results holds 2003 through 2025
    // with no year missed, so 2026 is the 24th. The RunSignUp listing still says 23rd.
    defineField({
      name: 'editionNumber',
      title: 'Which edition is this?',
      type: 'number',
      group: 'basics',
      description:
        'Which running of the race this is, as a number. Shown as an ordinal on the site, ' +
        'for example 24 becomes 24th.',
    }),
    // Verified from RunSignUp: 25 October 2026, 8:00 am. Also feeds the schema.org
    // SportsEvent startDate.
    defineField({
      name: 'raceDate',
      title: 'Race day',
      type: 'datetime',
      group: 'basics',
      description:
        'Start of the first event, in local time. Drives the countdown clock on the home page.',
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
      // Verified: The Oval, Area 13.
      description: 'The spot inside the venue where runners start and finish, named as a place.',
    }),
    // Verified from RunSignUp: 5083 Colerain Ave.
    defineField({
      name: 'streetAddress',
      title: 'Street address',
      type: 'string',
      group: 'where',
      description: 'Street address of the venue, with no city or ZIP.',
    }),
    defineField({ name: 'city', title: 'City', type: 'string', group: 'where' }),
    defineField({ name: 'region', title: 'State', type: 'string', group: 'where' }),
    defineField({ name: 'postalCode', title: 'ZIP', type: 'string', group: 'where' }),
    defineField({
      name: 'geo',
      title: 'Coordinates',
      type: 'geopoint',
      group: 'where',
      // Verified from RunSignUp: 39.17275, -84.568806. Drives the JSON-LD location.
      description: 'Drop a pin on the start area. Feeds the map data search engines read.',
    }),
    // ATMOSPHERE PHOTOGRAPHS. Not illustrations of anything: these are laid
    // into the OUTER MARGIN of a band, faint and faded off at the edges, so a
    // wide screen shows the race behind the content instead of empty paper.
    // They are chosen per band by position rather than by subject, so any
    // photograph of the race works and none of them needs a caption.
    defineField({
      name: 'atmosphere',
      title: 'Atmosphere photographs',
      description:
        'Race photographs shown very faintly behind the wide margins of some bands. ' +
        'Decoration only, no captions needed. Two or three is plenty.',
      type: 'array',
      group: 'where',
      validation: (Rule) => Rule.max(4),
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
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
      // While this is blank the elevation profile labels its own shape as illustrative.
      description:
        'Link to a surveyed GPX track for entrants to download. Leave blank until one exists.',
    }),
    defineField({
      name: 'elevationProfile',
      title: 'Elevation profile (measured)',
      type: 'object',
      group: 'links',
      // Written by scripts/build-elevation.mjs from a real GPS track, never typed by
      // hand. While it is empty the site draws a SYNTHETIC profile that says so in its
      // own caption. Filling it in is what makes the profile a measurement.
      description:
        'Filled in by a build script from a GPS track. Leave it alone: nothing here is ' +
        'meant to be typed by hand.',
      options: { collapsible: true, collapsed: true, canvasApp: { exclude: true } },
      fields: [
        defineField({ name: 'source', title: 'Where the data came from', type: 'string' }),
        defineField({ name: 'sampledAt', title: 'Sampled at', type: 'datetime' }),
        defineField({ name: 'miles', title: 'Length (miles)', type: 'number' }),
        defineField({ name: 'gainFt', title: 'Gain (ft)', type: 'number' }),
        defineField({ name: 'lossFt', title: 'Loss (ft)', type: 'number' }),
        defineField({
          name: 'aidMiles',
          title: 'Aid station mile marks',
          type: 'array',
          of: [defineArrayMember({ type: 'number' })],
          // Derived from the track by the script, not typed.
          description:
            'Where the track passes the start, in miles. Draws the aid station lines on the chart.',
        }),
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
      // Verified from the RunSignUp registration periods: $35 through Jan 31, $50
      // through Sep 30, $60 to race day. Also feeds the JSON-LD offers.
      description:
        'One entry per price, in date order, cheapest first. Each needs a label, an amount, ' +
        'and the date it ends.',
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
