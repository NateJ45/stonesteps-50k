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
