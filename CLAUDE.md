# Stone Steps 50K site (NCS Astro + Sanity starter fork): CLAUDE.md

Always-loaded rules for this repo, kept short on purpose. Anything file-specific lives in `.claude/rules/*.md` (loads only when you touch matching files); long reference lives in `docs/claude/` and `docs/agent/` (read on demand). The docs map is at the bottom.

The site is stonesteps50k.com for the Stone Steps 50K / 27K race (Mt. Airy Forest, Cincinnati). Astro 7 + Sanity (project 7iynvqq6, dataset production, Studio embedded at `/studio`) on a Cloudflare Worker, forked from `ncs-astro-sanity-starter`.

**Design context.** `PRODUCT.md` (audience, purpose, tone, anti-references; open questions are `TODO(Nathan)` lines) and `DESIGN.md` (the visual system as built) sit at the repo root; read them before any design work and update them in the same change when the system moves.

**Read `docs/PENDING.md` early in a session.** It is the live registry of open loops: queued work, known gaps, and waiting-on-a-human items. If you finish or discover one, update it in the same commit.

`ncs-astro-sanity-starter` is a production-ready Astro + Sanity + Cloudflare Workers site template forked from a finished client build. This is a **page-builder-first** starter: the home, about, services, and process pages all render via a shared `SectionRenderer` component fed by Sanity `pageBuilder` arrays, and any custom page created in the Studio gets a `/[slug]` route for free. The infrastructure -- build pipeline, CMS integration, deploy hooks, polish layer, section-visibility system, component library, Lighthouse 100/100/100/100 baseline -- is already standing. A new project pours in two things: its brand identity (run `npm run apply-brand` with `brand/brand.config.json`) and its content.

This starter is not a minimal scaffold. It ships with real patterns and real gotchas documented from production. The point is to skip the month of discovering them.

_Provenance: forked from the Reid Design build._

---

## Stack essentials

Full stack notes and the `astro.config.mjs` landmines are in `docs/agent/stack-and-config.md`. The must-knows:

- **Astro 7.x**, TypeScript strict, `output: 'static'` with a handful of SSR routes. Node 22.12+.
- **Sanity v6** is the CMS. The Studio lives IN THIS PACKAGE (schemas in `src/sanity/schemaTypes/`, desk in `src/sanity/structure.ts`, config at the repo-root `sanity.config.ts`, CLI config in `sanity.cli.ts`) and is **embedded at `/studio`** via `@sanity/astro`, so it rebuilds with every deploy and can never drift stale. There is deliberately no `studioHost`/`deployment` in `sanity.cli.ts` so a stray `sanity deploy` cannot recreate a hosted copy. `npm run typegen` regenerates types from the schemas.
- **Live draft preview at `/preview/**`** through Sanity's Presentation tool (click-to-edit, live refresh over SSE, in-canvas section controls). Rules for touching it are in `.claude/rules/live-preview.md`.
- **Tailwind 4 via `@tailwindcss/vite`.** There is no `tailwind.config.mjs`. Brand tokens live in `@theme` blocks in `src/styles/globals.css`.
- **React 19 islands** for interactivity; Astro components for everything static.
- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `npm run deploy`, which is `wrangler deploy -c dist/server/wrangler.json`. A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing about the SSR entrypoint, and every sub-route 404s.
- **Web3Forms** contact form, **Calendly** discovery call, **Cloudflare Web Analytics** (cookieless, no banner).
- **`sanityFetch(query, params, fallback)`** in `src/lib/sanity.ts` is the single chokepoint for all Sanity reads. When `PUBLIC_SANITY_PROJECT_ID` is absent or set to the placeholder value, it returns the fallback without any network call, so `npm run build` succeeds with no Sanity project configured -- pages render their default-sections content (see below).

---

## Commands

`npm run build` runs `node scripts/with-workerd.mjs astro build` (the Windows workerd shim) and does NOT chain typegen. Everything else, with detail in `docs/claude/commands.md`:

