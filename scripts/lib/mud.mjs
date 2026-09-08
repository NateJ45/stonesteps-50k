// Foundation, edit with care
//
// The mud generator. Produces the SVG that `scripts/generate-mud.mjs` bakes
// into the mask PNGs the home hero wears. Not shipped to the browser.
//
// WHY THIS IS BAKED RATHER THAN LIVE. The first version of this drew the field
// as ~900 inline SVG elements in the hero. That put roughly 43KB gzipped of
// markup on the critical path, gave the browser 900 nodes to style and paint
// above the fold, and still looked generated, because a spatter made of plain
// ellipses always does. Baking fixes all three at once:
//
//   - the field becomes ONE cached image request instead of document bytes,
//   - the hero carries a handful of nodes instead of nine hundred,
//   - and the shapes can go through feTurbulence + feDisplacementMap for real
//     ragged edges, a filter far too expensive to run live on this many
//     elements and completely free once it is baked into a pixel.
//
// WHY MASKS RATHER THAN PICTURES. Each layer is exported as an alpha mask, not
// as coloured art, so the page paints it with `background: currentcolor`
// through `mask-image`. One file is therefore bark on the cream theme and cream
// on the bark theme, with no second asset and no way for the two to drift.
//
// The output is deterministic: same seed, same mud, so a visual-regression
// baseline never sees it move.

