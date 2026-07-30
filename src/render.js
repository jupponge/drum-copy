/* 화면 그리기 — 악보 영역과 하단 편집 줄 */
import { IX, CHIPORDER, SHORT, SYM, TICKLBL, FAMS } from './constants.js';
import { app, secCount, secOf, ready, curBeat, instAt, canUndo } from './state.js';
import { $, esc } from './dom.js';
import { measureSVG } from './notation.js';
import { patSVG } from './palette.js';

export function render(){
  $('title').value = app.song.title;
  $('bpm').value   = app.song.bpm;

  let html = '';
  for(let s=0; s<secCount(); s++){
    const sc = secOf(s), rep = 1 + (sc.rep || 0);
    html += `<div class="section"><div class="slab">`
      + `<span class="n">${s*4+1}–${s*4+4}마디</span>`
      + (sc.name ? `<span class="nm">${esc(sc.name)}</span>` : '')
      + (rep > 1 ? `<span class="rp">×${rep}</span>` : '')
      + `<span class="sp"></span><button class="btn sm" data-secplay="${s}">▶ 구간</button>`
      + `<button class="btn sm ic" data-secmenu="${s}">⋯</button></div><div class="sysgrid">`;
    for(let b = s*4; b < s*4+4; b++){
      html += `<div><div class="ms${app.sel.bar === b ? ' sel' : ''}" data-bar="${b}">${measureSVG(b)}</div>`;
      if(app.sel.bar === b)
        html += `<div class="mbar">`
          + `<button class="btn sm" data-copyprev="${b}">⧉ 이전 마디 복사</button>`
          + `<button class="btn sm" data-allbeats="${b}">⧉ 이 박을 4박 전체</button>`
          + `<button class="btn sm" data-clear="${b}">✕ 마디 비우기</button></div>`;
      html += `</div>`;
    }
    html += `</div></div>`;
  }
  $('score').innerHTML = html;
  renderEditor();
}

export function renderEditor(){
  const rd = ready(), sel = app.sel;
  const pos = sel.bar == null ? '마디를 탭'
            : sel.beat == null ? `${sel.bar+1}마디 · 박 탭`
            : `${sel.bar+1}마디 ${sel.beat+1}박`;

  // 윗줄 : 위치 + 이동 · 지우기 · 되돌리기
  $('crumb').innerHTML =
    `<span class="pos${rd ? '' : ' off'}">${pos}${rd ? ' · ' + IX[sel.inst].ko : ''}</span>`
    + `<span class="sp"></span><span class="nav">`
    + `<button class="btn ic" data-mv="-1" aria-label="이전 박">◀</button>`
    + `<button class="btn ic" data-mv="1" aria-label="다음 박">▶</button>`
    + `<button class="btn ic" data-act="erase"${rd ? '' : ' disabled'} aria-label="이 박 지우기">✕</button>`
    + `<button class="btn ic" data-act="undo"${canUndo() ? '' : ' disabled'} aria-label="되돌리기">↶</button></span>`;

  // 악기 칩은 전용 줄에 항상 (선택 전에도 바꿀 수 있어야 함)
  $('instrow').innerHTML = `<span class="chips swipe">`
    + CHIPORDER.map(id =>
        `<button class="chip${id === sel.inst ? ' a' : ''}" data-inst="${id}">${SHORT[id]}</button>`).join('')
    + `</span>`;

  // 틱별 편집 줄
  const sp = rd ? IX[sel.inst].sp : null;
  if(app.brush === 'sp' && !sp) app.brush = 'a';
  let tks = '';
  if(!rd){
    tks = `<span class="hint">마디 → 박 + 오선 위치를 탭하세요</span>`;
  } else if(app.brush === 'fill'){
    /* 필인 모드 : 틱마다 어떤 악기가 올라와 있는지 보여준다 */
    const lbl = TICKLBL[app.fam] || Array.from({ length: app.fam }, (_,k) => String(k+1));
    for(let k=0; k<app.fam; k++){
      const id = instAt(k);
      const st = !id ? 'e' : id === sel.inst ? 'n' : 'f';
      tks += `<button class="tk s-${st}" data-tk="${k}"><b>${lbl[k]}</b><i>${id || ''}</i></button>`;
    }
  } else {
    const o = curBeat();
    const lbl = TICKLBL[o.d] || Array.from({ length:o.d }, (_,k) => String(k+1));
    for(let k=0; k<o.d; k++){
      const v = o.s[k] || '';
      const st = v === '' ? 'e' : v === 'n' ? 'n' : v === 'a' ? 'a' : 'x';
      tks += `<button class="tk s-${st}" data-tk="${k}"><b>${lbl[k]}</b><i>${SYM[v] || ''}</i></button>`;
    }
  }
  const BR = {
    a:    { ko:'악센트', c:'br-a' },
    sp:   { ko: sp ? IX[sel.inst].spko : '', c:'br-s' },
    fill: { ko:'악기',   c:'br-f' },
  };
  $('trow').innerHTML =
    (rd ? `<button class="btn sm brush ${BR[app.brush].c}" data-act="brush">${BR[app.brush].ko}</button>` : '')
    + `<span class="tks swipe">${tks}</span>`;

  $('tabs').innerHTML = `<span class="tw swipe">`
    + FAMS.map(f => `<button class="tab${f.id === app.fam ? ' a' : ''}" data-fam="${f.id}">${f.ko}</button>`).join('')
    + `</span>`;

  const F = FAMS.find(f => f.id === app.fam);
  const cur = rd ? curBeat() : null;
  const curKey = cur && cur.d === app.fam ? cur.s.map(v => v ? '1' : '0').join('') : null;
  $('pgrid').innerHTML = F.pats.map(p =>
    `<button class="pat${p === curKey ? ' a' : ''}" data-pat="${p}">${patSVG(app.fam, p)}</button>`).join('');

  $('tabs').classList.toggle('locked', !rd);
  document.querySelector('.pals').classList.toggle('locked', !rd);
  $('fab').textContent = document.querySelector('footer').classList.contains('fold') ? '∧' : '∨';

  // 선택된 악기 칩 / 박자 탭을 보이는 위치로
  document.querySelectorAll('.chip.a, .tab.a')
    .forEach(e => e.scrollIntoView({ inline:'center', block:'nearest' }));

  document.body.style.setProperty('--padbot', (document.querySelector('footer').offsetHeight + 22) + 'px');
}
