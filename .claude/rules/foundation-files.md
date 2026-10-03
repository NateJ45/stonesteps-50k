---
paths:
  - 'src/styles/globals.css'
  - 'src/sanity/**'
  - 'sanity.config.ts'
  - 'sanity.cli.ts'
  - 'src/lib/**'
  - 'src/layouts/BaseLayout.astro'
  - 'src/layouts/PreviewLayout.astro'
  - 'src/components/ui/**'
  - 'src/components/SectionRenderer.astro'
  - 'src/components/sections/**'
  - 'src/components/preview/**'
  - 'src/pages/preview/**'
  - 'src/pages/api/draft-mode/**'
  - 'src/pages/robots.txt.ts'
  - 'public/_headers'
  - 'public/llms.txt'
  - 'astro.config.mjs'
  - 'wrangler.jsonc'
  - 'package.json'
  - 'tsconfig.json'
  - 'components.json'
  - 'scripts/apply-brand.mjs'
  - 'scripts/with-workerd.mjs'
  - 'scripts/free-dist.mjs'
  - 'scripts/page-parity.mjs'
  - 'scripts/sync-check.mjs'
  - 'scripts/lib/sanity-lib.mjs'
  - 'scripts/generate-*.mjs'
  - 'scripts/optimize-logo-files.mjs'
  - 'scripts/import-content.mjs'
  - 'modules/**'
---

# Foundation, edit with care

Moved verbatim from CLAUDE.md. Loads when a foundation file is touched. Files that are safe to edit are in `docs/claude/safe-to-edit.md`. Gotcha #1 is rule 1 in CLAUDE.md; the live preview section is `.claude/rules/live-preview.md`.

