---
paths:
  - 'scripts/**'
  - 'modules/**/seed.mjs'
  - 'migrations/**'
---

# Data scripts: the gate on every write

Loads when you write or edit scripts that change Sanity data. Added 2026-10-13 (PORTS.md cards 86 and 95); the bullets match the starter's `.claude/rules/data-scripts.md`, with this site's specifics after them.

## Every write: dry by default, and a second factor on production

- **A script that writes is dry by default.** Build it on `scripts/lib/sanity-lib.mjs` (`apply()` and `done()`), which prints the plan and writes nothing unless the run carries `--apply`. A script that cannot use it gives itself the same gate: here that is `scripts/lib/write-gate.mjs` (`writeGate()`, plus `gateClient()` for scripts whose writes are scattered). `npm run seed` goes through the same gate.
- **On the `production` dataset `--apply` is not enough.** The run also needs `NCS_PRODUCTION_WRITE=yes` in the process environment, set in the same command: `NCS_PRODUCTION_WRITE=yes node scripts/x.mjs --apply` (PowerShell: `$env:NCS_PRODUCTION_WRITE='yes'; node scripts/x.mjs --apply; Remove-Item Env:NCS_PRODUCTION_WRITE`). It is read from `process.env` directly, never from `.env`, so it cannot be set once and forgotten. Only Nathan sets it, in person; a delegated agent never does, and never passes a production URL or dataset to a write script. This site has only the `production` dataset, so every write needs it.
- **Test a guard against a dummy host, never against what it guards.** Point the client at `SANITY_API_HOST=https://example.invalid` with a fake project and token (as `scripts/lib/sanity-lib.test.mjs` and `scripts/lib/write-gate.test.mjs` do), or unit-test the pure check. Running the real write command to "see if the guard stops it" is how a guard gets tested on production.
- **Never put text containing backticks or `$(...)` inside a shell string** (`node -e "..."`, `echo "..."`, a heredoc with an unquoted delimiter). The shell runs what is inside as a command substitution: on 2026-10-04 a markdown plan written through `node -e` quoted a content-load command in backticks, and bash ran it against production. Write such text with the file-writing tool (Write/Edit), then run a script file. Git Bash heredocs also drop backslashes, which is a second reason to write scripts to a file first.
- **Array objects need `_type` and `_key`** in anything a script writes, and `npm run audit:data` checks the result (PORTS.md card 95).

## Stone Steps specifics

- **Older write flags stay.** `build-elevation.mjs` writes with `--write`, `weather-sync.mjs` with `--record`; both also need the variable. `--dry-run` is still accepted everywhere and always wins.
- **The CI allowance.** `import-results.mjs`, `weather-sync.mjs --record` and `publish-due.mjs` run unattended in `results-import.yml` and `publish-due.yml`, so in GitHub Actions they write without the variable (and `import-results.mjs` keeps writing on a bare run there). Off Actions the full rule applies. `docs/PENDING.md` item 1q tracks removing the allowance.
- **New write script?** Import `./lib/write-gate.mjs` as the FIRST import (before `dotenv/config`, so `.env` cannot reach the snapshot), call `writeGate({ dataset })` before any request, and add the script to the `GATED` list in `scripts/lib/write-gate.test.mjs`.
- **Retiring data** means a backup-then-delete script, dry first, never a raw delete. `scripts/retire-27k-records.mjs` is the shape: it writes the documents verbatim to a committed JSON file before deleting, and guards each delete on the exact conditions that justify it.
- **`npm run audit:data`** walks every document against the compiled schema, read only, and exits 1 on any finding. A missing `_type` is fixed with `scripts/backfill-array-types.mjs` (back up with `npx sanity dataset export production <file> --raw` to a folder outside the repo, dry run, then write with the second factor, then re-run the audit). An orphan field is never unset without Nathan: it deletes data, and on this site one is still rendered (`docs/PENDING.md` item 1r).
