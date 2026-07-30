/* 오선 악보 조판 (SVG 문자열 생성).
   색은 전부 currentColor 로 그리고 CSS 토큰(.ms svg{color:var(--ink)})에서 받는다. */
import { INSTS, IX, UPPER, LOWER, LEDGER } from './constants.js';
import { app, lcm, secOf, secIdxOfBar } from './state.js';

/* 조판 기하 — 오선 한 칸 S=10, 음표머리 = 0.88칸 */
export const VB = { w:248, h:138, y0:5 };
export const S = 10, TOP = 56, BOT = 96, BAR = 238, PAD = 7;
export const yFor = p => BOT - p * (S/2);

export const hasStartRep = bi => bi % 4 === 0     && (secOf(secIdxOfBar(bi)).rep || 0) > 0;
export const hasEndRep   = bi => (bi+1) % 4 === 0 && (secOf(secIdxOfBar(bi)).rep || 0) > 0;

/* 마디마다 왼쪽 여백(박자표·도돌이표)이 달라지므로 폭을 따로 계산 */
export function metrics(bi){
  let cx = 20.5;                              // 드럼 클레프(12~19.3) 다음
  const ts = (bi === 0), sr = hasStartRep(bi), er = hasEndRep(bi);
  let tsX = 0, srX = 0;
  if(ts){ tsX = cx + 5.5; cx += 13; }
  if(sr){ srX = cx;       cx += 14; }
  const X = cx + 4, right = er ? BAR - 13 : BAR - 2;
  const W = (right - X) / 4;
  return { X, W, MW: W*4 - PAD, tsX, srX, ts, sr, er };
}

/* 음표는 박마다 몰지 않고 마디 전체에 균등 배치한다.
   e번째 박의 slot(분할 L) → x */
export const xAt = (M, e, slot, L) => M.X + PAD + ((e + slot/L) / 4) * M.MW;

export function head(x, y, kind, type){
  let g = '';
  if(type === 'b')
    g += `<path d="M${x},${y-3.9}L${x+4.3},${y}L${x},${y+3.9}L${x-4.3},${y}z" fill="currentColor"/>`;
  else if(kind === 'x')
    g += `<path d="M${x-3.9},${y-3.7}L${x+3.9},${y+3.7}M${x+3.9},${y-3.7}L${x-3.9},${y+3.7}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`;
  else
    g += `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="3.3" transform="rotate(-18 ${x} ${y})" fill="currentColor"/>`;
  if(type === 'o')
    g += `<circle cx="${x}" cy="${y-8.8}" r="2.5" fill="none" stroke="currentColor" stroke-width="1.3"/>`;
  if(type === 'g')
    g += `<text x="${x-8.2}" y="${y+3.8}" font-size="11" fill="currentColor">(</text><text x="${x+4.2}" y="${y+3.8}" font-size="11" fill="currentColor">)</text>`;
  return g;
}

