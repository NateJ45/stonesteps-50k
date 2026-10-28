import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESULTS_COOLDOWN_MS,
  resultsDispatchBody,
  resultsRefusal,
  resultsTarget,
} from './results-import.ts';

const ok = { configured: true, state: 'ok', at: null } as const;

test('targets the results workflow on main', () => {
  assert.deepEqual(resultsTarget('NateJ45/stonesteps-50k'), {
    repo: 'NateJ45/stonesteps-50k',
    workflow: 'results-import.yml',
    branch: 'main',
  });
});

test('imports every year and always rebuilds', () => {
  assert.deepEqual(resultsDispatchBody(), {
    ref: 'main',
    inputs: { year: '', deploy_anyway: 'true' },
  });
});

test('refuses while unconfigured, running, or inside the cooldown', () => {
  const now = 10 * RESULTS_COOLDOWN_MS;
  assert.equal(resultsRefusal(ok, null, now), null);
  assert.equal(resultsRefusal(ok, now - RESULTS_COOLDOWN_MS, now), null);
  assert.match(resultsRefusal({ ...ok, configured: false }, null, now) ?? '', /not set up/);
  assert.match(resultsRefusal({ ...ok, state: 'running' }, null, now) ?? '', /already/);
  assert.match(resultsRefusal(ok, now - 1000, now) ?? '', /a moment ago/);
});
