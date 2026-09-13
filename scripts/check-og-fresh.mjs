// Foundation, edit with care
// =============================================================================
// Are the committed share cards still telling the truth?
// =============================================================================
// The cards in public/og/ are PNGs rendered by hand and committed. Nothing
// regenerates them on a content publish: a deploy runs typegen, tests, build
// and wrangler. So an editor changing a page's SEO title in the Studio leaves
// that page's card saying the old thing, forever, with no signal anywhere.
//
// This is the signal. It re-derives what each card WOULD say right now from
// Sanity and compares it with scripts/data/og-inputs.json, the record written
// when the PNGs were last rendered. No browser, no rendering, four GROQ reads:
// cheap enough to run on every CI push, which is the point.
//
//     node scripts/check-og-fresh.mjs        (npm run og:check)
//
// Exits 1 when they disagree, naming the cards and the change, so the fix is
// always the same one line: `npm run og:pages`, then commit the PNGs.
//
// WHERE IT RUNS, AND WHY IT IS NOT THE SAME EVERYWHERE.
//   ci.yml     FAILS. A human is pushing code and can act on it.
//   deploy.yml WARNS. A deploy can be triggered by an editor publishing in the
//              Studio, and failing that deploy would mean a content change
//              never reaches the live site because a picture is out of date.
//              Stale cards are a much smaller problem than a site that stopped
//              updating, so the deploy says so and carries on.
// =============================================================================

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { collectOgInputs } from './lib/og-inputs.mjs';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// GitHub Actions renders these as annotations; everywhere else they are just
// a prefix nobody minds.
const inCI = Boolean(process.env.GITHUB_ACTIONS);
// --warn downgrades the exit code without changing a word of the output.
const warnOnly = process.argv.includes('--warn');
const annotate = (level, msg) => console.log(inCI ? `::${level}::${msg}` : msg);

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) {
  // A fork with no Sanity project cannot answer the question, and must not
  // fail for it. Same rule the deploy gate follows.
  console.log('PUBLIC_SANITY_PROJECT_ID not set; skipping the share card check.');
  process.exit(0);
}

const readToken = env.SANITY_API_READ_TOKEN || env.SANITY_API_WRITE_TOKEN;
const client = createClient({
  projectId,
  dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01',
  useCdn: !readToken,
  perspective: 'published',
  ...(readToken ? { token: readToken } : {}),
});

const recordPath = resolve(root, 'scripts/data/og-inputs.json');
let recorded;
try {
  recorded = JSON.parse(readFileSync(recordPath, 'utf8'));
} catch {
  annotate('error', `No ${recordPath}. Run \`npm run og:pages\` to render the cards and write it.`);
  process.exit(warnOnly ? 0 : 1);
}

const current = await collectOgInputs(client);

const byslug = (rows) => new Map(rows.map((r) => [r.slug, r]));
const was = byslug(recorded);
const now = byslug(current);

const problems = [];
for (const [slug, row] of now) {
  const before = was.get(slug);
  if (!before) {
    problems.push(`${slug}: new route, no card yet (would say "${row.headline}")`);
    continue;
  }
  if (before.headline !== row.headline) {
    problems.push(`${slug}: headline was "${before.headline}", now "${row.headline}"`);
  }
  if (before.strap !== row.strap) {
    problems.push(`${slug}: strap was "${before.strap}", now "${row.strap}"`);
  }
}
for (const slug of was.keys()) {
  if (!now.has(slug)) problems.push(`${slug}: card exists but the route no longer does`);
}

if (problems.length === 0) {
  console.log(`Share cards are current: ${current.length} checked, all matching Sanity.`);
  process.exit(0);
}

annotate(
  warnOnly ? 'warning' : 'error',
  `${problems.length} share card${problems.length === 1 ? '' : 's'} out of date. Run \`npm run og:pages\` and commit public/og/.`,
);
for (const p of problems) console.log(`  - ${p}`);
process.exit(warnOnly ? 0 : 1);
