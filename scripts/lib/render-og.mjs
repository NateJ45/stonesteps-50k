// Foundation, edit with care
// =============================================================================
// The share card renderer
// =============================================================================
// One 1200x630 PNG per route, drawn in THE SITE'S OWN LANGUAGE: bark ground,
// the race's painted mark on its plate, the display face with its hard offset,
// and the mud thrown behind it all. Used by generate-og-default.mjs (the single
// fallback) and generate-og-pages.mjs (one per route).
//
// WHY A BROWSER AND NOT SHARP'S TEXT RENDERER.
// This drew through sharp's Pango bindings until 2026-09-13, asking for
// "Staatliches, Arial Narrow, Impact". Pango resolves fonts through fontconfig,
// which only knows about fonts INSTALLED ON THE MACHINE, and Staatliches is an
// npm package in node_modules. So it silently fell back to the system sans on
// every build, and every share card the site has ever emitted was set in the
// wrong typeface, on a plain cream rectangle with a hairline box: the starter's
// placeholder, carrying none of this site's design. A headless browser can
// @font-face the real woff2 straight out of node_modules, which is the whole
// reason for the dependency swap. Playwright is already a devDependency here.
//
// These run by hand (`npm run og`, `npm run og:pages`) and the PNGs are
// COMMITTED, so CI never needs a browser to build the site. If that ever
// changes, the workflow needs `npx playwright install chromium`.
//
// TWO THINGS THE CARD IS BUILT AROUND.
//   1. It is seen as a THUMBNAIL first, often 300px wide in a feed. So the mark
//      is large, the headline is three lines at most, and nothing relies on
//      small type being readable. The strap line is a bonus, not the message.
//   2. It is bark in BOTH themes. A share card has no reader preference to
//      follow, and the race's mark is drawn for a dark sign: cream lettering
//      with a dark keyline. On cream it all but disappears, which is exactly
//      what the header's badge already worked out (see .sign-badge).
// =============================================================================

import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

