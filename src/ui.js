/* 이벤트 연결 — 여기서만 DOM 이벤트를 받는다 */
import { INSTS, IX } from './constants.js';
import { app, ready, secOf, secCount, pushHist } from './state.js';
import { $, closeSheet, toast } from './dom.js';
import { VB, metrics, yFor } from './notation.js';
import { render, renderEditor } from './render.js';
import { play } from './audio.js';
import {
  undo, redo, cycleTick, applyPat, move, eraseBeat, allBeats, moveTickTo,
  copyPrev, clearBar, secAction, addBars, delBars,
  insertSection, dupSection, deleteSection, canDeleteSection,
} from './actions.js';
import {
  openMenu, openList, openKey, openExport, openSecSheet, printPDF,
  saveSong, loadSong, newSheet, allSongs, putSongs, themeIsLight, setTheme,
} from './sheets.js';

export function wire(){
  /* ── 악보 영역 ── */
  $('score').addEventListener('click', ev => {
    const t = ev.target.closest('[data-secplay],[data-secmenu],[data-copyprev],[data-clear],[data-allbeats]');
    if(t){
      const d = t.dataset;
      if(d.secplay != null){ const s = +d.secplay; play(s*4, s*4+4); }
      if(d.secmenu != null) openSecSheet(+d.secmenu);
      if(d.copyprev != null) copyPrev(+d.copyprev);
      if(d.clear != null) clearBar(+d.clear);
      if(d.allbeats != null) allBeats();
      return;
    }
    const ms = ev.target.closest('.ms');
    if(!ms) return;
    const bi = +ms.dataset.bar;
    /* 처음 탭은 마디만 선택. 두 번째 탭에서 박 + 오선 위치(악기)를 잡는다. */
    if(app.sel.bar !== bi){ app.sel = { bar:bi, beat:null, inst:app.sel.inst }; app.tick = null; render(); return; }
    const M = metrics(bi), r = ms.querySelector('svg').getBoundingClientRect();
    const vx = (ev.clientX - r.left) / r.width * VB.w;
    const vy = VB.y0 + (ev.clientY - r.top) / r.height * VB.h;
    const beat = Math.max(0, Math.min(3, Math.floor((vx - M.X) / M.W)));
    let best = INSTS[0], bd = 1e9;
    INSTS.forEach(i => { const d = Math.abs(vy - yFor(i.p)); if(d < bd){ bd = d; best = i; } });
    app.sel = { bar:bi, beat, inst:best.id };
    app.tick = null;
    render();
  });

  /* ── 하단 편집 줄 ── */
  document.querySelector('footer').addEventListener('click', ev => {
    const t = ev.target.closest('[data-inst],[data-mv],[data-fam],[data-pat],[data-tk],[data-act]');
    if(!t || t.disabled) return;
    const d = t.dataset;
    if(d.inst){
      app.sel.inst = d.inst;
      if(app.sel.bar == null) app.sel.bar = 0;
      if(app.sel.beat == null) app.sel.beat = 0;
      /* 악기 모드에서 틱을 골라둔 상태면, 칩을 누르는 순간 그 음표가 이 악기로 옮겨간다 */
      if(app.brush === 'fill' && app.tick != null){
        moveTickTo(app.tick, d.inst);
        pushHist();
      }
      render();
    }
    else if(d.fam){ app.fam = +d.fam; renderEditor(); }
    else if(d.mv){ move(+d.mv); }
    else if(d.pat != null) applyPat(d.pat);
    else if(d.tk != null) cycleTick(+d.tk);
    else if(d.act === 'brush'){
      const sp = IX[app.sel.inst].sp;
      const cyc = sp ? ['a','sp','fill'] : ['a','fill'];
      app.brush = cyc[(cyc.indexOf(app.brush) + 1) % cyc.length];
      app.tick = null;
      renderEditor();
    }
    else if(d.act === 'undo') undo();
    else if(d.act === 'redo') redo();
    else if(d.act === 'erase') eraseBeat();
  });

  /* ── 시트 안 ── */
  $('sheet').onclick = e => { if(e.target === $('sheet')) closeSheet(); };
  $('sbox').addEventListener('click', e => {
    const t = e.target.closest('[data-m],[data-open],[data-del],[data-rep],[data-ins],[data-dup],[data-delsec]');
    if(!t) return;
    const m = t.dataset.m;
    const s = $('sbox').dataset.sec != null ? +$('sbox').dataset.sec : null;
    /* 섹션 시트에서 무엇을 누르든 입력해둔 이름을 먼저 저장한다 */
    const nm = () => { const n = $('secname'); if(n && s != null) secOf(s).name = n.value.trim(); };

    if(m === 'save'){ saveSong(); closeSheet(); }
    if(m === 'new') newSheet();
    if(m === 'add') addBars();
    if(m === 'del') delBars();
    if(m === 'auto'){ app.autoAdv = !app.autoAdv; t.classList.toggle('on', app.autoAdv); }
    if(m === 'theme'){ setTheme(themeIsLight() ? 'dark' : 'light'); closeSheet(); }
    if(m === 'undo'){ undo(); closeSheet(); }
    if(m === 'redo'){ redo(); closeSheet(); }
    if(m === 'loop'){ app.loopOn = !app.loopOn; t.classList.toggle('on', app.loopOn); }
    if(m === 'metro'){ app.metroOn = !app.metroOn; t.classList.toggle('on', app.metroOn); }
    if(m === 'list') openList();
    if(m === 'exp') openExport();
    if(m === 'key') openKey();
    if(m === 'pdf'){ closeSheet(); printPDF(); }

    if(t.dataset.open) loadSong(t.dataset.open);
    if(t.dataset.del){
      const x = allSongs().find(y => y.id === t.dataset.del);
      if(x && confirm(`"${x.title}" 삭제할까요?`)){
        putSongs(allSongs().filter(y => y.id !== t.dataset.del));
        openList();
      }
    }

    if(t.dataset.rep != null && s != null) secAction(() => { nm(); secOf(s).rep = +t.dataset.rep; });
    if(t.dataset.ins && s != null) secAction(() => { nm(); insertSection(s, t.dataset.ins); });
    if(t.dataset.dup && s != null) secAction(() => { nm(); dupSection(s); });
    if(t.dataset.delsec && s != null){
      if(!canDeleteSection()){ toast('최소 한 섹션(4마디)은 필요합니다'); return; }
      if(!confirm(`${s*4+1}–${s*4+4}마디를 삭제할까요?`)) return;
      secAction(() => deleteSection(s));
    }
  });

  /* ── 상단 ── */
  $('play').onclick = () => play();
  $('menu').onclick = () => openMenu();
  $('fab').onclick = () => {
    document.querySelector('footer').classList.toggle('fold');
    renderEditor();
  };
  document.querySelectorAll('[data-bpm]').forEach(b => {
    b.onclick = () => {
      app.song.bpm = Math.max(30, Math.min(300, app.song.bpm + (+b.dataset.bpm)));
      $('bpm').value = app.song.bpm;
    };
  });
  $('bpm').onchange = e => {
    app.song.bpm = Math.max(30, Math.min(300, +e.target.value || 100));
    e.target.value = app.song.bpm;
  };
  $('title').oninput = e => { app.song.title = e.target.value; };

  window.addEventListener('resize', renderEditor);
  document.addEventListener('keydown', e => {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
  });
}
