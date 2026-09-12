import { useCallback, useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { ToolHeading } from './ToolHeading';
import { useStudioLink } from './studioLink';
// The rules themselves are pure and live in src/lib, where the unit tests can
// reach them. See the header of that file.
import { STEPS, type Snapshot, type State, type Step } from '@/lib/raceYearSteps';

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
        "raceConfirmed": *[_type == "race"][0].confirmed,
        "distances": *[_type == "distance" && !(_id in path("drafts.**"))]{
          name, entryCap, runSignUpEventId, feeTiers[]{ label, endsOn, price }
        },
        "unconfirmed": count(*[_type in ["race", "scheduleItem", "courseFeature", "distance"] && confirmed != true && !(_id in path("drafts.**"))]),
        "sponsors": count(*[_type == "sponsor" && !(_id in path("drafts.**"))]),
        "latestResultYear": math::max(*[_type == "raceResult"].year)
      }`);
      setSnap({ ...data, distances: data.distances ?? [], now: Date.now() });
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
