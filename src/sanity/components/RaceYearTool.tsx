import { useCallback, useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { ToolHeading } from './ToolHeading';
import { useStudioLink, type StudioTarget } from './studioLink';

// =============================================================================
// RaceYearTool — "Start a new race year", the rollover checklist
// =============================================================================
// Ported from west-chester-preschool's SetupWizard, which does the same job for
// a school year. Read-only: it reads the current state, works out which
// rollover jobs are already done, and gives each one a door.
//
// WHY A LIVE CHECKLIST RATHER THAN THE WRITTEN GUIDE. The Help guide has the
// same list in prose, and prose is the wrong shape for this particular job.
// This site is edited about twice a year, which is exactly long enough to
// forget where you got to. A list that already knows the date is updated and
// the prices are not is worth more than a list that asks you to remember.
// =============================================================================

type State = 'done' | 'todo' | 'check';

interface Step {
  id: string;
  title: string;
  blurb: string;
  target: StudioTarget;
  /** Given a snapshot of the dataset, is this step done? */
  state: (s: Snapshot) => State;
  /** Extra line shown under the blurb, when there is something to say. */
  note?: (s: Snapshot) => string | null;
}

interface Snapshot {
  raceDate: string | null;
  editionNumber: number | null;
  feeTiers: { label?: string; endsOn?: string }[];
  unconfirmed: number;
  sponsors: number;
  latestResultYear: number | null;
  now: number;
}

const DAY = 1000 * 60 * 60 * 24;

/** The race year the site is currently advertising, or null. */
function advertisedYear(s: Snapshot): number | null {
  if (!s.raceDate) return null;
  const t = new Date(s.raceDate);
  return Number.isNaN(t.getTime()) ? null : t.getUTCFullYear();
}

const STEPS: Step[] = [
  {
    id: 'date',
    title: 'Put in next year’s date',
    blurb:
      'One field. It moves the countdown, the "Next running" band in the footer, and the date Google shows.',
    target: { doc: 'race' },
    state: (s) => {
      if (!s.raceDate) return 'todo';
      return new Date(s.raceDate).getTime() > s.now ? 'done' : 'todo';
    },
    note: (s) => {
      if (!s.raceDate) return 'No date set.';
      const t = new Date(s.raceDate).getTime();
      if (t > s.now) {
        return `Currently ${new Date(s.raceDate).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })}.`;
      }
      return `The date on the site is ${Math.floor((s.now - t) / DAY)} days ago.`;
    },
  },
  {
    id: 'edition',
    title: 'Move the edition number up by one',
    blurb: 'The "23rd edition" figure on the home page and in the footer.',
    target: { doc: 'race' },
    // Cannot be derived, only prompted: the number is right or wrong only in
    // relation to a date a human just set.
    state: () => 'check',
    note: (s) =>
      s.editionNumber
        ? `Currently the ${s.editionNumber}th running as far as the site knows.`
        : null,
  },
  {
    id: 'fees',
    title: 'Check the entry fees',
    blurb:
      'The prices printed under the two tickets. They should match what RunSignUp is actually charging.',
    target: { doc: 'race' },
    state: (s) => {
      if (!s.feeTiers.length) return 'todo';
      const allPast = s.feeTiers.every((t) => t.endsOn && new Date(t.endsOn).getTime() < s.now);
      return allPast ? 'todo' : 'check';
    },
    note: (s) =>
      s.feeTiers.length ? `${s.feeTiers.length} price tiers on file.` : 'No prices on file.',
  },
  {
    id: 'schedule',
    title: 'Check the race-day schedule',
    blurb: 'Start times, trekker starts, and when the course closes.',
    target: { pane: 'scheduleItem' },
    state: () => 'check',
  },
  {
    id: 'unconfirmed',
    title: 'Clear the "Not confirmed" markers',
    blurb:
      'Anything the race has never published carries a small marker on the site. Confirm it or correct it.',
    target: { pane: 'checkup' },
    state: (s) => (s.unconfirmed === 0 ? 'done' : 'todo'),
    note: (s) =>
      s.unconfirmed === 0
        ? 'Nothing is unconfirmed.'
        : `${s.unconfirmed} item${s.unconfirmed === 1 ? '' : 's'} still marked not confirmed.`,
  },
  {
    id: 'sponsors',
    title: 'Update this year’s sponsors',
    blurb: 'Add whoever is in, remove whoever is out, and drag them into the order you want.',
    target: { pane: 'sponsor' },
    state: () => 'check',
    note: (s) => `${s.sponsors} sponsor${s.sponsors === 1 ? '' : 's'} on the site.`,
  },
  {
    id: 'results',
    title: 'After the race: check the results landed',
    blurb:
      'They import themselves within a day of your timer posting them. This is only a check, not a job.',
    target: { pane: 'theRace;results' },
    state: (s) => {
      const year = advertisedYear(s);
      if (!year || !s.raceDate) return 'check';
      if (new Date(s.raceDate).getTime() > s.now) return 'check'; // race not run yet
      return s.latestResultYear !== null && s.latestResultYear >= year ? 'done' : 'todo';
    },
    note: (s) =>
      s.latestResultYear ? `Latest results on file: ${s.latestResultYear}.` : 'No results on file.',
  },
  {
    id: 'trekkers',
    title: 'After the race: mark any trekkers',
    blurb:
      'Early starters cannot win an award. The importer cannot tell who they were, so they need ticking by hand.',
    target: { pane: 'theRace;results' },
    state: () => 'check',
  },
];

const BADGE: Record<State, { tone: 'positive' | 'caution' | 'primary'; text: string }> = {
  done: { tone: 'positive', text: 'Done' },
  todo: { tone: 'caution', text: 'To do' },
  check: { tone: 'primary', text: 'Worth checking' },
};

function StepCard({ step, snap }: { step: Step; snap: Snapshot }) {
  const linkTo = useStudioLink();
  const link = linkTo(step.target);
  const state = step.state(snap);
  const badge = BADGE[state];
  const note = step.note?.(snap) ?? null;
  return (
    <Card
      as="a"
      padding={4}
      radius={3}
      border
      tone={state === 'done' ? 'positive' : 'default'}
      href={link.href}
      onClick={link.onClick}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <Stack space={3}>
        <Flex align="center" gap={3}>
          <Badge tone={badge.tone} padding={2} fontSize={1}>
            {badge.text}
          </Badge>
          <Text size={2} weight="semibold" style={{ flex: 1 }}>
            {step.title}
          </Text>
        </Flex>
        <Text size={1} muted style={{ lineHeight: 1.5 }}>
          {step.blurb}
        </Text>
        {note && (
          <Text size={1} style={{ lineHeight: 1.5 }}>
            {note}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function RaceYearTool() {
  const client = useClient({ apiVersion: '2026-05-01' });
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await client.fetch<Omit<Snapshot, 'now'>>(`{
        "raceDate": *[_type == "race"][0].raceDate,
        "editionNumber": *[_type == "race"][0].editionNumber,
        "feeTiers": *[_type == "race"][0].feeTiers[]{ label, endsOn },
        "unconfirmed": count(*[_type in ["scheduleItem", "courseFeature", "distance"] && confirmed != true && !(_id in path("drafts.**"))]),
        "sponsors": count(*[_type == "sponsor" && !(_id in path("drafts.**"))]),
        "latestResultYear": math::max(*[_type == "raceResult"].year)
      }`);
      setSnap({ ...data, feeTiers: data.feeTiers ?? [], now: Date.now() });
    } finally {
      setBusy(false);
    }
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <Box padding={4}>
      <Stack space={5} style={{ maxWidth: 680, margin: '0 auto' }}>
        <Stack space={3}>
          <ToolHeading emoji="🗓️">Start a new race year</ToolHeading>
          <Text size={2} muted style={{ lineHeight: 1.5 }}>
            Everything that needs a human once a year, in the order it comes up, with whatever is
            already done ticked off. Each one is a door: click it to go straight there.
          </Text>
        </Stack>

        <Flex>
          <Button
            text={busy ? 'Checking...' : 'Check again'}
            mode="ghost"
            disabled={busy}
            onClick={() => void load()}
          />
        </Flex>

        {snap === null ? (
          <Flex align="center" gap={2}>
            <Spinner muted />
            <Text size={1} muted>
              Reading the current state...
            </Text>
          </Flex>
        ) : (
          <Stack space={3}>
            {STEPS.map((s) => (
              <StepCard key={s.id} step={s} snap={snap} />
            ))}
          </Stack>
        )}

        <Card padding={4} radius={3} tone="caution" border>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Two things are marked "Worth checking" on purpose.
            </Text>
            <Text size={1} style={{ lineHeight: 1.5 }}>
              The edition number and the prices cannot be worked out from the data: only you know
              whether the number matches the new date, and only RunSignUp knows what a runner is
              actually charged. The site will not guess at either.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
