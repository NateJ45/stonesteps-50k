// StudioLogo.tsx — wordmark in the top-left of the Studio header.
//
// It said "Studio Starter" until 2026-09-07, inherited from the repo this was
// forked from, so the race director signed in to somebody else's product name.
// Safe to edit by hand.

import React from 'react';

export default function StudioLogo() {
  return (
    <span
      style={{
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.875rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.4em',
      }}
    >
      Stone Steps
      {/* The lowercase k is the race's own mark. Uppercasing it here would be a
          different logo, and the site goes to some trouble to preserve it. */}
      <span style={{ opacity: 0.75, letterSpacing: '0.12em', fontSize: '0.8em' }}>50k · 27k</span>
    </span>
  );
}
