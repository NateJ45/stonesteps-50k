import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withSlash } from './links.ts';

test('withSlash adds the trailing slash to internal page paths', () => {
  assert.equal(withSlash('/course'), '/course/');
  assert.equal(withSlash('/results/2025'), '/results/2025/');
  assert.equal(withSlash('/journal/my-post'), '/journal/my-post/');
});

test('withSlash keeps the slash before a query or hash', () => {
  assert.equal(withSlash('/results?year=2025'), '/results/?year=2025');
  assert.equal(withSlash('/services#trail'), '/services/#trail');
  assert.equal(withSlash('/services/#trail'), '/services/#trail');
});

test('withSlash leaves everything else alone', () => {
  for (const v of [
    '/',
    '/course/',
    '#top',
    'mailto:a@b.co',
    'tel:+15135550100',
    'https://example.com/x',
    '//cdn.example.com/x',
    '/sitemap-index.xml',
    '/files/rules.pdf',
    '/og/home.png',
    'contact',
    '',
  ]) {
    assert.equal(withSlash(v), v);
  }
  assert.equal(withSlash(undefined), undefined);
  assert.equal(withSlash(null), null);
});
