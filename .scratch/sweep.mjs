import { contrastRatio } from '../src/lib/contrast.ts';
const cream = '#FFEBBB',
  card = '#241F17',
  bark = '#1A1712';
const cands = [
  '#A83C26',
  '#B4442E',
  '#BF4B33',
  '#C9553A',
  '#D25E42',
  '#DB6B4E',
  '#E0785C',
  '#C25232',
  '#CF6141',
  '#D9704E',
];
console.log('cand      onCard onBark  creamOn  verdict');
for (const c of cands) {
  const a = contrastRatio(c, card),
    b = contrastRatio(c, bark),
    d = contrastRatio(cream, c);
  const ok = a >= 3 && d >= 4.5;
  console.log(`${c}  ${a.toFixed(2)}   ${b.toFixed(2)}   ${d.toFixed(2)}    ${ok ? 'OK' : ''}`);
}
