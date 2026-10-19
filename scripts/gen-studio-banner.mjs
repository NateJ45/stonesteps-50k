#!/usr/bin/env node
// Safe to edit by hand
// =============================================================================
// gen-studio-banner.mjs: the race's Studio art, drawn from the course itself
// =============================================================================
// PORTS.md cards 118 and 120. Everything here is the Stone Steps 50K's own
// grammar from the public site, lifted rather than invented:
//
//   - the 50K's elevation profile, seven loops of Mt. Airy Forest out of The
//     Oval, from the same measured track the course page charts
//     (scripts/data/course-profile.json, built by scripts/build-elevation.mjs);
//   - the topo contours every band on the site runs behind (Topo.astro's
//     seeded ridge lines, same PRNG and same smoothing);
//   - the course poster's mile rule: a scale along the foot with a tick every
//     mile and a nail head at each return to The Oval (the record board's nail
//     heads);
//   - the 50K distance ticket (DistanceTickets.astro: forest stock, 2px edge,
//     punched notches, a torn stub, gold lettering with the hard offset shadow,
//     a slight lean).
//
// Writes:
//   public/studio-banner/course-profile.svg        the foot of Home's banner, wide
//   public/studio-banner/course-profile-phone.svg  the same, phone
//   public/studio-art/ticket-50k.svg               the /studio splash motif
//                                                  (inlined by StudioSplashMotif.astro)
//   public/studio-art/topo.svg                     the contour field on its own
//   public/studio-art/topo-tile.svg                the contours as a seamless tile (the
//                                                  kit's texture slot, card 128)
//   public/studio-art/steps-mark.svg               the steps, bare (no plate)
//
// public/studio-art/ is the race's art slot for the Studio design language
// (starter card 128); the files are plain SVG so any surface can use them.
// All of it is decorative (alt="" or aria-hidden wherever it is shown).
//
//   npm run gen:studio-banner
//
// Re-run it only if the course profile or the palette changes. No dependencies.
// =============================================================================

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { points } = JSON.parse(
  readFileSync(resolve(root, 'scripts/data/course-profile.json'), 'utf8'),
);

// The site's colours (src/styles/globals.css, DESIGN.md).
const CHROME = '#24462D'; // the Studio's top bar and the banner ground
const FOREST = '#2E5738'; // --color-tertiary, the 50K ticket stock
const GOLD = '#FED89B'; // --gold-on-forest
const CREAM = '#FFEBBB'; // plate face
const BARK = '#1A1712'; // the dark ground and the plate edge
const CONTOUR = '#3A6545'; // the topo lines on the forest, a step lighter, as on the footer

const MILE = 3;
const FEET = 2;
const LOOP = 5;

const miles = points.map((p) => p[MILE]);
const feet = points.map((p) => p[FEET]);
const maxMile = miles[miles.length - 1];

/** Where each loop starts (the returns to The Oval), in miles. */
const loopStarts = [];
points.forEach((p, i) => {
  if (i === 0 || p[LOOP] !== points[i - 1][LOOP]) loopStarts.push(p[MILE]);
});

/**
 * The profile resampled evenly by distance, then smoothed with a moving
 * average. The raw track is GPS-noisy at banner size (it read as a stock chart
 * at 1280); a window of about a third of a mile keeps every climb and the
 * seven loops while dropping the jitter.
 */
function profile(samples, windowMiles) {
  const raw = [];
  let j = 0;
  for (let i = 0; i <= samples; i++) {
    const m = (i / samples) * maxMile;
    while (j < miles.length - 2 && miles[j + 1] < m) j++;
    const t = (m - miles[j]) / (miles[j + 1] - miles[j] || 1);
    raw.push(feet[j] + (feet[j + 1] - feet[j]) * Math.max(0, Math.min(1, t)));
  }
  const half = Math.max(1, Math.round((windowMiles / maxMile) * samples * 0.5));
  return raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = i - half; k <= i + half; k++) {
      if (k < 0 || k >= raw.length) continue;
      sum += raw[k];
      n++;
    }
    return sum / n;
  });
}

