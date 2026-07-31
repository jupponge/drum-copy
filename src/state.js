/* 앱 상태 + 되돌리기 히스토리. DOM 을 건드리지 않는다. */
import { INSTS } from './constants.js';

export function newBeat(){
  const b = {};
  INSTS.forEach(i => { b[i.id] = { d:1, s:[''] }; });
  return b;
}
export const newBar  = () => ({ beats:[newBeat(), newBeat(), newBeat(), newBeat()] });
export const newSong = () => ({ title:'새 악보', bpm:100, bars:Array.from({length:4}, newBar) });

export const clone = o => JSON.parse(JSON.stringify(o));
export function lcm(a,b){ const g=(x,y)=> y ? g(y, x%y) : x; return a*b/g(a,b); }

/* 재할당되는 값들은 이 객체 안에 둔다 (모듈 간에 살아있는 참조를 공유하기 위해) */
export const app = {
  song: newSong(),
  sel:  { bar:null, beat:null, inst:'SN' },
  fam:  4,          // 지금 고른 분할 (팔레트 탭)
  /* 틱을 탭했을 때 무엇을 할지
     'a'    악센트 토글          (기본)
     'sp'   특수 토글            (오픈 ○ · 벨 ◆ · 고스트 ( ))
     'fill' 선택한 악기를 그 틱에 찍기 — 필인처럼 틱마다 악기가 바뀌는 경우 */
  brush: 'a',
  tick: null,       // 악기 모드에서 지금 고른 틱 (여기에 악기 칩을 누르면 그 자리로 옮겨간다)
  printing: false,  // 인쇄용 렌더(4마디 한 줄) 중인지
  autoAdv: true,
  loopOn:  false,
  metroOn: true,
};

export const secCount    = () => app.song.bars.length / 4;
export const secIdxOfBar = bi => Math.floor(bi / 4);
/* 섹션 정보(이름·반복)는 4마디 블록의 첫 마디에만 붙는다 */
export function secOf(s){
  const b = app.song.bars[s*4];
  if(!b.sec) b.sec = { name:'', rep:0 };
  return b.sec;
}

export const ready   = () => app.sel.bar != null && app.sel.beat != null;
export const curBeat = () => app.song.bars[app.sel.bar].beats[app.sel.beat][app.sel.inst];

/* 한 악기의 분할을 바꾸되, 자리가 정확히 대응되는 음표는 살린다 (2분할 → 4분할 등) */
export function reDiv(o, d){
  if(o.d === d) return o;
  const s = Array(d).fill('');
  for(let k=0; k<d; k++){
    const src = k * o.d / d;
    if(Number.isInteger(src) && o.s[src]) s[k] = o.s[src];
  }
  return { d, s };
}

/* 지금 분할(fam) 기준으로 k번째 틱에 올라와 있는 악기 (오선 위에서부터 첫 번째).
   분할이 더 성긴 악기(8분 하이햇 등)도 자리가 맞으면 잡아낸다. */
export function instAt(k){
  const B = app.song.bars[app.sel.bar].beats[app.sel.beat];
  for(const i of INSTS){
    const o = B[i.id];
    const src = k * o.d / app.fam;
    if(Number.isInteger(src) && o.s[src]) return i.id;
  }
  return null;
}

/* ══════════ 되돌리기 ══════════ */
let hist = [], hi = -1;
const snap = () => JSON.stringify({
  title: app.song.title, bpm: app.song.bpm, bars: app.song.bars, id: app.song.id || null,
});

export function pushHist(){
  const s = snap();
  if(hi >= 0 && hist[hi] === s) return;
  hist = hist.slice(0, hi+1);
  hist.push(s);
  if(hist.length > 80) hist.shift();
  hi = hist.length - 1;
}
export function resetHist(){ hist = []; hi = -1; pushHist(); }
export const canUndo = () => hi > 0;
export const canRedo = () => hi < hist.length - 1;

/* 히스토리를 한 칸 이동하고 상태에 반영. 그릴 책임은 호출한 쪽에 있다. */
export function stepHist(dir){
  if(dir < 0 && !canUndo()) return false;
  if(dir > 0 && !canRedo()) return false;
  hi += dir;
  const o = JSON.parse(hist[hi]);
  app.song.title = o.title;
  app.song.bpm   = o.bpm;
  app.song.bars  = o.bars;
  if(o.id) app.song.id = o.id;
  if(app.sel.bar != null && app.sel.bar >= app.song.bars.length)
    app.sel = { bar:null, beat:null, inst:app.sel.inst };
  return true;
}