/** Small deterministic PRNG. The same one the topo generator uses. */
export function rng(s) {
  let t = s + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a mud field for a band of the given shape.
 *
 * `quiet` is the list of boxes the SMALL COPY occupies, each [x0,y0,x1,y1] as a
 * fraction of the band. Marks thin into them and stop in their cores.
 *
 * THE ZONES PROTECT THE SMALL COPY, NOT THE HEADLINE, and the gap between them
 * is the point. Measured off the rendered hero: the eyebrow sits at 0.22 to
 * 0.24 of the band and the subhead and buttons at 0.54 to 0.78, with the
 * HEADLINE in between. The headline is display type in near-black and needs
 * 3:1, so mud is welcome to fly straight through it. The small copy needs
 * 4.5:1 and is kept clean.
 *
 * The feather is deliberately tight for the same reason. At 120 units the two
 * zones met in the middle, swallowed the whole headline band, and the field
 * rendered as a few stray specks: the marks had nowhere legal to be.
 */
export function buildMud({ seed = 7, W = 1600, H = 933, quiet = [], density = 1, big = 1 } = {}) {
  const rand = rng(seed);
  const zones = quiet.map((r) => ({ x0: r[0] * W, y0: r[1] * H, x1: r[2] * W, y1: r[3] * H }));

  // The size unit, so a mark is the same size on screen whatever shape the band
  // is. Without it a narrow phone band scales its marks up to fill the width.
  // `big` scales every mark without changing where anything lands, so a field
  // can be the same composition at a different weight. The director band uses
  // it: fewer marks, much larger, because it sits behind a person rather than
  // behind a headline.
  const S = (Math.min(W, H) / 933) * big;
  const pad = 60 * S;
  const n = (count) => Math.max(1, Math.round(count * density));

  function allowance(x, y) {
    let worst = 1;
    for (const q of zones) {
      const dx = Math.max(q.x0 - x, x - q.x1, 0);
      const dy = Math.max(q.y0 - y, y - q.y1, 0);
      const d = Math.hypot(dx, dy);
      const a = d >= pad ? 1 : Math.max(0, d / pad) ** 1.4;
      if (a < worst) worst = a;
    }
    return worst;
  }

  const drops = [];
  const push = (x, y, rx, ry, a, o) => {
    if (o <= 0.03) return;
    if (x < -40 * S || x > W + 40 * S || y < -40 * S || y > H + 40 * S) return;
    drops.push({
      x: Math.round(x),
      y: Math.round(y),
      rx: +Math.max(0.6, rx).toFixed(1),
      ry: +Math.max(0.5, ry).toFixed(1),
      a: Math.round(a),
      o: +o.toFixed(2),
    });
  };
  /** A rounded rectangle, rotated about its own centre. Used for shoe lugs. */
  const pushRect = (x, y, w, h, a, o) => {
    if (o <= 0.03) return;
    drops.push({
      rect: true,
      x: +x.toFixed(1),
      y: +y.toFixed(1),
      w: +w.toFixed(1),
      h: +h.toFixed(1),
      a: Math.round(a),
      o: +o.toFixed(2),
    });
  };

  /** One throw: drops along an arc, dense and fat at the foot, thin at the end. */
  function throwMud(ox, oy, dir, reach, count, fat) {
    const rad = (dir * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const t = Math.pow(rand(), 1.5);
      const along = t * reach;
      const lift = -Math.sin(t * Math.PI * 0.72) * reach * 0.34;
      const off = (rand() - 0.5) * (18 * S + t * reach * 0.34);
      const x = ox + Math.cos(rad) * along - Math.sin(rad) * (lift + off);
      const y = oy + Math.sin(rad) * along + Math.cos(rad) * (lift + off);
      const keep = allowance(x, y);
      if (keep <= 0.03) continue;

      // Heavy tail: most drops are specks, a few are fat, which is what stops
      // the whole field averaging out into a smudge.
      const heavy = Math.pow(rand(), 2.3);
      const size = (0.6 * S + (1.4 * S + fat * (1 - t)) * heavy) * (0.85 + keep * 0.15);
      const streak = rand() > 0.9 && t > 0.3 ? 2.5 : 1;
      const stretch = (1 + t * 2 + heavy * 0.6) * streak;
      push(
        x,
        y,
        size * Math.sqrt(stretch),
        size / Math.sqrt(stretch),
        dir + (rand() - 0.5) * 26,
        (0.98 - t * 0.5) * keep,
      );
    }
  }

  /**
   * An impact splat: a blob where something landed, with fingers running out of
   * it. This is the mark that reads unmistakably as MUD rather than as texture,
   * because a thrown arc on its own can look like a smudge and a splat cannot.
   */
  function splat(cx, cy, r, fingers) {
    if (allowance(cx, cy) <= 0.05) return;
    // The body: overlapping ellipses, so the edge is irregular. A single circle
    // reads as a dot.
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * r * 0.45;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const rr = r * (0.5 + rand() * 0.45);
      push(x, y, rr * (0.85 + rand() * 0.4), rr, rand() * 180, 0.95 * allowance(x, y));
    }
    // The fingers: runs of drops shrinking outward, which is what liquid does
    // when it hits something and keeps going.
    for (let f = 0; f < fingers; f++) {
      const a = rand() * Math.PI * 2;
      const reach = r * (1.5 + rand() * 3.4);
      const steps = 3 + Math.floor(rand() * 5);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const d = r * 0.6 + t * reach;
        const x = cx + Math.cos(a) * d + (rand() - 0.5) * r * 0.5;
        const y = cy + Math.sin(a) * d + (rand() - 0.5) * r * 0.5;
        const size = r * 0.42 * (1 - t * 0.78) * (0.6 + rand() * 0.7);
        push(
          x,
          y,
          size * 1.7,
          size,
          (a * 180) / Math.PI + (rand() - 0.5) * 30,
          (0.9 - t * 0.4) * allowance(x, y),
        );
      }
    }
  }

  /**
   * A trail of prints walking across the band.
   *
   * A print is LUG MARKS, not a sole outline. A shoe pressed into mud leaves
   * the pattern that touched the ground, which is the lugs, and drawing the
   * outline instead is what makes a print read as clip art.
   */
  function trail(count) {
    // y, xs, width, height.
    //
    // A WIDE FOREFOOT, A GAP, THEN A NARROW HEEL. The gap is what makes this
    // read as a shoe: a uniform grid of lugs is a tyre. Nothing is drawn at the
    // arch because on a real print nothing touches there.
    const rows = [
      [-27, [-7, 0, 7], 6.5, 4.6],
      [-20, [-9, -2, 5, 9], 6, 4.6],
      [-13, [-9, -2, 5, 9], 6, 4.8],
      [-6, [-8, -1, 6], 6.5, 4.6],
      // (the arch: deliberately empty)
      [10, [-5, 3], 6.5, 5.2],
      [18, [-4, 2], 6, 5],
    ];
    // The line taken, as a quadratic through three points: in at the bottom
    // left, up through the OPEN CORRIDOR between the eyebrow and the subhead,
    // and out at the top right. Routing matters more than it sounds: the first
    // version ran a shallow arc across the bottom, which is exactly where the
    // copy lives, so the quiet zones culled all but three prints and the trail
    // read as two stray marks.
    const P0 = [0.03 * W, 0.97 * H];
    const P1 = [0.35 * W, 0.36 * H];
    const P2 = [1.0 * W, 0.06 * H];
    const at = (u) => [
      (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0],
      (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1],
    ];

    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const [cx0, cy0] = at(t);
      // The tangent, so a print points the way the runner was going rather than
      // at some angle that happens to look right in one place.
      const [ax, ay] = at(Math.min(1, t + 0.02));
      const heading = (Math.atan2(ay - cy0, ax - cx0) * 180) / Math.PI;
      const flip = i % 2 === 0 ? 1 : -1;
      // Feet land either side of the line, and toe out a little.
      const side = 0.055 * Math.min(W, H) * flip;
      const nrm = ((heading + 90) * Math.PI) / 180;
      const px = cx0 + Math.cos(nrm) * side + (rand() - 0.5) * 20 * S;
      const py = cy0 + Math.sin(nrm) * side + (rand() - 0.5) * 20 * S;
      // The print's own zero points up the page, so square it to the heading.
      const rot = heading + 90 + flip * 7;
      const scale = (4.4 - t * 0.9) * S;
      // Later prints carry less mud, and the trail thins near the copy.
      const o = (0.92 - t * 0.34) * allowance(px, py);
      if (o <= 0.04) continue;

      const rad = (rot * Math.PI) / 180;
      for (const [ly, xs, lw, lh] of rows) {
        for (const lx of xs) {
          const ox = lx * flip * scale;
          const oy = ly * scale;
          pushRect(
            px + ox * Math.cos(rad) - oy * Math.sin(rad),
            py + ox * Math.sin(rad) + oy * Math.cos(rad),
            lw * scale,
            lh * scale,
            rot,
            o,
          );
        }
      }
    }
  }

  /** Fine speckle over the whole band: what ties the throws into one dirty field. */
  function speckle(count) {
    for (let i = 0; i < count; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const s = (0.7 + Math.pow(rand(), 2.4) * 6.4) * S;
      push(x, y, s * 1.3, s, rand() * 180, 0.6 * allowance(x, y));
    }
  }

  // ── The three layers ──────────────────────────────────────────────────────
  // Split so they can LAND IN SEQUENCE in the browser. One image could only
  // fade in as a whole; three let the mud arrive throw by throw, which is the
  // whole reason the hero moves at all.
  //
  // EVERY ORIGIN IS INSIDE THE FRAME. A throw is dense and fat at the foot and
  // thin at the far end, so an origin placed off-canvas shows only its thin
  // tail and the mark reads as scattered dots rather than as mud off a shoe.
  const layers = [];
  const cut = () => {
    const out = drops.splice(0, drops.length);
    layers.push(out);
  };

  // 1. The big throw, low left up through the headline, and the splat it leaves.
  throwMud(0.1 * W, 0.43 * H, 14, 0.78 * W, n(170), 23 * S);
  splat(0.25 * W, 0.42 * H, 21 * S, n(12));
  cut();

  // 2. Back the other way across the top, and the splat by the photograph.
  //    Both are placed where they clear the copy in BOTH band shapes. At
  //    0.19/0.30 they landed inside the phone's subhead zone and this layer
  //    baked out completely empty, which would have shipped a blank request.
  throwMud(0.93 * W, 0.13 * H, 172, 0.53 * W, n(105), 17 * S);
  splat(0.73 * W, 0.44 * H, 23 * S, n(12));
  cut();

  // 3. The two kicks off the far foot, the low splat, and the speckle that
  //    settles over everything.
  throwMud(0.55 * W, 0.94 * H, -84, 0.35 * W, n(85), 14 * S);
  throwMud(0.84 * W, 0.9 * H, -128, 0.32 * W, n(70), 12 * S);
  splat(0.88 * W, 0.86 * H, 14 * S, n(8));
  speckle(n(220));
  cut();

  // 4. The trail, on its own layer so the page can wipe it in and the prints
  //    appear in walking order rather than all at once. FEWER AND BIGGER: a
  //    row of small prints reads as a decorative border, a few large ones read
  //    as somebody having run through here.
  trail(9);
  cut();

  return { layers, W, H, S };
}

