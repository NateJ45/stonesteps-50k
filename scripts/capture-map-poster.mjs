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
const W = 1200;
const H = 750;
const SCALE = 2;

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
    await page.goto(`http://localhost:${PORT}/course/?poster=1`, { waitUntil: 'load' });

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
      content: `.maplibregl-control-container, .cmapbar, .cmap__ridge { display: none !important; }`,
    });
    await page.waitForTimeout(400);

    const frame = page.locator('.cmap__canvas');
    const shot = await frame.screenshot({ type: 'png' });

    // Projected in the same frame, at the same instant, by the map itself.
    const projected = await page.evaluate(() => ({
      points: window.__poster.project(),
      size: window.__poster.size(),
    }));

    // SIMPLIFY IN SCREEN SPACE, because that is where it will be looked at.
    // 972 points is what the map needs to drape a line over terrain; the poster
    // is a flat picture at one size, and points closer together than a pixel
    // are bytes on the home page that nobody can see. Douglas-Peucker at 1.2px
    // keeps every bend the eye can resolve.
    const simplify = (pts, tol) => {
      if (pts.length < 3) return pts;
      const keep = new Uint8Array(pts.length);
      keep[0] = 1;
      keep[pts.length - 1] = 1;
      const stack = [[0, pts.length - 1]];
      while (stack.length) {
        const [a, b] = stack.pop();
        let far = -1;
        let best = tol;
        const [ax, ay] = pts[a];
        const [bx, by] = pts[b];
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        for (let i = a + 1; i < b; i += 1) {
          const [px, py] = pts[i];
          const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
          if (d > best) {
            best = d;
            far = i;
          }
        }
        if (far > 0) {
          keep[far] = 1;
          stack.push([a, far]);
          stack.push([far, b]);
        }
      }
      return pts.filter((_, i) => keep[i] === 1);
    };

    // Split by lap first: simplifying across a loop boundary would cut the
    // corner between the end of one lap and the start of the next.
    const runs = [];
    for (const q of projected.points) {
      const last = runs[runs.length - 1];
      if (!last || last.loop !== q[2]) runs.push({ loop: q[2], pts: [[q[0], q[1]]] });
      else last.pts.push([q[0], q[1]]);
    }
    const beforeN = projected.points.length;
    const simplified = runs.map((r) => ({ loop: r.loop, pts: simplify(r.pts, 1.2) }));
    const afterN = simplified.reduce((n, r) => n + r.pts.length, 0);

    const [cssW, cssH] = projected.size;
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
    for (const [name, width] of [
      ['course-poster', oneX],
      ['course-poster@1_5x', 1400],
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

    // The overlay is stored in the picture's own coordinate space, so the SVG
    // can use it as a viewBox and scale with the image at any width.
    await writeFile(
      join(ROOT, 'scripts', 'data', 'course-poster.json'),
      `${JSON.stringify({
        width: cssW,
        height: cssH,
        // One run per lap, so the band draws the long loops solid and the
        // short ones dashed exactly as the map does.
        runs: simplified,
      })}\n`,
    );

    for (const name of written) {
      const { size } = await stat(join(outDir, name));
      console.log(`${name.padEnd(22)} ${(size / 1024).toFixed(0)} KB`);
    }
    console.log(`course-poster.json      ${afterN} points (from ${beforeN}) over ${cssW}x${cssH}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
