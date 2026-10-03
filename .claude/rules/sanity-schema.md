---
paths:
  - 'src/sanity/schemaTypes/**'
  - 'src/sanity/structure.ts'
  - 'sanity.config.ts'
  - 'src/lib/sanity.ts'
  - 'src/lib/queries.ts'
  - 'src/lib/sanity.types.ts'
  - 'src/lib/sectionCadence.ts'
  - 'src/lib/reservedSlugs.ts'
  - 'src/lib/cms-preview.ts'
  - 'src/data/defaultSections.ts'
  - 'src/components/SectionRenderer.astro'
  - 'src/pages/[slug].astro'
---

# Sanity schema, page builder and field rules (CLAUDE.md rules 8b, 9, 10, 13)

Moved verbatim from CLAUDE.md. Numbers match the old numbering, which PORTS.md cites ("CLAUDE.md #9"). Rules 1 and 7 (Remove field, typegen) stay in CLAUDE.md.

<!-- prettier-ignore-start -->

8b. **Adding a logic-driving dropdown field to a schema means adding its name to `NON_STEGA_FIELDS`** in `src/lib/cms-preview.ts`, in the same commit. Miss it and the block renders the wrong branch **in the preview only**, which is the hardest kind of bug to notice.

9. **`pageBuilder` cadence is managed by `SectionRenderer`, not by the blocks themselves.** Blocks carry no surface/color field. The alternating-surface logic lives in `src/lib/sectionCadence.ts`. Do not add color fields to block schemas. This is now a TEST, not just a rule: `src/lib/section-fields.test.ts` fails if `sections.ts` or `richSections.ts` ever declares a `tone`, `surface`, `background` or `accent` field. It is also why PORTS.md cards 26 and 28 land here `partial` on purpose -- the sibling repos' band swatch control has nothing to write to here, and adding a field to get the control would trade the reorder guarantee for a convenience.

10. **The reserved-slug guard lives inside `getStaticPaths` in `[slug].astro`,** not at module scope. This is an Astro isolated-scope requirement; shared list is in `src/lib/reservedSlugs.ts`. If you move the guard outside `getStaticPaths`, it silently stops working.

13. **A field `description` is instructions for the editor typing into that box** (what to put, what format, where it shows, what a blank does, in one or two sentences under ~140 characters), never dates, names, provenance, file paths or the argument for why the field exists: that knowledge goes in a `//` comment above the `defineField(`.

<!-- prettier-ignore-end -->

Page-builder background (from Stack essentials):

- **Page builder:** `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic in `src/lib/sectionCadence.ts`, unit-tested). Blocks carry no color field; the cadence is automatic.
- **Default sections fallback:** `src/data/defaultSections.ts` holds code-defined default content arrays for each core page. When a page's `pageBuilder` array is absent (fresh clone, no Sanity project), the route uses the defaults, so the site always renders non-blank content.
