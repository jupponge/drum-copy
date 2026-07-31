/* 하단에서 올라오는 시트들 — 메뉴 · 저장목록 · 내보내기 · 안내 · 섹션 · PDF */
import { INSTS, SYM, KEY, LASTK, THKEY } from './constants.js';
import {
  app, clone, newSong, secCount, secOf, resetHist, canUndo, canRedo,
} from './state.js';
import { $, esc, openSheet, closeSheet, toast } from './dom.js';
import { keyRow, layoutBeat } from './notation.js';
import { render } from './render.js';
import { stop } from './audio.js';

/* ══════════ 저장소 ══════════ */
export const allSongs = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch(e){ return []; }
};
export const putSongs = a => localStorage.setItem(KEY, JSON.stringify(a));

export function saveSong(){
  app.song.title = $('title').value.trim() || '무제';
  if(!app.song.id) app.song.id = 'S' + Date.now();
  const a = allSongs(), i = a.findIndex(s => s.id === app.song.id);
  const rec = {
    id: app.song.id, title: app.song.title, bpm: app.song.bpm,
    bars: app.song.bars, at: Date.now(),
  };
  if(i >= 0) a[i] = rec; else a.push(rec);
  putSongs(a);
  localStorage.setItem(LASTK, app.song.id);
  toast('저장 완료 · ' + app.song.title);
}

export function loadSong(id){
  const x = allSongs().find(y => y.id === id);
  if(!x) return;
  app.song = clone(x);
  app.sel = { bar:null, beat:null, inst:'SN' };
  resetHist();
  closeSheet();
  render();
}
export function newSheet(){
  if(!confirm('새 악보를 시작할까요? 저장하지 않은 내용은 사라집니다.')) return;
  app.song = newSong();
  app.sel = { bar:null, beat:null, inst:'SN' };
  resetHist();
  closeSheet();
  render();
}

