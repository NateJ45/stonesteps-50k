// Foundation, edit with care
// Generates one OG PNG per page at public/og/<route-slug>.png, matching the
// per-route convention in BaseLayout (the pathname with slashes turned into
// dashes; falls back to og-default.png when a route has no matching file).
//
// Covers the core route singletons. When your project adds dynamic collections
// (blog posts, case studies, etc.) extend COLLECTIONS below with the matching
// Sanity _type, prefix, and field names.
//
// Run via `npm run og:pages` after editing seoTitle in Sanity or after adding a
// page. Output PNGs are committed to git so Cloudflare does not need Sanity
// access at build time. BaseLayout picks the right PNG per pathname; anything
// without a file gracefully falls back to og-default.png.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { renderOg, closeRenderer } from './lib/render-og.mjs';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
// This dataset filters anonymous reads down to the page singletons only; a read
// token is needed to see the collections (projects, journal entries, guides),
// exactly as src/lib/sanity.ts does at build time. Falls back to the write
// token, which can also read. Without any token, only the singletons render.
const readToken = env.SANITY_API_READ_TOKEN || env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('PUBLIC_SANITY_PROJECT_ID not set. Skipping page OG generation.');
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Token reads disable the CDN (Sanity rejects token + useCdn:true).
  useCdn: !readToken,
  perspective: 'published',
  ...(readToken ? { token: readToken } : {}),
});

const outDir = resolve(root, 'public/og');

// The strap under every headline: where the race is and when the next one is.
// Read from The Race rather than typed, like everything else on this site.
const raceDoc = await client
  .fetch(`*[_type == "race"][0]{ venue, city, region, raceDate }`)
  .catch(() => null);
const STRAP = (() => {
  const where = [raceDoc?.venue, raceDoc?.city].filter(Boolean).join(', ');
  if (!raceDoc?.raceDate) return where || 'Mt. Airy Forest, Cincinnati';
  const when = new Date(raceDoc.raceDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return where ? `${where} · ${when}` : when;
})();

// An seoTitle is written for a browser tab, so it usually ends in the site
// name: "The course | Stone Steps 50K". The card already carries the race's
// painted mark, so repeating the name in the headline spends the biggest type
// on the card saying what the logo beside it just said.
const SITE_SUFFIX = /\s*[|·–—-]\s*Stone Steps 50K\s*$/i;
const headlineFor = (tagline) => String(tagline).replace(SITE_SUFFIX, '').trim();

let count = 0;
async function render(slug, tagline) {
  await renderOg({
    headline: headlineFor(tagline),
    strap: STRAP,
    outPath: resolve(outDir, `${slug}.png`),
  });
  count += 1;
  const t = String(tagline);
  console.log(`  ${slug}.png — ${t.slice(0, 60)}${t.length > 60 ? '…' : ''}`);
}

// ---- This site's routes -------------------------------------------------
// THE STARTER'S LIST IS GONE. It generated about, services, faq, journal,
// privacy, process, portfolio, shop, quiz, calculator, gift-certificates,
// press, resources and guides: twenty-three images for a design studio, none
// of which this race site has a route for. Meanwhile the routes it DOES have
// (course, records, results, and one per results year) had no image at all, so
// BaseLayout pointed every share at a file that 404s. Sharing the course page
// showed a broken preview (2026-09-12).
//
// Every entry below is a real route. `runners/<slug>` is deliberately absent:
// there are more than twelve hundred of them, and a runner's page falls back
// to og-default.png, which is the right trade.
const slugs = [];
const emit = async (slug, tagline) => {
  await render(slug, tagline);
  slugs.push(slug);
};

// The home page, from its own SEO title.
const home = await client.fetch(`*[_type == "homePage"][0]{ seoTitle }`).catch(() => null);
await emit('home', home?.seoTitle || "Cincinnati's longest running ultra marathon");

// The custom pages: course, records, contact. Their slug IS their route.
const pages = await client
  .fetch(`*[_type == "page" && defined(slug.current)]{ "slug": slug.current, seoTitle, title }`)
  .catch(() => []);
for (const p of pages) {
  await emit(p.slug, p.seoTitle || p.title || p.slug);
}

// The results archive, and one per year that has results.
const race = await client.fetch(`*[_type == "race"][0]{ name }`).catch(() => null);
await emit('results', `Every ${race?.name ?? 'Stone Steps'} result on file`);

const years = await client
  .fetch(`array::unique(*[_type == "raceResult"].year) | order(@ desc)`)
  .catch(() => []);
for (const year of years) {
  if (typeof year !== 'number') continue;
  await emit(`results-${year}`, `${year} results`);
}

// ---- The manifest -------------------------------------------------------
// BaseLayout reads this to decide whether a route HAS an image, instead of
// assuming one and emitting a URL that 404s. Committed with the PNGs.
const manifest = resolve(root, 'src/data/ogPages.json');
writeFileSync(manifest, JSON.stringify([...slugs].sort(), null, 2) + '\n');
console.log(`\nManifest: ${slugs.length} slugs -> src/data/ogPages.json`);

// THIS IS NOT OPTIONAL. render-og.mjs keeps ONE chromium alive across the whole
// run, because launching a browser per card turned a four second job into
// ninety. A browser Playwright has not been told to close keeps the event loop
// alive forever, so without this the script does all its work, prints the line
// below, and then hangs: every card written, every timestamp correct, and the
// process never exits. That looked exactly like a slow render the first time it
// happened and cost two ten-minute timeouts before anyone suspected the exit.
await closeRenderer();

console.log(`\nDone. ${count} OG images written to ${outDir}`);
