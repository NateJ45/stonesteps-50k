// Foundation, edit with care
// =============================================================================
// The icon set, from one source
// =============================================================================
// public/favicon.svg is the ONLY drawing. Everything else a browser or a phone
// asks for is rendered from it here, so the mark can never drift between the
// tab, the home screen and the install prompt. Run with:
//
//     node scripts/generate-favicons.mjs        (npm run favicon)
//
// Outputs, all committed:
//   favicon.ico          16 + 32 + 48, for the legacy request every browser
//                        still makes for /favicon.ico whether it is linked or not
//   apple-touch-icon.png 180x180, iOS home screen
//   icon-192.png         Android home screen / the manifest
//   icon-512.png         install prompts and splash screens
//
// TWO THINGS WORTH KNOWING.
//
// 1. NO TRANSPARENCY ON THE TOUCH ICONS. iOS composites its own background
//    behind a transparent home-screen icon (white, usually) and then applies
//    its own corner radius, so a transparent one arrives as the mark floating
//    on white with the plate gone. These are rendered on the bark plate, filled
//    edge to edge, and iOS rounds them itself.
//
// 2. THE ICO IS PNG-IN-ICO. The format allows either a BMP bitmap or a whole
//    PNG per entry, and every browser in use has accepted PNG entries for well
//    over a decade. Writing PNGs means sharp does the resampling and this file
//    only has to assemble a 22-byte header and one 16-byte directory entry per
//    size, which is the entire encoder below.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pub = resolve(root, 'public');

const SOURCE = resolve(pub, 'favicon.svg');
// A high render density, then a downscale, so the plate's rounded corners and
// the treads' edges are antialiased from a large raster rather than drawn at
// 16px by the SVG rasteriser.
const svg = readFileSync(SOURCE);
const png = (size) =>
  sharp(svg, { density: 1024 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/**
 * Assemble a .ico from PNG buffers. `entries` is [{ size, buffer }].
 * Layout: ICONDIR (6 bytes), one ICONDIRENTRY (16 bytes) each, then the images.
 */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, buffer } of entries) {
    const e = Buffer.alloc(16);
    // 256 is stored as 0; nothing here is that big, but the rule is the rule.
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette size, 0 for truecolour
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...dir, ...entries.map((x) => x.buffer)]);
}

const icoSizes = [16, 32, 48];
const icoEntries = [];
for (const size of icoSizes) icoEntries.push({ size, buffer: await png(size) });
const ico = buildIco(icoEntries);
writeFileSync(resolve(pub, 'favicon.ico'), ico);
console.log(`favicon.ico        ${icoSizes.join(' + ')}  (${ico.length} bytes)`);

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  const buf = await png(size);
  writeFileSync(resolve(pub, name), buf);
  console.log(`${name.padEnd(19)}${size}x${size}  (${buf.length} bytes)`);
}
