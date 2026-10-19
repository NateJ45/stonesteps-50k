// The race's Quick update builders (src/lib/quick-updates.ts): each one must be a
// complete, valid notice, because the Quick update tool publishes it without the
// Studio's validation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLinkedNotice,
  buildNotice,
  buildSponsor,
  endOfDay,
  inDays,
  noticeName,
  NOTICE_STARTERS,
  rankAfter,
  RESULTS_PATH,
} from './quick-updates.ts';

describe('race notices', () => {
  it('has every required field and ends at the end of the last day', () => {
    const n = buildNotice({
      message: '  Bib pickup moves to the shelter. ',
      lastDay: '2026-10-31',
    });
    assert.equal(n._type, 'announcement');
    assert.equal(n.message, 'Bib pickup moves to the shelter.');
    assert.ok(n.internalTitle.length > 0);
    assert.equal(n.enabled, true);
    assert.equal(n.style, 'info');
    assert.equal(n.endDate, endOfDay('2026-10-31'));
    const end = new Date(n.endDate);
    assert.equal(end.getHours(), 23);
    assert.equal(end.getMinutes(), 59);
    assert.equal(n.link, undefined);
  });

  it('a link becomes the notice link; the style can be urgent', () => {
    const n = buildNotice(
      { message: 'Start delayed', lastDay: '2026-10-31', link: 'https://x.org/a' },
      'urgent',
    );
    assert.deepEqual(n.link, { label: 'More details', url: 'https://x.org/a' });
    assert.equal(n.style, 'urgent');
  });

  it('keeps the message inside the notice limit the schema sets (160)', () => {
    const n = buildNotice({ message: 'x'.repeat(160), lastDay: '2026-10-31' });
    assert.ok(n.message.length <= 160);
  });

  it('the Studio name is short and dated', () => {
    assert.equal(noticeName('Parking', '2026-10-31'), 'Parking (until 2026-10-31)');
    assert.ok(noticeName('x'.repeat(100), '2026-10-31').length < 70);
  });
});

describe('inDays', () => {
  it('counts calendar days, across a month end', () => {
    assert.equal(inDays(new Date(2026, 9, 28, 15, 0), 7), '2026-11-04');
    assert.equal(inDays(new Date(2026, 9, 31, 1, 0), 0), '2026-10-31');
  });
});

describe('the season notices and the sponsor (studio-complete)', () => {
  it('a linked notice carries its own link words', () => {
    const n = buildLinkedNotice({
      message: NOTICE_STARTERS.results,
      lastDay: '2026-11-15',
      url: RESULTS_PATH,
      label: 'See the results',
    });
    assert.equal(n._type, 'announcement');
    assert.equal(n.style, 'info');
    assert.deepEqual(n.link, { label: 'See the results', url: '/results/' });
  });

  it('no link means no link object', () => {
    const n = buildLinkedNotice({ message: 'x', lastDay: '2026-11-15', label: 'Register' });
    assert.equal(n.link, undefined);
  });

  it('every starter fits the notice limit (160) and has no em-dash', () => {
    for (const s of Object.values(NOTICE_STARTERS)) {
      assert.ok(s.length <= 160, s);
      assert.ok(!s.includes('—'), s);
    }
  });

  it('a new sponsor goes to the end of the list with a valid rank', () => {
    assert.equal(rankAfter(undefined), '0|hzzzzz:');
    assert.equal(rankAfter('0|i0000f:'), '0|i0000f:i');
    assert.ok(rankAfter('0|i0000f:') > '0|i0000f:');
    assert.ok(rankAfter('0|i0000f:x') > '0|i0000f:x');
    const s = buildSponsor({ name: '  Trail Shop  ', url: 'https://example.org' }, '0|i0000f:');
    assert.deepEqual(s, {
      _type: 'sponsor',
      name: 'Trail Shop',
      orderRank: '0|i0000f:i',
      url: 'https://example.org',
    });
    assert.equal(buildSponsor({ name: 'A' }).url, undefined);
  });
});
