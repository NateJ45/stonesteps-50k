// Safe to edit by hand
// =============================================================================
// The Stone Steps 50K's own icon art for the Studio (PORTS.md card 119)
// =============================================================================
// Drawn for the race on 2026-10-18 in the site's own grammar ("objects on a
// ground", DESIGN.md): each icon is a small rounded plate with the logo's hard
// offset shadow, a cream or gold glyph on rust, forest or charcoal. A plate
// carries its own ground, so every icon reads on the light paper and on the
// dark scheme alike. Files: src/assets/brand/studio-icon-*.svg.
//
// NOT PORTABLE: every fork rewrites it. The registry in src/sanity/brandIcons.tsx
// draws every meaning with @sanity/icons; any meaning listed here is drawn with
// the site's art instead, everywhere the Studio uses it (type icons, list-row
// tiles, the desk, field groups, templates, the phone sidebar's tools).
//
// Keep the art as the brand kit drew it. Point artIcon() at the kit's SVG file
// (Vite's `?url` import, so the file is fetched once and cached):
//
//   import bible from '../assets/brand/icon-bible.svg?url';
//   import { artIcon } from './artIcon';
//   export const BRAND_ICON_ART = { scripture: artIcon(bible, 'Bible') };
//
// or hand over a React component shaped like @sanity/icons (an <svg width="1em"
// height="1em" data-sanity-icon> using currentColor). Which document type,
// field group or tool means what lives in brand/brand.config.json
// `studio.icons`. Check every icon at 16, 20 and 24px in light AND dark.
// =============================================================================

import type { BrandIconKey } from '../lib/studio-icons';
import { artIcon, type BrandIcon } from './artIcon';
import steps from '../assets/brand/studio-icon-steps.svg?url';
import bib from '../assets/brand/studio-icon-bib.svg?url';
import stopwatch from '../assets/brand/studio-icon-stopwatch.svg?url';
import pine from '../assets/brand/studio-icon-pine.svg?url';
import runner from '../assets/brand/studio-icon-runner.svg?url';
import ticket from '../assets/brand/studio-icon-ticket.svg?url';
import trophy from '../assets/brand/studio-icon-trophy.svg?url';
import board from '../assets/brand/studio-icon-board.svg?url';
import megaphone from '../assets/brand/studio-icon-megaphone.svg?url';
import heart from '../assets/brand/studio-icon-heart.svg?url';

const Steps = artIcon(steps, 'Stone steps');
const Bib = artIcon(bib, 'Race bib');
const Stopwatch = artIcon(stopwatch, 'Stopwatch');
const Pine = artIcon(pine, 'Pine tree');
const Runner = artIcon(runner, 'Runner');
const Ticket = artIcon(ticket, 'Entry ticket');
const Trophy = artIcon(trophy, 'Record');
const Board = artIcon(board, 'Results');
const Megaphone = artIcon(megaphone, 'Race notice');
const Heart = artIcon(heart, 'Sponsor');

/** Which meaning wears which drawing. Everything unlisted uses @sanity/icons. */
export const BRAND_ICON_ART: Partial<Record<BrandIconKey, BrandIcon>> = {
  // Pages and the sections they are built from: the steps the race is named for.
  home: Steps,
  pages: Steps,
  page: Steps,
  sections: Steps,
  savedSection: Steps,
  // The race itself and its race days: a bib.
  event: Bib,
  // The race-day schedule.
  times: Stopwatch,
  // The course and its features: Mt. Airy Forest.
  place: Pine,
  // Runners.
  person: Runner,
  people: Runner,
  // The distances, printed on the site as entry tickets.
  service: Ticket,
  // Records.
  value: Trophy,
  // Results.
  document: Board,
  // Race notices.
  notice: Megaphone,
  // Sponsors.
  give: Heart,
};
