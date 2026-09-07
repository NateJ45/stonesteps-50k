import { contrastRatio } from '../src/lib/contrast.ts';
const t = [
  ['#5C513B', '#FBF6EA', 'muted-fg / paper'],
  ['#5C513B', '#F4EBD6', 'muted-fg / muted'],
  ['#6B5E44', '#FBF6EA', 'alt muted-fg / paper'],
  ['#8F3323', '#F4EBD6', 'link / muted'],
  ['#1A1712', '#FFEBBB', 'bark / cream card'],
  ['#C9B98F', '#1A1712', 'cream-dim / bark'],
  ['#C9B98F', '#241F17', 'cream-dim / bark2'],
  ['#FED89B', '#1A1712', 'gold link / bark'],
  ['#FFEBBB', '#241F17', 'cream / bark2 card'],
  ['#FED89B', '#FBF6EA', 'GOLD ON PAPER (expect fail)'],
  ['#A83C26', '#FFEBBB', 'rust / cream plate'],
  ['#8F3323', '#FFEBBB', 'rust-deep / cream plate'],
];
for (const [a, b, l] of t) {
  const r = contrastRatio(a, b);
  console.log(
    `${(r >= 4.5 ? 'PASS' : r >= 3 ? 'AA-LG' : 'FAIL').padEnd(5)} ${r.toFixed(2).padStart(6)}  ${l}`,
  );
}
