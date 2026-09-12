import { useCallback, useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { ToolHeading } from './ToolHeading';

// =============================================================================
// CheckupTool — "what needs attention?" in plain language
// =============================================================================
// Read-only. It runs a handful of high-signal queries and reports what a race
// director would want to fix. It changes NOTHING; it points, and you fix it in
// the Studio. Ported from west-chester-preschool's HealthTool; the shape is
// theirs, every check is this race's.
//
// WHY THIS EXISTS HERE. Most of what can go wrong on this site is not a bug, it
// is a fact going stale: a date that has passed, a price the site still
// advertises, a detail nobody ever confirmed. None of that fails a build or a
// test, because none of it is wrong code. It is only visible to somebody who
// looks, and the person who would look visits twice a year.
//
// THE TREKKER CHECK IS THE ONE THAT MATTERS MOST. Trekkers take the optional
// early start and the race makes them ineligible for awards, so the site leaves
// them out of every record. RunSignUp does not tell the importer who they were,
// so from 2017 on nobody is flagged. An unflagged trekker near the front can
// take a record they were not eligible to win, and nothing else on this site
// would ever mention it.
// =============================================================================

type Severity = 'alert' | 'warn' | 'info';

interface CheckResult {
  id: string;
  severity: Severity;
  label: string;
  detail: string;
}

type Client = ReturnType<typeof useClient>;

interface Check {
  id: string;
  /** null when all is well. */
  run: (client: Client) => Promise<Omit<CheckResult, 'id'> | null>;
}

const DAY = 1000 * 60 * 60 * 24;
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

const CHECKS: Check[] = [
  {
    // The single most visible way this site can go stale. The countdown, the
    // footer band and the Google listing all read this one date.
    id: 'race-date-past',
    run: async (c) => {
      const date = await c.fetch<string | null>('*[_type == "race"][0].raceDate');
      if (!date) {
        return {
          severity: 'alert',
          label: 'No race date is set',
          detail:
            'The countdown, the footer and the search listing all read this one field. Set it in "This year’s race" → "Race day".',
        };
      }
      const when = new Date(date).getTime();
      if (Number.isNaN(when) || when > Date.now()) return null;
      const daysAgo = Math.floor((Date.now() - when) / DAY);
      return {
        severity: 'alert',
        label: `The race date passed ${plural(daysAgo, 'day')} ago`,
        detail:
          'The countdown has stopped and the "Next running" band has hidden itself. Put next year’s date in, and move the edition number up by one.',
      };
    },
  },
  {
    // Prices are the thing a runner is most likely to act on, so a stale tier
    // is worse than a stale sentence.
    id: 'fees-expired',
    // THE PRICES LIVE ON EACH DISTANCE, not on the race document. The 50K and
    // the 27K charge different money, so the ladder printed on a ticket is that
    // distance's own. This read `race.feeTiers`, which no ticket has used since
    // the ladders were added, so it was silent on prices that were genuinely
    // out of date and pointed at the wrong page when it did speak (2026-09-12).
    //
    // ONE stale tier is worth saying, not only all of them: a ladder whose
    // first step ended last January is already printing a price nobody can buy.
    run: async (c) => {
      const rows = await c.fetch<{ name?: string; feeTiers?: { endsOn?: string }[] }[]>(
        '*[_type == "distance" && !(_id in path("drafts.**"))]{ name, feeTiers[]{ endsOn } }',
      );
      const tiers = (rows ?? []).flatMap((r) => r.feeTiers ?? []);
      if (!tiers.length) return null;
      const past = tiers.filter((t) => t.endsOn && new Date(t.endsOn).getTime() < Date.now());
      if (!past.length) return null;
      const allPast = past.length === tiers.length;
      return {
        severity: 'warn',
        label: allPast
          ? 'Every entry-fee tier has an end date in the past'
          : `${plural(past.length, 'entry-fee tier')} ended in the past`,
        detail:
          'The price ladder printed on a ticket comes from that distance. Open "This year’s race" → "Distances", check the 50K and the 27K, and make the dates and prices match what RunSignUp is charging.',
      };
    },
  },
  {
    // The confirmed flag is the site's honesty mechanism; this is the nudge to
    // actually resolve it rather than leaving the marker up forever.
    id: 'unconfirmed',
    run: async (c) => {
      const n = await c.fetch<number>(
        'count(*[_type in ["race", "scheduleItem", "courseFeature", "distance"] && confirmed != true && !(_id in path("drafts.**"))])',
      );
      if (!n) return null;
      return {
        severity: 'warn',
        label: `${plural(n, 'item')} still marked "Not confirmed"`,
        detail:
          'Each one prints a small "Not confirmed" marker on the website. Read it, correct it if it is wrong, then tick "Confirmed by the race director". See the Help guide of the same name.',
      };
    },
  },
  {
    // Only meaningful once the race has actually happened.
    id: 'results-missing',
    run: async (c) => {
      const snap = await c.fetch<{ raceDate: string | null; latest: number | null }>(
        '{ "raceDate": *[_type == "race"][0].raceDate, "latest": math::max(*[_type == "raceResult"].year) }',
      );
      if (!snap.raceDate) return null;
      const raceTime = new Date(snap.raceDate).getTime();
      if (Number.isNaN(raceTime)) return null;
      const daysSince = Math.floor((Date.now() - raceTime) / DAY);
      if (daysSince < 3) return null; // give the timer a couple of days
      const raceYear = new Date(snap.raceDate).getUTCFullYear();
      if (snap.latest !== null && snap.latest >= raceYear) return null;
      return {
        severity: 'warn',
        label: `No ${raceYear} results on file, ${plural(daysSince, 'day')} after the race`,
        detail:
          'They normally arrive on their own within a day of the timer posting them to RunSignUp. If it has been longer than that, something in the import needs a look.',
      };
    },
  },
  {
    // See the header. This is the check that can prevent a wrong record.
    id: 'trekkers-unflagged',
    run: async (c) => {
      const latest = await c.fetch<number | null>('math::max(*[_type == "raceResult"].year)');
      if (latest === null) return null;
      const flagged = await c.fetch<number>(
        'count(*[_type == "raceResult" && year == $year && trekker == true])',
        { year: latest },
      );
      if (flagged > 0) return null;
      const total = await c.fetch<number>('count(*[_type == "raceResult" && year == $year])', {
        year: latest,
      });
      if (!total) return null;
      return {
        severity: 'warn',
        label: `No trekkers are marked in the ${latest} results`,
        detail:
          'Trekkers take the early start and cannot win an award, and the site leaves them out of every record. RunSignUp does not say who they were, so somebody has to tick the box. If any early starter finished near the front, open their result and tick "Ran as a trekker" or they can take a record they were not eligible to win.',
      };
    },
  },
  {
    id: 'missing-alt',
    run: async (c) => {
      // Only the page-builder images: a decorative sponsor mark is allowed an
      // empty alt, because the sponsor's name is rendered beside it.
      const n = await c.fetch<number>(
        'count(*[defined(pageBuilder) && !(_id in path("drafts.**"))].pageBuilder[defined(image.asset) && !defined(image.alt)])',
      );
      if (!n) return null;
      return {
        severity: 'warn',
        label: `${plural(n, 'photograph')} with no description`,
        detail:
          'Alt text is the one line describing what is in the photo, for somebody who cannot see it. It is read aloud by screen readers and shown if the picture fails to load.',
      };
    },
  },
  {
    id: 'sponsor-no-logo',
    run: async (c) => {
      const names = await c.fetch<string[]>(
        '*[_type == "sponsor" && !defined(logo.asset) && !(_id in path("drafts.**"))].name',
      );
      if (!names?.length) return null;
      return {
        severity: 'info',
        label: `${plural(names.length, 'sponsor')} with no logo`,
        detail: `${names.filter(Boolean).join(', ')}. They show as a name-only patch, which looks deliberate rather than broken, so this is only worth fixing when you have the artwork.`,
      };
    },
  },
  {
    id: 'unpublished-drafts',
    run: async (c) => {
      const n = await c.fetch<number>('count(*[_id in path("drafts.**")])');
      if (!n) return null;
      return {
        severity: 'info',
        label: `${plural(n, 'unpublished change')}`,
        detail:
          'Someone started an edit and did not publish it. Nothing is showing on the website until it is published. Open the document and either press Publish or discard the draft.',
      };
    },
  },
  {
    // Not a fault. A standing invitation, because one GPX file unlocks it.
    id: 'elevation-synthetic',
    run: async (c) => {
      const has = await c.fetch<boolean>(
        'defined(*[_type == "race"][0].elevationProfile.points[0])',
      );
      if (has) return null;
      return {
        severity: 'info',
        label: 'The elevation chart is illustrative, not surveyed',
        detail:
          'It is drawn from the loop structure and says so on the page. One GPS file from any finisher’s watch turns it into a real measured profile, and a download no other race around here offers.',
      };
    },
  },
];

const SEV: Record<Severity, { tone: 'critical' | 'caution' | 'primary'; text: string }> = {
  alert: { tone: 'critical', text: 'Needs doing' },
  warn: { tone: 'caution', text: 'Worth a look' },
  info: { tone: 'primary', text: 'For information' },
};
const RANK: Record<Severity, number> = { alert: 0, warn: 1, info: 2 };

export function CheckupTool() {
  const client = useClient({ apiVersion: '2026-05-01' });
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  const runAll = useCallback(async () => {
    setBusy(true);
    try {
      const found: CheckResult[] = [];
      for (const check of CHECKS) {
        try {
          const r = await check.run(client);
          if (r) found.push({ id: check.id, ...r });
        } catch {
          // One failing check must not take the whole report down: a report
          // that half-runs is still useful, a blank screen is not.
        }
      }
      found.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
      setResults(found);
    } finally {
      setBusy(false);
    }
  }, [client]);

  useEffect(() => {
    // Kick off after the effect body so React does not see a setState inside
    // the effect itself, and drop it if the pane closes first.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void runAll();
    });
    return () => {
      cancelled = true;
    };
  }, [runAll]);

  return (
    <Box padding={4}>
      <Stack space={5} style={{ maxWidth: 640, margin: '0 auto' }}>
        <Stack space={3}>
          <ToolHeading emoji="🩺">Checkup</ToolHeading>
          <Text size={2} muted style={{ lineHeight: 1.5 }}>
            A look for things worth fixing: a date that has passed, prices that are last
            year&rsquo;s, details nobody has confirmed, and results that should have arrived by now.
            Nothing is changed here. It only points.
          </Text>
        </Stack>

        <Flex>
          <Button
            text={busy ? 'Checking...' : 'Check again'}
            mode="ghost"
            disabled={busy}
            onClick={() => void runAll()}
          />
        </Flex>

        {results === null ? (
          <Flex align="center" gap={2}>
            <Spinner muted />
            <Text size={1} muted>
              Checking...
            </Text>
          </Flex>
        ) : results.length === 0 ? (
          <Card padding={4} radius={3} tone="positive" border>
            <Flex align="center" gap={3}>
              <Badge tone="positive" padding={2} fontSize={1}>
                All clear
              </Badge>
              <Text size={2}>Nothing needs attention right now.</Text>
            </Flex>
          </Card>
        ) : (
          <Stack space={3}>
            {results.map((r) => {
              const b = SEV[r.severity];
              return (
                <Card key={r.id} padding={4} radius={3} border tone={b.tone}>
                  <Stack space={3}>
                    <Flex align="center" gap={3}>
                      <Badge tone={b.tone} padding={2} fontSize={1}>
                        {b.text}
                      </Badge>
                      <Text size={2} weight="semibold">
                        {r.label}
                      </Text>
                    </Flex>
                    <Text size={1} muted style={{ lineHeight: 1.5 }}>
                      {r.detail}
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
