// Safe to edit by hand
// =============================================================================
// The race's own Checkup rules (Stone Steps, PORTS.md card 106)
// =============================================================================
// The kit's Checkup (src/sanity/kit/CheckupTool.tsx, PORTABLE) runs the generic
// rules (pictures with no description, Google descriptions, broken links, old
// drafts, the Trash) plus these, over ONE fetch of every document. Home's
// Fix-it list shows the same findings by name.
//
// These came from the race's first Checkup pane (2026-09-12, retired 2026-10-18
// when the kit took over), where each one was a separate query. The rules are
// the same; only the shape changed, to pure functions over the fetched docs.
//
// WHY THESE. Most of what goes wrong on this site is not a bug, it is a fact
// going stale: a date that has passed, a price nobody can buy any more, a
// detail nobody confirmed. And one that is not stale but quietly wrong: an
// early starter (a trekker) who finished near the front and is not marked, so
// takes a record the race does not give them. None of that fails a build.
// =============================================================================

import { plural, type CheckupRule, type Doc } from '../lib/studio-checkup';

const DAY = 1000 * 60 * 60 * 24;

const isOfType = (type: string) => (d: Doc) => d._type === type;

/** The race document (published), if there is one. */
const raceOf = (published: Doc[]) => published.find(isOfType('race'));

/** The newest year that has any results on file, or null. */
function latestResultYear(published: Doc[]): number | null {
  let latest: number | null = null;
  for (const d of published) {
    if (d._type !== 'raceResult' || typeof d.year !== 'number') continue;
    if (latest === null || d.year > latest) latest = d.year;
  }
  return latest;
}

