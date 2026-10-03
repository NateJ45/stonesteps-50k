# docs/claude: material split out of CLAUDE.md

CLAUDE.md is kept under 200 lines. Path-scoped rules live in `.claude/rules/*.md` (they load only when matching files are touched); long reference lives here. Nothing was deleted in the split.

- `commands.md`: npm scripts, build chain, parity, tests, CI gates
- `routes-and-modules.md`: routes table and opt-in modules
- `safe-to-edit.md`: files safe to edit by hand
- `library-of-record.md`: PORTS.md and sync-check working rules
- `family-conventions.md`: PORTABLE, imported by CLAUDE.md; code conventions and working-with-Claude habits shared by every site repo
- `topic-index.md`: map of `docs/agent/*` deep dives
