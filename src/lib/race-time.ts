// Parsing and formatting race times.
//
// Times live as whole seconds (see raceResult.ts). These are the two ends of
// that: the importer parses RunSignUp's strings in, and the pages format them
// back out. Both are here so a round trip is one file to read and one file to
// test.
//
// Foundation, edit with care. Covered by src/lib/race-time.test.ts.

/**
 * Parse a RunSignUp time string to whole seconds.
 *
 * Handles the three shapes the API actually returns across the archive:
 *   "4:35:39.37"  h:mm:ss.fraction  (2024 onward, chip timing)
 *   "4:58:05"     h:mm:ss           (older years, gun time)
 *   "58:05"       mm:ss             (short, defensive)
 *
 * Fractional seconds are TRUNCATED, not rounded. Two runners a tenth apart must
 * not collapse to the same second and reorder the results, and truncation is
 * what the published tables already show.
 *
 * Returns null for anything unparseable, including the empty string, which is
 * what `chip_time` is for every year before 2024. The importer falls back to
 * gun time on null rather than dropping the finisher.
 */
export function parseRaceTime(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;

  const parts = t.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;

  const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  // Minutes and seconds above 59 mean a malformed string, not a long race.
  if (parts.length === 3 && (m > 59 || s >= 60)) return null;
  if (parts.length === 2 && s >= 60) return null;

  const total = h * 3600 + m * 60 + Math.floor(s);
  return total > 0 ? total : null;
}

/**
 * Format whole seconds as a race time.
 *
 * Always h:mm:ss, even under an hour, so a column of times stays aligned. The
 * results tables are set in a monospace face with tabular figures for the same
 * reason: a time is a measurement, and measurements line up.
 */
export function formatRaceTime(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Normalise a name for identity.
 *
 * Older RunSignUp years shout ("TED BROSS") while recent ones do not. Without
 * this the same runner becomes two athlete documents and splits their own
 * record, which is the string-identity bug this whole model exists to avoid.
 * Hyphenated and apostrophe names keep their shape.
 */
export function titleCaseName(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  const titled = raw
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s\-'’])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase());
  return fixNameCasing(titled);
}

/**
 * The two places plain title casing gets a real name wrong.
 *
 * Folding a shouted name to Title Case is right about almost everything and
 * confidently wrong about these, and both are visible: /results lists 1,961
 * names in full, so "Mcmillian" and "Lewis Iii" are on the page rather than
 * buried in a database.
 *
 * NEITHER CHANGES IDENTITY. Slugs lowercase everything, so "McCane" and
 * "Mccane" slug identically and no athlete document splits in two. That is
 * asserted in race-time.test.ts, because a future "improvement" here that did
 * move a slug would silently fork a runner's history.
 *
 * Mac is deliberately NOT touched. Mc is followed by a capital in essentially
 * every surname that carries it, but Mac is not: Mackey, Macey and Machado are
 * all in this archive or one like it, and "MacKey" would be a new error
 * introduced to fix an old one.
 */
function fixNameCasing(name: string): string {
  let out = name.replace(/\bMc([a-z])/g, (_, ch: string) => 'Mc' + ch.toLocaleUpperCase());

  // Generational suffixes, only as the last token of a name that has one to
  // spare. Restricted to II, III and IV on purpose: "Iv" and "Vi" are plausible
  // given names, and uppercasing someone's first name is a worse failure than
  // leaving a rare suffix lowercase.
  const parts = out.split(' ');
  if (parts.length >= 3 && /^(ii|iii|iv)$/i.test(parts[parts.length - 1])) {
    parts[parts.length - 1] = parts[parts.length - 1].toLocaleUpperCase();
    out = parts.join(' ');
  }
  return out;
}
