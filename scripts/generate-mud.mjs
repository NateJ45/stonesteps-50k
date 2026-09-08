// Foundation, edit with care
//
// Bakes the home hero's mud into alpha-mask PNGs. Run via `npm run mud`, and
// commit the output: these are real assets shipped to visitors, exactly like
// public/og-default.png.
//
// Rerun it after changing anything in scripts/lib/mud.mjs, and look at the
// result. The generator is deterministic, so a rerun with no change to that
// file rewrites byte-identical PNGs and `git status` stays clean.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildMud, layerSvg } from './lib/mud.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public/mud');

// The quiet zones, as fractions of the hero band. MEASURED off the rendered
// page rather than guessed: see the note on buildMud().
const QUIET_WIDE = [
  [0, 0.19, 0.55, 0.27], // the eyebrow
  [0, 0.51, 0.55, 0.81], // the subhead and the buttons
  [0.52, 0.67, 1, 0.75], // the countdown's label, in the right-hand column
];
const QUIET_PHONE = [
  [0, 0.06, 1, 0.1], // the eyebrow
  [0, 0.18, 1, 0.35], // the subhead
  [0, 0.78, 1, 0.85], // the countdown's label
];

// The countdown label is the one that had to be found by a failing test rather
// than by looking. It is 12px mono on the bare band, it lives in the right-hand
// column where neither of the other zones reach, and axe flagged it the moment
// two mud layers overlapped behind it. Everything else down there is an opaque
// plate or an opaque photograph, which is why nothing else needed carving out.

/**
 * Two shapes, because the layer is `slice`d to cover its band. Give a
 * 0.44-aspect phone hero the 1.7-aspect desktop art and the browser scales it
 * 2.1x and crops away four fifths of its width: magnified blobs, landing on the
 * subhead.
 *
 * Resolution is chosen for weight, not for sharpness. These are soft decorative
 * masks over a flat ground, so a little softness on a high-density screen costs
 * nothing, while doubling the pixels would cost real bytes on the phones that
 * can least afford them.
 */
const SHAPES = [
  { name: 'wide', W: 1600, H: 933, quiet: QUIET_WIDE, density: 1 },
  { name: 'phone', W: 760, H: 1716, quiet: QUIET_PHONE, density: 0.5 },
];

await mkdir(outDir, { recursive: true });

let total = 0;
for (const shape of SHAPES) {
  const { layers, W, H } = buildMud({
    seed: 7,
    W: shape.W,
    H: shape.H,
    quiet: shape.quiet,
    density: shape.density,
  });

  // The phone gets ONE combined layer as well as the separate ones, and the
  // combined file is the one the page actually wears.
  //
  // This is an ACCESSIBILITY constraint rather than a weight one. axe cannot
  // see a mask: it finds the layer elements sitting over a piece of text, reads
  // their background colours and blends them, so four stacked semi-transparent
  // layers model as a 57% veil across the whole hero. It flagged the
  // countdown's 12px label below AA on the phone, where that label sits in the
  // flow rather than off beside the photograph. One element blends once, and
  // models what the browser really paints. The phone loses the throw-by-throw
  // arrival to buy that, which is the cheaper thing to lose on a small screen.
  const emit =
    shape.name === 'phone'
      ? [{ drops: layers.flat(), name: 'phone', rough: 9 }]
      : layers.map((drops, i) => ({
          drops,
          name: `${shape.name}-${i + 1}`,
          // The trail is layer 4, and its shapes are an order of magnitude
          // bigger than a drop, so it needs more displacement to look equally
          // chewed up.
          rough: i === 3 ? 16 : 7,
        }));

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

console.log(`Mud written to public/mud/ (${(total / 1024).toFixed(1)} KB total)`);
