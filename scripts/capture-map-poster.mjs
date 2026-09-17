// =============================================================================
// capture-map-poster.mjs - bake the home page's still of the course map
// =============================================================================
// The home page shows a PHOTOGRAPH of the terrain map with the course drawn
// over it in SVG, rather than the map itself: MapLibre is ~250KB before a
// single tile, and the home page is the one most likely to be opened on a phone
// on bad signal. See docs/agent/course-map-sources.md.
//
// A screenshot somebody took by hand goes stale the moment the map changes and
// nobody can reproduce the camera. So it is BAKED, the same way the hero mud
// (`npm run mud`) and the OG image (`npm run og`) are baked: run the command,
// commit the output, and a re-run with no source change writes the same file.
//
// WHAT IT EMITS, and why both halves come from the same page load:
//   public/course-poster.webp    the terrain, with no route on it
//   scripts/data/course-poster.json  that same route, projected into the
//                                    picture's own pixels
// Capturing the picture in one place and computing the overlay in another is
// how an overlay ends up a few pixels off a photograph it is meant to sit on.
// Here the map projects its own route at the same instant the shutter opens, so
// the two cannot disagree.
//
// Usage:
//   npm run build && npm run map-poster
// It drives the BUILT site, because that is what readers get.
//
// A SECOND CALLER, AND WHY IT TAKES ENV RATHER THAN A SECOND SCRIPT. /course
// needs its own still of this map for the "What you are running on" band, and
// a copy of this file would be a copy of the whole waiting-for-tiles argument
// above, which is the part that is easy to get subtly wrong. So the camera,
// the frame and the destination are inputs:
//
//   POSTER_OUT=<absolute path prefix>  write <prefix>.png and nothing else.
//                                      public/course-poster* is untouched, and
//                                      so is the home band's JSON.
//   POSTER_SIZE=WxH                    the capture frame, in CSS pixels.
//   POSTER_CAMERA=z=..&p=..&b=..       the poster camera, passed through to
//                                      CourseMapLibre's poster mode.
//   POSTER_ASPECT=<w/h>                centre-crop the capture to this ratio.
//                                      The map frame picks its OWN aspect from
//                                      its breakpoints (16/9 on a wide
//                                      viewport), so a square picture has to be
//                                      cut out of a wide one rather than asked
//                                      for; the camera's zoom and dy place the
//                                      course inside the cut.
//
//   POSTER_NAME=<basename>             the public/ file stem and the JSON stem.
//                                      Defaults to `course-poster`, which is
//                                      the home band. See
//                                      scripts/capture-region-poster.mjs, the
//                                      second caller that uses this half of the
//                                      script rather than POSTER_OUT: it wants
//                                      the same ladder of widths and the same
//                                      reserved-box JSON, just under its own
//                                      name and at its own camera.
//
// With none of them set this behaves exactly as it did: the home page's band.
// POSTER_OUT writes a LOSSLESS png on purpose. Its destination is Sanity,
// which re-encodes to AVIF and WebP at half a dozen widths, and handing a
// lossy file to a lossy pipeline compounds the artefacts for no saving.
// =============================================================================

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'client');
const PORT = Number(process.env.POSTER_PORT ?? 4477);

