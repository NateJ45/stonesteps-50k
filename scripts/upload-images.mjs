// scripts/upload-images.mjs
//
// Uploads the race's photography and sponsor marks to Sanity and attaches them
// to the documents and page sections that use them.
//
// Prerequisites: PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env,
// plus seed-race.mjs and seed-pages.mjs already run.
//
// Idempotent: assets are looked up by their originalFilename before uploading,
// so re-running reuses the existing asset rather than filling the media library
// with duplicates. Sanity does deduplicate by content hash, but only if you let
// it, and a fresh upload each run still churns the document history.
//
// ALT TEXT IS WRITTEN FROM THE IMAGE CONTENT, not from the filename. Every
// entry below was described from what is actually in the picture. A filename
// makes a terrible alt text and an accessibility audit will not catch it,
// because "trail-runners-wide.jpg" is a non-empty string.

import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { loadEnv } from './lib/loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnv(root);
const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET ?? 'production';
const token = env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.log('PUBLIC_SANITY_PROJECT_ID is not set. Configure your .env and re-run.');
  process.exit(0);
}
if (!token) {
  console.log('SANITY_API_WRITE_TOKEN is not set. A write token is required to upload.');
  process.exit(0);
}

const client = createClient({ projectId, dataset, token, apiVersion: '2026-05-01', useCdn: false });

// Sourced from the race's own WordPress media library via the design mockup.
const SRC = resolve(root, '..', 'stonesteps-astro', 'public', 'img');

// Images that arrived after the mockup, checked into THIS repo. The mockup is a
// throwaway sibling and will not be around forever, so anything sourced later
// lives here and is looked up first.
const LOCAL_SRC = resolve(root, 'scripts', 'data', 'photos');

const IMAGES = {
  hero: {
    file: 'photos/trail-runners-wide.jpg',
    alt: 'Runners coming through the aid station at The Oval, the race clock overhead',
  },
  courseMap: {
    file: 'photos/course-map.jpg',
    alt: 'Cincinnati Parks trail map of Mt. Airy Forest showing the loop network',
  },
  portrait: {
    file: 'photos/runners-portrait.webp',
    alt: 'Two Stone Steps runners on course, stepping over a fallen log',
  },
  forest: {
    file: 'photos/mt-airy-forest.webp',
    alt: 'A wide dirt trail running through the hardwoods of Mt. Airy Forest',
  },
  descent: {
    file: 'photos/trail-descent.jpg',
    alt: 'Two runners descending leaf-covered single track in autumn',
  },
  lodging: {
    file: 'photos/lodging.png',
    alt: 'Map of hotels near Mt. Airy Forest, between downtown Cincinnati and the airport',
  },
  fleetFeet: { file: 'logos/fleet-feet.png', alt: 'Fleet Feet' },
  parks: { file: 'logos/cincinnati-parks.png', alt: 'Cincinnati Parks' },
  altra: { file: 'logos/altra.png', alt: 'Altra Running' },
  usatf: { file: 'logos/usatf.png', alt: 'USATF sanctioned event' },
  // From the race's own media library, already cut out against transparency,
  // which is why he can stand on the page's own ground instead of in a box.
  raceDirector: {
    file: 'photos/race-director.png',
    alt: 'David Corfman, the race director, grinning with one arm raised to show his watch',
  },
};

/** Upload once, reuse forever. Keyed on the original filename. */
async function assetFor(key) {
  const spec = IMAGES[key];
  const local = resolve(LOCAL_SRC, basename(spec.file));
  const path = existsSync(local) ? local : resolve(SRC, spec.file);
  if (!existsSync(path)) {
    console.warn(`  ! missing source file: ${spec.file}`);
    return null;
  }
  const filename = basename(spec.file);

  const existing = await client.fetch(
    '*[_type == "sanity.imageAsset" && originalFilename == $f][0]._id',
    {
      f: filename,
    },
  );
  if (existing) {
    console.log(`  = ${filename} (already uploaded)`);
    return existing;
  }

  const asset = await client.assets.upload('image', readFileSync(path), { filename });
  console.log(`  + ${filename}`);
  return asset._id;
}

