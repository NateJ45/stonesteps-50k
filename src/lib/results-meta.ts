// Safe to edit by hand
//
// The <meta name="description"> for one year's results page (/results/<year>/).
//
// WHY THIS IS COMPUTED. Every year used to share one sentence with the number
// swapped ("Every finisher of the 2019 Stone Steps 50K and 27K, with times."),
// which the SEO audit flagged as short and near-duplicate. The page already
// holds better material: the race-day date, the finisher counts, who won each
// distance and what the weather did. This builds a sentence from those, so a
// new year gets its own description the day its results are imported.
//
// FACTS ONLY. Winners are the runners placed first, which the page already
// shows on its record board. Nothing is added that the page does not say, and
// there are no em-dashes (public-facing copy rule).
//
// SHAPE. A description is assembled from slots (core facts, winners, weather,
// tail), each with a few wordings from rich to terse. All combinations are
// tried and the richest one that lands in 120 to 155 characters wins. Search
// engines cut around 155, and under 120 is what the audit called short.
//
// Unit-tested in results-meta.test.ts (length bounds and uniqueness).

import { formatRaceTime } from './race-time.ts';
import { conditionLabel, wasWet, type RaceDay } from './raceWeather.ts';

export const MIN_LEN = 120;
export const MAX_LEN = 155;

// How much each slot's richer wordings are worth when choosing between combinations that
// fit: core facts, winners, weather, tail. The tail is filler that only exists to
// reach the minimum, so it counts for least and never beats a real fact.
const WEIGHTS = [4, 5, 3, 1];

export interface MetaDistance {
  name: string;
  finishers: number;
  /** The runner placed first, when the record has a name and a time. */
  winner?: { name: string; seconds: number } | null;
}

export interface MetaEdition {
  year: number;
  total: number;
  distances: MetaDistance[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-10-26" -> "Oct 26". Null when the string is not a plain ISO date. */
function shortDate(iso: string | undefined): string | null {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return null;
  const month = MONTHS[Number(m[1]) - 1];
  return month ? `${month} ${Number(m[2])}` : null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Each slot is a list of wordings, richest first. An empty string means "leave it out". */
function slots(edition: MetaEdition, day: RaceDay | null | undefined): string[][] {
  const names = edition.distances.map((d) => d.name);
  const race = names.length ? names.join(' and ') : 'race';
  const date = shortDate(day?.date);
  const count = plural(edition.total, 'finisher', 'finishers');

  const core = [
    date
      ? `${count} in the ${edition.year} Stone Steps ${race} at Mt. Airy Forest, run ${date}.`
      : `${count} in the ${edition.year} Stone Steps ${race} at Mt. Airy Forest.`,
    `${count} in the ${edition.year} Stone Steps ${race}.`,
  ];

  const won = edition.distances.filter((d) => d.winner && d.winner.name && d.winner.seconds > 0);
  const winnerLine = (d: MetaDistance) =>
    `${d.name} won by ${d.winner!.name} in ${formatRaceTime(d.winner!.seconds)}.`;
  const winners = won.length ? [won.map(winnerLine).join(' '), winnerLine(won[0]), ''] : [''];

  let weather = [''];
  if (day && Number.isFinite(day.high)) {
    const label = conditionLabel(day.code).toLowerCase();
    // The WMO code can say "drizzle" for a trace the archive measured at 0.02 in.
    // The page's own weather strip draws that dry (see iconKind), so say so here too.
    const dryRainCode = !wasWet(day) && /drizzle|rain|shower/.test(label);
    const sky = dryRainCode ? 'overcast' : label;
    weather = [
      typeof day.startTemp === 'number'
        ? `Race day: ${sky}, ${day.startTemp}°F at the start, high of ${day.high}°F.`
        : `Race day: ${sky}, high of ${day.high}°F.`,
      `Race day: ${sky}, high of ${day.high}°F.`,
      '',
    ];
  }

  const tail = ['Every finisher listed with times.', 'Full results with times.', ''];

  return [core, winners, weather, tail];
}

/**
 * The description for one year. Always returns something; when no combination
 * fits the 120 to 155 window (a year with almost no data) it returns the
 * closest one, and the unit test is what catches that for real years.
 */
export function resultsDescription(
  edition: MetaEdition,
  day?: RaceDay | null,
  opts: { min?: number; max?: number } = {},
): string {
  const min = opts.min ?? MIN_LEN;
  const max = opts.max ?? MAX_LEN;
  const options = slots(edition, day);

  let best: { text: string; score: number; gap: number } | null = null;
  const walk = (i: number, parts: string[], score: number) => {
    if (i === options.length) {
      const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      // Distance outside the window; 0 when inside it.
      const gap = text.length < min ? min - text.length : Math.max(0, text.length - max);
      const better =
        !best ||
        gap < best.gap ||
        (gap === best.gap &&
          (score > best.score || (score === best.score && text.length > best.text.length)));
      if (better) best = { text, score, gap };
      return;
    }
    options[i].forEach((w, rank) =>
      walk(i + 1, [...parts, w], score + WEIGHTS[i] * (options[i].length - 1 - rank)),
    );
  };
  walk(0, [], 0);
  return best!.text;
}