/**
 * One layer as a standalone SVG document, white on transparent, ready to be
 * rasterised into an alpha mask.
 *
 * The filter is the reason this is worth baking. feTurbulence drives a
 * displacement map over the whole layer, which pulls every drop's edge apart
 * into something irregular. It is what separates mud from clip art, and it is
 * also the one thing that could never run live on this many shapes.
 */
export function layerSvg(drops, W, H, seed, scale = 7) {
  const body = drops
    .map((d) => {
      if (d.rect) {
        const x = d.x - d.w / 2;
        const y = d.y - d.h / 2;
        const r = Math.min(d.w, d.h) * 0.35;
        return (
          `<rect x="${+x.toFixed(1)}" y="${+y.toFixed(1)}" width="${d.w}" height="${d.h}"` +
          ` rx="${+r.toFixed(1)}" opacity="${d.o}" transform="rotate(${d.a} ${d.x} ${d.y})"/>`
        );
      }
      return (
        `<ellipse cx="${d.x}" cy="${d.y}" rx="${d.rx}" ry="${d.ry}" opacity="${d.o}"` +
        (d.ry / d.rx > 0.8 ? '' : ` transform="rotate(${d.a} ${d.x} ${d.y})"`) +
        `/>`
      );
    })
    .join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<filter id="rough" x="-12%" y="-12%" width="124%" height="124%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="3" seed="${seed}" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter>` +
    `<g fill="#fff" filter="url(#rough)">${body}</g>` +
    `</svg>`
  );
}
