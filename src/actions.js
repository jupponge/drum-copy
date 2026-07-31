/* 악보를 바꾸는 동작들. 전부 pushHist() 로 되돌리기 지점을 남긴다. */
import { INSTS, IX } from './constants.js';
import {
  app, clone, newBar, ready, curBeat, reDiv, instAt,
  pushHist, stepHist, secCount, secOf,
} from './state.js';
import { toast, inView, closeSheet } from './dom.js';
import { tick } from './audio.js';
import { render } from './render.js';

export function undo(){
  if(!stepHist(-1)){ toast('되돌릴 게 없습니다'); return; }
  render();
}
export function redo(){
  if(!stepHist(+1)){ toast('다시 실행할 게 없습니다'); return; }
  render();
}

/* 틱 하나를 탭 = 한 번에 켜고 한 번에 끄기.
   기본(brush 'a') : 보통 ↔ 악센트   (빈 틱이면 보통으로 추가)
   특수(brush 'sp'): 보통 ↔ 오픈/벨/고스트
   악기(brush 'fill'): 선택한 악기를 그 틱에 찍기 / 빼기 */
export function cycleTick(k){
  if(!ready()) return;
  const B = app.song.bars[app.sel.bar].beats[app.sel.beat];

  if(app.brush === 'fill'){
    app.tick = k;                        // 이 틱을 고른 상태로 두면 악기 칩으로 옮길 수 있다
    if(instAt(k) === app.sel.inst) clearTick(k);      // 같은 악기를 다시 → 빼기
    else moveTickTo(k, app.sel.inst);
    pushHist();
    render();
    return;
  }

  const o = B[app.sel.inst], sp = IX[app.sel.inst].sp, cur = o.s[k] || '';
  let next;
  if(app.brush === 'sp' && sp) next = (cur === sp) ? 'n' : sp;
  else next = (cur === '') ? 'n' : (cur === 'a' ? 'n' : 'a');
  o.s[k] = next;
  pushHist();
  tick(app.sel.inst, next, 0);
  render();
}

/* 박 안의 모든 악기를 지금 고른 분할(fam)에 맞춘다 */
function alignBeat(B){
  INSTS.forEach(i => { B[i.id] = reDiv(B[i.id], app.fam); });
}

/* 한 틱은 악기 하나만 가진다 — 그 자리의 음표를 instId 로 "옮긴다".
   원래 있던 음표의 성격(악센트 등)은 가능하면 유지한다. */
export function moveTickTo(k, instId){
  const B = app.song.bars[app.sel.bar].beats[app.sel.beat];
  alignBeat(B);
  let type = '';
  INSTS.forEach(i => {
    if(B[i.id].s[k]){ type = type || B[i.id].s[k]; B[i.id].s[k] = ''; }
  });
  // 옮겨간 악기에 없는 특수주법이면 보통 음표로 (악센트는 모든 악기 공통)
  const ok = type === 'n' || type === 'a' || type === IX[instId].sp;
  B[instId].s[k] = ok && type ? type : 'n';
  tick(instId, B[instId].s[k], 0);
}

export function clearTick(k){
  const B = app.song.bars[app.sel.bar].beats[app.sel.beat];
  alignBeat(B);
  INSTS.forEach(i => { B[i.id].s[k] = ''; });
}

export function applyPat(bits){
  if(!ready()) return;
  app.tick = null;
  app.song.bars[app.sel.bar].beats[app.sel.beat][app.sel.inst] =
    { d: app.fam, s: bits.split('').map(b => b === '1' ? 'n' : '') };
  pushHist();
  bits.split('').forEach((b, k) => {
    if(b === '1') tick(app.sel.inst, 'n', k * (60 / app.song.bpm) / app.fam);
  });
  if(app.autoAdv) move(1); else render();
}

export function move(dir){
  app.tick = null;                       // 박이 바뀌면 고른 틱은 풀린다
  if(app.sel.bar == null){ app.sel = { bar:0, beat:0, inst:app.sel.inst }; render(); return; }
  if(app.sel.beat == null){ app.sel.beat = dir > 0 ? 0 : 3; render(); return; }
  const idx = Math.max(0, Math.min(app.song.bars.length*4 - 1,
    app.sel.bar*4 + app.sel.beat + dir));
  app.sel.bar  = Math.floor(idx / 4);
  app.sel.beat = idx % 4;
  render();
  const e = document.querySelector(`.ms[data-bar="${app.sel.bar}"]`);
  if(e && !inView(e)) e.scrollIntoView({ block:'center', behavior:'smooth' });
}

export function eraseBeat(){
  if(!ready()) return;
  app.song.bars[app.sel.bar].beats[app.sel.beat][app.sel.inst] = { d:1, s:[''] };
  pushHist();
  render();
}

/* 지금 박의 이 악기 리듬을 그 마디 4박 전체에 */
export function allBeats(){
  if(!ready()){ toast('먼저 박을 선택하세요'); return; }
  const src = clone(curBeat());
  for(let e=0; e<4; e++) app.song.bars[app.sel.bar].beats[e][app.sel.inst] = clone(src);
  pushHist();
  render();
}

export function copyPrev(b){
  if(b <= 0){ toast('이전 마디가 없습니다'); return; }
  const k = app.song.bars[b].sec;                 // 섹션 정보는 그 자리에 남긴다
  app.song.bars[b] = clone(app.song.bars[b-1]);
  if(k) app.song.bars[b].sec = k; else delete app.song.bars[b].sec;
  pushHist();
  render();
}

export function clearBar(b){
  const k = app.song.bars[b].sec;
  app.song.bars[b] = newBar();
  if(k) app.song.bars[b].sec = k;
  pushHist();
  render();
}

/* 섹션 시트에서 부르는 동작 공통 처리 */
export function secAction(fn){
  fn();
  pushHist();
  closeSheet();
  render();
}

export function addBars(){
  for(let i=0; i<4; i++) app.song.bars.push(newBar());
  pushHist();
  render();
  toast(app.song.bars.length + '마디');
}
export function delBars(){
  if(app.song.bars.length <= 4){ toast('최소 4마디'); return; }
  if(!confirm('마지막 4마디를 삭제할까요?')) return;
  app.song.bars.length -= 4;
  if(app.sel.bar >= app.song.bars.length) app.sel = { bar:null, beat:null, inst:app.sel.inst };
  pushHist();
  render();
}

export function insertSection(s, where){
  const at = where === 'before' ? s*4 : s*4 + 4;
  app.song.bars.splice(at, 0, ...Array.from({ length:4 }, newBar));
  if(app.sel.bar != null && app.sel.bar >= at) app.sel.bar += 4;
}
export function dupSection(s){
  app.song.bars.splice(s*4 + 4, 0, ...app.song.bars.slice(s*4, s*4+4).map(clone));
}
export function deleteSection(s){
  app.song.bars.splice(s*4, 4);
  if(app.sel.bar != null){
    if(app.sel.bar >= s*4 + 4) app.sel.bar -= 4;
    else if(app.sel.bar >= s*4) app.sel = { bar:null, beat:null, inst:app.sel.inst };
  }
}
export const canDeleteSection = () => secCount() > 1;
export { secOf };
