// Safe to edit by hand
// =============================================================================
// Small builders shared by the race's page templates and section patterns
// =============================================================================
// pageTemplates.ts (a whole new page) and sectionPatterns.ts (a few sections
// dropped into a page that exists) use the same blocks the same way, so a
// race-week page and a race-week band on the home page read alike.
//
// Every line the race must supply goes through example(), so it starts
// "Example:" and the page builder warns until it is replaced
// (src/lib/page-guardrails.ts). Keys are added by freshKeys() in the callers.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// =============================================================================

import { example } from '../lib/authoring.ts';

export { example };

type Rec = Record<string, unknown>;

/** One Portable Text paragraph (or heading, with a style). */
export const para = (text: string, style = 'normal'): Rec => ({
  _type: 'block',
  style,
  markDefs: [],
  children: [{ _type: 'span', marks: [], text }],
});

/** A button to a page on this site (the editor can repoint it). */
export const button = (label: string, internalPath?: string): Rec => ({
  _type: 'ctaBlock',
  label,
  linkType: 'internal',
  ...(internalPath ? { internalPath } : {}),
});

/** A button to somewhere else: RunSignUp, a sign-up sheet, a photo album. */
export const outLink = (label: string): Rec => ({
  _type: 'ctaBlock',
  label,
  linkType: 'external',
});

/** The page's opening band, the one every page on the site starts with. */
export const header = (eyebrow: string, headline: string, lede: string): Rec => ({
  _type: 'pageHeaderSection',
  eyebrow: example(eyebrow),
  headline: example(headline),
  lede: example(lede),
});

/** A text block: a heading and a few paragraphs. */
export const text = (heading: string, ...paragraphs: string[]): Rec => ({
  _type: 'richTextSection',
  heading: example(heading),
  body: paragraphs.map((p) => para(example(p))),
});

/** The call-to-action band: a headline, a line and one button. */
export const band = (headline: string, subhead: string, cta: Rec): Rec => ({
  _type: 'ctaBandSection',
  headline: example(headline),
  subhead: example(subhead),
  cta,
});

/** A race block that draws itself from the race's own data, with its heading. */
export const raceBlock = (type: string, eyebrow: string, headline: string): Rec => ({
  _type: type,
  eyebrow: example(eyebrow),
  headline: example(headline),
});

// ── The builder kit (builderSections.ts, PORTS.md card 173) ───────────────────
// Plain data in the shape the kit's schema stores. The callers wrap anything the
// race must supply in example(); dates come from daysFromNow() so an event block
// opens with dates still to come (one whose dates have passed draws nothing).
// Times are left empty on purpose: a template never guesses a race-day time.

/** Several paragraphs at once. */
export const paras = (...texts: string[]): Rec[] => texts.map((t) => para(t));

/** A calendar day `days` from today, as YYYY-MM-DD. */
export const daysFromNow = (days: number, from = new Date()): string => {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
};

export const column = (heading: string, ...body: string[]): Rec => ({
  _type: 'textColumn',
  heading,
  body: paras(...body),
});

export const columns = (heading: string, cols: Rec[], intro?: string): Rec => ({
  _type: 'columnsSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  textColumns: cols,
});

export const link = (cta: Rec, note?: string): Rec => ({
  _type: 'quickLink',
  link: cta,
  ...(note ? { note } : {}),
});

export const buttonRow = (
  heading: string,
  links: Rec[],
  o: { intro?: string; layout?: 'buttons' | 'cards' } = {},
): Rec => ({
  _type: 'buttonRowSection',
  ...(heading ? { heading } : {}),
  ...(o.intro ? { intro: o.intro } : {}),
  layout: o.layout ?? 'buttons',
  links,
});

export const tab = (label: string, ...body: string[]): Rec => ({
  _type: 'tabPanel',
  label,
  body: paras(...body),
});

export const tabs = (heading: string, panels: Rec[], intro?: string): Rec => ({
  _type: 'tabsSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  tabs: panels,
});

export const moment = (year: string, title: string, text: string): Rec => ({
  _type: 'timelineEntry',
  year,
  title,
  text,
});

export const timeline = (heading: string, entries: Rec[], intro?: string): Rec => ({
  _type: 'timelineSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  entries,
});

export const letter = (o: {
  eyebrow?: string;
  greeting?: string;
  body: string[];
  signOff?: string;
  name: string;
  role?: string;
}): Rec => ({
  _type: 'letterSection',
  ...(o.eyebrow ? { eyebrow: o.eyebrow } : {}),
  greeting: o.greeting ?? 'Dear runners,',
  body: paras(...o.body),
  signOff: o.signOff ?? 'See you on the trail,',
  name: o.name,
  ...(o.role ? { role: o.role } : {}),
});

export const eventDate = (
  date: string,
  o: { startTime?: string; endTime?: string; label?: string } = {},
): Rec => ({
  _type: 'eventDate',
  date,
  ...(o.startTime ? { startTime: o.startTime } : {}),
  ...(o.endTime ? { endTime: o.endTime } : {}),
  ...(o.label ? { label: o.label } : {}),
});

export const eventDetails = (o: {
  eyebrow?: string;
  title: string;
  dates: Rec[];
  place: string;
  note?: string;
  button?: Rec;
}): Rec => ({
  _type: 'eventDetailsSection',
  ...(o.eyebrow ? { eyebrow: o.eyebrow } : {}),
  title: o.title,
  occurrences: o.dates,
  place: o.place,
  ...(o.note ? { note: o.note } : {}),
  ...(o.button ? { button: o.button } : {}),
  showCalendar: true,
});

/** One row of a schedule. `scheduleRow`, because scheduleItem is a document type here. */
export const slot = (startTime: string, title: string, note?: string): Rec => ({
  _type: 'scheduleRow',
  ...(startTime ? { startTime } : {}),
  title,
  ...(note ? { note } : {}),
});

export const scheduleDay = (title: string, items: Rec[]): Rec => ({
  _type: 'scheduleDay',
  ...(title ? { title } : {}),
  items,
});

export const schedule = (heading: string, days: Rec[], intro?: string): Rec => ({
  _type: 'scheduleSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  days,
});

/** A card with a photo. The race director adds the photo. */
export const photoCard = (title: string, body?: string, cta?: Rec): Rec => ({
  _type: 'photoCard',
  title,
  ...(body ? { body } : {}),
  ...(cta ? { link: cta } : {}),
});

export const photoCards = (heading: string, cards: Rec[], intro?: string): Rec => ({
  _type: 'photoCardsSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  cards,
});
