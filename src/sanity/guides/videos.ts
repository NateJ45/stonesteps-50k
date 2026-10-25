// Safe to edit by hand
// =============================================================================
// This site's "Watch how it is done" clips (PORTS.md card 137)
// =============================================================================
// A guide asks for a clip by KEY, as its `video` ('post-a-notice') or as a
// block in its body ({ kind: 'video', key: 'post-a-notice' }), and this file
// says where that clip's files are. The files live in public/guide-videos/ and
// are made by the recorder:
//
//     node tools/tutorial-videos/record.mjs tools/tutorial-videos/scripts/<slug>.json
//
// which prints the entry to paste below. A key with no entry plays nothing
// (the Watch button and the row hide themselves), so a guide never shows a
// broken player. src/lib/guide-videos.test.ts checks every entry (files
// present, a poster and captions, no em-dashes).
//
// Shape of an entry: GuideVideoData in src/lib/guide-videos.ts.
// =============================================================================

import type { GuideVideoData } from '../../lib/guide-videos.ts';

export const GUIDE_VIDEOS: Record<string, GuideVideoData> = {
  // 'post-a-notice': {
  //   title: 'Put up a notice',
  //   src: '/guide-videos/post-a-notice.mp4',
  //   webm: '/guide-videos/post-a-notice.webm',
  //   poster: '/guide-videos/post-a-notice.jpg',
  //   captions: '/guide-videos/post-a-notice.vtt',
  //   duration: 48,
  //   width: 1280,
  //   height: 800,
  // },
  // Recorded 2026-10-19 on the kit harness with sample text (race-week-notice.json).
  'race-week-notice': {
    title: 'Put up a race-week notice from your phone',
    src: '/guide-videos/race-week-notice.mp4',
    webm: '/guide-videos/race-week-notice.webm',
    poster: '/guide-videos/race-week-notice.jpg',
    captions: '/guide-videos/race-week-notice.vtt',
    duration: 20,
    width: 390,
    height: 844,
  },
  // Recorded 2026-10-20 on the kit harness with sample text (urgent-change.json).
  'urgent-change': {
    title: 'Put up an urgent change on race day',
    src: '/guide-videos/urgent-change.mp4',
    webm: '/guide-videos/urgent-change.webm',
    poster: '/guide-videos/urgent-change.jpg',
    captions: '/guide-videos/urgent-change.vtt',
    duration: 17,
    width: 390,
    height: 844,
  },
};
