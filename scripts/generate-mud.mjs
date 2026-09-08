// Foundation, edit with care
//
// Bakes the site's mud into alpha-mask PNGs. Run via `npm run mud`, and commit
// the output: these are real assets shipped to visitors, exactly like
// public/og-default.png.
//
// Rerun it after changing anything in scripts/lib/mud.mjs, and LOOK at the
// result. The generator is deterministic, so a rerun with no change to that
// file rewrites byte-identical PNGs and `git status` stays clean.
//
// ── FIELDS AND SHAPES ───────────────────────────────────────────────────────
// A FIELD is one place on the site that wears mud. A SHAPE is that field at one
// breakpoint. Both exist for the same reason: the layer is `cover`ed to the box
// it is painted into, so art drawn for a 1.57-aspect band and worn on a
// 0.40-aspect one is scaled about four times and cropped to a sliver. Every
// field is therefore drawn at roughly the proportions it will be worn at, and
// every quiet zone is a fraction of THAT box.
//
// The numbers below are MEASURED off the rendered page, never guessed.
// Re-measure after any layout change to the regions they protect.

import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildMud, layerSvg } from './lib/mud.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public/mud');

const FIELDS = [
  {
    // The hero, INCLUDING THE HEADER above it. The mud is thrown across the top
    // of the page as one event, so it runs over the sign and the nav instead of
    // stopping at a horizontal line where the header ends.
    name: 'hero',
    shapes: [
      {
        suffix: 'wide',
        W: 1600,
        H: 1018, // 1440x916 measured, kept in proportion
        density: 1,
        split: true,
        quiet: [
          [0.44, 0.04, 0.74, 0.11], // the nav links
          [0, 0.31, 0.55, 0.37], // the hero eyebrow
          [0, 0.59, 0.55, 0.83], // the subhead and the buttons
          [0.52, 0.72, 1, 0.78], // the countdown's label
        ],
      },
      {
        suffix: 'phone',
        W: 760,
        H: 1900, // 390x974 measured
        density: 0.5,
        split: false,
        quiet: [
          [0, 0.145, 1, 0.19], // the hero eyebrow
          [0, 0.25, 1, 0.42], // the subhead
          [0, 0.81, 1, 0.85], // the countdown's label
        ],
      },
    ],
  },
  {
    // THE HEADER, which wears its own mud rather than borrowing the hero's.
    //
    // The hero's layer cannot reach it: <main> carries `view-transition-name:
    // main-content`, which forms a stacking context, so any z-index inside main
    // is scoped to main, and main paints below a sticky positioned header. No
    // z-index on the mud can win that. Giving the header its own field also
    // behaves better on scroll, since the sign stays muddy instead of wiping
    // clean the moment you move.
    //
    // A 10:1 strip, so this is speckle and a couple of small hits rather than a
    // throw: an arc drawn across a band this shallow reads as a smear.
    name: 'chrome',
    shapes: [
      {
        suffix: 'wide',
        W: 1440,
        H: 135, // measured
        density: 0.5,
        big: 0.85,
        split: false,
        quiet: [[0.44, 0, 0.75, 1]], // the nav links, full height of the strip
      },
      {
        suffix: 'phone',
        W: 390,
        H: 92, // measured
        density: 0.35,
        big: 0.7,
        split: false,
        quiet: [],
      },
    ],
  },
  {
    // The race director band. Fewer marks, much bigger: this one sits behind a
    // PERSON rather than behind a headline, so it should read as the ground he
    // is standing on rather than as a second texture competing with him.
    name: 'director',
    shapes: [
      {
        suffix: 'wide',
        // HALF RESOLUTION on purpose. The marks in this field are enormous, so
        // a softer mask edge is invisible, and a mask this ragged compresses
        // badly: at full size the file was 129KB for pure decoration.
        W: 880,
        H: 716, // 1440x1172 measured, kept in proportion
        density: 0.55,
        big: 1.25,
        split: false,
        quiet: [
          [0, 0.32, 0.5, 0.55], // the eyebrow, heading and body
          [0, 0.62, 0.29, 0.71], // the button
        ],
      },
      {
        suffix: 'phone',
        W: 420,
        H: 1313, // 390x1219 measured, kept in proportion
        density: 0.4,
        big: 1.15,
        split: false,
        quiet: [
          [0, 0.54, 1, 0.8], // the eyebrow, heading and body
          [0, 0.9, 1, 0.97], // the button
        ],
      },
    ],
  },
];

await mkdir(outDir, { recursive: true });

// Anything left from a previous shape list would ship as a dead asset.
for (const f of await readdir(outDir)) {
  if (f.endsWith('.png')) await unlink(resolve(outDir, f));
}

let total = 0;
for (const field of FIELDS) {
  for (const shape of field.shapes) {
    const { layers, W, H } = buildMud({
      seed: 7,
      W: shape.W,
      H: shape.H,
      quiet: shape.quiet,
      density: shape.density,
      big: shape.big ?? 1,
    });

    // SPLIT means one file per layer, so the throws can land in sequence in the
    // browser. Unsplit means one combined file, which is what a field wears
    // when small text sits over it: axe cannot see a mask, so it reads each
    // layer element's background colour and blends them, and four stacked
    // semi-transparent layers model as a veil over the whole band. One element
    // blends once, and models what is really painted.
    const emit = shape.split
      ? layers.map((drops, i) => ({
          drops,
          name: `${field.name}-${shape.suffix}-${i + 1}`,
          // The trail is layer 4, and its shapes are an order of magnitude
          // bigger than a drop, so it needs more displacement to look equally
          // chewed up.
          rough: i === 3 ? 16 : 7,
        }))
      : [{ drops: layers.flat(), name: `${field.name}-${shape.suffix}`, rough: 9 }];

    for (const [i, { drops, name, rough }] of emit.entries()) {
      const svg = layerSvg(drops, W, H, 3 + i, rough);
      const outPath = resolve(outDir, `${name}.png`);

      // A mask only needs its alpha channel, so the art is white on transparent
      // and the PNG is written 8-bit palettised. Most of the frame is empty,
      // which is why a field this busy still compresses to a few tens of KB.
      const buf = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, palette: true, effort: 10 })
        .toBuffer();

      await writeFile(outPath, buf);
      total += buf.length;
      console.log(
        `  ${name}.png  ${String(drops.length).padStart(4)} marks  ` +
          `${(buf.length / 1024).toFixed(1)} KB`,
      );
    }
  }
}

console.log(`Mud written to public/mud/ (${(total / 1024).toFixed(1)} KB total)`);
