import { contrastRatio } from '../src/lib/contrast.ts';
const cream = '#FFEBBB',
  bark = '#1A1712';
const hex = (n) => n.toString(16).padStart(2, '0');
const mix = (fg, bg, a) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(fg),
    [r2, g2, b2] = p(bg);
  return (
    '#' +
    hex(Math.round(r1 * a + r2 * (1 - a))) +
    hex(Math.round(g1 * a + g2 * (1 - a))) +
    hex(Math.round(b1 * a + b2 * (1 - a)))
  );
};
console.log('opacity  colour    ratio on cream');
for (const a of [0.5, 0.6, 0.65, 0.7, 0.72, 0.75, 0.8, 0.85, 0.9]) {
  const c = mix(bark, cream, a);
  console.log(
    a.toFixed(2).padEnd(8),
    c,
    contrastRatio(c, cream).toFixed(2),
    contrastRatio(c, cream) >= 4.5 ? 'PASS' : 'fail',
  );
}