/** Points to a smooth path (quadratics through midpoints, ending ON the last point). */
function smooth(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    if (i === pts.length - 1)
      d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    else
      d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)} ${((py + cy) / 2).toFixed(1)}`;
  }
  return d;
}

/** Topo.astro's PRNG and ridge line, so the contours are the site's own. */
function rng(s) {
  let x = s * 9301 + 49297;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}
function contours(width, height, lines, seed, ampScale = 1) {
  const rand = rng(seed);
  const out = [];
  for (let i = 0; i < lines; i++) {
    const offset = (i / (lines - 1)) * (height * 1.15) - height * 0.08;
    const amp = (26 + rand() * 54) * ampScale;
    const phase = rand() * Math.PI * 2;
    const freq = 0.7 + rand() * 0.8;
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const t = (s / 24) * Math.PI * 2 * freq + phase;
      pts.push([(s / 24) * width, offset + Math.sin(t) * amp + Math.sin(t * 2.3) * (amp * 0.35)]);
    }
    out.push(smooth(pts));
  }
  return out;
}

/**
 * The banner's foot: contours behind, the forest hills with a gold ridge, and
 * the poster's mile rule along the bottom with a nail head at The Oval.
 */
function strip({ width, height, samples, windowMiles, contourLines, mileTicks }) {
  const rule = height - 10; // the mile rule's baseline
  const top = 8; // headroom so the ridge is never clipped
  const elev = profile(samples, windowMiles);
  const lo = Math.min(...elev);
  const hi = Math.max(...elev);
  const yOf = (ft) => top + (1 - (ft - lo) / (hi - lo)) * (rule - top - 6);
  const xOf = (m) => (m / maxMile) * width;
  const pts = elev.map((ft, i) => [(i / samples) * width, yOf(ft)]);
  const ridge = smooth(pts);
  const hill = `${ridge} L${width} ${rule} L0 ${rule} Z`;

  const topo = contours(width, height * 2.2, contourLines, 11, (height * 2.2) / 700)
    .map((d) => `<path d="${d}" transform="translate(0 ${(-height * 0.6).toFixed(1)})"/>`)
    .join('');

  const ticks = [];
  if (mileTicks) {
    for (let m = 1; m < maxMile; m++) {
      const x = xOf(m).toFixed(1);
      ticks.push(`<path d="M${x} ${rule} V${rule + 4}"/>`);
    }
  }
  const seams = loopStarts
    .slice(1)
    .map((m) => {
      const x = xOf(m).toFixed(1);
      return `<path d="M${x} ${rule} V${rule + 7}" stroke-width="1.5"/>`;
    })
    .join('');
  // Nail heads at the start, at each return to The Oval and at the finish.
  const nails = [0, ...loopStarts.slice(1), maxMile]
    .map((m) => {
      const x = Math.min(width - 3.5, Math.max(3.5, xOf(m)));
      return `<circle cx="${x.toFixed(1)}" cy="${rule}" r="2.6" fill="${BARK}" stroke="${GOLD}" stroke-width="1.2"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
  <!-- The Stone Steps 50K's elevation profile, seven loops out of The Oval, over the site's topo contours, on the course poster's mile rule. Drawn by scripts/gen-studio-banner.mjs. -->
  <defs><clipPath id="ssb-c"><rect width="${width}" height="${rule}"/></clipPath></defs>
  <g clip-path="url(#ssb-c)" fill="none" stroke="${CONTOUR}" stroke-width="1.2">${topo}</g>
  <path d="${hill}" fill="${FOREST}"/>
  <path d="${ridge}" fill="none" stroke="${BARK}" stroke-opacity="0.55" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" transform="translate(2 3)"/>
  <path d="${ridge}" fill="none" stroke="${GOLD}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
  <g fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.7">${ticks.join('')}</g>
  <path d="M0 ${rule} H${width}" stroke="${GOLD}" stroke-width="1.5"/>
  <g fill="none" stroke="${GOLD}">${seams}</g>
  ${nails}
