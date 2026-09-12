import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReservedSlug, RESERVED_SLUGS } from './reservedSlugs.ts';

test('isReservedSlug returns true for every known reserved slug', () => {
  for (const slug of RESERVED_SLUGS) {
    assert.equal(isReservedSlug(slug), true, `expected ${slug} to be reserved`);
  }
});

test('isReservedSlug returns false for a custom slug', () => {
  assert.equal(isReservedSlug('studio-tour'), false);
  assert.equal(isReservedSlug('my-portfolio'), false);
  assert.equal(isReservedSlug('team'), false);
});

test('isReservedSlug returns false for null and undefined', () => {
  assert.equal(isReservedSlug(null), false);
  assert.equal(isReservedSlug(undefined), false);
});

test('isReservedSlug is case-sensitive (slugs are lowercase by schema rule)', () => {
  assert.equal(isReservedSlug('About'), false);
  assert.equal(isReservedSlug('ABOUT'), false);
});

// ── This site's own truth (2026-09-12) ───────────────────────────────────
// The course, the records and the contact page are `page` DOCUMENTS at
// /course, /records and /contact, so those addresses have to stay free.
// src/sanity/schemaTypes/page.ts kept a second copy of this list, never
// trimmed from the starter, which reserved "contact": the Contact page failed
// validation with "already used by a built-in page" and could not be
// published. Two lists kept in sync by hand are two lists.

test("the addresses this site's page documents use are not reserved", () => {
  for (const slug of ['course', 'records', 'contact']) {
    assert.equal(isReservedSlug(slug), false, `${slug} is a page document here`);
  }
});

test('the routes the site really mounts are reserved', () => {
  for (const slug of ['results', 'runners', 'studio', 'preview', 'api', '404']) {
    assert.equal(isReservedSlug(slug), true, `${slug} is a real route`);
  }
});

test('the page schema imports this list instead of keeping its own', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('src/sanity/schemaTypes/page.ts', 'utf8');
  assert.match(src, /import \{ RESERVED_SLUGS \} from '\.\.\/\.\.\/lib\/reservedSlugs'/);
  assert.doesNotMatch(
    src,
    /const RESERVED_SLUGS\s*=\s*new Set/,
    'page.ts has grown its own reserved list again; there must be exactly one, in src/lib',
  );
});
