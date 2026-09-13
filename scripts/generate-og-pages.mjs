// Foundation, edit with care
// Generates one share card at public/og/<route-slug>.png, matching the
// per-route convention in BaseLayout (the pathname with slashes turned into
// dashes; falls back to og-default.png when a route has no matching file).
//
// Run with `npm run og:pages` after editing an seoTitle in Sanity, after adding
// a page, or when `npm run og:check` says the committed cards have gone stale.
// Output PNGs are committed to git, so Cloudflare needs neither Sanity access
// nor a browser at build time.
//
// WHAT EACH CARD SAYS lives in scripts/lib/og-inputs.mjs, shared with the
// staleness check so the two cannot drift. WHAT EACH CARD LOOKS LIKE lives in
// scripts/lib/render-og.mjs. This file only joins them up and writes the two
// manifests.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { renderOg, closeRenderer } from './lib/render-og.mjs';
import { collectOgInputs } from './lib/og-inputs.mjs';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01';
// A token is not needed: everything these cards are made of reads anonymously
// on this dataset (verified 2026-09-13). One is used when present because it
// costs nothing and a future field might not be public.
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

const inputs = await collectOgInputs(client);

for (const { slug, headline, strap } of inputs) {
  await renderOg({ headline, strap, outPath: resolve(outDir, `${slug}.png`) });
  console.log(`  ${slug}.png — ${headline.slice(0, 60)}${headline.length > 60 ? '…' : ''}`);
}

// ---- Two manifests, for two different readers ---------------------------
// BaseLayout reads the SLUG list to decide whether a route HAS an image,
// instead of assuming one and emitting a URL that 404s (that bug shipped: see
// the note in BaseLayout). Both are committed beside the PNGs.
const slugs = inputs.map((r) => r.slug).sort();
writeFileSync(resolve(root, 'src/data/ogPages.json'), JSON.stringify(slugs, null, 2) + '\n');
console.log(`\nManifest: ${slugs.length} slugs -> src/data/ogPages.json`);

// check-og-fresh.mjs reads the INPUTS, so it can tell whether the committed
// pictures still match what the Studio says. This is the record of what these
// PNGs were actually drawn from, and it is only true at the moment they are
// written, which is why it is written here and nowhere else.
writeFileSync(resolve(root, 'scripts/data/og-inputs.json'), JSON.stringify(inputs, null, 2) + '\n');
console.log(`Inputs:   ${inputs.length} cards -> scripts/data/og-inputs.json`);

// THIS IS NOT OPTIONAL. render-og.mjs keeps ONE chromium alive across the whole
// run, because launching a browser per card turned a four second job into
// ninety. A browser Playwright has not been told to close keeps the event loop
// alive forever, so without this the script does all its work, prints the line
// below, and then hangs: every card written, every timestamp correct, and the
// process never exits. That looked exactly like a slow render the first time it
// happened and cost two ten-minute timeouts before anyone suspected the exit.
await closeRenderer();

console.log(`\nDone. ${inputs.length} share cards written to ${outDir}`);