// THE PICTURE'S SIZE IS THE PICTURE'S QUALITY. Captured at 2x for the density
// the phones that matter actually have, then written at 1x and 2x so the page
// can pick. 1200x750 is the band's widest rendered size, 8:5 because the course
// is wider than it is tall once the camera is pitched into it.
const [W, H] = (process.env.POSTER_SIZE ?? '1200x750').split('x').map(Number);
const SCALE = 2;
// An absolute path prefix, no extension. Set, it takes over the whole output
// half of this script; unset, everything below writes the home band as before.
const OUT_PREFIX = process.env.POSTER_OUT ?? '';
// The file stem for the public/ ladder and for the size JSON beside it.
const NAME = process.env.POSTER_NAME ?? 'course-poster';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** The built site, served flat. No framework, so nothing can differ from dist. */
function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        let path = join(DIST, decodeURIComponent(url.pathname));
        if (!extname(path)) path = join(path, 'index.html');
        const body = await readFile(path);
        res.writeHead(200, {
          'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  if (!existsSync(join(DIST, 'course', 'index.html'))) {
    console.error('No build found. Run `npm run build` first.');
    process.exit(1);
  }

  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: SCALE,
  });

  try {
    // TOPO IS THE DEFAULT, AND THE OWNER CHOSE IT. The satellite capture is a
    // photograph of a canopy: at the size this band renders, a continuous green
    // mass with a route over it, and the terrain it exists to show is invisible
    // under the leaves. The USGS topographic quad draws the contours, the
    // watercourses and the trail names, so the still says "this is a hilly
    // forest course" at a glance, which is the whole reason the band is there.
    // `POSTER_BASEMAP=satellite` captures the imagery instead, for comparison.
    const basemap = process.env.POSTER_BASEMAP === 'satellite' ? '' : '&basemap=topo';
    const camera = process.env.POSTER_CAMERA ? `&${process.env.POSTER_CAMERA}` : '';
    await page.goto(`http://localhost:${PORT}/course/?poster=1${basemap}${camera}`, {
      waitUntil: 'load',
    });

    // The map is a client:visible island, so it does not exist until the
    // reader (here, the script) reaches it.
    await page.locator('.cmap__frame').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__poster != null, null, { timeout: 60_000 });

    // TILES AND TERRAIN BOTH HAVE TO LAND. A screenshot taken while the DEM is
    // still arriving is a picture of a flat map, which is the one thing this
    // image exists to show is not true. There is no single event for "every
    // tile in view is decoded", so wait for the network to go quiet and then
    // give the terrain a beat to re-drape.
    await page.waitForLoadState('networkidle');
    // The poster camera jumps after load, which asks for a fresh set of tiles
    // at a zoom the first paint never requested. Wait for THAT to go quiet too,
    // or the picture is half high-resolution and half stretched.
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // The chrome belongs to the interactive map, not to a photograph of it.
    await page.addStyleTag({
      content: `.maplibregl-control-container, .cmapbar, .cmap__ridge, .cmap__status { display: none !important; }`,
    });
    await page.waitForTimeout(400);

    const frame = page.locator('.cmap__canvas');
    const shot = await frame.screenshot({ type: 'png' });

    const projected = await page.evaluate(() => ({ size: window.__poster.size() }));

    const [cssW, cssH] = projected.size;

    // THE SECOND CALLER STOPS HERE. One lossless file, no resizing, no JSON:
    // everything below this point is the home band's own ladder of widths and
    // its reserved-box measurement, and neither means anything to an image
    // that is about to be uploaded to a CDN that builds its own.
    if (OUT_PREFIX) {
      await mkdir(dirname(OUT_PREFIX), { recursive: true });
      const aspect = Number(process.env.POSTER_ASPECT ?? 0);
      let out = sharp(shot);
      if (aspect > 0) {
        const m = await sharp(shot).metadata();
        const w = Math.min(m.width, Math.round(m.height * aspect));
        const h = Math.min(m.height, Math.round(w / aspect));
        out = out.extract({
          left: Math.round((m.width - w) / 2),
          top: Math.round((m.height - h) / 2),
          width: w,
          height: h,
        });
      }
      await out.png().toFile(`${OUT_PREFIX}.png`);
      const meta2 = await sharp(`${OUT_PREFIX}.png`).metadata();
      const { size } = await stat(`${OUT_PREFIX}.png`);
      console.log(
        `${OUT_PREFIX}.png  ${meta2.width}x${meta2.height}  ${(size / 1024).toFixed(0)} KB`,
      );
      return;
    }

    const outDir = join(ROOT, 'public');
    await mkdir(outDir, { recursive: true });

    // WebP at quality 82: this is a photograph of a forest, where the eye is
    // reading shape rather than leaf detail, and the difference above 82 is
    // weight rather than picture.
    if (process.env.POSTER_KEEP_PNG) await writeFile(process.env.POSTER_KEEP_PNG, shot);
    const meta = await sharp(shot).metadata();
    const oneX = Math.round(meta.width / SCALE);
    const written = [];
    // TWO WIDTHS, NOT THREE, AND NO FULL 2x. Measured on this picture: the
    // full 1868px AVIF is 270KB and the 1400px one is 96KB, and at the size
    // this band renders nobody can tell them apart. A phone at 3x picks the
    // 1400 and pays 96KB for an image it meets below the fold.
    // The 1.5x rung is capped at the capture, because a poster captured
    // narrower than 1400 would otherwise be UPSCALED into a second, larger,
    // blurrier file. Unchanged for the home band, whose capture is 2400 wide.
    for (const [name, width] of [
      [NAME, oneX],
      [`${NAME}@1_5x`, Math.min(1400, meta.width)],
    ]) {
      // AVIF FIRST, WEBP AS THE FALLBACK. On this picture AVIF is worth about
      // half the bytes at the same quality, and the browsers that lack it are
      // the ones that get the WebP. Quality 55/70 rather than the defaults:
      // the eye reads ridges and canopy here, not leaves, and above these the
      // file grows without the picture changing.
      const base = sharp(shot).resize(width);
      // Quality 42/55: compared at 3x magnification against 55/70 and the
      // difference is leaf noise in a canopy, while the file is half the size.
      // The eye is reading ridges and the shape of the course here.
      await base
        .clone()
        .avif({ quality: 42 })
        .toFile(join(outDir, `${name}.avif`));
      await base
        .clone()
        .webp({ quality: 55 })
        .toFile(join(outDir, `${name}.webp`));
      written.push(`${name}.avif`, `${name}.webp`);
    }

    // Only the picture's own size, so the band can reserve the right box
    // before the image lands and the page below it never jumps. The route used
    // to be written here too, as coordinates for an SVG overlay; it is now in
    // the picture itself.
    await writeFile(
      join(ROOT, 'scripts', 'data', `${NAME}.json`),
      `${JSON.stringify({ width: cssW, height: cssH })}
`,
    );

    for (const name of written) {
      const { size } = await stat(join(outDir, name));
      console.log(`${name.padEnd(22)} ${(size / 1024).toFixed(0)} KB`);
    }
    console.log(`${`${NAME}.json`.padEnd(22)} ${cssW}x${cssH}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
