# Stone Steps 50K site (NCS Astro + Sanity starter fork): CLAUDE.md

Always-loaded rules for this repo, kept short on purpose. Anything file-specific lives in `.claude/rules/*.md` (loads only when you touch matching files); long reference lives in `docs/claude/` and `docs/agent/` (read on demand). The docs map is at the bottom.

The site is stonesteps50k.com for the Stone Steps 50K / 27K race (Mt. Airy Forest, Cincinnati). Astro 7 + Sanity (project 7iynvqq6, dataset production, Studio embedded at `/studio`) on a Cloudflare Worker, forked from `ncs-astro-sanity-starter`.

**Design context.** `PRODUCT.md` (audience, purpose, tone, anti-references; the answers tagged "Proposed ... edit if wrong" are drafts Nathan has not confirmed) and `DESIGN.md` (the visual system as built) sit at the repo root; read them before any design work and update them in the same change when the system moves.

**Read `docs/PENDING.md` early in a session.** It is the live registry of open loops: queued work, known gaps, and waiting-on-a-human items. If you finish or discover one, update it in the same commit.
The site is a fork of `ncs-astro-sanity-starter`; the starter provenance notes are in `docs/claude/README.md`.

## Stack essentials

Full stack notes and the `astro.config.mjs` landmines are in `docs/agent/stack-and-config.md`. The must-knows:

- **Astro 7.x**, TypeScript strict, `output: 'static'` with a handful of SSR routes. Node 22.23.4 (pinned in `.nvmrc`, which every workflow reads; starter card 209).
- **Sanity v6** is the CMS. The Studio lives IN THIS PACKAGE (schemas in `src/sanity/schemaTypes/`, desk in `src/sanity/structure.ts`, config at the repo-root `sanity.config.ts`, CLI config in `sanity.cli.ts`) and is **embedded at `/studio`** via `@sanity/astro`, so it rebuilds with every deploy and can never drift stale. There is deliberately no `studioHost`/`deployment` in `sanity.cli.ts` so a stray `sanity deploy` cannot recreate a hosted copy. `npm run typegen` regenerates types from the schemas.
- **Live draft preview at `/preview/**`** through Sanity's Presentation tool (click-to-edit, live refresh over SSE, in-canvas section controls). Rules for touching it are in `.claude/rules/live-preview.md`.
- **Tailwind 4 via `@tailwindcss/vite`.** There is no `tailwind.config.mjs`. Brand tokens live in `@theme` blocks in `src/styles/globals.css`.
- **React 19 islands** for interactivity; Astro components for everything static.
- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `npm run deploy`, which is `wrangler deploy -c dist/server/wrangler.json`. A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing about the SSR entrypoint, and every sub-route 404s.
- **More stack notes** (contact form, Studio kit, authoring kit, starter cards 186 to 198, layout slots): `docs/agent/stack-and-config.md`.
- **`sanityFetch(query, params, fallback)`** in `src/lib/sanity.ts` is the single chokepoint for all Sanity reads. When `PUBLIC_SANITY_PROJECT_ID` is absent or set to the placeholder value, it returns the fallback without any network call, so `npm run build` succeeds with no Sanity project configured -- pages render their default-sections content (see below).

## Commands

- `npm run dev`: dev server; the Studio is at `/studio` (no separate studio server).
- `npm run typegen`: regenerate Sanity types after any schema change, BEFORE `npm run build`. `npm run build:full` chains both.
- `npm run check` (`astro check` + lint): the fast gate. `npm run check:full`: typegen, build, unit tests (which include `test:scripts`). Also `npm run format:check`, `npm run check:links`, `npm test` (Playwright).
- `npm run test:unit`: node --test over `src/lib/*.test.ts`, then `npm run test:scripts` (node --test over `scripts/lib/*.test.mjs`), so CI and deploy run both; four of them are gates (`theme-tokens`, `layout-variants`, `section-fields`, `site-layout`).
- `npm run parity compare`: rendered-HTML parity gate for render-neutral changes. Build with `PUBLIC_GA_ID=` blank first or every page fails (`PUBLIC_GA_ID= npm run build && npm run parity compare`).
- `npm run preview`: `wrangler dev -c dist/server/wrangler.json`; the only way to exercise the SSR routes and real response headers locally.
- `npm run deploy`: build, then `wrangler deploy -c dist/server/wrangler.json`. Never a bare `wrangler deploy` (it reads the root `wrangler.jsonc`, every sub-route 404s).
- Everything else (apply-brand, og, seed, sync-check, free-dist, audits, the Studio-less deploy note) and the dry-run rule for Sanity-writing scripts: `docs/claude/commands.md`. **Every script that writes to Sanity is a dry run unless it gets `--apply` AND `NCS_PRODUCTION_WRITE=yes` in the same command.**

## Branch, CI and deploy