export const raceRules: CheckupRule[] = [
  {
    // The single most visible way this site goes stale. The countdown, the
    // footer band and the Google listing all read this one date.
    id: 'race-date-past',
    run: ({ published, now }) => {
      const race = raceOf(published);
      const date = typeof race?.raceDate === 'string' ? race.raceDate : null;
      if (!date) {
        return {
          severity: 'Needs doing',
          label: 'No race date is set',
          detail:
            "The countdown, the footer and the Google listing all read this one date. Set it in This year's race, Race day.",
          target: { doc: 'race', field: 'raceDate' },
          targetLabel: 'Set the date',
        };
      }
      const when = Date.parse(date);
      if (Number.isNaN(when) || when > now) return null;
      const daysAgo = Math.floor((now - when) / DAY);
      return {
        severity: 'Needs doing',
        label: `The race date passed ${plural(daysAgo, 'day')} ago`,
        detail:
          'The countdown has stopped and the "Next running" band has hidden itself. Put next year\'s date in, and move the edition number up by one.',
        target: { doc: 'race', field: 'raceDate' },
        targetLabel: 'Set next year’s date',
      };
    },
  },
  {
    // Prices are what a runner acts on. The ladder printed on a ticket is that
    // distance's own (distance.feeTiers), not the race document's.
    id: 'fees-expired',
    run: ({ published, now, nameOf }) => {
      const distances = published.filter(isOfType('distance'));
      const stale = distances.filter((d) => {
        const tiers = Array.isArray(d.feeTiers) ? (d.feeTiers as { endsOn?: string }[]) : [];
        return tiers.some((t) => typeof t.endsOn === 'string' && Date.parse(t.endsOn) < now);
      });
      if (!stale.length) return null;
      return {
        severity: 'Worth a look',
        label: `${plural(stale.length, 'distance')} with an entry fee whose date has passed`,
        detail:
          'A price step that ended is still printed on the ticket. Check the 50K and the 27K, and make the dates and prices match what RunSignUp is charging.',
        target: { pane: 'this-years-race;orderable-distance' },
        targetLabel: 'Open the distances',
        items: stale.map((d) => ({
          name: nameOf(d),
          target: { doc: d._id, type: 'distance', field: 'feeTiers' },
        })),
        itemLabel: 'An entry fee date has passed',
      };
    },
  },
  {
    // The "Not confirmed" marker is the site's honesty mechanism; this is the
    // nudge to resolve it rather than leave it up for ever. Unticked counts,
    // not only a box set to false: a new schedule line has no tick at all.
    id: 'not-confirmed',
    run: ({ published, nameOf }) => {
      const types = new Set(['race', 'scheduleItem', 'courseFeature', 'distance']);
      const open = published.filter((d) => types.has(d._type) && d.confirmed !== true);
      if (!open.length) return null;
      return {
        severity: 'Worth a look',
        label: `${plural(open.length, 'detail')} still marked "Not confirmed"`,
        detail:
          'Each one prints a small "Not confirmed" marker on the website. Read it, correct it if it is wrong, then tick "Confirmed by the race director".',
        target: { pane: 'this-years-race' },
        targetLabel: "Open this year's race",
        items: open.map((d) => ({
          name: nameOf(d),
          target: { doc: d._id, type: d._type, field: 'confirmed' },
        })),
        itemLabel: 'Not confirmed yet',
      };
    },
  },
  {
    // Only meaningful once the race has run. The import fetches results daily
    // through October and November, so a few days is generous.
    id: 'results-missing',
    run: ({ published, now }) => {
      const race = raceOf(published);
      const date = typeof race?.raceDate === 'string' ? race.raceDate : null;
      if (!date) return null;
      const raceTime = Date.parse(date);
      if (Number.isNaN(raceTime)) return null;
      const daysSince = Math.floor((now - raceTime) / DAY);
      if (daysSince < 3) return null;
      const raceYear = new Date(date).getUTCFullYear();
      const latest = latestResultYear(published);
      if (latest !== null && latest >= raceYear) return null;
      return {
        severity: 'Worth a look',
        label: `No ${raceYear} results on file, ${plural(daysSince, 'day')} after the race`,
        detail:
          'They normally arrive on their own within a day of the timer posting them to RunSignUp. If it has been longer than that, ask for the import to be checked.',
        target: { pane: 'results-and-records;results' },
        targetLabel: 'Open the results',
      };
    },
  },
  {
    // An unflagged trekker near the front can take a record they were not
    // eligible for, and nothing else on the site would mention it.
    id: 'trekkers-unflagged',
    run: ({ published }) => {
      const latest = latestResultYear(published);
      if (latest === null) return null;
      const year = published.filter((d) => d._type === 'raceResult' && d.year === latest);
      if (!year.length || year.some((d) => d.trekker === true)) return null;
      return {
        severity: 'Worth a look',
        label: `No trekkers are marked in the ${latest} results`,
        detail:
          'Trekkers take the early start and cannot win an award, and the site leaves them out of every record. RunSignUp does not say who they were, so somebody has to tick the box. If an early starter finished near the front, open their result and tick "Ran as a trekker".',
        target: { pane: `results-and-records;results;results-${latest}` },
        targetLabel: `Open the ${latest} results`,
      };
    },
  },
  {
    id: 'sponsor-no-logo',
    run: ({ published, nameOf }) => {
      const bare = published.filter((d) => {
        if (d._type !== 'sponsor') return false;
        const logo = d.logo as { asset?: unknown } | undefined;
        return !logo?.asset;
      });
      if (!bare.length) return null;
      return {
        severity: 'For information',
        label: `${plural(bare.length, 'sponsor')} with no logo`,
        detail:
          'They show as a name-only patch, which looks deliberate rather than broken, so this is only worth fixing when you have the artwork.',
        target: { pane: 'this-years-race;orderable-sponsor' },
        targetLabel: 'Open the sponsors',
        items: bare.map((d) => ({
          name: nameOf(d),
          target: { doc: d._id, type: 'sponsor', field: 'logo' },
        })),
        itemLabel: 'No logo yet',
      };
    },
  },
  {
    // Not a fault: a standing invitation, because one GPS file unlocks it.
    id: 'elevation-synthetic',
    run: ({ published }) => {
      const race = raceOf(published);
      const profile = race?.elevationProfile as { points?: unknown[] } | undefined;
      if (!race || (Array.isArray(profile?.points) && profile.points.length > 0)) return null;
      return {
        severity: 'For information',
        label: 'The elevation chart is illustrative, not measured',
        detail:
          "It is drawn from the loop structure and says so on the page. One GPS file from any finisher's watch turns it into a measured profile.",
      };
    },
  },
];
