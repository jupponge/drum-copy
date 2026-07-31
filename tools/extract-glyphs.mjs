/* Bravura(SMuFL 표준 폰트)에서 필요한 글리프 윤곽선만 뽑아 SVG path 로 출력한다.
   결과를 src/notation.js 에 상수로 박아넣기 때문에, 앱은 폰트를 싣지 않는다.

   실행:  node tools/extract-glyphs.mjs
   필요:  npm i -D vexflow opentype.js wawoff2   (추출할 때만)

   Bravura © Steinberg Media Technologies GmbH, SIL Open Font License 1.1
   https://github.com/steinbergmedia/bravura
*/
import { readFileSync } from 'node:fs';
import { decompress } from 'wawoff2';
import opentype from 'opentype.js';

/* vexflow 는 exports 로 내부 경로를 막아둬서 파일을 직접 읽는다 */
const src = readFileSync('node_modules/vexflow/build/esm/src/fonts/bravura.js', 'utf8');
const Bravura = src.match(/'(data:font\/woff2[^']+)'/)[1];

/* SMuFL 규칙: 1 em = 오선 전체 높이 = 4칸. 우리 조판은 한 칸이 10 이므로 em = 40 */
const EM_UNITS = 40;

const WANT = [
  { name:'restQuarter', cp:0xE4E5, ko:'4분쉼표' },
  { name:'rest8th',     cp:0xE4E6, ko:'8분쉼표' },
  { name:'rest16th',    cp:0xE4E7, ko:'16분쉼표' },
  { name:'flag8thUp',   cp:0xE240, ko:'8분 꼬리(위)' },
  { name:'flag16thUp',  cp:0xE242, ko:'16분 꼬리(위)' },
  { name:'flag8thDown', cp:0xE241, ko:'8분 꼬리(아래)' },
  { name:'flag16thDown',cp:0xE243, ko:'16분 꼬리(아래)' },
];

const b64 = Bravura.split('base64,')[1];
const woff2 = Buffer.from(b64, 'base64');
const ttf = await decompress(woff2);
const font = opentype.parse(Uint8Array.from(ttf).buffer);

const scale = EM_UNITS / font.unitsPerEm;
console.log(`unitsPerEm=${font.unitsPerEm}  scale=${scale}\n`);

for(const g of WANT){
  const glyph = font.charToGlyph(String.fromCodePoint(g.cp));
  if(!glyph || !glyph.path || !glyph.path.commands.length){
    console.log(`// ${g.name}: 못 찾음`);
    continue;
  }
  // y 축은 SVG 가 아래로 증가하므로 뒤집는다
  const p = glyph.getPath(0, 0, EM_UNITS);
  const d = p.toPathData(3);
  const bb = p.getBoundingBox();
  console.log(`/* ${g.ko}  U+${g.cp.toString(16).toUpperCase()}  `
    + `w=${(bb.x2-bb.x1).toFixed(2)} h=${(bb.y2-bb.y1).toFixed(2)} `
    + `x:${bb.x1.toFixed(2)}~${bb.x2.toFixed(2)} y:${bb.y1.toFixed(2)}~${bb.y2.toFixed(2)} */`);
  console.log(`${g.name}: '${d}',\n`);
}
