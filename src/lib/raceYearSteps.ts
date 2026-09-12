// PORTABLE-ADJACENT: the pure half of the "Start a new race year" tool.
//
// WHY IT LIVES HERE AND NOT IN THE COMPONENT. Every one of these rules is a
// claim about what the race director still has to do, and a wrong one is worse
// than no tool at all: it tells him a job is done when it is not. They were
// inside the .tsx, where a test cannot reach them without pulling in
// @sanity/ui and a React renderer. As plain functions over a snapshot they are
// covered by race-year-steps.test.ts, which is what caught the four defects
// this file's comments record.
//
// The component (src/sanity/components/RaceYearTool.tsx) fetches the snapshot,
// renders the cards, and owns the links. Nothing here knows about Sanity.

import type { StudioTarget } from '@/sanity/components/studioLink';

export type State = 'done' | 'todo' | 'check';

export interface Step {
  id: string;
  title: string;
  blurb: string;
  target: StudioTarget;
  /** Given a snapshot of the dataset, is this step done? */
  state: (s: Snapshot) => State;
  /** Extra line shown under the blurb, when there is something to say. */
  note?: (s: Snapshot) => string | null;
}

export interface Snapshot {
  raceDate: string | null;
  editionNumber: number | null;
  /**
   * THE PRICES ARE PER DISTANCE, not on the race document. The 50K and the 27K
   * charge different money on the same dates, so the tiers the tickets print
   * come from each `distance` (see DistanceTickets.astro). This card used to
   * read `race.feeTiers` and tell Dave the prices were fine while the ticket
   * beside it showed last year's (2026-09-12).
   */
  distances: {
    name?: string;
    entryCap?: number;
    runSignUpEventId?: number;
    feeTiers?: { label?: string; endsOn?: string; price?: string }[];
  }[];
  unconfirmed: number;
  /** The race document's own confirmed flag, which gates the Google listing. */
  raceConfirmed: boolean | null;
  sponsors: number;
  latestResultYear: number | null;
  now: number;
}

const DAY = 1000 * 60 * 60 * 24;

/** 1 -> "1st", 23 -> "23rd". The teens are all "th", then the last digit
 *  decides. The card said "23th running" before this existed. */