- `npm run dev`: dev server; the Studio is at `/studio` (no separate studio server).
- `npm run typegen`: regenerate Sanity types after any schema change, BEFORE `npm run build`. `npm run build:full` chains both.
- `npm run check` (`astro check` + lint): the fast gate. `npm run check:full`: typegen, build, unit tests (which include `test:scripts`). Also `npm run format:check`, `npm run check:links`, `npm test` (Playwright).
- `npm run test:unit`: node --test over `src/lib/*.test.ts`, then `npm run test:scripts` (node --test over `scripts/lib/*.test.mjs`), so CI and deploy run both; three of them are gates (`theme-tokens`, `layout-variants`, `section-fields`).
- `npm run parity compare`: rendered-HTML parity gate for render-neutral changes. Build with `PUBLIC_GA_ID=` blank first or every page fails (`PUBLIC_GA_ID= npm run build && npm run parity compare`).
- `npm run preview`: `wrangler dev -c dist/server/wrangler.json`; the only way to exercise the SSR routes and real response headers locally.
- `npm run deploy`: build, then `wrangler deploy -c dist/server/wrangler.json`. Never a bare `wrangler deploy` (it reads the root `wrangler.jsonc`, every sub-route 404s).
- `npm run apply-brand`, `npm run og`, `npm run seed`, `npm run sync-check`, `npm run free-dist` (Windows EPERM on `dist/`). Baked assets (`mud`, `map-region`, `weather:sync`): see `.claude/rules/baked-assets-and-scripts.md`.
- **There is no separate studio dev server or deploy.** `npm run dev` serves the Studio at `/studio`, and deploying the site deploys the Studio. For CLI work (`sanity dataset`, `sanity cors`, typegen) run `npx sanity ...` from the repo root; `sanity.cli.ts` configures it. Do **not** run `npx sanity deploy`: it would publish a separate hosted Studio that silently falls behind the embedded one.
- `npm run preview` runs `wrangler dev -c dist/server/wrangler.json` against the last build. This is the only way to exercise the SSR routes (`/preview/**`, `/api/draft-mode/*`) and the real response headers locally; a static file server proves nothing about them.

## Branch, CI and deploy

- Work on a branch and open a PR; CI (`ci.yml`) runs on pushes to `main` and on every PR as parallel jobs: `static` (audits, typegen, stale-types guard, check, lint, format, unit) and `site` (build once, links, upload `dist/client`) feed the required check `build`; `e2e` (Playwright in 3 shards on the uploaded build) feeds the required check `test`. `build` and `test` are aggregators: keep the names, and never path-filter `ci.yml`. `lighthouse.yml` (path-filtered PRs on a 4-URL sample, weekly full run, never on push) and `visual.yml` (path-filtered) run separately. Parity is deliberately a local gate.
- Push to `main` deploys to the Cloudflare Worker (`deploy.yml`; prose-only paths such as `docs/**`, `CLAUDE.md`, `*.md` are ignored). `main` is the only branch and a merge is the production deploy (staging was abandoned 2026-10-03). Work on short-lived branches, PR into `main`, merge when CI (`build`, `test`) is green.
- Content is statically built: a Sanity edit only goes live after a rebuild (push to `main`, or the Sanity publish webhook). Detail in `docs/agent/deployment.md`.
- Never read or print `.env` or `.dev.vars`. `SANITY_TOKEN` is a runtime secret (`npx wrangler secret put SANITY_TOKEN`).

---

## The rules that bite if you forget them

<!-- prettier-ignore-start -->

1. **Never click "Remove field" in the Studio.** It deletes that field's data across every document and cannot be undone without a dataset restore. It appears when the Studio's schema is older than the data. Since the Studio is embedded (it ships with the site build) the sequence after a schema change is: edit schema, `npm run typegen`, commit, deploy. There is no separate `studio:deploy` step any more.
2. **No em-dashes in public-facing site copy** (the text visitors read: page copy, component text, Sanity content). Use commas, colons, or restructure. Code comments, commit messages, plans, specs, and internal docs are exempt.
3. **Build in both light AND dark mode** on every UI change. Detail in `docs/agent/theme-and-color.md`.
4. **Desktop nav is server-rendered** in `Header.astro`. Do not regress it to a client-only island. Detail in `docs/agent/page-architecture.md`.
5. **The Lenis scroll reset on navigation** (forward goes to top, back/forward restores) lives in the BaseLayout Lenis init. Do not remove it. Detail in `docs/agent/polish-layer.md`.
6. **Content is statically built.** A Sanity edit only goes live after a rebuild (push to `main`, or the publish webhook). Detail in `docs/agent/deployment.md`.
7. **After any schema change, run `npm run typegen` before `npm run build`.** `npm run build` runs `astro build` only and does not chain typegen. Use `npm run build:full` to run both in sequence. `src/lib/sanity.types.ts` is committed so collaborators can read schema types in code without running typegen.
8. **The Astro / adapter / wrangler / Sanity versions are a MATCHED SET. Do not bump one in isolation** (`@astrojs/cloudflare` 14.2.4, `wrangler` ~4.110.0, React exact 19.2.7, the Sanity set; do not take `sanity` 6.9.2). Pins, reasons, invariants and the `session: false` / no `not_found_handling` landmines: `.claude/rules/dependencies-and-deploy.md`, which loads when you touch package or config files. Curling a page is not verifying it: anything that mounts a client framework gets opened in a real browser with the console read.
   8b. **A new logic-driving dropdown field needs its name added to `NON_STEGA_FIELDS`** in `src/lib/cms-preview.ts`, in the same commit (full text: `.claude/rules/sanity-schema.md`).
