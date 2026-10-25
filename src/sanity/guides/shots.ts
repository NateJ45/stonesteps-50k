// Safe to edit by hand
// =============================================================================
// This site's pictures of the Studio for the Site Guide (PORTS.md card 130)
// =============================================================================
// A guide asks for a picture by KEY, so the guide text stays the same on every
// site while each site draws its own screenshots:
//
//     { kind: 'shot', key: 'publish-button' }          // in guides/content.ts
//
// and this file says what that key shows on THIS site: the image in
// public/guide-shots/ and the marks laid over it. A key with no entry here
// falls back to the wireframe drawing (public/guide-shots/example-editor.svg),
// so a guide never shows a hole. Adding a capture is: save a WebP under
// public/guide-shots/ (crop to the useful part, cover any avatar or personal
// name, under about 150 KB), add its entry below, and the guide picks it up.
//
// Positions are PERCENT of the picture, so a recapture at another size keeps
// its marks. To place one from a capture, divide the pixel position inside the
// cropped image by its width or height and multiply by 100. See
// docs/agent/studio-kit.md ("Real captures in the guides") for the recipe, and
// src/lib/guide-shots.test.ts for what is checked (the file exists, the alt text
// is there, the marks sit inside the picture).
//
// Shape of an entry: GuideShotData in src/lib/studio-look.ts.
// =============================================================================

import type { GuideShotData } from '../../lib/studio-look.ts';

// Captured 2026-10-19 from the kit harness Studio (dev server, light), at 1500
// wide for the desk and 390 for the phone. Sample names stand in for the real
// sponsors and runner; no account avatar or personal name is in any picture.
// Crops and marks: the capture recipe in docs/agent/studio-kit.md.
export const GUIDE_SHOTS: Record<string, GuideShotData> = {
  'home-checklist': {
    src: '/guide-shots/home-checklist.webp',
    alt: 'The race checklist on Home: eight jobs, ticked ones in colour, with "Race week: a notice is up" waiting and a button to put one up.',
    width: 530,
    height: 1005,
    marks: [
      { kind: 'ring', x: 16.2, y: 49.9, w: 78.1, h: 13 },
      {
        kind: 'stone',
        x: 17.2,
        y: 50.9,
        label: 'Shows up in race week only. "Put one up" opens Quick update.',
      },
      { kind: 'ring', x: 16.2, y: 76, w: 78.1, h: 8.2 },
      { kind: 'stone', x: 17.2, y: 77, label: 'This one you tick by hand once RunSignUp matches.' },
    ],
  },
  'quick-update-tiles': {
    src: '/guide-shots/quick-update-tiles.webp',
    alt: 'Quick update on a phone in race week: big buttons for a race-week notice, an urgent change on race day, and changing the start time or parking.',
    width: 390,
    height: 492,
    marks: [
      { kind: 'ring', x: 4.4, y: 3.6, w: 91.3, h: 30.5 },
      { kind: 'stone', x: 5.4, y: 2.7, label: 'Race week: parking, bib pickup, the weather.' },
      { kind: 'ring', x: 4.4, y: 63.1, w: 91.3, h: 35.9 },
      { kind: 'stone', x: 5.4, y: 62.3, label: 'The start time or the parking moved.' },
    ],
  },
  'quick-update-form': {
    src: '/guide-shots/quick-update-form.webp',
    alt: 'The race-week notice form on a phone: the notice, the last day to show it, an optional link, and the button that puts it on the website.',
    width: 390,
    height: 714,
    marks: [
      { kind: 'ring', x: 4.4, y: 32.8, w: 91.3, h: 19.6 },
      { kind: 'stone', x: 5.4, y: 33.8, label: 'One or two short sentences.' },
      { kind: 'ring', x: 4.4, y: 59.2, w: 91.3, h: 8.5 },
      { kind: 'stone', x: 5.4, y: 60.2, label: 'It comes down after this day.' },
      { kind: 'ring', x: 4.4, y: 89.6, w: 91.3, h: 8 },
      { kind: 'stone', x: 5.4, y: 90.6, label: 'Published straight away.' },
    ],
  },
  'race-date-field': {
    src: '/guide-shots/race-date-field.webp',
    alt: 'The race document: "Which edition is this?" with its How to button, and the Race day date and time below it.',
    width: 648,
    height: 298,
    marks: [
      { kind: 'ring', x: 3.7, y: 59.4, w: 92.6, h: 35.3 },
      { kind: 'stone', x: 4.7, y: 60.4, label: 'Next year’s date and start time.' },
    ],
  },
  'race-links': {
    src: '/guide-shots/race-links.webp',
    alt: 'The race document on its Links tab: the Register (RunSignUp) address, with its How to button.',
    width: 648,
    height: 230,
    marks: [
      { kind: 'ring', x: 3.7, y: 47, w: 92.6, h: 46.1 },
      { kind: 'stone', x: 4.7, y: 48, label: 'Every Register button reads this one address.' },
      { kind: 'ring', x: 4.5, y: 60.4, w: 11.7, h: 13.5 },
      { kind: 'stone', x: 5.5, y: 61.4, label: 'How to opens the guide at this step.' },
    ],
  },
  'distance-fees': {
    src: '/guide-shots/distance-fees.webp',
    alt: 'The 50K distance: Entry fee tiers, three price steps each with its label and end date, and Add item below.',
    width: 648,
    height: 348,
    marks: [
      { kind: 'ring', x: 3.8, y: 4.5, w: 92.6, h: 90.8 },
      { kind: 'stone', x: 4.8, y: 5.5, label: 'The ladder printed on this distance’s ticket.' },
      { kind: 'ring', x: 22.3, y: 16.5, w: 11.7, h: 8.9 },
      { kind: 'stone', x: 23.3, y: 17.5, label: 'How to opens the guide at this step.' },
    ],
  },
  'sponsors-list': {
    src: '/guide-shots/sponsors-list.webp',
    alt: 'The Sponsors list with four sample sponsors, each with a drag handle on the left and the + button at the top right.',
    width: 798,
    height: 287,
    marks: [
      { kind: 'ring', x: 91.4, y: 2.5, w: 3.9, h: 10.8 },
      { kind: 'stone', x: 92.4, y: 3.5, label: 'Add a sponsor.' },
      { kind: 'ring', x: 5.1, y: 21.3, w: 2.8, h: 12.9 },
      { kind: 'stone', x: 6.1, y: 22.3, label: 'Drag to change the order.' },
    ],
  },
  'notices-list': {
    src: '/guide-shots/notices-list.webp',
    alt: 'Content with Race notices open. With no notice up yet, the list explains what notices are for and offers to write the first one.',
    width: 991,
    height: 460,
    marks: [
      { kind: 'ring', x: 1.2, y: 36.3, w: 30.1, h: 5.4 },
      { kind: 'stone', x: 2.2, y: 37.3, label: 'Every notice lives here.' },
      { kind: 'ring', x: 41.5, y: 77.9, w: 19.4, h: 9.6 },
      { kind: 'stone', x: 42.5, y: 78.9, label: 'Or use Quick update on your phone.' },
    ],
  },
  'trekker-tick': {
    src: '/guide-shots/trekker-tick.webp',
    alt: 'A sample result: where the time came from, and the Ran as a trekker switch with its explanation.',
    width: 518,
    height: 303,
    marks: [
      { kind: 'ring', x: 3, y: 61, w: 94, h: 33 },
      { kind: 'stone', x: 4, y: 62, label: 'Switch this on for an early starter.' },
    ],
  },
};
