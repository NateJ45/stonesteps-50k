// Safe to edit by hand (the words)
// =============================================================================
// "Fetch the latest results" on Studio Home (race-only, 2026-10-28)
// =============================================================================
// The race director can pull results in from RunSignUp himself, the day a timer
// corrects a row, instead of waiting for the nightly run. The Worker route
// /api/race/results-import/ (src/pages/api/race/results-import.ts) starts
// .github/workflows/results-import.yml with the same server-side GitHub token
// the deploy-status route uses, and the Studio card
// (src/sanity/components/ResultsImportCard.tsx) shows how the last run went.
//
// This file is the pure half (the workflow target, the dispatch body and the
// refusal rule), free of Worker and React imports so results-import.test.ts can
// check it in bare Node. The run-to-state mapping is deploy-status.ts's, which
// is not about deploys in particular: the newest run of a workflow decides.
// =============================================================================

import type { DeployStatus, DeployTarget } from './deploy-status.ts';

/** The workflow the button starts. Its own concurrency group queues a second press. */
export const RESULTS_WORKFLOW = 'results-import.yml';

export const RESULTS_IMPORT_PATH = '/api/race/results-import/';

export function resultsTarget(repo: string, branch = 'main'): DeployTarget {
  return { repo, workflow: RESULTS_WORKFLOW, branch };
}

/**
 * The workflow_dispatch body. Every year (a correction can be to any year) and
 * always rebuild: the editor pressed the button to see RunSignUp's results on
 * the site, so the build must not hang on the "did anything change" check.
 */
export function resultsDispatchBody(branch = 'main') {
  return { ref: branch, inputs: { year: '', deploy_anyway: 'true' } };
}

/** How long one press holds off the next (per Worker instance). */
export const RESULTS_COOLDOWN_MS = 5 * 60 * 1000;

/** May the Studio start an import now? Null when it may, else the plain reason. */
export function resultsRefusal(
  status: DeployStatus,
  lastDispatchAt: number | null,
  now: number,
): string | null {
  if (!status.configured) return 'Fetching results from here is not set up yet.';
  if (status.state === 'running') {
    return 'The results are already being fetched. Give it a few minutes.';
  }
  if (lastDispatchAt !== null && now - lastDispatchAt < RESULTS_COOLDOWN_MS) {
    return 'The results were fetched a moment ago. Give it a few minutes.';
  }
  return null;
}
