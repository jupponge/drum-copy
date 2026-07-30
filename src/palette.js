/* 하단 리듬 팔레트의 미리보기 그림 (한 박짜리 축소 악보) */
import { beamsFor, isDotted, rest } from './notation.js';

export function patSVG(div, bits, w = 58){
  const L = div, ev = [];
  bits.split('').forEach((b, k) => { if(b === '1') ev.push({ slot:k }); });
  const durs = ev.map((e,i) => (i < ev.length-1 ? ev[i+1].slot : L) - e.slot);
  const nb   = durs.map(d => beamsFor(d, L));
  const X = k => 7 + (k/L) * (w-15), NY = 25, BY = 6;
  let g = '';

  ev.forEach((e,i) => {
    const x = X(e.slot);
    g += `<ellipse cx="${x}" cy="${NY}" rx="4.1" ry="3.1" transform="rotate(-18 ${x} ${NY})" fill="currentColor"/>`;
    g += `<path d="M${x+3.7},${NY}L${x+3.7},${BY}" stroke="currentColor" stroke-width="1.3"/>`;
    if(isDotted(durs[i], L)) g += `<circle cx="${x+7.2}" cy="${NY}" r="1.2" fill="currentColor"/>`;
  });

  for(let lvl=1; lvl<=2; lvl++){
    let i = 0;
    while(i < ev.length){
      if(nb[i] < lvl){ i++; continue; }
      let j = i;
      while(j+1 < ev.length && nb[j+1] >= lvl) j++;
      const xa = X(ev[i].slot) + 3.7, xb = X(ev[j].slot) + 3.7, y = BY + (lvl-1)*4.2;
      if(j > i) g += `<rect x="${xa}" y="${y}" width="${xb-xa}" height="2.5" fill="currentColor"/>`;
      else {
        const d = (i > 0 && nb[i-1] >= 1 && lvl > 1) ? -1 : 1;
        g += `<rect x="${d>0 ? xa : xa-5.5}" y="${y}" width="5.5" height="2.5" fill="currentColor"/>`;
      }
      i = j + 1;
    }
  }

  /* 쉼표는 첫 음표 앞에만 */
  const cands = L === 3 ? [3,1] : L === 6 ? [6,3,2,1] : [4,2,1];
  let rg = '';
  if(!ev.length) rg += rest(w/2 - 5, NY-3, 'q');
  else {
    let q = 0;
    const end = ev[0].slot;
    while(q < end){
      let ch = 1;
      for(const c of cands){ if(c <= end-q && q % c === 0){ ch = c; break; } }
      const f = ch / L;
      const kind = f >= 1 ? 'q' : (f >= 0.5 || Math.abs(f - 1/3) < .02) ? 'e' : 's';
      rg += rest(X(q) - 1, NY-3, kind);
      q += ch;
    }
  }
  if(rg) g += `<g opacity=".5">${rg}</g>`;

  if(L === 3 || L === 6)
    g += `<text x="${w/2-3}" y="4" font-size="7" font-weight="700" font-style="italic" fill="currentColor">${L}</text>`;

  return `<svg viewBox="-2 0 ${w} 32" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}
