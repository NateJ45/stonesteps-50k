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
   - `@astrojs/cloudflare` is pinned to exactly **14.2.4**, the last release whose wrangler peer range is compatible with the wrangler pin below (14.2.5 demands wrangler ^4.125.0).
   - `wrangler` is pinned to **~4.110.0**. Adapter v14 has been observed writing `legacy_env: true` into the generated `dist/server/wrangler.json`, and wrangler 4.126+ rejects that field outright. (Verified 2026-08-28: 14.2.4 does **not** emit the field on this config, so the pin is currently belt-and-braces. Revisit it deliberately, with a real `wrangler dev` and a real deploy, not by reading semver.)
   - `react`, `react-dom` and `react-is` are pinned **exact** at 19.2.7. A mismatch dies inside workerd behind a wall of Miniflare stack frames; the real message, `Incompatible React versions`, is buried **above** the `MiniflareCoreError`.
   - The Sanity set is pinned to a combination known to work **together**, and since 2026-09-06 that is the family's phase-1 set: `sanity` 6.9.1, `@sanity/vision` 6.9.1, `@sanity/ui` **3.5.4**, `styled-components` 6.4.3, `@sanity/client` 7.26.2, `@sanity/preview-url-secret` 4.1.5, `sanity-plugin-media` 5.0.11, `sanity-plugin-asset-source-unsplash` 7.0.15, `@sanity/orderable-document-list` 2.0.9, plus `sanity-plugin-utils` 2.0.6 and `@sanity/visual-editing` 5.7.3 held through `overrides`. **Do not take `sanity` 6.9.2**: that PATCH release crosses to `@sanity/ui` 4, which is a real migration (PORTS.md card 10, phase 2). **Invariant after any Sanity dependency work:** `find node_modules -path "*@sanity/ui/package.json"` must print exactly ONE line, and `grep -l "errors.md#" dist/client/_astro/*.js` exactly one file. `@sanity/icons` is deliberately NOT deduped (core wants v5, `@sanity/ui` 3.5.4 nests its own v5, the hoisted copy stays 3.8; icons are stateless, and deduping them broke the build on a missing v5 `CogIcon`).
   - Historical, still worth knowing: `@astrojs/cloudflare` 13.6.0 regressed Astro's image optimizer (optimized images written to `dist/client/_astro/` while the optimizer read `dist/_astro/`), which is why 13.5.5 was pinned before this upgrade. **Verify image output paths after any adapter bump.**
   - **`session: false` in `astro.config.mjs` is load-bearing.** Left on, the Cloudflare adapter auto-declares a `SESSION` KV binding in the generated config, and a KV binding with no namespace id fails the deploy. This template has no login.
   - **No `assets.not_found_handling` in `wrangler.jsonc`.** With `404-page` set, Cloudflare answers navigation requests that miss the asset store from the static 404 page **without invoking the Worker**, which silently 404s every SSR route for real browsers while curl (which sends no `Sec-Fetch-*` headers) sees them working.
   - **The Windows build needs wrangler's workerd, and `npm run build` handles it.** The vite plugin's pinned workerd aborts at prerender on Windows (`std::terminate`), so `scripts/with-workerd.mjs` points `MINIFLARE_WORKERD_PATH` at wrangler's newer binary on win32. It is a no-op elsewhere.
   - **`astro dev` on Windows depends on `fixSanityDedupeAlias()` in `vite.plugins` (2026-09-29, starter PORTS.md card 60).** `@sanity/astro`'s dev-only `sanity:module-dedupe` plugin aliases `sanity` to its `package.json` FILE on Windows (its regex strips a forward slash only), which dies with `[MISSING_EXPORT] ... is not exported by "node_modules/sanity/package.json"`. `astro build` never loads that plugin, so CI cannot see it. **Do not remove the helper, and do not "fix" the crash with `SANITY_ASTRO_DISABLE_MODULE_DEDUPE=1`:** the Studio then fails to hydrate (`react-compiler-runtime ... does not provide an export named 'c'`). The helper is `src/lib/sanity-dedupe-alias.ts` (PORTABLE, spec beside it).
   - **Curling a page is not verifying it.** `/studio` returns 200 with real HTML while being completely broken at React mount. Anything that mounts a client framework has to be opened in a real browser with the console read.

Deploy reminder from Stack essentials:

- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `npm run deploy`, which is `wrangler deploy -c dist/server/wrangler.json`. A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing about the SSR entrypoint, and every sub-route 404s.
