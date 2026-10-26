// scripts/lib/result-sets.mjs
//
// Reads RunSignUp's result sets for one event: which set is the archive, and
// who in it is a trekker. Also reads an event's name as a distance. Pure, so it
// is tested in result-sets.test.mjs.
//
// WHAT THE API HAS SERVED, YEAR BY YEAR (surveyed 2026-10-25). The RunSignUp
// results page shows many lists per year ("Overall Results with Lap Times",
// "Detailed Results with Laps and Pace", "Age Group Results", a 2022 "27K
// Trekker" list), but most of those are uploaded files the REST API never
// returns. What it returns as individual_results_sets:
//   2017            one set per distance, named "Overall"
//   2018 to 2023    one set, "Overall 50K" / "Overall 27K"
//   2024, 2025      one set, "50K Overall Results" / "27K Overall Results"
//   2026            TWO sets: "50K Overall Results" and "50K Including
//                   Trekkers" (same for the 27K)
//   2015, 2016, 2020, 2021 27K: none (file-only or no race)
// The names change every few years, so nothing here matches a whole name.
//
// THE 2026 SHAPE, which is why this file exists. In the Overall set the
// trekkers are present but have no time; in the Including set they have their
// time and the places are renumbered across everyone. The old rule, "take the
// largest set", picked the Including set, which would have imported every
// trekker unflagged and shifted the place of everyone behind them.
//
// THE RULE.
//   - Sets whose name mentions "trek" are trekker sets; the rest are plain.
//   - The archive is the largest plain set, and its places stand.
//   - A runner with a time in a trekker set and NO time in the archive (absent,
//     or present with a blank time) is a trekker: their trekker-set row is
//     added with `trekker: true`, and the importer gives them no place, the
//     same convention as the 2004 to 2007 archive rows.
//   - Rows are matched on bib, falling back to the name: the two sets do NOT
//     share result_id values.
//   - Only trekker sets and no plain set: import the largest as it stands
//     rather than drop the year, and say so.

const TREK = /trek/i;

const hasTime = (r) =>
  /\d/.test(String(r?.chip_time ?? '')) || /\d/.test(String(r?.clock_time ?? ''));

/** Identity of a row across two sets of the same event. */
function rowKey(r) {
  const bib = String(r?.bib ?? '').trim();
  if (bib) return `bib:${bib}`;
  const name = `${r?.first_name ?? ''} ${r?.last_name ?? ''}`.trim().toLowerCase();
  return name ? `name:${name}` : null;
}

const largest = (list) =>
  list.reduce((a, b) => ((b.results?.length ?? 0) > (a.results?.length ?? 0) ? b : a));

/**
 * @param {Array<{ individual_result_set_name?: string, results?: object[] }> | undefined} sets
 * @returns {{ rows: object[], trekkers: number, note?: string }}
 */
export function pickResultRows(sets) {
  const all = (Array.isArray(sets) ? sets : []).filter(
    (s) => Array.isArray(s?.results) && s.results.length > 0,
  );
  if (all.length === 0) return { rows: [], trekkers: 0 };

  const plain = all.filter((s) => !TREK.test(s.individual_result_set_name ?? ''));
  const trekSets = all.filter((s) => TREK.test(s.individual_result_set_name ?? ''));

  if (plain.length === 0) {
    return {
      rows: largest(trekSets).results,
      trekkers: 0,
      note: 'only a combined trekker set was published; trekkers are not told apart',
    };
  }

  const archive = largest(plain).results;
  if (trekSets.length === 0) return { rows: archive, trekkers: 0 };

  // Who already has a time in the archive.
  const timedInArchive = new Set(archive.filter(hasTime).map(rowKey).filter(Boolean));

  // Every timed row in any trekker set whose runner has no time in the archive.
  const trekRows = new Map();
  for (const set of trekSets) {
    for (const r of set.results) {
      const key = rowKey(r);
      if (!key || !hasTime(r) || timedInArchive.has(key) || trekRows.has(key)) continue;
      trekRows.set(key, { ...r, trekker: true });
    }
  }

  // Drop the archive's blank-time placeholder for each trekker, keep the rest.
  const kept = archive.filter((r) => !trekRows.has(rowKey(r)));
  return { rows: [...kept, ...trekRows.values()], trekkers: trekRows.size };
}

/**
 * An event's distance from its name: "50K", "50k", "50 K", "Stone Steps 50K
 * Trail Run" all read as 50k. Returns null for anything else (a kids' run, a
 * volunteer slot), which the importer reports rather than silently skips.
 */
export function distanceFromEventName(name) {
  const s = String(name ?? '').toLowerCase();
  if (/(^|[^0-9])50\s*k(m)?\b/.test(s)) return '50k';
  if (/(^|[^0-9])27\s*k(m)?\b/.test(s)) return '27k';
  return null;
}
