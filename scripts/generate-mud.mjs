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
        H: 1087, // 1440x978 measured, kept in proportion
        density: 1,
        split: true,
        quiet: [
          [0.44, 0.03, 0.74, 0.1], // the nav links
          [0, 0.35, 0.55, 0.41], // the hero eyebrow
          [0, 0.61, 0.55, 0.85], // the subhead and the buttons
          [0.52, 0.74, 1, 0.8], // the countdown's label
        ],
      },
      {
        // RE-SHAPED AND RE-SEEDED 2026-09-13. Two faults, one cause and one
        // choice. The canvas was baked for a 390x1033 band and the band is
        // 390x1298: the layer is `cover`ed, so the art was being scaled up 34%
        // and cropped, which is what "sparse on mobile" actually was. Fewer,
        // bigger blobs rather than the field the desktop gets. It is baked at
        // the band's own aspect now (760x2530 = 390x1298), so a mark lands at
        // the size it was drawn.
        //
        // And the density was 0.5 against the desktop's 1. That was set when
        // the countdown's LABEL sat on the band, 12px over the mud, where axe
        // blends the layers into a veil and measured it at 2.68:1. The label
        // moved onto the clock's own plate on 2026-09-12 and the mud cannot
        // reach it there, so the reason for halving this is gone.
        suffix: 'phone',
        W: 760,
        H: 2530, // 390x1298 measured 2026-09-13
        density: 1.2,
        // `big` IS THE KNOB THAT MATTERED, not density. Mark size comes from
        // `Math.min(W, H) / 933`, so on a 760x2530 canvas it is driven by the
        // WIDTH, and that canvas is then shown at 390px against the desktop's
        // 1600 shown at 1440. Multiply the two and a phone mark renders about
        // two and a half times smaller than the same mark on a desktop: the
        // field read as fine speckle rather than as mud. Doubling the count
        // instead only took ink coverage from 4.0% to 5.4%, because more small
        // marks mostly overlap each other.
        big: 2.1,
        split: false,
        // Fractions of the band, measured rather than guessed. Only the two
        // runs of small copy are quieted: the wordmark is display type that
        // reads through anything (the desktop does not quiet it either), the
        // photograph is meant to have mud across it, and the clock is an opaque
        // plate that hides whatever lands behind it.
        quiet: [
          [0, 0.02, 1, 0.055], // the hero eyebrow
          [0, 0.655, 1, 0.83], // the subhead and the two buttons
        ],
      },
    ],
  },
  {
    // The race director band.
    //
    // THIS FIELD WAS TOO BIG AND TOO SPARSE. The marks were drawn enormous on
    // the theory that a field behind a PERSON should read as ground rather than
    // compete with him. In practice a handful of huge blobs reads as neither:
    // too few to be a surface, too large to be a footprint. Smaller marks, more
    // of them, and it becomes ground again.
    name: 'director',
    shapes: [
      {
        suffix: 'wide',
        // HALF RESOLUTION on purpose. A softer mask edge is invisible at this
        // scale, and a mask this ragged compresses badly: at full size the file
        // was 129KB for pure decoration.
        W: 880,
        H: 470, // 1440x769 measured after the height cap, kept in proportion
        density: 1.45,
        big: 0.62,
        split: false,
        quiet: [
          [0, 0.26, 0.48, 0.62], // the eyebrow, heading and body
          [0, 0.68, 0.28, 0.82], // the button
        ],
      },
      {
        suffix: 'phone',
        W: 420,
        H: 1090, // 390x1012 measured after the height cap, kept in proportion
        density: 1.1,
        big: 0.6,
        split: false,
        quiet: [
          [0, 0.5, 1, 0.79], // the eyebrow, heading and body
          [0, 0.83, 1, 0.91], // the button
        ],
      },
    ],
  },
  {
    // The marks that land IN FRONT of the race director, masked in CSS to the
    // bottom third of his photograph. Drawn at the photograph's own proportions
    // rather than the band's, because it is worn on the picture.
    //
    // NO QUIET ZONES, and that is not an oversight: nothing on this layer sits
    // over text. It is over a person, and the CSS mask is what keeps it off his
    // face.
    name: 'director-fore',
    seed: 23,
    shapes: [
      {
        suffix: 'wide',
        W: 560,
        H: 700,
        density: 0.85,
        big: 0.7,
        split: false,
        quiet: [],
      },
    ],
  },
  {
    // A WALK, NOT A THROW. The band fields above are an impact: something was
    // kicked up and landed. This one is a route: one line of prints crossing a
    // quiet band on the diagonal, and nothing else.
    //
    // WHY NOT "LOTS OF TINY PRINTS", WHICH IS THE OBVIOUS IDEA. The trail
    // generator already carries the answer in its own comment: a row of small
    // prints reads as a decorative border, a few larger ones read as somebody
    // having run through here. Tiled small prints are a pattern, and a pattern
    // behind copy is wallpaper. Sparse and mid-sized on a diagonal is what
    // reads as a trail.
    //
    // No quiet zones. It is worn at a low enough opacity to pass under copy,
    // and the route already crosses the band rather than sitting in the middle
    // of it.
    name: 'walk',
    seed: 41,
    only: 'trail',
    shapes: [
      { suffix: 'wide', W: 1000, H: 480, density: 1.1, big: 0.62, split: false, quiet: [] },
      { suffix: 'phone', W: 420, H: 760, density: 0.8, big: 0.6, split: false, quiet: [] },
    ],
  },
  {
    // THE FOOTER. Its first cut wore the contour lines plus the walk, and the
    // contours were "a bit much" (Nathan, 2026-09-12): a footer is read, not
    // looked at, and a hairline field behind small print is noise. Prints and
    // mud instead, which is what the hero opens the page with, so the page
    // closes the way it opened.
    //
    // ITS OWN SHAPE, NOT THE WALK'S. The walk is 1000x480 and the footer is
    // about 2.5:1 to 3.4:1 wide on a desktop, so `cover` cropped a third of
    // the route off the top and bottom and left three prints the size of a
    // hand. A field baked at the band's own aspect shows everything it holds
    // at the size it was drawn.
    //
    // A THROW AND A WALK, not just a walk: `only: 'all'` gives the footer the
    // hero's full field (the throw, the splat it leaves, the scatter, and the
    // route across it), which is the "more mud" half of the request. No quiet
    // zones: it is worn at an opacity that passes under copy, and the contrast
    // gate samples the pixels rather than trusting that.
    name: 'foot',
    seed: 67,
    only: 'all',
    shapes: [
      { suffix: 'wide', W: 1600, H: 560, density: 0.9, big: 0.7, split: false, quiet: [] },
      { suffix: 'phone', W: 420, H: 1100, density: 0.55, big: 0.6, split: false, quiet: [] },
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
      // Per field, so two fields worn on the same subject are not the same
      // marks at two sizes. The foreground scatter over the race director sits
      // directly on top of the background one; sharing a seed would have read
      // as a printing fault rather than as two handfuls of mud.
      seed: field.seed ?? 7,
      W: shape.W,
      H: shape.H,
      quiet: shape.quiet,
      density: shape.density,
      big: shape.big ?? 1,
      only: field.only ?? 'all',
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
