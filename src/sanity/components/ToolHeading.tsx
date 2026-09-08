import type { ReactNode } from 'react';
import { Flex, Heading } from '@sanity/ui';

// =============================================================================
// ToolHeading — the ONE header for the custom Studio tools
// =============================================================================
// Every custom tool (Welcome, Checkup, New race year) opens the same way, so
// they read as a family and a future tool gets the look for free. Ported from
// west-chester-preschool (PORTS.md card 32), which uses the school's emblem;
// this race has no square mark small enough to sit at 40px, so the chip carries
// the tool's own emoji on the race's rust instead.
// =============================================================================

export function ToolHeading({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <Flex align="center" gap={3}>
      <span
        aria-hidden
        style={{
          background: '#f6e7e2',
          color: '#8f3323',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 12,
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {emoji}
      </span>
      <Heading size={3}>{children}</Heading>
    </Flex>
  );
}