/* ══════════ 테마 (기본 다크) ══════════ */
export const themeIsLight = () => document.documentElement.dataset.theme === 'light';
export function setTheme(t){
  if(t === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  localStorage.setItem(THKEY, t);
  const mc = document.querySelector('meta[name=theme-color]');
  if(mc) mc.content = t === 'light' ? '#f7f5f0' : '#12141a';
}

/* ══════════ 메뉴 ══════════ */
export function openMenu(){
  openSheet(`<h3>메뉴</h3>
  <div class="song"><div class="m"><b>💾 저장</b><span>이 악보를 이 기기에 저장</span></div><button class="btn p" data-m="save">저장</button></div>
  <div class="song"><div class="m"><b>📂 저장된 악보</b><span>${allSongs().length}개</span></div><button class="btn" data-m="list">열기</button></div>
  <div class="song"><div class="m"><b>＋ 새 악보</b><span>4마디로 시작</span></div><button class="btn" data-m="new">새로</button></div>
  <div class="song"><div class="m"><b>맨 뒤에 4마디</b><span>중간 삽입·삭제는 섹션의 ⋯ 버튼</span></div>
    <button class="btn" data-m="add">+4</button><button class="btn" data-m="del">−4</button></div>
  <div class="song"><div class="m"><b>입력 옵션</b><span>패턴을 넣으면 다음 박으로 자동 이동</span></div>
    <button class="btn${app.autoAdv ? ' on' : ''}" data-m="auto">자동이동</button></div>
  <div class="song"><div class="m"><b>되돌리기 / 다시 실행</b><span>↶ 는 윗줄에도 있습니다</span></div>
    <button class="btn" data-m="undo"${canUndo() ? '' : ' disabled'}>↶ 되돌리기</button>
    <button class="btn" data-m="redo"${canRedo() ? '' : ' disabled'}>↷ 다시</button></div>
  <div class="song"><div class="m"><b>테마</b><span>${themeIsLight() ? '종이 (밝게)' : '다크 (기본)'}</span></div>
    <button class="btn" data-m="theme">${themeIsLight() ? '☾ 다크로' : '☀ 종이로'}</button></div>
  <div class="song"><div class="m"><b>재생 옵션</b><span>루프 / 메트로놈 클릭</span></div>
    <button class="btn${app.loopOn ? ' on' : ''}" data-m="loop">↻ 루프</button>
    <button class="btn${app.metroOn ? ' on' : ''}" data-m="metro">🎵 클릭</button></div>
  <div class="song"><div class="m"><b>🖨 PDF로 내보내기</b><span>A4 · 한 줄에 4마디 · 인쇄창에서 "PDF로 저장"</span></div><button class="btn p" data-m="pdf">PDF</button></div>
  <div class="song"><div class="m"><b>↗ 내보내기 / 가져오기</b><span>텍스트 탭 · JSON</span></div><button class="btn" data-m="exp">열기</button></div>
  <div class="song"><div class="m"><b>? 오선 위치 · 기호</b><span>어떤 줄이 어느 악기인지</span></div><button class="btn" data-m="key">보기</button></div>`);
}

export function openList(){
  const a = allSongs().sort((x,y) => y.at - x.at);
  let h = '<h3>저장된 악보</h3>';
  if(!a.length) h += '<p style="color:var(--dim);font-size:13px">아직 없습니다.</p>';
  a.forEach(s => h += `<div class="song"><div class="m"><b>${esc(s.title)}</b>
    <span>${s.bars.length}마디 · ${s.bpm}BPM · ${new Date(s.at).toLocaleDateString('ko-KR')}</span></div>
    <button class="btn p" data-open="${s.id}">열기</button><button class="btn" data-del="${s.id}">삭제</button></div>`);
  openSheet(h);
}

export function openKey(){
  openSheet('<h3>오선 위치 · 기호</h3><div class="key">'
    + INSTS.map(i => `<div>${keyRow(i)}</div><div><b>${i.ko}</b> <span style="color:var(--dim);font-size:11px">${i.id}${i.spko ? ' · 특수: ' + i.spko + ' ' + SYM[i.sp] : ''}</span></div>`).join('')
    + '</div><p style="font-size:11.5px;color:var(--dim);line-height:1.7">'
    + '손(크래쉬·하이햇·라이드·탐탐·스네어·플로어탐)은 기둥이 위로, 발(베이스·하이햇페달)은 아래로 그려집니다.<br><br>'
    + '<b>틱 줄</b> — 16비트면 <b>1 e &amp; a</b> 버튼이 뜹니다. 왼쪽 버튼으로 무엇을 찍을지 고릅니다.<br><br>'
    + '<b>악센트</b> — 탭 한 번에 켜지고 다시 탭하면 꺼집니다. 아무 조합이나 됩니다 (1만 / 1·&amp; / 1·e·a / 넷 다).<br>'
    + '<b>오픈 · 벨 · 고스트</b> — 하이햇 ○, 라이드 ◆, 스네어 ( ). 해당 악기에서만 나옵니다.<br>'
    + '<b>악기</b> — <u>필인용</u>. 틱마다 다른 드럼으로 <b>옮깁니다</b>. 한 틱에는 악기가 하나만 남습니다.<br>'
    + '각 틱 버튼에 지금 어떤 악기가 있는지 표시됩니다. 두 가지 방법 다 됩니다:<br>'
    + '&nbsp;· 칩에서 악기를 고른 뒤 틱을 탭<br>'
    + '&nbsp;· 틱을 먼저 탭해 고르고(파란 테두리) 칩을 탭 → 그 음표가 그 악기로 옮겨감<br>'
    + '16분 4개를 깔아두고 <b>e</b> 는 탐, <b>a</b> 는 플로어탐으로 옮기는 식으로 필인을 만듭니다. '
    + '악센트는 옮겨가도 그대로 따라갑니다.<br><br>'
    + '음표를 아예 빼려면 그 틱을 같은 악기로 한 번 더 탭하거나, 팔레트에서 그 틱이 빠진 패턴을 고르거나, <b>✕</b> 로 박을 비우세요.</p>');
}

export function openSecSheet(s){
  const sc = secOf(s), rep = sc.rep || 0;
  openSheet(`<h3>${s*4+1}–${s*4+4}마디</h3>
    <input type="text" id="secname" placeholder="섹션 이름 (인트로, 벌스, 코러스 …)" value="${esc(sc.name || '')}">
    <div class="song"><div class="m"><b>반복</b><span>도돌이표로 표시되고 재생에도 반영됩니다</span></div></div>
    <div class="srow">${[0,1,2,3].map(r => `<button class="btn${r === rep ? ' on' : ''}" data-rep="${r}">${r === 0 ? '없음' : '×' + (r+1)}</button>`).join('')}</div>
    <div class="song"><div class="m"><b>4마디 삽입</b><span>이 섹션 기준</span></div>
      <button class="btn" data-ins="before">↑ 앞에</button><button class="btn" data-ins="after">↓ 뒤에</button></div>
    <div class="song"><div class="m"><b>이 섹션 복제</b><span>바로 뒤에 같은 4마디를 하나 더</span></div>
      <button class="btn" data-dup="1">⧉ 복제</button></div>
    <div class="song"><div class="m"><b>이 섹션 삭제</b><span>4마디가 사라집니다</span></div>
      <button class="btn" data-delsec="1">✕ 삭제</button></div>`);
  $('sbox').dataset.sec = s;
}

/* ══════════ 내보내기 ══════════ */
export function toTab(){
  let out = `${app.song.title}  ♩=${app.song.bpm}  4/4\n`;
  for(let s=0; s<secCount(); s++){
    const sc = secOf(s), rep = 1 + (sc.rep || 0);
    out += `\n[${s*4+1}-${s*4+4}]${sc.name ? ' ' + sc.name : ''}${rep > 1 ? ' ×' + rep : ''}\n`;
    const rows = {};
    INSTS.forEach(i => { rows[i.id] = i.id.padEnd(2) + '|'; });
    for(let bi = s*4; bi < s*4+4; bi++){
      app.song.bars[bi].beats.forEach(beat => {
        const L = Math.max(layoutBeat(beat).L, 1);
        INSTS.forEach(i => {
          const o = beat[i.id], line = Array(L).fill('-');
          o.s.forEach((v,k) => {
            if(v) line[k*L/o.d] = v === 'n' ? (i.head === 'x' ? 'x' : 'o') : v === 'a' ? 'A' : v;
          });
          rows[i.id] += line.join('') + ' ';
        });
      });
      INSTS.forEach(i => { rows[i.id] += '| '; });
    }
    INSTS.forEach(i => { out += rows[i.id] + '\n'; });
  }
  return out;
}

export function openExport(){
  openSheet(`<h3>내보내기 / 가져오기</h3><textarea id="ta">${esc(toTab())}</textarea>
    <div class="srow"><button class="btn" id="e1">텍스트 탭</button><button class="btn" id="e2">JSON</button>
    <button class="btn p" id="e3">복사</button><button class="btn" id="e4">JSON 가져오기</button></div>`);
  $('e1').onclick = () => { $('ta').value = toTab(); };
  $('e2').onclick = () => { $('ta').value = JSON.stringify(app.song); };
  $('e3').onclick = () => { const ta = $('ta'); ta.select(); document.execCommand('copy'); toast('복사됨'); };
  $('e4').onclick = () => {
    try {
      const o = JSON.parse($('ta').value);
      if(!o.bars || o.bars.length % 4) throw 0;
      app.song = o;
      delete app.song.id;
      app.sel = { bar:null, beat:null, inst:'SN' };
      resetHist();
      closeSheet();
      render();
    } catch(e){ alert('JSON 형식 오류 (마디 수는 4의 배수여야 합니다)'); }
  };
}

/* PDF: 선택 표시를 지운 인쇄용 렌더 → 브라우저 인쇄창(→ PDF로 저장) */
export function printPDF(){
  const keep = clone(app.sel);
  stop();
  app.sel = { bar:null, beat:null, inst:app.sel.inst };
  app.printing = true;
  render();

  /* 송폼 요약 — 이름 붙인 섹션들을 순서대로 */
  const form = [];
  for(let s=0; s<secCount(); s++){
    const sc = secOf(s), rep = 1 + (sc.rep || 0);
    if(sc.name) form.push(esc(sc.name) + (rep > 1 ? ' ×' + rep : ''));
  }
  $('phead').innerHTML =
    `<b>${esc(app.song.title || '무제')}</b><span>♩= ${app.song.bpm} · 4/4 · ${app.song.bars.length}마디</span>`
    + (form.length ? `<div class="form">${form.join('　→　')}</div>` : '');
  $('pfoot').textContent =
    '오선 위→아래 : 크래쉬(덧줄 ✕) · 하이햇(✕) · 라이드(✕) · 탐탐 · 스네어 · 플로어탐 · 베이스 · 하이햇페달(덧줄 ✕)   |   '
    + '손 = 기둥 위, 발 = 기둥 아래 · 하이햇 오픈 ○ · 스네어 고스트 ( ) · 라이드 벨 ◆ · 악센트 >';
  let done = false;
  const restore = () => {
    if(done) return;
    done = true;
    app.printing = false;
    app.sel = keep;
    render();
  };
  window.addEventListener('afterprint', restore, { once:true });
  setTimeout(() => { window.print(); setTimeout(restore, 1500); }, 80);
}
