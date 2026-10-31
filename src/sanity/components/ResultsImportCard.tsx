// Safe to edit by hand (the words)
// =============================================================================
// Home's "Race results" card: fetch the latest results from RunSignUp now
// =============================================================================
// Race-only (2026-10-28), drawn in Home's status rail through the kit's
// homeRail slot (starter card 202, kit.config.ts). The nightly run already
// pulls results in; this is for the day a timer corrects a time or a finisher
// and the race director wants it on the site now. Pressing it starts
// results-import.yml through /api/race/results-import/ (src/lib/results-import.ts
// says how), which imports every year and rebuilds the site, about five minutes.
//
// Fails soft like the kit's own cards: no token on the Worker reads as "not set
// up here", and a failed fetch is a quiet sentence, never a blank.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { Flex, Stack, Text } from '@sanity/ui';
import { useClient } from 'sanity';
import { Panel, Quiet } from '../kit/HomeCards';
import { KitAction, KitLoading } from '../kit/ui';
import { API_VERSION, studioToken } from '../kit/shared';
import { timeAgo } from '../../lib/studio-kit';
import { signInNote } from '../../lib/studio-signin';
import { RESULTS_IMPORT_PATH } from '../../lib/results-import';
import type { DeployStatus } from '../../lib/deploy-status';

// Check every 20 seconds while a run is going, so the card says "done" without a
// reload, and once a minute otherwise.
const FAST_MS = 20 * 1000;
const SLOW_MS = 60 * 1000;

function lineFor(status: DeployStatus, now: number): string {
  if (status.state === 'running') {
    return 'Fetching the results from RunSignUp and updating the website. This takes about five minutes.';
  }
  if (status.state === 'failed') {
    return 'The last fetch did not go through. Try again, and ask Nathan if it keeps happening.';
  }
  if (status.state === 'ok' && status.at) {
    return `Last fetched ${timeAgo(status.at, now)}.`;
  }
  return 'Results come in from RunSignUp by themselves every morning.';
}

export function ResultsImportCard() {
  const client = useClient({ apiVersion: API_VERSION });
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(RESULTS_IMPORT_PATH, { cache: 'no-store' });
      setStatus(r.ok ? ((await r.json()) as DeployStatus) : null);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(
      () => void load(),
      status?.state === 'running' ? FAST_MS : SLOW_MS,
    );
    return () => window.clearInterval(id);
  }, [load, status?.state]);

  const fetchNow = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const token = studioToken(client);
      const r = await fetch(RESULTS_IMPORT_PATH, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      setNote(
        r.ok && j.ok
          ? 'On its way. The results page will show RunSignUp’s latest in about five minutes.'
          : signInNote(
              Boolean(token),
              r.status,
              j.error,
              'That did not work just now. Ask Nathan if it keeps happening.',
            ),
      );
    } catch {
      setNote('That did not work just now. Ask Nathan if it keeps happening.');
    } finally {
      setBusy(false);
      void load();
    }
  }, [client, load]);

  return (
    <ResultsImportView
      status={status}
      busy={busy}
      note={note}
      now={Date.now()}
      onFetch={() => void fetchNow()}
    />
  );
}

/** The card's look, apart from the fetching, so it can be drawn with made-up states. */
export function ResultsImportView({
  status,
  busy,
  note,
  now,
  onFetch,
}: {
  status: DeployStatus | null;
  busy: boolean;
  note: string | null;
  now: number;
  onFetch: () => void;
}) {
  const running = status?.state === 'running';
  return (
    <Panel title="Race results" meaning="times" tour="home-race-results">
      {!status ? (
        <KitLoading />
      ) : !status.configured ? (
        <Quiet>Results come in from RunSignUp by themselves every morning.</Quiet>
      ) : (
        <Stack gap={4}>
          <Text size={2} style={{ lineHeight: 1.6 }}>
            {lineFor(status, now)}
          </Text>
          {!running && (
            <Quiet>
              Has the timer corrected a time or a finisher on RunSignUp? Fetch them now instead of
              waiting for tomorrow.
            </Quiet>
          )}
          <Flex>
            <KitAction strong disabled={busy || running} onClick={onFetch}>
              {running ? 'Fetching…' : 'Fetch the latest results'}
            </KitAction>
          </Flex>
          {note && <Quiet>{note}</Quiet>}
        </Stack>
      )}
    </Panel>
  );
}
