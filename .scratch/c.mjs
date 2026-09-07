import { contrastRatio } from '../src/lib/contrast.ts';
const P = {
  bark: '#1A1712',
  barkDeep: '#0F0D0A',
  bark2: '#241F17',
  bark3: '#2F281D',
  cream: '#FFEBBB',
  gold: '#FED89B',
  paper: '#FBF6EA',
  paperSoft: '#F4EBD6',
  paperSoft2: '#F0E6CE',
  rust: '#A83C26',
  rustDeep: '#8F3323',
  rustDeeper: '#7E2C1E',
  forest: '#2E5738',
  forestDeep: '#24462D',
  white: '#FFFFFF',
};
const pairs = [
  ['bark', 'paper'],
  ['bark', 'paperSoft'],
  ['barkDeep', 'paper'],
  ['rust', 'paper'],
  ['rust', 'paperSoft'],
  ['rustDeep', 'paper'],
  ['rustDeep', 'paperSoft'],
  ['rustDeeper', 'paper'],
  ['rustDeeper', 'paperSoft'],
  ['forest', 'paper'],
  ['forestDeep', 'paper'],
  ['white', 'rustDeep'],
  ['white', 'rustDeeper'],
  ['white', 'bark'],
  ['white', 'barkDeep'],
  ['white', 'forest'],
  ['white', 'forestDeep'],
  ['cream', 'bark'],
  ['cream', 'bark2'],
  ['cream', 'bark3'],
  ['cream', 'rust'],
  ['cream', 'rustDeep'],
  ['cream', 'forest'],
  ['gold', 'bark'],
  ['gold', 'bark2'],
  ['gold', 'forest'],
];
for (const [a, b] of pairs) {
  const r = contrastRatio(P[a], P[b]);
  console.log(
    `${(r >= 4.5 ? 'PASS' : r >= 3 ? 'AA-LG' : 'FAIL').padEnd(5)} ${r.toFixed(2).padStart(5)}  ${a} (${P[a]}) on ${b} (${P[b]})`,
  );
}
