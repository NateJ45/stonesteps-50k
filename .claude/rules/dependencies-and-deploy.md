---
paths:
  - 'package.json'
  - 'package-lock.json'
  - 'astro.config.mjs'
  - 'wrangler.jsonc'
  - 'scripts/with-workerd.mjs'
  - '.github/workflows/**'
  - 'sanity.cli.ts'
---

# Matched version set and deploy config (CLAUDE.md rule 8)

Moved verbatim from CLAUDE.md. Loads when dependency, Astro, wrangler or workflow files are touched.

8. **The Astro / adapter / wrangler / Sanity versions are a MATCHED SET. Do not bump one in isolation.** The pins and the reasons are PORTS.md cards 10, 13 and 14; the short version:
   - `@astrojs/cloudflare` is pinned to exactly **14.3.4** (since 2026-10-13, starter card 94; 14.2.4 imports `beginContentEntryCollection`, which astro 7.3 removed, so adapter and `astro` move together). It peers `wrangler ^4.125.0`.
   - `wrangler` is pinned to **~4.149.0** (a Dependabot bump of 2026-10-12, PR #100; it had been `~4.110.0`). Adapter v14 has been observed writing `legacy_env: true` into the generated `dist/server/wrangler.json`, and a wrangler that rejects that field fails every deploy. Verified 2026-10-13: 14.3.4 on this config emits no `legacy_env`. Re-check that with a real deploy on every adapter or wrangler move, not by reading semver.
   - `react`, `react-dom` and `react-is` are pinned **exact** at 19.2.7. A mismatch dies inside workerd behind a wall of Miniflare stack frames; the real message, `Incompatible React versions`, is buried **above** the `MiniflareCoreError`.
   - The Sanity set is pinned to a combination known to work **together**, and since 2026-10-17 that is the family's phase-2 set (PORTS.md card 103): `sanity` 6.19.0, `@sanity/vision` 6.19.0, `@sanity/ui` **4.4.9**, `@sanity/icons` **5.2.3**, `styled-components` 6.6.0, `@sanity/client` 8.9.0, `@sanity/preview-url-secret` 4.1.5, `@sanity/astro` 3.5.1, `sanity-plugin-media` 6.3.5, `sanity-plugin-asset-source-unsplash` 7.0.29, `@sanity/orderable-document-list` 2.0.28, plus `sanity-plugin-utils` 2.0.22 and `@sanity/visual-editing` 6.1.3 held through `overrides` (edit both visual-editing entries in one pass or npm refuses with EOVERRIDE). Studio code is written against `@sanity/ui` 4: `gap` not `space`, `gridTemplateColumns` not `columns`, `Menu*` from `@sanity/ui/menu`, `useToast` from `@sanity/ui/toast`, and every icon from its own subpath (`import { BellIcon } from '@sanity/icons/Bell'`; the root exports none, and `astro check` does NOT catch a root icon import, only `astro build` does). A Studio file from a repo still on the phase-1 set (`sanity` 6.9.1, `@sanity/ui` 3.5.4) does not port without that migration (card 103's notes). **Invariant after any Sanity dependency work:** `find node_modules -path "*@sanity/ui/package.json"` and `find node_modules -path "*@sanity/icons/package.json"` must each print exactly ONE line, and `grep -l "errors.md#" dist/client/_astro/*.js` exactly one file. `react/compiler-runtime` stays in `optimizeDeps.include` in `astro.config.mjs`: `@sanity/ui` is excluded from pre-bundling, and without the include the dev Studio does not hydrate (`does not provide an export named 'c'`); the build cannot show it.
   - Historical, still worth knowing: `@astrojs/cloudflare` 13.6.0 regressed Astro's image optimizer (optimized images written to `dist/client/_astro/` while the optimizer read `dist/_astro/`), which is why 13.5.5 was pinned before this upgrade. **Verify image output paths after any adapter bump.**
   - **`session: false` in `astro.config.mjs` is load-bearing.** Left on, the Cloudflare adapter auto-declares a `SESSION` KV binding in the generated config, and a KV binding with no namespace id fails the deploy. This template has no login.
   - **No `assets.not_found_handling` in `wrangler.jsonc`.** With `404-page` set, Cloudflare answers navigation requests that miss the asset store from the static 404 page **without invoking the Worker**, which silently 404s every SSR route for real browsers while curl (which sends no `Sec-Fetch-*` headers) sees them working.
   - **The Windows build needs wrangler's workerd, and `npm run build` handles it.** The vite plugin's pinned workerd aborts at prerender on Windows (`std::terminate`), so `scripts/with-workerd.mjs` points `MINIFLARE_WORKERD_PATH` at wrangler's newer binary on win32. It is a no-op elsewhere.
   - **`astro dev` on Windows depends on `fixSanityDedupeAlias()` in `vite.plugins` (2026-09-29, starter PORTS.md card 60).** `@sanity/astro`'s dev-only `sanity:module-dedupe` plugin aliases `sanity` to its `package.json` FILE on Windows (its regex strips a forward slash only), which dies with `[MISSING_EXPORT] ... is not exported by "node_modules/sanity/package.json"`. `astro build` never loads that plugin, so CI cannot see it. **Do not remove the helper, and do not "fix" the crash with `SANITY_ASTRO_DISABLE_MODULE_DEDUPE=1`:** the Studio then fails to hydrate (`react-compiler-runtime ... does not provide an export named 'c'`). The helper is `src/lib/sanity-dedupe-alias.ts` (PORTABLE, spec beside it).
   - **Curling a page is not verifying it.** `/studio` returns 200 with real HTML while being completely broken at React mount. Anything that mounts a client framework has to be opened in a real browser with the console read.

Deploy reminder from Stack essentials:

- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `npm run deploy`, which is `wrangler deploy -c dist/server/wrangler.json`. A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing about the SSR entrypoint, and every sub-route 404s.