- `src/styles/globals.css` -- the full file beyond the design seam tokens: shadcn `:root` / `.dark` overrides, **polish-layer utilities** (`.card-lift`, `.press-tactile`, `.nav-underline`, `.site-header`, `.reading-progress`, `.surface-warm`, `[data-reveal]`), base resets, paper-grain `body::before`, print stylesheet
- `src/sanity/schemaTypes/*.ts` -- Sanity schemas. Changing fields can break existing content. See gotcha #1 above. Key schemas: `sections.ts` (11 general block types + `SECTION_TYPES` + `SECTION_INSERT_MENU`/`sectionArrayOptions` + `additionalSectionsField`), `richSections.ts` (11 rich section types + per-page curated lists), `businessInfo.ts` (service areas, travel, availability, geo, `businessModel`, `additionalLocations` -- split from siteSettings; merged back by `getSiteSettings()`), `siteSettings.ts` (`businessType`, `socialLinks` array), `faqCategory.ts`, `faqItem.ts` (`categoryRef` field), `page.ts` (custom page document type).
- `sanity.config.ts` and `sanity.cli.ts` (repo root), `src/sanity/structure.ts`, `src/sanity/resolve.ts`, `src/sanity/urls.ts`, `src/sanity/components/` -- the Studio's workspace config, desk structure, Presentation location map, URL helpers and custom panes.
- The preview stack: `src/lib/cms-preview.ts`, `src/lib/preview-auth.ts`, `src/lib/preview-edit-attr.ts`, the seven `src/lib/preview-{stega,text-diff,text-nodes,live-draft,refresh,morph,navigation}.ts` (PORTABLE - the starter is the library of record for those, so edit them here and let `sync-check` propagate), `src/layouts/PreviewLayout.astro`, `src/components/preview/`, `src/sanity/components/LiveDraftBridge.tsx`, `src/pages/preview/`, `src/pages/api/draft-mode/`. Read the [Live draft preview](live-preview.md) section before touching any of them.
- `src/lib/sanity.ts` -- Sanity client, `sanityFetch` wrapper, `urlFor`, `parseSanityAssetDimensions`. The `isSanityUnconfigured` guard and graceful-fallback behavior are load-bearing for fresh-clone builds.
- `src/lib/queries.ts`, `src/lib/sanity.types.ts` -- GROQ queries and generated types. Includes `sectionsProjection()`, `getPage`, `getAllPageSlugs`, `getNavPages`.
- `src/lib/sectionCadence.ts` -- logic that maps section index to surface variant (the alternating-bg cadence). `SectionRenderer` calls this; blocks have no color field. Unit-tested in `src/lib/sectionCadence.test.ts`.
- `src/lib/reservedSlugs.ts` -- the list of slugs the custom `[slug].astro` route must not serve (because they are handled by dedicated pages). Consumed inside `getStaticPaths` in `[slug].astro`. Unit-tested in `src/lib/reservedSlugs.test.ts`.
- `src/components/SectionRenderer.astro` -- the page-builder runtime. Maps each block `_type` to its component and applies the surface cadence from `sectionCadence.ts`. Changing the type-to-component map here affects all section-driven pages.
- `src/lib/scriptAccent.ts` -- shared helper `splitScriptAccent(headline, accent)` used by `Hero.astro`, `SectionHeading.astro`, and `FinalCta.astro`
- `src/lib/sectionVisibility.ts` -- `getSectionVisibility(raw)` converts the raw `siteSettings.sectionVisibility` Sanity object into a flat boolean map. Rule: `value !== false` (unset/null/true = visible; only explicit false = hidden). Every toggleable page imports this. See [Section visibility](../../docs/agent/page-architecture.md#section-visibility).
- `src/layouts/BaseLayout.astro` -- anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis init, **scroll-reveal observer**, **sticky-header scroll listener**, Cloudflare Analytics, OG meta, JSON-LD, title-suffix-doubling guard
- `src/components/ui/` shadcn primitives -- **note: `accordion.tsx` is customized** (removed `h-(--radix-accordion-content-height)` lock + dropped `text-sm font-medium` from trigger). If you reinstall via `npx shadcn add` it will revert; reapply the changes.
- React islands: `MobileNav.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ContactForm.tsx`, `BeforeAfterSlider.tsx`, `FaqAccordion.tsx`, `CalendlyInline.tsx`, `StickyCTAChip.tsx`, `CopyEmailButton.tsx`, `PortableText.tsx`, `JournalPortableText.tsx`, `StatsCounter.tsx`, `NewsletterSignup.tsx`
- Astro wrappers: `SanityImage.astro`, `StructuredData.astro` (if present), `SectionHeading.astro`, `SectionDivider.astro`, `ServiceAreaCue.astro`, `ReadingProgress.astro`, `ProcessStepIllustration.astro`, `Hero.astro`, `HeroBackground.astro`, `FinalCta.astro`, `CtaLink.astro`, `StatsRow.astro`, `FeaturedWork.astro`, `FeaturedJournal.astro`, `PressStrip.astro`; section components in `src/components/sections/`
- `scripts/apply-brand.mjs` -- the brand reskin script. Reads `brand/brand.config.json` and rewrites globals.css, site.ts, Studio config, and regenerates the OG image. Idempotent.
- `scripts/generate-og-default.mjs`, `scripts/generate-og-pages.mjs`, `scripts/generate-llms-full.mjs`, `scripts/generate-logo-variants.mjs`, `scripts/optimize-logo-files.mjs`, `scripts/import-content.mjs` -- reusable generator and import scripts
- `scripts/with-workerd.mjs`, `scripts/free-dist.mjs`, `scripts/page-parity.mjs`, `scripts/sync-check.mjs`, `scripts/lib/sanity-lib.mjs`, `src/lib/contrast.ts` -- **canonical copies owned by this repo on behalf of the whole site family.** Each carries a `PORTABLE:` first-line marker. Editing one changes the family's copy, so make general changes only and note them on the matching PORTS.md card. Site-specific behavior does not belong in a marked file.
- The in-canvas control layer is canonical too (PORTS.md cards 28, 28a, 28b): `src/lib/sanity-path.ts`, `src/lib/inline-rich.ts`, `src/lib/inline-rich-write.ts`, `src/lib/heading-accent.ts` (+ their `.test.ts`) and `src/components/preview/overlay/{usePopover,useDraftDocument,styles}.ts`. **Three seams keep them shareable, and every one of them is a per-repo file, never a branch inside a marked one:** `readSectionPath(path, arrayFields)` takes the page-builder array names (the list lives in `src/lib/section-fields.ts`), `overlay/tool-theme.ts` holds the six palette values `styles.ts` draws with, and `RichWriteOptions.multiline` says whether a repo's twin keeps its line breaks. Reid-design-site and mas-monograms carry four of these files, so a change to any of them puts five repos into drift -- reach for a seam before an edit.
- `astro.config.mjs`, `wrangler.jsonc`, `package.json`, `tsconfig.json`, `components.json`
- `public/_headers` (security response headers shipped with the deploy)
- `src/pages/robots.txt.ts` (generated endpoint; reads the production URL from `src/data/site.ts` and emits allow-all + correct sitemap reference at build time -- do not create a static `public/robots.txt`)
- `public/llms.txt` (AI/LLM crawler index -- update if major pages change)

**Modules:** files under `modules/` each contain a page, islands, schema additions, and a co-located query file (`modules/<name>/src/lib/<name>Queries.ts`). Enabling a module is copy-a-folder: copy the module folder into `src/` and `src/sanity/schemaTypes/`, register the schema in `src/sanity/schemaTypes/index.ts`, and toggle it on in `siteSettings.sectionVisibility`. The co-located query file means no hand-pasting into core `queries.ts`. Per-module guides are in `docs/modules/`. Do not edit module internals without reading its doc first.

If a change requires editing the foundation set, do it in a planned session, write the change deliberately, and update this doc when the architecture shifts.
