---
paths:
  - 'scripts/**'
  - 'public/mud/**'
  - 'src/data/raceDayWeather.json'
  - 'src/components/**/CourseMap*'
  - 'src/lib/local-poster.ts'
---

# Baked assets and generator scripts

Moved verbatim from CLAUDE.md "Standalone scripts". The remaining npm scripts are in `docs/claude/commands.md`.

- `npm run og` to re-run `scripts/generate-og-default.mjs` and regenerate `public/og-default.png` (after changing brand colors, tagline, or the wordmark in the script's inputs block).
- `npm run mud` to re-bake the home hero's mud into `public/mud/*.png` from `scripts/lib/mud.mjs`. The art is BAKED rather than drawn live: as inline SVG it was ~900 nodes and ~19KB gzipped of critical-path markup, and baking also lets it run through `feTurbulence` + `feDisplacementMap` for ragged edges, which is far too expensive live. The files are alpha MASKS painted with `currentcolor`, so one set serves both themes. Commit the output, and look at it: the generator is deterministic, so a re-run with no source change rewrites byte-identical files. Two shapes are emitted because the layer is `cover`ed to its band, and the phone gets ONE combined layer on purpose (axe cannot see a mask, so four stacked semi-transparent layers model as a veil over the whole hero and put the countdown label below AA).
- The contact page's region map is no longer baked (2026-10-09): `src/components/race/RegionPoster.astro` draws it as inline SVG from real coordinates, so `npm run map-region` and `public/region-poster*` are gone. `scripts/capture-map-poster.mjs` and the map's `?poster=1` mode have no caller now (see `docs/PENDING.md`).
- `npm run weather:sync` to add the newest race day's weather to the strip on /course. It merges the committed `scripts/data/race-days.json` with the `raceDay` documents in Sanity, fetches only the years `src/data/raceDayWeather.json` lacks, and fails soft if the archive is down. `--record` (needs the write token) first records The Race's date as a `raceDay` document once the day is six days past. Both run automatically: the results-import workflow records and bakes daily through October and November, and the deploy bakes before every build, so the yearly weather needs nobody. `scripts/build-weather.mjs` remains the full re-bake for a changed historical date.