- Work on a branch and open a PR; `main` is production and a merge deploys. CI (`ci.yml`) has parallel jobs feeding the required checks `build` and `test` (keep the names, never path-filter `ci.yml`). CI never reads live content (snapshot). Detail: `docs/agent/deployment.md`.
- Content is statically built: a Sanity edit only goes live after a rebuild (push to `main`, or the Sanity publish webhook). Detail in `docs/agent/deployment.md`.
- Never read or print `.env` or `.dev.vars`. `SANITY_TOKEN` is a runtime secret (`npx wrangler secret put SANITY_TOKEN`).

---

## The rules that bite if you forget them

<!-- prettier-ignore-start -->
1. **Never click "Remove field" in the Studio** (deletes that field's data everywhere). After a schema change: edit schema, `npm run typegen`, commit, deploy.
2. **No em-dashes in public-facing site copy.** Code comments, commits and internal docs are exempt.
3. **Build in both light AND dark mode** on every UI change (`docs/agent/theme-and-color.md`).
4. **Desktop nav is server-rendered** in `Header.astro`; do not make it a client-only island.
5. **Scrolling is native; no smooth-scroll library.** Anything sliding content in sideways needs `data-flow="off"` (`docs/agent/animation.md`).
6. **Content is statically built.** A Sanity edit goes live only after a rebuild.
7. **After any schema change run `npm run typegen` before `npm run build`.**
8. **Astro, adapter, wrangler, React and Sanity versions are a MATCHED SET;** never bump one alone (`.claude/rules/dependencies-and-deploy.md`). Curling a page is not verifying it.
   8b. A new logic-driving dropdown goes into `NON_STEGA_FIELDS` in `src/lib/cms-preview.ts`.
9. **Blocks carry no colour/surface field** (`section-fields.test.ts`); `SectionRenderer` owns the cadence (`.claude/rules/sanity-schema.md`).
10. **The reserved-slug guard lives inside `getStaticPaths`** in `[slug].astro`.
11. **`apply-brand` does not install font packages.** **12.** Run `npm run build` after `apply-brand` (`.claude/rules/brand-reskin.md`).
13. **A field `description` is instructions for the editor,** under ~140 characters, no dates, names or file paths (`.claude/rules/sanity-schema.md`).

<!-- prettier-ignore-end -->

Full text of every rule: `docs/claude/rules-detail.md`.

Foundation files (schemas, `globals.css`, `BaseLayout.astro`, `SectionRenderer.astro`, preview stack, Studio config, `astro.config.mjs`, `wrangler.jsonc`, `package.json`) are "edit with care, plan the session". The list loads from `.claude/rules/foundation-files.md` when you touch one; files safe to edit by hand are in `docs/claude/safe-to-edit.md`.

PORTABLE-marked files are canonical in the starter; do not make site-specific edits inside one (see Ports below).
---

## Code conventions and Working with Claude

Shared by every site repo in the family, so they live in one PORTABLE file imported here (it is expanded into context at launch, so this saves lines in this file, not tokens): the code conventions (strict TypeScript, header comments, Astro and React islands, images, Tailwind) and the working-with-Claude habits (desktop app, Plan Mode, confirm before installing, describe design in plain language, verify in a real browser).

@docs/claude/family-conventions.md
Stone Steps specifics on top of the shared text:
Stone Steps specifics: image handling in `docs/agent/images.md`; browser verification in `.claude/rules/ui-verification.md`.

## Style (short version; full rules in `.claude/rules/copy-and-voice.md`)

- Warm, conversational, plain. No AI-tell phrases (delve, leverage, robust, seamless, crucial, pivotal and the like), no "It's not just X, it's Y", no filler openers or closers.
- No em-dashes in public-facing site copy (rule 2). Say prices plainly; be specific.

---

## Vault (business context lives outside this repo)

- Business context, decisions and the Work log live in `_vault/clients/stone-steps-50k.md` at the Projects root (`C:\Users\natha\Documents\Claude\Projects`). Read its `## Current state` first. Never create notes inside this repo.
- Append a Work log row (`- YYYY-MM-DD | ~Xh | summary`) at the end of a session doing real work, per `_vault/README.md` rule 6, then commit and push `_vault/`.
- Docs are part of "done": update the affected repo docs (this file, README, OPERATIONS, `docs/PENDING.md`, `docs/agent/*`) in the same piece of work as any code, behaviour or decision change.

## Ports (shared improvements across the site family)

- `ncs-astro-sanity-starter/PORTS.md` is the registry; this repo also carries a `PORTS.md` at its root. A fix that generalises beyond this client gets a port card in the same commit that generalises it.
- Files with a `PORTABLE:` first-line marker are canonical in the starter; check drift with `node scripts/sync-check.mjs` (`npm run sync-check`).
- A lesson that bites two or more projects goes in `_vault/gotchas/` with an "applies-to" list and a "Ported to" checklist. Full working rules: `docs/claude/library-of-record.md`.

---

## Docs map

The full table of what to read for what (open loops `docs/PENDING.md`, `OPERATIONS.md`, routes, safe-to-edit, PORTS, bootstrap, changelog, analytics) and the path-scoped rules list: `docs/claude/topic-index.md`. Open `docs/PENDING.md` early in a session.