</svg>
`;
}

/**
 * The 50K distance ticket, for the /studio splash: forest stock with the 2px
 * bark edge and the hard offset shadow, leaning like the tickets on the
 * homepage, a profile across its face, and a torn stub with punched notches.
 * Lettering is in the site's display face (the splash page loads Staatliches),
 * with a condensed fallback; the shadow is the gold heading's hard echo.
 */
function ticket() {
  const W = 280;
  const H = 150;
  const pad = 10; // room for the lean and the shadow
  const x0 = pad;
  const y0 = pad;
  const w = W - pad * 2 - 6;
  const h = H - pad * 2 - 8;
  const stubY = y0 + h - 34; // the perforation
  const elev = profile(160, 1.3);
  const lo = Math.min(...elev);
  const hi = Math.max(...elev);
  const pTop = y0 + 50;
  const pBot = stubY - 8;
  const pts = elev.map((ft, i) => [
    x0 + 14 + (i / 160) * (w - 28),
    pBot - ((ft - lo) / (hi - lo)) * (pBot - pTop),
  ]);
  const ridge = smooth(pts);
  const hill = `${ridge} L${(x0 + w - 14).toFixed(1)} ${pBot} L${x0 + 14} ${pBot} Z`;
  const font = `font-family="Staatliches, 'Arial Narrow', sans-serif"`;
  // The notches are PUNCHED: a mask cuts them out of the card and its shadow,
  // so whatever is behind (the paper, or the dark scheme) shows through.
  const notch = (cx, cy = stubY) => `<circle cx="${cx}" cy="${cy}" r="7"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
  <!-- The 50K distance ticket (DistanceTickets.astro) for the /studio splash. Drawn by scripts/gen-studio-banner.mjs. -->
  <defs>
    <mask id="ss-punch" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#fff"/>
      <g fill="#000">${notch(x0)}${notch(x0 + w)}${notch(x0 + 5, stubY + 7)}${notch(x0 + w + 5, stubY + 7)}</g>
    </mask>
    <clipPath id="ss-card"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14"/></clipPath>
  </defs>
  <g transform="rotate(-1.4 ${W / 2} ${H / 2})" mask="url(#ss-punch)">
    <rect x="${x0 + 5}" y="${y0 + 7}" width="${w}" height="${h}" rx="14" fill="${BARK}" opacity="0.55"/>
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="14" fill="${FOREST}" stroke="${BARK}" stroke-width="2"/>
    <text x="${x0 + 16}" y="${y0 + 44}" ${font} font-size="40" fill="${BARK}" opacity="0.6" transform="translate(2 2.5)">50K</text>
    <text x="${x0 + 16}" y="${y0 + 44}" ${font} font-size="40" fill="${GOLD}">50K</text>
    <text x="${x0 + w - 16}" y="${y0 + 24}" ${font} font-size="13" letter-spacing="1" fill="${CREAM}" text-anchor="end">MT. AIRY FOREST</text>
    <text x="${x0 + w - 16}" y="${y0 + 40}" ${font} font-size="13" letter-spacing="1" fill="${CREAM}" opacity="0.75" text-anchor="end">7 LOOPS FROM THE OVAL</text>
    <path d="${hill}" fill="${CHROME}"/>
    <path d="${ridge}" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M${x0 + 14} ${stubY} H${x0 + w - 14}" stroke="${CREAM}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="4 4"/>
    <g clip-path="url(#ss-card)" fill="none" stroke="${BARK}" stroke-width="4">${notch(x0)}${notch(x0 + w)}</g>
    <text x="${x0 + 16}" y="${stubY + 22}" ${font} font-size="13" letter-spacing="1.2" fill="${CREAM}">STONE STEPS TRAIL RUN</text>
    <text x="${x0 + w - 16}" y="${stubY + 22}" ${font} font-size="13" letter-spacing="1.2" fill="${GOLD}" text-anchor="end">CINCINNATI</text>
  </g>