/** An image field value pointing at an uploaded asset, with its alt text. */
function imageField(assetId, alt) {
  return { _type: 'image', asset: { _type: 'reference', _ref: assetId }, alt };
}

async function main() {
  console.log(`Uploading images to ${projectId}/${dataset}\n`);

  const ids = {};
  for (const key of Object.keys(IMAGES)) ids[key] = await assetFor(key);

  console.log('\nAttaching to documents...');

  // Sponsors, in the order they are seeded.
  const sponsorLogos = [
    ['sponsor-fleet-feet', 'fleetFeet'],
    ['sponsor-cincinnati-parks', 'parks'],
    ['sponsor-altra', 'altra'],
    ['sponsor-usatf', 'usatf'],
  ];
  for (const [docId, key] of sponsorLogos) {
    if (!ids[key]) continue;
    await client
      .patch(docId)
      .set({ logo: imageField(ids[key], IMAGES[key].alt) })
      .commit();
    console.log(`  ${docId}`);
  }

  // The hero photograph. Patched by array key rather than by rewriting the
  // whole pageBuilder, so an editor's other changes to the page survive.
  const homeHero = await client.fetch('*[_id == "homePage"][0]{ pageBuilder[]{ _key, _type } }');
  const heroKey = homeHero?.pageBuilder?.find((b) => b._type === 'raceHeroSection')?._key;
  if (heroKey && ids.hero) {
    await client
      .patch('homePage')
      .set({ [`pageBuilder[_key=="${heroKey}"].image`]: imageField(ids.hero, IMAGES.hero.alt) })
      .commit();
    console.log('  homePage hero image');
  }

  // Page headers on the two builder pages.
  const headers = [
    ['page-course', 'courseMap'],
    ['page-records', 'descent'],
    ['page-contact', 'portrait'],
  ];
  for (const [docId, key] of headers) {
    if (!ids[key]) continue;
    const doc = await client.fetch('*[_id == $id][0]{ pageBuilder[]{ _key, _type } }', {
      id: docId,
    });
    const k = doc?.pageBuilder?.find((b) => b._type === 'pageHeaderSection')?._key;
    if (!k) continue;
    await client
      .patch(docId)
      .set({ [`pageBuilder[_key=="${k}"].image`]: imageField(ids[key], IMAGES[key].alt) })
      .commit();
    console.log(`  ${docId} header image`);
  }

  // The parks band's forest photograph.
  const home = await client.fetch('*[_id == "homePage"][0]{ pageBuilder[]{ _key, _type } }');
  const parksKey = home?.pageBuilder?.find((b) => b._type === 'parksSection')?._key;
  if (parksKey && ids.forest) {
    await client
      .patch('homePage')
      .set({
        [`pageBuilder[_key=="${parksKey}"].image`]: imageField(ids.forest, IMAGES.forest.alt),
      })
      .commit();
    console.log('  homePage parks image');
  }

  // The sticky terrain photograph on the home course band. trail-descent was
  // uploaded from the start and sat unused until the sticky layout existed.
  const homeFeat = await client.fetch('*[_id == "homePage"][0]{ pageBuilder[]{ _key, _type } }');
  const featKey = homeFeat?.pageBuilder?.find((b) => b._type === 'courseFeaturesSection')?._key;
  if (featKey && ids.descent) {
    await client
      .patch('homePage')
      .set({
        [`pageBuilder[_key=="${featKey}"].image`]: imageField(ids.descent, IMAGES.descent.alt),
      })
      .commit();
    console.log('  homePage course-features image');
  }

  // The lodging band on contact, and the forest band wherever an imageText
  // section is waiting for one.
  const contact = await client.fetch(
    '*[_id == "page-contact"][0]{ pageBuilder[]{ _key, _type, eyebrow } }',
  );
  const lodgingKey = contact?.pageBuilder?.find(
    (b) => b._type === 'imageTextSection' && /lodging|out of town/i.test(b.eyebrow ?? ''),
  )?._key;
  if (lodgingKey && ids.lodging) {
    await client
      .patch('page-contact')
      .set({
        [`pageBuilder[_key=="${lodgingKey}"].image`]: imageField(ids.lodging, IMAGES.lodging.alt),
      })
      .commit();
    console.log('  page-contact lodging image');
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
