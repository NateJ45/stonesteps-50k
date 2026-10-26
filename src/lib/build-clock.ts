// THE BUILD'S IDEA OF "NOW". Everything that decides markup from the date at
// build time (the countdown's phase, the footer's race band, the announcement
// window) reads it from here instead of calling Date.now() itself.
//
// Unset, it is the real time: production and local builds are unchanged. CI
// sets NCS_BUILD_NOW to a fixed instant before the snapshot's race date
// (ci.yml, visual.yml), so a test build renders the same page on race day as
// it did the month before. Race day 2026-10-25 turned every PR red because the
// countdown left its 'count' phase and the footer dropped its race band. The
// specs pin the browser to the same instant with page.clock (tests/clock.ts).
// `?.` because node --test imports src/lib without Vite, where import.meta.env
// does not exist.
const pinned = ((import.meta.env?.NCS_BUILD_NOW as string | undefined) ?? '').trim();
const pinnedMs = pinned ? Date.parse(pinned) : NaN;

if (pinned && Number.isNaN(pinnedMs)) {
  throw new Error(`NCS_BUILD_NOW is not a date: ${pinned}`);
}

export function buildNow(): number {
  return Number.isNaN(pinnedMs) ? Date.now() : pinnedMs;
}
