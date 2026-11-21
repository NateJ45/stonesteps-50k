# docs/claude: material split out of CLAUDE.md

CLAUDE.md is kept under 200 lines. Path-scoped rules live in `.claude/rules/*.md` (they load only when matching files are touched); long reference lives here. Nothing was deleted in the split.

- `commands.md`: npm scripts, build chain, parity, tests, CI gates
- `routes-and-modules.md`: routes table and opt-in modules
- `safe-to-edit.md`: files safe to edit by hand
- `library-of-record.md`: PORTS.md and sync-check working rules
- `family-conventions.md`: PORTABLE, imported by CLAUDE.md; code conventions and working-with-Claude habits shared by every site repo
- `topic-index.md`: map of `docs/agent/*` deep dives

## Starter provenance paragraphs (moved from CLAUDE.md)

`ncs-astro-sanity-starter` is a production-ready Astro + Sanity + Cloudflare Workers site template forked from a finished client build. This is a **page-builder-first** starter: the home, about, services, and process pages all render via a shared `SectionRenderer` component fed by Sanity `pageBuilder` arrays, and any custom page created in the Studio gets a `/[slug]` route for free. The infrastructure -- build pipeline, CMS integration, deploy hooks, polish layer, section-visibility system, component library, Lighthouse 100/100/100/100 baseline -- is already standing. A new project pours in two things: its brand identity (run `npm run apply-brand` with `brand/brand.config.json`) and its content.

This starter is not a minimal scaffold. It ships with real patterns and real gotchas documented from production. The point is to skip the month of discovering them.

_Provenance: forked from the Reid Design build._
