// Foundation, edit with care
// Generates public/og-default.png — the fallback OG image used when a page
// doesn't have its own /og/<slug>.png yet. Run via `npm run og`.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOg, closeRenderer } from './lib/render-og.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// The fallback card, used by any route without one of its own: the twelve
// hundred runner pages, and anything added since the last `npm run og:pages`.
// So it says what the RACE is rather than what a page is.
const result = await renderOg({
  headline: "Cincinnati's longest running ultramarathon",
  strap: 'Mt. Airy Forest, Cincinnati',
  outPath: resolve(root, 'public/og-default.png'),
});
await closeRenderer();

console.log(`OG default written: ${result.outPath} (${result.width}x${result.height})`);
