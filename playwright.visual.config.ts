/* ============================================================================
   Visual-regression config — SEPARATE from the main suite on purpose
   ============================================================================
   Ported from west-chester-preschool (PORTS.md card 37).

   WHY IT IS SEPARATE. Screenshot baselines are platform-sensitive: font
   rasterisation differs between Windows and the Linux CI runners, so a local
   Windows run diffs against Linux baselines and fails. That is EXPECTED. CI is
   the arbiter, exactly as it is for the a11y sweeps.

   Baselines are generated IN CI by .github/workflows/update-visual-baselines.yml
   and committed under tests/visual/__screenshots__/. Regenerate them
   (workflow_dispatch) only when a visual change is INTENDED, in the same commit
   that causes it. A baseline refreshed "to make the red go away" converts this
   gate into decoration.

   WHAT IT SHOOTS. /styleguide only, which renders the design system with FIXED
   data. The real pages carry a live countdown and a results archive that grows
   every year; shooting those would churn the baseline on content and teach
   everyone to ignore it.
   ============================================================================ */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_VISUAL_PORT ?? 4322);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Loose enough to ignore antialiasing shimmer, tight enough that a moved
      // band, a lost logo or a colour shift trips it.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL,
    // Reduced motion freezes the reveal and scroll systems so content renders
    // in its resting state, which is what a stable screenshot needs. It is a
    // browser-context option: at the top level of `use` it is a type error and
    // silently does nothing.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx http-server dist/client -p ${PORT} -s -c-1 --silent`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
