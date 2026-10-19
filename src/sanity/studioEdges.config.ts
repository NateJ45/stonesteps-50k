// Safe to edit by hand
// =============================================================================
// The Studio's edges for the Stone Steps 50K: wordmark, sign-in line, wording, splash
// (PORTS.md card 120)
// =============================================================================
// The ONE site-specific file for the branded edges of the embedded Studio. NOT
// marked PORTABLE: every fork rewrites it. The machinery is PORTABLE:
// src/pages/studio/index.astro (the page and its splash), src/lib/studio-route.ts,
// src/sanity/studioWording.ts and the navbar wordmark in StudioLook.tsx.
// Detail: docs/agent/studio-kit.md ("The Studio's edges").
//
// Everything here is optional; leave a value out and the starter's neutral
// default (built from brand.config.json `name`) applies.
// =============================================================================

import type { StudioWordingInput } from './studioWording';

export interface StudioEdgesConfig extends StudioWordingInput {
  wordmark: {
    /** Which brand.config.json `logoPaths` entry the navy top bar shows ('dark' is the reversed one). null hides it. */
    logo: 'dark' | 'light' | null;
    /**
     * Optional crop of an SVG logo, "x,y,width,height" in the file's own
     * viewBox units, so a lockup can show its words only (the square mark is
     * already the Studio's icon right beside it).
     */
    view?: string | null;
  };
}

export const studioEdges: StudioEdgesConfig = {
  // No wordmark beside the square mark. The race's logo (src/assets/logo-*.svg)
  // is the hand-painted trail sign, 108 by 180 and four lines of lettering: at
  // the top bar's height it is a smudge. The steps mark beside the name is the
  // race's sign in the Studio. Revisit when Dave's new logo arrives: a lockup
  // with the words on one line can go here with a crop (`view`).
  wordmark: { logo: null },
  // Under the race's name on the sign-in card.
  loginSubtitle: 'Sign in to edit the race website',
};
