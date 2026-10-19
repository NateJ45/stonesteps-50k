#!/usr/bin/env node
// Safe to edit by hand
// =============================================================================
// gen-studio-banner.mjs: the strip along the foot of the Studio's Home banner
// =============================================================================
// PORTS.md card 118. The Home banner (src/sanity/kit/HomeBanner.tsx, PORTABLE)
// draws a decorative strip along its foot. For the Stone Steps 50K that strip
// is the race's own course: the 50K's elevation profile, eight loops of Mt.
// Airy Forest, from the same measured track the course page charts
// (scripts/data/course-profile.json, built by scripts/build-elevation.mjs).
//
// Writes public/studio-banner/course-profile.svg (wide, about 1000 by 60) and
// course-profile-phone.svg (about 390 by 56). Both are decorative (the banner
// gives them alt=""). Colours are the site's: the forest hills a step lighter
// than the forest top bar, and the ridge in the gold the site uses on forest.
//
//   npm run gen:studio-banner
//
// Re-run it only if the course profile changes. No dependencies.
// =============================================================================

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { points } = JSON.parse(
  readFileSync(resolve(root, 'scripts/data/course-profile.json'), 'utf8'),
);

const HILL = '#2E5738';
const RIDGE = '#FED89B';

/** Points [lon, lat, ft, mile, grade, loop] to an SVG strip of width x height. */
function strip(width, height, samples) {
  const miles = points.map((p) => p[3]);
  const feet = points.map((p) => p[2]);
  const maxMile = miles[miles.length - 1];
  const lo = Math.min(...feet);
  const hi = Math.max(...feet);
  const top = 6; // headroom so the ridge line is never clipped
  const yOf = (ft) => top + (1 - (ft - lo) / (hi - lo)) * (height - top - 4);
  // Resample evenly by distance so the path is light and the loops even.
  const out = [];
  let j = 0;
  for (let i = 0; i <= samples; i++) {
    const m = (i / samples) * maxMile;
    while (j < miles.length - 2 && miles[j + 1] < m) j++;
    const t = (m - miles[j]) / (miles[j + 1] - miles[j] || 1);
    const ft = feet[j] + (feet[j + 1] - feet[j]) * Math.max(0, Math.min(1, t));
    out.push([(i / samples) * width, yOf(ft)]);
  }
  const line = out.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
  <!-- The Stone Steps 50K's elevation profile (eight loops), drawn by scripts/gen-studio-banner.mjs. -->
  <path d="${area}" fill="${HILL}"/>
  <path d="${line}" fill="none" stroke="${RIDGE}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
`;
}

const dir = resolve(root, 'public/studio-banner');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'course-profile.svg'), strip(1000, 60, 400));
writeFileSync(resolve(dir, 'course-profile-phone.svg'), strip(390, 56, 200));
console.log('[gen-studio-banner] wrote public/studio-banner/course-profile{,-phone}.svg');
