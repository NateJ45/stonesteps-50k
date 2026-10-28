// Foundation, edit with care
// =============================================================================
// /api/race/results-import/ - fetch the latest results from RunSignUp now
// =============================================================================
// Race-only (2026-10-28), so it lives outside the kit's PORTABLE
// /api/studio/ routes. Studio Home's "Race results" card reads and presses it.
//
// GET  -> { configured, state: 'ok' | 'failed' | 'running' | 'unknown', at }
//         How the newest run of results-import.yml went. Public on purpose, as
//         deploy-status is: the repo's workflow runs are public anyway. Cached
//         for 30 seconds per Worker instance.
// POST -> { ok: true } (202) | { ok: false, error } (401 / 403 / 409 / 429 / 502)
//         Starts results-import.yml for every year with deploy_anyway, so the
//         site rebuilds when it finishes. Same origin only, a signed-in Studio
//         member only, never while a run is going, and at most once every five
//         minutes per Worker instance. The workflow's concurrency group queues
//         anything that slips past, so two presses can never race.
//
// Uses the deploy-status route's settings: GITHUB_DEPLOY_TOKEN (a fine-grained
// token on this repo, "Actions: Read and write", which covers every workflow in
// it) and GITHUB_REPO. Without them the card says it is not set up.
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  deployStatusFromRuns,
  dispatchUrl,
  githubHeaders,
  isRepoName,
  NOT_CONFIGURED,
  runsUrl,
  type DeployStatus,
  type DeployTarget,
  type WorkflowRun,
} from '@/lib/deploy-status';
import { resultsDispatchBody, resultsRefusal, resultsTarget } from '@/lib/results-import';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

interface ImportEnv {
  GITHUB_DEPLOY_TOKEN?: string;
  GITHUB_REPO?: string;
}

const CACHE_MS = 30 * 1000;

let cached: { at: number; value: DeployStatus } | null = null;
let lastDispatchAt: number | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function settings(): { token: string; target: DeployTarget } | null {
  const e = env as unknown as ImportEnv;
  if (!e.GITHUB_DEPLOY_TOKEN || !isRepoName(e.GITHUB_REPO)) return null;
  return { token: e.GITHUB_DEPLOY_TOKEN, target: resultsTarget(e.GITHUB_REPO) };
}

async function readStatus(fresh = false): Promise<DeployStatus> {
  const s = settings();
  if (!s) return NOT_CONFIGURED;
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const res = await fetch(runsUrl(s.target), { headers: githubHeaders(s.token) });
    if (!res.ok) {
      console.error(`results-import: GitHub answered ${res.status}`);
      return { configured: true, state: 'unknown', at: null };
    }
    const body = (await res.json()) as { workflow_runs?: WorkflowRun[] };
    const value = deployStatusFromRuns(body.workflow_runs);
    cached = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error(`results-import: ${err instanceof Error ? err.message : 'fetch failed'}`);
    return { configured: true, state: 'unknown', at: null };
  }
}

export const GET: APIRoute = async () => json(await readStatus());

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user)
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);

  const s = settings();
  const status = await readStatus(true);
  const refusal = resultsRefusal(status, lastDispatchAt, Date.now());
  if (refusal || !s) {
    return json({ ok: false, error: refusal ?? 'Not set up.' }, status.configured ? 429 : 409);
  }

  const res = await fetch(dispatchUrl(s.target), {
    method: 'POST',
    headers: { ...githubHeaders(s.token), 'Content-Type': 'application/json' },
    body: JSON.stringify(resultsDispatchBody(s.target.branch)),
  }).catch(() => null);
  if (!res || res.status !== 204) {
    console.error(`results-import: dispatch answered ${res?.status ?? 'nothing'}`);
    return json({ ok: false, error: 'GitHub did not take the request.' }, 502);
  }
  lastDispatchAt = Date.now();
  cached = {
    at: Date.now(),
    value: { configured: true, state: 'running', at: new Date().toISOString() },
  };
  console.log(`results-import: started by Studio user ${user.id}`);
  return json({ ok: true }, 202);
};