</svg>
`;
}

/** The contour field alone, in the site's forest at the site's weight. */
function topoField() {
  const W = 1200;
  const H = 700;
  const paths = contours(W, H, 14, 7)
    .map((d, i) => `<path d="${d}"${i % 3 === 2 ? ` stroke="${GOLD}" stroke-opacity="0.5"` : ''}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
  <!-- Topo.astro's contours (seed 7, 14 lines). Drawn by scripts/gen-studio-banner.mjs. -->
  <g fill="none" stroke="${FOREST}" stroke-width="1.2" vector-effect="non-scaling-stroke">${paths}</g>
</svg>
`;
}

/**
 * The contour field as a SEAMLESS tile, for the kit's texture slot (card 128:
 * the featured "Start here" panel on the Site Guide, drawn over the banner's
 * forest at 420px). Topo.astro's PRNG and ridge shape, but every wave has a
 * whole number of periods across the tile and each line is drawn again one
 * tile up and down, so the edges meet with no seam in either direction.
 */
function topoTile() {
  const S = 420;
  const rand = rng(11);
  const lines = 7;
  const paths = [];
  for (let i = 0; i < lines; i++) {
    const offset = (i / lines) * S;
    const amp = 10 + rand() * 18;
    const phase = rand() * Math.PI * 2;
    const k = 1 + Math.floor(rand() * 2); // 1 or 2 waves across: whole periods
    for (const dy of [-S, 0, S]) {
      const pts = [];
      for (let st = 0; st <= 48; st++) {
        const t = (st / 48) * Math.PI * 2;
        const y =
          offset +
          dy +
          Math.sin(k * t + phase) * amp +
          Math.sin(2 * k * t + phase * 1.7) * (amp * 0.35);
        pts.push([(st / 48) * S, y]);
      }
      const gold = i % 3 === 2 ? ` stroke="${GOLD}" stroke-opacity="0.35"` : '';
      paths.push(`<path d="${smooth(pts)}"${gold}/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" aria-hidden="true">
  <!-- Topo.astro's contours as a seamless 420px tile (seed 11). Drawn by scripts/gen-studio-banner.mjs. -->
  <g fill="none" stroke="${CONTOUR}" stroke-width="1.2">${paths.join('')}</g>
</svg>
`;
}

/** The steps from public/favicon.svg, without the bark plate. */
const stepsMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="7 11.5 49 42.5" aria-hidden="true">
  <!-- The race's steps (public/favicon.svg) without the plate; fill with currentColor. -->
  <path d="M7 54 V43 H19 V32.5 H31 V22 H43 V11.5 H56 V54 Z" fill="currentColor"/>
</svg>
`;

const banner = resolve(root, 'public/studio-banner');
const art = resolve(root, 'public/studio-art');
mkdirSync(banner, { recursive: true });
mkdirSync(art, { recursive: true });
writeFileSync(
  resolve(banner, 'course-profile.svg'),
  strip({
    width: 1200,
    height: 92,
    samples: 480,
    windowMiles: 0.8,
    contourLines: 7,
    mileTicks: true,
  }),
);
writeFileSync(
  resolve(banner, 'course-profile-phone.svg'),
  strip({
    width: 390,
    height: 64,
    samples: 200,
    windowMiles: 1.1,
    contourLines: 4,
    mileTicks: false,
  }),
);
writeFileSync(resolve(art, 'ticket-50k.svg'), ticket());
writeFileSync(resolve(art, 'topo.svg'), topoField());
writeFileSync(resolve(art, 'topo-tile.svg'), topoTile());
writeFileSync(resolve(art, 'steps-mark.svg'), stepsMark);
console.log(
  '[gen-studio-banner] wrote public/studio-banner/course-profile{,-phone}.svg and public/studio-art/{ticket-50k,topo,topo-tile,steps-mark}.svg',
);