9. **`pageBuilder` cadence is managed by `SectionRenderer`. Blocks carry no colour/surface field; do not add one.** A test enforces it (`section-fields.test.ts`). Full text: `.claude/rules/sanity-schema.md`.
10. **The reserved-slug guard lives inside `getStaticPaths` in `[slug].astro`**, not at module scope (full text: `.claude/rules/sanity-schema.md`).
11. **`apply-brand` does not install font packages**: `npm install @fontsource/...` first. **12.** After `apply-brand`, run `npm run build` (full text: `.claude/rules/brand-reskin.md`).
13. **A field `description` is instructions for the editor typing into that box**, under ~140 characters, never dates, names, provenance or file paths; that goes in a `//` comment above `defineField(` (full text: `.claude/rules/sanity-schema.md`).

<!-- prettier-ignore-end -->

Foundation files (schemas, `globals.css`, `BaseLayout.astro`, `SectionRenderer.astro`, preview stack, Studio config, `astro.config.mjs`, `wrangler.jsonc`, `package.json`) are "edit with care, plan the session". The list loads from `.claude/rules/foundation-files.md` when you touch one; files safe to edit by hand are in `docs/claude/safe-to-edit.md`.

PORTABLE-marked files are canonical in the starter; do not make site-specific edits inside one (see Ports below).

---

## Code conventions and Working with Claude

Shared by every site repo in the family, so they live in one PORTABLE file imported here (it is expanded into context at launch, so this saves lines in this file, not tokens): the code conventions (strict TypeScript, header comments, Astro and React islands, images, Tailwind) and the working-with-Claude habits (desktop app, Plan Mode, confirm before installing, describe design in plain language, verify in a real browser).

@docs/claude/family-conventions.md

Stone Steps specifics on top of the shared text:

- Images: the shared file says to use `<SanityImage />` for Sanity-hosted images; the image handling detail is in `docs/agent/images.md`.
- What to verify in the browser (both themes, both viewports, interactive states, adjacent sections) is in `.claude/rules/ui-verification.md`, which loads when you touch UI files. This site ships light AND dark, so every UI change needs screenshots in both themes at both viewports.

## Style (short version; full rules in `.claude/rules/copy-and-voice.md`)

- Warm, conversational, plain. No AI-tell phrases (delve, leverage, robust, seamless, crucial, pivotal and the like), no "It's not just X, it's Y", no filler openers or closers.
- No em-dashes in public-facing site copy (rule 2). Say prices plainly; be specific.

---

## Vault (business context lives outside this repo)

- Business context, decisions and the Work log live in `_vault/clients/stone-steps-50k.md` at the Projects root (`C:\Users\natha\Documents\Claude\Projects`). Read its `## Current state` first. Never create notes inside this repo.
- The note's frontmatter says `plan: none`, `mrr: 0`, but its Current state calls this a paid build for David Corfman, so treat it as paying (confirm with Nathan if unsure): append a Work log row (`- YYYY-MM-DD | ~Xh | summary`) at the end of a session doing real work, per `_vault/README.md` rule 6, then commit and push `_vault/`.
- Docs are part of "done": update the affected repo docs (this file, README, OPERATIONS, `docs/PENDING.md`, `docs/agent/*`) in the same piece of work as any code, behaviour or decision change.

## Ports (shared improvements across the site family)

- `ncs-astro-sanity-starter/PORTS.md` is the registry; this repo also carries a `PORTS.md` at its root. A fix that generalises beyond this client gets a port card in the same commit that generalises it.
- Files with a `PORTABLE:` first-line marker are canonical in the starter; check drift with `node scripts/sync-check.mjs` (`npm run sync-check`).
- A lesson that bites two or more projects goes in `_vault/gotchas/` with an "applies-to" list and a "Ported to" checklist. Full working rules: `docs/claude/library-of-record.md`.

---

## Docs map

| Need                                                                    | Read                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| Open loops (read early each session)                                    | `docs/PENDING.md`                                |
| Tactical playbook (deploy, patch content, audits)                       | `OPERATIONS.md`                                  |
| npm script detail, parity, tests, CI gates                              | `docs/claude/commands.md`                        |
| Routes table and opt-in modules                                         | `docs/claude/routes-and-modules.md`              |
| Files safe to edit by hand                                              | `docs/claude/safe-to-edit.md`                    |
| PORTS.md and sync-check working rules                                   | `docs/claude/library-of-record.md`               |
| Shared code conventions and Claude habits (PORTABLE, imported above)    | `docs/claude/family-conventions.md`              |
| Deep dives (theme, components, SEO, performance, Sanity, deployment...) | `docs/claude/topic-index.md` then `docs/agent/*` |
| Cross-repo registry                                                     | `PORTS.md`                                       |
| New-project setup                                                       | `docs/bootstrap/NEW-PROJECT.md`                  |
| Change history                                                          | `docs/agent/changelog.md`                        |

Path-scoped rules (load automatically in `.claude/rules/`): `live-preview.md`, `dependencies-and-deploy.md`, `sanity-schema.md`, `brand-reskin.md`, `baked-assets-and-scripts.md`, `foundation-files.md`, `ui-verification.md`, `copy-and-voice.md`.

See `OPERATIONS.md` for the tactical playbook (deploy, patch content, run audits, common gotchas).