export const accentMark = (x, y) =>
  `<path d="M${x-4.2},${y-4.8}L${x+4.2},${y-2}L${x-4.2},${y+0.8}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;

export function rest(x, y, kind){
  if(kind === 'q')
    return `<path d="M${x-2.1},${y-7.4}L${x+2.1},${y-2.4}L${x-2.1},${y+2}L${x+2.5},${y+6.6}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/>`;
  const top = kind === 's' ? y-6.8 : y-5.5;
  let g = `<path d="M${x+2.5},${top}L${x-1.7},${y+6.7}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
  g += `<path d="M${x+2.5},${top} q -4.2,0.4 -4.7,3.5 q 2.5,-2.2 4.7,-1.3z" fill="currentColor"/>`;
  if(kind === 's')
    g += `<path d="M${x+1},${top+5} q -4.2,0.4 -4.7,3.5 q 2.5,-2.2 4.7,-1.3z" fill="currentColor"/>`;
  return g;
}

export function beamsFor(dur, L){
  if(L === 3) return dur === 1 ? 1 : 0;
  if(L === 6) return dur === 1 ? 2 : dur === 2 ? 1 : 0;
  const f = dur / L;
  return f >= 1 ? 0 : f >= 0.5 ? 1 : f >= 0.25 ? 2 : 3;
}
export const isDotted = (dur, L) => { const f = dur/L; return f === 0.75 || f === 0.375; };

/* 한 박을 그리기 위한 정리 — 악기별 분할의 최소공배수 격자로 합친다 */
export function layoutBeat(beat){
  let L = 1;
  INSTS.forEach(i => { if(beat[i.id].s.some(v => v)) L = lcm(L, beat[i.id].d); });
  const grab = ids => {
    const ev = {};
    ids.forEach(id => {
      const o = beat[id];
      o.s.forEach((v, k) => {
        if(v){ const slot = k * L / o.d; (ev[slot] = ev[slot] || []).push({ id, t:v }); }
      });
    });
    return Object.keys(ev).map(Number).sort((a,b) => a-b).map(slot => ({ slot, notes: ev[slot] }));
  };
  return { L, up: grab(UPPER), low: grab(LOWER) };
}

export function drawVoice(xf, ev, L, dir, beamY){
  if(!ev.length) return '';
  let g = '';
  const durs = ev.map((e,i) => (i < ev.length-1 ? ev[i+1].slot : L) - e.slot);
  const nb   = durs.map(d => beamsFor(d, L));
  ev.forEach((e,i) => {
    const x = xf(e.slot), ys = e.notes.map(n => yFor(IX[n.id].p));
    e.notes.forEach(n => {
      const y = yFor(IX[n.id].p);
      if(LEDGER[n.id] != null)
        g += `<path d="M${x-7},${y}L${x+7},${y}" stroke="currentColor" stroke-width=".9"/>`;
      g += head(x, y, IX[n.id].head, n.t);
    });
    /* 악센트는 음표 꼬리(기둥·빔) 바깥쪽에 찍는다. 한 슬롯에 화음이면 하나만. */
    if(e.notes.some(n => n.t === 'a')) g += accentMark(x, dir > 0 ? beamY-8 : beamY+9);
    const sx  = x + (dir > 0 ? 4 : -4);
    const far = dir > 0 ? Math.max(...ys) : Math.min(...ys);   // 화음의 가장 먼 음표부터
    g += `<path d="M${sx},${far}L${sx},${beamY}" stroke="currentColor" stroke-width="1.4"/>`;
    if(isDotted(durs[i], L))
      g += `<circle cx="${x+7.5}" cy="${dir>0 ? Math.min(...ys) : Math.max(...ys)}" r="1.3" fill="currentColor"/>`;
  });
  const bh = 2.7, gap = dir > 0 ? 4.5 : -4.5;
  for(let lvl=1; lvl<=3; lvl++){
    let i = 0;
    while(i < ev.length){
      if(nb[i] < lvl){ i++; continue; }
      let j = i;
      while(j+1 < ev.length && nb[j+1] >= lvl) j++;
      const xa = xf(ev[i].slot) + (dir>0 ? 4 : -4);
      const xb = xf(ev[j].slot) + (dir>0 ? 4 : -4);
      const y  = beamY + (lvl-1)*gap - (dir>0 ? bh : 0);
      if(j > i)
        g += `<rect x="${Math.min(xa,xb)}" y="${y}" width="${Math.abs(xb-xa)}" height="${bh}" fill="currentColor"/>`;
      else {
        const d = (i > 0 && nb[i-1] >= 1 && lvl > 1) ? -1 : 1;   // 부분빔은 박 안쪽을 향하게
        g += `<rect x="${d>0 ? xa : xa-6.5}" y="${y}" width="6.5" height="${bh}" fill="currentColor"/>`;
      }
      i = j + 1;
    }
  }
  return g;
}

/* 쉼표는 박의 첫 음표 앞에만 (음표 길이가 다음 음표까지 이어지는 표준 조판) */
export function restsBefore(xf, ev, L, yc, cx){
  if(!ev.length) return rest(cx, yc, 'q');
  let g = '', q = 0;
  const end = ev[0].slot;
  const cands = L === 3 ? [3,1] : L === 6 ? [6,3,2,1] : [4,2,1];
  while(q < end){
    let ch = 1;
    for(const c of cands){ if(c <= end-q && q % c === 0){ ch = c; break; } }
    const f = ch / L;
    const kind = f >= 1 ? 'q' : (f >= 0.5 || Math.abs(f - 1/3) < .02) ? 'e' : 's';
    g += rest(xf(q) - 1, yc, kind);
    q += ch;
  }
  return g;
}

export function measureSVG(bi){
  const bar = app.song.bars[bi], sel = app.sel, selM = sel.bar === bi, M = metrics(bi);
  let g = '';

  /* 선택 표시는 <g class="hl"> 안에 넣어 currentColor 가 --accent 로 해석되게 한다 */
  let hl = '';
  if(selM && sel.beat != null){
    const a = M.X + PAD + (sel.beat/4)*M.MW - PAD, w = M.MW/4 + PAD;
    hl += `<rect x="${a}" y="20" width="${w}" height="104" rx="6" fill="currentColor" opacity="0.11"/>`;
    hl += `<path d="M${a+3},${yFor(IX[sel.inst].p)}L${a+w-3},${yFor(IX[sel.inst].p)}" stroke="currentColor" stroke-width="1.1" stroke-dasharray="3 3" opacity=".85"/>`;
    hl += `<text x="${a+3}" y="18" font-size="8.5" font-weight="700" fill="currentColor">${IX[sel.inst].ko}</text>`;
  } else if(selM){
    hl += `<rect x="${M.X-1}" y="20" width="${M.W*4}" height="104" rx="6" fill="currentColor" opacity="0.07"/>`;
    for(let e=1; e<4; e++){
      const x = M.X + e*M.W - 1;
      hl += `<path d="M${x},28L${x},118" stroke="currentColor" stroke-width=".9" stroke-dasharray="2 4" opacity=".6"/>`;
    }
    for(let e=0; e<4; e++)
      hl += `<text x="${M.X + e*M.W + M.W/2}" y="128" font-size="9.5" font-weight="700" fill="currentColor" text-anchor="middle">${e+1}</text>`;
  }
  if(hl) g += `<g class="hl">${hl}</g>`;

  for(let l=0; l<5; l++){
    const y = TOP + l*S;
    g += `<path d="M8,${y}L${BAR},${y}" stroke="currentColor" stroke-width=".9"/>`;
  }
  g += `<rect x="8" y="${TOP}" width="1.5" height="${BOT-TOP}" fill="currentColor"/>`;
  g += `<rect x="12" y="${TOP+3.5}" width="2.8" height="${BOT-TOP-7}" fill="currentColor"/><rect x="16.5" y="${TOP+3.5}" width="2.8" height="${BOT-TOP-7}" fill="currentColor"/>`;
  g += `<text x="9" y="${TOP-6}" font-size="9" font-weight="700" fill="currentColor" opacity=".5">${bi+1}</text>`;

  if(M.ts)
    g += `<text x="${M.tsX}" y="${TOP+18}" font-size="15" font-weight="800" fill="currentColor" text-anchor="middle">4</text><text x="${M.tsX}" y="${TOP+37}" font-size="15" font-weight="800" fill="currentColor" text-anchor="middle">4</text>`;

  if(M.sr){                                              // 시작 도돌이표
    g += `<rect x="${M.srX}" y="${TOP}" width="2.8" height="${BOT-TOP}" fill="currentColor"/>`;
    g += `<rect x="${M.srX+4.3}" y="${TOP}" width="1.2" height="${BOT-TOP}" fill="currentColor"/>`;
    g += `<circle cx="${M.srX+8.8}" cy="${yFor(5)}" r="1.6" fill="currentColor"/><circle cx="${M.srX+8.8}" cy="${yFor(3)}" r="1.6" fill="currentColor"/>`;
  }

  for(let e=0; e<4; e++){
    const { L, up, low } = layoutBeat(bar.beats[e]);
    const xf = slot => xAt(M, e, slot, L);
    const cx = M.X + PAD + ((e+0.5)/4) * M.MW;
    let upY = 24, loY = 118;
    if(up.length){
      const mn = Math.min(...up.flatMap(v => v.notes.map(n => yFor(IX[n.id].p))));
      upY = Math.min(Math.max(mn - 22, 20), 40);
    }
    if(low.length){
      const mx = Math.max(...low.flatMap(v => v.notes.map(n => yFor(IX[n.id].p))));
      loY = Math.min(Math.max(mx + 22, 114), 128);
    }
    g += restsBefore(xf, up, L, yFor(4), cx);
    g += drawVoice(xf, up,  L, +1, upY);
    g += drawVoice(xf, low, L, -1, loY);
    if((L === 3 || L === 6) && (up.length || low.length))
      g += `<text x="${cx}" y="${upY-3.5}" font-size="8.5" font-style="italic" font-weight="700" fill="currentColor" text-anchor="middle">${L}</text>`;
  }

  if(M.er){                                              // 끝 도돌이표
    g += `<circle cx="${BAR-10}" cy="${yFor(5)}" r="1.6" fill="currentColor"/><circle cx="${BAR-10}" cy="${yFor(3)}" r="1.6" fill="currentColor"/>`;
    g += `<rect x="${BAR-6}" y="${TOP}" width="1.2" height="${BOT-TOP}" fill="currentColor"/>`;
    g += `<rect x="${BAR-2.8}" y="${TOP}" width="2.8" height="${BOT-TOP}" fill="currentColor"/>`;
    g += `<text x="${BAR}" y="${TOP-6}" font-size="9.5" font-weight="800" fill="currentColor" text-anchor="end">×${1 + (secOf(secIdxOfBar(bi)).rep || 0)}</text>`;
  } else {
    const last = (bi+1) % 4 === 0;
    g += `<rect x="${BAR}" y="${TOP}" width="${last ? 2.8 : 1.3}" height="${BOT-TOP}" fill="currentColor"/>`;
    if(last) g += `<rect x="${BAR-4.5}" y="${TOP}" width="1.1" height="${BOT-TOP}" fill="currentColor"/>`;
  }

  return `<svg viewBox="0 ${VB.y0} ${VB.w} ${VB.h}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

/* 안내 시트용 — 악기 하나의 오선 위치 */
export function keyRow(i){
  let g = [0,1,2,3,4]
    .map(l => `<path d="M2,${TOP+l*S}L54,${TOP+l*S}" stroke="currentColor" stroke-width=".9"/>`)
    .join('');
  const y = yFor(i.p);
  if(LEDGER[i.id] != null) g += `<path d="M21,${y}L35,${y}" stroke="currentColor" stroke-width=".9"/>`;
  g += head(28, y, i.head, 'n');
  return `<svg viewBox="0 26 56 92" style="width:54px">${g}</svg>`;
}