export function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const last = n % 10;
  return `${n}${teen ? 'th' : last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}

/** The race year the site is currently advertising, or null. */
export function advertisedYear(s: Snapshot): number | null {
  if (!s.raceDate) return null;
  const t = new Date(s.raceDate);
  return Number.isNaN(t.getTime()) ? null : t.getUTCFullYear();
}

export const STEPS: Step[] = [
  {
    id: 'date',
    title: 'Put in next year’s date',
    blurb:
      'One field. It moves the countdown, the "Next running" band in the footer, and the date Google shows.',
    target: { doc: 'race' },
    state: (s) => {
      if (!s.raceDate) return 'todo';
      return new Date(s.raceDate).getTime() > s.now ? 'done' : 'todo';
    },
    // A future date is all this can check. It cannot tell a correct date from
    // a mistyped one, which is why the note always prints the date in full
    // rather than saying "done".
    note: (s) => {
      if (!s.raceDate) return 'No date set.';
      const t = new Date(s.raceDate).getTime();
      if (t > s.now) {
        return `Currently ${new Date(s.raceDate).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })}.`;
      }
      return `The date on the site is ${Math.floor((s.now - t) / DAY)} days ago.`;
    },
  },
  {
    id: 'edition',
    title: 'Move the edition number up by one',
    blurb: 'The "23rd edition" figure on the home page and in the footer.',
    target: { doc: 'race' },
    // Cannot be derived, only prompted: the number is right or wrong only in
    // relation to a date a human just set.
    state: () => 'check',
    note: (s) =>
      s.editionNumber
        ? `Currently the ${ordinal(s.editionNumber)} running as far as the site knows.`
        : null,
  },
  {
    id: 'fees',
    title: 'Check the entry fees, on each distance',
    blurb:
      'The price ladder printed on each ticket. The 50K and the 27K carry their own, so both ' +
      'need looking at, and they should match what RunSignUp is charging.',
    target: { pane: 'this-years-race;orderable-distance' },
    // ANY stale tier counts, not every one. The old version only spoke up when
    // EVERY tier had expired, so a ladder with one date in the past and one in
    // the future was reported as fine.
    state: (s) => {
      const tiers = s.distances.flatMap((d) => d.feeTiers ?? []);
      if (!tiers.length) return 'todo';
      const stale = tiers.filter((t) => t.endsOn && new Date(t.endsOn).getTime() < s.now);
      return stale.length ? 'todo' : 'check';
    },
    note: (s) => {
      const tiers = s.distances.flatMap((d) => d.feeTiers ?? []);
      if (!tiers.length) return 'No prices on file.';
      const stale = tiers.filter((t) => t.endsOn && new Date(t.endsOn).getTime() < s.now).length;
      return stale
        ? `${stale} of ${tiers.length} price tiers ended in the past.`
        : `${tiers.length} price tiers across ${s.distances.length} distances.`;
    },
  },
  {
    id: 'register-links',
    title: 'Point the Register buttons at this year’s events',
    blurb:
      'Each distance carries its RunSignUp event number. It changes every year, and a stale ' +
      'one sends entrants to last year’s closed event.',
    target: { pane: 'this-years-race;orderable-distance' },
    // Not derivable: the number is only right or wrong against RunSignUp.
    state: () => 'check',
    note: (s) => {
      const missing = s.distances.filter((d) => !d.runSignUpEventId).map((d) => d.name ?? '?');
      return missing.length
        ? `No event number on: ${missing.join(', ')}.`
        : `Event numbers on file: ${s.distances
            .map((d) => `${d.name ?? '?'} ${d.runSignUpEventId}`)
            .join(', ')}.`;
    },
  },
  {
    id: 'caps',
    title: 'Check the entry caps',
    blurb: 'The number of places on each distance, printed on its ticket.',
    target: { pane: 'this-years-race;orderable-distance' },
    state: () => 'check',
    note: (s) =>
      s.distances.map((d) => `${d.name ?? '?'} ${d.entryCap ?? 'not set'}`).join(', ') || null,
  },
  {
    id: 'schedule',
    title: 'Check the race-day schedule',
    blurb: 'Start times, trekker starts, and when the course closes.',
    target: { pane: 'this-years-race;orderable-scheduleItem' },
    state: () => 'check',
  },
  {
    id: 'unconfirmed',
    title: 'Clear the "Not confirmed" markers',
    blurb:
      'Anything the race has never published carries a small marker on the site. Confirm it or correct it.',
    target: { pane: 'checkup' },
    // THE COUNT INCLUDES THE RACE DOCUMENT, which gates whether Google is told
    // the entry is on sale. It was excluded, so a race nobody had re-confirmed
    // still reported "Nothing is unconfirmed".
    state: (s) => (s.unconfirmed === 0 ? 'done' : 'todo'),
    note: (s) =>
      s.unconfirmed === 0
        ? 'Nothing carries a "not confirmed" marker. Worth re-reading anyway: a tick ' +
          'set last year is still ticked this year.'
        : `${s.unconfirmed} item${s.unconfirmed === 1 ? '' : 's'} still marked not confirmed.`,
  },
  {
    id: 'sponsors',
    title: 'Update this year’s sponsors',
    blurb: 'Add whoever is in, remove whoever is out, and drag them into the order you want.',
    target: { pane: 'this-years-race;orderable-sponsor' },
    state: () => 'check',
    note: (s) => `${s.sponsors} sponsor${s.sponsors === 1 ? '' : 's'} on the site.`,
  },
  {
    id: 'results',
    title: 'After the race: check the results landed',
    blurb:
      'They import themselves within a day of your timer posting them. This is only a check, not a job.',
    target: { pane: 'this-years-race;results' },
    // MEASURED AGAINST THE LAST RACE THAT HAS RUN, not the one being advertised.
    // Checking against the advertised year meant step one (put next year's date
    // in) silenced this step: the race was suddenly "not run yet" and a missing
    // set of results from the race just gone stopped being reported.
    state: (s) => {
      const year = advertisedYear(s);
      if (!year || !s.raceDate) return 'check';
      const upcoming = new Date(s.raceDate).getTime() > s.now;
      const lastRun = upcoming ? year - 1 : year;
      return s.latestResultYear !== null && s.latestResultYear >= lastRun ? 'done' : 'todo';
    },
    note: (s) =>
      s.latestResultYear ? `Latest results on file: ${s.latestResultYear}.` : 'No results on file.',
  },
  {
    id: 'trekkers',
    title: 'After the race: mark any trekkers',
    blurb:
      'Early starters cannot win an award. The importer cannot tell who they were, so they need ticking by hand.',
    target: { pane: 'this-years-race;results' },
    state: () => 'check',
  },
];
