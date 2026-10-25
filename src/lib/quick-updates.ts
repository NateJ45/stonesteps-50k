// Safe to edit by hand
// =============================================================================
// The race's Quick update documents (Stone Steps, 2026-10-18; PORTS.md card 111)
// =============================================================================
// The Studio's Quick update tool (src/sanity/kit/QuickUpdateTool.tsx, PORTABLE)
// publishes whatever a form's `build` returns, straight away and without the
// Studio's validation. These are the builders for the race-week phone jobs in
// src/sanity/kit.config.ts, kept pure so src/lib/quick-updates.test.ts can check
// that each one is a complete, valid notice (`announcement`).
//
// A notice's end date is read when the site is BUILT (src/layouts/BaseLayout.astro),
// so it comes down at the first website update after its last day, not on the
// stroke of midnight. The done messages say so.
// =============================================================================

// Type alias, not an interface: the Quick update tool wants a plain record.
export type NoticeDoc = {
  _type: 'announcement';
  internalTitle: string;
  message: string;
  style: 'info' | 'highlight' | 'urgent';
  enabled: true;
  endDate: string;
  link?: { label: string; url: string };
};

/** A local calendar day `days` from `now`, as "2026-10-25". */
export function inDays(now: Date, days: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The end of a local day ("2026-10-18" -> 23:59 that evening, as ISO). */
export function endOfDay(date: string): string {
  return new Date(`${date}T23:59:00`).toISOString();
}

/** The Studio-only name of a notice: its first words, dated. */
export function noticeName(message: string, date: string): string {
  const words = message.trim().replace(/\s+/g, ' ');
  const short = words.length > 40 ? `${words.slice(0, 40).trimEnd()}...` : words;
  return `${short} (until ${date})`;
}

/** A notice that shows until the end of `lastDay`. */
export function buildNotice(
  v: { message: string; lastDay: string; link?: string },
  style: NoticeDoc['style'] = 'info',
): NoticeDoc {
  const doc: NoticeDoc = {
    _type: 'announcement',
    internalTitle: noticeName(v.message, v.lastDay),
    message: v.message.trim(),
    style,
    enabled: true,
    endDate: endOfDay(v.lastDay),
  };
  if (v.link) doc.link = { label: 'More details', url: v.link };
  return doc;
}

// ── More of the owner's weekly jobs (studio-complete, 2026-10-19) ───────────
// docs/agent/studio-plan.md lists the jobs these serve. Only ONE notice shows
// on the website at a time (getActiveAnnouncement in src/lib/queries.ts: red
// first, then highlight, then whichever ends soonest), so the season's long
// notices (registration, volunteers, results) are plain 'info': a short
// race-week notice ending sooner still wins the top of the page.

/** The words a form starts with, so a job on a phone is mostly "press the button". */
export const NOTICE_STARTERS = {
  registration: 'Registration is open for the Stone Steps 50K and 27K. Places are capped.',
  volunteers:
    'We need volunteers for the aid stations, the course and bib pickup. Sign up and run the race from the other side.',
  results: 'The results are in. Find your time, and every finish since 2003, in the results.',
} as const;

/** The site's own results page, linked from the "results are in" notice. */
export const RESULTS_PATH = '/results/';

/**
 * A notice that links somewhere with its own words ("Register", "See the
 * results"). The link may be a page on this site ("/results/") or a full
 * https address; the notice schema takes both.
 */
export function buildLinkedNotice(v: {
  message: string;
  lastDay: string;
  url?: string;
  label: string;
}): NoticeDoc {
  const doc = buildNotice({ message: v.message, lastDay: v.lastDay });
  if (v.url) doc.link = { label: v.label, url: v.url };
  return doc;
}

export type SponsorDoc = {
  _type: 'sponsor';
  name: string;
  url?: string;
  orderRank: string;
};

/**
 * A place at the END of the drag-to-order sponsor list. The list's order is a
 * LexoRank string (`0|hzzzzz:`); adding a character after the last one sorts
 * after it and is still a valid rank, so the drag handles keep working. With
 * no sponsors yet it is the plugin's own first rank.
 */
export function rankAfter(last?: string | null): string {
  if (!last || !last.includes('|')) return '0|hzzzzz:';
  return last.includes(':') ? `${last}i` : `${last}:i`;
}

/** A sponsor with a name and maybe a website; the logo is added later in the full editor. */
export function buildSponsor(v: { name: string; url?: string }, lastRank?: string | null) {
  const doc: SponsorDoc = {
    _type: 'sponsor',
    name: v.name.trim(),
    orderRank: rankAfter(lastRank),
  };
  if (v.url) doc.url = v.url.trim();
  return doc;
}
