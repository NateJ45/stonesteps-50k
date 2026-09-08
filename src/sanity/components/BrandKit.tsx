import { Box, Card, Flex, Grid, Stack, Text } from '@sanity/ui';
import { ToolHeading } from './ToolHeading';

// =============================================================================
// BrandKit — the race's colours and type, for anything made outside the website
// =============================================================================
// A flyer, a Facebook post, a race-day sign. The values below are the ones the
// website actually uses, written out so they can be typed into Canva or handed
// to a printer without anyone guessing.
//
// IT USED TO BE WRONG. This file shipped with the starter and carried the
// STARTER'S palette: slate, ink, cool gray, a cool neutral scheme with nothing
// to do with this race. It was never wired into the desk, which is the only
// reason nobody was ever handed those colours as "the Stone Steps brand". Now
// it carries the real ones and it is in the menu.
//
// KEEP IN STEP WITH brand/brand.config.json. That file is the source of truth
// and `npm run apply-brand` writes it into globals.css; this panel is a
// human-readable copy of the handful of values that matter off the website.
// There is no build-time link between the two, so a rebrand means editing both.
// =============================================================================

interface Swatch {
  name: string;
  hex: string;
  note: string;
  /** Text colour to print ON this swatch, so the label stays readable. */
  ink?: string;
}

const GROUPS: { label: string; swatches: Swatch[] }[] = [
  {
    label: 'The two you will use most',
    swatches: [
      {
        name: 'Rust',
        hex: '#A83C26',
        note: 'Buttons, the ticker strip, the blaze',
        ink: '#FFEBBB',
      },
      { name: 'Cream', hex: '#FFEBBB', note: 'Card faces, text on dark', ink: '#1A1712' },
    ],
  },
  {
    label: 'Grounds',
    swatches: [
      {
        name: 'Bark',
        hex: '#1A1712',
        note: 'The dark background, and all dark text',
        ink: '#FFEBBB',
      },
      { name: 'Paper', hex: '#FBF6EA', note: 'The light background', ink: '#1A1712' },
      { name: 'Soft paper', hex: '#F4EBD6', note: 'The alternating band', ink: '#1A1712' },
    ],
  },
  {
    label: 'Accents, sparingly',
    swatches: [
      { name: 'Forest', hex: '#2E5738', note: 'The featured 50K ticket', ink: '#FED89B' },
      { name: 'Gold', hex: '#FED89B', note: 'Type on forest, and only there', ink: '#1A1712' },
      { name: 'Deep rust', hex: '#8F3323', note: 'Headings and links on light', ink: '#FFEBBB' },
      { name: 'Stone', hex: '#8A7F66', note: 'Quiet lines and rules', ink: '#1A1712' },
    ],
  },
];

const FONTS = [
  {
    role: 'Headlines',
    name: 'Staatliches',
    note: 'Free on Google Fonts. CAPITALS ONLY, one weight. The lowercase k in "50k" is the logo, not a typo.',
  },
  {
    role: 'Body text',
    name: 'Archivo',
    note: 'Free on Google Fonts. Use regular for copy and semibold for emphasis.',
  },
  {
    role: 'Numbers and labels',
    name: 'JetBrains Mono',
    note: 'The small spaced-out capitals over a heading, and any table of times.',
  },
];

function SwatchCard({ s }: { s: Swatch }) {
  return (
    <Card padding={0} radius={3} border overflow="hidden">
      <Box padding={4} style={{ background: s.hex, color: s.ink ?? '#1A1712' }}>
        <Stack space={2}>
          <Text size={2} weight="semibold" style={{ color: 'inherit' }}>
            {s.name}
          </Text>
          <Text size={1} muted={false} style={{ color: 'inherit', fontFamily: 'monospace' }}>
            {s.hex}
          </Text>
        </Stack>
      </Box>
      <Box padding={3}>
        <Text size={1} muted style={{ lineHeight: 1.4 }}>
          {s.note}
        </Text>
      </Box>
    </Card>
  );
}

export default function BrandKit() {
  return (
    <Box padding={4}>
      <Stack space={5} style={{ maxWidth: 720, margin: '0 auto' }}>
        <Stack space={3}>
          <ToolHeading emoji="🎨">Brand colours and type</ToolHeading>
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            For anything made away from the website: a flyer, a Facebook post, a sign at The Oval.
            These are the values the site itself uses, so something made with them will look like it
            belongs to the same race.
          </Text>
        </Stack>

        {GROUPS.map((g) => (
          <Stack key={g.label} space={3}>
            <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
              {g.label}
            </Text>
            <Grid columns={[1, 2, 2]} gap={3}>
              {g.swatches.map((s) => (
                <SwatchCard key={s.hex} s={s} />
              ))}
            </Grid>
          </Stack>
        ))}

        <Stack space={3}>
          <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
            Type
          </Text>
          {FONTS.map((f) => (
            <Card key={f.name} padding={4} radius={3} border>
              <Stack space={2}>
                <Flex align="baseline" gap={3}>
                  <Text size={2} weight="semibold">
                    {f.name}
                  </Text>
                  <Text size={1} muted>
                    {f.role}
                  </Text>
                </Flex>
                <Text size={1} muted style={{ lineHeight: 1.5 }}>
                  {f.note}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>

        <Card padding={4} radius={3} tone="caution" border>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Two pairings to avoid.
            </Text>
            <Text size={1} style={{ lineHeight: 1.5 }}>
              Gold on cream and cream on paper are both close to invisible. Gold belongs on forest,
              cream belongs on bark. If a combination looks washed out on your screen it will be
              worse in print.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
