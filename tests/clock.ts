// THE SPECS' IDEA OF "NOW". The countdown and the footer's race band decide
// what they show from the date twice: once at build time (src/lib/build-clock.ts)
// and again in the browser every second. On race day 2026-10-25 both turned
// over, the hero clock hid its digits and the home page got shorter, and every
// PR went red for a reason that had nothing to do with the PR.
//
// CI pins the build with NCS_BUILD_NOW (ci.yml, visual.yml); pinClock pins the
// browser to the same instant. A local run builds with the real time, but the
// client script re-decides the phase on its first tick, so the page still
// settles into the pinned state.
import type { Page } from '@playwright/test';

export const TEST_NOW = process.env.NCS_BUILD_NOW?.trim() || '2026-10-01T16:00:00Z';

/** Time starts at TEST_NOW and then runs, so a ticking clock still ticks. */
export async function pinClock(page: Page) {
  await page.clock.install({ time: new Date(TEST_NOW) });
}

/** Date.now() stays at TEST_NOW, for screenshots that must not move a digit. */
export async function freezeClock(page: Page) {
  await page.clock.setFixedTime(new Date(TEST_NOW));
}
