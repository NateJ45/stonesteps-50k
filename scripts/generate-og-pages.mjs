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
import { renderOg } from './lib/render-og.mjs';
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

// Business name for the OG wordmark. Reads SITE_NAME from env first so CI can
// override without touching source; falls back to the value in src/data/site.ts
// (hard-coded here to avoid a TypeScript import from a plain .mjs script).
// Update this default when you replace the starter identity in src/data/site.ts.
const WORDMARK = env.SITE_NAME ?? 'Stone Steps 50K';

let count = 0;
async function render(slug, tagline) {
  await renderOg({ wordmark: WORDMARK, tagline, outPath: resolve(outDir, `${slug}.png`) });
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

console.log(`\nDone. ${count} OG images written to ${outDir}`);
