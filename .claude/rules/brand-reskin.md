---
paths:
  - 'brand/**'
  - 'scripts/apply-brand.mjs'
  - 'scripts/generate-og-default.mjs'
  - 'src/styles/globals.css'
  - 'src/data/site.ts'
  - 'public/og-default.png'
  - 'public/favicon.svg'
  - 'src/assets/**'
  - '.claude/skills/reskin/**'
---

# Brand reskin rules (CLAUDE.md rules 11, 12)

Moved verbatim from CLAUDE.md. The editable-vs-foundation file lists are in `docs/claude/safe-to-edit.md`.

- **Brand reskin:** `brand/brand.config.json` is the single source of truth for identity + palette + fonts + logo paths. Running `npm run apply-brand` deterministically rewrites `globals.css` tokens, `src/data/site.ts`, the Studio theme's font stacks in `sanity.config.ts`, and the OG image. For a full rebrand orchestration (interview, font install, apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.

- **Layout slots (starter card 72).** `brand.config.json` `layout` has five slots; the first value of each is the default and emits nothing. `src/lib/site-layout.ts` (PORTABLE) is the one list of slots and values; `apply-brand` writes `src/data/layout.ts` whole from the config (edit the config, not that file), and `site-layout.test.ts` fails if the schema, the config and that file disagree. `BaseLayout.astro` spreads `layoutAttrs(layout)` on `<html>`. This site does NOT carry the starter's header, density and cards CSS or the `Hero` variants (it draws its own trail-sign header and `RaceHero`), so only `motion` changes anything here; wire the CSS before choosing another value.

11. **`apply-brand` does not install font packages.** Run `npm install @fontsource/...` for the chosen fonts before running `npm run apply-brand`. The script rewrites imports and tokens but cannot install packages itself.
12. **After `apply-brand`, run `npm run build`** to verify the reskin did not break anything. The brand script does not run the build chain and does not change schemas, so typegen is not needed here unless you also changed a schema in the same session.