/** Read a file and hand it back as a data: URI, for embedding in the page. */
function dataUri(relPath, mime) {
  const buf = readFileSync(resolve(root, relPath));
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// The real faces, straight out of node_modules. See the note above on why.
const FONTS = {
  display: dataUri(
    'node_modules/@fontsource/staatliches/files/staatliches-latin-400-normal.woff2',
    'font/woff2',
  ),
  mono: dataUri(
    'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
    'font/woff2',
  ),
  body: dataUri(
    'node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2',
    'font/woff2',
  ),
};

// The mark, and two of the hero's baked mud layers. The mud files are ALPHA
// MASKS painted with currentcolor on the site, so they are worn here the same
// way: a cream block masked by the art, not an image of mud.
const MARK = dataUri('src/assets/logo-light.svg', 'image/svg+xml');
const MUD_THROW = dataUri('public/mud/hero-wide-3.png', 'image/png');
const MUD_TRAIL = dataUri('public/mud/hero-wide-4.png', 'image/png');

// Straight out of globals.css. Literals rather than a parse, because this
// script runs outside the bundler, but they are the dark theme's own values.
const T = {
  bark: '#1a1712',
  cream: '#ffebbb',
  plateStock: '#3a3128',
  rust: '#b8462f',
  strap: '#c9b98f',
  edge: '#000000',
};

/** Escape a string for safe interpolation into the page's markup. */
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The card's markup. Kept in one place so both generators draw the same thing
 * and a design change lands in a single template.
 */
function cardHtml({ headline, strap }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:Staatliches;src:url(${FONTS.display}) format('woff2');font-display:block}
  @font-face{font-family:JetBrainsMono;src:url(${FONTS.mono}) format('woff2');font-display:block}
  @font-face{font-family:Archivo;src:url(${FONTS.body}) format('woff2');font-display:block}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden}
  .card{position:relative;width:1200px;height:630px;background:${T.bark};overflow:hidden}

  /* The mud, worn as masks so one set of files serves any ink. Low, because
     the card is read at thumbnail size and texture at full strength there
     turns into noise. */
  .mud{position:absolute;inset:0;background:${T.cream};opacity:.085;
    -webkit-mask-size:cover;mask-size:cover;-webkit-mask-position:center;mask-position:center;
    -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
  .mud--throw{-webkit-mask-image:url(${MUD_THROW});mask-image:url(${MUD_THROW})}
  .mud--trail{-webkit-mask-image:url(${MUD_TRAIL});mask-image:url(${MUD_TRAIL});opacity:.13}

  .inner{position:relative;height:100%;display:flex;flex-direction:column;
    justify-content:space-between;padding:62px 72px 58px}

  /* The badge, exactly as the header wears it: dark stock, hard black keyline,
     a degree and a half of lean, two nail heads. */
  .badge{position:relative;align-self:flex-start;display:inline-flex;
    padding:14px 18px;border:3px solid ${T.edge};border-radius:12px;
    background:${T.plateStock};box-shadow:7px 9px 0 rgb(0 0 0 / .55);transform:rotate(-1.5deg)}
  .badge img{display:block;height:132px;width:auto}
  .badge::before,.badge::after{content:'';position:absolute;top:9px;width:8px;height:8px;
    border-radius:50%;background:rgb(255 235 187 / .45)}
  .badge::before{left:12px}
  .badge::after{right:12px}

  .headline{font-family:Staatliches,sans-serif;color:${T.cream};
    font-size:88px;line-height:.96;letter-spacing:.005em;text-transform:uppercase;
    text-shadow:4px 5px 0 rgb(0 0 0 / .75);max-width:1010px;
    /* Never more than three lines: the fourth is always the one nobody reads. */
    display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .headline--long{font-size:70px}
  .headline--longer{font-size:58px}

  .strap{display:flex;align-items:center;gap:18px;font-family:JetBrainsMono,monospace;
    color:${T.strap};font-size:21px;letter-spacing:.2em;text-transform:uppercase}
  /* A blaze, the same painted dash the trail wears, rather than a bullet. */
  .strap::before{content:'';width:46px;height:7px;border-radius:2px;background:${T.rust};
    transform:rotate(-6deg);flex:none}
  </style></head><body>
  <div class="card">
    <div class="mud mud--throw"></div>
    <div class="mud mud--trail"></div>
    <div class="inner">
      <div class="badge"><img src="${MARK}" alt=""></div>
      <div>
        <div class="headline ${headline.length > 46 ? (headline.length > 72 ? 'headline--longer' : 'headline--long') : ''}">${esc(headline)}</div>
        ${strap ? `<div class="strap" style="margin-top:28px">${esc(strap)}</div>` : ''}
      </div>
    </div>
  </div></body></html>`;
}

// ONE BROWSER FOR THE WHOLE RUN. There are twenty-eight routes and launching
// chromium per card turned a four second job into ninety.
let browser = null;
async function getBrowser() {
  if (browser) return browser;
  const { chromium } = await import('playwright');
  browser = await chromium.launch();
  return browser;
}

/** Close the shared browser. Call once at the end of a generator. */
export async function closeRenderer() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Render one share card.
 *
 * @param {object} opts
 * @param {string} [opts.headline] - the big line. Falls back to the wordmark.
 * @param {string} [opts.wordmark] - accepted for call-site compatibility.
 * @param {string|string[]} [opts.tagline] - accepted as the headline's source.
 * @param {string} [opts.strap] - the small line under it.
 * @param {string} opts.outPath - absolute path to write the PNG to.
 */
export async function renderOg({ headline, wordmark, tagline, strap, outPath }) {
  // The generators pass `tagline`; the line that matters is whichever of these
  // actually says something about the page.
  const line = headline ?? (Array.isArray(tagline) ? tagline.join(' ') : tagline) ?? wordmark ?? '';

  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });

  const b = await getBrowser();
  const page = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(cardHtml({ headline: line, strap }), { waitUntil: 'load' });
  // Without this the card can be photographed before the faces decode, which
  // produces a card set in the fallback: the exact failure this file replaced.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();

  return { width: 1200, height: 630, outPath };
}
